import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, test } from "node:test";
import { parse } from "yaml";
import { checkModuleSyntax, dependencyFreeClosure, EXPECTED_PLUGINS, findBareImports, findComputedImports, scanImports, standAloneHelpers, validateMarketplace, validateBundle } from "../tools/check-marketplace.mjs";

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
  assert.deepEqual(result, { plugins: EXPECTED_PLUGINS.length, skills: 62 });
  await validateBundle(root);
});

test("excluded plugins or duplicate inventory cannot enter the marketplace", async () => {
  const dir = await fixture(), file = path.join(dir, ".agents/plugins/marketplace.json");
  const catalog = JSON.parse(await readFile(file, "utf8")); catalog.plugins[0].name = "azure-devops";
  await writeFile(file, JSON.stringify(catalog));
  await assert.rejects(validateMarketplace(dir), /exactly the eight/);
});

test("README inventory rejects missing rows even when prose mentions the plugin", async () => {
  const dir = await fixture(), readme = path.join(dir, "README.md");
  const original = await readFile(readme, "utf8");

  for (const name of EXPECTED_PLUGINS) {
    const withoutRow = original.split("\n").filter((line) => !line.startsWith(`| \`${name}\` |`)).join("\n");
    assert.notEqual(withoutRow, original, `No table row found for ${name}`);
    await writeFile(readme, withoutRow + `\nProse still mentions \`${name}\`.\n`);
    await assert.rejects(validateMarketplace(dir), new RegExp(`README is missing plugin from inventory: ${name}`));
  }

  await writeFile(readme, original);
  assert.deepEqual(await validateMarketplace(dir), { plugins: EXPECTED_PLUGINS.length, skills: 62 });
});

