import { spawnSync } from "node:child_process";
import { constants, openSync, closeSync, fstatSync, readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync, realpathSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

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

// eslint-disable-next-line no-control-regex -- control characters are rejected in upstream paths by design
const UNSAFE_PATH = /[\x00-\x1f\x7f\\]/;

const PR_BRANCH = /^upstream-sync\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/;

// This policy helper runs in workflow jobs that never install dependencies, so its
// boundary predicates stay dependency-free instead of using a schema library.
// eslint-disable-next-line anti-slop/no-runtime-typeof -- dependency-free boundary predicate; see check-marketplace's install-free job guard
const isText = value => typeof value === "string";

// eslint-disable-next-line anti-slop/no-runtime-typeof -- dependency-free boundary predicate; see check-marketplace's install-free job guard
const plainObject = value => typeof value === "object" && value !== null && !Array.isArray(value);

const openPull = (pull, repository, publisher) => pull.state === "open" &&
  pull.title.startsWith("[upstream-sync] ") &&
  pull.user.login.toLowerCase() === publisher.toLowerCase() &&
  pull.head.repo?.full_name?.toLowerCase() === repository.toLowerCase() &&
  pull.head.ref.startsWith("upstream-sync/");

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const json = file => JSON.parse(readFileSync(file, "utf8"));

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function requireThat(ok, message) { if (!ok) throw new Error(message); }

function keys(value, expected) {
  requireThat(plainObject(value) && same(Object.keys(value).sort(), [...expected].sort()), `Invalid fields; expected ${expected.join(", ")}`);
}

function sha(value) {
  requireThat(isText(value) && SHA.test(value), `Invalid commit SHA: ${value}`);

  return value;
}

function safePath(value) {
  requireThat(isText(value) && !UNSAFE_PATH.test(value) &&
    !path.posix.isAbsolute(value) && value.split("/").every(p => p && p !== "." && p !== ".."), `Invalid path: ${value}`);

  return value;
}

const GIT_OPTIONS = {
  "rev-parse": ["--verify", "--is-shallow-repository", "--git-path"],
  "merge-base": ["--is-ancestor"],
  diff: ["--name-status", "-z", "-M", "--binary"],
  "rev-list": ["--reverse", "--topo-order"],
  show: ["-s", "--format=%P", "--format=%s", "--format=", "--diff-merges=separate", "--binary"],
  log: ["--format=%H", "--name-status", "-z", "-M", "--diff-merges=separate"],
  "ls-tree": ["-r", "-l", "-z"],
  "ls-files": ["--unmerged", "--others", "--exclude-standard", "-z"],
  mailsplit: ["--mboxrd"],
  mailinfo: [],
  apply: ["--numstat", "-z", "-"],
  "check-ref-format": ["--branch"],
  init: ["-q"],
  am: ["--no-gpg-sign"],
};

export function verifiedGitArguments(input) {
  requireThat(Array.isArray(input) && input.every(isText), "Git arguments must be literal text values");
  const args = [...input];

  if (args[0] === "-c") {
    requireThat(same(args.splice(0, 4), ["-c", "user.name=Upstream verifier", "-c", "user.email=verifier@localhost"]), "Unapproved Git configuration");
  }

  const command = args.shift();
  let allowedOptions = Object.hasOwn(GIT_OPTIONS, command) ? GIT_OPTIONS[command] : undefined;

  if (command === "remote") {
    requireThat(same(args, ["get-url", "origin"]), "Unapproved Git remote operation");

    return [...input];
  }

  if (command === "bundle") {
    requireThat(["list-heads", "unbundle"].includes(args.shift()) && args.length === 1, "Unapproved Git bundle operation");
    allowedOptions = [];
  }

  if (command === "worktree") {
    const operation = args.shift();

    requireThat(["add", "remove"].includes(operation), "Unapproved Git worktree operation");
    allowedOptions = operation === "add" ? ["--detach"] : ["--force"];
  }

  requireThat(allowedOptions !== undefined, `Unapproved Git operation: ${command}`);
  let paths = false;

  for (const arg of args) {
    if (arg === "--") paths = true;
    else if (!paths && arg.startsWith("-")) {
      requireThat(allowedOptions.includes(arg) || (command === "mailsplit" && arg.startsWith("-o") && path.isAbsolute(arg.slice(2))), `Unapproved Git option for ${command}: ${arg}`);
    }
  }

  const commandIndex = input[0] === "-c" ? 4 : 0;
  const isolation = ["diff", "show", "log"].includes(command) ? ["--no-ext-diff", "--no-textconv"] : command === "am" ? ["--no-3way"] : [];

  if (["show", "log"].includes(command)) isolation.push("--no-show-signature");

  return [...input.slice(0, commandIndex + 1), ...isolation, ...input.slice(commandIndex + 1)];
}

function git(directory, args, allowed = [0], input) {
  const argv = verifiedGitArguments(args);

  const environment = {
    ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("GIT_"))),
    GIT_TERMINAL_PROMPT: "0", GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null",
  };

  const prefix = ["--no-pager", "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false", "-c", "core.quotePath=false", "-C", directory];
  const executableConfig = spawnSync("git", [...prefix, "config", "--get-regexp", "^(alias\\.|filter\\.|diff\\..*\\.(command|textconv)$|diff\\.external$|merge\\..*\\.driver$|gpg\\.(.*\\.)?(program|defaultkeycommand)$|core\\.(sshcommand|pager|editor)$|credential\\.(.*\\.)?helper$)"], { env: environment, maxBuffer: LIMITS.bytes });

  if (executableConfig.error || ![0, 1].includes(executableConfig.status)) throw new Error("Unable to verify Git executable configuration", { cause: executableConfig.error });
  requireThat(executableConfig.status === 1, "Git executable configuration is not allowed in the publication helper");

  const result = spawnSync("git", [...prefix, ...argv], {
    input, maxBuffer: LIMITS.bytes, env: environment,
  });

  if (result.error || !allowed.includes(result.status)) throw new Error(`git ${args[0]} failed in ${directory}: ${result.error?.message ?? result.stderr.toString("utf8").trim()}`);
  let text;

  try { text = new TextDecoder("utf-8", { fatal: true }).decode(result.stdout); }
  catch (error) { throw new Error(`git ${args[0]} returned unsupported UTF-8 bytes`, { cause: error }); }

  return { text, status: result.status };
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
      requireThat(isText(review.reason) && review.reason.trim().length >= 10, "Review needs a specific reason");

      for (const key of ["paths", "localPaths"]) {
        requireThat(Array.isArray(review[key]) && new Set(review[key]).size === review[key].length, `Invalid ${key}`);
        review[key].forEach(safePath);
      }

      requireThat(review.paths.length > 0 && Array.isArray(review.evidence) && review.evidence.length > 0 &&
        review.evidence.every(e => isText(e) && e.trim().length >= 10), "Review needs paths and evidence");

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

