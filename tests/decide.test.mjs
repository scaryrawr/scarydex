import assert from "node:assert/strict";
import { copyFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { spawnSync } from "node:child_process";

const roots = [];
afterEach(async () => { for (const dir of roots.splice(0)) await rm(dir, { recursive: true, force: true }); });
async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "scarydex-decide-")); roots.push(cwd);
  const helper = path.join(cwd, "decide.mjs");
  await copyFile(new URL("../plugins/decide/skills/decide/scripts/decide.mjs", import.meta.url), helper);
  const shim = path.join(cwd, "fetch-shim.mjs");
  await writeFile(shim, `
    globalThis.fetch = async (url, init = {}) => {
      const body = init.body ? JSON.parse(init.body) : null;
      if (String(url).endsWith('/api/tags')) return Response.json({ models: [
        { name: 'decide-jev', id: 'decide-jev', size: 4_700_000_000 },
        { name: 'llama3.1', id: 'llama3.1', size: 4_700_000_000 },
        { name: 'reasoner-pro', id: 'reasoner-pro', size: 13_000_000_000 },
      ] });
      if (String(url).endsWith('/api/chat')) {
        if (!body.model) throw new Error('Missing model');
        return Response.json({
          model: body.model,
          message: { role: 'assistant', content: 'JUDGMENT: decision type. EVALUATION: tradeoffs analyzed. DECISION: recommendation.' },
          done: true,
        });
      }
      throw new Error('Unexpected request: ' + url);
    };
  `);
  return { cwd, helper, invoke: (args) => spawnSync(process.execPath,
    ["--import", shim, helper, ...args],
    { cwd, encoding: "utf8", env: { ...process.env, OLLAMA_BASE_URL: "http://fixture.invalid" } }) };
}

test("models command lists decision-capable and all models via Ollama API", async () => {
  const { cwd, helper, invoke } = await fixture();
  const result = invoke(["models"]);
  assert.equal(result.status, 0, result.stderr);
  const output = result.stdout;
  assert.ok(output.includes("decide-jev"), "should list decision-capable model");
  assert.ok(output.includes("reasoner-pro"), "should list decision-capable model by reasoner keyword");
  assert.ok(output.includes("llama3.1"), "should list all models");
  assert.ok(output.includes("DECISION-CAPABLE:"), "should have decision-capable section");
  assert.ok(output.includes("ALL MODELS:"), "should have all models section");
});

test("run command sends JEV prompt and prints reasoning trace", async () => {
  const { cwd, helper, invoke } = await fixture();
  const result = invoke(["run", "--model", "decide-jev", "--question", "Should I use Bun or npm?"]);
  assert.equal(result.status, 0, result.stderr);
  const output = result.stdout;
  assert.ok(output.includes("JUDGMENT"), "should contain judgment section");
  assert.ok(output.includes("EVALUATION"), "should contain evaluation section");
  assert.ok(output.includes("DECISION"), "should contain decision section");
});

test("run command requires --model when not guessing", async () => {
  const { cwd, helper, invoke } = await fixture();
  const result = invoke(["run", "--question", "A question"]);
  assert.equal(result.status, 1, "should fail without --model");
  assert.ok(result.stderr.includes("Provide --model"), "should mention --model requirement");
});

test("run command requires --question", async () => {
  const { cwd, helper, invoke } = await fixture();
  const result = invoke(["run", "--model", "decide-jev"]);
  assert.equal(result.status, 1, "should fail without --question");
  assert.ok(result.stderr.includes("Provide --question"), "should mention --question requirement");
});

test("flags with empty values fail the presence guards", async () => {
  const { cwd, helper, invoke } = await fixture();
  const missingQuestionValue = invoke(["run", "--model", "decide-jev", "--question"]);
  assert.equal(missingQuestionValue.status, 1, "empty --question value should fail");
  assert.ok(missingQuestionValue.stderr.includes("Provide --question"), "should reject empty --question");
  const missingModelValue = invoke(["run", "--model", "--question", "A real question"]);
  assert.equal(missingModelValue.status, 1, "empty --model value should fail");
});

test("unknown command fails gracefully", async () => {
  const { cwd, helper, invoke } = await fixture();
  const result = invoke(["bogus-command"]);
  assert.equal(result.status, 1, "should fail with unknown command");
  assert.ok(result.stderr.includes("decide:"), "should have decide prefix");
});

test("no-argument invocation prints usage", async () => {
  const { cwd, helper, invoke } = await fixture();
  const result = invoke([]);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.includes("Usage:"), "should show usage");
  assert.ok(result.stdout.includes("models"), "should document models command");
  assert.ok(result.stdout.includes("run"), "should document run command");
});
