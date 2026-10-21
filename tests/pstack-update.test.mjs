import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { validatePlanText } from "../plugins/pstack/skills/poteto-mode/scripts/plan-rules.mjs";

const roots = [];

test("pstack bundle manifest never requires optional local dependency installations", async () => {
  const manifest = JSON.parse(await readFile(new URL("../plugins/pstack/bundle-manifest.json", import.meta.url), "utf8"));

  for (const file of Object.keys(manifest.files)) {
    assert.ok(!file.split("/").includes("node_modules"), `Rebuild from root dependencies: bundle manifest includes ${file}`);
  }
});

test("bundle generation excludes dependencies at every path depth", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "scarydex-bundle-inputs-"));
  roots.push(root);

  for (const directory of ["tools", "node_modules/esbuild", "plugins/pstack", "plugins/omlx-media"]) {
    await mkdir(path.join(root, directory), { recursive: true });
  }

  await writeFile(path.join(root, "tools/build.mjs"), await readFile(new URL("../tools/build.mjs", import.meta.url)));
  await writeFile(path.join(root, "package-lock.json"), "{}");
  await writeFile(path.join(root, "node_modules/esbuild/package.json"), JSON.stringify({ type: "module", exports: "./index.mjs" }));
  await writeFile(path.join(root, "node_modules/esbuild/index.mjs"), 'export async function build() { return { metafile: { inputs: { "node_modules/missing/index.js": {}, "plugins/pstack/skills/poteto-mode/scripts/node_modules/missing/index.js": {}, "tools/build.mjs": {} }, outputs: {} } }; }\n');

  const result = spawnSync("node", ["tools/build.mjs"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);

  for (const plugin of ["pstack", "omlx-media"]) {
    const manifest = JSON.parse(await readFile(path.join(root, "plugins", plugin, "bundle-manifest.json"), "utf8"));
    assert.deepEqual(Object.keys(manifest.files), ["package-lock.json", "tools/build.mjs"]);
  }
});

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "scarydex-pstack-update-"));
  roots.push(root);

  const git = (...args) => {
    const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);

    return result.stdout.trim();
  };

  git("init", "-b", "trunk");
  git("config", "user.name", "Fixture");
  git("config", "user.email", "fixture@example.invalid");
  git("commit", "--allow-empty", "-m", "baseline");
  const baseline = git("rev-parse", "HEAD");
  git("update-ref", "refs/remotes/origin/main", baseline);
  git("checkout", "-b", "feature");
  git("commit", "--allow-empty", "-m", "feature");
  const head = git("rev-parse", "HEAD");
  git("update-ref", "refs/remotes/origin/trunk", head);
  git("symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/trunk");
  const worktree = path.join(root, "worktree");
  git("worktree", "add", "--detach", worktree, head);
  const bin = path.join(root, "bin");
  await mkdir(bin);
  await writeFile(path.join(bin, "gh"), "#!/bin/sh\nprintf '[]\\n'\n");
  await chmod(path.join(bin, "gh"), 0o755);

  return { root, git, bin };
}

test("worktree audit uses the remote default, accepts a different base, and refuses missing refs", async () => {
  const { root, bin } = await fixture();
  const script = new URL("../plugins/pstack/skills/poteto-mode/scripts/worktree-audit.sh", import.meta.url).pathname;

  const run = (...args) => spawnSync("bash", [script, ...args, root], {
    encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });

  const defaultBase = run();
  assert.equal(defaultBase.status, 0, defaultBase.stderr);
  assert.match(defaultBase.stdout, /^# base: origin\/trunk\n/);
  assert.match(defaultBase.stdout, /\tYES\tclean\t/);
  const explicitBase = run("--base", "origin/main");
  assert.equal(explicitBase.status, 0, explicitBase.stderr);
  assert.match(explicitBase.stdout, /^# base: origin\/main\n/);
  assert.match(explicitBase.stdout, /\tno\tclean\t/);
  const invalid = run("--base", "missing");
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /base ref not found/);
  const missingArgument = spawnSync("bash", [script, "--base"], { encoding: "utf8" });
  assert.equal(missingArgument.status, 2);
});

test("plan fences ignore fake headings and checklists without masking subsequent prose", () => {
  for (const fence of ["```", "~~~~"]) {
    const fake = `${fence}markdown\n# Not a plan\n- [ ] Not executable.\n${fence}\n`;
    assert.ok(validatePlanText(fake, "basic").findings.some(f => f.rule === "h1"));
    const real = `${fake}\n# Plan\n- [ ] Run the check.\n`;
    assert.deepEqual(validatePlanText(real, "basic").findings, []);
  }

  const nested = "# Plan\n````text\n```\n- [ ] Example only.\n````\n";
  assert.ok(validatePlanText(nested, "basic").findings.length > 0);
});

test("pstack help routes every shipped command to its installed skill", async () => {
  const directory = new URL("../plugins/pstack/skills/", import.meta.url);
  const help = await readFile(new URL("poteto-help/SKILL.md", directory), "utf8");

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("principle-")) continue;
    const skill = await readFile(new URL(`${entry.name}/SKILL.md`, directory), "utf8");

    assert.match(skill, new RegExp(`^---\\nname: ${entry.name}\\n`));

    if (entry.name !== "poteto-help") assert.ok(help.includes(`../${entry.name}/SKILL.md`), `Missing help route: ${entry.name}`);
  }
});

