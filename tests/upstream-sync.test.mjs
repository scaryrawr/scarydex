import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, linkSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, realpathSync, rmSync, renameSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { TRACKS, SOURCES, LIMITS, hasOpenProposal, verifiedGitArguments, skipEmptyPlan } from "../tools/upstream-sync.mjs";
import { parse } from "yaml";
import { validateRepoSkills, validateUpstreamSetup } from "../tools/check-marketplace.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);

const helper = path.join(root, "tools/upstream-sync.mjs");

const temporary = [];

test("publication Git operation grammar excludes executable aliases and options", () => {
  for (const args of [
    ["-c", "alias.probe=!node ./hidden.mjs", "probe"],
    ["diff", "--ext-diff"],
    ["show", "--textconv"],
    ["rev-parse", "--config-env=alias.probe=PAYLOAD"],
    ["bundle", "create", "data"],
    ["worktree", "repair", "data"],
    ["unknown"],
    ["__proto__"],
    ["remote", "update"],
    ["am", "--3way"],
    ["show", "--show-signature"],
  ]) assert.throws(() => verifiedGitArguments(args), /Unapproved Git/);

  assert.deepEqual(verifiedGitArguments(["diff", "--binary", "HEAD"]), ["diff", "--no-ext-diff", "--no-textconv", "--binary", "HEAD"]);
  assert.deepEqual(verifiedGitArguments(["ls-tree", "-r", "HEAD", "--", "-data"]), ["ls-tree", "-r", "HEAD", "--", "-data"]);
  assert.deepEqual(verifiedGitArguments(["am", "--no-gpg-sign", "patch"]), ["am", "--no-3way", "--no-gpg-sign", "patch"]);
  assert.deepEqual(verifiedGitArguments(["-c", "user.name=Upstream verifier", "-c", "user.email=verifier@localhost", "am", "--no-gpg-sign", "patch"]),
    ["-c", "user.name=Upstream verifier", "-c", "user.email=verifier@localhost", "am", "--no-3way", "--no-gpg-sign", "patch"]);

  const f = fixture();

  const inherited = spawnSync("node", [helper, "plan", "--root", f.local, "--scarypilot", f.scarypilot, "--cursor", f.cursor], {
    encoding: "utf8",
    env: { ...process.env, GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "alias.probe", GIT_CONFIG_VALUE_0: "!node ./hidden.mjs" },
  });

  assert.equal(inherited.status, 0, inherited.stderr);

  for (const key of ["alias.probe", "filter.probe.process", "diff.probe.textconv", "merge.probe.driver", "gpg.program", "gpg.ssh.program", "gpg.ssh.defaultKeyCommand", "credential.helper", "credential.https://example.invalid.helper"]) {
    git(f.scarypilot, "config", key, "fixture-command");
    assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /Git executable configuration is not allowed/, key);
    git(f.scarypilot, "config", "--unset", key);
  }
});

afterEach(() => { for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true }); });

test("publication artifact outputs cannot replace the audited policy checkout through paths or symlinks", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "scarydex-policy-output-"));

  temporary.push(directory);
  symlinkSync(root, path.join(directory, "checkout"));
  const plan = { schemaVersion: 1, repository: "scaryrawr/scarydex", tracks: TRACKS.map(track => ({ id: track.id, commits: [] })) };
  const before = readFileSync(helper, "utf8");

  for (const output of [helper, path.join(root, "tools/uncreated-output.json"), path.join(directory, "checkout/tools/upstream-sync.mjs")]) assert.throws(() => skipEmptyPlan(plan, output), /outside the policy helper checkout/);
  assert.equal(readFileSync(helper, "utf8"), before);
  assert.deepEqual(skipEmptyPlan(plan, path.join(directory, "result/noop.json")), { skipped: true });
});

test("publication rejects merge drivers before three-way patch application", () => {
  const f = fixture();
  write(f.local, ".gitattributes", "tests/driver.txt merge=probe\n");
  write(f.local, "tests/driver.txt", "base\n");
  const base = commit(f.local, "Merge driver base");
  write(f.local, "tests/driver.txt", "proposal\n");
  const proposal = commit(f.local, "Patch change");
  const patch = path.join(f.directory, "driver.patch");
  writeFileSync(patch, git(f.local, "format-patch", "--stdout", `${base}..${proposal}`) + "\n");
  git(f.local, "switch", "--detach", base);
  write(f.local, "tests/driver.txt", "current\n");
  commit(f.local, "Current change");
  const marker = path.join(f.directory, "driver-ran");
  const driver = path.join(f.directory, "driver.sh");
  writeFileSync(driver, `printf executed > '${marker}'\nexit 1\n`);
  git(f.local, "config", "am.threeWay", "true");
  git(f.local, "config", "merge.probe.driver", `sh '${driver}'`);

  const native = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-C", f.local, "am", "--no-gpg-sign", patch], { encoding: "utf8" });

  assert.equal(native.status, 128, native.stderr);
  assert.equal(readFileSync(marker, "utf8"), "executed");
  git(f.local, "am", "--abort");
  rmSync(marker);

  const isolated = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-C", f.local, ...verifiedGitArguments(["am", "--no-gpg-sign", patch])], { encoding: "utf8" });

  assert.equal(isolated.status, 128, isolated.stderr);
  assert.equal(existsSync(marker), false);
  git(f.local, "am", "--abort");
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /Git executable configuration is not allowed/);
  assert.equal(existsSync(marker), false);
});

test("publication history cannot launch configured signature verification", () => {
  const f = fixture();
  const tree = git(f.scarypilot, "write-tree");

  const signed = spawnSync("git", ["-C", f.scarypilot, "hash-object", "-t", "commit", "-w", "--stdin"], {
    encoding: "utf8",
    input: `tree ${tree}\nparent ${f.scaryBase}\nauthor Fixture <fixture@localhost> 1700000000 +0000\ncommitter Fixture <fixture@localhost> 1700000000 +0000\ngpgsig -----BEGIN PGP SIGNATURE-----\n fixture\n -----END PGP SIGNATURE-----\n\nSigned fixture\n`,
  });

  assert.equal(signed.status, 0, signed.stderr);
  const sha = signed.stdout.trim();
  git(f.scarypilot, "update-ref", "HEAD", sha);
  const marker = path.join(f.directory, "signature-ran");
  const verifier = path.join(f.directory, "verify-signature.sh");
  writeFileSync(verifier, `#!/bin/sh\nprintf executed > '${marker}'\nexit 1\n`);
  chmodSync(verifier, 0o700);
  git(f.scarypilot, "config", "gpg.program", verifier);
  git(f.scarypilot, "config", "log.showSignature", "true");
  git(f.scarypilot, "show", "-s", "--format=%s", sha);
  assert.equal(readFileSync(marker, "utf8"), "executed");
  rmSync(marker);
  git(f.scarypilot, ...verifiedGitArguments(["show", "-s", "--format=%s", sha]));
  assert.equal(existsSync(marker), false);
  git(f.scarypilot, ...verifiedGitArguments(["log", "--format=%H", `${f.scaryBase}..${sha}`]));
  assert.equal(existsSync(marker), false);
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /Git executable configuration is not allowed/);
  assert.equal(existsSync(marker), false);
});

