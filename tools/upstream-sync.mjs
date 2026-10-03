import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, lstatSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TRACKS = [
  ...["anti-slop", "better-init", "digivolution", "omlx-media", "screen-record", "pstack"].map(plugin => ({
    id: `scarypilot/${plugin}`, source: "scarypilot", plugin,
    path: plugin === "pstack" ? "external_plugins/pstack" : `plugins/${plugin}`,
  })),
  { id: "cursor/pstack", source: "cursor", plugin: "pstack", path: "pstack" },
];
export const SOURCES = { scarypilot: "https://github.com/scaryrawr/scarypilot", cursor: "https://github.com/cursor/plugins" };
export const LIMITS = { commits: 5000, candidates: 20, paths: 20000, bytes: 8 * 1024 * 1024, proposalFiles: 100 };
const FINAL = new Set(["ported", "excluded", "skipped"]);
const DISPOSITIONS = new Set([...FINAL, "deferred", "unresolved"]);
const SHA = /^[0-9a-f]{40}$/;
const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const json = file => JSON.parse(readFileSync(file, "utf8"));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function requireThat(ok, message) { if (!ok) throw new Error(message); }
function keys(value, expected) {
  requireThat(value && typeof value === "object" && !Array.isArray(value) && same(Object.keys(value).sort(), [...expected].sort()), `Invalid fields; expected ${expected.join(", ")}`);
}
function sha(value) { requireThat(typeof value === "string" && SHA.test(value), `Invalid commit SHA: ${value}`); return value; }
function safePath(value) {
  requireThat(typeof value === "string" && value.length > 0 &&
    ![...value].some(character => character.charCodeAt(0) < 32 || character === "\x7f" || character === "\\") &&
    !path.posix.isAbsolute(value) && value.split("/").every(p => p && p !== "." && p !== ".."), `Invalid path: ${value}`);
  return value;
}
function git(directory, args, allowed = [0]) {
  const result = spawnSync("git", ["-c", "core.hooksPath=/dev/null", "-c", "core.quotePath=false", "-C", directory, ...args], {
    encoding: "utf8", maxBuffer: LIMITS.bytes, env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_NOSYSTEM: "1" },
  });
  if (result.error || !allowed.includes(result.status)) throw new Error(`git ${args[0]} failed in ${directory}: ${result.error?.message ?? result.stderr.trim()}`);
  return { text: result.stdout, status: result.status };
}
const lines = text => text.trim() ? text.trim().split("\n") : [];
function commit(directory, ref) { return sha(git(directory, ["rev-parse", "--verify", `${ref}^{commit}`]).text.trim()); }
function ancestor(directory, base, head) {
  requireThat(git(directory, ["merge-base", "--is-ancestor", sha(base), sha(head)], [0, 1]).status === 0,
    `Diverged history: ${base} is not an ancestor of ${head}; human reconciliation required`);
}
function baseline(track, provenance) {
  return sha(track.source === "scarypilot" ? provenance.scarypilot.commit : provenance.pstack.integratedCommit);
}
function validateProvenance(provenance) {
  requireThat(provenance.scarypilot.repository === SOURCES.scarypilot && provenance.pstack.repository === SOURCES.cursor, "Unexpected provenance repository");
  sha(provenance.scarypilot.commit); sha(provenance.pstack.integratedCommit);
}
export function validateRegistry(registry, provenance) {
  validateProvenance(provenance);
  keys(registry, ["schemaVersion", "tracks"]);
  requireThat(registry.schemaVersion === 1 && Array.isArray(registry.tracks) && registry.tracks.length === TRACKS.length, "Invalid track registry");
  registry.tracks.forEach((track, index) => {
    keys(track, ["id", "source", "plugin", "path", "reviewedThrough", "reviews"]);
    for (const key of ["id", "source", "plugin", "path"]) requireThat(track[key] === TRACKS[index][key], `Unexpected track ${key}`);
    if (track.reviewedThrough !== null) sha(track.reviewedThrough);
    requireThat(Array.isArray(track.reviews), "Invalid review history");
    track.reviews.forEach(review => {
      keys(review, ["commit", "disposition", "reason", "paths", "localPaths", "evidence"]);
      sha(review.commit);
      requireThat(DISPOSITIONS.has(review.disposition), "Invalid disposition");
      requireThat(typeof review.reason === "string" && review.reason.trim().length >= 10, "Review needs a specific reason");
      for (const key of ["paths", "localPaths"]) {
        requireThat(Array.isArray(review[key]) && new Set(review[key]).size === review[key].length, `Invalid ${key}`);
        review[key].forEach(safePath);
      }
      requireThat(review.paths.length > 0 && Array.isArray(review.evidence) && review.evidence.length > 0 &&
        review.evidence.every(e => typeof e === "string" && e.trim().length >= 10), "Review needs paths and evidence");
      if (review.disposition === "ported") requireThat(review.localPaths.some(file => file.startsWith(`plugins/${track.plugin}/`)), "Ported review needs a local plugin path");
    });
  });
  return registry;
}
function changedPaths(directory, base, head) {
  const parts = git(directory, ["diff", "--name-status", "-z", "-M", base, ...(head ? [head] : []), "--"]).text.split("\0");
  parts.pop();
  const result = [];
  for (let index = 0; index < parts.length;) {
    const status = parts[index++];
    requireThat(/^[ACDMRTUXB][0-9]*$/.test(status), `Unexpected git status: ${status}`);
    const paths = [safePath(parts[index++])];
    if (/^[RC]/.test(status)) paths.push(safePath(parts[index++]));
    result.push({ status, paths });
  }
  requireThat(result.length <= LIMITS.paths, "Too many changed paths; narrow the review manually");
  return result;
}
function relevant(track, file) {
  if (file === track.path || file.startsWith(`${track.path}/`)) return "plugin";
  if (track.source === "scarypilot" && /^(plugins|external_plugins)\//.test(file)) return null;
  return "shared";
}
function history(directory, track, base, head) {
  ancestor(directory, base, head);
  requireThat(git(directory, ["rev-parse", "--is-shallow-repository"]).text.trim() === "false", "Full upstream history is required");
  const commits = lines(git(directory, ["rev-list", "--reverse", "--topo-order", `${base}..${head}`]).text);
  requireThat(commits.length <= LIMITS.commits, "History exceeds review bound; reconcile manually, no truncation performed");
  const candidates = [];
  let pathCount = 0;
  for (const id of commits) {
    const parents = lines(git(directory, ["show", "-s", "--format=%P", id]).text)[0]?.split(" ") ?? [];
    const changes = parents.flatMap(parent => changedPaths(directory, parent, id));
    const paths = [...new Set(changes.flatMap(change => change.paths))].filter(file => relevant(track, file)).sort();
    pathCount += paths.length;
    requireThat(pathCount <= LIMITS.paths, "History path count exceeds review bound; no truncation performed");
    if (!paths.length) continue;
    const patch = git(directory, ["show", "--format=", "--diff-merges=separate", "--binary", id, "--", ...paths]).text;
    requireThat(Buffer.byteLength(patch) <= LIMITS.bytes, "Upstream diff exceeds review bound");
    candidates.push({ commit: sha(id), parents, paths,
      shared: paths.filter(file => relevant(track, file) === "shared"),
      changes: changes.filter(change => change.paths.some(file => paths.includes(file))),
      subject: git(directory, ["show", "-s", "--format=%s", id]).text.trim() });
  }
  return candidates;
}
export function planSync({ root = ROOT, scarypilot, cursor, heads = {} }) {
  const provenance = json(path.join(root, "port-provenance.json"));
  const registry = validateRegistry(json(path.join(root, "upstream-sync.json")), provenance);
  const repositories = { scarypilot, cursor };
  const tracks = registry.tracks.map(track => {
    const directory = repositories[track.source];
    requireThat(directory, `Missing --${track.source} upstream directory`);
    requireThat(git(directory, ["remote", "get-url", "origin"]).text.trim().replace(/\.git$/, "") === SOURCES[track.source], "Upstream remote does not match source registry");
    const base = track.reviewedThrough ?? baseline(track, provenance);
    commit(directory, base);
    const head = commit(directory, heads[track.source] ?? "HEAD");
    ancestor(directory, baseline(track, provenance), base);
    const reviewed = new Map(track.reviews.map(review => [review.commit, review]));
    for (const change of history(directory, track, baseline(track, provenance), base)) {
      const review = reviewed.get(change.commit);
      requireThat(review && FINAL.has(review.disposition) && same(review.paths, change.paths), "Existing cursor has a review gap");
    }
    const all = history(directory, track, base, head);
    const candidates = all.slice(0, LIMITS.candidates);
    return { ...TRACKS.find(t => t.id === track.id), repository: SOURCES[track.source], base, head,
      reviewHead: all.length > candidates.length ? candidates.at(-1).commit : head,
      remaining: all.length - candidates.length, commits: candidates };
  });
  return { schemaVersion: 1, repository: "scaryrawr/scarydex", base: commit(root, "HEAD"), tracks };
}
export function allowedPath(file, plugins) {
  safePath(file);
  const match = /^plugins\/([^/]+)\//.exec(file);
  if (match) return plugins.has(match[1]);
  return new Set(["README.md", "THIRD_PARTY_NOTICES.md", ".agents/plugins/marketplace.json", "upstream-sync.json",
    "package.json", "bun.lock", "tools/build.mjs"]).has(file) || /^(tests|tools\/entries)\//.test(file);
}
function readAt(root, ref, file) { return JSON.parse(git(root, ["show", `${ref}:${file}`]).text); }
function newerVersion(before, after) {
  const parse = value => {
    const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-codex\.(0|[1-9]\d*))?$/.exec(value);
    requireThat(match, `Unsupported plugin version: ${value}`);
    return [...match.slice(1, 4).map(Number), match[4] === undefined ? Infinity : Number(match[4])];
  };
  const oldVersion = parse(before), newVersion = parse(after);
  return newVersion.some((value, index) => newVersion.slice(0, index).every((v, i) => v === oldVersion[i]) && value > oldVersion[index]);
}
function verifyCommits(root, base, head) {
  ancestor(root, base, head);
  const ids = lines(git(root, ["rev-list", `${base}..${head}`]).text);
  requireThat(ids.length <= 100, "Proposal exceeds 100 commits");
  const plugins = new Set(TRACKS.map(track => track.plugin));
  for (const id of ids) {
    const parents = git(root, ["show", "-s", "--format=%P", id]).text.trim().split(" ");
    for (const parent of parents) {
      const changes = changedPaths(root, parent, id);
      requireThat(changes.every(change => change.paths.every(file => allowedPath(file, plugins))), "Disallowed intermediate commit path");
      for (const file of changes.flatMap(change => change.paths)) {
        const mode = git(root, ["ls-tree", id, "--", file]).text.split(" ")[0];
        requireThat(!mode || mode === "100644" || mode === "100755", `Nonregular intermediate file: ${file}`);
      }
    }
  }
}
export function verifyProposal({ root = ROOT, plan, base = plan.base, head }) {
  sha(base);
  verifyCommits(root, base, head ? sha(head) : commit(root, "HEAD"));
  requireThat(plan.schemaVersion === 1 && plan.repository === "scaryrawr/scarydex" && plan.base === base, "Plan/base mismatch");
  requireThat(plan.tracks.length === TRACKS.length, "Invalid plan tracks");
  const provenance = readAt(root, base, "port-provenance.json");
  const original = validateRegistry(readAt(root, base, "upstream-sync.json"), provenance);
  const proposed = validateRegistry(head ? readAt(root, head, "upstream-sync.json") : json(path.join(root, "upstream-sync.json")), provenance);
  const files = head ? changedPaths(root, base, head) : changedPaths(root, base, "");
  let untrackedBytes = 0;
  if (!head) {
    requireThat(!git(root, ["ls-files", "--unmerged", "-z"]).text, "Unmerged index is not a valid proposal");
    const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).text.split("\0").filter(Boolean);
    for (const file of untracked) {
      safePath(file);
      const stat = lstatSync(path.join(root, file));
      requireThat(stat.isFile(), `Nonregular proposal file: ${file}`);
      untrackedBytes += stat.size;
      files.push({ status: "A", paths: [file] });
    }
  }
  requireThat(files.length <= LIMITS.proposalFiles, "Proposal exceeds 100 files");
  const selected = new Set();
  const portedPaths = new Set();
  proposed.tracks.forEach((track, index) => {
    const before = original.tracks[index];
    const candidate = plan.tracks[index];
    for (const key of ["id", "source", "plugin", "path"]) requireThat(candidate[key] === track[key], "Plan track mismatch");
    requireThat(candidate.repository === SOURCES[track.source] && candidate.base === (before.reviewedThrough ?? baseline(track, provenance)), "Plan source/baseline mismatch");
    sha(candidate.head); sha(candidate.reviewHead);
    requireThat(track.reviews.length >= before.reviews.length && same(track.reviews.slice(0, before.reviews.length), before.reviews), "Review history is append-only");
    const added = track.reviews.slice(before.reviews.length);
    const candidates = new Map(candidate.commits.map(c => [c.commit, c]));
    const previous = new Map(before.reviews.map(r => [r.commit, r]));
    for (const review of added) {
      const change = candidates.get(review.commit);
      requireThat(change && same(review.paths, change.paths), "Disposition must cover exact pinned commit paths");
      requireThat(!FINAL.has(previous.get(review.commit)?.disposition), "Final dispositions cannot be rewritten");
      previous.set(review.commit, review);
      selected.add(track.plugin);
      for (const file of review.localPaths) requireThat(allowedPath(file, new Set([track.plugin])), "Review local path escaped its plugin");
      if (review.disposition === "ported") for (const file of review.localPaths) portedPaths.add(file);
    }
    if (added.length) {
      const last = Math.max(...added.map(review => candidate.commits.findIndex(change => change.commit === review.commit)));
      for (const change of candidate.commits.slice(0, last + 1)) requireThat(previous.has(change.commit), "Review prefix needs an explicit disposition for every commit");
    }
    if (track.reviewedThrough !== before.reviewedThrough) {
      const through = track.reviewedThrough;
      requireThat(through !== null, "Cursor cannot be reset");
      const stop = candidate.commits.findIndex(c => c.commit === through);
      requireThat(through === candidate.reviewHead || stop >= 0, "Cursor is not a planned boundary");
      const covered = through === candidate.reviewHead ? candidate.commits : candidate.commits.slice(0, stop + 1);
      for (const change of covered) requireThat(FINAL.has(previous.get(change.commit)?.disposition), "Cursor cannot advance through an unresolved gap");
    }
  });
  const changed = new Set(files.flatMap(change => change.paths));
  requireThat(changed.has("upstream-sync.json") && proposed.tracks.some((track, index) =>
    track.reviews.length !== original.tracks[index].reviews.length || track.reviewedThrough !== original.tracks[index].reviewedThrough),
  "Proposal requires a semantic review registry update");
  requireThat(changed.size <= LIMITS.proposalFiles, "Proposal exceeds 100 unique files");
  for (const file of changed) requireThat(allowedPath(file, selected), `Disallowed proposal path: ${file}`);
  for (const file of changed) if (file.startsWith("plugins/")) requireThat(portedPaths.has(file), `Plugin change lacks ported disposition: ${file}`);
  requireThat(new Set([...changed].filter(file => file.startsWith("plugins/")).map(file => file.split("/")[1])).size <= 2, "Proposal may change at most two shipped plugins");
  for (const file of portedPaths) requireThat(changed.has(file), `Ported evidence has no changed local path: ${file}`);
  requireThat(!changed.has("port-provenance.json"), "Provenance is immutable");
  requireThat(!changed.has(".agents/plugins/marketplace.json") ||
    same(readAt(root, base, ".agents/plugins/marketplace.json"), head ? readAt(root, head, ".agents/plugins/marketplace.json") : json(path.join(root, ".agents/plugins/marketplace.json"))),
  "Published inventory must remain unchanged");
  for (const file of changed) {
    const mode = head ? git(root, ["ls-tree", head, "--", file]).text.split(" ")[0] : (lstatSync(path.join(root, file), { throwIfNoEntry: false })?.isSymbolicLink() ? "120000" : "100644");
    requireThat(!mode || mode === "100644" || mode === "100755", `Nonregular proposal file: ${file}`);
  }
  for (const plugin of selected) {
    if (![...changed].some(file => file.startsWith(`plugins/${plugin}/`))) continue;
    const file = `plugins/${plugin}/.codex-plugin/plugin.json`;
    const oldVersion = readAt(root, base, file).version;
    const newVersion = (head ? readAt(root, head, file) : json(path.join(root, file))).version;
    requireThat(newerVersion(oldVersion, newVersion), `Bump shipped plugin version: ${plugin}`);
  }
  const patch = git(root, head ? ["diff", "--binary", base, head] : ["diff", "--binary", base]).text;
  requireThat(Buffer.byteLength(patch) + untrackedBytes <= LIMITS.bytes, "Proposal exceeds patch size limit");
  return { files: [...changed].sort(), plugins: [...selected].sort() };
}
export function verifyArtifact({ root = ROOT, plan, directory }) {
  const entries = readdirSync(directory);
  const output = json(path.join(directory, "agent_output.json"));
  requireThat(Array.isArray(output.items), "Expected gh-aw agent_output.items");
  const requests = output.items.filter(item => item.type === "create_pull_request");
  requireThat(requests.length <= 1 && output.items.every(item => ["create_pull_request", "noop"].includes(item.type)), "Unexpected safe-output request");
  const transports = entries.filter(file => /^aw-.*\.(bundle|patch)$/.test(file));
  if (!requests.length) {
    requireThat(!transports.length, "Transport without a PR request");
    return { noop: true };
  }
  const request = requests[0];
  requireThat(!request.base || request.base === "main", "PR must target main");
  requireThat(!request.repo || request.repo === "scaryrawr/scarydex", "Unexpected PR repository");
  requireThat(typeof request.branch === "string" && /^upstream-sync\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(request.branch), "Explicit upstream-sync/ PR branch required");
  const stem = `aw-${request.branch.replace(/[/\\:*?"<>|]/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;
  requireThat(transports.length > 0 && transports.every(file => file === `${stem}.bundle` || file === `${stem}.patch`), "Unexpected transport filename");
  const results = [];
  for (const file of transports) {
    requireThat(lstatSync(path.join(directory, file)).isFile() && lstatSync(path.join(directory, file)).size <= LIMITS.bytes, "Invalid or oversized transport");
    if (file.endsWith(".bundle")) {
      const bundle = path.join(directory, file);
      const heads = lines(git(root, ["bundle", "list-heads", bundle]).text);
      requireThat(heads.length === 1 && heads[0].endsWith(` refs/heads/${request.branch}`), "Bundle must contain exactly the requested branch");
      git(root, ["fetch", "--no-tags", bundle, `refs/heads/${request.branch}`]);
      const head = commit(root, "FETCH_HEAD");
      results.push({ head, tree: git(root, ["rev-parse", `${head}^{tree}`]).text.trim(), result: verifyProposal({ root, plan, head }) });
    } else {
      const temporary = mkdtempSync(path.join(tmpdir(), "upstream-sync-patch-"));
      const checkout = path.join(temporary, "proposal");
      try {
        git(root, ["worktree", "add", "--detach", checkout, plan.base]);
        git(checkout, ["-c", "user.name=Upstream verifier", "-c", "user.email=verifier@localhost", "am", "--no-gpg-sign", path.join(directory, file)]);
        const head = commit(checkout, "HEAD");
        results.push({ head, tree: git(checkout, ["rev-parse", "HEAD^{tree}"]).text.trim(), result: verifyProposal({ root: checkout, plan, head }) });
      } finally {
        git(root, ["worktree", "remove", "--force", checkout], [0, 128]);
        rmSync(temporary, { recursive: true, force: true });
      }
    }
  }
  requireThat(results.every(result => result.tree === results[0].tree), "Patch and bundle disagree");
  return results[0].result;
}

export function skipEmptyPlan(plan, output) {
  requireThat(plan.schemaVersion === 1 && plan.repository === "scaryrawr/scarydex" &&
    Array.isArray(plan.tracks) && plan.tracks.length === TRACKS.length &&
    plan.tracks.every((track, index) => track.id === TRACKS[index].id && Array.isArray(track.commits)), "Invalid empty-plan input");
  if (plan.tracks.some(track => track.commits.length)) return { skipped: false };
  requireThat(typeof output === "string" && path.isAbsolute(output), "GH_AW_SAFE_OUTPUTS must be an absolute output path");
  mkdirSync(path.dirname(output), { recursive: true });
  appendFileSync(output, `${JSON.stringify({ type: "noop", message: "No upstream changes to review" })}\n`);
  return { skipped: true };
}

function options(args) {
  const values = {};
  while (args.length) {
    const key = args.shift();
    requireThat(/^--(root|scarypilot|cursor|output|plan|base|head|artifact-dir)$/.test(key ?? "") && args.length && !args[0].startsWith("--") && !values[key.slice(2)], `Invalid CLI option: ${key}`);
    values[key.slice(2)] = args.shift();
  }
  return values;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2);
    const opts = options(args);
    const flags = {
      plan: ["root", "scarypilot", "cursor", "output"],
      check: ["root"],
      verify: ["root", "plan", "base", "head", "artifact-dir"],
      "skip-empty": ["plan"],
    };
    requireThat(flags[command] && Object.keys(opts).every(key => flags[command].includes(key)), `Unsupported option for ${command}`);
    requireThat(!(opts.head && opts["artifact-dir"]), "--head and --artifact-dir are mutually exclusive");
    const root = path.resolve(opts.root ?? ROOT);
    let result;
    if (command === "plan") result = planSync({ root, scarypilot: opts.scarypilot, cursor: opts.cursor });
    else if (command === "check") {
      validateRegistry(json(path.join(root, "upstream-sync.json")), json(path.join(root, "port-provenance.json")));
      result = { tracks: TRACKS.length };
    } else if (command === "skip-empty") {
      requireThat(opts.plan, "skip-empty requires --plan FILE");
      result = skipEmptyPlan(json(opts.plan), process.env.GH_AW_SAFE_OUTPUTS);
    } else if (command === "verify") {
      requireThat(opts.plan, "verify requires --plan FILE");
      const plan = json(opts.plan);
      requireThat(!opts.base || opts.base === plan.base, "Plan/base mismatch");
      result = opts["artifact-dir"] ? verifyArtifact({ root, plan, directory: path.resolve(opts["artifact-dir"]) }) :
        verifyProposal({ root, plan, base: opts.base ?? plan.base, head: opts.head });
    } else throw new Error("Usage: upstream-sync.mjs plan --scarypilot DIR --cursor DIR [--output FILE] | check | skip-empty --plan FILE | verify --plan FILE [--base SHA] [--head SHA | --artifact-dir DIR]");
    if (opts.output) writeFileSync(opts.output, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
    else console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(`upstream-sync: ${error.message}`); process.exitCode = 1; }
}
