import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import ts from "typescript";

const SkillMetadata = Type.Object({ name: Type.String({ pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", maxLength: 64 }), description: Type.String({ pattern: "\\S" }) });

import { validateRegistry } from "./upstream-sync.mjs";

export const EXPECTED_PLUGINS = ["pstack", "anti-slop", "better-init", "digivolution", "omlx-media", "screen-record", "decide", "riverkids"];

const EVENTS = new Set(["PreToolUse", "PostToolUse", "UserPromptSubmit", "Stop", "SessionEnd"]);

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const inside = (root, file) => {
  const relative = path.relative(root, file);

  return relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

async function filesIn(root) {
  const files = [];

  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);

    if (entry.name === "node_modules" || entry.name === "__pycache__") continue;

    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink in shipped content: ${file}`);

    if (entry.isDirectory()) files.push(...await filesIn(file));
    else files.push(file);
  }

  return files;
}

export async function validateMarketplace(directory) {
  const root = await realpath(directory);
  const marketplace = await readJson(path.join(root, ".agents/plugins/marketplace.json"));

  if (marketplace.name !== "scarydex" || !Array.isArray(marketplace.plugins)) throw new Error("Invalid ScaryDex marketplace");
  const names = marketplace.plugins.map((plugin) => plugin.name);

  if (names.length !== EXPECTED_PLUGINS.length || new Set(names).size !== names.length ||
      EXPECTED_PLUGINS.some((name) => !names.includes(name))) throw new Error("Marketplace must contain exactly the eight requested plugins");
  const inventory = (await readdir(path.join(root, "plugins"), { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  if (inventory.length !== names.length || inventory.some((name) => !names.includes(name))) throw new Error("Plugin directories and marketplace inventory differ");
  const skillNames = new Set();
  let skills = 0;

  for (const entry of marketplace.plugins) {
    if (entry.source?.source !== "local" || entry.source.path !== `./plugins/${entry.name}`) throw new Error(`Invalid local source for ${entry.name}`);
    const plugin = await realpath(path.resolve(root, entry.source.path));

    if (!inside(root, plugin)) throw new Error("Plugin escaped marketplace root");
    const manifest = await readJson(path.join(plugin, ".codex-plugin/plugin.json"));

    if (manifest.name !== entry.name || !/^\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/.test(manifest.version) || !manifest.description) throw new Error(`Invalid manifest for ${entry.name}`);

    if (manifest.skills !== "./skills/" || manifest.extensions || manifest.agents || manifest.mcpServers) throw new Error(`Unexpected runtime declaration in ${entry.name}`);

    for (const file of await filesIn(plugin)) {
      if (file.endsWith(".json")) await readJson(file);

      if (!file.endsWith(".md")) continue;
      const text = await readFile(file, "utf8");

      if (path.basename(file) === "SKILL.md") {
        const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);

        if (!match) throw new Error(`Missing skill frontmatter: ${file}`);
        const metadata = parse(match[1]);

        if (metadata.name !== path.basename(path.dirname(file)) || !Value.Check(SkillMetadata, metadata)) throw new Error(`Invalid skill metadata: ${file}`);

        if (skillNames.has(metadata.name)) throw new Error(`Duplicate skill name: ${metadata.name}`);
        skillNames.add(metadata.name); skills++;

        if (/run_dynamic_workflow|dynamic_workflows_manage|session_store_sql|COPILOT_HOME|\.cursor\//.test(text)) throw new Error(`Unported runtime reference: ${file}`);
      }

      const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "");

      for (const match of prose.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
        const href = match[1];

        if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) continue;
        const linked = path.resolve(path.dirname(file), decodeURIComponent(href.split("#")[0]));

        if (!inside(plugin, linked)) throw new Error(`Link leaves plugin: ${file} -> ${href}`);
        await lstat(linked).catch(() => { throw new Error(`Broken link: ${file} -> ${href}`); });
      }
    }

    await lstat(path.join(plugin, "README.md"));

    if (manifest.hooks) {
      if (manifest.hooks !== "./hooks/hooks.json") throw new Error("Unexpected hooks path");
      const hookFile = await readJson(path.join(plugin, manifest.hooks));

      for (const [event, rules] of Object.entries(hookFile.hooks)) {
        if (!EVENTS.has(event)) throw new Error(`Unsupported hook event: ${event}`);

        for (const rule of rules) {
          if (rule.matcher) new RegExp(rule.matcher);

          for (const handler of rule.hooks) {
            if (handler.type !== "command" || handler.timeout < 1 || handler.timeout > (event === "SessionEnd" ? 3 : 120)) throw new Error("Invalid command hook");
            const command = /^node "\$\{PLUGIN_ROOT\}\/([^"\n]+)"$/.exec(handler.command);

            if (!command || !inside(plugin, path.resolve(plugin, command[1]))) throw new Error("Unsafe or nonportable hook command");
            await lstat(path.join(plugin, command[1]));
          }
        }
      }
    }
  }

  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const rows = [...readme.replace(/```[\s\S]*?```/g, "").matchAll(/^\|\s*`([^`]+)`\s*\|[^\n]+\|\s*$/gm)].map((match) => match[1]);

  for (const name of names) {
    if (!rows.includes(name)) throw new Error(`README is missing plugin from inventory: ${name}`);
  }

  if (rows.length !== names.length || new Set(rows).size !== rows.length || rows.some((name) => !names.includes(name))) {
    throw new Error("README plugin inventory contains unexpected or duplicate rows");
  }

  return { plugins: names.length, skills };
}

export async function validateBundle(root) {
  for (const plugin of ["omlx-media", "pstack"]) {
    const manifest = await readJson(path.join(root, `plugins/${plugin}/bundle-manifest.json`));

    for (const [file, expected] of Object.entries(manifest.files)) {
      if (!inside(root, path.resolve(root, file))) throw new Error("Bundle path escaped root");
      const actual = createHash("sha256").update(await readFile(path.join(root, file))).digest("hex");

      if (actual !== expected) throw new Error(`Stale bundle input or output: ${file}. Run npm run build.`);
    }
  }
}

export async function validateRepoSkills(root) {
  let skills = 0;

  for (const file of await filesIn(path.join(root, ".agents/skills"))) {
    if (file.endsWith(".json")) await readJson(file);

    if (!file.endsWith(".md")) continue;
    const text = await readFile(file, "utf8");

    if (path.basename(file) === "SKILL.md") {
      const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);

      if (!match) throw new Error(`Missing repo skill frontmatter: ${file}`);
      const metadata = parse(match[1]);

      if (metadata.name !== path.basename(path.dirname(file)) || !Value.Check(SkillMetadata, metadata)) throw new Error(`Invalid repo skill metadata: ${file}`);
      skills++;
    }

    const prose = text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]+`/g, "");

    for (const match of prose.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const href = match[1];

      if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) continue;
      const linked = path.resolve(path.dirname(file), decodeURIComponent(href.split("#")[0]));

      if (!inside(root, linked)) throw new Error(`Repo skill link escaped repository: ${file}`);
      await lstat(linked).catch(() => { throw new Error(`Broken repo skill link: ${file} -> ${href}`); });
    }
  }

  return skills;
}

const INSTALLS_DEPENDENCIES = /\b(?:bun|npm)\s+(?:install|ci)\b/;

const MAX_DEPENDENCY_FREE_MODULES = 200;

// `import.meta.resolve(...)` and `import.meta["resolve"](...)` are the loader; anything
// else — `new.target.resolve(...)`, or an object with a `resolve` method named `meta` —
// is not. A non-literal element (`import.meta["re" + "solve"]`) is still a loader whose
// target is unknown, so the caller records its argument and fails closed on it.
function isImportMetaResolve(expression) {
  if (!ts.isPropertyAccessExpression(expression) && !ts.isElementAccessExpression(expression)) return false;

  const receiver = expression.expression;

  if (!ts.isMetaProperty(receiver) || receiver.keywordToken !== ts.SyntaxKind.ImportKeyword) return false;

  if (ts.isPropertyAccessExpression(expression)) return expression.name.text === "resolve";

  return !ts.isStringLiteral(expression.argumentExpression) || expression.argumentExpression.text === "resolve";
}

// The workflow runs these helpers with bare `node`, so ask that exact runtime whether the
// module parses. `--check` compiles without executing and honours the `.mjs` module goal.
// This is the *validity* oracle and it closes the hole the TypeScript parser leaves open:
// parsing as JavaScript still accepts TypeScript annotations, so `const value: string = "x"`
// in a `.mjs` helper yields zero diagnostics yet fails to load. `scanImports` is the other
// oracle, and the two are not interchangeable: Node 24 accepts `import source txt from
// "node:fs"` (exit 0) while the TypeScript parser reports `'=' expected` and its traversal
// silently drops that specifier, so only the parser gate turns that into a finding.
export function checkModuleSyntax(absoluteFile) {
  const checked = spawnSync("node", ["--check", absoluteFile], { encoding: "utf8" });

  if (checked.error) throw new Error(`${absoluteFile} could not be syntax-checked: ${checked.error.message}`);

  if (checked.status !== 0) throw new Error(`${absoluteFile} is not valid JavaScript for the workflow's Node runtime: ${(checked.stderr || checked.stdout).trim().split("\n").slice(0, 2).join(" / ")}`);
}

// Every module target a loader can be pointed at, bucketed by how much the guard can
// prove about it. `literals` are specifiers written as literals in `import`, re-export
// `export ... from`, side-effect `import "pkg"`, `import(...)` with trailing arguments
// or import attributes, `import.meta.resolve()`, and `require(...)`. `computed` is
// every *other* loader argument — an identifier, concatenation, conditional, member
// access, call result, or interpolated template — because the resolved target is unknown
// at scan time, and `const name = "pkg"; await import(name)` is valid Node.
// `requires` names any `require`/`createRequire` reference, reached by dot or by literal
// element access, which closes aliasing (`const r = require; r("pkg")`) by refusing the
// pattern rather than chasing it; ESM
// install-free helpers have no `require` to reach for in the first place.
//
// This walks parsed module syntax rather than matching regexes, so trivia such as
// `import /* c */ "pkg"` counts while a package name inside a comment or string does
// not. Everything the guard cannot prove is a finding, never a pass.
export function scanImports(source, file = "module.mjs") {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);

  // Parse as the JavaScript Node will load, then fail closed on anything the parser could
  // not place: where it errors, the traversal below cannot be trusted to find every
  // specifier. It is the *modelling* oracle and stays deliberately separate from
  // `checkModuleSyntax`, the validity oracle — this parser rejects newer JavaScript Node
  // accepts, and reports nothing for TypeScript syntax it tolerates.
  const syntaxErrors = (sourceFile.parseDiagnostics ?? []).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "));

  if (syntaxErrors.length) throw new Error(`${file} cannot be parsed by the dependency-free guard; fix the syntax so its imports can be verified: ${syntaxErrors.join("; ")}`);

  const literals = new Set();
  const computed = new Set();
  const requires = new Set();

  const text = node => node.getText(sourceFile).replace(/\s+/g, " ");

  const record = node => {
    if (!node) return;

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) literals.add(node.text);
    else computed.add(text(node));
  };

  const visit = node => {
    if (ts.isImportDeclaration(node) || (ts.isExportDeclaration(node) && node.moduleSpecifier)) record(node.moduleSpecifier);

    if (ts.isCallExpression(node)) {
      const { expression } = node;
      const isDynamicImport = expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire = ts.isIdentifier(expression) && expression.text === "require";
      const isResolve = isImportMetaResolve(expression);

      if (isDynamicImport || isRequire || isResolve) record(node.arguments[0]);
    }

    // A loader name is reachable through a literal element access exactly as through a dot,
    // so `module["createRequire"](import.meta.url)("@scope/pkg")` must count as the
    // CommonJS escape that it is.
    if ((ts.isPropertyAccessExpression(node) && /^(?:require|createRequire)$/.test(node.name.text)) ||
        (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) && /^(?:require|createRequire)$/.test(node.argumentExpression.text))) {
      requires.add(text(node));

      return;
    }

    if (ts.isIdentifier(node) && /^(?:require|createRequire)$/.test(node.text)) requires.add(node.text);

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return { literals: [...literals], computed: [...computed], requires: [...requires] };
}

export function findImports(source, file = "module.mjs") {
  return scanImports(source, file).literals;
}

export function findBareImports(source, file = "module.mjs") {
  return findImports(source, file).filter(specifier => !specifier.startsWith("node:") && !specifier.startsWith("."));
}

export function findComputedImports(source, file = "module.mjs") {
  return scanImports(source, file).computed;
}

async function readModule(root, file, specifier) {
  const candidates = path.extname(file) ? [file] : [`${file}.mjs`, `${file}.js`];

  for (const candidate of candidates) {
    try {
      return { file: candidate, source: await readFile(path.join(root, candidate), "utf8") };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  throw new Error(`Unresolved import "${specifier}" from ${file}; install-free workflow jobs cannot load it`);
}

export async function dependencyFreeClosure(root, entrypoints) {
  const seen = new Set();

  const queue = entrypoints.map(file => ({ file, specifier: file }));

  while (queue.length > 0) {
    const { file, specifier } = queue.shift();

    if (seen.has(file)) continue;

    if (seen.size >= MAX_DEPENDENCY_FREE_MODULES) throw new Error(`Dependency-free module closure exceeded ${MAX_DEPENDENCY_FREE_MODULES} modules`);

    seen.add(file);

    const { source } = await readModule(root, file, specifier);
    checkModuleSyntax(path.join(root, file));

    const { literals, computed, requires } = scanImports(source, file);
    const bare = literals.filter(specifier => !specifier.startsWith("node:") && !specifier.startsWith("."));

    if (bare.length) throw new Error(`${file} is reachable from workflow jobs that never install dependencies; remove these bare imports: ${bare.join(", ")}`);

    if (computed.length) throw new Error(`${file} builds import targets at runtime; install-free workflow jobs need literal paths so the dependency-free guard can traverse them: ${computed.join(", ")}`);

    if (requires.length) throw new Error(`${file} reaches for CommonJS loading; install-free workflow jobs must use literal static imports so the dependency-free guard can traverse them: ${requires.join(", ")}`);

    for (const relative of literals.filter(specifier => specifier.startsWith("."))) {
      queue.push({ file: path.posix.normalize(path.posix.join(path.posix.dirname(file), relative)), specifier: relative });
    }
  }

  return [...seen].sort();
}

export function standAloneHelpers(lock) {
  const files = new Set();

  for (const job of Object.values(lock.jobs ?? {})) {
    const steps = job.steps ?? [];

    if (steps.some(step => INSTALLS_DEPENDENCIES.test(step.run ?? ""))) continue;

    for (const step of steps) {
      const script = `${step.run ?? ""}\n${step.with?.script ?? ""}`;

      for (const match of script.matchAll(/node\s+(\S*tools\/[^\s`']+\.mjs)|GITHUB_WORKSPACE}\/(tools\/[^\s`']+\.mjs)/g)) {
        files.add((match[1] ?? match[2]).replace(/^upstream-sync-policy\//, ""));
      }
    }
  }

  return files;
}

export async function validateUpstreamSetup(root) {
  validateRegistry(await readJson(path.join(root, "upstream-sync.json")), await readJson(path.join(root, "port-provenance.json")));
  const text = await readFile(path.join(root, ".github/workflows/upstream-sync.md"), "utf8");
  const source = parse(/^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "");
  const lock = parse(await readFile(path.join(root, ".github/workflows/upstream-sync.lock.yml"), "utf8"));
  const actionPins = await readJson(path.join(root, ".github/aw/actions-lock.json"));
  const setupPin = actionPins.entries?.["github/gh-aw-actions/setup@v0.88.7"]?.sha;

  if (setupPin !== "5e508589e03a7757a7e05b26e834292f5445bfb6" ||
      Object.values(lock.jobs).some(job => job.steps?.some(step =>
        step.uses?.startsWith("github/gh-aw-actions/setup@") && step.uses !== `github/gh-aw-actions/setup@${setupPin}`))) throw new Error("Compiler setup action pin drift");
  const output = source?.["safe-outputs"]?.["create-pull-request"];

  if (source.engine?.id !== "codex" || source.engine.model !== "copilot/gpt-5.3-codex" ||
      source.permissions?.contents !== "read" || source.permissions?.["pull-requests"] !== "read" ||
      source.permissions?.["copilot-requests"] || source.plugins || source.skills ||
      source["max-ai-credits"] !== 2000 || source["max-turns"] !== 200 ||
      source.runtimes?.bun?.version !== "1.4.2" ||
      source["timeout-minutes"] !== 60 || source.jobs?.agent?.["timeout-minutes"] !== 90 ||
      output?.max !== 1 || output.draft !== true || output["base-branch"] !== "main" ||
      output["fallback-as-issue"] !== false || output["github-token"] !== "${{ steps.publication_credentials.outputs.token }}" ||
      output["github-token-for-extra-empty-commit"] !== "none" ||
      output["protected-files"]?.policy !== "blocked" ||
      JSON.stringify(output["protected-files"]?.exclude) !== JSON.stringify(["README.md", "package.json", "package-lock.json", "bun.lock"])) throw new Error("Upstream workflow policy drift");
  const mutationKeys = Object.keys(source["safe-outputs"]).filter(key => !["create-pull-request", "missing-tool", "missing-data", "report-failed-jobs", "report-incomplete", "report-failure-as-issue", "threat-detection"].includes(key));

  if (mutationKeys.length) throw new Error("Unexpected upstream safe output");
  const duplicateCheck = lock.jobs.pre_activation.steps.find(step => step.id === "existing_proposal");
  const duplicateCheckout = lock.jobs.pre_activation.steps.findIndex(step => step.name === "Checkout trusted duplicate-check helper");

  if (source.on?.["skip-if-match"] || source.if !== "needs.pre_activation.outputs.run_sync == 'true'" ||
      lock.jobs.pre_activation.outputs?.run_sync !== "${{ steps.existing_proposal.outputs.run_sync }}" ||
      !lock.jobs.activation.if?.includes("needs.pre_activation.outputs.run_sync == 'true'") ||
      duplicateCheckout < 0 || duplicateCheckout >= lock.jobs.pre_activation.steps.indexOf(duplicateCheck) ||
      duplicateCheck?.["continue-on-error"] ||
      duplicateCheck?.env?.PUBLISHER_LOGIN !== "${{ vars.UPSTREAM_SYNC_PR_AUTHOR || github.repository_owner }}" ||
      !duplicateCheck?.with?.script?.includes("github.paginate(github.rest.pulls.list") ||
      !duplicateCheck.with.script.includes("hasOpenProposal(pulls")) throw new Error("Trusted duplicate suppression gate drift");

  if (source["safe-outputs"]["report-failure-as-issue"] !== false ||
      source["safe-outputs"]["threat-detection"]?.engine?.id !== "copilot" ||
      source["safe-outputs"]["threat-detection"]?.["max-ai-credits"] !== 400) throw new Error("Failure reporting or detection policy drift");
  const detection = JSON.stringify(lock.jobs.detection);

  if (!detection.includes("secrets.COPILOT_GITHUB_TOKEN") ||
      detection.includes("secrets.OPENAI_API_KEY") || detection.includes("secrets.CODEX_API_KEY")) throw new Error("Detection inference credentials drift");

  if (!lock.jobs.conclusion.steps.some(step => step.env?.GH_AW_FAILURE_REPORT_AS_ISSUE === "false") ||
      lock.jobs.conclusion.permissions?.issues === "write") throw new Error("Failure issue reporting must remain disabled");
  const agent = JSON.stringify(lock.jobs.agent);

  if (/secrets\.UPSTREAM_SYNC_PR_TOKEN/.test(agent)) throw new Error("Publication token exposed to agent job");
  const steps = lock.jobs.safe_outputs.steps;
  const gate = steps.findIndex(step => step.name === "Verify actual patch before any publication credentials");
  const credential = steps.findIndex(step => JSON.stringify(step).includes("secrets.UPSTREAM_SYNC_PR_TOKEN"));
  const handler = steps.find(step => step.name === "Process Safe Outputs");
  const emptyCredential = lock.jobs.agent.steps.find(step => step.id === "publication_credentials");

  if (gate < 0 || credential <= gate || steps[gate]["continue-on-error"] || steps[gate].if ||
      !steps[gate].run.includes("--artifact-dir /tmp/upstream-sync-verify/agent") ||
      !handler || handler.if || handler["continue-on-error"] ||
      !emptyCredential || emptyCredential.run !== "echo 'token=' >> \"$GITHUB_OUTPUT\"") throw new Error("Missing fail-closed publication gate");
  const preparation = source["pre-agent-steps"].find(step => step.name === "Prepare full upstream snapshots and immutable plan");
  const pinnedPlan = source["pre-agent-steps"].find(step => step.name === "Pin plan independently of agent output");
  const validationRuntime = source["pre-agent-steps"].find(step => step.name === "Make pinned Bun available inside AWF");

  if (!preparation?.run.includes("--output /tmp/gh-aw/upstream-sync/plan.json") ||
      preparation.env?.GH_AW_SAFE_OUTPUTS !== "${{ steps.set-runtime-paths.outputs.GH_AW_SAFE_OUTPUTS }}" ||
      !preparation.run.includes("node tools/upstream-sync.mjs skip-empty --plan") ||
      pinnedPlan?.with?.path !== "/tmp/gh-aw/upstream-sync/plan.json" ||
      !validationRuntime?.run.includes('cp "$(command -v bun)" /tmp/gh-aw/bin/bun') ||
      !validationRuntime.run.includes(">> \"$GITHUB_PATH\"") ||
      !agent.includes("--mount /tmp/gh-aw:/tmp/gh-aw:rw")) throw new Error("Upstream inputs must be visible inside AWF");

  if (lock.jobs.agent.permissions?.contents !== "read" || lock.jobs.agent.permissions?.["pull-requests"] !== "read") throw new Error("Agent permissions drift");

  await dependencyFreeClosure(root, [...standAloneHelpers(lock)].sort());

  return { tracks: 7 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

  try {
    const result = await validateMarketplace(root);
    await validateBundle(root);
    const repoSkills = await validateRepoSkills(root);
    await validateUpstreamSetup(root);
    console.log(`Validated ${result.plugins} plugins and ${result.skills} published skills, ${repoSkills} repo skills, and upstream-sync policy; bundles are current.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
