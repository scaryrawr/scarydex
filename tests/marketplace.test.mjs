import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, test } from "node:test";
import { parse } from "yaml";
import { checkModuleSyntax, dependencyFreeClosure, EXPECTED_PLUGINS, findBareImports, findComputedImports, scanImports, standAloneHelpers, validateMarketplace, validateBundle } from "../tools/check-marketplace.mjs";

const root = new URL("..", import.meta.url).pathname;

const roots = [];

afterEach(async () => { for (const dir of roots.splice(0)) await rm(dir, { recursive: true, force: true }); });

async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-catalog-")); roots.push(dir);
  await cp(path.join(root, "plugins"), path.join(dir, "plugins"), { recursive: true });
  await cp(path.join(root, ".agents"), path.join(dir, ".agents"), { recursive: true });
  await copyFile(path.join(root, "README.md"), path.join(dir, "README.md"));

  return dir;
}

test("published catalog, manifests, YAML, links, hooks, and bundle are consistent", async () => {
  const result = await validateMarketplace(root);
  assert.deepEqual(result, { plugins: EXPECTED_PLUGINS.length, skills: 62 });
  await validateBundle(root);
});

test("excluded plugins or duplicate inventory cannot enter the marketplace", async () => {
  const dir = await fixture(), file = path.join(dir, ".agents/plugins/marketplace.json");
  const catalog = JSON.parse(await readFile(file, "utf8")); catalog.plugins[0].name = "azure-devops";
  await writeFile(file, JSON.stringify(catalog));
  await assert.rejects(validateMarketplace(dir), /exactly the eight/);
});

test("README inventory rejects missing rows even when prose mentions the plugin", async () => {
  const dir = await fixture(), readme = path.join(dir, "README.md");
  const original = await readFile(readme, "utf8");

  for (const name of EXPECTED_PLUGINS) {
    const withoutRow = original.split("\n").filter((line) => !line.startsWith(`| \`${name}\` |`)).join("\n");
    assert.notEqual(withoutRow, original, `No table row found for ${name}`);
    await writeFile(readme, withoutRow + `\nProse still mentions \`${name}\`.\n`);
    await assert.rejects(validateMarketplace(dir), new RegExp(`README is missing plugin from inventory: ${name}`));
  }

  await writeFile(readme, original);
  assert.deepEqual(await validateMarketplace(dir), { plugins: EXPECTED_PLUGINS.length, skills: 62 });
});

test("README inventory rejects unexpected and duplicate table entries", async () => {
  const dir = await fixture(), readme = path.join(dir, "README.md");
  const original = await readFile(readme, "utf8");

  for (const row of ["| `retired-plugin` | Stale entry | None |", "| `decide` | Duplicate | Node |"] ) {
    await writeFile(readme, original + "\n" + row + "\n");
    await assert.rejects(validateMarketplace(dir), /unexpected or duplicate rows/);
  }
});

test("broken local resources and unsupported runtime manifests are rejected", async () => {
  const dir = await fixture(), skill = path.join(dir, "plugins/better-init/skills/better-init/SKILL.md");
  const original = await readFile(skill, "utf8"); await writeFile(skill, original + "\n[missing](missing.md)\n");
  await assert.rejects(validateMarketplace(dir), /Broken link/);
  await writeFile(skill, original);
  const file = path.join(dir, "plugins/better-init/.codex-plugin/plugin.json");
  const manifest = JSON.parse(await readFile(file, "utf8")); manifest.extensions = ["extensions"];
  await writeFile(file, JSON.stringify(manifest));
  await assert.rejects(validateMarketplace(dir), /Unexpected runtime/);
});

test("dependency availability is tracked per step, not per job", () => {
  const helper = "node tools/upstream-sync.mjs";
  const install = "bun install --frozen-lockfile";
  const job = steps => standAloneHelpers({ jobs: { build: { steps } } });

  // An install that runs after the helper cannot have supplied its dependencies.
  assert.deepEqual([...job([{ run: helper }, { run: install }])], ["tools/upstream-sync.mjs"]);

  // An install that runs before the helper does, so only that helper is exempt.
  assert.deepEqual([...job([{ run: install }, { run: helper }])], []);

  // Mentioning an install is not running one: neither a comment nor echoed text counts.
  assert.deepEqual([...job([{ run: `# bun install\n${helper}` }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `echo bun install\n${helper}` }])], ["tools/upstream-sync.mjs"]);

  // The exemption applies to later steps within the same job, and a second helper that
  // runs before the install is still scanned.
  assert.deepEqual([...job([{ run: helper }, { run: install }, { run: "node tools/other.mjs" }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `set -e; ${install} && ${helper}` }])], []);
});

