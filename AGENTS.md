# ScaryDex repository guide

ScaryDex is a Codex marketplace. The published inventory is
`.agents/plugins/marketplace.json`; keep it and the root README in sync.
Ship only pstack, anti-slop, better-init, digivolution, omlx-media, and
screen-record. Plugin roots are `plugins/<name>/`, with native manifests at
`.codex-plugin/plugin.json` and skills at `skills/<name>/SKILL.md`.

Prefer skills and deterministic scripts over host-specific extensions. Do not
register Copilot SDK extensions, Azure integrations, or browser servers. Agent
behavior lives in linked prompt references unless a supported Codex agent
registration is deliberately introduced. Use `.agents/skills` for generated
project skills and `AGENTS.md` for portable repository guidance.

Validation requires Node.js 22.18+:

- `npm ci --ignore-scripts` uses the repository’s packagefeedproxy `.npmrc`.
- `npm run build` regenerates the bundled OMLX/pstack helpers and hash manifests.
- `npm run check` validates inventory, manifests, skill YAML, local links, hooks,
  and bundle freshness.
- `npm run typecheck` checks media source and domain tests.
- `npm test` runs the offline regression suite, including parser-backed lint.
- Optional pstack source tests use Bun; from their script directory, run
  `bun install --frozen-lockfile` then `bun test orch watch-pr`.

The OMLX and pstack CLI helpers are checked in so installed users need no npm
dependencies or Bun. After changing their source, build inputs, or the root
lockfile, rebuild and include the `.mjs` bundles and `bundle-manifest.json`. Runtime Node helpers
must use explicit `.mjs` files. Imported Python scripts use optional `uv`.

Codex hooks use PascalCase lifecycle names, snake_case event payload fields,
and event-specific JSON output. `apply_patch` input is `tool_input.command`.
Hook matchers are regexes; anchor them and test unrelated tool names. Hooks must
not silently install dependencies. Anti-Slop’s explicit setup helper uses the
required proxy feed and the plugin data directory.

Preserve upstream attribution and the versioned port boundary in
`port-provenance.json`. Bump affected plugin versions for shipped changes.
Use isolated temporary Codex homes for installation tests; do not alter the
user’s installed plugins or hook trust. Do not capture the screen, generate
real media, or mutate GitHub state during tests without explicit authorization.