function cursorHistory(directory, base, head) {
  const parts = git(directory, ["log", "--format=%H", "--name-status", "-z", "-M", "--diff-merges=separate", `${base}..${head}`]).text.split("\0");
  const commits = new Map();
  let current;

  for (let index = 0; index < parts.length;) {
    const field = parts[index++].trim();

    if (!field) continue;

    if (SHA.test(field)) {
      current = field;

      if (!commits.has(current)) commits.set(current, new Set());
      continue;
    }

    requireThat(current && /^[ACDMRTUXB][0-9]*$/.test(field), "Invalid cursor audit metadata");
    commits.get(current).add(safePath(parts[index++]));

    if (/^[RC]/.test(field)) commits.get(current).add(safePath(parts[index++]));
  }

  return commits;
}

export function planSync({ root = ROOT, scarypilot, cursor, heads = {} }) {
  const provenance = json(path.join(root, "port-provenance.json"));
  const registry = validateRegistry(json(path.join(root, "upstream-sync.json")), provenance);
  const repositories = { scarypilot, cursor };
  const audits = new Map();

  const tracks = registry.tracks.map(track => {
    const directory = repositories[track.source];
    requireThat(directory, `Missing --${track.source} upstream directory`);
    requireThat(git(directory, ["remote", "get-url", "origin"]).text.trim().replace(/\.git$/, "") === SOURCES[track.source], "Upstream remote does not match source registry");
    const base = track.reviewedThrough ?? baseline(track, provenance);
    commit(directory, base);
    const head = commit(directory, heads[track.source] ?? "HEAD");
    ancestor(directory, baseline(track, provenance), base);
    const reviewed = new Map(track.reviews.map(review => [review.commit, review]));
    const auditKey = `${track.source}:${baseline(track, provenance)}:${base}`;

    if (!audits.has(auditKey)) audits.set(auditKey, cursorHistory(directory, baseline(track, provenance), base));

    for (const [id, changed] of audits.get(auditKey)) {
      const paths = [...changed].filter(file => relevant(track, file)).sort();

      if (!paths.length) continue;
      const review = reviewed.get(id);
      requireThat(review && FINAL.has(review.disposition) && same(review.paths, paths), "Existing cursor has a review gap");
    }

    const all = history(directory, track, base, head).filter(change => {
      const review = reviewed.get(change.commit);

      if (!FINAL.has(review?.disposition)) return true;
      requireThat(same(review.paths, change.paths), "Existing final review paths changed");

      return false;
    });

    const candidates = all.slice(0, LIMITS.candidates);

    return { ...TRACKS.find(t => t.id === track.id), repository: SOURCES[track.source], base, head,
      reviewHead: all.length > candidates.length ? candidates.at(-1).commit : head,
      remaining: all.length - candidates.length, commits: candidates };
  });

  return { schemaVersion: 1, repository: "scaryrawr/scarydex", base: commit(root, "HEAD"), tracks };
}