test("dangling output symlinks cannot create files inside the policy checkout", () => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), "scarydex-dangling-output-")));

  temporary.push(directory);
  const checkout = path.join(directory, "checkout");
  const copiedHelper = path.join(checkout, "tools/upstream-sync.mjs");
  write(checkout, "tools/upstream-sync.mjs", readFileSync(helper));
  const plan = path.join(directory, "plan.json");
  writeJson(directory, "plan.json", { schemaVersion: 1, repository: "scaryrawr/scarydex", tracks: TRACKS.map(track => ({ id: track.id, commits: [] })) });

  for (const [linkName, target, suffix] of [
    ["file-link", path.join(checkout, "missing-file.json"), ""],
    ["directory-link", path.join(checkout, "missing-directory"), "/noop.json"],
    ["external-link", path.join(directory, "external-missing.json"), ""],
  ]) {
    const link = path.join(directory, linkName);
    symlinkSync(target, link);

    const result = spawnSync("node", [copiedHelper, "skip-empty", "--plan", plan], {
      encoding: "utf8", env: { ...process.env, GH_AW_SAFE_OUTPUTS: link + suffix },
    });

    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /dangling symbolic link/);
    assert.equal(existsSync(target), false);
  }

  const output = path.join(directory, "ordinary/missing/output.json");
  const result = spawnSync("node", [copiedHelper, "skip-empty", "--plan", plan], { encoding: "utf8", env: { ...process.env, GH_AW_SAFE_OUTPUTS: output } });

  assert.equal(result.status, 0, result.stderr);
  assert.match(readFileSync(output, "utf8"), /No upstream changes/);
});

test("safe-output append requires an unaliased regular file", () => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), "scarydex-output-inode-")));

  temporary.push(directory);
  const checkout = path.join(directory, "checkout");
  const copiedHelper = path.join(checkout, "tools/upstream-sync.mjs");
  write(checkout, "tools/upstream-sync.mjs", readFileSync(helper));
  const protectedFile = path.join(checkout, "tools/protected.mjs");
  writeFileSync(protectedFile, "export const original = true;\n");
  const plan = path.join(directory, "plan.json");
  writeJson(directory, "plan.json", { schemaVersion: 1, repository: "scaryrawr/scarydex", tracks: TRACKS.map(track => ({ id: track.id, commits: [] })) });
  const output = path.join(directory, "output.json");
  linkSync(protectedFile, output);

  const rejected = spawnSync("node", [copiedHelper, "skip-empty", "--plan", plan], { encoding: "utf8", timeout: 5000, env: { ...process.env, GH_AW_SAFE_OUTPUTS: output } });

  assert.equal(rejected.status, 1, rejected.stderr);
  assert.match(rejected.stderr, /regular single-link file/);
  assert.equal(readFileSync(protectedFile, "utf8"), "export const original = true;\n");
  rmSync(output);
  const prior = '{"type":"noop","message":"earlier"}\n';
  writeFileSync(output, prior);

  for (let i = 0; i < 2; i++) {
    const appended = spawnSync("node", [copiedHelper, "skip-empty", "--plan", plan], { encoding: "utf8", timeout: 5000, env: { ...process.env, GH_AW_SAFE_OUTPUTS: output } });

    assert.equal(appended.status, 0, appended.stderr);
  }

  const records = readFileSync(output, "utf8").trim().split("\n").map(line => JSON.parse(line));

  assert.equal(records.length, 3);
  assert.deepEqual(records[0], JSON.parse(prior));
  assert.equal(records[1].message, "No upstream changes to review");
  assert.deepEqual(records[2], records[1]);

  const special = spawnSync("node", [copiedHelper, "skip-empty", "--plan", plan], { encoding: "utf8", timeout: 5000, env: { ...process.env, GH_AW_SAFE_OUTPUTS: "/dev/null" } });

  assert.equal(special.status, 1, special.stderr);
  assert.match(special.stderr, /regular single-link file/);
  const fifo = path.join(directory, "pipe");
  run("mkfifo", [fifo]);
  const pipe = spawnSync("node", [copiedHelper, "skip-empty", "--plan", plan], { encoding: "utf8", timeout: 5000, env: { ...process.env, GH_AW_SAFE_OUTPUTS: fifo } });

  assert.equal(pipe.error, undefined);
  assert.equal(pipe.status, 1, pipe.stderr);
  assert.match(pipe.stderr, /ENXIO|regular single-link file/);
});