test("workflow helpers executed without dependency install stay dependency-free", async () => {
  const lock = parse(await readFile(path.join(root, ".github/workflows/upstream-sync.lock.yml"), "utf8"));

  assert.deepEqual([...standAloneHelpers(lock)].sort(), ["tools/upstream-sync.mjs"]);

  assert.deepEqual(findBareImports(await readFile(path.join(root, "tools/upstream-sync.mjs"), "utf8")), []);

  assert.deepEqual(findBareImports('import path from "node:path";\nimport { x } from "./rel.mjs";\nimport { Value } from "@sinclair/typebox/value";\nconst loaded = await import("@acme/pkg");'), ["@sinclair/typebox/value", "@acme/pkg"]);

  assert.deepEqual(findBareImports('import "@sinclair/typebox";\nimport "./local.mjs";\nimport "node:fs";'), ["@sinclair/typebox"]);

  const forms = [
    ['re-export', 'export * from "@sinclair/typebox";'],
    ['named re-export', 'export { Value } from "@sinclair/typebox";'],
    ['dynamic with import attributes', 'const t = await import("@sinclair/typebox", { with: { type: "json" } });'],
    ['dynamic without await', 'const load = () => import(\'@sinclair/typebox\', { assert: { type: "json" } });'],
    ['dynamic template literal', 'const load = async () => await import(`@sinclair/typebox`);'],
    ['import.meta.resolve', 'import.meta.resolve("@sinclair/typebox");'],
    ['require', 'const { createRequire } = await import("node:module");\nconst require = createRequire(import.meta.url);\nrequire("@sinclair/typebox");'],
    ['block comment between tokens', 'import /* keep me */ "@sinclair/typebox";'],
    ['comment inside from', 'export * /* trivia */ from /* more */ "@sinclair/typebox";'],
    ['comment before dynamic paren', 'const load = async () => import /* c */ ("@sinclair/typebox");'],
    ['line comment inside parens', 'const load = async () => import( // why\n  "@sinclair/typebox", // noqa\n);'],
  ];

  for (const [label, source] of forms) assert.deepEqual(findBareImports(source), ["@sinclair/typebox"], `guard missed the ${label} form`);

  assert.deepEqual(findBareImports('import { Value } from "@sinclair/typebox/value";\nexport { Value } from "@sinclair/typebox/value";'), ["@sinclair/typebox/value"]);
  assert.deepEqual(findBareImports('import("./relative.mjs");\nawait import(`./template.mjs`);\nconst r = createRequire(import.meta.url)("./local.cjs");'), []);

  const mentions = [
    ['line comment', '// import "@sinclair/typebox";\nexport const ok = 1;'],
    ['block comment', '/* await import("@sinclair/typebox") */\nexport const ok = 1;'],
    ['template prose', 'const note = `use import("@sinclair/typebox") in new code`;\nexport { note };'],
  ];

  for (const [label, source] of mentions) {
    assert.deepEqual(findBareImports(source), [], `guard reported a ${label} mention as a dependency`);
    assert.deepEqual(findComputedImports(source), [], `guard reported a ${label} mention as computed`);
  }

  assert.deepEqual(findComputedImports('const load = async ({ name }) => await import(`./plugin-${name}.mjs`);'), ['`./plugin-${name}.mjs`']);

  const computed = [
    ['identifier', 'const name = "@sinclair/typebox";\nconst load = async () => await import(name);'],
    ['concatenation', 'const load = async ({ name }) => await import("@sinclair/" + name);'],
    ['conditional', 'const load = async ({ flag }) => await import(flag ? "@sinclair/typebox" : "./local.mjs");'],
    ['call result', 'const load = async () => await import(target());'],
    ['member access', 'const load = async ({ cfg }) => await import(cfg.module);'],
    ['arrow forwarding', 'const load = async url => import(url);'],
  ];

  for (const [label, source] of computed) {
    assert.equal(scanImports(source).literals.length, 0, `guard treated the ${label} form as provable`);
    assert.equal(scanImports(source).computed.length, 1, `guard missed the ${label} computed target`);
  }

  assert.deepEqual(scanImports('const { createRequire } = await import("node:module");\nconst require = createRequire(import.meta.url);\nconst r = require("@sinclair/typebox");').requires.sort(), ["createRequire", "require"]);
  assert.deepEqual(scanImports('const load = async alias => await import(alias);').computed, ["alias"]);
  assert.deepEqual(scanImports('const load = async ({ cfg }) => await import(cfg.module);').computed, ["cfg.module"]);
  assert.deepEqual(scanImports('module.createRequire(import.meta.url)("./local.cjs");').requires, ["module.createRequire"]);
  assert.deepEqual(scanImports('const { createRequire } = await import("node:module");').requires, ["createRequire"]);
  assert.deepEqual(scanImports('const required = 1;\nexport const requiresLike = required + 1;').requires, []);

  // A literal element access reaches the same CommonJS loaders as a dot property, so
  // `module["createRequire"](...)` must not read as dependency-free.
  const commonjs = [
    ['element createRequire', 'module["createRequire"](import.meta.url)("@sinclair/typebox");'],
    ['element require', 'module["require"]("@sinclair/typebox");'],
    ['element require after alias', 'const ns = module;\nns["createRequire"](import.meta.url)("@sinclair/typebox");'],
  ];

  for (const [label, source] of commonjs) assert.equal(scanImports(source).requires.length, 1, `guard missed the ${label} CommonJS escape`);

  // Only `import.meta` names the resolve loader; a string element access is the same
  // loader as the dot form, and unrelated receivers must not be reported as one.
  assert.deepEqual(scanImports('const pkg = await import.meta["resolve"]("@sinclair/typebox");').literals, ["@sinclair/typebox"]);
  assert.deepEqual(scanImports('const pkg = await import.meta["re" + "solve"]("@sinclair/typebox");').literals, ["@sinclair/typebox"]);

  // The resolve loader is refused as a reference, so aliasing it past a target-only
  // check cannot make the module look dependency-free.
  const aliasing = [
    ['aliased dot resolve', 'const resolver = import.meta.resolve;\nawait resolver("@sinclair/typebox");'],
    ['aliased element resolve', 'const resolver = import.meta["resolve"];\nawait resolver("@sinclair/typebox");'],
    ['direct dot resolve', 'await import.meta.resolve("./local.mjs");'],
  ];

  for (const [label, source] of aliasing) assert.equal(scanImports(source).resolvers.length, 1, `guard missed the ${label} reference`);

  // Dynamic code construction is syntax a syntax check accepts and the host then loads,
  // so no oracle downstream can see the package inside it. Refused by name, aliased or
  // reached through a literal element access, while ordinary callbacks stay clean.
  const dynamicCode = [
    ['eval', `export const go = async () => await eval('import("@scope/pkg")');`],
    ['new Function', `export const go = new Function('return import("@scope/pkg")');`],
    ['Function constructor', `export const go = Function('return import("@scope/pkg")');`],
    ['hosted eval', `export const go = () => globalThis.eval('import("@scope/pkg")');`],
    ['element eval', `export const go = () => self["eval"]('import("@scope/pkg")');`],
    ['aliased eval', `const e = eval;\nexport const go = () => e('import("@scope/pkg")');`],
    ['timer string', `setTimeout('import("@scope/pkg")', 10);`],
    ['timer template', 'setTimeout(`import("${name}")`, 10);'],
  ];

  for (const [label, source] of dynamicCode) assert.equal(scanImports(source).dynamic.length, 1, `guard missed the ${label} dynamic-code escape`);

  for (const [label, source] of [['arrow callback', 'setTimeout(() => console.log("tick"), 10);'], ['reduce', 'export const total = [1, 2].reduce((a, b) => a + b, 0);'], ['import.meta.url', 'export const here = import.meta.url;']]) assert.deepEqual(scanImports(source).dynamic, [], `guard reported the innocuous ${label} form as dynamic code`);

  // Reflective indirection has to fail closed too: a computed name is not provably safe,
  // and `(0, eval)` reaches the global eval through parentheses.
  const reflective = [
    ['computed eval name', `globalThis["ev" + "al"]('import("@scope/pkg")');`],
    ['variable index call', `const k = "eval";\nglobalThis[k]('import("@scope/pkg")');`],
    ['parenthesised eval', `(0, eval)('import("@scope/pkg")');`],
    ['computed constructor', `const c = "Function";\nnew globalThis[c]("return import('@scope/pkg')");`],
  ];

  for (const [label, source] of reflective) assert.equal(scanImports(source).dynamic.length, 1, `guard missed the ${label} escape`);

  // The computed-target rule must stay scoped to call and construction targets, or every
  // ordinary indexed read in a helper would be reported as dynamic code.
  for (const [label, source] of [['indexed reads', 'export const a = track[key];\nexport const b = match[1];\nexport const c = heads[index];'], ['callback call', 'export const go = () => obj.run(1);'], ['literal member call', 'export const go = () => obj["run"](1);']]) assert.deepEqual(scanImports(source).dynamic, [], `guard reported the ordinary ${label} form as dynamic code`);
  assert.deepEqual(scanImports('new.target.resolve("@sinclair/typebox");'), { literals: [], computed: [], requires: [], resolvers: [], dynamic: [] });
  assert.deepEqual(scanImports('const meta = { resolve: s => s };\nmeta.resolve("@sinclair/typebox");'), { literals: [], computed: [], requires: [], resolvers: [], dynamic: [] });

  assert.throws(() => findBareImports('import source txt from "@sinclair/typebox";\nexport default txt;'), /cannot be parsed by the dependency-free guard; fix the syntax so its imports can be verified/);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-bare-checkout-")); roots.push(dir);
  await mkdir(path.join(dir, "tools"), { recursive: true });
  await cp(path.join(root, "tools/upstream-sync.mjs"), path.join(dir, "tools/upstream-sync.mjs"));

  assert.equal(existsSync(path.join(dir, "node_modules")), false);

  const helper = await import(pathToFileURL(path.join(dir, "tools", "upstream-sync.mjs")).href);

  assert.equal(helper.hasOpenProposal([], "scaryrawr/scarydex", "scaryrawr"), false);

  const emptyPlan = { schemaVersion: 1, repository: "scaryrawr/scarydex", tracks: helper.TRACKS.map(track => ({ id: track.id, commits: [] })) };

  assert.deepEqual(helper.skipEmptyPlan(emptyPlan, path.join(dir, "noop.json")), { skipped: true });

  assert.match(await readFile(path.join(dir, "noop.json"), "utf8"), /No upstream changes to review/);
});