export function hasOpenProposal(pulls, repository, publisher) {
  requireThat(Array.isArray(pulls) && isText(repository) && repository.length > 0 &&
    isText(publisher) && publisher.length > 0, "Duplicate check requires repository and trusted publisher");

  return pulls.some(pull => {
    requireThat(plainObject(pull) && isText(pull.state) && isText(pull.title) &&
      plainObject(pull.user) && isText(pull.user.login) && plainObject(pull.head) && isText(pull.head.ref), "Invalid pull request response");

    return openPull(pull, repository, publisher);
  });
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
  const paths = new Set();

  for (const id of ids) {
    const parents = git(root, ["show", "-s", "--format=%P", id]).text.trim().split(" ");

    for (const parent of parents) {
      const changes = changedPaths(root, parent, id);
      verifyBlobSizes(root, id, changes.flatMap(change => change.paths));
      requireThat(changes.every(change => change.paths.every(file => allowedPath(file, plugins))), "Disallowed intermediate commit path");

      for (const file of changes.flatMap(change => change.paths)) {
        paths.add(file);
        const mode = git(root, ["ls-tree", id, "--", file]).text.split(" ")[0];
        requireThat(!mode || mode === "100644" || mode === "100755", `Nonregular intermediate file: ${file}`);
      }
    }
  }

  return paths;
}

function verifyBlobSizes(root, ref, files) {
  if (!files.length) return 0;
  const entries = git(root, ["ls-tree", "-r", "-l", "-z", ref, "--", ...files]).text.split("\0").filter(Boolean);
  let total = 0;

  for (const entry of entries) {
    const size = /^\d+ blob [0-9a-f]+ +(\d+)\t/.exec(entry)?.[1];

    if (size === undefined) continue;
    total += Number(size);
    requireThat(total <= LIMITS.bytes, "Proposal exceeds aggregate uncompressed blob size limit");
  }

  return total;
}

