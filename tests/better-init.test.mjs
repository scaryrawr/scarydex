import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const skill = new URL("../plugins/better-init/skills/better-init/", import.meta.url);

const TaskEvals = Type.Object({
  skill_name: Type.Literal("better-init"),
  evals: Type.Array(Type.Object({
    id: Type.Integer(),
    name: Type.String(),
    prompt: Type.String(),
    expected_output: Type.String(),
    files: Type.Array(Type.String()),
    expectations: Type.Array(Type.String()),
  })),
});

const TriggerEvals = Type.Array(Type.Object({
  query: Type.String(),
  should_trigger: Type.Boolean(),
  files: Type.Optional(Type.Array(Type.String())),
}));

test("better-init review evals cover defaults, scope and existing ownership with real fixtures", async () => {
  const tasks = Value.Parse(TaskEvals, JSON.parse(await readFile(new URL("evals/evals.json", skill), "utf8")));
  const triggers = Value.Parse(TriggerEvals, JSON.parse(await readFile(new URL("evals/trigger-evals.json", skill), "utf8")));
  const names = new Set(tasks.evals.map(item => item.name));

  for (const name of ["minimal-codex-guidance", "explicit-instructions-only-scope", "preserve-existing-review-owner", "contributor-focus-keeps-default-review"]) {
    assert.ok(names.has(name), `Missing review behavior eval: ${name}`);
  }

  assert.equal(new Set(tasks.evals.map(item => item.id)).size, tasks.evals.length);

  for (const item of [...tasks.evals, ...triggers]) {
    for (const file of item.files ?? []) await access(new URL(file, skill));
  }

  const readOnly = triggers.find(item => item.query.startsWith("Explain what the existing AGENTS.md"));

  assert.ok(readOnly);
  assert.equal(readOnly.should_trigger, false);
  assert.deepEqual(readOnly.files, ["evals/files/AGENTS.md"]);
});

test("better-init's example validation command executes the preserved greeting contract", () => {
  const result = spawnSync("node", ["--test"], {
    cwd: fileURLToPath(new URL("evals/files/simple-repository/", skill)),
    encoding: "utf8",
    timeout: 10_000,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /greeting preserves the client-facing output format/);
});