test("Node is the validity oracle for install-free helpers", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-node-syntax-")); roots.push(dir);
  const write = (file, text) => writeFile(path.join(dir, file), text);
  const typescript = 'const value: string = "x";\nexport default value;\n';

  // The guard's parser reads this as JavaScript without complaint, so only asking the
  // runtime that loads it can keep a TypeScript annotation out of the workflow helpers.
  assert.equal(scanImports(typescript, "annotation.mjs").literals.length, 0);

  await write("annotation.mjs", typescript);
  assert.throws(() => checkModuleSyntax(path.join(dir, "annotation.mjs")), /is not valid JavaScript for the workflow's Node runtime/);

  await write("entry.mjs", typescript);
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs is not valid JavaScript for the workflow's Node runtime/);

  // The parser gate stays for syntax the traversal cannot model, and it runs before the
  // host's runtime check so the finding does not depend on which Node the runner
  // provides: this runner's Node rejects `import source` outright, and the bundled parser
  // reports it too. Removing the parser gate would let the traversal silently drop the
  // specifier on a host whose Node accepts it.
  await write("entry.mjs", 'import source txt from "./clean.mjs";\nexport default txt;\n');
  await write("clean.mjs", 'export const clean = true;\n');
  checkModuleSyntax(path.join(dir, "clean.mjs"));
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs cannot be parsed by the dependency-free guard/);

  await write("entry.mjs", 'const resolver = import.meta.resolve;\nexport default async () => await resolver("@sinclair/typebox");\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs reaches for the dynamic resolve loader.*import\.meta\.resolve/);

  await write("entry.mjs", `export default async () => await eval('import("@sinclair/typebox")');\n`);
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs builds or evaluates code at runtime.*eval/);

  await write("entry.mjs", 'import { clean } from "./clean.mjs";\nexport default clean;\n');
  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["clean.mjs", "entry.mjs"]);
});

