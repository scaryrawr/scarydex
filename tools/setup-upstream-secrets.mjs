import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY = "github.com/scaryrawr/scarydex";
const SECRETS = [
  {
    name: "COPILOT_GITHUB_TOKEN",
    instructions: "Use a separate fine-grained PAT with account permission Copilot Requests: Read, Copilot entitlement, and access to gpt-5.3-codex. No repository write permissions.",
  },
  {
    name: "UPSTREAM_SYNC_PR_TOKEN",
    instructions: "Use a fine-grained PAT owned by scaryrawr, restricted to scaryrawr/scarydex, with Contents: Read and write and Pull requests: Read and write. No other write permissions.",
  },
];

function runGh(args, stdio = "pipe") {
  const result = spawnSync("gh", args, { encoding: "utf8", stdio });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`gh ${args.join(" ")} failed${result.signal ? ` (${result.signal})` : ""}${result.stderr?.trim() ? `: ${result.stderr.trim()}` : ""}`);
  }
  return result.stdout?.trim() ?? "";
}

function secretNames(gh) {
  const entries = JSON.parse(gh(["secret", "list", "--repo", REPOSITORY, "--app", "actions", "--json", "name"]));
  if (!Array.isArray(entries) || entries.some(entry => typeof entry?.name !== "string" || !entry.name)) {
    throw new Error("Invalid repository secret metadata returned by gh");
  }
  return new Set(entries.map(entry => entry.name));
}

export function setupUpstreamSecrets({
  check = false,
  interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY),
  gh = runGh,
  log = console.log,
} = {}) {
  log(`Repository: ${REPOSITORY}. The weekly schedule remains enabled.`);
  gh(["auth", "status", "--active", "--hostname", "github.com"]);
  const existing = secretNames(gh);
  const missing = SECRETS.filter(secret => !existing.has(secret.name));
  for (const secret of SECRETS) log(`${secret.name}: ${existing.has(secret.name) ? "present (unchanged)" : "missing"}`);
  if (missing.length && check) {
    throw new Error(`Missing Actions secrets: ${missing.map(secret => secret.name).join(", ")}. Run node tools/setup-upstream-secrets.mjs in an interactive terminal.`);
  }
  if (missing.length) {
    if (!interactive || process.env.GH_PROMPT_DISABLED) {
      throw new Error("Setup requires an interactive terminal with GH_PROMPT_DISABLED unset. Do not pipe tokens or pass them as arguments.");
    }
    log("Create two separate fine-grained PATs at https://github.com/settings/personal-access-tokens/new with an explicit expiration.");
    log("Paste each token only into gh's hidden prompt below. The helper never receives token values.");
    log("If the publication PAT has another owner, set UPSTREAM_SYNC_PR_AUTHOR to that login; see docs/upstream-sync.md.");
    for (const secret of missing) {
      log(`\n${secret.name}: ${secret.instructions}`);
      gh(["secret", "set", secret.name, "--repo", REPOSITORY, "--app", "actions"], "inherit");
    }
    const configured = secretNames(gh);
    const remaining = SECRETS.filter(secret => !configured.has(secret.name));
    if (remaining.length) throw new Error(`Secrets still missing after setup: ${remaining.map(secret => secret.name).join(", ")}`);
  }
  log("Both required Actions secret names are present. This does not validate token permissions, expiration, Copilot entitlement, or model availability.");
  log("No workflow was dispatched. Existing secrets were not rotated.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args.length === 1 && !["--check", "--help"].includes(args[0]))) {
      throw new Error("Usage: node tools/setup-upstream-secrets.mjs [--check | --help]");
    }
    if (args[0] === "--help") {
      console.log("Usage: node tools/setup-upstream-secrets.mjs [--check | --help]\nRequires Node.js 22.18+ and gh authenticated to github.com with permission to manage scaryrawr/scarydex Actions secrets.\nDefault: securely prompt with gh for missing secrets, preserving existing secrets.\n--check: inspect secret names without changing GitHub state.");
    } else {
      setupUpstreamSecrets({ check: args[0] === "--check" });
    }
  } catch (error) {
    console.error(`setup-upstream-secrets: ${error.message}`);
    process.exitCode = 1;
  }
}
