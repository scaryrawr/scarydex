// Real Codex discovery smoke test, using an isolated home and no model requests.
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXPECTED_PLUGINS } from "./check-marketplace.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

const home = await mkdtemp(path.join(os.tmpdir(), "scarydex-codex-home-"));

const env = { ...process.env, CODEX_HOME: home };

let server;

try {
  for (const args of [["plugin", "marketplace", "add", root, "--json"],
    ...EXPECTED_PLUGINS.map((name) => ["plugin", "add", `${name}@scarydex`, "--json"])]) {
    const result = spawnSync("codex", args, { env, encoding: "utf8", timeout: 30000 });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);

    if (output.pluginId) assert.equal(output.marketplaceName, "scarydex");
  }

  server = spawn("codex", ["app-server", "--stdio"], { env, stdio: ["pipe", "pipe", "pipe"] });
  let buffer = "", diagnostics = "", nextId = 0;
  const pending = new Map();
  server.stderr.on("data", (chunk) => { diagnostics += chunk.toString(); });
  server.stdout.on("data", (chunk) => {
    buffer += chunk;
    let newline;

    while ((newline = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
      let value;

 try { value = JSON.parse(line); } catch { continue; }

      const request = pending.get(value.id);

      if (!request) continue;
      pending.delete(value.id); clearTimeout(request.timer);

      if (value.error) request.reject(new Error(JSON.stringify(value.error)));
      else request.resolve(value.result);
    }
  });

  const rpc = (method, params) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}\n${diagnostics}`)); }, 30000);
    pending.set(id, { resolve, reject, timer });
    server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });

  await rpc("initialize", { clientInfo: { name: "scarydex-smoke", version: "0.1.0" }, capabilities: { experimentalApi: true } });
  server.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "initialized" }) + "\n");
  const result = await rpc("skills/list", { cwds: [root], forceReload: true });
  const entry = result.data.find((entry) => path.resolve(entry.cwd) === path.resolve(root));
  assert.ok(entry, "Codex did not return skills for the checkout");
  assert.deepEqual(entry.errors, []);
  const installed = entry.skills.filter((skill) => skill.path.includes(home) && path.relative(home, skill.path).split(path.sep).includes("plugins"));
  assert.equal(installed.length, 56, `Expected 56 installed skills, got ${installed.length}`);

  for (const name of ["pstack:poteto-mode", "anti-slop:anti-slop", "better-init:better-init", "digivolution:digivolution", "omlx-media:image-gen", "omlx-media:audio", "screen-record:screen-record", "decide:decide"]) {
    assert.ok(installed.some((skill) => skill.name === name), `Missing installed skill: ${name}`);
  }

  console.log("Codex installed all seven plugins and discovered all 56 skills without loading user configuration or running model requests.");
} finally {
  if (server) {
    server.kill();
    await new Promise((resolve) => server.once("exit", resolve));
  }

  await rm(home, { recursive: true, force: true });
}