test("the dependency-free guard follows relative imports transitively", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-closure-")); roots.push(dir);
  const write = (file, text) => writeFile(path.join(dir, file), text);

  await write("entry.mjs", 'import { node } from "node:os";\nimport { dep } from "./dep.mjs";\nexport const go = () => [node, dep];\n');
  await write("dep.mjs", 'export const dep = "clean";\n');

  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["dep.mjs", "entry.mjs"]);

  await write("dep.mjs", 'import { Value } from "@sinclair/typebox/value";\nexport const dep = Value;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs is reachable from workflow jobs that never install dependencies; remove these bare imports: @sinclair\/typebox\/value/);

  await write("dep.mjs", 'import { side } from "@sinclair/typebox";\nexport const side2 = side;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /@sinclair\/typebox/);

  await write("dep.mjs", 'export const load = async () => await import("@sinclair/typebox", { with: { type: "json" } });\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /remove these bare imports: @sinclair\/typebox/);

  await write("dep.mjs", 'export * from "@sinclair/typebox";\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /remove these bare imports: @sinclair\/typebox/);

  await write("dep.mjs", 'export const load = async ({ name }) => await import(`./plugin-${name}.mjs`);\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /builds import targets at runtime; install-free workflow jobs need literal paths so the dependency-free guard can traverse them: `\.\/plugin-\$\{name\}\.mjs`/);

  await write("dep.mjs", 'export const load = async ({ name }) => await import(/* c */ `@scope/${name}`);\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /builds import targets at runtime/);

  await write("dep.mjs", 'export * /* trivia */ from /* trivia */ "./clean.mjs";\n');
  await write("clean.mjs", 'export const clean = true;\n');

  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["clean.mjs", "dep.mjs", "entry.mjs"]);

  await write("clean.mjs", 'import /* trivia */ "@sinclair/typebox";\nexport const clean = true;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /remove these bare imports: @sinclair\/typebox/);

  await write("clean.mjs", 'const clean = 1;\n');
  await write("entry.mjs", 'import { clean } from "./clean.mjs";\nexport const go = async ({ name }) => await import(/* c */ `./other-${name}.mjs`);\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs builds import targets at runtime/);

  await write("entry.mjs", 'import source txt from "./clean.mjs";\nexport default txt;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs cannot be parsed by the dependency-free guard/);

  await write("entry.mjs", 'import { clean } from "./clean.mjs";\nexport default clean;\n');
  await write("dep.mjs", 'const name = "@sinclair/typebox";\nexport const load = async () => await import(name);\n');
  await write("clean.mjs", 'import { load } from "./dep.mjs";\nexport const clean = load;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs builds import targets at runtime/);

  await write("dep.mjs", 'const { createRequire } = await import("node:module");\nconst require = createRequire(import.meta.url);\nexport const alias = require;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs reaches for CommonJS loading; install-free workflow jobs must use literal static imports so the dependency-free guard can traverse them/);

  await write("dep.mjs", 'module["createRequire"](import.meta.url)("@sinclair/typebox");\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs reaches for CommonJS loading.*module\["createRequire"\]/);

  await write("dep.mjs", 'const resolve = import.meta.resolve;\nexport default async () => await resolve("@sinclair/typebox");\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs reaches for the dynamic resolve loader/);

  await write("dep.mjs", 'export const dep = "clean";\n');
  await write("cyclic-a.mjs", 'import { b } from "./cyclic-b.mjs";\nexport const a = b;\n');
  await write("cyclic-b.mjs", 'import { a } from "./cyclic-a.mjs";\nexport const b = a;\n');

  assert.deepEqual(await dependencyFreeClosure(dir, ["cyclic-a.mjs"]), ["cyclic-a.mjs", "cyclic-b.mjs"]);

  await assert.rejects(dependencyFreeClosure(dir, ["missing.mjs"]), /Unresolved import "missing\.mjs"/);
});

test("the shipped workflow entrypoint closure is dependency-free", async () => {
  const lock = parse(await readFile(path.join(root, ".github/workflows/upstream-sync.lock.yml"), "utf8"));

  assert.deepEqual(await dependencyFreeClosure(root, [...standAloneHelpers(lock)].sort()), ["tools/upstream-sync.mjs"]);
});
