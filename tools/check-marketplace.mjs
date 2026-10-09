import { createHash } from "node:crypto";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isBuiltin } from "node:module";
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

const ENVIRONMENT_DECLARATIONS = new Set(["export", "declare", "typeset", "readonly", "local"]);

const INSTALLS_ELSEWHERE = new Set(["-g", "-G", "--global", "--global-style", "--link", "--location", "--prefix", "--cwd", "--no-install", "--userconfig", "--globalconfig", "--workspace", "--workspaces", "-w"]);

const PACKAGE_MUTATIONS = new Set(["install", "i", "in", "ins", "inst", "ci", "clean-install", "ic", "install-clean", "add", "remove", "uninstall", "un", "unlink", "uninst", "rm", "r", "update", "up", "upgrade", "ug", "prune", "link", "dedupe", "ddp", "rebuild", "rb"]);

const PACKAGE_OPTION_VALUES = new Set(["--prefix", "--cwd", "--location", "--cache", "--registry", "--userconfig", "--globalconfig", "--workspace", "-w", "--omit", "--only", "--include"]);

const PACKAGE_OPTION_BOOLEANS = new Set(["-g", "-G", "--global", "--no-global", "--global-style", "--production", "--prod", "--no-dev", "--dry-run", "--package-lock-only", "--lockfile-only", "--no-audit", "--no-fund", "--ignore-scripts", "--frozen-lockfile", "--no-save", "--no-package-lock", "--silent", "--force", "--verbose", "--version", "-v", "--help", "-h"]);

function packageArguments(argv) {
  const options = [];
  let index = 1;

  while (argv[index]?.startsWith("-")) {
    const word = argv[index++];

    if (word === "--") break;
    const flag = word.split("=")[0];

    if (!PACKAGE_OPTION_VALUES.has(flag) && !PACKAGE_OPTION_BOOLEANS.has(flag)) return undefined;
    options.push(word);

    if (PACKAGE_OPTION_VALUES.has(flag) && !word.includes("=")) {
      if (argv[index] === undefined) return undefined;
      options.push(argv[index++]);
    } else if (PACKAGE_OPTION_BOOLEANS.has(flag) && !word.includes("=") && ["true", "false"].includes(argv[index])) {
      options.push(argv[index++]);
    }
  }

  return [path.posix.basename(argv[0]), argv[index] ?? "", ...options, ...argv.slice(index + 1)];
}

function packageMutationOptions(argv, environment) {
  let global = false;
  const lockOnly = argv[0] === "bun" ? ["--lockfile-only"] : ["ci", "clean-install", "ic", "install-clean"].includes(argv[1]) ? [] : ["--package-lock-only"];
  const noops = new Map(["--dry-run", ...lockOnly, "--help", "--version", "-h", "-v"].map(flag => [flag, false]));

  if (argv[0] === "npm") {
    for (const [name, value] of Object.entries(environment)) {
      const flag = `--${name.toLowerCase().slice("npm_config_".length).replaceAll("_", "-")}`;

      if (/^npm_config_(?:dry_run|package_lock_only)$/i.test(name) && noops.has(flag)) noops.set(flag, String(value).toLowerCase() === "true");
    }
  }

  for (let index = 2; index < argv.length; index++) {
    const word = argv[index];
    const flag = word.split("=")[0];

    if (word === "--") break;

    if (flag === "--no-global" || flag === "--location") global = false;

    if (PACKAGE_OPTION_VALUES.has(flag)) {
      if (!word.includes("=")) index++;

      continue;
    }

    if (word.startsWith("-") && !PACKAGE_OPTION_BOOLEANS.has(flag)) return { global: false, noop: false };

    if (!PACKAGE_OPTION_BOOLEANS.has(flag)) continue;
    const value = word.includes("=") ? word.slice(word.indexOf("=") + 1) : ["true", "false"].includes(argv[index + 1]) ? argv[++index] : "true";

    if (["--global", "-g", ...(argv[0] === "bun" ? ["-G"] : [])].includes(flag)) global = value === "true";

    if (noops.has(flag)) noops.set(flag, value === "true");
  }

  return { global, noop: [...noops.values()].some(Boolean) };
}

function externalPackageConfiguration(argv, environment) {
  return argv[0] === "npm" && (argv.slice(2).some(word => /^(?:--userconfig|--globalconfig)(?:=|$)/.test(word)) ||
    Object.entries(environment).some(([name, value]) => /^npm_config_(?:userconfig|globalconfig)$/i.test(name) && String(value).trim() !== ""));
}

function installsElsewhere(argv, environment) {
  if (argv.slice(2).some(word => INSTALLS_ELSEWHERE.has(word.split("=")[0]))) return true;

  if (argv[0] !== "npm") return false;

  if (externalPackageConfiguration(argv, environment)) return true;

  for (const [name, rawValue] of Object.entries(environment)) {
    const key = name.toLowerCase();
    const value = String(rawValue).trim().toLowerCase();

    if (/^npm_config_workspaces?$/.test(key) && value !== "" && value !== "false") return true;

    if (!["npm_config_global", "npm_config_global_style", "npm_config_location", "npm_config_prefix"].includes(key)) continue;

    if (value.includes("$")) return true;

    if (key === "npm_config_location" && value !== "" && value !== "project") return true;

    if (key === "npm_config_prefix" && value !== "") return true;

    if (["npm_config_global", "npm_config_global_style"].includes(key) && value !== "" && value !== "false") return true;
  }

  return false;
}

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
      if (!["npm_config_dry_run", "npm_config_package_lock_only", "npm_config_help", "npm_config_version"].includes(name.toLowerCase())) continue;

      const value = String(rawValue).trim().toLowerCase();

      if (value !== "" && value !== "false") return true;
    }
  }

  return argv.slice(2).some(word => /^(?:--dry-run|--package-lock-only|--lockfile-only|--help|--version|-h|-v)(?:=(?!false$).*)?$/.test(word));
}

// Operators that run their right-hand side beside or after the left without waiting for it
// to land, so an install written there cannot be credited to the command that follows.
const PIPELINE = new Set(["|", "&", "|&"]);