test("safe-output descriptor checks reject path replacements around open", () => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), "scarydex-output-race-")));

  temporary.push(directory);
  const checkout = path.join(directory, "checkout");
  const copiedHelper = path.join(checkout, "tools/upstream-sync.mjs");
  write(checkout, "tools/upstream-sync.mjs", readFileSync(helper));
  const protectedFile = path.join(checkout, "tools/protected.mjs");
  writeFileSync(protectedFile, "export const original = true;\n");
  const plan = { schemaVersion: 1, repository: "scaryrawr/scarydex", tracks: TRACKS.map(track => ({ id: track.id, commits: [] })) };
  const f = fixture();

  const cases = ["append", "plan"].flatMap(mode =>
    [["before", "symlink"], ["before", "hardlink"], ["after", "symlink"], ["after", "hardlink"], ["before", "parent"], ["after", "parent"]].map(([phase, mutation]) => ({ mode, phase, mutation })));

  for (const { mode, phase, mutation } of cases) {
    const parent = path.join(directory, `${mode}-${phase}-${mutation}`);
    mkdirSync(parent);
    const output = path.join(parent, "protected.mjs");

    if (mode === "append") writeFileSync(output, "earlier\n");
    const script = path.join(directory, `${mode}-${phase}-${mutation}.mjs`);

    writeFileSync(script, `import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
const output = ${JSON.stringify(output)};
const target = ${JSON.stringify(protectedFile)};
const parent = ${JSON.stringify(parent)};
const open = fs.openSync;
function replace() {
  console.log("race-triggered");
  if (${JSON.stringify(mutation)} === "parent") {
    fs.renameSync(parent, parent + "-moved");
    fs.symlinkSync(${JSON.stringify(path.dirname(protectedFile))}, parent);
  } else {
    if (fs.existsSync(output)) fs.unlinkSync(output);
    if (${JSON.stringify(mutation)} === "symlink") fs.symlinkSync(target, output);
    else fs.linkSync(target, output);
  }
}
fs.openSync = (...args) => {
  if (args[0] !== output) return open(...args);
  if (${JSON.stringify(phase)} === "before") replace();
  const fd = open(...args);
  if (${JSON.stringify(phase)} === "after") replace();
  return fd;
};
syncBuiltinESMExports();
if (${JSON.stringify(mode)} === "plan") process.argv = [process.execPath, ${JSON.stringify(copiedHelper)}, "plan", "--root", ${JSON.stringify(f.local)}, "--scarypilot", ${JSON.stringify(f.scarypilot)}, "--cursor", ${JSON.stringify(f.cursor)}, "--output", output];
const { skipEmptyPlan } = await import(${JSON.stringify(copiedHelper)});
try { if (${JSON.stringify(mode)} === "append") skipEmptyPlan(${JSON.stringify(plan)}, output); }
catch (error) { console.error(error.message); process.exitCode = 1; }
`);
    const result = spawnSync("node", [script], { encoding: "utf8", timeout: 5000 });

    assert.equal(result.status, 1, `${mode}/${phase}/${mutation}: ${result.stderr}`);
    assert.match(result.stdout, /race-triggered/);
    assert.match(result.stderr, /ELOOP|EEXIST|regular single-link file|outside the policy helper checkout|Output path changed/);
    assert.equal(readFileSync(protectedFile, "utf8"), "export const original = true;\n");
  }
});

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  const detail = result.signal ? `${result.stderr}\n${command} was killed by ${result.signal}: run bun test unsandboxed, because filesystem sandboxes kill git children` : result.stderr;
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${detail}`);

  return result.stdout.trim();
}

const git = (directory, ...args) => run("git", ["-c", "core.hooksPath=/dev/null", "-C", directory, ...args]);

function write(directory, file, text) {
  mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
  writeFileSync(path.join(directory, file), text);
}

function writeJson(directory, file, value) {
  write(directory, file, JSON.stringify(value, null, 2));
}

function init(directory, remote) {
  mkdirSync(directory, { recursive: true });
  git(directory, "init", "-q", "-b", "main");
  git(directory, "config", "user.name", "Fixture");
  git(directory, "config", "user.email", "fixture@localhost");

  if (remote) git(directory, "remote", "add", "origin", remote);
}

function commit(directory, subject) {
  git(directory, "add", ".");
  git(directory, "commit", "-qm", subject);

  return git(directory, "rev-parse", "HEAD");
}

function fixture() {
  const directory = mkdtempSync(path.join(os.tmpdir(), "scarydex-upstream-test-"));
  temporary.push(directory);
  const local = path.join(directory, "local"), scarypilot = path.join(directory, "scarypilot"), cursor = path.join(directory, "cursor");
  init(local); init(scarypilot, SOURCES.scarypilot); init(cursor, SOURCES.cursor);

  for (const track of TRACKS) write(track.source === "cursor" ? cursor : scarypilot, `${track.path}/skill.md`, "baseline\n");
  const scaryBase = commit(scarypilot, "ScaryPilot baseline"), cursorBase = commit(cursor, "Cursor integrated baseline");
  write(cursor, "pstack/comparison.md", "inspected, not integrated\n");
  const comparison = commit(cursor, "Comparison must be replayed");
  writeJson(local, "port-provenance.json", {
    scarypilot: { repository: SOURCES.scarypilot, commit: scaryBase },
    pstack: { repository: SOURCES.cursor, integratedCommit: cursorBase, comparisonCommit: comparison },
  });
  writeJson(local, "upstream-sync.json", { schemaVersion: 1, tracks: TRACKS.map(track => ({ ...track, reviewedThrough: null, reviews: [] })) });
  writeJson(local, ".agents/plugins/marketplace.json", { plugins: TRACKS.filter(t => t.source === "scarypilot").map(t => ({ name: t.plugin })) });

  for (const track of TRACKS) writeJson(local, `plugins/${track.plugin}/.codex-plugin/plugin.json`, { name: track.plugin, version: "1.0.0" });
  const base = commit(local, "Local port");

  return { directory, local, scarypilot, cursor, base, scaryBase, cursorBase, comparison };
}

function cli(f, command, args = [], expected = 0) {
  const result = spawnSync("node", [helper, command, "--root", f.local, ...args], { encoding: "utf8" });
  assert.equal(result.status, expected, result.stderr);

  return expected === 0 ? JSON.parse(result.stdout) : result.stderr;
}

function plan(f) { return cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor]); }

function savePlan(f, value) {
  const file = path.join(f.directory, "plan.json");
  writeJson(f.directory, "plan.json", value);

  return file;
}

function registry(f) { return JSON.parse(readFileSync(path.join(f.local, "upstream-sync.json"), "utf8")); }

function review(f, p, id, disposition = "excluded", localPaths = []) {
  const data = registry(f), track = data.tracks.find(t => t.id === id), source = p.tracks.find(t => t.id === id);

  for (const change of source.commits) track.reviews.push({
    commit: change.commit, disposition, reason: "Reviewed native capability boundary in full.",
    paths: change.paths, localPaths, evidence: ["Inspected all parent diffs and validated the relevant behavior offline."],
  });
  track.reviewedThrough = source.reviewHead;
  writeJson(f.local, "upstream-sync.json", data);
}

test("CLI plans deterministically with two pstack sources and integrated, not comparison, baseline", () => {
  const f = fixture();
  const first = plan(f);
  assert.deepEqual(plan(f), first);
  const direct = first.tracks.find(t => t.id === "cursor/pstack");
  assert.equal(direct.base, f.cursorBase);
  assert.deepEqual(direct.commits.map(c => c.commit), [f.comparison]);
  assert.ok(first.tracks.some(t => t.id === "scarypilot/pstack"));
  assert.equal(cli(f, "check").tracks, 7);
  const output = path.join(f.directory, "saved.json");
  run("node", [helper, "plan", "--root", f.local, "--scarypilot", f.scarypilot, "--cursor", f.cursor, "--output", output]);
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor, "--output", output], 1), /EEXIST/);
});

test("renames crossing track boundaries, deletes, shared dependencies, and merge parents are reviewed", () => {
  const f = fixture();
  git(f.scarypilot, "switch", "-qc", "side");
  write(f.scarypilot, "plugins/anti-slop/side.md", "side\n");
  const side = commit(f.scarypilot, "side change");
  git(f.scarypilot, "switch", "-q", "main");
  mkdirSync(path.join(f.scarypilot, "plugins/other"), { recursive: true });
  renameSync(path.join(f.scarypilot, "plugins/anti-slop/skill.md"), path.join(f.scarypilot, "plugins/other/moved.md"));
  const renamed = commit(f.scarypilot, "rename out of track");
  rmSync(path.join(f.scarypilot, "plugins/better-init/skill.md"));
  writeJson(f.scarypilot, "package.json", { dependencies: { shared: "1" } });
  const deleted = commit(f.scarypilot, "delete and shared build dependency");
  git(f.scarypilot, "-c", "merge.directoryRenames=false", "merge", "--no-ff", "-qm", "merge side", "side");
  const p = plan(f), anti = p.tracks.find(t => t.id === "scarypilot/anti-slop");
  assert.ok(anti.commits.some(c => c.commit === side));
  const rename = anti.commits.find(c => c.commit === renamed);
  assert.ok(rename.changes.some(c => c.status.startsWith("R") && c.paths.includes("plugins/other/moved.md")));
  assert.ok(anti.commits.some(c => c.commit === deleted && c.shared.includes("package.json")));
  assert.ok(anti.commits.some(c => c.parents.length === 2));
  assert.ok(p.tracks.find(t => t.id === "scarypilot/better-init").commits.some(c => c.changes.some(change => change.status === "D")));

  for (const track of p.tracks.filter(track => track.source === "scarypilot")) review(f, p, track.id);
  cli(f, "verify", ["--plan", savePlan(f, p)]);
  commit(f.local, "Merge reviews across renames and merge parents");
  assert.ok(plan(f).tracks.filter(track => track.source === "scarypilot").every(track => !track.commits.length));
});

test("divergence, missing objects, incorrect remotes, and invalid source paths fail explicitly", () => {
  const f = fixture();
  const data = registry(f); data.tracks[0].reviewedThrough = "a".repeat(40); writeJson(f.local, "upstream-sync.json", data);
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /failed/);
  data.tracks[0].reviewedThrough = null; writeJson(f.local, "upstream-sync.json", data);
  git(f.scarypilot, "checkout", "--orphan", "diverged");
  write(f.scarypilot, "new.md", "new history"); commit(f.scarypilot, "orphan history");
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /Diverged history/);
  git(f.scarypilot, "checkout", "-q", "main");
  git(f.scarypilot, "remote", "set-url", "origin", "https://github.com/other/source");
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /remote/);
  git(f.scarypilot, "remote", "set-url", "origin", SOURCES.scarypilot);
  write(f.scarypilot, "plugins/anti-slop/invalid\npath", "bad"); commit(f.scarypilot, "invalid path");
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /Invalid path/);
});

test("large diffs fail rather than silently truncate", () => {
  const f = fixture();
  write(f.scarypilot, "plugins/anti-slop/large.md", "x".repeat(LIMITS.bytes + 100));
  commit(f.scarypilot, "oversized diff");
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /ENOBUFS|bound/);
});

test("trailing control characters fail at registry and upstream path boundaries", () => {
  const f = fixture();
  const data = registry(f);
  const track = data.tracks.find(item => item.id === "cursor/pstack");

  track.reviews.push({
    commit: f.comparison, disposition: "excluded", reason: "Inspected the comparison changes.",
    paths: ["pstack/comparison.md"], localPaths: [],
    evidence: ["Inspected the portable capability boundary."],
  });

  for (const suffix of ["\n", "\r", "\r\n", "\u0000", "\u007f"]) {
    for (const field of ["paths", "localPaths"]) {
      track.reviews[0][field] = [field === "paths" ? `pstack/comparison.md${suffix}` : `plugins/pstack/comparison.md${suffix}`];
      writeJson(f.local, "upstream-sync.json", data);
      assert.match(cli(f, "check", [], 1), /Invalid path/);
      track.reviews[0][field] = field === "paths" ? ["pstack/comparison.md"] : [];
    }
  }

  writeJson(f.local, "upstream-sync.json", data);
  cli(f, "check");
  write(f.scarypilot, "plugins/anti-slop/trailing\n", "invalid upstream name");
  commit(f.scarypilot, "Trailing newline path");
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /Invalid path/);
});

test("invalid command-specific flags, base mismatches, and malformed registry fail at the CLI boundary", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  assert.match(cli(f, "check", ["--head", f.base], 1), /Unsupported option/);
  assert.match(cli(f, "verify", ["--plan", file, "--base", "a".repeat(40)], 1), /Plan\/base mismatch/);
  const data = registry(f); data.tracks.at(-1).path = "../pstack"; writeJson(f.local, "upstream-sync.json", data);
  assert.match(cli(f, "check", [], 1), /Unexpected track path/);
});

test("bounded candidate prefix exposes remaining work and resumes only after merged review state", { timeout: 30000 }, () => {
  const f = fixture();

  for (let i = 0; i < LIMITS.candidates + 2; i++) { write(f.scarypilot, "plugins/anti-slop/change.md", `${i}\n`); commit(f.scarypilot, `change ${i}`); }

  const p = plan(f), track = p.tracks[0];
  assert.equal(track.commits.length, LIMITS.candidates);
  assert.equal(track.remaining, 2);
  assert.notEqual(track.reviewHead, track.head);
  review(f, p, track.id);
  cli(f, "verify", ["--plan", savePlan(f, p)]);
  commit(f.local, "Human merges review state");
  const next = plan(f).tracks[0];
  assert.equal(next.commits.length, 2);
  assert.equal(next.base, track.reviewHead);
});

test("historical cursor audit outlives the incremental commit bound without accepting review gaps", { timeout: 30000 }, () => {
  const f = fixture();
  let input = "";

  for (let i = 1; i <= LIMITS.commits + 1; i++) {
    const subject = `historical ${i}`, content = `${i}\n`;
    input += `commit refs/heads/main\nmark :${i}\ncommitter Fixture <fixture@localhost> ${1700000000 + i} +0000\ndata ${subject.length}\n${subject}\nfrom ${i === 1 ? f.scaryBase : `:${i - 1}`}\nM 100644 inline plugins/anti-slop/series.md\ndata ${content.length}\n${content}\n`;
  }

  const imported = spawnSync("git", ["-C", f.scarypilot, "fast-import", "--quiet"], { input, encoding: "utf8" });
  assert.equal(imported.status, 0, imported.stderr);
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /History exceeds review bound/);
  const commits = git(f.scarypilot, "rev-list", "--reverse", `${f.scaryBase}..HEAD`).split("\n");
  const data = registry(f);

  for (const track of data.tracks.filter(track => track.source === "scarypilot")) track.reviewedThrough = commits.at(-1);
  data.tracks[0].reviews = commits.map(commit => ({
    commit, disposition: "excluded", reason: "Historical capability review was merged by a maintainer.",
    paths: ["plugins/anti-slop/series.md"], localPaths: [], evidence: ["Historical paths and capability boundary were reviewed."],
  }));
  writeJson(f.local, "upstream-sync.json", data); commit(f.local, "Previously merged review ledger");
  git(f.scarypilot, "read-tree", "HEAD");
  write(f.scarypilot, "plugins/anti-slop/series.md", "incremental\n");
  const next = commit(f.scarypilot, "One incremental change");
  assert.deepEqual(plan(f).tracks[0].commits.map(change => change.commit), [next]);
  data.tracks[0].reviews.shift(); writeJson(f.local, "upstream-sync.json", data);
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /review gap/);
});

test("bounded review resumes across sibling branches without replaying final dispositions", { timeout: 30000 }, () => {
  const f = fixture();
  git(f.scarypilot, "switch", "-qc", "side", f.scaryBase);

  for (let i = 0; i < 11; i++) {
    write(f.scarypilot, "plugins/anti-slop/side.md", `${i}\n`); commit(f.scarypilot, `side ${i}`);
  }

  git(f.scarypilot, "switch", "-q", "main");

  for (let i = 0; i < 11; i++) {
    write(f.scarypilot, "plugins/anti-slop/main.md", `${i}\n`); commit(f.scarypilot, `main ${i}`);
  }

  git(f.scarypilot, "merge", "--no-ff", "-qm", "merge siblings", "side");
  const p = plan(f), first = p.tracks[0];
  assert.equal(first.commits.length, LIMITS.candidates);
  assert.ok(first.commits.some(change =>
    spawnSync("git", ["-C", f.scarypilot, "merge-base", "--is-ancestor", change.commit, first.reviewHead]).status === 1));
  review(f, p, first.id);
  cli(f, "verify", ["--plan", savePlan(f, p)]);
  commit(f.local, "Merge first bounded review");
  const next = plan(f);
  const reviewed = new Set(first.commits.map(change => change.commit));
  assert.ok(next.tracks[0].commits.length > 0);
  assert.ok(next.tracks[0].commits.every(change => !reviewed.has(change.commit)));
  review(f, next, first.id);
  cli(f, "verify", ["--plan", savePlan(f, next)]);
  commit(f.local, "Merge remaining sibling reviews");
  assert.deepEqual(plan(f).tracks[0].commits, []);
});

test("complete exclusions advance review only, preserving provenance and append-only evidence", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  const before = readFileSync(path.join(f.local, "port-provenance.json"), "utf8");
  review(f, p, "cursor/pstack");
  assert.deepEqual(cli(f, "verify", ["--plan", file]).files, ["upstream-sync.json"]);
  assert.equal(readFileSync(path.join(f.local, "port-provenance.json"), "utf8"), before);
  commit(f.local, "Merge exclusions");
  assert.deepEqual(plan(f).tracks.at(-1).commits, []);
  const data = registry(f); data.tracks.at(-1).reviews[0].reason = "Rewritten historic evidence"; writeJson(f.local, "upstream-sync.json", data);
  assert.match(cli(f, "verify", ["--plan", savePlan(f, plan(f))], 1), /append-only/);
});

test("deferred gaps block advancing, can be resolved by append, and forged existing cursors fail", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack", "deferred");
  assert.match(cli(f, "verify", ["--plan", file], 1), /unresolved gap/);
  const data = registry(f); data.tracks.at(-1).reviewedThrough = null; writeJson(f.local, "upstream-sync.json", data);
  cli(f, "verify", ["--plan", file]);
  review(f, p, "cursor/pstack", "excluded");
  cli(f, "verify", ["--plan", file]);
  data.tracks.at(-1).reviewedThrough = f.comparison; data.tracks.at(-1).reviews = []; writeJson(f.local, "upstream-sync.json", data);
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /review gap/);
});

test("a stationary cursor cannot hide an unrecorded gap before a later reviewed commit", () => {
  const f = fixture();
  write(f.cursor, "pstack/second.md", "second candidate\n"); commit(f.cursor, "second candidate");
  const p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  const data = registry(f), track = data.tracks.at(-1);
  track.reviewedThrough = null; track.reviews.shift(); writeJson(f.local, "upstream-sync.json", data);
  assert.match(cli(f, "verify", ["--plan", file], 1), /explicit disposition/);
});

test("proposal scope rejects provenance, workflow/skills, originals, unselected plugins, and symlinks", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");

  for (const forbidden of ["port-provenance.json", ".github/workflows/bad.yml", "AGENTS.md", ".agents/skills/bad/SKILL.md", "plugins/decide/bad.md", "plugins/anti-slop/bad.md", "tools/upstream-sync.mjs"]) {
    if (forbidden === "port-provenance.json") {
      const original = readFileSync(path.join(f.local, forbidden), "utf8");
      write(f.local, forbidden, original + "\n");
      assert.match(cli(f, "verify", ["--plan", file], 1), /Disallowed/);
      write(f.local, forbidden, original);
    } else {
      write(f.local, forbidden, "bad\n");
      assert.match(cli(f, "verify", ["--plan", file], 1), /Disallowed/);
      rmSync(path.join(f.local, forbidden));
    }
  }

  symlinkSync("/tmp", path.join(f.local, "tests"));
  assert.match(cli(f, "verify", ["--plan", file], 1), /Disallowed|Nonregular/);
});

test("ported code must name changed files and bump shipped plugin version", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  const paths = ["plugins/pstack/new.md", "plugins/pstack/.codex-plugin/plugin.json"];
  review(f, p, "cursor/pstack", "ported", paths);
  write(f.local, paths[0], "ported behavior\n");
  assert.match(cli(f, "verify", ["--plan", file], 1), /no changed local path/);
  writeJson(f.local, paths[1], { name: "pstack", version: "1.0.1" });
  assert.ok(cli(f, "verify", ["--plan", file]).files.includes(paths[0]));
  writeJson(f.local, paths[1], { name: "pstack", version: "0.9.0" });
  assert.match(cli(f, "verify", ["--plan", file], 1), /Bump shipped/);
});

test("untracked invalid names and oversized proposed content are included in the local gate", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  write(f.local, "tests/invalid\nname", "bad\n");
  assert.match(cli(f, "verify", ["--plan", file], 1), /Invalid path/);
  rmSync(path.join(f.local, "tests/invalid\nname"));
  write(f.local, "tests/large.mjs", "x".repeat(LIMITS.bytes + 1));
  assert.match(cli(f, "verify", ["--plan", file], 1), /patch size|uncompressed blob size/);
});

test("root-only and cosmetic registry proposals cannot publish without semantic review state", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  writeJson(f.local, "package.json", { scripts: { build: "unreviewed" } });
  assert.match(cli(f, "verify", ["--plan", file], 1), /semantic review registry/);
  write(f.local, "upstream-sync.json", JSON.stringify(registry(f)));
  assert.match(cli(f, "verify", ["--plan", file], 1), /semantic review registry/);
  const unchanged = registry(f);
  writeJson(f.local, "upstream-sync.json", { tracks: unchanged.tracks, schemaVersion: unchanged.schemaVersion });
  assert.match(cli(f, "verify", ["--plan", file], 1), /semantic review registry/);
  git(f.local, "switch", "-qc", "upstream-sync/root-only");
  commit(f.local, "Root change without a review");
  const artifact = path.join(f.directory, "artifact"); mkdirSync(artifact);
  writeJson(artifact, "agent_output.json", { items: [{ type: "create_pull_request", branch: "upstream-sync/root-only", base: "main" }] });
  git(f.local, "bundle", "create", path.join(artifact, "aw-upstream-sync-root-only.bundle"), `${f.base}..upstream-sync/root-only`);
  assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /semantic review registry/);
  rmSync(path.join(artifact, "aw-upstream-sync-root-only.bundle"));
  write(artifact, "aw-upstream-sync-root-only.patch", git(f.local, "format-patch", "--stdout", `${f.base}..HEAD`) + "\n");
  assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /semantic review registry/);
});

test("compiled empty-plan step creates the output directory and writes noop without inference", () => {
  const f = fixture(), p = plan(f);
  const workflow = parse(readFileSync(path.join(root, ".github/workflows/upstream-sync.lock.yml"), "utf8"));
  const steps = workflow.jobs.agent.steps;
  const preparation = steps.findIndex(item => item.name === "Prepare full upstream snapshots and immutable plan");
  assert.ok(steps.findIndex(item => item.id === "set-runtime-paths") < preparation);
  const step = steps[preparation];
  assert.equal(step.env.GH_AW_SAFE_OUTPUTS, "${{ steps.set-runtime-paths.outputs.GH_AW_SAFE_OUTPUTS }}");
  const command = step.run.split("\n").find(line => line.includes(" skip-empty "));
  assert.ok(command);
  const output = path.join(f.directory, "not-created", "outputs.jsonl");
  const file = savePlan(f, p);

  const execute = () => spawnSync("bash", ["-e", "-c", command.replace("/tmp/gh-aw/upstream-sync/plan.json", JSON.stringify(file))], {
    cwd: root, encoding: "utf8", env: { ...process.env, GH_AW_SAFE_OUTPUTS: output },
  });

  assert.equal(execute().status, 0);
  assert.equal(spawnSync("test", ["-e", output]).status, 1);

  for (const track of p.tracks) track.commits = [];
  savePlan(f, p);
  const result = execute();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(readFileSync(output, "utf8")), { type: "noop", message: "No upstream changes to review" });

  const missing = spawnSync("node", [helper, "skip-empty", "--plan", file], {
    encoding: "utf8", env: { ...process.env, GH_AW_SAFE_OUTPUTS: "" },
  });

  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /absolute output path/);
});

test("pstack accepts an increasing Codex port revision and rejects unchanged or older versions", () => {
  const f = fixture();
  const manifest = "plugins/pstack/.codex-plugin/plugin.json";
  writeJson(f.local, manifest, { name: "pstack", version: "0.15.4-codex.1" });
  commit(f.local, "Existing Codex port version");
  const p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack", "ported", [manifest]);
  writeJson(f.local, manifest, { name: "pstack", version: "0.15.4-codex.2" });
  assert.ok(cli(f, "verify", ["--plan", file]).files.includes(manifest));

  for (const version of ["0.15.4-codex.1", "0.15.4-codex.0", "0.15.3", "0.15.4-codex.02"]) {
    writeJson(f.local, manifest, { name: "pstack", version });
    assert.match(cli(f, "verify", ["--plan", file], 1), /Bump shipped|no changed local path|Unsupported plugin version/);
  }
});

test("actual publication bundle and patch are verified and malicious transport is rejected", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  git(f.local, "switch", "-qc", "upstream-sync/review");
  const proposal = commit(f.local, "Review Cursor capability boundary");
  const artifact = path.join(f.directory, "artifact"); mkdirSync(artifact);
  writeJson(artifact, "agent_output.json", { items: [{ type: "create_pull_request", branch: "upstream-sync/review", title: "review", body: "evidence", base: "main" }] });
  git(f.local, "bundle", "create", path.join(artifact, "aw-upstream-sync-review.bundle"), `${f.base}..upstream-sync/review`);
  write(artifact, "aw-upstream-sync-review.patch", git(f.local, "format-patch", "--stdout", `${f.base}..HEAD`) + "\n");
  assert.deepEqual(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact]).files, ["upstream-sync.json"]);
  assert.equal(git(f.local, "rev-parse", "HEAD"), proposal);
  write(f.local, ".github/workflows/bad.yml", "bad\n"); commit(f.local, "Malicious workflow");
  rmSync(path.join(artifact, "aw-upstream-sync-review.bundle"));
  git(f.local, "bundle", "create", path.join(artifact, "aw-upstream-sync-review.bundle"), `${f.base}..upstream-sync/review`);
  assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /Disallowed intermediate/);
  rmSync(path.join(artifact, "aw-upstream-sync-review.bundle"));
  rmSync(path.join(f.local, ".github/workflows/bad.yml")); commit(f.local, "Remove malicious final-tree change");
  write(artifact, "aw-upstream-sync-review.patch", git(f.local, "format-patch", "--stdout", `${f.base}..HEAD`) + "\n");
  assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /Disallowed intermediate/);
});

test("reverted intermediate paths cannot escape final proposal scope in either transport", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  git(f.local, "switch", "-qc", "upstream-sync/reverted");
  const paths = ["plugins/anti-slop/transient.md", "plugins/better-init/transient.md", "plugins/screen-record/transient.md", "plugins/pstack/transient.md"];

  for (const file of paths) write(f.local, file, "unreviewed intermediate content\n");
  commit(f.local, "Temporary unreviewed changes");

  for (const file of paths) rmSync(path.join(f.local, file));
  commit(f.local, "Revert plugin changes, retaining only review state");
  assert.match(cli(f, "verify", ["--plan", file], 1), /Intermediate path absent/);
  const artifact = path.join(f.directory, "artifact"); mkdirSync(artifact);
  writeJson(artifact, "agent_output.json", { items: [{ type: "create_pull_request", branch: "upstream-sync/reverted", base: "main" }] });
  const bundle = path.join(artifact, "aw-upstream-sync-reverted.bundle");
  git(f.local, "bundle", "create", bundle, `${f.base}..upstream-sync/reverted`);
  assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /Intermediate path absent/);
  rmSync(bundle);
  write(artifact, "aw-upstream-sync-reverted.patch", git(f.local, "format-patch", "--stdout", `${f.base}..HEAD`) + "\n");
  assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /Intermediate path absent/);
});

test("multiple commits on verified final paths remain valid", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack", "ported", ["plugins/pstack/skill.md", "plugins/pstack/.codex-plugin/plugin.json"]);
  write(f.local, "plugins/pstack/skill.md", "first reviewed revision\n");
  writeJson(f.local, "plugins/pstack/.codex-plugin/plugin.json", { name: "pstack", version: "1.0.1" });
  commit(f.local, "First reviewed revision");
  write(f.local, "plugins/pstack/skill.md", "final reviewed revision\n");
  commit(f.local, "Final reviewed revision");
  assert.ok(cli(f, "verify", ["--plan", file]).files.includes("plugins/pstack/skill.md"));
});

test("duplicate detection ignores marker PRs unless publisher and source repository are trusted", () => {
  const trusted = {
    state: "open", title: "[upstream-sync] Reviewed port", user: { login: "publisher" },
    head: { ref: "upstream-sync/review", repo: { full_name: "scaryrawr/scarydex" } },
  };

  assert.equal(hasOpenProposal([trusted], "scaryrawr/scarydex", "publisher"), true);

  for (const pr of [
    { ...trusted, user: { login: "outsider" } },
    { ...trusted, head: { ...trusted.head, repo: { full_name: "outsider/scarydex" } } },
    { ...trusted, head: { ...trusted.head, repo: null } },
    { ...trusted, head: { ...trusted.head, ref: "ordinary-change" } },
    { ...trusted, state: "closed" },
    { ...trusted, title: "Mention [upstream-sync] in an ordinary title" },
  ]) assert.equal(hasOpenProposal([pr], "scaryrawr/scarydex", "publisher"), false);
  assert.equal(hasOpenProposal([], "scaryrawr/scarydex", "publisher"), false);
  assert.throws(() => hasOpenProposal([], "scaryrawr/scarydex", ""), /publisher/);
});

test("compiled pre-activation duplicate check uses paginated API results and fails closed", async () => {
  const workflow = parse(readFileSync(path.join(root, ".github/workflows/upstream-sync.lock.yml"), "utf8"));
  const step = workflow.jobs.pre_activation.steps.find(step => step.id === "existing_proposal");
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const execute = new AsyncFunction("github", "context", "core", "process", step.with.script);

  const trusted = {
    state: "open", title: "[upstream-sync] Reviewed port", user: { login: "publisher" },
    head: { ref: "upstream-sync/review", repo: { full_name: "scaryrawr/scarydex" } },
  };

  const context = { repo: { owner: "scaryrawr", repo: "scarydex" } };
  const environment = { env: { GITHUB_WORKSPACE: root, PUBLISHER_LOGIN: "publisher" } };
  const list = () => {};

  for (const [pulls, expected] of [
    [[], "true"],
    [[{ ...trusted, user: { login: "outsider" } }], "true"],
    [[{ ...trusted, head: { ...trusted.head, repo: { full_name: "publisher/fork" } } }], "true"],
    [[{ ...trusted, title: "ordinary PR" }, trusted], "false"],
  ]) {
    const output = {};
    await execute({
      rest: { pulls: { list } },
      paginate: async (method, params) => {
        assert.equal(method, list);
        assert.deepEqual(params, { owner: "scaryrawr", repo: "scarydex", state: "open", per_page: 100 });

        return pulls;
      },
    }, context, { setOutput: (key, value) => { output[key] = value; } }, environment);
    assert.equal(output.run_sync, expected);
  }

  await assert.rejects(execute({
    rest: { pulls: { list } },
    paginate: async () => { throw new Error("API unavailable"); },
  }, context, { setOutput: () => assert.fail("Failure must not emit a success-shaped output") }, environment), /API unavailable/);
});

test("invalid UTF-8 Git paths fail closed before nonregular-file mode lookup", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  const blob = spawnSync("git", ["-C", f.local, "hash-object", "-w", "--stdin"], { input: "/tmp", encoding: "utf8" });
  assert.equal(blob.status, 0, blob.stderr);
  git(f.local, "add", "upstream-sync.json");
  const entry = Buffer.concat([Buffer.from(`120000 ${blob.stdout.trim()}\ttests/`), Buffer.from([0xff, 0])]);
  const update = spawnSync("git", ["-C", f.local, "update-index", "-z", "--index-info"], { input: entry });
  assert.equal(update.status, 0, update.stderr.toString());
  git(f.local, "commit", "-qm", "Nonregular file with unsupported filename bytes");
  assert.match(cli(f, "verify", ["--plan", file], 1), /UTF-8/);
});

test("compressed bundles and binary patches cannot exceed expanded content budget", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  mkdirSync(path.join(f.local, "tests"));
  writeFileSync(path.join(f.local, "tests/large.bin"), Buffer.alloc(LIMITS.bytes + 1));
  git(f.local, "switch", "-qc", "upstream-sync/large");
  commit(f.local, "Highly compressible oversized blob");
  const artifact = path.join(f.directory, "artifact"); mkdirSync(artifact);
  writeJson(artifact, "agent_output.json", { items: [{ type: "create_pull_request", branch: "upstream-sync/large", base: "main" }] });
  const bundle = path.join(artifact, "aw-upstream-sync-large.bundle");
  git(f.local, "bundle", "create", bundle, `${f.base}..upstream-sync/large`);
  assert.ok(readFileSync(bundle).length < LIMITS.bytes);
  assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /expanded|uncompressed/);
  assert.notEqual(spawnSync("git", ["-C", f.local, "rev-parse", "--verify", "FETCH_HEAD"]).status, 0);
  rmSync(bundle);
  const patch = git(f.local, "format-patch", "--stdout", `${f.base}..HEAD`) + "\n";
  const split = patch.indexOf("\n\n");

  const mime = patch.slice(0, split) + "\nContent-Type: text/plain; charset=UTF-8\nContent-Transfer-Encoding: base64\n\n" +
    Buffer.from(patch.slice(split + 2)).toString("base64").replace(/.{76}/g, "$&\n") + "\n";

  for (const content of [patch, patch.replaceAll("\n", "\r\n"), mime]) {
    write(artifact, "aw-upstream-sync-large.patch", content);
    assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /expanded|uncompressed/);
    assert.equal(spawnSync("test", ["-d", path.join(f.local, ".git/worktrees")]).status, 1);
  }
});

test("transport expansion caps aggregate objects and oversized binary delta results", () => {
  for (const scenario of ["aggregate", "deduplicated", "delta"]) {
    const f = fixture();
    mkdirSync(path.join(f.local, "tests"));

    if (scenario === "delta") {
      writeFileSync(path.join(f.local, "tests/blob.bin"), Buffer.alloc(LIMITS.bytes + 1));
      f.base = commit(f.local, "Trusted existing large binary");
    }

    const p = plan(f), file = savePlan(f, p);
    review(f, p, "cursor/pstack");

    if (scenario !== "delta") {
      for (const name of ["one", "two"]) {
        const bytes = Buffer.alloc(LIMITS.bytes / 2 + 1);

        if (scenario === "aggregate" && name === "two") bytes[1234] = 1;
        writeFileSync(path.join(f.local, `tests/${name}.bin`), bytes);
      }
    } else {
      const bytes = Buffer.alloc(LIMITS.bytes + 1); bytes[1234] = 1;
      writeFileSync(path.join(f.local, "tests/blob.bin"), bytes);
    }

    git(f.local, "switch", "-qc", "upstream-sync/binary");
    commit(f.local, "Compressed binary proposal");
    const artifact = path.join(f.directory, "artifact"); mkdirSync(artifact);
    writeJson(artifact, "agent_output.json", { items: [{ type: "create_pull_request", branch: "upstream-sync/binary", base: "main" }] });
    const bundle = path.join(artifact, "aw-upstream-sync-binary.bundle");
    git(f.local, "bundle", "create", bundle, `${f.base}..upstream-sync/binary`);
    assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /expanded|uncompressed/);
    assert.notEqual(spawnSync("git", ["-C", f.local, "rev-parse", "--verify", "FETCH_HEAD"]).status, 0);
    rmSync(bundle);
    const patch = git(f.local, "format-patch", "--stdout", `${f.base}..HEAD`) + "\n";

    if (scenario === "delta") assert.match(patch, /^delta /m);
    write(artifact, "aw-upstream-sync-binary.patch", patch);
    assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /expanded|uncompressed/);
    assert.equal(spawnSync("test", ["-d", path.join(f.local, ".git/worktrees")]).status, 1);
  }
});

test("valid UTF-8 replacement characters and bounded binary literals/deltas still publish", () => {
  const f = fixture();
  mkdirSync(path.join(f.local, "tests"));
  writeFileSync(path.join(f.local, "tests/existing.bin"), Buffer.alloc(65536));
  write(f.local, "tests/old.md", "text file to rename\n");
  f.base = commit(f.local, "Existing binary");
  const p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  const bytes = Buffer.alloc(65536); bytes[1234] = 1;
  writeFileSync(path.join(f.local, "tests/existing.bin"), bytes);
  writeFileSync(path.join(f.local, "tests/new.bin"), Buffer.alloc(1024));
  renameSync(path.join(f.local, "tests/old.md"), path.join(f.local, "tests/renamed.md"));
  write(f.local, "tests/\uFFFD.md", "valid UTF-8 filename\n");
  git(f.local, "switch", "-qc", "upstream-sync/valid-binary");
  commit(f.local, "Bounded binary literals and deltas");
  const artifact = path.join(f.directory, "artifact"); mkdirSync(artifact);
  writeJson(artifact, "agent_output.json", { items: [{ type: "create_pull_request", branch: "upstream-sync/valid-binary", base: "main" }] });
  git(f.local, "bundle", "create", path.join(artifact, "aw-upstream-sync-valid-binary.bundle"), `${f.base}..upstream-sync/valid-binary`);
  const patch = git(f.local, "format-patch", "--stdout", `${f.base}..HEAD`) + "\n";
  assert.match(patch, /^delta /m);
  assert.match(patch, /^literal /m);
  assert.ok(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact]).files.includes("tests/new.bin"));
  rmSync(path.join(artifact, "aw-upstream-sync-valid-binary.bundle"));
  write(artifact, "aw-upstream-sync-valid-binary.patch", patch);
  assert.ok(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact]).files.includes("tests/new.bin"));
});

test("patch preflight caps existing textual blobs before materializing changes", () => {
  const f = fixture();
  write(f.local, "tests/large.txt", "existing line\n".repeat(700000));
  f.base = commit(f.local, "Trusted large text");
  const p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  write(f.local, "tests/large.txt", "existing line\n".repeat(700000) + "small addition\n");
  commit(f.local, "Small diff against oversized text");
  const artifact = path.join(f.directory, "artifact"); mkdirSync(artifact);
  writeJson(artifact, "agent_output.json", { items: [{ type: "create_pull_request", branch: "upstream-sync/text", base: "main" }] });
  const patch = git(f.local, "format-patch", "--stdout", `${f.base}..HEAD`) + "\n";
  assert.ok(Buffer.byteLength(patch) < LIMITS.bytes);
  write(artifact, "aw-upstream-sync-text.patch", patch);
  assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /uncompressed/);
  assert.equal(spawnSync("test", ["-d", path.join(f.local, ".git/worktrees")]).status, 1);
});

test("publication rejects Git-invalid branch names even for patch-only proposals", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  commit(f.local, "Review capability boundary");
  const artifact = path.join(f.directory, "artifact"); mkdirSync(artifact);
  const patch = git(f.local, "format-patch", "--stdout", `${f.base}..HEAD`) + "\n";

  for (const suffix of ["a..b", "a/", "a.lock", "a//b", "a/.b"]) {
    const branch = `upstream-sync/${suffix}`;
    const stem = `aw-${branch.replaceAll("/", "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "")}`;
    writeJson(artifact, "agent_output.json", { items: [{ type: "create_pull_request", branch, base: "main" }] });
    write(artifact, `${stem}.patch`, patch);
    assert.match(cli(f, "verify", ["--plan", file, "--artifact-dir", artifact], 1), /Invalid Git branch/);
    rmSync(path.join(artifact, `${stem}.patch`));
  }
});

test("native repo skills validate independently without altering published skill count; compiled publication gate is credential-separated", async () => {
  assert.equal(await validateRepoSkills(root), 2);
  assert.deepEqual(await validateUpstreamSetup(root), { tracks: 7 });
});
