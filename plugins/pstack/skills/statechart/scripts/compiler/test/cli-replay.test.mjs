import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "../statechart.mjs");
const cases = JSON.parse(fs.readFileSync(path.join(here, "replay-cases.json"), "utf8")).cases;
const posix = ["darwin", "linux"].includes(process.platform);

function fixture() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "scarydex-compiler-replay-"));
}

function prepare(root, example) {
  const directory = path.join(root, example.name);
  fs.mkdirSync(directory);

  for (const [name, text] of Object.entries(example.files)) {
    fs.writeFileSync(path.join(directory, name), text);
  }

  const java = path.join(root, "java");
  fs.writeFileSync(java, `#!/bin/sh\nexec node "${path.join(here, "java-replay.mjs")}" "$@"\n`, { mode: 0o755 });
  const jar = path.join(root, "tla2tools.jar");
  fs.writeFileSync(jar, "");

  return { directory, java, jar };
}

test("the bundled compiler exposes help without prerequisites", () => {
  const result = spawnSync("node", [cli, "--help"], { encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /SPEC\.tla/);
  assert.match(result.stdout, /Only exits 0 and 1 write output/);
});

for (const example of cases) {
  test(`the bundled compiler replays ${example.name} with its upstream content and portable path styling`, { skip: !posix }, () => {
    const root = fixture();
    try {
      const { directory, java, jar } = prepare(root, example);
      const out = path.join(root, "out");
      const args = [cli, path.join(directory, `${example.name}.tla`), "--out", out];
      if (example.files["view.mjs"]) args.push("--view", path.join(directory, "view.mjs"));
      const result = spawnSync("node", args, {
        encoding: "utf8", timeout: 15000,
        env: { ...process.env, JAVA: java, TLA2TOOLS: jar, STATECHART_REPLAY: directory },
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, example.files["verdict-1.exit"] ? 1 : 0, result.stderr);
      assert.equal(result.stderr, "");
      assert.equal(fs.readFileSync(path.join(out, "report.md"), "utf8"), example.files["report.md"]);
      const expectedChart = example.files["chart.mmd"].replace(
        /(?=^  class s\d+ )/m,
        example.files["chart.mmd"].includes(" bugPath\n")
          ? "  classDef bugPath stroke:#1f3a93,stroke-width:4px\n"
          : "",
      );
      assert.equal(fs.readFileSync(path.join(out, "chart.mmd"), "utf8"), expectedChart);
      assert.doesNotMatch(fs.readFileSync(path.join(out, "tlc.out"), "utf8"), /@!@!@/);
      const before = fs.readFileSync(path.join(out, "report.md"));
      const rerun = spawnSync("node", args, {
        encoding: "utf8", timeout: 5000,
        env: { ...process.env, JAVA: java, TLA2TOOLS: jar, STATECHART_REPLAY: directory },
      });
      assert.equal(rerun.status, 2);
      assert.match(rerun.stderr, /is not empty/);
      assert.deepEqual(fs.readFileSync(path.join(out, "report.md")), before);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

for (const name of ["ChartBound", "ChartRun"]) {
  test(`the bundled compiler avoids ${name} input and dependency wrapper collisions`, { skip: !posix }, () => {
    const root = fixture();
    try {
      const source = cases[0];
      const example = {
        name,
        files: Object.fromEntries(Object.entries(source.files).map(([file, text]) => [
          file.replaceAll(source.name, name), text.replaceAll(source.name, name),
        ])),
      };
      const { directory, java, jar } = prepare(root, example);
      for (const dependency of ["ChartBound", "ChartBound_1", "ChartRun", "ChartRun_1"]) {
        if (dependency !== name)
          fs.writeFileSync(path.join(directory, `${dependency}.tla`), `---- MODULE ${dependency} ----\n====\n`);
      }
      const out = path.join(root, "out");
      const result = spawnSync("node", [
        cli, path.join(directory, `${name}.tla`),
        "--view", path.join(directory, "view.mjs"), "--out", out,
      ], {
        encoding: "utf8", timeout: 15000,
        env: { ...process.env, JAVA: java, TLA2TOOLS: jar, STATECHART_REPLAY: directory },
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 1, result.stderr);
      assert.equal(result.stderr, "");
      assert.equal(fs.readFileSync(path.join(out, "report.md"), "utf8"), example.files["report.md"]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}

test("the bundled compiler flushes a report larger than a pipe before exiting", { skip: !posix }, () => {
  const root = fixture();
  try {
    const { directory, java, jar } = prepare(root, cases[0]);
    const view = path.join(directory, "long-view.mjs");
    fs.writeFileSync(view, 'export const state = vars => vars.playback + "x".repeat(512 * 1024);\n');
    const out = path.join(root, "out");
    const result = spawnSync("node", [
      cli, path.join(directory, `${cases[0].name}.tla`), "--view", view, "--out", out,
    ], {
      encoding: "utf8", timeout: 15000, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, JAVA: java, TLA2TOOLS: jar, STATECHART_REPLAY: directory },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stderr, "");
    const report = fs.readFileSync(path.join(out, "report.md"), "utf8");
    assert.ok(report.length > 1024 * 1024);
    assert.equal(result.stdout, `${report}\nWrote ${out}\n`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("missing TLC fails explicitly without installing tools or publishing output", { skip: !posix }, () => {
  const root = fixture();
  try {
    const { directory } = prepare(root, cases[0]);
    const out = path.join(root, "out");
    const env = { ...process.env };
    delete env.TLA2TOOLS;
    const result = spawnSync("node", [cli, path.join(directory, `${cases[0].name}.tla`), "--out", out], {
      encoding: "utf8", timeout: 5000, env,
    });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Set TLA2TOOLS/);
    assert.equal(fs.existsSync(out), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

for (const signal of ["SIGTERM", "SIGKILL"]) {
  test(`${signal} reaps a looping view worker and publishes nothing`, { skip: !posix }, async () => {
    const root = fixture();
    let child;
    try {
      const { directory, java, jar } = prepare(root, cases[0]);
      const marker = path.join(root, "worker.pid");
      const view = path.join(root, "looping-view.mjs");
      fs.writeFileSync(view, `import fs from "node:fs";\nfs.writeFileSync(${JSON.stringify(marker)}, String(process.pid));\nwhile (true) {}\n`);
      const out = path.join(root, "out");
      child = spawn("node", [cli, path.join(directory, `${cases[0].name}.tla`), "--view", view, "--out", out], {
        stdio: "ignore", env: { ...process.env, JAVA: java, TLA2TOOLS: jar, STATECHART_REPLAY: directory },
      });
      const closed = new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (code, signal) => resolve({ code, signal }));
      });
      const deadline = Date.now() + 5000;
      while (!fs.existsSync(marker) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      assert.equal(fs.existsSync(marker), true, "view worker never started");
      const worker = Number(fs.readFileSync(marker, "utf8"));
      child.kill(signal);
      const result = await closed;
      assert.equal(result.code, signal === "SIGTERM" ? 143 : null);
      assert.equal(result.signal, signal === "SIGKILL" ? "SIGKILL" : null);
      assert.equal(fs.existsSync(out), false);
      for (let attempt = 0; ; attempt++) {
        try {
          process.kill(worker, 0);
        } catch (error) {
          if (error.code === "ESRCH") break;
          assert.equal(error.code, "EPERM");
        }
        assert.ok(attempt < 250, `worker ${worker} was not reaped`);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    } finally {
      child?.kill("SIGTERM");
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
}
