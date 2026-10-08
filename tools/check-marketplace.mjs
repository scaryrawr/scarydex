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

// Shell words preserve option boundaries after Bash removes quoting. Matching the first
// two words also keeps echoed install text and non-install commands out of the proof.
const INSTALLERS = new Set(["bun", "npm"]);

const INSTALL_COMMANDS = new Set(["install", "ci"]);

const INSTALLS_ELSEWHERE = new Set(["-g", "-G", "--global", "--global-style", "--link", "--location", "--prefix", "--no-install"]);

// An install that leaves devDependencies out never supplies the tooling a helper imports,
// and the TypeBox and TypeScript that the code in this repository loads are devDependencies,
// so it is no more proof than an install that did not run. `--production`, `--prod`,
// `--only=production`, `--no-dev`, and every `--omit=dev` spelling disqualify it, including
// comma lists such as `--omit=dev,optional` and the space-separated `--omit dev`.
function omitsDevDependencies(argv, environment) {
  if (argv[0] === "npm") {
    for (const [name, rawValue] of Object.entries(environment)) {
      const key = name.toLowerCase();
      const value = String(rawValue).trim().toLowerCase();

      if (!["node_env", "npm_config_production", "npm_config_omit", "npm_config_only"].includes(key)) continue;

      // Workflow expressions are not resolved locally, so they cannot prove that dev
      // dependencies survive. Environment from narrower scopes has already overridden it.
      if (value.includes("$")) return true;

      if (key === "node_env" && value === "production") return true;

      if (key === "npm_config_production" && value !== "" && value !== "false") return true;

      if (key === "npm_config_omit" && value.split(/[\s,]+/).some(part => part === "dev" || part === "development")) return true;

      if (key === "npm_config_only" && (value === "prod" || value === "production")) return true;
    }
  }

  for (let index = 2; index < argv.length; index++) {
    const word = argv[index];
    const separator = word.indexOf("=");
    const flag = separator === -1 ? word : word.slice(0, separator);
    const value = separator === -1 ? argv[index + 1] : word.slice(separator + 1);

    if (flag === "--omit" && value?.split(/[\s,]+/).some(part => part === "dev" || part === "development")) return true;

    // Boolean negation belongs to this option word, not to a later argument.
    if (["--production", "--prod", "--no-dev", "--no-development"].includes(flag) && !(separator !== -1 && value === "false")) return true;

    if (["--dev", "--development"].includes(flag) && separator !== -1 && value === "false") return true;

    if (flag === "--only" && (value === "prod" || value === "production")) return true;
  }

  return false;
}

// An install that only reports, or only restages a lockfile, never populates `node_modules`,
// so it is no more proof that a helper can load its imports than an install that did not run.
// `--dry-run` writes nothing; npm `--package-lock-only` and Bun `--lockfile-only`
// touch only the lockfile, so each disqualifies the install. A negated `--dry-run=false` or `--package-lock-only=false` asks
// for the real install and stays proof, and the flags that merely skip bookkeeping —
// `--no-save`, `--no-package-lock`, `--no-audit`, `--ignore-scripts`, `--frozen-lockfile` —
// all still write `node_modules` and are deliberately not refused here.
function installsNothing(argv, environment) {
  if (argv[0] === "npm") {
    for (const [name, rawValue] of Object.entries(environment)) {
      if (!["npm_config_dry_run", "npm_config_package_lock_only"].includes(name.toLowerCase())) continue;

      const value = String(rawValue).trim().toLowerCase();

      if (value !== "" && value !== "false") return true;
    }
  }

  return argv.slice(2).some(word => /^(?:--dry-run|--package-lock-only|--lockfile-only)(?:=(?!false$).*)?$/.test(word));
}

// Operators that run their right-hand side beside or after the left without waiting for it
// to land, so an install written there cannot be credited to the command that follows.
const PIPELINE = new Set(["|", "&", "|&"]);

// Shell block delimiters, matched on the keyword that starts or ends a command. Anything
// written inside a block runs only if the block runs — an `if false` branch, a loop over an
// empty list, a function body that is never called — so its effect cannot be proven from
// text and an install written there never credits a later helper. A `} else {` closes one
// branch and opens the next, so both halves apply and the depth does not change.
const BLOCK_OPENERS = /^(?:if|for|while|until|case)\b|\{$/;

const BLOCK_CLOSERS = /^(?:fi|done|esac)\b|\}$/;


