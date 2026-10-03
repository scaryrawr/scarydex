import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, renameSync, symlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { TRACKS, SOURCES, LIMITS } from "../tools/upstream-sync.mjs";
import { parse } from "yaml";
import { validateRepoSkills, validateUpstreamSetup } from "../tools/check-marketplace.mjs";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const helper = path.join(root, "tools/upstream-sync.mjs");
const temporary = [];
afterEach(() => { for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true }); });
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${command} ${args.join(" ")}\n${result.stderr}`);
  return result.stdout.trim();
}
const git = (directory, ...args) => run("git", ["-c", "core.hooksPath=/dev/null", "-C", directory, ...args]);
function write(directory, file, content) {
  mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
  writeFileSync(path.join(directory, file), typeof content === "string" ? content : JSON.stringify(content, null, 2));
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
  write(local, "port-provenance.json", {
    scarypilot: { repository: SOURCES.scarypilot, commit: scaryBase },
    pstack: { repository: SOURCES.cursor, integratedCommit: cursorBase, comparisonCommit: comparison },
  });
  write(local, "upstream-sync.json", { schemaVersion: 1, tracks: TRACKS.map(track => ({ ...track, reviewedThrough: null, reviews: [] })) });
  write(local, ".agents/plugins/marketplace.json", { plugins: TRACKS.filter(t => t.source === "scarypilot").map(t => ({ name: t.plugin })) });
  for (const track of TRACKS) write(local, `plugins/${track.plugin}/.codex-plugin/plugin.json`, { name: track.plugin, version: "1.0.0" });
  const base = commit(local, "Local port");
  return { directory, local, scarypilot, cursor, base, scaryBase, cursorBase, comparison };
}
function cli(f, command, args = [], expected = 0) {
  const result = spawnSync("node", [helper, command, "--root", f.local, ...args], { encoding: "utf8" });
  assert.equal(result.status, expected, result.stderr);
  return expected === 0 ? JSON.parse(result.stdout) : result.stderr;
}
function plan(f) { return cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor]); }
function savePlan(f, value) { const file = path.join(f.directory, "plan.json"); write(f.directory, "plan.json", value); return file; }
function registry(f) { return JSON.parse(readFileSync(path.join(f.local, "upstream-sync.json"), "utf8")); }
function review(f, p, id, disposition = "excluded", localPaths = []) {
  const data = registry(f), track = data.tracks.find(t => t.id === id), source = p.tracks.find(t => t.id === id);
  for (const change of source.commits) track.reviews.push({
    commit: change.commit, disposition, reason: "Reviewed native capability boundary in full.",
    paths: change.paths, localPaths, evidence: ["Inspected all parent diffs and validated the relevant behavior offline."],
  });
  track.reviewedThrough = source.reviewHead;
  write(f.local, "upstream-sync.json", data);
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
  write(f.scarypilot, "package.json", { dependencies: { shared: "1" } });
  const deleted = commit(f.scarypilot, "delete and shared build dependency");
  git(f.scarypilot, "-c", "merge.directoryRenames=false", "merge", "--no-ff", "-qm", "merge side", "side");
  const p = plan(f), anti = p.tracks.find(t => t.id === "scarypilot/anti-slop");
  assert.ok(anti.commits.some(c => c.commit === side));
  const rename = anti.commits.find(c => c.commit === renamed);
  assert.ok(rename.changes.some(c => c.status.startsWith("R") && c.paths.includes("plugins/other/moved.md")));
  assert.ok(anti.commits.some(c => c.commit === deleted && c.shared.includes("package.json")));
  assert.ok(anti.commits.some(c => c.parents.length === 2));
  assert.ok(p.tracks.find(t => t.id === "scarypilot/better-init").commits.some(c => c.changes.some(change => change.status === "D")));
});

test("divergence, missing objects, incorrect remotes, and invalid source paths fail explicitly", () => {
  const f = fixture();
  const data = registry(f); data.tracks[0].reviewedThrough = "a".repeat(40); write(f.local, "upstream-sync.json", data);
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /failed/);
  data.tracks[0].reviewedThrough = null; write(f.local, "upstream-sync.json", data);
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

test("invalid command-specific flags, base mismatches, and malformed registry fail at the CLI boundary", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  assert.match(cli(f, "check", ["--head", f.base], 1), /Unsupported option/);
  assert.match(cli(f, "verify", ["--plan", file, "--base", "a".repeat(40)], 1), /Plan\/base mismatch/);
  const data = registry(f); data.tracks.at(-1).path = "../pstack"; write(f.local, "upstream-sync.json", data);
  assert.match(cli(f, "check", [], 1), /Unexpected track path/);
});

test("bounded candidate prefix exposes remaining work and resumes only after merged review state", { timeout: 20000 }, () => {
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

test("complete exclusions advance review only, preserving provenance and append-only evidence", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  const before = readFileSync(path.join(f.local, "port-provenance.json"), "utf8");
  review(f, p, "cursor/pstack");
  assert.deepEqual(cli(f, "verify", ["--plan", file]).files, ["upstream-sync.json"]);
  assert.equal(readFileSync(path.join(f.local, "port-provenance.json"), "utf8"), before);
  commit(f.local, "Merge exclusions");
  assert.deepEqual(plan(f).tracks.at(-1).commits, []);
  const data = registry(f); data.tracks.at(-1).reviews[0].reason = "Rewritten historic evidence"; write(f.local, "upstream-sync.json", data);
  assert.match(cli(f, "verify", ["--plan", savePlan(f, plan(f))], 1), /append-only/);
});

test("deferred gaps block advancing, can be resolved by append, and forged existing cursors fail", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack", "deferred");
  assert.match(cli(f, "verify", ["--plan", file], 1), /unresolved gap/);
  const data = registry(f); data.tracks.at(-1).reviewedThrough = null; write(f.local, "upstream-sync.json", data);
  cli(f, "verify", ["--plan", file]);
  review(f, p, "cursor/pstack", "excluded");
  cli(f, "verify", ["--plan", file]);
  data.tracks.at(-1).reviewedThrough = f.comparison; data.tracks.at(-1).reviews = []; write(f.local, "upstream-sync.json", data);
  assert.match(cli(f, "plan", ["--scarypilot", f.scarypilot, "--cursor", f.cursor], 1), /review gap/);
});

test("a stationary cursor cannot hide an unrecorded gap before a later reviewed commit", () => {
  const f = fixture();
  write(f.cursor, "pstack/second.md", "second candidate\n"); commit(f.cursor, "second candidate");
  const p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  const data = registry(f), track = data.tracks.at(-1);
  track.reviewedThrough = null; track.reviews.shift(); write(f.local, "upstream-sync.json", data);
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
  write(f.local, paths[1], { name: "pstack", version: "1.0.1" });
  assert.ok(cli(f, "verify", ["--plan", file]).files.includes(paths[0]));
  write(f.local, paths[1], { name: "pstack", version: "0.9.0" });
  assert.match(cli(f, "verify", ["--plan", file], 1), /Bump shipped/);
});

test("untracked invalid names and oversized proposed content are included in the local gate", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  write(f.local, "tests/invalid\nname", "bad\n");
  assert.match(cli(f, "verify", ["--plan", file], 1), /Invalid path/);
  rmSync(path.join(f.local, "tests/invalid\nname"));
  write(f.local, "tests/large.mjs", "x".repeat(LIMITS.bytes + 1));
  assert.match(cli(f, "verify", ["--plan", file], 1), /patch size/);
});

test("root-only and cosmetic registry proposals cannot publish without semantic review state", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  write(f.local, "package.json", { scripts: { build: "unreviewed" } });
  assert.match(cli(f, "verify", ["--plan", file], 1), /semantic review registry/);
  write(f.local, "upstream-sync.json", JSON.stringify(registry(f)));
  assert.match(cli(f, "verify", ["--plan", file], 1), /semantic review registry/);
  const unchanged = registry(f);
  write(f.local, "upstream-sync.json", { tracks: unchanged.tracks, schemaVersion: unchanged.schemaVersion });
  assert.match(cli(f, "verify", ["--plan", file], 1), /semantic review registry/);
  git(f.local, "switch", "-qc", "upstream-sync/root-only");
  commit(f.local, "Root change without a review");
  const artifact = path.join(f.directory, "artifact"); mkdirSync(artifact);
  write(artifact, "agent_output.json", { items: [{ type: "create_pull_request", branch: "upstream-sync/root-only", base: "main" }] });
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
  write(f.local, manifest, { name: "pstack", version: "0.15.4-codex.1" });
  commit(f.local, "Existing Codex port version");
  const p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack", "ported", [manifest]);
  write(f.local, manifest, { name: "pstack", version: "0.15.4-codex.2" });
  assert.ok(cli(f, "verify", ["--plan", file]).files.includes(manifest));
  for (const version of ["0.15.4-codex.1", "0.15.4-codex.0", "0.15.3", "0.15.4-codex.02"]) {
    write(f.local, manifest, { name: "pstack", version });
    assert.match(cli(f, "verify", ["--plan", file], 1), /Bump shipped|no changed local path|Unsupported plugin version/);
  }
});

test("actual publication bundle and patch are verified and malicious transport is rejected", () => {
  const f = fixture(), p = plan(f), file = savePlan(f, p);
  review(f, p, "cursor/pstack");
  git(f.local, "switch", "-qc", "upstream-sync/review");
  const proposal = commit(f.local, "Review Cursor capability boundary");
  const artifact = path.join(f.directory, "artifact"); mkdirSync(artifact);
  write(artifact, "agent_output.json", { items: [{ type: "create_pull_request", branch: "upstream-sync/review", title: "review", body: "evidence", base: "main" }] });
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

test("native repo skills validate independently without altering published skill count; compiled publication gate is credential-separated", async () => {
  assert.equal(await validateRepoSkills(root), 2);
  assert.deepEqual(await validateUpstreamSetup(root), { tracks: 7 });
});
