import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, test } from "node:test";
import { parse } from "yaml";
import { dependencyFreeClosure, EXPECTED_PLUGINS, findBareImports, standAloneHelpers, validateMarketplace, validateBundle } from "../tools/check-marketplace.mjs";

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

test("workflow helpers executed without dependency install stay dependency-free", async () => {
  const lock = parse(await readFile(path.join(root, ".github/workflows/upstream-sync.lock.yml"), "utf8"));

  assert.deepEqual([...standAloneHelpers(lock)].sort(), ["tools/upstream-sync.mjs"]);

  assert.deepEqual(findBareImports(await readFile(path.join(root, "tools/upstream-sync.mjs"), "utf8")), []);

  assert.deepEqual(findBareImports('import path from "node:path";\nimport { x } from "./rel.mjs";\nimport { Value } from "@sinclair/typebox/value";\nconst loaded = await import("@acme/pkg");'), ["@sinclair/typebox/value", "@acme/pkg"]);

  assert.deepEqual(findBareImports('import "@sinclair/typebox";\nimport "./local.mjs";\nimport "node:fs";'), ["@sinclair/typebox"]);

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
