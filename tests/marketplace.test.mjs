import assert from "node:assert/strict";
import { copyFile, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { EXPECTED_PLUGINS, validateMarketplace, validateBundle } from "../tools/check-marketplace.mjs";

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
  assert.deepEqual(result, { plugins: EXPECTED_PLUGINS.length, skills: 56 });
  await validateBundle(root);
});
test("excluded plugins or duplicate inventory cannot enter the marketplace", async () => {
  const dir = await fixture(), file = path.join(dir, ".agents/plugins/marketplace.json");
  const catalog = JSON.parse(await readFile(file, "utf8")); catalog.plugins[0].name = "azure-devops";
  await writeFile(file, JSON.stringify(catalog));
  await assert.rejects(validateMarketplace(dir), /exactly the seven/);
});
test("README must list every plugin from the published inventory", async () => {
  const dir = await fixture(), readme = path.join(dir, "README.md");
  const original = await readFile(readme, "utf8");
  await writeFile(readme, original.replace("| `screen-record` | Screen capture, demo editing, captions, and narration | Skill + Node helper + FFmpeg |\n", ""));
  await assert.rejects(validateMarketplace(dir), /README is missing plugin from inventory: screen-record/);
  await writeFile(readme, original);
  assert.deepEqual(await validateMarketplace(dir), { plugins: EXPECTED_PLUGINS.length, skills: 56 });
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