// Shell block delimiters, matched on the keyword that starts or ends a command. Anything
// written inside a block runs only if the block runs — an `if false` branch, a loop over an
// empty list, a function body that is never called — so its effect cannot be proven from
// text and an install written there never credits a later helper. A `} else {` closes one
// branch and opens the next, so both halves apply and the depth does not change.
const BLOCK_OPENERS = /^(?:if|for|while|until|case)\b|\{$|^\(|\($/;

const BLOCK_CLOSERS = /^(?:fi|done|esac)\b|\}$|^\)/;


// Split one script into commands, each paired with the operator that *follows* it, so the
// guard can ask how an install hands over to the command after it. Quotes, command
// substitutions, redirections such as `2>&1` and `&>`, and comments are respected, which keeps
// a `&` or `|` written in text or a path from being read as shell control.
function splitCommands(script) {
  const commands = [];

  let command = "";
  let quote = null;
  let ansiQuote = false;
  let substitutions = 0;
  let conditional = false;
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

      if (character === "\\" && (quote === '"' || ansiQuote)) command += script[++index] ?? "";
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
      ansiQuote = character === "'" && command.endsWith("$");
      quote = character;
      command += character;

      continue;
    }

    const tokenPair = script.slice(index, index + 2);

    if (tokenPair === "[[" && (command === "" || /\s$/.test(command))) conditional = true;

    if (conditional) {
      command += character;

      if (tokenPair === "]]") {
        command += "]";
        index++;
        conditional = false;
      }

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
      else if (escaped !== "\n") command += character + escaped;

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

// Workers and module registration start graphs the static import closure cannot traverse.
const UNSUPPORTED_MODULE_LOADERS = new Set(["node:worker_threads", "node:module", "node:vm"]);

const ROOT_WORKING_DIRECTORIES = new Set([".", "./", "${{ github.workspace }}"]);

const NODE_MODULE_OPTIONS = new Set(["--import", "--loader", "--experimental-loader", "--require", "-r"]);

const NODE_VALUE_OPTIONS = new Set([...NODE_MODULE_OPTIONS, "--input-type", "--title", "--conditions", "-C", "--inspect-port", "--max-old-space-size"]);

const NODE_BOOLEAN_OPTIONS = new Set(["--no-warnings", "--trace-warnings", "--check", "-c"]);

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

function invocation(node) {
  if (ts.isCallExpression(node) || ts.isNewExpression(node)) return { callee: node.expression, inputs: node.arguments ?? [] };

  if (ts.isTaggedTemplateExpression(node)) return { callee: node.tag, inputs: ts.isTemplateExpression(node.template) ? node.template.templateSpans.map(span => span.expression) : [] };

  return undefined;
}

function isAssignment(node) {
  return ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment;
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
function parseModule(source, file) {
  // Force module context so `await (...)` is not parsed as a call to an identifier.
  return ts.createSourceFile(file, source, {
    languageVersion: ts.ScriptTarget.Latest,
    setExternalModuleIndicator: node => { node.externalModuleIndicator = true; },
  }, true, ts.ScriptKind.JS);
}

export function scanImports(source, file = "module.mjs") {
  const sourceFile = parseModule(source, file);

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
  const builtins = new Set();
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
  const unprovableAggregates = new Set();
  // Call results can carry global code references, not just direct aliases. Keep
  // their origins separate from data lookups such as repositories[track.source].
  const codeNames = new Set();
  const childModules = new Set();
  const childFunctions = new Map();
  const childMethods = new Set(["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"]);

  const isChildModule = node => node && ((ts.isIdentifier(node) && childModules.has(node.text)) ||
    (ts.isCallExpression(node) && accessedName(node.expression) === "require" && ["node:child_process", "child_process"].includes(node.arguments[0]?.text)));

  const childFunctionKinds = node => {
    if (!node) return [];

    if (ts.isIdentifier(node)) return [...(childFunctions.get(node.text) ?? [])];

    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && isChildModule(node.expression)) {
      if (childMethods.has(accessedName(node))) return [accessedName(node)];

      if (ts.isElementAccessExpression(node) && !ts.isStringLiteral(node.argumentExpression)) return [...childMethods];
    }

    return [];
  };

  const verifiedGitCall = node => {
    const invoked = invocation(node);
    const kinds = invoked ? childFunctionKinds(invoked.callee) : [];
    const program = invoked?.inputs[0];
    const options = invoked?.inputs[2];

    const direct = !options || (ts.isObjectLiteralExpression(options) && options.properties.every(property =>
      ((ts.isPropertyAssignment(property) && !ts.isComputedPropertyName(property.name)) || ts.isShorthandPropertyAssignment(property)) &&
      (accessedName(property.name) !== "shell" || (ts.isPropertyAssignment(property) && property.initializer.kind === ts.SyntaxKind.FalseKeyword))));

    return kinds.length > 0 && kinds.every(kind => ["spawn", "spawnSync", "execFile", "execFileSync"].includes(kind)) &&
      program && ts.isStringLiteral(program) && program.text === "git" && direct && !invoked.inputs.some(isCodeValue);
  };

  const bindChildFunction = (pattern, kinds) => {
    const names = new Set();

    taintPattern(pattern, names);

    for (const name of names) {
      if (!childFunctions.has(name)) childFunctions.set(name, new Set());

      for (const kind of kinds) childFunctions.get(name).add(kind);
      codeNames.add(name);
    }
  };

  const childOriginCount = () => [...childFunctions.values()].flatMap(kinds => [...kinds]).length;

  const valueHasTaint = (value, names, codeOnly) => {
    while (value && (ts.isParenthesizedExpression(value) || ts.isAwaitExpression(value))) value = value.expression;

    if (!value) return false;

    if (ts.isElementAccessExpression(value)) {
      return (!codeOnly && !ts.isStringLiteral(value.argumentExpression)) ||
        valueHasTaint(value.expression, names, codeOnly) ||
        (codeOnly && !ts.isStringLiteral(value.argumentExpression) && ts.isIdentifier(value.expression) && value.expression.text === "process");
    }

    if (ts.isArrayLiteralExpression(value)) return value.elements.some(element => valueHasTaint(element, names, codeOnly));

    if (ts.isObjectLiteralExpression(value)) return value.properties.some(property => valueHasTaint(ts.isPropertyAssignment(property) ? property.initializer : ts.isShorthandPropertyAssignment(property) ? property.name : ts.isSpreadAssignment(property) ? property.expression : ts.isFunctionLike(property) ? property : undefined, names, codeOnly));

    if (codeOnly && (ts.isClassDeclaration(value) || ts.isClassExpression(value))) return value.members.some(member => isCodeValue(member.initializer ?? member)) ||
      (value.heritageClauses ?? []).some(clause => clause.types.some(type => isCodeValue(type.expression)));

    if (ts.isSpreadElement(value) || ts.isPropertyAccessExpression(value)) return valueHasTaint(value.expression, names, codeOnly);

    const invoked = invocation(value);

    if (invoked) return !verifiedGitCall(value) && (invoked.inputs.some(isCodeValue) || isCodeValue(invoked.callee));

    if (ts.isConditionalExpression(value)) return valueHasTaint(value.whenTrue, names, codeOnly) || valueHasTaint(value.whenFalse, names, codeOnly);

    if (isAssignment(value)) return valueHasTaint(value.right, names, codeOnly) || (value.operatorToken.kind !== ts.SyntaxKind.EqualsToken && valueHasTaint(value.left, names, codeOnly));

    if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.CommaToken) return valueHasTaint(value.right, names, codeOnly);

    if (ts.isBinaryExpression(value) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(value.operatorToken.kind)) return valueHasTaint(value.left, names, codeOnly) || valueHasTaint(value.right, names, codeOnly);

    if (codeOnly && (ts.isFunctionLike(value) || ts.isClassStaticBlockDeclaration(value))) {
      if (!value.body) return false;

      if (!ts.isBlock(value.body)) return isCodeValue(value.body);

      const returnedCode = node => {
        if (ts.isReturnStatement(node) || ts.isYieldExpression(node) || ts.isThrowStatement(node)) return isCodeValue(node.expression);

        if (isAssignment(node) && isCodeValue(node.right)) return true;

        if (ts.isFunctionLike(node)) return false;

        return ts.forEachChild(node, returnedCode) ?? false;
      };

      return ts.forEachChild(value.body, returnedCode) ?? false;
    }

    return ts.isIdentifier(value) && (names.has(value.text) || (codeOnly && ["globalThis", "global", "window", "self"].includes(value.text)));
  };

  const isUnprovableValue = value => valueHasTaint(value, unprovableNames, false);
  const isCodeValue = value => valueHasTaint(value, codeNames, true);

  const taintPattern = (pattern, names = unprovableNames) => {
    if (ts.isIdentifier(pattern)) names.add(pattern.text);
    else if (ts.isObjectBindingPattern(pattern) || ts.isArrayBindingPattern(pattern) || ts.isArrayLiteralExpression(pattern)) {
      for (const element of pattern.elements) taintPattern(element, names);
    } else if (ts.isObjectLiteralExpression(pattern)) {
      for (const property of pattern.properties) taintPattern(property, names);
    } else if (ts.isBindingElement(pattern) || ts.isShorthandPropertyAssignment(pattern)) taintPattern(pattern.name, names);
    else if (ts.isPropertyAssignment(pattern)) taintPattern(pattern.initializer, names);
    else if (ts.isSpreadAssignment(pattern) || ts.isSpreadElement(pattern) || ts.isParenthesizedExpression(pattern)) taintPattern(pattern.expression, names);
    else if (names === codeNames && (ts.isPropertyAccessExpression(pattern) || ts.isElementAccessExpression(pattern))) taintPattern(pattern.expression, names);
    else if (isAssignment(pattern)) taintPattern(pattern.left, names);
  };

  const isUnprovableAggregate = value => {
    while (value && (ts.isParenthesizedExpression(value) || ts.isAwaitExpression(value))) value = value.expression;

    if (!value) return false;

    if (ts.isIdentifier(value)) return unprovableAggregates.has(value.text) || codeNames.has(value.text);

    if (ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value)) return isUnprovableAggregate(value.expression);

    const invoked = invocation(value);

    if (invoked) return !verifiedGitCall(value) && (invoked.inputs.some(isCodeValue) || isCodeValue(invoked.callee));

    if (ts.isConditionalExpression(value)) return isUnprovableAggregate(value.whenTrue) || isUnprovableAggregate(value.whenFalse);

    if (isAssignment(value)) return isUnprovableAggregate(value.right) || (value.operatorToken.kind !== ts.SyntaxKind.EqualsToken && isUnprovableAggregate(value.left));

    if (ts.isBinaryExpression(value) && value.operatorToken.kind === ts.SyntaxKind.CommaToken) return isUnprovableAggregate(value.right);

    if (ts.isBinaryExpression(value) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(value.operatorToken.kind)) return isUnprovableAggregate(value.left) || isUnprovableAggregate(value.right);

    return (ts.isObjectLiteralExpression(value) || ts.isArrayLiteralExpression(value) || ts.isClassExpression(value)) && (isUnprovableValue(value) || isCodeValue(value));
  };

  const hasComputedPattern = pattern => {
    if ((ts.isBindingElement(pattern) && pattern.propertyName && ts.isComputedPropertyName(pattern.propertyName)) ||
        (ts.isPropertyAssignment(pattern) && ts.isComputedPropertyName(pattern.name))) return true;

    return ts.forEachChild(pattern, hasComputedPattern) ?? false;
  };

  // Iterate until the set stops growing, which is the fixed point: every pass only adds
  // names and every name is an identifier in this file, so growth is bounded and a pass
  // that adds nothing ends the loop. A pass *cap* is not a fixed point — with bindings
  // written back-to-front (`b9 = b8; ...; b1 = globalThis[k]; b9('import("@scope/pkg")')`)
  // the ninth alias is only named on the ninth pass, so an eight-pass cap leaves `b9`
  // callable and the target it reaches is never reported.
  let grew = true;

  while (grew) {
    const before = unprovableNames.size + unprovableAggregates.size + codeNames.size + childModules.size + childOriginCount();

    const collect = node => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === "node:child_process") {
        const clause = node.importClause;

        if (clause?.name) {
          childModules.add(clause.name.text);
          codeNames.add(clause.name.text);
        }

        if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
          childModules.add(clause.namedBindings.name.text);
          codeNames.add(clause.namedBindings.name.text);
        }

        if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings)) {
          for (const binding of clause.namedBindings.elements) {
            const kind = binding.propertyName?.text ?? binding.name.text;

            if (childMethods.has(kind)) bindChildFunction(binding.name, [kind]);
          }
        }
      }

      if ((ts.isVariableDeclaration(node) || isAssignment(node))) {
        const binding = ts.isVariableDeclaration(node) ? node.name : node.left;
        const value = ts.isVariableDeclaration(node) ? node.initializer : node.right;

        if (ts.isIdentifier(binding) && isChildModule(value)) {
          childModules.add(binding.text);
          codeNames.add(binding.text);
        }

        const kinds = childFunctionKinds(value);

        if (kinds.length) bindChildFunction(binding, kinds);

        if (isChildModule(value) && (ts.isObjectBindingPattern(binding) || ts.isObjectLiteralExpression(binding))) bindChildFunction(binding, [...childMethods]);
      }

      if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name && isCodeValue(node)) taintPattern(node.name, codeNames);

      if (ts.isForOfStatement(node)) {
        const binding = ts.isVariableDeclarationList(node.initializer) ? node.initializer.declarations.map(declaration => declaration.name) : [node.initializer];

        for (const pattern of binding) {
          if (isCodeValue(node.expression)) taintPattern(pattern, codeNames);

          if (isUnprovableAggregate(node.expression)) taintPattern(pattern, unprovableAggregates);
        }
      }

      if ((ts.isVariableDeclaration(node) || ts.isBindingElement(node) || ts.isParameter(node)) && isUnprovableValue(node.initializer)) taintPattern(node.name);

      if ((ts.isVariableDeclaration(node) || ts.isBindingElement(node) || ts.isParameter(node)) && isCodeValue(node.initializer)) taintPattern(node.name, codeNames);

      if ((ts.isVariableDeclaration(node) || ts.isBindingElement(node) || ts.isParameter(node)) && isUnprovableAggregate(node.initializer)) taintPattern(node.name, unprovableAggregates);

      if (ts.isBindingElement(node) && node.propertyName && ts.isComputedPropertyName(node.propertyName)) {
        taintPattern(node.name);
        taintPattern(node.name, codeNames);
      }

      if (isAssignment(node) && (isUnprovableValue(node.right) || hasComputedPattern(node.left))) taintPattern(node.left);

      if (isAssignment(node) && (isCodeValue(node.right) || hasComputedPattern(node.left))) taintPattern(node.left, codeNames);

      if (isAssignment(node) && isUnprovableAggregate(node.right)) taintPattern(node.left, unprovableAggregates);

      ts.forEachChild(node, collect);
    };

    collect(sourceFile);

    grew = unprovableNames.size + unprovableAggregates.size + codeNames.size + childModules.size + childOriginCount() !== before;
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
    const invoked = invocation(node);
    const isConstruction = invoked !== undefined;
    const callee = invoked?.callee ?? node;
    const calleeName = accessedName(callee);

    if (ts.isThrowStatement(node) && isCodeValue(node.expression)) {
      dynamic.add(text(node));

      return;
    }

    const childKinds = childFunctionKinds(callee);

    if (isConstruction && childKinds.length) {
      if (!verifiedGitCall(node)) {
        dynamic.add(text(node));

        return;
      }

      ts.forEachChild(node, visit);

      return;
    }

    if (isAssignment(node) &&
        (ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left)) && isCodeValue(node.right)) {
      dynamic.add(text(node));

      return;
    }

    if (calleeName === "getBuiltinModule") {
      builtins.add(text(node));

      return;
    }

    // Refused wherever the name appears, aliased or not, so a reference cannot be stored
    // and called later past a target-only check.
    if (/^(?:eval|Function|constructor)$/.test(calleeName)) {
      dynamic.add(text(node));

      return;
    }

    let target = callee;

    while (ts.isParenthesizedExpression(target)) target = target.expression;

    if (isConstruction && (invoked.inputs.some(isCodeValue) || isUnprovableAggregate(callee) || (!ts.isPropertyAccessExpression(target) && !ts.isElementAccessExpression(target) && isUnprovableValue(target)) ||
        (/^(?:call|apply|bind)$/.test(calleeName) && isUnprovableValue(callee)))) {
      dynamic.add(text(node));

      return;
    }

    // A computed *call* target whose name is not a literal cannot be proven safe, so it
    // is refused: `globalThis["ev" + "al"]('import("@scope/pkg")')` passes `node --check`
    // and then attempts the load. Scoping this to call and construction targets matters —
    // an ordinary `track[key]` or `match[1]` read names nothing at all and must stay clean.
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

  return { literals: [...literals], computed: [...computed], requires: [...requires], builtins: [...builtins], resolvers: [...resolvers], dynamic: [...dynamic] };
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
    const { literals, computed, requires, builtins, resolvers, dynamic } = scanImports(source, file);

    checkModuleSyntax(path.join(root, file));
    const bare = literals.filter(specifier => !specifier.startsWith("node:") && !isRelativeSpecifier(specifier));

    const unsupported = literals.filter(specifier => UNSUPPORTED_MODULE_LOADERS.has(specifier));

    if (unsupported.length) throw new Error(`${file} imports an unsupported module loader; install-free helpers must use imports the guard can traverse: ${unsupported.join(", ")}`);

    if (bare.length) throw new Error(`${file} is reachable from workflow jobs that never install dependencies; remove these bare imports: ${bare.join(", ")}`);

    if (computed.length) throw new Error(`${file} builds import targets at runtime; install-free workflow jobs need literal paths so the dependency-free guard can traverse them: ${computed.join(", ")}`);

    if (requires.length) throw new Error(`${file} reaches for CommonJS loading; install-free workflow jobs must use literal static imports so the dependency-free guard can traverse them: ${requires.join(", ")}`);

    if (builtins.length) throw new Error(`${file} reaches for a builtin module accessor; install-free workflow jobs must use literal static imports: ${builtins.join(", ")}`);

    if (resolvers.length) throw new Error(`${file} reaches for the dynamic resolve loader; install-free workflow jobs must use literal static imports so the dependency-free guard can traverse them: ${resolvers.join(", ")}`);

    if (dynamic.length) throw new Error(`${file} builds or evaluates code at runtime, which no scanner can see through and a syntax check cannot catch; install-free workflow jobs must use literal static imports: ${dynamic.join(", ")}`);

    const runnerEffects = githubScriptEnvironmentEffects(source);

    if (runnerEffects.unknown || runnerEffects.pathChanged || Object.keys(runnerEffects.environment).some(name => /^(?:PATH|NODE_OPTIONS|NODE_ENV|BASH_ENV|ENV|npm_config_.*)$/i.test(name))) throw new Error(`${file} mutates persistent runner environment; put dependency-related environment writes in explicit workflow steps so their effects can be verified`);

    for (const relative of literals.filter(isRelativeSpecifier)) {
      const target = fileURLToPath(new URL(relative, pathToFileURL(path.resolve(root, file))));

      queue.push({ file: path.relative(root, target), specifier: relative });
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
function parenthesizedEnd(text, opening) {
  let cursor = opening + 1;
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

  return depth === 0 ? cursor : -1;
}

function words(text) {
  const list = [];

  let value = "";
  let quote = null;
  let ansiQuote = false;
  let hasExpansion = false;
  let redirectionAt;
  let redirections = [];
  let started = false;

  const flush = () => {
    if (started) list.push({ value, hasExpansion, redirectionAt, redirections });

    value = "";
    hasExpansion = false;
    redirectionAt = undefined;
    redirections = [];
    started = false;
  };

  for (let index = 0; index < text.length; index++) {
    const character = text[index];

    if (character === "\\" && (quote !== "'" || ansiQuote)) {
      const next = text[index + 1];

      if (!quote || ansiQuote || /[$`"\\\n]/.test(next ?? "")) {
        if (next !== "\n") value += next ?? "";

        index++;
        started = true;

        continue;
      }
    }

    if (quote !== "'" && (character === "$" || (!quote && "<>".includes(character))) && text[index + 1] === "(") {
      const close = parenthesizedEnd(text, index + 1);

      if (close === -1) throw new Error("Unterminated shell substitution cannot be verified");

      value += text.slice(index, close + 1);
      hasExpansion = true;
      started = true;
      index = close;

      continue;
    }

    if (character === quote) {
      quote = null;

      continue;
    }

    // These Bash quote prefixes change the effective word beyond ordinary quote removal.
    if (!quote && character === "$" && ["'", '"'].includes(text[index + 1])) {
      hasExpansion = true;
      ansiQuote = text[index + 1] === "'";
      quote = text[++index];
      value += "$";
      started = true;

      continue;
    }

    if (!quote && (character === "'" || character === '"')) {
      ansiQuote = false;
      quote = character;
      started = true;

      continue;
    }

    if (!quote && /[ \t\n]/.test(character)) {
      flush();

      continue;
    }

    if (quote !== "'") {
      if (character === "`" || (character === "$" && /[A-Za-z_0-9{(@*#?$!-]/.test(text[index + 1] ?? ""))) hasExpansion = true;

      if (!quote && (/[*?[]/.test(character) || (character === "~" && !started) || /^[<>]\(/.test(text.slice(index)) || /^\{[^{}]*(?:,|\.\.)[^{}]*\}/.test(text.slice(index)))) hasExpansion = true;
    }

    if (!quote && character === ">" && text[index + 1] !== "(") {
      const at = /^\d*$/.test(value) ? 0 : value.length;

      redirectionAt ??= at;
      redirections.push({ at, end: value.length + (text[index + 1] === ">" ? 2 : 1) });

      if (text[index + 1] === ">") {
        value += ">>";
        index++;
        started = true;

        continue;
      }
    }

    value += character;
    started = true;
  }

  flush();

  return list;
}

// The helpers a `node` invocation names. Word boundaries, not a single regex, decide this:
// `node --no-warnings tools/x.mjs` and `node --import node:fs tools/x.mjs` put the entrypoint
// after a space, which one greedy pattern either misses or captures only the last of several
// paths, so every word after the interpreter is asked instead. A leading `${GITHUB_WORKSPACE}`
// or a relocated checkout directory names the same helper. Inline code and implicit
// stdin are refused because neither provides an entrypoint the closure can verify.
// The command bodies a string hands to the shell to run: balanced `$(...)` groups and the
// process substitutions `<(...)` and `>(...)`, and the text between backticks. Bash
// executes these alongside or before the outer command, so whatever a
// `node` names inside one really executes.
function commandSubstitutions(text) {
  const found = [];

  for (let index = 0; index < text.length - 1; index++) {
    if (!"$<>".includes(text[index]) || text[index + 1] !== "(") continue;

    const close = parenthesizedEnd(text, index + 1);

    if (close === -1) throw new Error("Unterminated shell substitution cannot be verified");

    found.push(text.slice(index + 2, close));
    index = close;
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

function rejectNodeOptions(environment) {
  if (String(environment.NODE_OPTIONS ?? "").trim() !== "") {
    throw new Error("unprovable NODE_OPTIONS; install-free workflow helpers must put Node options on the command line");
  }
}

function nativeExecutablePath(value) {
  return !value.includes("/") || /^\/(?:bin|usr\/bin|usr\/local\/bin|opt\/homebrew\/bin)\/[A-Za-z0-9_-]+$/.test(value);
}

function commandContext(list, environment) {
  let executable = 0;
  let effectiveEnvironment = { ...environment };
  let introspection = false;
  let launchesExternal = true;
  let externalOnly = false;
  let negated = false;

  while (executable < list.length) {
    const word = list[executable];
    const assignment = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(word.value);
    const wrapper = path.posix.basename(word.value);

    if (assignment) {
      effectiveEnvironment[assignment[1]] = word.hasExpansion ? "${unprovable}" : assignment[2];
      executable++;
    } else if (["--", "if", "elif", "while", "until", "then", "do", "!"].includes(word.value)) {
      if (word.value === "!") negated = true;

      executable++;
    } else if (!word.hasExpansion && nativeExecutablePath(word.value) && ["env", "command", "builtin", "exec"].includes(wrapper)) {
      if (wrapper === "builtin" || (externalOnly && wrapper !== "env")) launchesExternal = false;

      if (["env", "exec"].includes(wrapper)) externalOnly = true;

      executable++;

      while (executable < list.length && list[executable].value.startsWith("-")) {
        const option = list[executable++];

        if (option.hasExpansion) throw new Error(`unprovable ${wrapper} option: ${option.value}`);

        if (option.value === "--") break;

        if (wrapper === "env" && ["-i", "--ignore-environment", "-"].includes(option.value)) {
          effectiveEnvironment = {};

          continue;
        }

        if (wrapper === "env" && /^(?:-u|--unset)(?:=|$)|^-u./.test(option.value)) {
          const separate = ["-u", "--unset"].includes(option.value);
          const name = separate ? list[executable++] : { value: option.value.startsWith("--unset=") ? option.value.slice("--unset=".length) : option.value.slice(2), hasExpansion: false };

          if (!name || name.hasExpansion || name.value === "") throw new Error(`unprovable env option: ${option.value}`);

          delete effectiveEnvironment[name.value];

          continue;
        }

        if (wrapper === "command" && /^-[pVv]+$/.test(option.value)) {
          if (/[Vv]/.test(option.value)) introspection = true;

          continue;
        }

        if (wrapper === "exec" && ["-c", "-l"].includes(option.value)) {
          if (option.value === "-c") effectiveEnvironment = {};

          continue;
        }

        throw new Error(`unsupported ${wrapper} option: ${option.value}; use a directly provable executable`);
      }
    } else {
      break;
    }
  }

  return { index: executable, environment: effectiveEnvironment, introspection, launchesExternal, negated };
}

function hashOverrides(args) {
  for (const word of args) {
    if (word.hasExpansion) return true;

    if (word.value === "--") break;

    if (/^-[^-]*p/.test(word.value)) return true;
  }

  return false;
}

const INSTALL_FREE_COMMANDS = new Set([":", "[", "[[", "test", "true", "false", "exit", "return", "break", "continue", "if", "then", "else", "elif", "fi", "for", "while", "until", "do", "done", "case", "esac", "{", "}", "(", ")", "set", "unset", "export", "declare", "typeset", "readonly", "local", "alias", "hash", "echo", "printf", "cat", "mkdir", "cp", "mv", "rm", "rmdir", "touch", "chmod", "chown", "ln", "truncate", "ls", "stat", "id", "which", "type", "pwd", "head", "tail", "grep", "cut", "wc", "tr", "sort", "uniq", "tee", "find", "sleep", "read", "shopt", "eval", "bash", "sh", "node", "date", "cd", "pushd", "popd"]);

function helperReferences(text, environment = {}, substitutionsOnly = false, actionsDirectoryAvailable = false) {
  if (!substitutionsOnly) {
    const source = text.trim();
    const definition = /^(?:function\s+[A-Za-z_]\w*(?:\s*\(\s*\))?|[A-Za-z_]\w*\s*\(\s*\))\s*\{/.exec(source);

    if (definition) return helperReferences(source.slice(definition[0].length) || ":", environment, false, actionsDirectoryAvailable);

    if (/^\{(?:\s|$)/.test(source)) return helperReferences(source.slice(1).trim() || ":", environment, false, actionsDirectoryAvailable);

    if (source.startsWith("(")) {
      const end = parenthesizedEnd(source, 0);

      return helperReferences(source.slice(1, end === source.length - 1 ? end : undefined).trim() || ":", environment, false, actionsDirectoryAvailable);
    }
  }

  const list = words(text);
  const context = commandContext(list, environment);
  const executable = context.index;
  const { introspection } = context;

  if (!substitutionsOnly && !introspection && list[executable]?.hasExpansion && !["[", "[["].includes(list[executable].value)) throw new Error(`unprovable shell interpreter: ${list[executable].value}; use a literal executable`);

  const start = !substitutionsOnly && list[executable] && !list[executable].hasExpansion && path.posix.basename(list[executable].value) === "node" ? executable : -1;
  const executesNode = start !== -1 && !introspection;
  const references = new Set();
  const commandEnvironment = context.environment;
  const commandName = path.posix.basename(list[executable]?.value ?? "");

  const compilerShellAvailable = actionsDirectoryAvailable && !Object.hasOwn(commandEnvironment, "RUNNER_TEMP") &&
    !list.slice(0, executable).some(word => ["-i", "--ignore-environment", "-"].includes(word.value) || word.value.includes("RUNNER_TEMP"));

  if (!substitutionsOnly && !introspection && list[executable] && !nativeExecutablePath(list[executable].value)) throw new Error(`unprovable native executable path: ${list[executable].value}; use an established system executable`);

  if (!substitutionsOnly && !introspection && commandName === "alias" && list.slice(executable + 1).some(word => word.hasExpansion || word.value.includes("="))) throw new Error("unprovable shell alias; install-free commands must not define aliases that can alter executable identity");

  if (!substitutionsOnly && !introspection && commandName === "hash" && hashOverrides(list.slice(executable + 1))) throw new Error("unprovable shell hash; install-free commands must not override cached executable identity");

  if (!substitutionsOnly && !introspection && !executesNode && !["echo", "printf", "cat", "which", "type", "[", "[[", "test", "alias", "hash", "eval", "bash", "sh"].includes(commandName) &&
      list.slice(executable + 1).some(word => path.posix.basename(word.value) === "node" || /(?:^|[\s;|&])(?:[\w/.-]+\/)?node(?:\s|$)/.test(word.value))) {
    throw new Error(`unmodeled command ${commandName} forwards Node execution; invoke the helper directly or through a modeled wrapper`);
  }

  if (!substitutionsOnly && !introspection && commandName) {
    const packageArgs = INSTALLERS.has(commandName) ? packageArguments(list.slice(executable).map(word => word.value)) : undefined;
    const knownPackageOperation = packageArgs && (PACKAGE_MUTATIONS.has(packageArgs[1]) || packageArgs[1] === "");
    const compilerProgram = compilerShellAvailable && commandName === "awf";

    if (["source", "."].includes(commandName)) throw new Error("unprovable helper working directory and runner environment: sourced install-free payloads must be verified explicitly");

    if (!INSTALL_FREE_COMMANDS.has(commandName) && !knownPackageOperation && !compilerProgram) throw new Error(`unmodeled install-free executable ${commandName}; expose its payload in a verified module or literal supported shell command`);

    if ((commandName === "find" && list.slice(executable + 1).some(word => /^-(?:exec|execdir|ok|okdir)$/.test(word.value))) ||
        (commandName === "sort" && list.slice(executable + 1).some(word => /^--compress-program(?:=|$)/.test(word.value)))) throw new Error(`unmodeled execution option for ${commandName}; invoke the payload directly`);
  }

  const recordScript = script => {
    // Nested execution cannot establish install proof for its parent or sibling commands.
    for (const reference of standAloneHelpers({ env: commandEnvironment, jobs: { nested: { steps: [{ run: script, shell: "bash {0}" }] } } }, compilerShellAvailable)) references.add(reference);
  };

  if (!substitutionsOnly && !introspection && list[executable]?.value === "eval") {
    const args = list.slice(executable + 1);

    if (args.some(word => word.hasExpansion)) throw new Error("unprovable shell payload; use literal eval arguments");

    recordScript(args.map(word => word.value).join(" "));
  }

  if (!substitutionsOnly && !introspection && ["bash", "sh"].includes(path.posix.basename(list[executable]?.value ?? ""))) {
    const args = list.slice(executable + 1);
    const commandOption = args.findIndex(word => /^-[eux]*c[eux]*$/.test(word.value));

    if (commandOption !== -1) {
      const options = args.slice(0, commandOption + 1);
      const payload = args[commandOption + 1];

      if (options.some(word => word.hasExpansion || !/^(?:-[euxc]+|--noprofile|--norc)$/.test(word.value)) || !payload || payload.hasExpansion) throw new Error("unprovable shell payload; use a literal bash/sh -c command without startup options");

      recordScript(payload.value);
    } else if (args.length === 1 && !args[0].hasExpansion && ["--help", "--version"].includes(args[0].value)) {
      // Informational shell invocations execute neither stdin nor a script.
    } else if (!(compilerShellAvailable && /^\$(?:RUNNER_TEMP|\{RUNNER_TEMP\})\/gh-aw\/actions\/[A-Za-z0-9_-]+\.sh$/.test(args[0]?.value ?? ""))) {
      throw new Error("unprovable shell payload; stdin and script files require a literal -c payload or a proven compiler action script");
    }
  }

  // A reserved GitHub workspace prefix has a known base. No other expansion may choose
  // an entrypoint, even when another literal helper happens to appear in the arguments.
  const literalPath = word => {
    const workspace = /^\$(?:\{GITHUB_WORKSPACE\}|GITHUB_WORKSPACE)\/([^$`*?[]+)$/.exec(word.value);

    if (word.hasExpansion && workspace) return workspace[1];

    if (word.hasExpansion) throw new Error(`unprovable Node entrypoint: ${word.value}; use a literal workspace path`);

    return word.value;
  };

  const recordPreload = (word, option) => {
    const specifier = literalPath(word);

    if (UNSUPPORTED_MODULE_LOADERS.has(specifier)) throw new Error(`Node imports an unsupported module loader: ${specifier}`);

    if (specifier.startsWith("node:")) return;

    const requireOption = option === "--require" || option === "-r";
    const local = isRelativeSpecifier(specifier) || path.isAbsolute(specifier) || word.hasExpansion;

    if (!local && !(specifier.startsWith("file:") && !requireOption)) throw new Error(`bare preload module ${specifier} cannot run without installed dependencies`);

    if (requireOption) {
      references.add(path.normalize(specifier));
    } else {
      const base = pathToFileURL(path.join(process.cwd(), "_entrypoint.mjs"));
      const file = fileURLToPath(new URL(word.hasExpansion ? `./${specifier}` : specifier, base));

      references.add(isRelativeSpecifier(specifier) || word.hasExpansion ? path.relative(process.cwd(), file) : file);
    }
  };

  if (executesNode) {
    rejectNodeOptions(commandEnvironment);

    const args = list.slice(start + 1);
    let consumeValue = null;
    let endOptions = false;
    let entrypointFound = false;
    let informational = false;

    for (const word of args) {
      if (consumeValue) {
        if (NODE_MODULE_OPTIONS.has(consumeValue)) recordPreload(word, consumeValue);
        else if (word.hasExpansion) throw new Error(`unprovable Node option value: ${word.value}`);

        consumeValue = null;

        continue;
      }

      if (!endOptions && (/^-[ep]/.test(word.value) || /^(?:--eval|--print)(?:=|$)/.test(word.value))) throw new Error("inline Node code cannot be verified; use an explicit .mjs helper");

      if (!endOptions && ["--version", "-v", "--help", "-h"].includes(word.value)) {
        informational = true;

        break;
      }

      if (word.value === "--" && !endOptions) {
        endOptions = true;

        continue;
      }

      if (!endOptions && word.value.startsWith("-")) {
        const separator = word.value.indexOf("=");
        const option = separator === -1 ? word.value : word.value.slice(0, separator);

        if ((option.startsWith("-r") && option !== "-r") || (option === "-r" && separator !== -1)) throw new Error(`unsupported Node preload option: ${word.value}; use -r followed by its module`);

        if (!NODE_VALUE_OPTIONS.has(option) && !NODE_BOOLEAN_OPTIONS.has(option)) throw new Error(`unsupported Node option: ${word.value}; use explicitly modeled options`);

        if (NODE_MODULE_OPTIONS.has(option) && separator !== -1) {
          recordPreload({ value: word.value.slice(separator + 1), hasExpansion: word.hasExpansion }, option);
        } else {
          if (word.hasExpansion) throw new Error(`unprovable Node entrypoint options: ${word.value}`);

          consumeValue = NODE_VALUE_OPTIONS.has(option) && separator === -1 ? option : null;
        }

        continue;
      }

      const entrypoint = literalPath(word);

      if (!entrypoint.endsWith(".mjs")) throw new Error(`unprovable Node entrypoint: ${entrypoint}; install-free helpers need explicit .mjs paths`);

      references.add(entrypoint);
      entrypointFound = true;

      break;
    }

    if (consumeValue) throw new Error(`Node option ${consumeValue} has no value to verify`);

    if (!entrypointFound && !informational) throw new Error("Node execution has no explicit entrypoint; implicit stdin code cannot be verified");

    for (const word of args) {
      if (word.hasExpansion && !/^\$(?:\{GITHUB_WORKSPACE\}|GITHUB_WORKSPACE)\/[^$`*?[]+$/.test(word.value)) continue;

      const reference = literalPath(word);

      if (/^\S*tools\/[^ "']+\.mjs$/.test(reference)) references.add(reference);
    }
  }

  for (const inner of commandSubstitutions(text)) {
    recordScript(inner);
  }

  return [...references];
}

// GitHub Script runs JavaScript, not shell commands. Read its import arguments from the
// AST so comments and strings cannot become entrypoints or dependency-install proof.
function githubScriptHelpers(script, environment, actionsDirectoryAvailable) {
  const source = parseModule(script, "github-script.js");
  const files = new Set();
  const bindings = new Map();
  const pathBindings = new Set();
  let pathImmutable = true;

  if (source.parseDiagnostics.length) throw new Error("github-script cannot be parsed to verify its workspace imports");

  const { dynamic } = scanImports(script, "github-script.js");

  if (dynamic.length) throw new Error(`github-script builds or evaluates code at runtime: ${dynamic.join(", ")}`);

  const isPathRequire = node => node && ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "require" &&
    node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]) && ["path", "node:path"].includes(node.arguments[0].text);

  const collect = node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const constant = ts.isVariableDeclarationList(node.parent) && (node.parent.flags & ts.NodeFlags.Const) !== 0;

      bindings.set(node.name.text, constant && !bindings.has(node.name.text) ? node.initializer : undefined);

      if (isPathRequire(node.initializer)) pathBindings.add(node.name.text);
    }

    if ((ts.isParameter(node) || ts.isBindingElement(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name && ts.isIdentifier(node.name)) bindings.set(node.name.text, undefined);

    const mutation = isAssignment(node) ? node.left :
      ts.isDeleteExpression(node) ? node.expression :
        (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(node.operator) ? node.operand : undefined;

    if (mutation) {
      let target = mutation;

      while (ts.isPropertyAccessExpression(target) || ts.isElementAccessExpression(target)) target = target.expression;

      if (ts.isIdentifier(target)) bindings.set(target.text, undefined);
    }

    ts.forEachChild(node, collect);
  };

  collect(source);

  const proveObjects = node => {
    const parent = node.parent;

    if (ts.isIdentifier(node) && node.text === "process" && !(ts.isPropertyAccessExpression(parent) && parent.name === node)) {
      if (!(ts.isPropertyAccessExpression(parent) && parent.expression === node && parent.name.text === "env")) bindings.set("process", undefined);
    }

    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "process" && node.name.text === "env") {
      if (!((ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) && parent.expression === node)) bindings.set("process", undefined);
    }

    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && accessedName(node) === "process") bindings.set("process", undefined);

    if (isPathRequire(node) && !(ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name) && bindings.get(parent.name.text) === node)) pathImmutable = false;

    if (ts.isIdentifier(node) && pathBindings.has(node.text) && !(ts.isPropertyAccessExpression(parent) && parent.name === node)) {
      const declaration = ts.isVariableDeclaration(parent) && parent.name === node && bindings.get(node.text) === parent.initializer;
      const joinCall = ts.isPropertyAccessExpression(parent) && parent.expression === node && parent.name.text === "join" && ts.isCallExpression(parent.parent) && parent.parent.expression === parent;

      if (!declaration && !joinCall) pathImmutable = false;
    }

    ts.forEachChild(node, proveObjects);
  };

  proveObjects(source);

  const rooted = (base, suffix, concatenate = false) => {
    if (!base || !suffix || suffix.kind !== "literal") return undefined;

    if (base.kind === "literal") return { kind: "literal", value: concatenate ? base.value + suffix.value : path.posix.join(base.value, suffix.value) };

    if (concatenate && base.value === "" && !suffix.value.startsWith("/")) return undefined;

    const value = concatenate ? path.posix.normalize(`/__root__/${base.value}${suffix.value}`) : path.posix.join("/__root__", base.value, suffix.value);

    return value.startsWith("/__root__/") || value === "/__root__" ? { kind: base.kind, value: value.slice("/__root__/".length) } : undefined;
  };

  const resolve = (node, seen = new Set()) => {
    if (!node) return undefined;

    if (ts.isParenthesizedExpression(node)) return resolve(node.expression, seen);

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { kind: "literal", value: node.text };

    if (ts.isIdentifier(node)) {
      if (seen.has(node.text)) return undefined;

      return resolve(bindings.get(node.text), new Set([...seen, node.text]));
    }

    if (ts.isPropertyAccessExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "env" && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "process" && !bindings.has("process")) {
      const name = node.name.text;

      if (name === "GITHUB_WORKSPACE" && (environment[name] === undefined || environment[name] === "${{ github.workspace }}")) return { kind: "workspace", value: "" };

      if (name === "RUNNER_TEMP" && (environment[name] === undefined || environment[name] === "${{ runner.temp }}")) return { kind: "external", value: "" };

      if (name === "GH_AW_ACTIONS_DIR" && ((actionsDirectoryAvailable && environment[name] === undefined) || environment[name] === "${{ runner.temp }}/gh-aw/actions")) return { kind: "external", value: "gh-aw/actions" };
    }

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return rooted(resolve(node.left, seen), resolve(node.right, seen), true);

    if (ts.isTemplateExpression(node) && node.head.text === "" && node.templateSpans.length === 1) {
      const span = node.templateSpans[0];

      return rooted(resolve(span.expression, seen), { kind: "literal", value: span.literal.text }, true);
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "join" && ts.isIdentifier(node.expression.expression)) {
      const receiver = bindings.get(node.expression.expression.text);

      const pathModule = pathImmutable && isPathRequire(receiver);

      if (pathModule && node.arguments.length) {
        let result = resolve(node.arguments[0], seen);

        for (const argument of node.arguments.slice(1)) result = rooted(result, resolve(argument, seen));

        return result;
      }
    }

    return undefined;
  };

  const visit = node => {
    if (accessedName(node) === "getBuiltinModule") throw new Error("github-script reaches for a builtin module accessor; use literal static imports");

    if (accessedName(node) === "require" || accessedName(node) === "__original_require__") {
      if (!ts.isIdentifier(node) || !ts.isCallExpression(node.parent) || node.parent.expression !== node || node.text !== "require") throw new Error("github-script has an unprovable require alias; use direct require with a proven target");

      const target = node.parent.arguments[0];
      const resolved = resolve(target);

      if (!resolved) throw new Error(`github-script has an unprovable require target: ${target?.getText(source) ?? "<missing>"}`);

      if (resolved.kind === "external" && (!actionsDirectoryAvailable || !resolved.value.startsWith("gh-aw/actions/"))) throw new Error(`github-script has an unprovable require target outside the observed compiler setup directory: ${target.getText(source)}`);

      if (resolved.kind === "workspace") files.add(resolved.value);
      else if (resolved.kind === "literal") {
        const specifier = resolved.value;

        if (UNSUPPORTED_MODULE_LOADERS.has(specifier.startsWith("node:") ? specifier : `node:${specifier}`)) throw new Error(`github-script requires an unsupported module loader: ${specifier}`);

        if (isRelativeSpecifier(specifier)) files.add(path.posix.normalize(specifier));
        else if (!isBuiltin(specifier)) throw new Error(`github-script has a bare require without proven dependencies: ${specifier}`);
      }
    }

    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const target = node.arguments[0];
      let file;

      if (target && (ts.isStringLiteral(target) || ts.isNoSubstitutionTemplateLiteral(target))) {
        const specifier = target.text;

        if (UNSUPPORTED_MODULE_LOADERS.has(specifier)) throw new Error(`github-script imports an unsupported module loader: ${specifier}`);

        if (isRelativeSpecifier(specifier)) file = specifier;
        else if (!specifier.startsWith("node:")) throw new Error(`github-script has a bare import without proven dependencies: ${specifier}`);
      } else if (target && ts.isTemplateExpression(target) && target.head.text === "" && target.templateSpans.length === 1) {
        const resolved = resolve(target);

        if (resolved?.kind === "workspace") file = resolved.value;
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

function shellRelocates(script, environment) {
  for (const { command } of splitCommands(script)) {
    const list = words(command);
    const context = commandContext(list, environment);
    const executable = context.introspection ? undefined : list[context.index]?.value;

    if (["cd", "pushd", "popd", "source", "."].includes(executable)) return true;

    if (executable === "eval") {
      const args = list.slice(context.index + 1);

      if (args.some(word => word.hasExpansion) || shellRelocates(args.map(word => word.value).join(" "), context.environment)) return true;
    }
  }

  return false;
}

function outputDestinations(list) {
  return list.flatMap((word, index) => word.redirections.map((redirection, position) => {
    const end = word.redirections[position + 1]?.at ?? word.value.length;
    const attached = word.value.slice(redirection.end, end);

    return { value: attached || list[index + 1]?.value, hasExpansion: attached ? word.hasExpansion : list[index + 1]?.hasExpansion };
  }));
}

function dependencyTreeChanged(list, context, checkoutRoot, text, reservedOutputs = new Set(), compilerActionsAvailable = false) {
  const argv = list.slice(context.index).map(word => word.value);
  const executable = path.posix.basename(argv[0] ?? "");

  for (const destination of outputDestinations(list)) {
    const reserved = /^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))(?:\/[^$`*?[]*)?$/.exec(destination.value ?? "");
    const name = reserved?.[1] ?? reserved?.[2];
    const configured = context.environment[name];

    const knownTemp = (name === "RUNNER_TEMP" && /^\$\{\{\s*runner\.temp\s*\}\}$/.test(configured ?? "")) ||
      (name === "RUNNER_TOOL_CACHE" && /^\$\{\{\s*runner\.tool_cache\s*\}\}$/.test(configured ?? ""));

    if (reserved && reservedOutputs.has(name) && (!Object.hasOwn(context.environment, name) || knownTemp) &&
      !destination.value.split("/").some(part => part === "..")) continue;

    if (destination.hasExpansion || destination.value === undefined || /(?:^|\/)node_modules(?:\/|$)/.test(destination.value)) return true;
  }

  const nestedChanges = script => splitCommands(script).some(({ command, heredocs }) => {
    const nested = words(command);

    return dependencyTreeChanged(nested, commandContext(nested, context.environment), checkoutRoot, [command, ...heredocs].join("\n"), reservedOutputs, compilerActionsAvailable);
  });

  if (text && commandSubstitutions(text).some(nestedChanges)) return true;

  if (text?.trim().startsWith("(")) {
    const source = text.trim();
    const end = parenthesizedEnd(source, 0);

    if (nestedChanges(source.slice(1, end === source.length - 1 ? end : undefined))) return true;
  }

  if (executable === "{") {
    if (nestedChanges(text.trim().slice(1))) return true;
  }

  if (context.introspection) return false;

  if (executable === "eval") {
    if (list.slice(context.index + 1).some(word => word.hasExpansion)) return true;

    if (nestedChanges(argv.slice(1).join(" "))) return true;
  }

  if (["bash", "sh"].includes(executable)) {
    const commandOption = argv.findIndex(word => /^-[eux]*c[eux]*$/.test(word));

    if (commandOption !== -1 && argv[commandOption + 1]) {
      if (list[context.index + commandOption + 1].hasExpansion || nestedChanges(argv[commandOption + 1])) return true;
    } else if (!argv.slice(1).some(word => ["--help", "--version"].includes(word)) &&
      !(compilerActionsAvailable && reservedOutputs.has("RUNNER_TEMP") && !Object.hasOwn(context.environment, "RUNNER_TEMP") &&
        /^\$(?:RUNNER_TEMP|\{RUNNER_TEMP\})\/gh-aw\/actions\/[A-Za-z0-9_-]+\.sh$/.test(argv[1] ?? ""))) return true;
  }

  if (checkoutRoot && INSTALLERS.has(executable)) {
    const normalized = packageArguments(argv);

    if (!normalized) return true;

    if (PACKAGE_MUTATIONS.has(normalized[1])) {
      const computed = list.slice(context.index + 1).some(word => word.hasExpansion) ||
        Object.entries(context.environment).some(([name, value]) => /^npm_config_(?:dry_run|package_lock_only)$/i.test(name) && String(value).includes("$"));

      const options = packageMutationOptions(normalized, context.environment);

      return computed || externalPackageConfiguration(normalized, context.environment) || (!options.global && !options.noop);
    }
  }

  if (["echo", "printf", "cat", "ls", "test", "[", "[[", "true", "false", "exit"].includes(executable)) return false;

  if (argv.slice(1).some(word => /(?:^|\/)node_modules(?:\/|$)/.test(word))) return true;

  if (["rm", "rmdir", "mv", "rsync", "tar", "ln", "truncate"].includes(executable) &&
      list.slice(context.index + 1).some(word => word.hasExpansion || [".", "./", "..", "../"].includes(word.value))) return true;

  return false;
}

function shellVariableTargets(list, context) {
    const argv = list.slice(context.index);
    const executable = argv[0]?.value;

    if (executable === "printf") {
      const option = argv[1];

      if (!option || !option.value.startsWith("-v")) return [];
      const target = option.value === "-v" ? argv[2] : { ...option, value: option.value.slice(2) };

      return target && !target.hasExpansion && /^[A-Za-z_]\w*$/.test(target.value) ? [target.value] : null;
    }

    if (executable === "read") {
      const targets = [];

      for (let index = 1; index < argv.length; index++) {
        const word = argv[index];

        if (/^[<>]/.test(word.value)) break;

        if (word.hasExpansion) return null;

        if (word.value === "--") continue;

        if (word.value.startsWith("-")) {
          if (!/^-[a-zA-Z]+$/.test(word.value)) return null;

          for (const [position, flag] of Array.from(word.value.slice(1)).entries()) {
            if ("adnNptui".includes(flag)) {
              if (position !== word.value.length - 2) return null;
              const value = argv[++index];

              if (!value || value.hasExpansion) return null;

              if (flag === "a") {
                if (!/^[A-Za-z_]\w*$/.test(value.value)) return null;
                targets.push(value.value);
              }
            } else if (!"ers".includes(flag)) return null;
          }
        } else {
          if (!/^[A-Za-z_]\w*$/.test(word.value)) return null;
          targets.push(word.value);
        }
      }

      return targets.length ? targets : ["REPLY"];
    }

    return [];
  }

function setErrexit(argv, current) {
    for (let index = 1; index < argv.length; index++) {
      const word = argv[index];

      if (["--", "-", "+"].includes(word) || !/^[+-]/.test(word)) break;

      if (!/^[+-][a-zA-Z]+$/.test(word)) return false;

      for (const [position, flag] of Array.from(word.slice(1)).entries()) {
        if (flag === "e") current = word[0] === "-";
        else if (flag === "o") {
          if (position !== word.length - 2) return false;
          const option = argv[++index];

          if (option === "errexit") current = word[0] === "-";
          else if (option && !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(option)) return false;
        } else if (!"abfhkmnptuvxBCEHPT".includes(flag)) return false;
      }
    }

    return current;
  }

function mergeRunnerEffects(target, incoming) {
  target.pathChanged ||= incoming.pathChanged;
  target.unknown ||= incoming.unknown;

  for (const [name, value] of Object.entries(incoming.environment ?? {})) {
    const relevant = /^(?:PATH|NODE_OPTIONS|NODE_ENV|BASH_ENV|ENV|npm_config_.*)$/i.test(name);

    target.environment[name] = relevant && Object.hasOwn(target.environment, name) && target.environment[name] !== value ? "${unprovable}" : value;
  }
}

function runnerEnvironmentEffects(script, environment, inherited) {
  const effects = { environment: {}, pathChanged: false, unknown: false };
  const scalars = new Map(inherited?.scalars ?? ["RUNNER_TEMP", "RUNNER_TOOL_CACHE", "GITHUB_SERVER_URL", "GITHUB_WORKSPACE"].map(name => [name, undefined]));
  const sinks = new Map(inherited?.sinks ?? [["GITHUB_ENV", "environment"], ["GITHUB_PATH", "path"]]);
  let output = [];
  const groups = [];
  let blockDepth = 0;
  let conditional = false;

  for (const [name, raw] of Object.entries(inherited ? {} : environment)) {
    const value = String(raw);

    if (!/[\r\n]/.test(value) && (!value.includes("${{") || /^\$\{\{\s*(?:runner\.(?:temp|tool_cache)|github\.(?:server_url|workspace))\s*\}\}$/.test(value))) scalars.set(name, value.includes("${{") ? undefined : value);
    else scalars.delete(name);
  }

  const expand = word => {
    if (!word || /[\r\n]/.test(word.value)) return null;

    if (!word.hasExpansion) return word.value;

    let known = true;
    let literal = true;

    const value = word.value.replace(/\$(?:\{([A-Za-z_]\w*)(?:#[A-Za-z0-9:/._-]+)?\}|([A-Za-z_]\w*))/g, (match, braced, bare) => {
      const name = braced ?? bare;

      if (!scalars.has(name)) known = false;

      if (scalars.get(name) === undefined) literal = false;

      const scalar = scalars.get(name) ?? "";
      const prefix = /#([^}]+)\}$/.exec(match)?.[1];

      return prefix && scalar.startsWith(prefix) ? scalar.slice(prefix.length) : scalar;
    });

    if (!known || /[$`]/.test(value)) return null;

    return literal ? value : undefined;
  };

  const record = lines => {
    if (lines === null) {
      effects.unknown = true;

      return;
    }

    for (const line of lines) {
      if (line.value === "") continue;
      const assignment = /^([A-Za-z_]\w*)=(.*)$/.exec(line.value);

      if (!assignment || line.value.includes("\n")) {
        effects.unknown = true;

        continue;
      }

      const value = expand({ ...line, value: assignment[2] });

      if (value === null) effects.unknown = true;
      else mergeRunnerEffects(effects, { environment: { [assignment[1]]: value ?? "${unprovable}" } });
    }
  };

  for (const { command, operator } of splitCommands(script)) {
    const list = words(command);
    const redirect = list.findIndex(word => word.redirectionAt !== undefined);

    const destinations = outputDestinations(list);

    const destinationsSinks = destinations.map(destination => {
      if (!destination.hasExpansion) return undefined;
      const target = /^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))$/.exec(destination.value ?? "");

      if (target) return sinks.get(target[1] ?? target[2]);

      if (/\$(?:\{)?GITHUB_(?:ENV|PATH)\b/.test(destination.value ?? "")) return "both";

      return undefined;
    });

    const input = redirect === -1 ? list : list.slice(0, redirect).concat(list[redirect].redirectionAt ? [{ ...list[redirect], value: list[redirect].value.slice(0, list[redirect].redirectionAt) }] : []);
    const context = commandContext(input, environment);
    let argv = input.slice(context.index);
    const variableTargets = shellVariableTargets(input, context);

    if (variableTargets === null) {
      scalars.clear();

      if (sinks.size) effects.unknown = true;
    } else if (variableTargets.length) {
      const receivesSink = argv.some(word => word.hasExpansion && [...sinks.keys()].some(name => word.value.includes(`$${name}`) || word.value.includes(`\${${name}}`)));

      for (const name of variableTargets) {
        scalars.delete(name);
        sinks.delete(name);
      }

      if (receivesSink) effects.unknown = true;
    }

    while (argv[0]?.value === "{") {
      groups.push([]);
      argv = argv.slice(1);
    }

    const bindings = ENVIRONMENT_DECLARATIONS.has(argv[0]?.value) ? argv.slice(1) : argv.length === 0 ? input : [];

    for (const word of bindings) {
      const assignment = /^([A-Za-z_]\w*)=(.*)$/.exec(word.value);

      if (!assignment) continue;
      const value = { ...word, value: assignment[2] };
      const expanded = expand(value);
      const alias = word.hasExpansion && /^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))$/.exec(value.value);

      if ((conditional || blockDepth > 0) && (!scalars.has(assignment[1]) || expanded === null)) scalars.delete(assignment[1]);
      else if (conditional || blockDepth > 0) scalars.set(assignment[1], scalars.get(assignment[1]) === expanded ? expanded : undefined);
      else if (expanded !== null) scalars.set(assignment[1], expanded);
      else scalars.delete(assignment[1]);

      const nextSink = alias ? sinks.get(alias[1] ?? alias[2]) : undefined;
      const previousSink = sinks.get(assignment[1]);

      if ((conditional || blockDepth > 0) && previousSink && previousSink !== nextSink) sinks.set(assignment[1], "both");
      else if (nextSink) sinks.set(assignment[1], nextSink);
      else sinks.delete(assignment[1]);
    }

    let emitted = [];

    if (argv[0]?.value === "echo") emitted = argv.slice(1).some(word => word.value.startsWith('-') || word.value.includes("\\")) ? null : [{ value: argv.slice(1).map(word => word.value).join(" "), hasExpansion: argv.slice(1).some(word => word.hasExpansion) }];
    else if (argv[0]?.value === "printf") {
      const format = argv[1];

      if (!format || format.hasExpansion) emitted = null;
      else if (format.value === "%s\\n") emitted = argv.slice(2);
      else if (!format.value.includes("%") && !/\\(?!n)/.test(format.value)) emitted = format.value.replace(/\\n/g, "\n").split("\n").filter(Boolean).map(value => ({ value, hasExpansion: false }));
      else emitted = null;
    } else if (!["{", "}", "if", "then", "fi", "[", "[[", "export", "declare"].includes(argv[0]?.value) && argv[0] && !argv[0].value.includes("=")) emitted = null;

    if (argv[0]?.value === "}") emitted = groups.pop() ?? null;

    if (argv[0]?.value === "tee") emitted = output;

    for (const sink of destinationsSinks) {
      if (sink === "path" || sink === "both") effects.pathChanged = true;

      if (sink === "environment") record(emitted);

      if (sink === "both") effects.unknown = true;
    }

    if (argv[0]?.value === "tee") {
      for (const word of argv.slice(1)) {
        const variable = word.hasExpansion && /^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))$/.exec(word.value);
        const file = variable && sinks.get(variable[1] ?? variable[2]);

        if (file === "path") effects.pathChanged = true;
        else if (file === "environment") record(output);
        else if (file === "both") effects.unknown = true;
      }
    }

    if (!context.introspection && argv[0] && !["tee", "echo", "printf", "cat", "test", "[", "[[", "stat", "wc", "head", "tail", "grep", "ls"].includes(argv[0].value)) {
      for (const word of argv.slice(1)) {
        const variable = word.hasExpansion && /^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))$/.exec(word.value);
        const file = variable && sinks.get(variable[1] ?? variable[2]);

        if (file === "path") effects.pathChanged = true;
        else if (file === "environment" || file === "both") effects.unknown = true;
      }
    }

    if (groups.length && argv[0]?.value !== "{" && destinations.length === 0 && !PIPELINE.has(operator)) {
      const last = groups.length - 1;

      groups[last] = groups[last] === null || emitted === null ? null : groups[last].concat(emitted);
    }

    const childScalars = new Map(scalars);
    const childSinks = new Map(sinks);

    for (const word of input.slice(0, context.index)) {
      const assignment = /^([A-Za-z_]\w*)=(.*)$/.exec(word.value);

      if (!assignment) continue;
      const alias = word.hasExpansion && /^\$(?:\{([A-Za-z_]\w*)\}|([A-Za-z_]\w*))$/.exec(assignment[2]);
      const name = assignment[1];
      const sink = alias && sinks.get(alias[1] ?? alias[2]);

      if (sink) childSinks.set(name, sink);
      else childSinks.delete(name);
      const value = expand({ ...word, value: assignment[2] });

      if (value !== null) childScalars.set(name, value);
      else childScalars.delete(name);
    }

    for (const nested of commandSubstitutions(command)) mergeRunnerEffects(effects, runnerEnvironmentEffects(nested, context.environment, { scalars: childScalars, sinks: childSinks }));

    if (argv[0]?.value === "eval" && argv.slice(1).every(word => !word.hasExpansion)) mergeRunnerEffects(effects, runnerEnvironmentEffects(argv.slice(1).map(word => word.value).join(" "), environment, { scalars, sinks }));
    const commandOption = ["bash", "sh"].includes(path.posix.basename(argv[0]?.value ?? "")) ? argv.findIndex(word => /^-[eux]*c[eux]*$/.test(word.value)) : -1;

    if (commandOption !== -1 && argv[commandOption + 1] && !argv[commandOption + 1].hasExpansion) mergeRunnerEffects(effects, runnerEnvironmentEffects(argv[commandOption + 1].value, context.environment, { scalars: childScalars, sinks: childSinks }));

    if (["source", ".", "eval", "unset", "read"].includes(argv[0]?.value)) scalars.clear();

    if (BLOCK_CLOSERS.test(command.trim())) blockDepth = Math.max(0, blockDepth - 1);

    if (BLOCK_OPENERS.test(command.trim())) blockDepth++;
    conditional = operator === "&&" || operator === "||";
    output = operator === "|" || operator === "|&" ? emitted : [];
  }

  return effects;
}

function githubScriptEnvironmentEffects(script) {
  const effects = { environment: {}, pathChanged: false, unknown: false };
  const source = parseModule(script, "github-script.js");
  const bindings = new Map();

  const bind = (name, value) => {
    if (!bindings.has(name)) bindings.set(name, new Set());

    bindings.get(name).add(value);
  };

  const project = (value, key) => value ? ts.factory.createElementAccessExpression(value, key) : undefined;

  const bindPattern = (pattern, value) => {
    if (ts.isIdentifier(pattern)) bind(pattern.text, value);
    else if (ts.isParenthesizedExpression(pattern)) bindPattern(pattern.expression, value);
    else if (ts.isBindingElement(pattern)) {
      bindPattern(pattern.name, value);

      if (pattern.initializer) bindPattern(pattern.name, pattern.initializer);
    } else if (ts.isArrayBindingPattern(pattern) || ts.isArrayLiteralExpression(pattern)) {
      pattern.elements.forEach((element, index) => {
        if (!ts.isOmittedExpression(element)) bindPattern(element, project(value, ts.factory.createNumericLiteral(index)));
      });
    } else if (ts.isObjectBindingPattern(pattern)) {
      for (const element of pattern.elements) {
        const key = element.propertyName ?? element.name;

        bindPattern(element, project(value, ts.isComputedPropertyName(key) ? key.expression : ts.factory.createStringLiteral(accessedName(key))));
      }
    } else if (ts.isObjectLiteralExpression(pattern)) {
      for (const property of pattern.properties) {
        if (ts.isShorthandPropertyAssignment(property)) bindPattern(property.name, project(value, ts.factory.createStringLiteral(property.name.text)));
        else if (ts.isPropertyAssignment(property)) bindPattern(property.initializer, project(value, ts.isComputedPropertyName(property.name) ? property.name.expression : ts.factory.createStringLiteral(accessedName(property.name))));
      }
    } else if (isAssignment(pattern)) {
      bindPattern(pattern.left, value);
      bindPattern(pattern.left, pattern.right);
    }
  };

  const collect = node => {
    if (ts.isImportSpecifier(node)) bind(node.name.text, ts.factory.createIdentifier(node.propertyName?.text ?? node.name.text));

    if (ts.isVariableDeclaration(node) && node.initializer) bindPattern(node.name, node.initializer);

    if (isAssignment(node)) bindPattern(node.left, node.right);

    ts.forEachChild(node, collect);
  };

  const possible = (node, seen = new Set()) => {
    if (!node) return [undefined];

    if (ts.isParenthesizedExpression(node)) return possible(node.expression, seen);

    if (ts.isIdentifier(node) && bindings.has(node.text) && !seen.has(node.text)) {
      const next = new Set(seen).add(node.text);

      return [...bindings.get(node.text)].flatMap(value => possible(value, next));
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "bind") return possible(node.expression.expression, seen);

    if (ts.isConditionalExpression(node)) return possible(node.whenTrue, seen).concat(possible(node.whenFalse, seen));

    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const keys = ts.isPropertyAccessExpression(node) ? [node.name.text] : possible(node.argumentExpression, seen).map(key => key && (ts.isStringLiteral(key) || ts.isNumericLiteral(key)) ? key.text : undefined);

      return possible(node.expression, seen).flatMap(container => {
        if (container && ts.isArrayLiteralExpression(container)) {
          const candidates = keys.some(key => key === undefined) ? [...container.elements] : keys.map(key => container.elements[Number(key)]);

          return candidates.length ? candidates.flatMap(value => possible(value, seen)) : [undefined];
        }

        if (container && ts.isObjectLiteralExpression(container)) {
          const candidates = container.properties.filter(property => ts.isSpreadAssignment(property) || keys.some(key => key === undefined || accessedName(property.name) === key));

          return candidates.length ? candidates.flatMap(property => possible(ts.isPropertyAssignment(property) ? property.initializer : ts.isShorthandPropertyAssignment(property) ? property.name : ts.isSpreadAssignment(property) ? property.expression : undefined, seen)) : [undefined];
        }

        return keys.map(key => key === undefined || accessedName(node) === key ? node : project(node.expression, ts.factory.createStringLiteral(key)));
      });
    }

    return [node];
  };

  collect(source);

  const literal = node => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined;
  const exportedReferences = new Set();
  const calledExports = new Set();
  const writers = new Set(["appendFile", "appendFileSync", "writeFile", "writeFileSync", "write", "writeSync", "writev", "writevSync", "createWriteStream", "copyFile", "copyFileSync", "rename", "renameSync"]);
  const writerReferences = new Set();
  const calledWriters = new Set();
  let referencesEnvironmentFile = false;
  let unknownWriteTarget = false;

  const visit = node => {
    if (/^GITHUB_(?:ENV|PATH)$/.test(accessedName(node)) || (ts.isStringLiteral(node) && /^GITHUB_(?:ENV|PATH)$/.test(node.text))) referencesEnvironmentFile = true;

    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && writers.has(accessedName(node))) writerReferences.add(node);

    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && accessedName(node) === "addPath") effects.pathChanged = true;

    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && accessedName(node) === "exportVariable") exportedReferences.add(node);

    if (ts.isCallExpression(node)) {
      const callees = possible(node.expression);
      const names = new Set(callees.filter(Boolean).map(accessedName));

      if (names.has("open") || names.has("openSync")) {
        for (const target of possible(node.arguments[0])) {
          if (target && /^GITHUB_(?:ENV|PATH)$/.test(accessedName(target)) && possible(node.arguments[1]).some(mode => literal(mode) !== "r")) effects.unknown = true;
        }
      }

      if (names.has("addPath")) effects.pathChanged = true;

      if (names.has("exportVariable")) {
        for (const callee of callees) calledExports.add(callee);

        for (const key of possible(node.arguments[0])) {
          for (const value of possible(node.arguments[1])) {
            const name = literal(key);
            const data = literal(value);

            if (name !== undefined && data !== undefined && /^[A-Za-z_]\w*$/.test(name) && !/[\r\n]/.test(data)) mergeRunnerEffects(effects, { environment: { [name]: data } });
            else effects.unknown = true;
          }
        }
      }

      const writes = [...names].filter(name => writers.has(name));

      if (writes.length) for (const callee of callees) calledWriters.add(callee);

      for (const writer of writes) {
        const copied = /^(?:copyFile|rename)/.test(writer);

        for (const target of possible(node.arguments[copied ? 1 : 0])) {
          const file = target ? accessedName(target) : "";

          if (file !== "GITHUB_ENV" && file !== "GITHUB_PATH" && literal(target) === undefined) unknownWriteTarget = true;

          if (file === "GITHUB_PATH") effects.pathChanged = true;

          if (file === "GITHUB_ENV") {
            for (const value of possible(node.arguments[1])) {
              const data = copied || writer === "createWriteStream" ? undefined : literal(value);

              if (data === undefined) effects.unknown = true;
              else {
                for (const line of data.split(/\r?\n/).filter(Boolean)) {
                  const record = /^([A-Za-z_]\w*)=(.*)$/.exec(line);

                  if (record) mergeRunnerEffects(effects, { environment: { [record[1]]: record[2] } });
                  else effects.unknown = true;
                }
              }
            }
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(source);

  if ([...exportedReferences].some(node => !calledExports.has(node))) effects.unknown = true;

  if (referencesEnvironmentFile && (unknownWriteTarget || [...writerReferences].some(node => !calledWriters.has(node)))) effects.unknown = true;

  return effects;
}

export function standAloneHelpers(lock, compilerActionsAvailable = false) {
  const files = new Set();

  for (const job of Object.values(lock.jobs ?? {})) {
    const steps = job.steps ?? [];

    // Dependencies the next step may rely on: an install reaches a helper only through the
    // worlds where it ran and exited 0, so global and relocated installs, `||`/`|`/`&`/`|&`
    // branches, a `continue-on-error` install, and any helper written before the install stay
    // in the dependency-free set.
    let installed = false;
    let actionsDirectoryAvailable = compilerActionsAvailable;
    const persistent = { environment: {}, pathChanged: false, unknown: false };

    for (const step of steps) {
      const script = step.run ?? "";
      const runsAfterEarlierFailure = /(?:always|failure|cancelled)\(\)/.test(String(step.if ?? ""));
      const workingDirectory = step["working-directory"] ?? job.defaults?.run?.["working-directory"] ?? lock.defaults?.run?.["working-directory"] ?? ".";
      const shell = step.shell ?? job.defaults?.run?.shell ?? lock.defaults?.run?.shell;
      const runner = job["runs-on"];
      const defaultIsPosix = runner === undefined || /^(?:ubuntu|macos)-(?:latest|slim|[0-9]+(?:\.[0-9]+)?)(?:-(?:large|xlarge))?$/.test(String(runner));
      const modeledShell = shell === "bash" || shell === "sh" || (shell === undefined && defaultIsPosix);
      const canCreditInstall = modeledShell && ROOT_WORKING_DIRECTORIES.has(workingDirectory);
      const mayContinueOnError = step["continue-on-error"] !== undefined && step["continue-on-error"] !== false;
      const environment = { ...lock.env, ...job.env, ...persistent.environment, ...step.env };

      if (persistent.unknown) throw new Error("unprovable persistent runner environment; use literal single-line environment records");
      const startupUncertain = ["NODE_OPTIONS", "BASH_ENV", "ENV"].some(name => Object.hasOwn(persistent.environment, name) && String(environment[name] ?? "").trim() !== "");

      if (startupUncertain) installed = false;
      let environmentMutated = startupUncertain || Object.keys(persistent.environment).some(name => /^(?:PATH|NODE_ENV|npm_config_.*)$/i.test(name) && environment[name] === "${unprovable}");
      let installerShadowed = persistent.pathChanged || Object.hasOwn(environment, "PATH") || Object.entries(environment).some(([name, value]) => (/^(?:BASH_ENV|ENV)$/.test(name) && String(value).trim() !== "") || /^BASH_FUNC_(?:bun|npm)%%$/.test(name));

      if (step.uses?.startsWith("github/gh-aw-actions/setup@") && step.with?.destination === "${{ runner.temp }}/gh-aw/actions" && step.if === undefined && !mayContinueOnError) actionsDirectoryAvailable = true;
      let stepCompilerActionsAvailable = actionsDirectoryAvailable;

      if (step.uses?.startsWith("actions/github-script@") && (!installed || runsAfterEarlierFailure)) {
        rejectNodeOptions(environment);

        for (const file of githubScriptHelpers(step.with?.script ?? "", environment, actionsDirectoryAvailable)) files.add(file);
      }

      let group = [world(installed, true), ...(runsAfterEarlierFailure ? [world(false, true)] : [])];
      let nextOn = "always";
      let dead = [];
      let errexit = modeledShell;
      let relocated = Object.entries(environment).some(([name, value]) => /^(?:BASH_ENV|ENV)$/.test(name) && String(value).trim() !== "");
      let shortCircuited = false;
      let blockDepth = 0;
      const hashedExecutables = new Set();
      const definedExecutables = new Set();
      const reservedOutputs = new Set(["GITHUB_ENV", "GITHUB_PATH", "GITHUB_OUTPUT", "GITHUB_STATE", "GITHUB_STEP_SUMMARY", "RUNNER_TEMP", "RUNNER_TOOL_CACHE"]);

      for (const { command, operator, heredocs } of splitCommands(script)) {
        const text = command.trim();

        if (!text) continue;

        const parsedWords = words(text);
        const argv = parsedWords.map(word => word.value);
        const context = commandContext(parsedWords, environment);
        const commandPosition = context.index;
        const effectiveArgv = argv.slice(commandPosition);
        const commandName = context.introspection ? undefined : effectiveArgv[0];
        const firstCommand = parsedWords.findIndex(word => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word.value));
        const declaration = ENVIRONMENT_DECLARATIONS.has(commandName);
        const environmentWords = declaration ? parsedWords.slice(commandPosition + 1) : parsedWords.slice(0, firstCommand === -1 ? parsedWords.length : firstCommand);
        const variableTargets = shellVariableTargets(parsedWords, context);
        const definition = /^(?:function\s+([A-Za-z_]\w*)|([A-Za-z_]\w*)\s*\(\s*\))/.exec(text);
        const identityUncertain = hashedExecutables.has(commandName) || definedExecutables.has(commandName) || definedExecutables.has("*");

        if (definition && group.some(installedIn)) definedExecutables.add(definition[1] ?? definition[2]);

        if (commandName === "alias" && group.some(installedIn)) {
          for (const word of parsedWords.slice(commandPosition + 1)) {
            if (word.hasExpansion) definedExecutables.add("*");
            else if (word.value.includes("=")) definedExecutables.add(word.value.split("=")[0]);
          }
        }

        if (commandName === "hash") {
          if (hashOverrides(parsedWords.slice(commandPosition + 1))) hashedExecutables.add(effectiveArgv.at(-1));
          else if (effectiveArgv.includes("-r")) hashedExecutables.clear();
        }

        if (variableTargets === null) {
          environmentMutated = true;
          reservedOutputs.clear();
        } else {
          if (variableTargets.some(name => /^(?:PATH|NODE_OPTIONS|NODE_ENV|BASH_ENV|ENV|npm_config_.*)$/i.test(name))) environmentMutated = true;

          for (const name of variableTargets) reservedOutputs.delete(name);
        }

        if (commandName === "eval") environmentMutated = true;

        if (["eval", "source", "."].includes(commandName) || environmentWords.some(word => word.value.startsWith('RUNNER_TEMP=')) ||
            (commandName === "unset" && effectiveArgv.slice(1).some(value => value === "RUNNER_TEMP"))) stepCompilerActionsAvailable = false;

        if (["source", ".", "alias"].includes(commandName) || /^(?:(?:bun|npm)\s*\(\s*\)|function\s+(?:bun|npm)(?:\s|\())/.test(text)) installerShadowed = true;

        if (commandName === "hash" && hashOverrides(parsedWords.slice(commandPosition + 1))) installerShadowed = true;

        for (const word of environmentWords) {
          reservedOutputs.delete(word.value.split("=")[0]);

          if (word.value.startsWith("PATH=") && !(word.hasExpansion && /^PATH=\$(?:PATH|\{PATH\})(?::\/[A-Za-z0-9_./-]+)+$/.test(word.value))) installerShadowed = true;

          const assignment = /^(NODE_OPTIONS|NODE_ENV|BASH_ENV|ENV|npm_config_[A-Za-z0-9_]+)=(.*)$/i.exec(word.value);

          if (!assignment) continue;

          environmentMutated = true;
        }

        if (commandName === "set") errexit = parsedWords.slice(commandPosition + 1).some(word => word.hasExpansion) ? false : setErrexit(effectiveArgv, errexit);

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
          if (identityUncertain) throw new Error(`unprovable executable identity: ${commandName}; restore the native command before install-free execution`);

          for (const word of environmentWords) {
            if (declaration && word.hasExpansion && !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word.value)) throw new Error(`unprovable shell environment mutation: ${word.value}; declare literal variable names`);

            if (word.value.startsWith("NODE_OPTIONS=") && (word.hasExpansion || word.value.slice("NODE_OPTIONS=".length).trim() !== "")) rejectNodeOptions({ NODE_OPTIONS: word.value });
          }

          for (const [index, scan] of [text].concat(heredocs).entries()) {
            for (const reference of helperReferences(scan, environment, index > 0, stepCompilerActionsAvailable)) {
              if (relocated || !ROOT_WORKING_DIRECTORIES.has(workingDirectory)) throw new Error(`unprovable helper working directory: ${workingDirectory}; invoke install-free helpers from the checkout root without directory-stack mutations`);

              files.add(reference.replace(/^upstream-sync-policy\//, ""));
            }
          }
        }

        // A `cd` moves the working directory, so no later install can be credited with
        // populating the checkout's `node_modules`: the runtime may load a different tree.
        if (["cd", "pushd", "popd", "source", "."].includes(commandName) || (commandName === "eval" && shellRelocates(effectiveArgv.slice(1).join(" "), context.environment))) relocated = true;

        // Any command can fail, and an install installs only in the worlds where it exits 0 —
        // except in a pipeline or background job, where what follows sees the tree as it was.
        const installs = canCreditInstall && context.launchesExternal && !context.introspection && !context.negated && parsedWords.every(word => !word.hasExpansion) && INSTALLERS.has(effectiveArgv[0]) && INSTALL_COMMANDS.has(effectiveArgv[1]) &&
          !installsElsewhere(effectiveArgv, context.environment) && !omitsDevDependencies(effectiveArgv, context.environment) && !environmentMutated && !installerShadowed &&
          !installsNothing(effectiveArgv, context.environment) && !relocated && !insideBlock && !PIPELINE.has(operator);

        // A command with a certain exit status opens only the worlds it can reach.
        const constantOk = constantStatus(text);
        const invalidatesDependencies = dependencyTreeChanged(parsedWords, context, ROOT_WORKING_DIRECTORIES.has(workingDirectory) && !relocated, [text, ...heredocs].join("\n"), reservedOutputs, stepCompilerActionsAvailable);

        const outcomes = executing.flatMap(key => {
          // An install lands only where the command exits 0, so the failing world keeps the
          // dependency tree exactly as it found it.
          const succeeded = world((installedIn(key) && (!invalidatesDependencies || installs)) || (installs && step.if === undefined), true);
          const failed = world(installedIn(key) && !invalidatesDependencies, false);

          return constantOk === null ? [succeeded, failed] : [constantOk ? succeeded : failed];
        });

        const carried = group.filter(key => !executing.includes(key));

        group = [...new Set(outcomes.concat(carried))];

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
            dead = [...new Set(group.filter(key => !exitedOk(key)).concat(dead))];
            group = group.filter(exitedOk);
          }

          shortCircuited = false;
          nextOn = "always";
        }
      }

      // With no world left alive, `every` would vacuously credit an install, so require one.
      const survivors = group.concat(dead).filter(key => exitedOk(key) || mayContinueOnError);

      installed = survivors.length > 0 && survivors.every(installedIn);
      mergeRunnerEffects(persistent, runnerEnvironmentEffects(script, environment));

      if (step.uses?.startsWith("actions/github-script@")) mergeRunnerEffects(persistent, githubScriptEnvironmentEffects(step.with?.script ?? ""));
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