export function verifyProposal({ root = ROOT, plan, base = plan.base, head }) {
  sha(base);
  const intermediate = verifyCommits(root, base, head ? sha(head) : commit(root, "HEAD"));
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
  verifyBlobSizes(root, head ?? commit(root, "HEAD"), files.flatMap(change => change.paths));
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

  for (const file of intermediate) requireThat(changed.has(file), `Intermediate path absent from final proposal: ${file}`);

  if (!head) {
    let total = 0;

    for (const file of changed) {
      const stat = lstatSync(path.join(root, file), { throwIfNoEntry: false });

      if (stat?.isFile()) total += stat.size;
      requireThat(total <= LIMITS.bytes, "Proposal exceeds aggregate uncompressed blob size limit");
    }
  }

  requireThat(changed.has("upstream-sync.json") && proposed.tracks.some((track, index) =>
    track.reviews.length !== original.tracks[index].reviews.length || track.reviewedThrough !== original.tracks[index].reviewedThrough),
  "Proposal requires a semantic review registry update");
  requireThat(changed.size <= LIMITS.proposalFiles, "Proposal exceeds 100 unique files");

  for (const file of changed) requireThat(allowedPath(file, selected), `Disallowed proposal path: ${file}`);

  for (const file of changed) if (file.startsWith("plugins/")) requireThat(portedPaths.has(file), `Plugin change lacks ported disposition: ${file}`);
  requireThat(new Set([...changed].flatMap(file => file.startsWith("plugins/") ? [file.split("/")[1]] : [])).size <= 2, "Proposal may change at most two shipped plugins");

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

function deltaSize(data) {
  let offset = 0;

  const read = () => {
    let value = 0, shift = 0, byte;

    do {
      requireThat(offset < data.length && shift <= 49, "Invalid binary delta size");
      byte = data[offset++];
      value += (byte & 0x7f) * 2 ** shift;
      shift += 7;
    } while (byte & 0x80);

    requireThat(Number.isSafeInteger(value) && value <= LIMITS.bytes, "Transport exceeds expanded delta size limit");

    return value;
  };

  return Math.max(read(), read());
}

function boundedInflate(data) {
  try { return inflateSync(data, { maxOutputLength: LIMITS.bytes, info: true }); }
  catch (error) { throw new Error(`Invalid or oversized expanded transport data: ${error.message}`, { cause: error }); }
}

function verifyBundleExpansion(data) {
  const headerEnd = data.indexOf("\n\n");
  requireThat(headerEnd >= 0 && /^# v[23] git bundle\n/.test(data.subarray(0, headerEnd).toString("ascii")), "Invalid bundle header");
  let offset = headerEnd + 2, total = 0;
  requireThat(data.subarray(offset, offset + 4).toString("ascii") === "PACK" && data.length >= offset + 12, "Invalid bundle pack");
  const version = data.readUInt32BE(offset + 4);
  const count = data.readUInt32BE(offset + 8);
  requireThat((version === 2 || version === 3) && count <= LIMITS.paths, "Invalid or excessive pack objects");
  offset += 12;

  for (let index = 0; index < count; index++) {
    requireThat(offset < data.length - 20, "Truncated bundle pack");
    let byte = data[offset++], size = byte & 15, shift = 4;
    const type = (byte >> 4) & 7;

    while (byte & 0x80) {
      requireThat(offset < data.length - 20 && shift <= 49, "Invalid pack object size");
      byte = data[offset++];
      size += (byte & 0x7f) * 2 ** shift;
      shift += 7;
    }

    requireThat(size <= LIMITS.bytes && [1, 2, 3, 4, 6, 7].includes(type), "Transport exceeds expanded pack object size limit");

    if (type === 6) {
      do {
        requireThat(offset < data.length - 20, "Truncated pack delta offset");
        byte = data[offset++];
      } while (byte & 0x80);
    } else if (type === 7) offset += 20;
    const inflated = boundedInflate(data.subarray(offset, data.length - 20));
    requireThat(inflated.buffer.length === size, "Pack object size mismatch");
    offset += inflated.engine.bytesWritten;
    total += type === 6 || type === 7 ? Math.max(size, deltaSize(inflated.buffer)) : size;
    requireThat(total <= LIMITS.bytes, "Transport exceeds aggregate expanded pack size limit");
  }

  requireThat(offset === data.length - 20, "Invalid bundle pack trailer");
}

const BASE85 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";

function expandedPatchSize(data) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(data).replace(/\r\n/g, "\n");
  let total = data.length;

  for (const block of text.matchAll(/^GIT binary patch\n([\s\S]*?)(?=\ndiff --git |\n-- \n|(?![\s\S]))/gm)) {
    const sections = block[1].trimEnd().split("\n\n");
    requireThat(sections.length <= 2, "Invalid binary patch sections");

    for (const section of sections) {
      const [header, ...lines] = section.split("\n");
      const match = /^(literal|delta) (\d+)$/.exec(header);
      requireThat(match && Number(match[2]) <= LIMITS.bytes, "Transport exceeds expanded binary patch size limit");

      const chunks = lines.map(line => {
        const marker = line.charCodeAt(0);
        const length = marker >= 65 && marker <= 90 ? marker - 64 : marker >= 97 && marker <= 122 ? marker - 70 : 0;
        requireThat(length > 0 && line.length === 1 + Math.ceil(length / 4) * 5, "Invalid binary patch encoding");
        const chunk = Buffer.alloc(Math.ceil(length / 4) * 4);

        for (let offset = 1; offset < line.length; offset += 5) {
          let value = 0;

          for (const character of line.slice(offset, offset + 5)) {
            const digit = BASE85.indexOf(character);
            requireThat(digit >= 0, "Invalid binary patch digit");
            value = value * 85 + digit;
          }

          requireThat(value <= 0xffffffff, "Invalid binary patch word");
          chunk.writeUInt32BE(value, (offset - 1) / 5 * 4);
        }

        return chunk.subarray(0, length);
      });

      const inflated = boundedInflate(Buffer.concat(chunks));
      requireThat(inflated.buffer.length === Number(match[2]), "Binary patch size mismatch");
      total += match[1] === "delta" ? Math.max(inflated.buffer.length, deltaSize(inflated.buffer)) : inflated.buffer.length;
      requireThat(total <= LIMITS.bytes, "Transport exceeds aggregate expanded binary patch size limit");
    }
  }

  return total;
}

function verifyPatchExpansion(root, file, base) {
  const temporary = mkdtempSync(path.join(tmpdir(), "upstream-sync-mail-"));

  try {
    const count = Number(git(root, ["mailsplit", "--mboxrd", `-o${temporary}`, file]).text.trim());
    requireThat(Number.isInteger(count) && count > 0 && count <= 100, "Invalid or excessive patch messages");
    let total = 0;

    for (const name of readdirSync(temporary).sort()) {
      const body = path.join(temporary, "body"), patch = path.join(temporary, "patch");
      git(root, ["mailinfo", body, patch], [0], readFileSync(path.join(temporary, name)));
      const data = readFileSync(patch);
      requireThat(data.length <= LIMITS.bytes, "Transport exceeds decoded patch size limit");
      total += expandedPatchSize(data);
      const stats = git(root, ["apply", "--numstat", "-z", "-"], [0], data).text.split("\0").filter(Boolean);

      const textPaths = stats.flatMap(record => {
        const match = /^(\d+|-)\t(\d+|-)\t([\s\S]+)$/.exec(record);
        requireThat(match, "Invalid patch path statistics");
        safePath(match[3]);

        return match[1] === "-" ? [] : [match[3]];
      });

      total += verifyBlobSizes(root, base, textPaths);
      requireThat(total <= LIMITS.bytes, "Transport exceeds aggregate expanded patch size limit");
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
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
  requireThat(isText(request.branch) && PR_BRANCH.test(request.branch), "Explicit upstream-sync/ PR branch required");
  requireThat(git(root, ["check-ref-format", "--branch", request.branch], [0, 128]).status === 0, "Invalid Git branch name");
  const stem = `aw-${request.branch.replace(/[/\\:*?"<>|]/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;
  requireThat(transports.length > 0 && transports.every(file => file === `${stem}.bundle` || file === `${stem}.patch`), "Unexpected transport filename");
  const results = [];

  for (const file of transports) {
    requireThat(lstatSync(path.join(directory, file)).isFile() && lstatSync(path.join(directory, file)).size <= LIMITS.bytes, "Invalid or oversized transport");
    const data = readFileSync(path.join(directory, file));

    if (file.endsWith(".bundle")) {
      verifyBundleExpansion(data);
      const bundle = path.join(directory, file);
      const heads = lines(git(root, ["bundle", "list-heads", bundle]).text);
      requireThat(heads.length === 1 && heads[0].endsWith(` refs/heads/${request.branch}`), "Bundle must contain exactly the requested branch");
      const temporary = mkdtempSync(path.join(tmpdir(), "upstream-sync-bundle-"));

      try {
        git(root, ["init", "-q", temporary]);
        const objects = path.resolve(root, git(root, ["rev-parse", "--git-path", "objects"]).text.trim());
        writeFileSync(path.join(temporary, ".git/objects/info/alternates"), `${objects}\n`);
        git(temporary, ["bundle", "unbundle", bundle]);
        const head = commit(temporary, heads[0].split(" ")[0]);
        results.push({ head, tree: git(temporary, ["rev-parse", `${head}^{tree}`]).text.trim(), result: verifyProposal({ root: temporary, plan, head }) });
      } finally {
        rmSync(temporary, { recursive: true, force: true });
      }
    } else {
      verifyPatchExpansion(root, path.join(directory, file), plan.base);
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

function externalOutput(file) {
  let ancestor = path.resolve(file);
  const missing = [];

  while (true) {
    try {
      ancestor = realpathSync(ancestor);
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      let stats;

      try { stats = lstatSync(ancestor); }
      catch (missing) { if (missing.code !== "ENOENT") throw missing; }

      requireThat(!stats?.isSymbolicLink(), "Publication outputs cannot traverse a dangling symbolic link");
      missing.unshift(path.basename(ancestor));
      ancestor = path.dirname(ancestor);
    }
  }

  const resolved = path.join(ancestor, ...missing);
  const relative = path.relative(realpathSync(ROOT), resolved);

  requireThat(relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative), "Publication outputs must stay outside the policy helper checkout");

  return resolved;
}

function writeExternalOutput(file, content, append = false) {
  const output = externalOutput(file);

  requireThat(Number.isInteger(constants.O_NOFOLLOW) && constants.O_NOFOLLOW > 0 &&
    Number.isInteger(constants.O_NONBLOCK) && constants.O_NONBLOCK > 0, "Publication outputs require no-follow, nonblocking file opens");

  if (append) mkdirSync(path.dirname(output), { recursive: true });

  const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW | constants.O_NONBLOCK |
    (append ? constants.O_APPEND : constants.O_EXCL);

  const descriptor = openSync(output, flags, 0o600);

  try {
    const stats = fstatSync(descriptor);

    requireThat(stats.isFile() && stats.nlink === 1, "Publication output must be a regular single-link file");
    const verified = externalOutput(output);
    const current = lstatSync(verified);

    requireThat(verified === output && current.isFile() && current.nlink === 1 && current.dev === stats.dev && current.ino === stats.ino,
      "Output path changed while opening the publication file");
    writeFileSync(descriptor, content);
  } finally {
    closeSync(descriptor);
  }
}

export function skipEmptyPlan(plan, output) {
  requireThat(plainObject(plan) && plan.schemaVersion === 1 && plan.repository === "scaryrawr/scarydex" &&
    Array.isArray(plan.tracks) && plan.tracks.length === TRACKS.length &&
    plan.tracks.every((track, index) => plainObject(track) && track.id === TRACKS[index].id && Array.isArray(track.commits)), "Invalid empty-plan input");

  if (plan.tracks.some(track => track.commits.length)) return { skipped: false };
  requireThat(isText(output) && path.isAbsolute(output), "GH_AW_SAFE_OUTPUTS must be an absolute output path");
  writeExternalOutput(output, `${JSON.stringify({ type: "noop", message: "No upstream changes to review" })}\n`, true);

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

    if (opts.output) writeExternalOutput(opts.output, `${JSON.stringify(result, null, 2)}\n`);
    else console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(`upstream-sync: ${error.message}`); process.exitCode = 1; }
}