// Split one script into commands, each paired with the operator that *follows* it, so the
// guard can ask how an install hands over to the command after it. Quotes, command
// substitutions, redirections such as `2>&1` and `&>`, and comments are respected, which keeps
// a `&` or `|` written in text or a path from being read as shell control.
function splitCommands(script) {
  const commands = [];

  let command = "";
  let quote = null;
  let substitutions = 0;
  let heredocs = [];
  let pendingHeredocs = [];

  const flush = operator => {
    commands.push({ command, operator, heredocs });

    command = "";
    heredocs = [];
  };

  for (let index = 0; index < script.length; index++) {
    const character = script[index];

    if (quote) {
      command += character;

      if (character === "\\" && quote !== "`") command += script[++index] ?? "";
      else if (character === quote) quote = null;

      continue;
    }

    if (character === "#" && (command === "" || /[ \t]$/.test(command))) {
      const newline = script.indexOf("\n", index);

      if (newline === -1) break;

      index = newline - 1;

      continue;
    }

    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      command += character;

      continue;
    }

    if ("$<>".includes(character) && script[index + 1] === "(") {
      substitutions++;
      command += `${character}(`;
      index++;

      continue;
    }

    if (substitutions > 0) {
      command += character;

      if (character === "(") substitutions++;
      else if (character === ")") substitutions--;

      continue;
    }

    // An unquoted backslash escapes the character after it, so `echo \; bun install` hands
    // `;` to echo as an argument and separates nothing, and `\|` and `\&` name neither a
    // pipeline nor a background job. A backslash-newline continues the line, and bash joins it
    // without inserting a space, so `bun \` at end of line followed by `install` really is
    // one install command. Operator detection runs on what survives, never on the escape.
    if (character === "\\") {
      const escaped = script[index + 1];

      if (escaped === undefined) command += character;
      else if (escaped !== "\n") command += escaped;

      index++;

      continue;
    }

    // Queue redirections until the command line ends. Bash then consumes every body in
    // declaration order, even when several commands share the line.
    if (character === "<" && script[index + 1] === "<" && script[index + 2] !== "<" && script[index - 1] !== "<") {
      const dash = script[index + 2] === "-";
      let cursor = index + 2 + (dash ? 1 : 0);

      while (/[ \t]/.test(script[cursor] ?? "")) cursor++;

      const literal = /^(["']?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(script.slice(cursor));

      if (!literal) throw new Error(`heredoc at offset ${cursor} has no readable delimiter`);

      const delimiterEnd = cursor + literal[0].length;

      pendingHeredocs.push({ delimiter: literal[2], dash, expandable: literal[1] === "", bodies: heredocs });
      command += script.slice(index, delimiterEnd);
      index = delimiterEnd - 1;

      continue;
    }

    if (character === "\n" && pendingHeredocs.length) {
      let bodyStart = index + 1;

      for (const { delimiter, dash, expandable, bodies } of pendingHeredocs) {
        let search = bodyStart;
        let terminated = false;

        while (search <= script.length) {
          const lineEnd = script.indexOf("\n", search);
          const stop = lineEnd === -1 ? script.length : lineEnd;
          const line = dash ? script.slice(search, stop).replace(/^\t+/, "") : script.slice(search, stop);

          if (line === delimiter) {
            if (expandable) bodies.push(script.slice(bodyStart, search));

            terminated = true;
            index = stop;
            bodyStart = stop + 1;

            break;
          }

          if (lineEnd === -1) break;

          search = lineEnd + 1;
        }

        if (!terminated) throw new Error(`heredoc ${delimiter} is never terminated`);
      }

      pendingHeredocs = [];
    }

    const pair = script.slice(index, index + 2);

    if (pair === "&&" || pair === "||" || pair === "|&") {
      flush(pair);
      index++;

      continue;
    }

    // `2>&1`, `>&2` and `&>log` redirect rather than separate commands.
    if (character === "&" && (/[>&]$/.test(command) || script[index + 1] === ">")) {
      command += character;

      continue;
    }

    if (character === "\n" || character === ";" || character === "|" || character === "&") {
      flush(character);

      continue;
    }

    command += character;
  }

  if (pendingHeredocs.length) throw new Error(`heredoc ${pendingHeredocs[0].delimiter} is never terminated`);

  flush("");

  return commands;
}

const MAX_DEPENDENCY_FREE_MODULES = 200;

// Workers start another module graph, including through aliased constructors. Refuse the
// loader module itself until the guard can prove and traverse those entrypoints.
const UNSUPPORTED_MODULE_LOADERS = new Set(["node:worker_threads"]);

const ROOT_WORKING_DIRECTORIES = new Set([".", "./", "${{ github.workspace }}"]);

const isRelativeSpecifier = specifier => specifier.startsWith("./") || specifier.startsWith("../");

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

// The name a property is reached by: `x.y`, `x["y"]`, or a bare `y`. Parentheses are
// unwrapped because `(0, eval)("...")` is the classic way to reach the global eval
// indirectly. Returns "" when the name cannot be proven, which callers must treat as
// unprovable rather than as safe.
function accessedName(node) {
  while (ts.isParenthesizedExpression(node)) node = node.expression;

  if (ts.isIdentifier(node)) return node.text;

  if (ts.isPropertyAccessExpression(node)) return node.name.text;

  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) return node.argumentExpression.text;

  return "";
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
// pattern rather than chasing it; ESM install-free helpers have no `require` to reach for
// in the first place. `resolvers` does the same for `import.meta.resolve`, aliased or not,
// and `dynamic` refuses dynamic code construction (`eval`, the `Function` constructor, and
// strings handed to timers), which no scanner or syntax check can see through.
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
  const resolvers = new Set();
  const dynamic = new Set();

  const text = node => node.getText(sourceFile).replace(/\s+/g, " ");

  // Identifiers bound to a target this guard cannot name. Without this, `const loader =
  // globalThis["ev" + "al"]; loader('import("pkg")')` reads as an ordinary identifier call
  // and escapes, because the unprovable part is a *read* rather than a call target. Names
  // are collected to a fixed point so an alias of an alias is caught too, and only
  // unprovable values are tracked: an ordinary `const status = parts[index++]` names
  // nothing dangerous and its name must stay callable.
  const unprovableNames = new Set();

  const isUnprovableValue = value => {
    while (value && ts.isParenthesizedExpression(value)) value = value.expression;

    if (!value) return false;

    if (ts.isElementAccessExpression(value) && !ts.isStringLiteral(value.argumentExpression)) return true;

    return ts.isIdentifier(value) && unprovableNames.has(value.text);
  };

  // Iterate until the set stops growing, which is the fixed point: every pass only adds
  // names and every name is an identifier in this file, so growth is bounded and a pass
  // that adds nothing ends the loop. A pass *cap* is not a fixed point — with bindings
  // written back-to-front (`b9 = b8; ...; b1 = globalThis[k]; b9('import("@scope/pkg")')`)
  // the ninth alias is only named on the ninth pass, so an eight-pass cap leaves `b9`
  // callable and the target it reaches is never reported.
  let grew = true;

  while (grew) {
    const before = unprovableNames.size;

    const collect = node => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && isUnprovableValue(node.initializer)) unprovableNames.add(node.name.text);

      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left) && isUnprovableValue(node.right)) unprovableNames.add(node.left.text);

      ts.forEachChild(node, collect);
    };

    collect(sourceFile);

    grew = unprovableNames.size !== before;
  }

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

    // Dynamic code construction is refused outright, because it defeats static scanning
    // entirely: `eval('import("@scope/pkg")')` and `new Function('return import("pkg")')`
    // are syntax `node --check` accepts and then *loads* at runtime, so neither oracle can
    // see the package. Aliasing is closed the same way as `require` above — by refusing
    // every reference to the name, not just direct calls. A string handed to a timer is
    // evaluated by the host the same way, so a literal there counts too.
    const isConstruction = ts.isCallExpression(node) || ts.isNewExpression(node);
    const callee = isConstruction ? node.expression : node;
    const calleeName = accessedName(callee);

    // Refused wherever the name appears, aliased or not, so a reference cannot be stored
    // and called later past a target-only check.
    if (/^(?:eval|Function)$/.test(calleeName)) {
      dynamic.add(text(node));

      return;
    }

    if (isConstruction && ts.isIdentifier(callee) && unprovableNames.has(callee.text)) {
      dynamic.add(text(node));

      return;
    }

    // A computed *call* target whose name is not a literal cannot be proven safe, so it
    // is refused: `globalThis["ev" + "al"]('import("@scope/pkg")')` passes `node --check`
    // and then attempts the load. Scoping this to call and construction targets matters —
    // an ordinary `track[key]` or `match[1]` read names nothing at all and must stay clean.
    let target = callee;

    while (ts.isParenthesizedExpression(target)) target = target.expression;

    if (isConstruction && ts.isElementAccessExpression(target) && !ts.isStringLiteral(target.argumentExpression)) {
      dynamic.add(text(node));

      return;
    }

    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && /^(?:setTimeout|setInterval)$/.test(calleeName) && node.arguments[0] && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]) || ts.isTemplateExpression(node.arguments[0]))) {
      dynamic.add(`${text(node.expression)}(string)`);

      return;
    }

    // The resolve loader is refused wherever it appears, not only where it is the direct
    // call target, because `const resolver = import.meta.resolve; resolver("@scope/pkg")`
    // aliases it past a target-only check. Its argument is still recorded so a literal
    // package is reported even where the reference is provably inert.
    if (isImportMetaResolve(node)) {
      resolvers.add(text(node));

      return;
    }

    if (ts.isIdentifier(node) && /^(?:require|createRequire)$/.test(node.text)) requires.add(node.text);

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return { literals: [...literals], computed: [...computed], requires: [...requires], resolvers: [...resolvers], dynamic: [...dynamic] };
}