test("README inventory rejects unexpected and duplicate table entries", async () => {
  const dir = await fixture(), readme = path.join(dir, "README.md");
  const original = await readFile(readme, "utf8");

  for (const row of ["| `retired-plugin` | Stale entry | None |", "| `decide` | Duplicate | Node |"] ) {
    await writeFile(readme, original + "\n" + row + "\n");
    await assert.rejects(validateMarketplace(dir), /unexpected or duplicate rows/);
  }
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

test("dependency availability is tracked per step, not per job", () => {
  const helper = "node tools/upstream-sync.mjs";
  const install = "bun install --frozen-lockfile";
  const job = steps => standAloneHelpers({ jobs: { build: { steps } } });

  // An install that runs after the helper cannot have supplied its dependencies.
  assert.deepEqual([...job([{ run: helper }, { run: install }])], ["tools/upstream-sync.mjs"]);

  // An install that runs before the helper does, so only that helper is exempt.
  assert.deepEqual([...job([{ run: install }, { run: helper }])], []);

  // Mentioning an install is not running one: neither a comment nor echoed text counts.
  assert.deepEqual([...job([{ run: `# bun install\n${helper}` }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `echo bun install\n${helper}` }])], ["tools/upstream-sync.mjs"]);

  // The exemption applies to later steps within the same job, and a second helper that
  // runs before the install is still scanned.
  assert.deepEqual([...job([{ run: helper }, { run: install }, { run: "node tools/other.mjs" }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `set -e; ${install} && ${helper}` }])], []);
  // Ordering also matters *within* a single script: a helper that runs before the install
  // in the same step had no dependencies available.
  assert.deepEqual([...job([{ run: "node tools/upstream-sync.mjs\nbun install --frozen-lockfile" }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "bun install --frozen-lockfile\nnode tools/upstream-sync.mjs" }])], []);
  assert.deepEqual([...job([{ run: "node tools/upstream-sync.mjs && bun install" }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "bun install && node tools/upstream-sync.mjs" }])], []);
  assert.deepEqual([...job([{ run: "set -e; bun install; node tools/upstream-sync.mjs" }])], []);
  assert.deepEqual([...job([{ run: "bun install", }, { run: "node tools/upstream-sync.mjs\nnode tools/other.mjs" }])], []);

  // Textual order is not proof. A global or relocated install populates a directory the
  // checkout never loads from, and the failure, pipeline, background, subshell, and
  // `continue-on-error` forms all reach the helper without installed dependencies.
  assert.deepEqual([...job([{ run: "npm install -g @openai/codex" }, { run: helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "bun install -g pkg" }, { run: helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "npm install --prefix /tmp/elsewhere pkg" }, { run: helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `bun install || ${helper}` }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `bun install && echo ok || ${helper}` }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `bun install & ${helper}` }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `bun install | tee install.log\n${helper}` }])], ["tools/upstream-sync.mjs"]);
  // `|&` is a pipeline too: it splits commands the same way `|` does, so an install
  // written on the left of it still cannot be credited to the step that follows.
  assert.deepEqual([...job([{ run: `bun install |& tee install.log\n${helper}` }])], ["tools/upstream-sync.mjs"]);
  // A short-circuit can skip the install entirely. `true` exits 0, so the shell never
  // runs the right-hand operand and the helper that follows runs with no dependencies;
  // the skipped operand's success has to survive the `||` for this to be modelled.
  assert.deepEqual([...job([{ run: `true || bun install\n${helper}` }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `false && bun install\n${helper}` }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `(bun install)\n${helper}` }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "bun install", "continue-on-error": true }, { run: helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: install }, { run: helper, if: "always()" }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `set +e\nbun install\n${helper}` }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: `set +o errexit\nbun install\n${helper}` }])], ["tools/upstream-sync.mjs"]);
  assert.throws(() => job([{ run: `cd sub\nbun install\n${helper}` }]), /unprovable helper working directory/);
  assert.deepEqual([...job([{ run: "cd sub && bun install" }, { run: helper }])], ["tools/upstream-sync.mjs"]);

  // What does prove it: `&&`, and sequential commands under the `bash -e` shell GitHub
  // Actions gives `run:` steps — with redirections and quoted text read as text, not as
  // control, so a `;` or `&` inside a string never splits a command.
  assert.deepEqual([...job([{ run: "npm install -g pkg" }, { run: install }, { run: helper }])], []);
  assert.deepEqual([...job([{ run: "bun install > /dev/null 2>&1\n" + helper }])], []);
  assert.deepEqual([...job([{ run: `bun install\necho '&& ; | &'\n${helper}` }])], []);
  assert.deepEqual([...job([{ run: install }, { run: helper, if: "success()" }])], []);
  // What `&&` does not prove: bash forgives the failure of a list that short-circuited,
  // so when the install is followed by `&&` and the helper waits on a later line, the
  // helper really does run with nothing installed. Quoted operators stay text.
  assert.deepEqual([...job([{ run: "bun install && echo " + "'" + "ok || fallback" + "'" + "\n" + helper }])], ["tools/upstream-sync.mjs"]);
  // An install that gates the helper is proof: the helper runs only in the worlds where
  // the install exited 0.
  assert.deepEqual([...job([{ run: install + " && " + helper }])], []);

  // Certain exit statuses make a skip provable: a gated helper behind `false` or `exit 1`
  // never runs, so it needs no exemption; a helper after `exit 0` runs with nothing
  // installed and is scanned.
  assert.deepEqual([...job([{ run: "false && " + helper }])], []);
  assert.deepEqual([...job([{ run: "exit 1 && " + helper }])], []);
  assert.deepEqual([...job([{ run: "exit 0" + "\n" + helper }])], ["tools/upstream-sync.mjs"]);
  // A step that ends with no world still able to succeed proves no install, so the next
  // step is scanned rather than vacuously credited.
  assert.deepEqual([...job([{ run: "false" }, { run: helper }])], ["tools/upstream-sync.mjs"]);

  // Operators inside quotes are arguments, not control: splitting on them would invent a
  // short-circuit that the shell never sees.
  assert.deepEqual([...job([{ run: install + " '&& exit 1'" + "\n" + helper }])], []);

  // An install that omits devDependencies never supplies the tooling a helper imports — the
  // TypeBox and TypeScript this repository develops against are devDependencies — so every
  // omitting spelling keeps the helper in the scanned set, comma lists and space forms included.
  assert.deepEqual([...job([{ run: "bun install --production\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "npm ci --omit=dev\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "npm ci --omit dev\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: install + " --omit=dev,optional\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "npm install --only=production\n" + helper }])], ["tools/upstream-sync.mjs"]);
  // Omitting a different bucket still installs devDependencies, and a negated flag asks for
  // them, so both are still proof.
  assert.deepEqual([...job([{ run: "npm ci --omit=optional\n" + helper }])], []);
  assert.deepEqual([...job([{ run: "npm install --production=false\n" + helper }])], []);

  // An install written inside a block runs only if the block runs, so a never-taken branch,
  // a loop over an empty list, or a function body that is never called cannot credit a later
  // helper. `bash -c 'if false; then touch m; fi'` really leaves the file absent.
  assert.deepEqual([...job([{ run: "if false; then\nbun install\nfi\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "install_it() {\nbun install\n}\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "for x in ; do\nbun install\ndone\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "while false; do\nbun install\ndone\n" + helper }])], ["tools/upstream-sync.mjs"]);
  // Failing closed must not smear past the block: once it closes, a full install is proof
  // again, and a block that only echoes leaves that proof alone.
  assert.deepEqual([...job([{ run: "if true; then\necho ok\nfi\n" + install + "\n" + helper }])], []);
  assert.deepEqual([...job([{ run: "install_it() {\necho ok\n}\n" + install + "\n" + helper }])], []);

  // Depth never goes negative, so a stray delimiter left by an edit cannot unwind a block
  // that follows it and re-credit an install written inside that block.
  assert.deepEqual([...job([{ run: "}" + "\n" + "if true; then\nbun install\nfi\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: install + " \"|| exit 1\"" + "\n" + helper }])], []);
  // A heredoc body goes to the command's standard input as data, so an install written there
  // never ran. `bash -c 'cat > /tmp/hd_out <<"EOF"\ntouch /tmp/hd_marker\nEOF'` leaves the
  // marker absent while writing the text to the file, so the helper after it is still flagged.
  assert.deepEqual([...job([{ run: "cat <<'EOF'\nbun install\nEOF\n" + helper }])], ["tools/upstream-sync.mjs"]);

  // Bash consumes all bodies in declaration order, including redirections on commands
  // separated by operators on the same line. None of those bodies can install dependencies.
  assert.deepEqual([...job([{ run: "cat <<A <<B\nfirst\nA\nbun install\nB\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "cat <<A <<'B'\nbun install\nA\nbun install\nB\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "cat <<A; cat <<B\nfirst\nA\nbun install\nB\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "cat <<A <<-B\nfirst\nA\n\tbun install\n\tB\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "cat <<A <<B\nfirst\nA\n$(" + helper + ")\nB" }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "cat <<A <<'B'\nfirst\nA\n$(" + helper + ")\nB" }])], []);
  assert.deepEqual([...job([{ run: "cat <<A <<B\nfirst\nA\nsecond\nB\n" + install + "\n" + helper }])], []);
  assert.throws(() => job([{ run: "cat <<A <<B\nfirst\nA\nbun install" }]), /heredoc B is never terminated/);

  // The delimiter may be unquoted and named after whitespace, which is what the shipped
  // workflow does with `cat > "$FILE" << GH_AW_MCP_CONFIG_..._EOF`; it is still a heredoc.
  assert.deepEqual([...job([{ run: "cat > /tmp/cfg.toml << GH_AW_EOF\nbun install\nGH_AW_EOF\n" + helper }])], ["tools/upstream-sync.mjs"]);

  // `<<-` strips leading tabs before matching its terminator, so an indented body is data.
  assert.deepEqual([...job([{ run: "cat <<-EOF\n\tbun install\n\tEOF\n" + helper }])], ["tools/upstream-sync.mjs"]);

  // An unterminated heredoc is a shell syntax error that proves nothing, so it is refused
  // rather than leaving its body to be read as commands.
  assert.throws(() => job([{ run: "cat <<EOF\nbun install\n" + helper }]), /never terminated/);

  // `<<<` is a herestring with no terminating line, so it must not be mistaken for a heredoc
  // nor swallow the rest of the script; the helper on that line is still flagged.
  assert.deepEqual([...job([{ run: helper + " <<< data" }])], ["tools/upstream-sync.mjs"]);

  // An unquoted delimiter lets bash expand `$(...)` within the body, and it really does: the
  // unquoted form runs the substitution while the quoted form prints it literally.
  assert.deepEqual([...job([{ run: "cat <<EOF\n$(" + helper + ")\nEOF" }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "cat <<'EOF'\n$(" + helper + ")\nEOF" }])], []);

  // Runtime flags sit between the interpreter and its entrypoint, so word boundaries decide
  // what a `node` invocation names rather than one pattern that cannot cross the space.
  assert.deepEqual([...job([{ run: "node --no-warnings tools/upstream-sync.mjs" }])], ["tools/upstream-sync.mjs"]);
  assert.throws(() => job([{ run: "node --import tsx tools/upstream-sync.mjs" }]), /bare preload module/);
  assert.deepEqual([...job([{ run: "node --import node:fs tools/upstream-sync.mjs" }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: 'node "${GITHUB_WORKSPACE}/tools/upstream-sync.mjs"' }])], ["tools/upstream-sync.mjs"]);

  // Two entrypoints are two helpers, and neither may collapse into the last one the way a
  // greedy pattern would; a quoted path names a helper just as plainly as a bare one.
  assert.deepEqual([...job([{ run: "node tools/upstream-sync.mjs tools/other.mjs" }])].sort(), ["tools/other.mjs", "tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: 'node "tools/upstream-sync.mjs" --verify' }])], ["tools/upstream-sync.mjs"]);

  // Naming a helper is not running it: outside a `node` invocation the path is only text.
  assert.deepEqual([...job([{ run: 'cat tools/upstream-sync.mjs' }])], []);
  assert.deepEqual([...job([{ run: 'echo "node tools/upstream-sync.mjs"' }])], []);

  // A flag in front of the entrypoint does not revive a helper the install already supplied.
  assert.deepEqual([...job([{ run: install + "\nnode --no-warnings tools/upstream-sync.mjs" }])], []);

  // A backslash escapes the separator after it, so the separator separates nothing: bash
  // prints `; bun install` as an argument rather than running it, proven by
  // `bash -c 'echo \; touch /tmp/m'` leaving `m` absent. Splitting there would credit an
  // install that never ran and drop the helper that follows from the dependency-free closure.
  assert.deepEqual([...job([{ run: "echo \\; bun install\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "echo \\| bun install\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "echo \\& bun install\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "echo \\&& bun install\n" + helper }])], ["tools/upstream-sync.mjs"]);

  // A backslash-newline continues the line, and bash joins it without a space, so an install
  // written across the break really is one install command and does exempt the helper —
  // `bash -c 'touch \<newline>/tmp/m'` creates the file while `echo touch \<newline>/tmp/m`
  // does not.
  assert.deepEqual([...job([{ run: "bun \\\ninstall\n" + helper }])], []);
  assert.deepEqual([...job([{ run: "bun install \\\n--frozen-lockfile\n" + helper }])], []);

  // The escape belongs to the helper's own arguments and does not hide the helper it runs.
  assert.deepEqual([...job([{ run: helper + " \\; echo done" }])], ["tools/upstream-sync.mjs"]);

  // An install that only reports or only restages a lockfile never populates node_modules, so
  // it proves no more than an install that never ran: `--dry-run` writes nothing and
  // `--package-lock-only` touches only the lockfile, so the helper after either is still
  // scanned, and `bun install` accepts `--dry-run` too.
  assert.deepEqual([...job([{ run: "npm install --dry-run\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "npm install --dry-run=true\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "npm install --package-lock-only --no-audit\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "bun install --dry-run\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "bun install --lockfile-only\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "bun install --lockfile-only=true\n" + helper }])], ["tools/upstream-sync.mjs"]);
  assert.deepEqual([...job([{ run: "bun install --cache=/tmp/--lockfile-only\n" + helper }])], []);

  // Refusing these must not smear into the flags that only skip bookkeeping: `--no-save`,
  // `--no-package-lock` and `--ignore-scripts` all still write node_modules, and a negated
  // `--dry-run=false` asks for the real install, so each stays proof.
  assert.deepEqual([...job([{ run: "npm install --dry-run=false\n" + helper }])], []);
  assert.deepEqual([...job([{ run: "npm install --package-lock-only=false\n" + helper }])], []);
  assert.deepEqual([...job([{ run: "npm install --no-save\n" + helper }])], []);
  assert.deepEqual([...job([{ run: "npm install --no-package-lock\n" + helper }])], []);
  assert.deepEqual([...job([{ run: "npm install --ignore-scripts\n" + helper }])], []);
  assert.deepEqual([...job([{ run: install + "\n" + helper }])], []);

  // A dry-run followed by a real install is proof, because the second command populated the tree.
  assert.deepEqual([...job([{ run: "npm install --dry-run\n" + install + "\n" + helper }])], []);

  // The flag has to be its own word, so a value that merely contains the text does not refuse
  // a full install, while a relocated install is still refused for its own separate reason.
  assert.deepEqual([...job([{ run: "npm install --cache=/tmp/--dry-run\n" + helper }])], []);
  assert.deepEqual([...job([{ run: "npm install --prefix=/tmp/dry-running\n" + helper }])], ["tools/upstream-sync.mjs"]);
});

test("install proof uses shell words rather than raw quoted options", () => {
  const helper = "node tools/upstream-sync.mjs";
  const job = install => [...standAloneHelpers({ jobs: { build: { steps: [{ run: install + "\n" + helper }] } } })];

  for (const install of [
    'npm install "--package-lock-only"',
    "npm install '--dry-run'",
    'bun install "--lockfile-only"',
    'npm install "--production"',
    'npm install "--omit" "dev"',
    'npm install --omit="dev,optional"',
    'npm install "--only=production"',
    'npm install "--global"',
    'npm install "--prefix=/tmp/other"',
    'npm install "--package-lock-"only',
    '"npm" install "--production"',
  ]) assert.deepEqual(job(install), ["tools/upstream-sync.mjs"]);

  for (const install of [
    'npm install "--dry-run=false"',
    'npm install "--production=false"',
    'npm install --cache "/tmp/--production --dry-run"',
    'bun install "--frozen-lockfile"',
    '"npm" install "--ignore-scripts"',
  ]) assert.deepEqual(job(install), []);

  const bash = spawnSync("bash", ["-c", 'npm() { printf "%s\\n" "$@"; }; npm install "--package-lock-only"'], { encoding: "utf8", timeout: 5000 });

  assert.equal(bash.status, 0, bash.stderr);
  assert.equal(bash.stdout, "install\n--package-lock-only\n");
});

test("executable substitutions and path-qualified Node commands expose their helpers", () => {
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })].sort();

  for (const run of [
    "cat < <(node tools/x.mjs)",
    "cat > >(node tools/x.mjs)",
    "cat < <(/usr/bin/node tools/x.mjs)",
    "cat < <(echo ok; node tools/x.mjs)",
    "cat < <(echo $(node tools/x.mjs))",
    "/usr/bin/node tools/x.mjs",
    "./runtime/node tools/x.mjs",
  ]) assert.deepEqual(job(run), ["tools/x.mjs"]);

  assert.deepEqual(job("cat < <(node tools/x.mjs) > >(node tools/y.mjs)"), ["tools/x.mjs", "tools/y.mjs"]);
  assert.deepEqual(job("cat < <(echo done && bun install)\nnode tools/x.mjs"), ["tools/x.mjs"]);
  assert.deepEqual(job("bun install\n/usr/bin/node tools/x.mjs"), []);
  assert.deepEqual(job("/usr/bin/not-node tools/x.mjs"), []);
  assert.deepEqual(job('echo "/usr/bin/node tools/x.mjs"'), []);

  const bash = spawnSync("bash", ["-c", "node() { printf 'HELPER_EXECUTED\\n'; }; cat < <(node tools/x.mjs)"], { encoding: "utf8", timeout: 5000 });

  assert.equal(bash.status, 0, bash.stderr);
  assert.equal(bash.stdout.trim(), "HELPER_EXECUTED");
});

test("Node preload, loader, and require modules join the dependency-free closure", async () => {
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })].sort();

  for (const option of ["--import", "--loader", "--experimental-loader", "--require", "-r"]) {
    assert.throws(() => job(`node ${option} tsx tools/main.mjs`), /bare preload module/);
    assert.throws(() => job(`node ${option} "$PRELOAD" tools/main.mjs`), /unprovable Node entrypoint/);
    assert.deepEqual(job(`node ${option} ./bootstrap.mjs tools/main.mjs`), ["bootstrap.mjs", "tools/main.mjs"]);

    if (option !== "-r") assert.deepEqual(job(`node ${option}=./bootstrap.mjs tools/main.mjs`), ["bootstrap.mjs", "tools/main.mjs"]);
  }

  assert.throws(() => job("node -r./bootstrap.mjs tools/main.mjs"), /unsupported Node preload option/);
  assert.throws(() => job("node -r=./bootstrap.mjs tools/main.mjs"), /unsupported Node preload option/);
  assert.deepEqual(job("node --import=./first.mjs --import ./second.mjs tools/main.mjs"), ["first.mjs", "second.mjs", "tools/main.mjs"]);
  assert.deepEqual(job('node --import="${GITHUB_WORKSPACE}/bootstrap.mjs" tools/main.mjs'), ["bootstrap.mjs", "tools/main.mjs"]);
  assert.deepEqual(job("node --import node:fs tools/main.mjs"), ["tools/main.mjs"]);
  assert.deepEqual(job('node --import "./bootstrap.mjs?mode=check" tools/main.mjs'), ["bootstrap.mjs", "tools/main.mjs"]);
  assert.deepEqual(job("node --import ./boot%20strap.mjs tools/main.mjs"), ["boot strap.mjs", "tools/main.mjs"]);
  assert.throws(() => job("node --import tools/bootstrap.mjs tools/main.mjs"), /bare preload module/);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-node-preload-"));

  roots.push(dir);
  await mkdir(path.join(dir, "tools"));
  await writeFile(path.join(dir, "tools/main.mjs"), 'export const clean = true;');
  await writeFile(path.join(dir, "bootstrap.mjs"), 'import "@scope/missing-package";');
  await assert.rejects(dependencyFreeClosure(dir, job("node --import ./bootstrap.mjs tools/main.mjs")), /bootstrap\.mjs.*bare imports: @scope\/missing-package/);

  const loaded = spawnSync("node", ["--import", "./bootstrap.mjs", "tools/main.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
  await writeFile(path.join(dir, "bootstrap.mjs"), 'export const clean = true;');
  assert.deepEqual(await dependencyFreeClosure(dir, job("node --import=./bootstrap.mjs tools/main.mjs")), ["bootstrap.mjs", "tools/main.mjs"]);
  await writeFile(path.join(dir, "boot strap.mjs"), 'import "./dep%20file.mjs?mode=check";');
  await writeFile(path.join(dir, "dep file.mjs"), 'import "@scope/missing-package";');
  await assert.rejects(dependencyFreeClosure(dir, job("node --import ./boot%20strap.mjs tools/main.mjs")), /dep file\.mjs.*bare imports: @scope\/missing-package/);

});

test("computed shell entrypoints fail closed before their helpers can be omitted", () => {
  const job = (run, env) => [...standAloneHelpers({ env, jobs: { build: { steps: [{ run }] } } })];

  for (const run of ['node "$HELPER"', 'node "${HELPER}"', 'node tools/${NAME}.mjs', 'node tools/*.mjs', 'node "$(printf tools/x.mjs)"', 'env node "$HELPER"', 'PROBE="$VALUE" node "$HELPER"']) {
    assert.throws(() => job(run, { HELPER: "tools/upstream-sync.mjs" }), /unprovable Node entrypoint/);
  }

  assert.deepEqual(job('node tools/x.mjs "$PAYLOAD"'), ["tools/x.mjs"]);
  assert.deepEqual(job('node "${GITHUB_WORKSPACE}/tools/x.mjs"'), ["tools/x.mjs"]);
  assert.deepEqual(job('node "$GITHUB_WORKSPACE/tools/x.mjs"'), ["tools/x.mjs"]);
  assert.deepEqual(job('node --version'), []);
  assert.throws(() => job('node --max-old-space-size 128 "$HELPER"'), /unprovable Node entrypoint/);
  assert.deepEqual(job('echo node "$HELPER"'), []);
  assert.deepEqual(job('which node'), []);
  assert.deepEqual(job('VALUE=$(which node); node tools/x.mjs'), ["tools/x.mjs"]);
  assert.deepEqual(job('command -v node'), []);
});

test("computed install arguments cannot establish dependency availability", () => {
  const helper = "node tools/upstream-sync.mjs";
  const job = (install, env) => [...standAloneHelpers({ env, jobs: { build: { steps: [{ run: install + "\n" + helper }] } } })];

  for (const install of ['bun install $FLAGS', 'npm install "$FLAGS"', 'npm install ${FLAGS}', 'bun install $(printf -- --production)', 'bun install `printf -- --production`', 'bun install --prod*', 'bun install --{production,ignore-scripts}']) {
    assert.deepEqual(job(install, { FLAGS: "--production" }), ["tools/upstream-sync.mjs"]);
  }

  assert.deepEqual(job("npm install --cache '/tmp/$literal'"), []);
  assert.deepEqual(job('npm install --cache "/tmp/*literal"'), []);
  assert.deepEqual(job('npm install --cache "/tmp/\\$literal"'), []);
  assert.deepEqual(job('set "+e"; npm install\n' + helper), ["tools/upstream-sync.mjs"]);
  assert.throws(() => job('"cd" sub; npm install'), /unprovable helper working directory/);
});

test("Bash special quotes cannot disguise install flags or interpreters", () => {
  const helper = "node tools/upstream-sync.mjs";
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  for (const argument of ["$'--dry-run'", '$"--dry-run"', "$'--dry\\x2drun'", "$'--production'", '$"--package-lock-only"']) {
    assert.deepEqual(job(`npm install ${argument}\n${helper}`), ["tools/upstream-sync.mjs"]);
  }

  for (const interpreter of ["$'node'", '$"node"', "$'no\\x64e'"]) {
    assert.throws(() => job(`${interpreter} tools/x.mjs`), /unprovable shell interpreter/);
  }

  assert.deepEqual(job("npm install --cache '/tmp/$literal'\n" + helper), []);
  assert.deepEqual(job('echo "$literal"\n' + helper), ["tools/upstream-sync.mjs"]);
  assert.deepEqual(job("printf $'text\\'; npm install; ignored'\n" + helper), ["tools/upstream-sync.mjs"]);

  const bash = spawnSync("bash", ["-c", "npm() { printf '%s\\n' \"$@\"; }; npm install $'--dry\\x2drun'"], { encoding: "utf8", timeout: 5000 });

  assert.equal(bash.status, 0, bash.stderr);
  assert.equal(bash.stdout, "install\n--dry-run\n");
});

test("computed interpreters and implicit Node options fail closed", async () => {
  const helper = "node tools/main.mjs";
  const job = (run, env, jobEnv, stepEnv) => [...standAloneHelpers({ env, jobs: { build: { env: jobEnv, steps: [{ run, env: stepEnv }] } } })];

  for (const run of [
    'RUNTIME=node; "$RUNTIME" tools/main.mjs',
    '"${RUNTIME}" tools/main.mjs',
    'env "$RUNTIME" tools/main.mjs',
    'command "$RUNTIME" tools/main.mjs',
    'exec "$RUNTIME" tools/main.mjs',
    'if "$RUNTIME" tools/main.mjs; then echo done; fi',
    '! "$RUNTIME" tools/main.mjs',
  ]) assert.throws(() => job(run, { RUNTIME: "node" }), /unprovable shell interpreter/);

  for (const value of ["--import ./bootstrap.mjs", "--require tsx", "${{ inputs.node_options }}"]) {
    const env = { NODE_OPTIONS: value };

    assert.throws(() => job(helper, env), /unprovable NODE_OPTIONS/);
    assert.throws(() => job(helper, undefined, env), /unprovable NODE_OPTIONS/);
    assert.throws(() => job(helper, undefined, undefined, env), /unprovable NODE_OPTIONS/);
    assert.throws(() => job(`NODE_OPTIONS='${value}' ${helper}`), /unprovable NODE_OPTIONS/);
    assert.throws(() => job(`export NODE_OPTIONS='${value}'\n${helper}`), /unprovable NODE_OPTIONS/);
    assert.throws(() => job(`NODE_OPTIONS='${value}'; ${helper}`), /unprovable NODE_OPTIONS/);
    assert.deepEqual(job(helper, env, { NODE_OPTIONS: "" }), ["tools/main.mjs"]);
    assert.deepEqual(job(helper, env, undefined, { NODE_OPTIONS: "" }), ["tools/main.mjs"]);
  }

  assert.deepEqual(job("NODE_OPTIONS='' " + helper), ["tools/main.mjs"]);
  assert.deepEqual(job('echo "NODE_OPTIONS=--import ./bootstrap.mjs"\n' + helper), ["tools/main.mjs"]);
  assert.deepEqual(job('if [[ -n "$OUTPUT" || "$HAS_PATCH" == true ]]; then\necho ready\nfi\n' + helper), ["tools/main.mjs"]);
  assert.deepEqual(job('[ -n "$OUTPUT" ]\n' + helper), ["tools/main.mjs"]);
  assert.deepEqual(job("if node tools/main.mjs; then echo done; fi"), ["tools/main.mjs"]);
  assert.deepEqual(job('cat <<EOF\n$RUNTIME tools/unexecuted.mjs\n$(node tools/main.mjs)\nEOF'), ["tools/main.mjs"]);
  assert.deepEqual(job("bun install\n" + helper, { NODE_OPTIONS: "--import tsx" }), []);
  assert.throws(() => standAloneHelpers({ env: { NODE_OPTIONS: "--import tsx" }, jobs: { build: { steps: [{ uses: "actions/github-script@pinned", with: { script: "" } }] } } }), /unprovable NODE_OPTIONS/);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-node-options-"));

  roots.push(dir);
  await writeFile(path.join(dir, "main.mjs"), "export const clean = true;");
  await writeFile(path.join(dir, "bootstrap.mjs"), 'import "@scope/missing-package";');
  const loaded = spawnSync("node", ["main.mjs"], { cwd: dir, env: { ...process.env, NODE_OPTIONS: "--import ./bootstrap.mjs" }, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
  assert.throws(() => job("node main.mjs", { NODE_OPTIONS: "--import ./bootstrap.mjs" }), /unprovable NODE_OPTIONS/);
});

test("inherited npm relocation settings cannot prove checkout dependencies", () => {
  const helper = { run: "node tools/upstream-sync.mjs" };
  const job = (env, jobEnv, stepEnv, run = "npm install") => [...standAloneHelpers({ env, jobs: { build: { env: jobEnv, steps: [{ run, env: stepEnv }, helper] } } })];

  for (const [key, value, safe] of [
    ["NPM_CONFIG_GLOBAL", "true", "false"],
    ["npm_config_global", true, false],
    ["NPM_CONFIG_GLOBAL_STYLE", "true", "false"],
    ["NPM_CONFIG_LOCATION", "global", "project"],
    ["npm_config_prefix", "/tmp/elsewhere", ""],
    ["NPM_CONFIG_PREFIX", "${{ inputs.prefix }}", ""],
    ["NPM_CONFIG_GLOBAL", "${{ inputs.global }}", "false"],
    ["NPM_CONFIG_LOCATION", "${{ inputs.location }}", "project"],
  ]) {
    const env = { [key]: value };

    assert.deepEqual(job(env), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job(undefined, env), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job(undefined, undefined, env), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job(env, { [key]: safe }), []);
    assert.deepEqual(job(env, undefined, { [key]: safe }), []);
    assert.deepEqual(job(env, undefined, undefined, "bun install"), []);
    assert.deepEqual(job(undefined, undefined, undefined, `export ${key}='${value}'\nnpm install`), ["tools/upstream-sync.mjs"]);
  }

  assert.deepEqual(job(undefined, undefined, undefined, "export NPM_CONFIG_DRY_RUN=true\nnpm install"), ["tools/upstream-sync.mjs"]);
  assert.deepEqual(job({ NPM_CONFIG_GLOBAL: "", NPM_CONFIG_LOCATION: "project", NPM_CONFIG_PREFIX: "" }), []);
});

test("Bash declaration builtins cannot hide dependency environment mutations", () => {
  const helper = "node tools/upstream-sync.mjs";
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  for (const declaration of ["declare -x", "declare -gx", "typeset -x", "readonly", "local -x"]) {
    for (const assignment of ["NPM_CONFIG_DRY_RUN=true", "npm_config_global=true", "NODE_ENV=production"]) {
      assert.deepEqual(job(`${declaration} ${assignment}; npm install; ${helper}`), ["tools/upstream-sync.mjs"]);
    }

    assert.throws(() => job(`${declaration} NODE_OPTIONS='--import ./bootstrap.mjs'; ${helper}`), /unprovable NODE_OPTIONS/);
  }

  assert.deepEqual(job("declare -x UNRELATED=true; npm install; " + helper), []);
  const bash = spawnSync("bash", ["-c", 'declare -x NPM_CONFIG_DRY_RUN=true; typeset -x NPM_CONFIG_GLOBAL=true; printenv NPM_CONFIG_DRY_RUN; printenv NPM_CONFIG_GLOBAL'], { encoding: "utf8", timeout: 5000 });

  assert.equal(bash.status, 0, bash.stderr);
  assert.equal(bash.stdout, "true\ntrue\n");
});

test("parenthesized blocks never establish dependency availability", () => {
  const helper = "node tools/upstream-sync.mjs";
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  for (const block of [
    "false && (\nbun install\n)",
    "(\nbun install\n)",
    "false && ( echo skipped\nbun install\n)",
    "( echo start\nbun install\n)",
  ]) assert.deepEqual(job(block + "\n" + helper), ["tools/upstream-sync.mjs"]);

  assert.deepEqual(job("false && (\nbun install\n)\nbun install\n" + helper), []);
  const bash = spawnSync("bash", ["-e", "-c", "bun() { printf 'INSTALL_EXECUTED\\n'; }; node() { printf 'HELPER_EXECUTED\\n'; }; false && (\nbun install\n)\nnode tools/x.mjs"], { encoding: "utf8", timeout: 5000 });

  assert.equal(bash.status, 0, bash.stderr);
  assert.equal(bash.stdout, "HELPER_EXECUTED\n");
});

test("literal nested shells expose helpers and reject unprovable payloads", async () => {
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  for (const interpreter of ["bash", "sh", "/bin/bash", "/bin/sh", "env bash", "command sh"]) {
    assert.deepEqual(job(`${interpreter} -c 'node tools/x.mjs'`), ["tools/x.mjs"]);
    assert.throws(() => job(`${interpreter} -c "$PAYLOAD"`), /unprovable shell payload/);
  }

  assert.deepEqual(job("bash -ec 'node tools/x.mjs'"), ["tools/x.mjs"]);
  assert.deepEqual(job(`bash -c 'sh -c "node tools/x.mjs"'`), ["tools/x.mjs"]);
  assert.deepEqual(job("bash -c 'npm install; node tools/x.mjs'"), ["tools/x.mjs"]);
  assert.deepEqual(job("bash -c 'echo done'"), []);
  assert.deepEqual(job("bun install; bash -c 'node tools/x.mjs'"), []);
  assert.throws(() => job(`bash -c 'export NODE_OPTIONS="--import ./bootstrap.mjs"; node tools/x.mjs'`), /unprovable NODE_OPTIONS/);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-nested-shell-"));

  roots.push(dir);
  await mkdir(path.join(dir, "tools"));
  await writeFile(path.join(dir, "tools/x.mjs"), 'import "@scope/missing-package";');
  await assert.rejects(dependencyFreeClosure(dir, job("bash -c 'node tools/x.mjs'")), /bare imports.*@scope\/missing-package/);
  const loaded = spawnSync("bash", ["-c", "node tools/x.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
});

test("computed declaration names fail closed without rejecting unrelated values", () => {
  const helper = "node tools/upstream-sync.mjs";
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  for (const declaration of ["export", "declare -x", "typeset -x", "readonly", "local -x", "builtin export", "command export"]) {
    for (const argument of ['"$ASSIGNMENT"', `"$(printf 'NODE_OPTIONS=--import ./bootstrap.mjs')"`, '"NPM_CONFIG_${NAME}=true"']) {
      assert.throws(() => job(`${declaration} ${argument}; ${helper}`), /unprovable shell environment mutation/);
    }
  }

  assert.deepEqual(job('export PATH="$PATH:/tmp/bin"; npm install; ' + helper), []);
  assert.deepEqual(job("export UNRELATED='NODE_OPTIONS=--import ./bootstrap.mjs'; npm install; " + helper), []);
  assert.deepEqual(job('bun install; export "$ASSIGNMENT"; ' + helper), []);
  const bash = spawnSync("bash", ["-c", `export "$(printf 'NODE_OPTIONS=--import ./bootstrap.mjs')"; printenv NODE_OPTIONS`], { encoding: "utf8", timeout: 5000 });

  assert.equal(bash.status, 0, bash.stderr);
  assert.equal(bash.stdout, "--import ./bootstrap.mjs\n");
});

test("literal shell eval exposes helpers without establishing install proof", async () => {
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  assert.deepEqual(job("eval 'node tools/x.mjs'"), ["tools/x.mjs"]);
  assert.deepEqual(job("eval node tools/x.mjs"), ["tools/x.mjs"]);
  assert.deepEqual(job(`bash -c 'eval "node tools/x.mjs"'`), ["tools/x.mjs"]);
  assert.deepEqual(job("eval 'export NPM_CONFIG_DRY_RUN=true'; npm install; node tools/x.mjs"), ["tools/x.mjs"]);
  assert.deepEqual(job("builtin eval 'export NPM_CONFIG_DRY_RUN=true'; npm install; node tools/x.mjs"), ["tools/x.mjs"]);
  assert.throws(() => job('eval "$PAYLOAD"'), /unprovable shell payload/);
  assert.throws(() => job("eval 'node tools/x.mjs' \"$PAYLOAD\""), /unprovable shell payload/);
  assert.deepEqual(job("eval 'echo done'"), []);
  assert.deepEqual(job("bun install; eval 'node tools/x.mjs'"), []);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-shell-eval-"));

  roots.push(dir);
  await mkdir(path.join(dir, "tools"));
  await writeFile(path.join(dir, "tools/x.mjs"), 'import "@scope/missing-package";');
  await assert.rejects(dependencyFreeClosure(dir, job("eval 'node tools/x.mjs'")), /bare imports.*@scope\/missing-package/);
  const loaded = spawnSync("bash", ["-c", "eval 'node tools/x.mjs'"], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
});

test("shadowed installers and sourced shell state cannot prove installation", () => {
  const job = (run, env) => [...standAloneHelpers({ env, jobs: { build: { steps: [{ run }] } } })];
  const helper = "node tools/upstream-sync.mjs";

  for (const prefix of [
    "bun() { :; }",
    "npm() { :; }",
    "function bun { :; }",
    "function npm() { :; }",
  ]) assert.deepEqual(job(`${prefix}; bun install; npm install; ${helper}`), ["tools/upstream-sync.mjs"]);

  assert.throws(() => job("alias bun=true; bun install; " + helper), /unprovable shell alias/);

  for (const prefix of ["source /tmp/shell-state.sh", ". /tmp/shell-state.sh", "builtin source /tmp/shell-state.sh"]) {
    assert.throws(() => job(`${prefix}; bun install; ${helper}`), /unprovable helper working directory/);
  }

  for (const env of [{ BASH_ENV: "/tmp/shell-state.sh" }, { ENV: "${{ inputs.shell_state }}" }]) {
    assert.throws(() => job("bun install; " + helper, env), /unprovable helper working directory/);
  }

  for (const env of [{ "BASH_FUNC_bun%%": "() { :; }" }]) {
    assert.deepEqual(job("bun install; " + helper, env), ["tools/upstream-sync.mjs"]);
  }

  assert.deepEqual(job("other() { :; }; bun install; " + helper), []);
  assert.deepEqual(job("bun install; " + helper, { BASH_ENV: "", ENV: "" }), []);
  const bash = spawnSync("bash", ["-e", "-c", "bun() { :; }; node() { printf 'HELPER_EXECUTED\\n'; }; bun install; node tools/x.mjs"], { encoding: "utf8", timeout: 5000 });

  assert.equal(bash.status, 0, bash.stderr);
  assert.equal(bash.stdout, "HELPER_EXECUTED\n");
});

test("env wrapper options preserve executable and environment identity", () => {
  const job = (run, env) => [...standAloneHelpers({ env, jobs: { build: { steps: [{ run }] } } })];

  for (const wrapper of ["env -u NODE_OPTIONS", "/usr/bin/env --unset NODE_OPTIONS", "env --unset=NODE_OPTIONS", "env -uNODE_OPTIONS", "env -i", "env --ignore-environment"]) {
    assert.deepEqual(job(`${wrapper} node tools/x.mjs`, { NODE_OPTIONS: "--import tsx" }), ["tools/x.mjs"]);
  }

  assert.deepEqual(job("env -u UNRELATED node tools/x.mjs"), ["tools/x.mjs"]);
  assert.throws(() => job('env -u "$NAME" node tools/x.mjs'), /unprovable env option/);
  assert.throws(() => job('env -S "node tools/x.mjs"'), /unsupported env option/);
  assert.throws(() => job("env -C tools node x.mjs"), /unsupported env option/);
  assert.deepEqual(job("command -v node"), []);
});

test("unmodeled execution wrappers cannot omit forwarded Node helpers", async () => {
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  for (const run of [
    "timeout 30 node tools/x.mjs",
    "/usr/bin/nice -n 5 node tools/x.mjs",
    "env nice node tools/x.mjs",
    "custom-wrapper -- node tools/x.mjs",
    `timeout 30 bash -c 'node tools/x.mjs'`,
  ]) assert.throws(() => job(run), /unmodeled command.*Node/);

  assert.deepEqual(job('echo "node tools/x.mjs"'), []);
  assert.deepEqual(job(`printf '%s\\n' 'node tools/x.mjs'`), []);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-forwarded-node-"));

  roots.push(dir);
  await mkdir(path.join(dir, "tools"));
  await writeFile(path.join(dir, "tools/x.mjs"), 'import "@scope/missing-package";');
  const loaded = spawnSync("nice", ["node", "tools/x.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
});

test("unrecognized Node options cannot hide helper entrypoints", async () => {
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  for (const option of ["--env-file", "--env-file-if-exists", "--unknown-option"]) {
    assert.throws(() => job(`node ${option} clean.mjs policy/unsafe.mjs`), /unsupported Node option/);
    assert.throws(() => job(`node ${option}=clean.mjs policy/unsafe.mjs`), /unsupported Node option/);
  }

  assert.deepEqual(job("node --no-warnings policy/unsafe.mjs"), ["policy/unsafe.mjs"]);
  assert.deepEqual(job("node --max-old-space-size 128 policy/unsafe.mjs"), ["policy/unsafe.mjs"]);
  assert.deepEqual(job("node -- policy/unsafe.mjs"), ["policy/unsafe.mjs"]);
  assert.throws(() => job('node --conditions $FLAGS policy/unsafe.mjs'), /unprovable Node option value/);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-node-env-file-"));

  roots.push(dir);
  await mkdir(path.join(dir, "policy"));
  await writeFile(path.join(dir, "clean.mjs"), "# empty environment file\n");
  await writeFile(path.join(dir, "policy/unsafe.mjs"), 'import "@scope/missing-package";');
  const loaded = spawnSync("node", ["--env-file", "clean.mjs", "policy/unsafe.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
});

test("inline Node code and implicit stdin cannot bypass closure scanning", async () => {
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  for (const option of ["-e", "--eval", "-p", "--print"]) {
    assert.throws(() => job(`node ${option} 'import("./tools/x.mjs")'`), /inline Node code/);
  }

  for (const option of ['--eval=import("./tools/x.mjs")', '-eimport("./tools/x.mjs")', '--print=import("./tools/x.mjs")', '-pimport("./tools/x.mjs")']) {
    assert.throws(() => job(`node '${option}'`), /inline Node code/);
  }

  assert.throws(() => job('node <<EOF\nimport("./tools/x.mjs");\nEOF'), /unprovable Node entrypoint/);
  assert.throws(() => job("node"), /Node.*explicit entrypoint/);
  assert.deepEqual(job("node --version; node --help"), []);
  assert.deepEqual(job(`bun install; node -e 'import("./tools/x.mjs")'`), []);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-inline-node-"));

  roots.push(dir);
  await mkdir(path.join(dir, "tools"));
  await writeFile(path.join(dir, "tools/x.mjs"), 'import "@scope/missing-package";');
  const loaded = spawnSync("node", ["-e", 'import("./tools/x.mjs")'], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
});

test("PATH overrides cannot spoof a successful installer", async () => {
  const helper = { run: "node tools/x.mjs" };
  const job = (run, env, jobEnv, stepEnv) => [...standAloneHelpers({ env, jobs: { build: { env: jobEnv, steps: [{ run, env: stepEnv }, helper] } } })];

  for (const installer of ["bun", "npm"]) {
    assert.deepEqual(job(`${installer} install`, { PATH: "/tmp/fake" }), ["tools/x.mjs"]);
    assert.deepEqual(job(`${installer} install`, undefined, { PATH: "/tmp/fake" }), ["tools/x.mjs"]);
    assert.deepEqual(job(`${installer} install`, undefined, undefined, { PATH: "/tmp/fake" }), ["tools/x.mjs"]);
    assert.deepEqual(job(`PATH=/tmp/fake:$PATH; ${installer} install`), ["tools/x.mjs"]);
    assert.deepEqual(job(`export PATH="/tmp/fake:$PATH"; ${installer} install`), ["tools/x.mjs"]);
    assert.deepEqual(job(`declare -x PATH="/tmp/fake:$PATH"; ${installer} install`), ["tools/x.mjs"]);
    assert.deepEqual(job(`export PATH="$PATH:/tmp/bin"; ${installer} install`), []);
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-fake-installer-"));

  roots.push(dir);
  await mkdir(path.join(dir, "bin"));
  await mkdir(path.join(dir, "tools"));
  await writeFile(path.join(dir, "bin/bun"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  await writeFile(path.join(dir, "tools/x.mjs"), 'import "@scope/missing-package";');
  const loaded = spawnSync("bash", ["-e", "-c", 'export PATH="$PWD/bin:$PATH"; bun install; node tools/x.mjs'], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
});

test("effective wrapped set commands control errexit proof", () => {
  const helper = "node tools/upstream-sync.mjs";
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  for (const wrapper of ["builtin", "command", "command -p"]) {
    assert.deepEqual(job(`${wrapper} set +e; bun install; ${helper}`), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job(`${wrapper} set +o errexit; bun install; ${helper}`), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job(`set +e; ${wrapper} set -e; bun install; ${helper}`), []);
  }

  assert.deepEqual(job("command -v set +e; bun install; " + helper), []);
  const bash = spawnSync("bash", ["-e", "-c", "bun() { return 1; }; node() { printf 'HELPER_EXECUTED\\n'; }; builtin set +e; bun install; node tools/x.mjs"], { encoding: "utf8", timeout: 5000 });

  assert.equal(bash.status, 0, bash.stderr);
  assert.equal(bash.stdout, "HELPER_EXECUTED\n");
});

test("non-root working-directory helper invocations fail closed", () => {
  const helper = { run: "node helper.mjs" };
  const job = (steps, defaults, workflowDefaults) => [...standAloneHelpers({ defaults: workflowDefaults, jobs: { build: { defaults, steps } } })];

  assert.throws(() => job([{ ...helper, "working-directory": "tools" }]), /unprovable helper working directory/);
  assert.throws(() => job([helper], { run: { "working-directory": "tools" } }), /unprovable helper working directory/);
  assert.throws(() => job([helper], undefined, { run: { "working-directory": "${{ inputs.directory }}" } }), /unprovable helper working directory/);
  assert.deepEqual(job([{ ...helper, "working-directory": "." }], { run: { "working-directory": "tools" } }), ["helper.mjs"]);
});

test("directory-stack mutations use effective commands and invalidate proof", () => {
  const helper = "node tools/upstream-sync.mjs";
  const job = steps => [...standAloneHelpers({ jobs: { build: { steps } } })];

  for (const mutation of ["cd sub", "builtin cd sub", "command cd sub", "pushd sub", "popd", "builtin pushd sub", "command popd"]) {
    assert.deepEqual(job([{ run: `${mutation}; bun install` }, { run: helper }]), ["tools/upstream-sync.mjs"]);
    assert.throws(() => job([{ run: `${mutation}; ${helper}` }]), /unprovable helper working directory/);
  }

  assert.deepEqual(job([{ run: "command -v cd; bun install; " + helper }]), []);
});

test("eval and sourced state cannot hide a changed helper directory", async () => {
  const helper = "node tools/x.mjs";
  const job = (run, env) => [...standAloneHelpers({ env, jobs: { build: { steps: [{ run }] } } })];

  for (const prefix of ["eval 'cd sub'", "builtin eval 'pushd sub'", `eval 'eval "cd sub"'`, "source state.sh", ". state.sh", "command source state.sh"]) {
    assert.throws(() => job(`${prefix}; ${helper}`), /unprovable helper working directory/);
  }

  assert.throws(() => job(helper, { BASH_ENV: "state.sh" }), /unprovable helper working directory/);
  assert.deepEqual(job("eval 'echo ready'; " + helper), ["tools/x.mjs"]);
  assert.deepEqual(job("bash -c 'cd sub'; " + helper), ["tools/x.mjs"]);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-eval-directory-"));

  roots.push(dir);
  await mkdir(path.join(dir, "tools"));
  await mkdir(path.join(dir, "sub/tools"), { recursive: true });
  await writeFile(path.join(dir, "tools/x.mjs"), "export const clean = true;");
  await writeFile(path.join(dir, "sub/tools/x.mjs"), 'import "@scope/missing-package";');
  await writeFile(path.join(dir, "state.sh"), "cd sub\n");

  for (const prefix of ["eval 'cd sub'", "source state.sh"]) {
    const loaded = spawnSync("bash", ["-e", "-c", `${prefix}; ${helper}`], { cwd: dir, encoding: "utf8", timeout: 5000 });

    assert.notEqual(loaded.status, 0);
    assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
  }
});

test("inherited npm no-op settings cannot prove an installation", () => {
  const helper = { run: "node tools/upstream-sync.mjs" };
  const job = (env, jobEnv, stepEnv, run = "npm install") => [...standAloneHelpers({ env, jobs: { build: { env: jobEnv, steps: [{ run, env: stepEnv }, helper] } } })];

  for (const key of ["NPM_CONFIG_DRY_RUN", "npm_config_dry_run", "NPM_CONFIG_PACKAGE_LOCK_ONLY", "npm_config_package_lock_only"]) {
    for (const value of [true, "true", "${{ inputs.no_op }}"]) {
      const env = { [key]: value };

      assert.deepEqual(job(env), ["tools/upstream-sync.mjs"]);
      assert.deepEqual(job(undefined, env), ["tools/upstream-sync.mjs"]);
      assert.deepEqual(job(undefined, undefined, env), ["tools/upstream-sync.mjs"]);
      assert.deepEqual(job(env, { [key]: "false" }), []);
      assert.deepEqual(job(env, undefined, { [key]: "false" }), []);
    }

    assert.deepEqual(job({ [key]: false }), []);
    assert.deepEqual(job({ [key]: "false" }), []);
    assert.deepEqual(job({ [key]: "" }), []);
    assert.deepEqual(job({ [key]: true }, undefined, undefined, "bun install"), []);
  }
});

test("inherited production and omit-dev environments cannot prove npm dependencies", () => {
  const install = { run: "npm install" };
  const helper = { run: "node tools/upstream-sync.mjs" };
  const job = (env, jobEnv, stepEnv) => [...standAloneHelpers({ env, jobs: { build: { env: jobEnv, steps: [{ ...install, env: stepEnv }, helper] } } })];

  for (const env of [
    { NODE_ENV: "production" },
    { NPM_CONFIG_PRODUCTION: "true" },
    { npm_config_production: "true" },
    { NPM_CONFIG_OMIT: "dev" },
    { npm_config_omit: "optional dev" },
    { NPM_CONFIG_OMIT: "dev,optional" },
    { NPM_CONFIG_ONLY: "production" },
    { NODE_ENV: "${{ inputs.node_env }}" },
    { NPM_CONFIG_OMIT: "${{ inputs.omit }}" },
  ]) {
    assert.deepEqual(job(env), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job(undefined, env), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job(undefined, undefined, env), ["tools/upstream-sync.mjs"]);
  }

  assert.deepEqual(job({ NODE_ENV: "production" }, { NODE_ENV: "development" }), []);
  assert.deepEqual(job({ NODE_ENV: "production" }, undefined, { NODE_ENV: "test" }), []);
  assert.deepEqual(job({ NPM_CONFIG_OMIT: "dev" }, undefined, { NPM_CONFIG_OMIT: "optional" }), []);
  assert.deepEqual(job({ NPM_CONFIG_PRODUCTION: "false", NODE_ENV: "development" }), []);
  assert.deepEqual(job({ npm_config_omit: "optional" }), []);
});

test("install credit requires unconditional steps in the checkout root", () => {
  const helper = { run: "node tools/upstream-sync.mjs" };
  const job = (steps, defaults) => [...standAloneHelpers({ jobs: { build: { steps, defaults } } })];

  for (const condition of [false, "false", "${{ false }}", "${{ inputs.install }}", "success()", true]) {
    assert.deepEqual(job([{ if: condition, run: "bun install" }, helper]), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job([{ run: "bun install" }, { if: condition, run: "bun install" }, helper]), []);
  }

  for (const directory of ["plugins/omlx-media", "${{ inputs.directory }}", "/tmp/other"]) {
    assert.deepEqual(job([{ "working-directory": directory, run: "bun install" }, helper]), ["tools/upstream-sync.mjs"]);
    assert.throws(() => job([{ run: "bun install" }, helper], { run: { "working-directory": directory } }), /unprovable helper working directory/);
    assert.throws(() => standAloneHelpers({ defaults: { run: { "working-directory": directory } }, jobs: { build: { steps: [{ run: "bun install" }, helper] } } }), /unprovable helper working directory/);
    assert.deepEqual(job([{ run: "bun install" }, { "working-directory": directory, run: "bun install" }, helper]), []);
    assert.deepEqual(job([{ "working-directory": ".", run: "bun install" }, helper], { run: { "working-directory": directory } }), []);
  }

  assert.deepEqual(job([{ run: "bun install" }, helper]), []);
  assert.deepEqual(job([{ "working-directory": "./", run: "bun install" }, helper]), []);
  assert.deepEqual(job([{ "working-directory": "${{ github.workspace }}", run: "bun install" }, helper]), []);
});

test("unmodelled shells and unresolved failure tolerance never prove an install", () => {
  const install = { run: "bun install" };
  const helper = { run: "node tools/upstream-sync.mjs" };
  const job = (steps, defaults, workflowDefaults, runner) => [...standAloneHelpers({ defaults: workflowDefaults, jobs: { build: { "runs-on": runner, steps, defaults } } })];

  for (const shell of ["bash {0}", "bash -e {0}", "pwsh", "${{ inputs.shell }}"]) {
    assert.deepEqual(job([{ ...install, shell }, helper]), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job([install, helper], { run: { shell } }), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job([install, helper], undefined, { run: { shell } }), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job([{ ...install, shell: "bash" }, helper], { run: { shell } }), []);
    assert.deepEqual(job([install, { run: "echo done", shell }, helper]), []);
  }

  for (const tolerance of [true, "${{ inputs.allow_failure }}", "${{ false }}", "false"]) {
    assert.deepEqual(job([{ ...install, "continue-on-error": tolerance }, helper]), ["tools/upstream-sync.mjs"]);
    assert.deepEqual(job([install, { run: "echo done", "continue-on-error": tolerance }, helper]), []);
  }

  assert.deepEqual(job([{ ...install, "continue-on-error": false }, helper]), []);
  assert.deepEqual(job([{ ...install, shell: "sh" }, helper]), []);
  assert.deepEqual(job([install, helper], undefined, undefined, "ubuntu-latest"), []);
  assert.deepEqual(job([install, helper], undefined, undefined, "windows-latest"), ["tools/upstream-sync.mjs"]);
  assert.deepEqual(job([install, helper], undefined, undefined, "${{ inputs.runner }}"), ["tools/upstream-sync.mjs"]);

  const bash = spawnSync("bash", ["-c", "bun() { return 1; }; node() { printf 'HELPER_EXECUTED\\n'; }; bun install; node tools/x.mjs"], { encoding: "utf8", timeout: 5000 });

  assert.equal(bash.status, 0, bash.stderr);
  assert.equal(bash.stdout.trim(), "HELPER_EXECUTED");
});

test("github-script workspace imports are independent dependency-free entrypoints", async () => {
  const lock = parse(await readFile(path.join(root, ".github/workflows/upstream-sync.lock.yml"), "utf8"));
  const preActivation = lock.jobs.pre_activation;

  // This job has no node invocation. Its import must be found without safe_outputs.
  assert.deepEqual([...standAloneHelpers({ jobs: { pre_activation: preActivation } })], ["tools/upstream-sync.mjs"]);

  const scriptStep = script => ({ uses: "actions/github-script@pinned", with: { script } });
  const job = steps => [...standAloneHelpers({ jobs: { build: { steps } } })].sort();
  const script = 'const helper = await import(`${process.env.GITHUB_WORKSPACE}/tools/duplicate-check.mjs`);';

  assert.deepEqual(job([scriptStep(script), { run: "bun install" }]), ["tools/duplicate-check.mjs"]);
  assert.deepEqual(job([{ run: "bun install" }, scriptStep(script)]), []);
  assert.deepEqual(job([{ run: "bun install" }, { ...scriptStep(script), if: "always()" }]), ["tools/duplicate-check.mjs"]);
  assert.deepEqual(job([scriptStep('await import("./tools/duplicate-check.mjs");')]), ["tools/duplicate-check.mjs"]);
  assert.deepEqual(job([scriptStep(`// await import("./tools/not-run.mjs");\nconst text = 'import("./tools/not-run.mjs")';`)]), []);
  assert.deepEqual(job([scriptStep('await import("node:fs");')]), []);
  assert.deepEqual(job([scriptStep('const text = `\nbun install\n`;'), scriptStep(script)]), ["tools/duplicate-check.mjs"]);
  assert.throws(() => job([scriptStep('await import(')]), /github-script cannot be parsed/);

  const computed = [
    'const target = `${process.env.GITHUB_WORKSPACE}/tools/duplicate-check.mjs`; await import(target);',
    'await import("./tools/" + name + ".mjs");',
    'await import(`${process.env.GITHUB_WORKSPACE}/tools/${name}.mjs`);',
    'await import(new URL("./tools/duplicate-check.mjs", base));',
    'await import(condition ? "./tools/one.mjs" : "./tools/two.mjs");',
  ];

  for (const source of computed) assert.throws(() => job([scriptStep(source)]), /github-script.*unprovable import target/);

  assert.throws(() => job([scriptStep('await import("@scope/missing-package");')]), /github-script.*bare import/);
  assert.deepEqual(job([scriptStep('await import("./tools/duplicate-check.js");')]), ["tools/duplicate-check.js"]);
  assert.deepEqual(job([{ run: "bun install" }, scriptStep(computed[0])]), []);
  assert.throws(() => job([scriptStep('await import("node:worker_threads");')]), /unsupported module loader/);
  assert.throws(() => job([scriptStep('await import("node:fs", { extra: import(target) });')]), /unprovable import target/);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-github-script-"));

  roots.push(dir);
  await mkdir(path.join(dir, "tools"));
  await writeFile(path.join(dir, "tools/duplicate-check.mjs"), 'import "@scope/missing-package";');
  await assert.rejects(dependencyFreeClosure(dir, job([scriptStep(script), { run: "bun install" }])), /duplicate-check\.mjs.*bare imports: @scope\/missing-package/);
});

test("github-script require targets join the verified workspace closure", async () => {
  const setup = { uses: "github/gh-aw-actions/setup@pinned", with: { destination: "${{ runner.temp }}/gh-aw/actions" } };
  const job = (script, env, setupObserved = false) => [...standAloneHelpers({ env, jobs: { build: { steps: [...(setupObserved ? [setup] : []), { uses: "actions/github-script@pinned", with: { script } }] } } })];

  for (const script of [
    'require("./tools/helper.mjs");',
    'require(`${process.env.GITHUB_WORKSPACE}/tools/helper.mjs`);',
    'const path = require("path"); require(path.join(process.env.GITHUB_WORKSPACE, "tools/helper.mjs"));',
    'const path = require("node:path"); const workspace = process.env.GITHUB_WORKSPACE; const target = path.join(workspace, "tools", "helper.mjs"); require(target);',
  ]) assert.deepEqual(job(script), ["tools/helper.mjs"]);

  for (const script of [
    "require(target);",
    'const path = require("path"); require(path.join(process.env.GITHUB_WORKSPACE, name));',
    'const load = require; load("./tools/helper.mjs");',
    'require("@scope/missing-package");',
    'require("node:module");',
    'require("worker_threads");',
    'const path = require("path"); path.join = custom; require(path.join(process.env.RUNNER_TEMP, "helper.mjs"));',
  ]) assert.throws(() => job(script), /github-script.*(?:unprovable|bare|unsupported)/);

  assert.deepEqual(job('require("fs"); require("node:path");'), []);
  const external = 'const path = require("path"); const actionsDir = path.join(process.env.RUNNER_TEMP, "gh-aw", "actions"); require(path.join(actionsDir, "setup_globals.cjs"));';

  assert.deepEqual(job(external, undefined, true), []);
  assert.throws(() => job(external, { RUNNER_TEMP: "${{ github.workspace }}" }), /unprovable require target/);
  assert.deepEqual(job('require(process.env.GH_AW_ACTIONS_DIR + "/setup_globals.cjs");', { GH_AW_ACTIONS_DIR: "${{ runner.temp }}/gh-aw/actions" }, true), []);
  assert.throws(() => job('require(process.env.GH_AW_ACTIONS_DIR + "/helper.mjs");', { GH_AW_ACTIONS_DIR: "${{ github.workspace }}" }), /unprovable require target/);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-github-script-require-"));

  roots.push(dir);
  await mkdir(path.join(dir, "tools"));
  await writeFile(path.join(dir, "tools/helper.mjs"), 'import "@scope/missing-package";');
  const script = 'const path = require("path"); require(path.join(process.env.GITHUB_WORKSPACE, "tools/helper.mjs"));';

  await assert.rejects(dependencyFreeClosure(dir, job(script)), /bare imports.*@scope\/missing-package/);
  await writeFile(path.join(dir, "entry.mjs"), 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url); ' + script);
  const loaded = spawnSync("node", ["entry.mjs"], { cwd: dir, env: { ...process.env, GITHUB_WORKSPACE: dir }, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
});

test("github-script dynamic evaluation follows the module scanner boundary", () => {
  const job = script => [...standAloneHelpers({ jobs: { build: { steps: [{ uses: "actions/github-script@pinned", with: { script } }] } } })];

  for (const script of [
    `eval('require(process.env.GITHUB_WORKSPACE + "/tools/unsafe.mjs")');`,
    `const evaluate = eval; evaluate('require("./tools/unsafe.mjs")');`,
    `const load = Function('return import("./tools/unsafe.mjs")'); load();`,
    `const evaluate = globalThis["ev" + "al"]; evaluate('require("./tools/unsafe.mjs")');`,
    `globalThis["eval"]('require("./tools/unsafe.mjs")');`,
  ]) assert.throws(() => job(script), /github-script.*evaluates code at runtime/);

  assert.deepEqual(job(`const text = 'eval("require(unsafe)")'; core.info(text);`), []);
  assert.deepEqual(job('const callback = () => core.info("done"); callback();'), []);
});

test("workspace template proof rejects environment overrides and process shadowing", () => {
  const target = "`${process.env.GITHUB_WORKSPACE}/tools/helper.mjs`";
  const job = (script, env, jobEnv, stepEnv) => [...standAloneHelpers({ env, jobs: { build: { env: jobEnv, steps: [{ env: stepEnv, uses: "actions/github-script@pinned", with: { script } }] } } })];

  for (const load of [`await import(${target});`, `require(${target});`]) {
    assert.throws(() => job(load, { GITHUB_WORKSPACE: "/tmp/other" }), /unprovable (?:import|require) target/);
    assert.throws(() => job(load, undefined, { GITHUB_WORKSPACE: "/tmp/other" }), /unprovable (?:import|require) target/);
    assert.throws(() => job(load, undefined, undefined, { GITHUB_WORKSPACE: "/tmp/other" }), /unprovable (?:import|require) target/);

    for (const script of [
      `const process = fake; ${load}`,
      `async function go(process) { ${load} } go(fake);`,
      `const go = async ({ process }) => { ${load} }; go(fake);`,
      `try { throw fake; } catch (process) { ${load} }`,
      `const { process } = fake; ${load}`,
      `process.env.GITHUB_WORKSPACE = "/tmp/other"; ${load}`,
    ]) assert.throws(() => job(script), /unprovable (?:import|require) target/);

    assert.deepEqual(job(load), ["tools/helper.mjs"]);
    assert.deepEqual(job(load, { GITHUB_WORKSPACE: "${{ github.workspace }}" }), ["tools/helper.mjs"]);
    assert.deepEqual(job(load, { GITHUB_WORKSPACE: "/tmp/other" }, undefined, { GITHUB_WORKSPACE: "${{ github.workspace }}" }), ["tools/helper.mjs"]);
  }
});

test("constructor-based code generation is refused in modules and action scripts", async () => {
  const job = script => [...standAloneHelpers({ jobs: { build: { steps: [{ uses: "actions/github-script@pinned", with: { script } }] } } })];
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-constructor-code-"));

  roots.push(dir);

  for (const source of [
    `await Object.constructor('return import("@scope/missing-package")')();`,
    `await (async () => {}).constructor('return import("@scope/missing-package")')();`,
    `await (() => {}).constructor('return import("@scope/missing-package")')();`,
    `const build = Object["constructor"]; await build('return import("@scope/missing-package")')();`,
    `const { constructor: build } = Object; await build('return import("@scope/missing-package")')();`,
  ]) {
    await writeFile(path.join(dir, "entry.mjs"), source);
    assert.ok(scanImports(source).dynamic.length, source);
    await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /evaluates code at runtime/);
    assert.throws(() => job(source), /github-script.*evaluates code at runtime/);
    const loaded = spawnSync("node", ["entry.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

    assert.notEqual(loaded.status, 0);
    assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
  }

  assert.deepEqual(scanImports('class Ordinary { constructor(value) { this.value = value; } } new Ordinary(1);').dynamic, []);
});

test("destructuring propagates computed code aliases through nested patterns", async () => {
  const job = script => [...standAloneHelpers({ jobs: { build: { steps: [{ uses: "actions/github-script@pinned", with: { script } }] } } })];
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-pattern-code-"));

  roots.push(dir);

  for (const source of [
    `const [load] = [globalThis["ev" + "al"]]; await load('import("@scope/missing-package")');`,
    `const { tools: { load } } = { tools: { load: globalThis["ev" + "al"] } }; await load('import("@scope/missing-package")');`,
    `let load; [load] = [globalThis["ev" + "al"]]; await load('import("@scope/missing-package")');`,
    `let load; ({ load } = { load: globalThis["ev" + "al"] }); await load('import("@scope/missing-package")');`,
    `const box = [globalThis["ev" + "al"]]; const [load] = box; await load('import("@scope/missing-package")');`,
    `const [load = globalThis["ev" + "al"]] = []; await load('import("@scope/missing-package")');`,
  ]) {
    await writeFile(path.join(dir, "entry.mjs"), source);
    assert.ok(scanImports(source).dynamic.length, source);
    await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /evaluates code at runtime/);
    assert.throws(() => job(source), /github-script.*evaluates code at runtime/);
    const loaded = spawnSync("node", ["entry.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

    assert.notEqual(loaded.status, 0);
    assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
  }

  assert.deepEqual(scanImports("const [value] = [1]; const { nested: { other } } = { nested: { other: 2 } }; console.log(value, other);").dynamic, []);
});

test("trusted root objects cannot escape or undergo indirect mutation", () => {
  const job = script => [...standAloneHelpers({ jobs: { build: { steps: [{ uses: "actions/github-script@pinned", with: { script } }] } } })];
  const load = 'await import(`${process.env.GITHUB_WORKSPACE}/tools/x.mjs`);';

  for (const mutation of [
    'Object.assign(process.env, { GITHUB_WORKSPACE: "/tmp/other" });',
    'Object.defineProperty(process, "env", { value: { GITHUB_WORKSPACE: "/tmp/other" } });',
    'const environment = process.env; environment.GITHUB_WORKSPACE = "/tmp/other";',
    'const { env } = process; env.GITHUB_WORKSPACE = "/tmp/other";',
    'process.env.GITHUB_WORKSPACE += "/sub";',
    'delete process.env.GITHUB_WORKSPACE;',
  ]) assert.throws(() => job(mutation + load), /unprovable import target/);

  for (const mutation of [
    'Object.assign(path, { join: custom });',
    'Object.defineProperty(path, "join", { value: custom });',
    'const alias = path; alias.join = custom;',
    'mutate(path);',
    'Object.assign(require("path"), { join: custom });',
    'const other = require("node:path"); other.join = custom;',
  ]) {
    assert.throws(() => job('const path = require("path"); ' + mutation + ' require(path.join(process.env.RUNNER_TEMP, "helper.mjs"));'), /unprovable require target/);
  }

  assert.deepEqual(job('const workspace = process.env.GITHUB_WORKSPACE; const path = require("path"); require(path.join(workspace, "tools/x.mjs"));'), ["tools/x.mjs"]);
});

test("computed property extraction taints binding and assignment aliases", async () => {
  const job = script => [...standAloneHelpers({ jobs: { build: { steps: [{ uses: "actions/github-script@pinned", with: { script } }] } } })];
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-computed-pattern-"));

  roots.push(dir);

  for (const source of [
    `const { ["ev" + "al"]: load } = globalThis; await load('import("@scope/missing-package")');`,
    `let load; ({ ["ev" + "al"]: load } = globalThis); await load('import("@scope/missing-package")');`,
    `const { ["eval"]: load } = globalThis; await load('import("@scope/missing-package")');`,
    `const { nested: { ["ev" + "al"]: load } } = { nested: globalThis }; await load('import("@scope/missing-package")');`,
    `function invoke({ ["ev" + "al"]: load }) { return load('import("@scope/missing-package")'); } await invoke(globalThis);`,
  ]) {
    await writeFile(path.join(dir, "entry.mjs"), source);
    assert.ok(scanImports(source).dynamic.length, source);
    await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /evaluates code at runtime/);
    assert.throws(() => job(source), /github-script.*evaluates code at runtime/);
    const loaded = spawnSync("node", ["entry.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

    assert.notEqual(loaded.status, 0);
    assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
  }
});

test("install-free alias definitions cannot hide or inject helpers", async () => {
  const job = run => [...standAloneHelpers({ jobs: { build: { steps: [{ run }] } } })];

  for (const run of [
    `shopt -s expand_aliases\nalias node='node --import @scope/missing-package'\nnode tools/x.mjs`,
    `shopt -s expand_aliases\nalias run='node tools/x.mjs'\nrun`,
    `builtin alias node='node --import @scope/missing-package'\nnode tools/x.mjs`,
    `alias "$DEFINITION"\nrun`,
  ]) assert.throws(() => job(run), /unprovable shell alias/);

  assert.deepEqual(job("alias; alias -p; alias node"), []);
  assert.deepEqual(job("bun install; alias node='node --import package'; node tools/x.mjs"), []);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-shell-alias-"));

  roots.push(dir);
  await mkdir(path.join(dir, "tools"));
  await writeFile(path.join(dir, "tools/x.mjs"), "export const clean = true;");
  const loaded = spawnSync("bash", ["-e", "-c", "shopt -s expand_aliases\nalias node='node --import @scope/missing-package'\nnode tools/x.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
});

test("tainted aggregate member calls cannot evaluate hidden imports", async () => {
  const job = script => [...standAloneHelpers({ jobs: { build: { steps: [{ uses: "actions/github-script@pinned", with: { script } }] } } })];
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-aggregate-call-"));

  roots.push(dir);

  for (const source of [
    `const box = { load: globalThis["ev" + "al"] }; await box.load('import("@scope/missing-package")');`,
    `const box = { nested: { load: globalThis["ev" + "al"] } }; await box.nested.load('import("@scope/missing-package")');`,
    `const box = { load: globalThis["ev" + "al"] }; const other = box; await other["load"]('import("@scope/missing-package")');`,
    `await ({ load: globalThis["ev" + "al"] }).load('import("@scope/missing-package")');`,
  ]) {
    await writeFile(path.join(dir, "entry.mjs"), source);
    assert.ok(scanImports(source).dynamic.length, source);
    await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /evaluates code at runtime/);
    assert.throws(() => job(source), /github-script.*evaluates code at runtime/);
    const loaded = spawnSync("node", ["entry.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

    assert.notEqual(loaded.status, 0);
    assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);
  }
});

test("runner temp requires need the observed compiler setup directory", () => {
  const setup = { uses: "github/gh-aw-actions/setup@pinned", with: { destination: "${{ runner.temp }}/gh-aw/actions" } };
  const job = (script, setupStep) => [...standAloneHelpers({ jobs: { build: { steps: [...(setupStep ? [setupStep] : []), { uses: "actions/github-script@pinned", with: { script } }] } } })];
  const script = 'const path = require("path"); require(path.join(process.env.RUNNER_TEMP, "gh-aw/actions/helper.cjs"));';

  assert.throws(() => job(script), /unprovable require target/);
  assert.throws(() => job(script, { ...setup, if: "${{ inputs.setup }}" }), /unprovable require target/);
  assert.throws(() => job(script, { ...setup, "continue-on-error": true }), /unprovable require target/);
  assert.deepEqual(job(script, setup), []);

  for (const target of ["arbitrary/helper.mjs", "gh-aw/actions-other/helper.cjs", "gh-aw/actions/../helper.cjs"]) {
    assert.throws(() => job(`const path = require("path"); require(path.join(process.env.RUNNER_TEMP, "${target}"));`, setup), /unprovable require target/);
  }
});

test("dependency tree changes invalidate prior successful installation", async () => {
  const helper = { run: "node tools/x.mjs" };
  const install = { run: "bun install" };
  const job = steps => [...standAloneHelpers({ jobs: { build: { steps } } })];

  for (const mutation of ["rm -rf node_modules", "mv node_modules saved", "npm prune --omit=dev", "npm install --omit=dev", "cleanup node_modules"]) {
    assert.deepEqual(job([install, { run: mutation }, helper]), ["tools/x.mjs"]);
    assert.deepEqual(job([{ run: `bun install; ${mutation}; node tools/x.mjs` }]), ["tools/x.mjs"]);
    assert.deepEqual(job([install, { run: mutation }, install, helper]), []);
  }

  assert.deepEqual(job([install, { run: "echo node_modules" }, helper]), []);
  assert.deepEqual(job([install, { run: "rm -f /tmp/unrelated-file" }, helper]), []);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-dependency-removal-"));

  roots.push(dir);
  await mkdir(path.join(dir, "tools"));
  await mkdir(path.join(dir, "node_modules/fixture-dependency"), { recursive: true });
  await writeFile(path.join(dir, "node_modules/fixture-dependency/package.json"), '{"type":"module","exports":"./index.mjs"}');
  await writeFile(path.join(dir, "node_modules/fixture-dependency/index.mjs"), "export const value = true;");
  await writeFile(path.join(dir, "tools/x.mjs"), 'import { value } from "fixture-dependency"; console.log(value);');
  const before = spawnSync("node", ["tools/x.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.equal(before.status, 0, before.stderr);
  const after = spawnSync("bash", ["-e", "-c", "rm -rf node_modules; node tools/x.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(after.status, 0);
  assert.match(after.stderr, /ERR_MODULE_NOT_FOUND/);
});

const SINGLE = String.fromCharCode(10);

test("workflow helpers executed without dependency install stay dependency-free", async () => {
  const lock = parse(await readFile(path.join(root, ".github/workflows/upstream-sync.lock.yml"), "utf8"));

  assert.deepEqual([...standAloneHelpers(lock)].sort(), ["tools/upstream-sync.mjs"]);

  assert.deepEqual(findBareImports(await readFile(path.join(root, "tools/upstream-sync.mjs"), "utf8")), []);

  assert.deepEqual(findBareImports('import path from "node:path";\nimport { x } from "./rel.mjs";\nimport { Value } from "@sinclair/typebox/value";\nconst loaded = await import("@acme/pkg");'), ["@sinclair/typebox/value", "@acme/pkg"]);

  assert.deepEqual(findBareImports('import "@sinclair/typebox";\nimport "./local.mjs";\nimport "node:fs";'), ["@sinclair/typebox"]);

  const forms = [
    ['re-export', 'export * from "@sinclair/typebox";'],
    ['named re-export', 'export { Value } from "@sinclair/typebox";'],
    ['dynamic with import attributes', 'const t = await import("@sinclair/typebox", { with: { type: "json" } });'],
    ['dynamic without await', 'const load = () => import(\'@sinclair/typebox\', { assert: { type: "json" } });'],
    ['dynamic template literal', 'const load = async () => await import(`@sinclair/typebox`);'],
    ['import.meta.resolve', 'import.meta.resolve("@sinclair/typebox");'],
    ['require', 'const { createRequire } = await import("node:module");\nconst require = createRequire(import.meta.url);\nrequire("@sinclair/typebox");'],
    ['block comment between tokens', 'import /* keep me */ "@sinclair/typebox";'],
    ['comment inside from', 'export * /* trivia */ from /* more */ "@sinclair/typebox";'],
    ['comment before dynamic paren', 'const load = async () => import /* c */ ("@sinclair/typebox");'],
    ['line comment inside parens', 'const load = async () => import( // why\n  "@sinclair/typebox", // noqa\n);'],
  ];

  for (const [label, source] of forms) assert.deepEqual(findBareImports(source), ["@sinclair/typebox"], `guard missed the ${label} form`);

  assert.deepEqual(findBareImports('import { Value } from "@sinclair/typebox/value";\nexport { Value } from "@sinclair/typebox/value";'), ["@sinclair/typebox/value"]);
  assert.deepEqual(findBareImports('import("./relative.mjs");\nawait import(`./template.mjs`);\nconst r = createRequire(import.meta.url)("./local.cjs");'), []);

  const mentions = [
    ['line comment', '// import "@sinclair/typebox";\nexport const ok = 1;'],
    ['block comment', '/* await import("@sinclair/typebox") */\nexport const ok = 1;'],
    ['template prose', 'const note = `use import("@sinclair/typebox") in new code`;\nexport { note };'],
  ];

  for (const [label, source] of mentions) {
    assert.deepEqual(findBareImports(source), [], `guard reported a ${label} mention as a dependency`);
    assert.deepEqual(findComputedImports(source), [], `guard reported a ${label} mention as computed`);
  }

  assert.deepEqual(findComputedImports('const load = async ({ name }) => await import(`./plugin-${name}.mjs`);'), ['`./plugin-${name}.mjs`']);

  const computed = [
    ['identifier', 'const name = "@sinclair/typebox";\nconst load = async () => await import(name);'],
    ['concatenation', 'const load = async ({ name }) => await import("@sinclair/" + name);'],
    ['conditional', 'const load = async ({ flag }) => await import(flag ? "@sinclair/typebox" : "./local.mjs");'],
    ['call result', 'const load = async () => await import(target());'],
    ['member access', 'const load = async ({ cfg }) => await import(cfg.module);'],
    ['arrow forwarding', 'const load = async url => import(url);'],
  ];

  for (const [label, source] of computed) {
    assert.equal(scanImports(source).literals.length, 0, `guard treated the ${label} form as provable`);
    assert.equal(scanImports(source).computed.length, 1, `guard missed the ${label} computed target`);
  }

  assert.deepEqual(scanImports('const { createRequire } = await import("node:module");\nconst require = createRequire(import.meta.url);\nconst r = require("@sinclair/typebox");').requires.sort(), ["createRequire", "require"]);
  assert.deepEqual(scanImports('const load = async alias => await import(alias);').computed, ["alias"]);
  assert.deepEqual(scanImports('const load = async ({ cfg }) => await import(cfg.module);').computed, ["cfg.module"]);
  assert.deepEqual(scanImports('module.createRequire(import.meta.url)("./local.cjs");').requires, ["module.createRequire"]);
  assert.deepEqual(scanImports('const { createRequire } = await import("node:module");').requires, ["createRequire"]);
  assert.deepEqual(scanImports('const required = 1;\nexport const requiresLike = required + 1;').requires, []);

  // A literal element access reaches the same CommonJS loaders as a dot property, so
  // `module["createRequire"](...)` must not read as dependency-free.
  const commonjs = [
    ['element createRequire', 'module["createRequire"](import.meta.url)("@sinclair/typebox");'],
    ['element require', 'module["require"]("@sinclair/typebox");'],
    ['element require after alias', 'const ns = module;\nns["createRequire"](import.meta.url)("@sinclair/typebox");'],
  ];

  for (const [label, source] of commonjs) assert.equal(scanImports(source).requires.length, 1, `guard missed the ${label} CommonJS escape`);

  // Only `import.meta` names the resolve loader; a string element access is the same
  // loader as the dot form, and unrelated receivers must not be reported as one.
  assert.deepEqual(scanImports('const pkg = await import.meta["resolve"]("@sinclair/typebox");').literals, ["@sinclair/typebox"]);
  assert.deepEqual(scanImports('const pkg = await import.meta["re" + "solve"]("@sinclair/typebox");').literals, ["@sinclair/typebox"]);

  // The resolve loader is refused as a reference, so aliasing it past a target-only
  // check cannot make the module look dependency-free.
  const aliasing = [
    ['aliased dot resolve', 'const resolver = import.meta.resolve;\nawait resolver("@sinclair/typebox");'],
    ['aliased element resolve', 'const resolver = import.meta["resolve"];\nawait resolver("@sinclair/typebox");'],
    ['direct dot resolve', 'await import.meta.resolve("./local.mjs");'],
  ];

  for (const [label, source] of aliasing) assert.equal(scanImports(source).resolvers.length, 1, `guard missed the ${label} reference`);

  // Dynamic code construction is syntax a syntax check accepts and the host then loads,
  // so no oracle downstream can see the package inside it. Refused by name, aliased or
  // reached through a literal element access, while ordinary callbacks stay clean.
  const dynamicCode = [
    ['eval', `export const go = async () => await eval('import("@scope/pkg")');`],
    ['new Function', `export const go = new Function('return import("@scope/pkg")');`],
    ['Function constructor', `export const go = Function('return import("@scope/pkg")');`],
    ['hosted eval', `export const go = () => globalThis.eval('import("@scope/pkg")');`],
    ['element eval', `export const go = () => self["eval"]('import("@scope/pkg")');`],
    ['aliased eval', `const e = eval;\nexport const go = () => e('import("@scope/pkg")');`],
    ['timer string', `setTimeout('import("@scope/pkg")', 10);`],
    ['timer template', 'setTimeout(`import("${name}")`, 10);'],
  ];

  for (const [label, source] of dynamicCode) assert.equal(scanImports(source).dynamic.length, 1, `guard missed the ${label} dynamic-code escape`);

  for (const [label, source] of [['arrow callback', 'setTimeout(() => console.log("tick"), 10);'], ['reduce', 'export const total = [1, 2].reduce((a, b) => a + b, 0);'], ['import.meta.url', 'export const here = import.meta.url;']]) assert.deepEqual(scanImports(source).dynamic, [], `guard reported the innocuous ${label} form as dynamic code`);

  // Reflective indirection has to fail closed too: a computed name is not provably safe,
  // and `(0, eval)` reaches the global eval through parentheses.
  const reflective = [
    ['computed eval name', `globalThis["ev" + "al"]('import("@scope/pkg")');`],
    ['variable index call', `const k = "eval";\nglobalThis[k]('import("@scope/pkg")');`],
    ['parenthesised eval', `(0, eval)('import("@scope/pkg")');`],
    ['computed constructor', `const c = "Function";\nnew globalThis[c]("return import('@scope/pkg')");`],
  ];

  for (const [label, source] of reflective) assert.equal(scanImports(source).dynamic.length, 1, `guard missed the ${label} escape`);

  // A computed name assigned first and called later is the same escape, so unprovable
  // values are tracked through aliases and reassignment.
  const aliases = [
    ['aliased computed loader', `const loader = globalThis["ev" + "al"];${SINGLE}loader('import("@scope/pkg")');`],
    ['alias of an alias', `const a = globalThis["ev" + "al"];${SINGLE}const b = a;${SINGLE}b('import("@scope/pkg")');`],
    // Alias tracking must run to a real fixed point, so a chain written back-to-front —
    // where each alias is only named on the pass after the one before it — is still caught
    // however long it is. A cap lets the alias past the cap stay callable.
    ['nine aliases written back-to-front', `const b9 = b8;${SINGLE}const b8 = b7;${SINGLE}const b7 = b6;${SINGLE}const b6 = b5;${SINGLE}const b5 = b4;${SINGLE}const b4 = b3;${SINGLE}const b3 = b2;${SINGLE}const b2 = b1;${SINGLE}const b1 = globalThis[k];${SINGLE}b9('import("@scope/pkg")');`],
    ['twelve aliases written back-to-front', `const c12 = globalThis[k];${SINGLE}const c11 = c12;${SINGLE}const c10 = c11;${SINGLE}const c9 = c10;${SINGLE}const c8 = c9;${SINGLE}const c7 = c8;${SINGLE}const c6 = c7;${SINGLE}const c5 = c6;${SINGLE}const c4 = c5;${SINGLE}const c3 = c4;${SINGLE}const c2 = c3;${SINGLE}const c1 = c2;${SINGLE}c1('import("@scope/pkg")');`],
    ['reassigned binding', `let l = Object.keys;${SINGLE}l = globalThis[k];${SINGLE}l('import("@scope/pkg")');`],
  ];

  for (const [label, source] of aliases) assert.equal(scanImports(source).dynamic.length, 1, `guard missed the ${label} escape`);
  // A forward reference needs the collection to reach a fixed point: `b` is bound from `a`
  // before `a` itself becomes unprovable, and the call is checked only after collection.
  assert.equal(scanImports(`let a;${SINGLE}let b = a;${SINGLE}a = globalThis[k];${SINGLE}b('import("@scope/pkg")');`).dynamic.length, 1);

  // Only unprovable values are tracked: an ordinary indexed read must stay callable, or
  // every helper that does `const status = parts[index++]` would be reported.
  assert.deepEqual(scanImports(`const status = parts[index++];${SINGLE}export const up = () => status.toUpperCase();`).dynamic, []);
  assert.deepEqual(scanImports(`const svc = make();${SINGLE}export const go = () => svc.run(1);`).dynamic, []);

  // The computed-target rule must stay scoped to call and construction targets, or every
  // ordinary indexed read in a helper would be reported as dynamic code.
  for (const [label, source] of [['indexed reads', 'export const a = track[key];\nexport const b = match[1];\nexport const c = heads[index];'], ['callback call', 'export const go = () => obj.run(1);'], ['literal member call', 'export const go = () => obj["run"](1);']]) assert.deepEqual(scanImports(source).dynamic, [], `guard reported the ordinary ${label} form as dynamic code`);
  assert.deepEqual(scanImports('new.target.resolve("@sinclair/typebox");'), { literals: [], computed: [], requires: [], builtins: [], resolvers: [], dynamic: [] });
  assert.deepEqual(scanImports('const meta = { resolve: s => s };\nmeta.resolve("@sinclair/typebox");'), { literals: [], computed: [], requires: [], builtins: [], resolvers: [], dynamic: [] });

  assert.throws(() => findBareImports('import source txt from "@sinclair/typebox";\nexport default txt;'), /cannot be parsed by the dependency-free guard; fix the syntax so its imports can be verified/);

  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-bare-checkout-")); roots.push(dir);
  await mkdir(path.join(dir, "tools"), { recursive: true });
  await cp(path.join(root, "tools/upstream-sync.mjs"), path.join(dir, "tools/upstream-sync.mjs"));

  assert.equal(existsSync(path.join(dir, "node_modules")), false);

  const helper = await import(pathToFileURL(path.join(dir, "tools", "upstream-sync.mjs")).href);

  assert.equal(helper.hasOpenProposal([], "scaryrawr/scarydex", "scaryrawr"), false);

  const emptyPlan = { schemaVersion: 1, repository: "scaryrawr/scarydex", tracks: helper.TRACKS.map(track => ({ id: track.id, commits: [] })) };

  assert.deepEqual(helper.skipEmptyPlan(emptyPlan, path.join(dir, "noop.json")), { skipped: true });

  assert.match(await readFile(path.join(dir, "noop.json"), "utf8"), /No upstream changes to review/);
});

test("Node is the validity oracle for install-free helpers", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-node-syntax-")); roots.push(dir);
  const write = (file, text) => writeFile(path.join(dir, file), text);
  const typescript = 'const value: string = "x";\nexport default value;\n';

  // The guard's parser reads this as JavaScript without complaint, so only asking the
  // runtime that loads it can keep a TypeScript annotation out of the workflow helpers.
  assert.equal(scanImports(typescript, "annotation.mjs").literals.length, 0);

  await write("annotation.mjs", typescript);
  assert.throws(() => checkModuleSyntax(path.join(dir, "annotation.mjs")), /is not valid JavaScript for the workflow's Node runtime/);

  await write("entry.mjs", typescript);
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs is not valid JavaScript for the workflow's Node runtime/);

  // The parser gate stays for syntax the traversal cannot model, and it runs before the
  // host's runtime check so the finding does not depend on which Node the runner
  // provides: this runner's Node rejects `import source` outright, and the bundled parser
  // reports it too. Removing the parser gate would let the traversal silently drop the
  // specifier on a host whose Node accepts it.
  await write("entry.mjs", 'import source txt from "./clean.mjs";\nexport default txt;\n');
  await write("clean.mjs", 'export const clean = true;\n');
  checkModuleSyntax(path.join(dir, "clean.mjs"));
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs cannot be parsed by the dependency-free guard/);

  await write("entry.mjs", 'const resolver = import.meta.resolve;\nexport default async () => await resolver("@sinclair/typebox");\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs reaches for the dynamic resolve loader.*import\.meta\.resolve/);

  await write("entry.mjs", `export default async () => await eval('import("@sinclair/typebox")');\n`);
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs builds or evaluates code at runtime.*eval/);

  await write("entry.mjs", 'import { clean } from "./clean.mjs";\nexport default clean;\n');
  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["clean.mjs", "entry.mjs"]);
});

test("the dependency-free guard follows relative imports transitively", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-closure-")); roots.push(dir);
  const write = (file, text) => writeFile(path.join(dir, file), text);

  await write("entry.mjs", 'import { node } from "node:os";\nimport { dep } from "./dep.mjs";\nexport const go = () => [node, dep];\n');
  await write("dep.mjs", 'export const dep = "clean";\n');

  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["dep.mjs", "entry.mjs"]);

  // The closure may only contain files this repository ships. Because this check runs after
  // `bun install`, installed packages read fine here yet ERR_MODULE_NOT_FOUND in the bare
  // workflow checkout, and a symlink scans whatever the host happened to point it at.
  await mkdir(path.join(dir, "node_modules", "pkg"), { recursive: true });
  await writeFile(path.join(dir, "node_modules", "pkg", "index.mjs"), 'export const pkg = "host";\n');
  await write("entry.mjs", 'import { pkg } from "./node_modules/pkg/index.mjs";\nexport const go = pkg;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /is an installed dependency, not a file this repository ships/);

  await writeFile(path.join(dir, "..", "host-installed.mjs"), 'export const host = "outside the checkout";\n');
  await write("entry.mjs", 'import { host } from "../host-installed.mjs";\nexport const go = host;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /leaves the checkout/);

  await rm(path.join(dir, "..", "host-installed.mjs"));
  const host = await mkdtemp(path.join(os.tmpdir(), "scarydex-host-")); roots.push(host);
  await writeFile(path.join(host, "host.mjs"), 'export const host = "host state";\n');
  await rm(path.join(dir, "dep.mjs"));
  await symlink(path.join(host, "host.mjs"), path.join(dir, "dep.mjs"));
  await write("entry.mjs", 'import { host } from "./dep.mjs";\nexport const go = host;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs resolved from "\.\/dep\.mjs" traverses a symlink/);

  await rm(path.join(dir, "dep.mjs"));
  await write("dep.mjs", 'export const dep = "clean";\n');

  // A directory named like a module is not something the loader can import either.
  await mkdir(path.join(dir, "sneaky.mjs"));
  await write("entry.mjs", 'import { sneaky } from "./sneaky.mjs";\nexport const go = sneaky;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /sneaky[.]mjs resolved from "[.]\/sneaky[.]mjs" is not a regular file/);

  await rm(path.join(dir, "sneaky.mjs"), { recursive: true });
  await write("entry.mjs", 'import { dep } from "./dep.mjs";\nexport const go = dep;\n');

  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["dep.mjs", "entry.mjs"]);

  await write("dep.mjs", 'import { Value } from "@sinclair/typebox/value";\nexport const dep = Value;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs is reachable from workflow jobs that never install dependencies; remove these bare imports: @sinclair\/typebox\/value/);

  await write("dep.mjs", 'import { side } from "@sinclair/typebox";\nexport const side2 = side;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /@sinclair\/typebox/);

  await write("dep.mjs", 'export const load = async () => await import("@sinclair/typebox", { with: { type: "json" } });\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /remove these bare imports: @sinclair\/typebox/);

  await write("dep.mjs", 'export * from "@sinclair/typebox";\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /remove these bare imports: @sinclair\/typebox/);

  await write("dep.mjs", 'export const load = async ({ name }) => await import(`./plugin-${name}.mjs`);\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /builds import targets at runtime; install-free workflow jobs need literal paths so the dependency-free guard can traverse them: `\.\/plugin-\$\{name\}\.mjs`/);

  await write("dep.mjs", 'export const load = async ({ name }) => await import(/* c */ `@scope/${name}`);\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /builds import targets at runtime/);

  await write("dep.mjs", 'export * /* trivia */ from /* trivia */ "./clean.mjs";\n');
  await write("clean.mjs", 'export const clean = true;\n');

  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["clean.mjs", "dep.mjs", "entry.mjs"]);

  await write("clean.mjs", 'import /* trivia */ "@sinclair/typebox";\nexport const clean = true;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /remove these bare imports: @sinclair\/typebox/);

  await write("clean.mjs", 'const clean = 1;\n');
  await write("entry.mjs", 'import { clean } from "./clean.mjs";\nexport const go = async ({ name }) => await import(/* c */ `./other-${name}.mjs`);\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs builds import targets at runtime/);

  await write("entry.mjs", 'import source txt from "./clean.mjs";\nexport default txt;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs cannot be parsed by the dependency-free guard/);

  await write("entry.mjs", 'import { clean } from "./clean.mjs";\nexport default clean;\n');
  await write("dep.mjs", 'const name = "@sinclair/typebox";\nexport const load = async () => await import(name);\n');
  await write("clean.mjs", 'import { load } from "./dep.mjs";\nexport const clean = load;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs builds import targets at runtime/);

  await write("dep.mjs", 'const { createRequire } = await import("node:module");\nconst require = createRequire(import.meta.url);\nexport const alias = require;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs imports an unsupported module loader.*node:module/);

  await write("dep.mjs", 'module["createRequire"](import.meta.url)("@sinclair/typebox");\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs reaches for CommonJS loading.*module\["createRequire"\]/);

  await write("dep.mjs", 'const resolve = import.meta.resolve;\nexport default async () => await resolve("@sinclair/typebox");\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep\.mjs reaches for the dynamic resolve loader/);

  await write("dep.mjs", 'export const dep = "clean";\n');
  await write("cyclic-a.mjs", 'import { b } from "./cyclic-b.mjs";\nexport const a = b;\n');
  await write("cyclic-b.mjs", 'import { a } from "./cyclic-a.mjs";\nexport const b = a;\n');

  assert.deepEqual(await dependencyFreeClosure(dir, ["cyclic-a.mjs"]), ["cyclic-a.mjs", "cyclic-b.mjs"]);

  await assert.rejects(dependencyFreeClosure(dir, ["missing.mjs"]), /Unresolved import "missing\.mjs"/);

  // Node's ESM loader does not append extensions, so an extensionless relative import must
  // not resolve to a sibling file the runtime could never load.
  await write("dep.mjs", 'export const dep = "clean";\n');
  await write("entry.mjs", 'import { dep } from "./dep";\nexport const go = dep;\n');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /dep has no file extension; Node's ESM loader does not append one/);

  await write("entry.mjs", 'import { dep } from "./dep.mjs";\nexport const go = dep;\n');
  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["dep.mjs", "entry.mjs"]);
});

test("parent path symlinks cannot redirect the import closure to other bytes", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-linked-parent-"));
  const outside = await mkdtemp(path.join(os.tmpdir(), "scarydex-linked-source-"));

  roots.push(dir, outside);
  await writeFile(path.join(outside, "dep.mjs"), 'export const host = true;');
  await mkdir(path.join(dir, "sources"));
  await writeFile(path.join(dir, "sources/dep.mjs"), 'export const shipped = true;');
  await mkdir(path.join(dir, "node_modules/pkg"), { recursive: true });
  await writeFile(path.join(dir, "node_modules/pkg/dep.mjs"), 'export const installed = true;');

  for (const [name, target] of [["outside", outside], ["internal", path.join(dir, "sources")], ["installed", path.join(dir, "node_modules/pkg")]]) {
    await symlink(target, path.join(dir, name));
    await writeFile(path.join(dir, "entry.mjs"), `import "./${name}/dep.mjs";`);
    await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /symlink/);
  }

  await mkdir(path.join(dir, "nested"));
  await symlink(outside, path.join(dir, "nested/linked"));
  await writeFile(path.join(dir, "entry.mjs"), 'import "./nested/linked/dep.mjs";');
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /symlink/);
  await writeFile(path.join(dir, "entry.mjs"), 'import "./sources/dep.mjs";');
  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["entry.mjs", "sources/dep.mjs"]);
});

test("dot-prefixed bare specifiers are not traversed as relative files", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-dot-import-"));

  roots.push(dir);
  await mkdir(path.join(dir, ".local"));
  await writeFile(path.join(dir, ".local/dep.mjs"), 'export const clean = true;');
  await writeFile(path.join(dir, "entry.mjs"), 'import ".local/dep.mjs";');

  assert.deepEqual(findBareImports('import ".local/dep.mjs";'), [".local/dep.mjs"]);
  await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /bare imports: \.local\/dep\.mjs/);

  const loaded = spawnSync("node", [path.join(dir, "entry.mjs")], { encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_INVALID_MODULE_SPECIFIER|ERR_MODULE_NOT_FOUND/);
  await writeFile(path.join(dir, "entry.mjs"), 'import "./.local/dep.mjs";');
  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), [".local/dep.mjs", "entry.mjs"]);
});

test("worker loaders cannot bypass the install-free import closure", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-worker-loader-"));

  roots.push(dir);
  await writeFile(path.join(dir, "dep.mjs"), 'import "@scope/missing-package";');
  await writeFile(path.join(dir, "entry.mjs"), 'import { Worker } from "node:worker_threads"; new Worker(new URL("./dep.mjs", import.meta.url)).on("error", error => console.log(error.code));');

  // The parent has only a builtin import, but its worker really tries to load the package.
  const loaded = spawnSync("node", [path.join(dir, "entry.mjs")], { encoding: "utf8", timeout: 5000 });

  assert.equal(loaded.status, 0, loaded.stderr);
  assert.equal(loaded.stdout.trim(), "ERR_MODULE_NOT_FOUND");

  for (const source of [
    'import { Worker } from "node:worker_threads"; new Worker(new URL("./dep.mjs", import.meta.url), { type: "module" });',
    'import { Worker as Background } from "node:worker_threads"; new Background(new URL("./dep.mjs", import.meta.url));',
    'const threads = await import("node:worker_threads"); new threads.Worker(new URL("./dep.mjs", import.meta.url));',
    'export { Worker } from "node:worker_threads";',
  ]) {
    await writeFile(path.join(dir, "entry.mjs"), source);
    await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /entry\.mjs.*unsupported module loader.*node:worker_threads/);
  }

  await writeFile(path.join(dir, "entry.mjs"), 'import "node:fs"; export const info = "node:worker_threads";');
  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["entry.mjs"]);
});

test("Node module registration cannot start an unscanned module graph", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-module-registration-"));

  roots.push(dir);
  await writeFile(path.join(dir, "bootstrap.mjs"), 'import "@scope/missing-package";');
  await writeFile(path.join(dir, "entry.mjs"), 'import { register } from "node:module"; register("./bootstrap.mjs", import.meta.url);');
  const loaded = spawnSync("node", ["entry.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);

  for (const source of [
    'import { register } from "node:module"; register("./bootstrap.mjs", import.meta.url);',
    'import { register as install } from "node:module"; install("./bootstrap.mjs", import.meta.url);',
    'import * as modules from "node:module"; modules.register("./bootstrap.mjs", import.meta.url);',
    'const modules = await import("node:module"); modules["register"]("./bootstrap.mjs", import.meta.url);',
    'export { register, registerHooks } from "node:module";',
  ]) {
    await writeFile(path.join(dir, "entry.mjs"), source);
    await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /unsupported module loader.*node:module/);
  }

  assert.throws(() => standAloneHelpers({ jobs: { build: { steps: [{ run: "node --import node:module tools/x.mjs" }] } } }), /unsupported module loader/);
  assert.throws(() => standAloneHelpers({ jobs: { build: { steps: [{ uses: "actions/github-script@pinned", with: { script: 'await import("node:module");' } }] } } }), /unsupported module loader/);
  await writeFile(path.join(dir, "entry.mjs"), 'import "node:fs"; export const note = "node:module register";');
  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["entry.mjs"]);
});

test("builtin module accessors cannot bypass static import verification", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-builtin-accessor-"));

  roots.push(dir);
  await writeFile(path.join(dir, "bootstrap.mjs"), 'import "@scope/missing-package";');
  await writeFile(path.join(dir, "entry.mjs"), 'process.getBuiltinModule("node:module").register("./bootstrap.mjs", import.meta.url);');
  const loaded = spawnSync("node", ["entry.mjs"], { cwd: dir, encoding: "utf8", timeout: 5000 });

  assert.notEqual(loaded.status, 0);
  assert.match(loaded.stderr, /ERR_MODULE_NOT_FOUND/);

  for (const source of [
    'process.getBuiltinModule("node:module").register("./bootstrap.mjs", import.meta.url);',
    'process["getBuiltinModule"]("node:worker_threads");',
    'const load = process.getBuiltinModule; load("module");',
    'const { getBuiltinModule: load } = process; load("worker_threads");',
    'const load = process.getBuiltinModule; export { load };',
    'process.getBuiltinModule("node:fs");',
  ]) {
    await writeFile(path.join(dir, "entry.mjs"), source);
    await assert.rejects(dependencyFreeClosure(dir, ["entry.mjs"]), /builtin module accessor.*getBuiltinModule/);
  }

  await writeFile(path.join(dir, "entry.mjs"), 'import "node:fs"; export const note = "process.getBuiltinModule";');
  assert.deepEqual(await dependencyFreeClosure(dir, ["entry.mjs"]), ["entry.mjs"]);
  assert.throws(() => standAloneHelpers({ jobs: { build: { steps: [{ uses: "actions/github-script@pinned", with: { script: 'const load = process.getBuiltinModule; load("node:module");' } }] } } }), /builtin module accessor/);
});

test("the shipped workflow entrypoint closure is dependency-free", async () => {
  const lock = parse(await readFile(path.join(root, ".github/workflows/upstream-sync.lock.yml"), "utf8"));

  assert.deepEqual(await dependencyFreeClosure(root, [...standAloneHelpers(lock)].sort()), ["tools/upstream-sync.mjs"]);
});
