import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setupUpstreamSecrets } from "../tools/setup-upstream-secrets.mjs";

const inference = "COPILOT_GITHUB_TOKEN";
const publication = "UPSTREAM_SYNC_PR_TOKEN";
const repository = "github.com/scaryrawr/scarydex";

function fixture(names = [], failure = null) {
  const configured = new Set(names), calls = [], messages = [];
  const gh = (args, stdio = "pipe") => {
    calls.push({ args, stdio });
    if (failure?.(args)) throw new Error("GitHub request failed");
    if (args[0] === "auth") return "";
    assert.equal(args[args.indexOf("--repo") + 1], repository);
    assert.equal(args[args.indexOf("--app") + 1], "actions");
    if (args[1] === "list") return JSON.stringify([...configured].map(name => ({ name })));
    assert.equal(args[1], "set");
    assert.equal(stdio, "inherit");
    assert.equal(args.includes("--body"), false);
    configured.add(args[2]);
    return "";
  };
  return { gh, calls, messages, options: { gh, log: message => messages.push(message), interactive: true } };
}

test("read-only check reports both missing secrets without mutation", () => {
  const f = fixture();
  assert.throws(() => setupUpstreamSecrets({ ...f.options, check: true }), /Missing Actions secrets: COPILOT_GITHUB_TOKEN, UPSTREAM_SYNC_PR_TOKEN/);
  assert.deepEqual(f.calls.map(call => call.args[1]), ["status", "list"]);
});

test("setup delegates hidden input to gh and independently verifies presence", () => {
  const f = fixture();
  setupUpstreamSecrets(f.options);
  assert.deepEqual(f.calls.filter(call => call.args[1] === "set"), [inference, publication].map(name => ({
    args: ["secret", "set", name, "--repo", repository, "--app", "actions"], stdio: "inherit",
  })));
  assert.equal(f.calls.at(-1).args[1], "list");
  assert.ok(f.messages.some(message => message.includes("does not validate token permissions")));
  assert.ok(f.messages.some(message => message.includes("No workflow was dispatched")));
});

test("partial setup resumes without overwriting existing secrets", () => {
  const f = fixture([inference]);
  setupUpstreamSecrets(f.options);
  assert.deepEqual(f.calls.filter(call => call.args[1] === "set").map(call => call.args[2]), [publication]);
  f.calls.length = 0;
  setupUpstreamSecrets({ ...f.options, interactive: false });
  assert.deepEqual(f.calls.map(call => call.args[1]), ["status", "list"]);
});

test("check succeeds with configured secrets without requiring a terminal", () => {
  const f = fixture([inference, publication]);
  setupUpstreamSecrets({ ...f.options, check: true, interactive: false });
  assert.deepEqual(f.calls.map(call => call.args[1]), ["status", "list"]);
});

test("setup rejects noninteractive secret input before mutation", () => {
  const f = fixture();
  assert.throws(() => setupUpstreamSecrets({ ...f.options, interactive: false }), /interactive terminal/);
  assert.deepEqual(f.calls.map(call => call.args[1]), ["status", "list"]);
});

test("authentication and metadata failures stop before setting secrets", () => {
  for (const command of ["auth", "secret"]) {
    const f = fixture([], args => args[0] === command);
    assert.throws(() => setupUpstreamSecrets(f.options), /GitHub request failed/);
    assert.equal(f.calls.some(call => call.args[1] === "set"), false);
  }
  const f = fixture();
  assert.throws(() => setupUpstreamSecrets({
    ...f.options, gh: args => args[0] === "auth" ? "" : '{"name":"not-an-array"}',
  }), /Invalid repository secret metadata/);
});

test("a failed token upload stops setup without prompting for another token", () => {
  const f = fixture([], args => args[1] === "set");
  assert.throws(() => setupUpstreamSecrets(f.options), /GitHub request failed/);
  assert.equal(f.calls.filter(call => call.args[1] === "set").length, 1);
  assert.equal(f.messages.some(message => message.includes("Both required Actions secret names are present")), false);
});

test("setup does not report success if uploaded secret names remain absent", () => {
  const f = fixture();
  assert.throws(() => setupUpstreamSecrets({
    ...f.options,
    gh: (args, stdio) => args[1] === "set" ? "" : f.gh(args, stdio),
  }), /Secrets still missing after setup/);
});

test("CLI help and invalid arguments need no GitHub access", () => {
  const helper = new URL("../tools/setup-upstream-secrets.mjs", import.meta.url).pathname;
  const env = { ...process.env, PATH: "", GH_PROMPT_DISABLED: "" };
  const help = spawnSync(process.execPath, [helper, "--help"], { encoding: "utf8", env });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--check: inspect secret names/);
  const invalid = spawnSync(process.execPath, [helper, "--body", "not-a-token"], { encoding: "utf8", env });
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /Usage:/);
  assert.doesNotMatch(invalid.stderr, /not-a-token/);
});

test("actual CLI checks metadata and rejects piped setup without executing secret set", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "scarydex-secret-setup-test-"));
  try {
    const log = path.join(directory, "calls");
    writeFileSync(path.join(directory, "gh"), `#!/bin/sh
printf '%s\\n' "$*" >> "$GH_TEST_LOG"
case "$1 $2" in
  "auth status") exit 0 ;;
  "secret list") printf '[]\\n' ;;
  *) exit 99 ;;
esac
`, { mode: 0o700 });
    const helper = new URL("../tools/setup-upstream-secrets.mjs", import.meta.url).pathname;
    const env = { ...process.env, PATH: directory, GH_TEST_LOG: log, GH_PROMPT_DISABLED: "" };
    for (const args of [["--check"], []]) {
      writeFileSync(log, "");
      const result = spawnSync(process.execPath, [helper, ...args], { encoding: "utf8", env, input: "not-a-token" });
      assert.equal(result.status, 1);
      assert.match(result.stderr, args.length ? /Missing Actions secrets/ : /interactive terminal/);
      assert.doesNotMatch(result.stdout + result.stderr, /not-a-token/);
      assert.equal(readFileSync(log, "utf8"), [
        "auth status --hostname github.com",
        `secret list --repo ${repository} --app actions --json name`,
        "",
      ].join("\n"));
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