export function findImports(source, file = "module.mjs") {
  return scanImports(source, file).literals;
}

export function findBareImports(source, file = "module.mjs") {
  return findImports(source, file).filter(specifier => !specifier.startsWith("node:") && !isRelativeSpecifier(specifier));
}

export function findComputedImports(source, file = "module.mjs") {
  return scanImports(source, file).computed;
}

async function readModule(root, file, specifier) {
  // Node's ESM loader does not append extensions, so neither does this resolver. Guessing
  // `${file}.mjs` here approved `import "./dep"` even though the bare-checkout runtime
  // fails it with ERR_MODULE_NOT_FOUND while `dep.mjs` sits right there on disk.
  if (!path.extname(file)) throw new Error(`${file} has no file extension; Node's ESM loader does not append one, so install-free workflow helpers must be imported by their exact path with an explicit .mjs`);

  // This guard runs *after* `bun install`, so a relative specifier that lands in
  // `node_modules` — or outside the checkout entirely, or on a symlink whose target is host
  // state — reads successfully here and then ERR_MODULE_NOT_FOUNDs in the bare workflow
  // checkout. Every closure member must be a committed regular file inside the repository.
  const absolute = path.resolve(root, file);

  if (!inside(root, absolute)) throw new Error(`${file} resolved from "${specifier}" leaves the checkout; install-free workflow jobs may only import sources committed inside the repository`);

  if (absolute.split(path.sep).includes("node_modules")) throw new Error(`${file} resolved from "${specifier}" is an installed dependency, not a file this repository ships; install-free workflow jobs cannot load it`);

  let stats;

  try {
    let current = path.resolve(root);

    for (const component of path.relative(root, absolute).split(path.sep)) {
      current = path.join(current, component);
      stats = await lstat(current);

      if (stats.isSymbolicLink()) throw new Error(`${file} resolved from "${specifier}" traverses a symlink at ${current}; the closure must read repository files, not redirected host content`);

      if (current !== absolute && !stats.isDirectory()) throw new Error(`${file} resolved from "${specifier}" traverses a non-directory path component at ${current}`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;

    throw new Error(`Unresolved import "${specifier}" from ${file}; install-free workflow jobs cannot load it`);
  }

  if (!stats.isFile()) throw new Error(`${file} resolved from "${specifier}" is not a regular file, so it cannot be a dependency-free workflow source`);

  return { file, source: await readFile(absolute, "utf8") };
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

    // The parser runs first so the finding does not depend on which Node the host
    // happens to provide: the bundled parser reports the same diagnostics anywhere,
    // while `checkModuleSyntax` answers for this host's runtime. Both must pass.
    const { literals, computed, requires, resolvers, dynamic } = scanImports(source, file);

    checkModuleSyntax(path.join(root, file));
    const bare = literals.filter(specifier => !specifier.startsWith("node:") && !isRelativeSpecifier(specifier));

    const unsupported = literals.filter(specifier => UNSUPPORTED_MODULE_LOADERS.has(specifier));

    if (unsupported.length) throw new Error(`${file} imports an unsupported module loader; install-free helpers must use imports the guard can traverse: ${unsupported.join(", ")}`);

    if (bare.length) throw new Error(`${file} is reachable from workflow jobs that never install dependencies; remove these bare imports: ${bare.join(", ")}`);

    if (computed.length) throw new Error(`${file} builds import targets at runtime; install-free workflow jobs need literal paths so the dependency-free guard can traverse them: ${computed.join(", ")}`);

    if (requires.length) throw new Error(`${file} reaches for CommonJS loading; install-free workflow jobs must use literal static imports so the dependency-free guard can traverse them: ${requires.join(", ")}`);

    if (resolvers.length) throw new Error(`${file} reaches for the dynamic resolve loader; install-free workflow jobs must use literal static imports so the dependency-free guard can traverse them: ${resolvers.join(", ")}`);

    if (dynamic.length) throw new Error(`${file} builds or evaluates code at runtime, which no scanner can see through and a syntax check cannot catch; install-free workflow jobs must use literal static imports: ${dynamic.join(", ")}`);

    for (const relative of literals.filter(isRelativeSpecifier)) {
      queue.push({ file: path.posix.normalize(path.posix.join(path.posix.dirname(file), relative)), specifier: relative });
    }
  }

  return [...seen].sort();
}

// Whether a helper can run without the repository's dependencies is decided by the worlds each
// command executes in, not by textual order. A world is a two-character key: whether the
// dependencies are installed, and whether the commands so far exited 0. `group` is the AND-OR
// list's value so far and `nextOn` says which of those worlds run the next command — `&&` runs
// the successes, `||` the failures — while the worlds that skip an operand carry their status
// across it, so `true || bun install` skips the install and the helper that follows still runs
// with nothing installed. `dead` worlds were ended by a sequential boundary under the `bash -e`
// shell GitHub Actions gives `run:` steps, and they reach a later step only when this step is
// `continue-on-error`. A step gated on `always()`, `failure()`, or `cancelled()` also runs in
// the worlds where earlier steps failed, so it starts with nothing installed.
// Split a command into words the way the shell groups them, so a flag's own value and a
// quoted path stay one word and a space inside quotes does not look like a word boundary.
function words(text) {
  const list = [];

  let word = "";
  let quote = null;

  for (let index = 0; index < text.length; index++) {
    const character = text[index];

    if (quote) {
      if (character === "\\" && quote !== "'") word += text[++index] ?? "";
      else if (character === quote) quote = null;
      else word += character;

      continue;
    }

    if (character === "'" || character === '"') {
      quote = character;
    } else if (character === "\\") {
      word += text[++index] ?? "";
    } else if (/[ \t\n]/.test(character)) {
      if (word) list.push(word);

      word = "";
    } else {
      word += character;
    }
  }

  if (word) list.push(word);

  return list;
}

// The helpers a `node` invocation names. Word boundaries, not a single regex, decide this:
// `node --no-warnings tools/x.mjs` and `node --import tsx tools/x.mjs` put the entrypoint
// after a space, which one greedy pattern either misses or captures only the last of several
// paths, so every word after the interpreter is asked instead. A leading `${GITHUB_WORKSPACE}`
// or a relocated checkout directory names the same helper, and `node -e`/`--eval` inline code
// cannot name an entrypoint word, so it stays a known boundary.
// The command bodies a string hands to the shell to run: balanced `$(...)` groups and the
// process substitutions `<(...)` and `>(...)`, and the text between backticks. Bash
// executes these alongside or before the outer command, so whatever a
// `node` names inside one really executes.
function commandSubstitutions(text) {
  const found = [];

  for (let index = 0; index < text.length - 1; index++) {
    if (!"$<>".includes(text[index]) || text[index + 1] !== "(") continue;

    let cursor = index + 2;
    let depth = 1;
    let quote = null;

    while (cursor < text.length) {
      const character = text[cursor];

      if (quote) {
        if (character === "\\" && quote !== "'") cursor++;
        else if (character === quote) quote = null;
      } else if (character === "'" || character === '"') {
        quote = character;
      } else if (character === "(") {
        depth++;
      } else if (character === ")") {
        depth--;

        if (depth === 0) break;
      }

      cursor++;
    }

    if (depth === 0) found.push(text.slice(index + 2, cursor));

    index = cursor;
  }

  for (let cursor = 0; cursor < text.length; cursor++) {
    if (text[cursor] !== "`") continue;

    const close = text.indexOf("`", cursor + 1);

    if (close === -1) break;

    found.push(text.slice(cursor + 1, close));

    cursor = close;
  }

  return found;
}

function helperReferences(text) {
  const list = words(text);
  const start = list.findIndex(word => path.posix.basename(word) === "node");

  const references = start === -1 ? [] : [list.slice(start + 1)
    .filter(word => /^\S*tools\/[^ "']+\.mjs$/.test(word))
    .map(word => word.replace(/^\$\{GITHUB_WORKSPACE\}\//, ""))];

  for (const inner of commandSubstitutions(text)) references.push(helperReferences(inner));

  return references.flat();
}

// GitHub Script runs JavaScript, not shell commands. Read its import arguments from the
// AST so comments and strings cannot become entrypoints or dependency-install proof.
function githubScriptHelpers(script) {
  const source = ts.createSourceFile("github-script.js", script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const files = new Set();

  if (source.parseDiagnostics.length) throw new Error("github-script cannot be parsed to verify its workspace imports");

  const visit = node => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const target = node.arguments[0];
      let file;

      if (target && (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target))) {
        const specifier = target.text;

        if (UNSUPPORTED_MODULE_LOADERS.has(specifier)) throw new Error(`github-script imports an unsupported module loader: ${specifier}`);

        if (isRelativeSpecifier(specifier)) file = specifier;
        else if (!specifier.startsWith("node:")) throw new Error(`github-script has a bare import without proven dependencies: ${specifier}`);
      } else if (target && ts.isTemplateExpression(target) && target.head.text === "" && target.templateSpans.length === 1) {
        const span = target.templateSpans[0];
        const workspace = span.expression;

        if (ts.isPropertyAccessExpression(workspace) && workspace.name.text === "GITHUB_WORKSPACE" &&
            ts.isPropertyAccessExpression(workspace.expression) && workspace.expression.name.text === "env" &&
            ts.isIdentifier(workspace.expression.expression) && workspace.expression.expression.text === "process" &&
            span.literal.text.startsWith("/")) file = span.literal.text.slice(1);
      }

      // The workspace prefix is the only computed form proved above. Everything else must
      // fail closed rather than silently removing the entrypoint from the scanned closure.
      if (file === undefined && !(target && (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target)))) {
        throw new Error(`github-script has an unprovable import target: ${target?.getText(source) ?? "<missing>"}`);
      }

      if (file !== undefined) files.add(path.posix.normalize(file));
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  return files;
}

const world = (deps, ok) => `${deps ? "1" : "0"}${ok ? "1" : "0"}`;

const installedIn = key => key[0] === "1";

const exitedOk = key => key[1] === "1";

// The status a command is certain to report, or `null` when any exit code is possible.
// `true`, `false`, and `exit N` are fixed; a bare `exit` forwards the previous status,
// and every real command could fail or succeed, so only the fixed ones are provable.
function constantStatus(text) {
  if (text === "true") return true;

  if (text === "false") return false;

  const exit = /^exit[ \t]+([0-9]+)$/.exec(text);

  return exit ? Number(exit[1]) === 0 : null;
}

export function standAloneHelpers(lock) {
  const files = new Set();

  for (const job of Object.values(lock.jobs ?? {})) {
    const steps = job.steps ?? [];

    // Dependencies the next step may rely on: an install reaches a helper only through the
    // worlds where it ran and exited 0, so global and relocated installs, `||`/`|`/`&`/`|&`
    // branches, a `continue-on-error` install, and any helper written before the install stay
    // in the dependency-free set.
    let installed = false;

    for (const step of steps) {
      const script = step.run ?? "";
      const runsAfterEarlierFailure = /(?:always|failure|cancelled)\(\)/.test(String(step.if ?? ""));
      const workingDirectory = step["working-directory"] ?? job.defaults?.run?.["working-directory"] ?? lock.defaults?.run?.["working-directory"] ?? ".";
      const shell = step.shell ?? job.defaults?.run?.shell ?? lock.defaults?.run?.shell;
      const runner = job["runs-on"];
      const defaultIsPosix = runner === undefined || /^(?:ubuntu|macos)-(?:latest|slim|[0-9]+(?:\.[0-9]+)?)(?:-(?:large|xlarge))?$/.test(String(runner));
      const modeledShell = shell === "bash" || shell === "sh" || (shell === undefined && defaultIsPosix);
      const canCreditInstall = modeledShell && step.if === undefined && ROOT_WORKING_DIRECTORIES.has(workingDirectory);
      const mayContinueOnError = step["continue-on-error"] !== undefined && step["continue-on-error"] !== false;
      const environment = { ...lock.env, ...job.env, ...step.env };

      if (step.uses?.startsWith("actions/github-script@") && (!installed || runsAfterEarlierFailure)) {
        for (const file of githubScriptHelpers(step.with?.script ?? "")) files.add(file);
      }

      let group = [world(installed, true), ...(runsAfterEarlierFailure ? [world(false, true)] : [])];
      let nextOn = "always";
      let dead = [];
      let errexit = modeledShell;
      let relocated = false;
      let shortCircuited = false;
      let blockDepth = 0;

      for (const { command, operator, heredocs } of splitCommands(script)) {
        const text = command.trim();

        if (!text) continue;

        if (/^set[ \t]+(?:[+-]e|[+-]o[ \t]+errexit)$/.test(text)) errexit = !text.startsWith("set +");

        // Move the depth for any delimiter written on this line, then ask whether what
        // follows is inside a block. The order is not a judgement call: an install is only
        // ever matched at the start of a command, so it can never sit on a delimiter line,
        // and reading the depth before or after the move gives the same answer.
        if (BLOCK_CLOSERS.test(text)) blockDepth = Math.max(blockDepth - 1, 0);

        if (BLOCK_OPENERS.test(text)) blockDepth++;

        const insideBlock = blockDepth > 0;

        const executing = group.filter(key => nextOn === "always" || (nextOn === "ok") === exitedOk(key));

        // An unquoted heredoc body is not a command, but bash does expand `$(...)` written
        // there, so a helper named inside one still runs and must be flagged.
        if (executing.some(key => !installedIn(key))) {
          for (const scan of [text].concat(heredocs)) {
            for (const reference of helperReferences(scan)) files.add(reference.replace(/^upstream-sync-policy\//, ""));
          }
        }

        // A `cd` moves the working directory, so no later install can be credited with
        // populating the checkout's `node_modules`: the runtime may load a different tree.
        if (/^[ \t]*cd(?:[ \t]|$)/.test(text)) relocated = true;

        // Any command can fail, and an install installs only in the worlds where it exits 0 —
        // except in a pipeline or background job, where what follows sees the tree as it was.
        const argv = words(text);

        const installs = canCreditInstall && INSTALLERS.has(argv[0]) && INSTALL_COMMANDS.has(argv[1]) &&
          !argv.slice(2).some(word => INSTALLS_ELSEWHERE.has(word.split("=")[0])) && !omitsDevDependencies(argv, environment) &&
          !installsNothing(argv, environment) && !relocated && !insideBlock && !PIPELINE.has(operator);

        // A command with a certain exit status opens only the worlds it can reach.
        const constantOk = constantStatus(text);

        const outcomes = executing.flatMap(key => {
          // An install lands only where the command exits 0, so the failing world keeps the
          // dependency tree exactly as it found it.
          const succeeded = world(installedIn(key) || installs, true);
          const failed = world(installedIn(key), false);

          return constantOk === null ? [succeeded, failed] : [constantOk ? succeeded : failed];
        });

        const carried = group.filter(key => !executing.includes(key));

        group = outcomes.concat(carried);

        // An operand the short-circuit skipped exempts the list's failure from errexit, so
        // the script really does reach the next line with whatever never got installed.
        if (carried.length) shortCircuited = true;

        if (operator === "&&") {
          nextOn = "ok";
        } else if (operator === "||") {
          nextOn = "fail";
        } else if (PIPELINE.has(operator)) {
          nextOn = "always";
        } else {
          // A list boundary ends the line: errexit ends the worlds that failed here, unless
          // the list short-circuited and bash forgives its status.
          if (errexit && !shortCircuited) {
            dead = group.filter(key => !exitedOk(key)).concat(dead);
            group = group.filter(exitedOk);
          }

          shortCircuited = false;
          nextOn = "always";
        }
      }

      // With no world left alive, `every` would vacuously credit an install, so require one.
      const survivors = group.concat(dead).filter(key => exitedOk(key) || mayContinueOnError);

      installed = survivors.length > 0 && survivors.every(installedIn);
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