test("the documented branded-type parser accepts valid IDs and rejects malformed input", async () => {
  const patterns = await readFile(new URL("../plugins/pstack/skills/typescript-best-practices/references/patterns.md", import.meta.url), "utf8");
  const example = patterns.match(/```ts\n([\s\S]*?)\n```/)[1];
  const root = await mkdtemp(path.join(os.tmpdir(), "scarydex-brand-example-"));
  roots.push(root);
  const file = path.join(root, "brand.ts");
  await writeFile(file, `import assert from "node:assert/strict";
function isUUID(input: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(input);
}
${example}
assert.equal(parseAgentId("12345678-1234-1234-1234-123456789abc"), "12345678-1234-1234-1234-123456789abc");
assert.throws(() => parseAgentId("not-an-id"), /Invalid agent id: not-an-id/);
`);
  const result = spawnSync("node", [file], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("new skills remain portable and ketchup cannot manufacture visual evidence", async () => {
  const skill = async name => readFile(new URL(`../plugins/pstack/skills/${name}/SKILL.md`, import.meta.url), "utf8");

  const ketchup = await skill("ketchup");
  assert.match(ketchup, /^---\nname: ketchup\n/);
  assert.match(ketchup, /read-only/i);
  assert.match(ketchup, /already|existing/i);
  assert.match(ketchup, /Never cut items or shrink them to stay under a word count/);
  assert.match(ketchup, /each item's risk/);
  assert.doesNotMatch(ketchup, /\/visualize|Task\(|~\/\.cursor/);
  const words = await skill("in-your-own-words");
  assert.match(words, /goals/);
  const sharpen = await skill("sharpen");
  assert.match(sharpen, /other than you or me/);
  assert.match(sharpen, /Return only the rewritten prompt/);
  assert.match(sharpen, /do not execute the underlying task/);
  assert.match(sharpen, /never authorization, verification gates or product choices/);
});

test("formal verification skill contracts preserve scope, failure sensitivity and honest sync records", async () => {
  const skill = async name => readFile(new URL(`../plugins/pstack/skills/${name}/SKILL.md`, import.meta.url), "utf8");
  const create = await skill("create-formal-verification-skill");
  const maintain = await skill("maintain-formal-verification-skill");
  const setup = await skill("setup-pstack");

  for (const text of [create, maintain]) {
    assert.match(text, /\.agents\/skills\//);
    assert.match(text, /isolated scratch copy/);
    assert.match(text, /sync commit/);
    assert.match(text, /uncommitted changes/);
    assert.doesNotMatch(text, /Task\(|\.cursor\/|~\/\.claude|run_dynamic_workflow/);
  }

  assert.match(create, /TLA\+ is the default/);
  assert.match(create, /test the real code with generated inputs/);
  assert.match(create, /property-based testing, not a formal proof/);
  assert.match(create, /A verify skill that was never run is a draft/);
  assert.match(create, /do not change product code unless the user asks/i);
  assert.match(maintain, /Never edit product code/);
  assert.match(maintain, /Do not move the sync commit for a blocked check/);
  assert.match(maintain, /old pass was on a stale description/);
  assert.doesNotMatch(maintain, /use the last commit that changed the verification files/);
  assert.match(maintain, /Recover a confirmed baseline from evidence/);
  assert.match(maintain, /reconcile the complete model or harness with all current covered code/);
  assert.match(maintain, /If full reconciliation cannot be completed, report \*\*blocked\*\*/);

  for (const outcome of ["in sync", "updated", "bug", "blocked"]) assert.ok(maintain.includes(`**${outcome}**`));

  for (const name of ["create-verification-skill", "create-formal-verification-skill"]) assert.ok(setup.includes(`../${name}/SKILL.md`));
  assert.match(setup, /Invoke it only if the user accepts/);
});

test("pstack behavior eval specifications are well formed without running inference", async () => {
  for (const name of ["create-formal-verification-skill", "maintain-formal-verification-skill", "sharpen", "ketchup"]) {
    const data = JSON.parse(await readFile(new URL(`../plugins/pstack/skills/${name}/evals/evals.json`, import.meta.url), "utf8"));
    assert.equal(data.skill_name, name);
    assert.ok(data.evals.length > 0);
    assert.equal(new Set(data.evals.map(item => item.id)).size, data.evals.length);

    for (const item of data.evals) {
      assert.ok(Number.isInteger(item.id));
      assert.ok(item.prompt.trim().length > 0);
      assert.ok(item.expected_output.trim().length > 0);
      assert.ok(item.expectations.length > 0);
    }
  }
});
