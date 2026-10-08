# ScaryDex repository guide

ScaryDex is a Codex marketplace. The published inventory is
`.agents/plugins/marketplace.json`; keep it and the root README in sync.
Ship only pstack, anti-slop, better-init, digivolution, omlx-media,
screen-record, decide, and riverkids. Plugin roots are `plugins/<name>/`, with native
manifests at `.codex-plugin/plugin.json` and skills at
`plugins/<name>/skills/<skill-name>/SKILL.md`.

Prefer skills and deterministic scripts over host-specific extensions. Do not
register Copilot SDK extensions, Azure integrations, or browser servers. Agent
behavior lives in linked prompt references unless a supported Codex agent
registration is deliberately introduced. Use `.agents/skills` for generated
project skills and `AGENTS.md` for portable repository guidance.

Validation requires Bun (the root `.npmrc` is configured with the packagefeedproxy
registry, so `bun install --frozen-lockfile` works offline):

- `bun install --frozen-lockfile` installs root devDependencies from `bun.lock`.
- `bun run build` regenerates the bundled OMLX/pstack helpers and hash manifests.
- `bun run check` validates inventory, manifests, skill YAML, local links, hooks,
  and bundle freshness.
- `bun run lint` runs Oxlint 1.83.0 with the anti-slop plugin's rules over the
  code maintained in this repository (`tools/`, `tests/`, and `plugins/omlx-media/`).
  Ported plugin content (`plugins/pstack`, `plugins/anti-slop`) and dependency-free
  shipped skill runtimes stay verbatim upstream under the port boundary; generated
  CLI bundles are linted through their sources. Schema validation uses TypeBox.
- `bun run typecheck` runs `tsc --noEmit` against `plugins/omlx-media/src/**/*.ts`
  and `plugins/omlx-media/tests/**/*.ts`.
- `bun test` runs the offline regression suite; bun auto-discovers `.mjs` and `.ts`
  test files and strips types from `.ts` files. A green run is 192 tests across 17 files.
- Optional pstack source tests live in `plugins/pstack/skills/poteto-mode/scripts/`;
  from that directory, run `bun install --frozen-lockfile` then `bun test orch watch-pr`.

Run `bun test` unsandboxed (elevated permissions). It shells out to `git` in
temporary repositories, and a filesystem sandbox kills those children: the symptom
is `actual: null` assertions followed by 5000ms test timeouts, typically 27 failures
in `tests/upstream-sync.test.mjs` and the pstack orch/store tests. Those are
environment noise, not regressions. `bun install`, `build`, `check`, `lint`, and
`typecheck` succeed inside the sandbox; only the git-spawning tests need escalation.

The OMLX and pstack CLI helpers are checked in so installed users need no npm
dependencies or Bun. After changing their source, build inputs, or the root
lockfile, rebuild and include the `.mjs` bundles and `bundle-manifest.json`.
Runtime Node helpers must use explicit `.mjs` files. Imported Python scripts use
optional `uv`.

`tools/upstream-sync.mjs` is the trusted publication policy helper: the workflow's
`pre_activation` duplicate check and `safe_outputs` verify gate execute it from bare
checkouts that never install dependencies, so it imports only `node:` builtins and
relative paths. `bun run check` derives those install-free jobs from
`upstream-sync.lock.yml`, walks the transitive relative-import closure of every
`.mjs` entrypoint they execute, including workspace imports in `actions/github-script`.
JavaScript action scripts are parsed separately from shell `run` steps. Unprovable
import targets fail the guard instead of silently omitting an entrypoint. Only
unconditional install steps in the checkout root establish dependency availability,
including inherited working-directory defaults. Worker loaders are refused because
their entrypoints are outside the static import graph.
It parses each module with the TypeScript compiler rather than matching regexes,
so trivia between tokens (`import /* c */ "pkg"`) counts
and a package name inside a comment or string does not. Every target lands in one of
three buckets: provable literal specifiers, `computed` targets (identifiers,
concatenation, conditionals, member access, call results, interpolated templates), and
`requires` (any `require`/`createRequire` reference, which also refuses the aliasing
shape `const r = require; r("pkg")`). Only `node:` builtins and relative literals
pass; anything the guard cannot prove is a finding, including sources the parser
rejects, because an unparsed module proves nothing. Install-free helpers therefore use
static `import` with literal specifiers only.
TypeBox belongs to code that runs after `bun install`
(`tools/check-marketplace.mjs`, tests) and to sources that esbuild inlines into the
shipped bundles.

Codex hooks use PascalCase lifecycle names, snake_case event payload fields,
and event-specific JSON output. `apply_patch` input is `tool_input.command`.
Hook matchers are regexes; anchor them and test unrelated tool names. Hooks must
not silently install dependencies. Anti-Slop's explicit setup helper uses the
required proxy feed and the plugin data directory.

Preserve upstream attribution and the versioned port boundary in
`port-provenance.json`. Bump affected plugin versions for shipped changes.
Use isolated temporary Codex homes for installation tests; do not alter the
user's installed plugins or hook trust. Do not capture the screen, generate
real media, or mutate GitHub state during tests without explicit authorization.
