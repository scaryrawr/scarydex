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
  test files and strips types from `.ts` files. A green run is 238 tests across 17 files.
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
including inherited working-directory defaults and npm production/omit-dev
environment settings, including no-op dry-run and package-lock-only modes.
Shell helper discovery includes process substitutions and
path-qualified Node interpreters. Lockfile-only installs never establish dependencies.
Custom or unresolved shell invocations cannot establish install proof; unresolved
`continue-on-error` values are treated as potentially tolerating failure. Relative
module specifiers must start with `./` or `../`, not merely a dot. Every module path
component below the checkout root must be free of symlinks. Install predicates use
parsed shell words so quoted options cannot bypass the proof. Word metadata preserves
whether a value contains a real shell expansion. Computed install arguments cannot
establish dependencies, and unprovable Node entrypoints fail closed. Node preload,
loader, and require option modules are validated too: local literal modules join the
closure, while bare and computed preloads are rejected. Worker loaders and
`node:module` registration are refused because they can start module graphs
outside the verified static import closure.
`process.getBuiltinModule` references are refused too, including aliases;
load builtins through literal static imports.
ANSI-C and localized shell quotes cannot establish install proof. Computed
executables and nonempty `NODE_OPTIONS` are refused in install-free commands;
put Node options on the literal command line instead. Inherited npm global,
location, and prefix settings cannot prove a checkout-local installation.
Shell mutations of dependency-related environment variables, including
`export`, `declare`, `typeset`, `readonly`, and `local` assignments, also
invalidate subsequent install proof within that step.
Computed declaration names are refused. Parenthesized blocks cannot establish
install proof; literal nested `bash`/`sh -c` scripts are scanned recursively,
without crediting nested installs. Computed shell payloads fail closed.
Literal shell `eval` payloads are scanned through the same guard, and invalidate
later install proof because they can mutate the calling shell's environment.
Installer function redefinitions, aliases, sourced state, and inherited shell
startup configuration cannot establish install proof. GitHub Script `require`
targets are proven from literal paths and immutable workspace-path expressions;
unknown targets and loader aliases fail closed. Compiler action scripts in
proven runner-temp directories remain outside the repository module graph.
Command wrappers use one shared parser, including literal `env` unset/clear
options. Unsupported wrapper options fail closed. Wrapped `set` controls
errexit; all `cd`/`pushd`/`popd` forms invalidate install proof. Install-free
helpers must run from the checkout root without directory-stack mutations,
so relative paths cannot accidentally validate different files.
Unknown Node options, including environment-file loaders, fail closed instead
of hiding a later entrypoint behind an option value. GitHub Script reuses the
module scanner's dynamic-code/alias boundary for `eval` and `Function`.
Constructor member access is also dynamic code, while ordinary class constructor
definitions remain supported. Workspace templates use the same environment and
immutable-binding proof as require targets, including parameter/destructuring
shadowing. Literal eval propagates directory changes through nested eval; sourced
state and shell startup configuration make the parent directory unprovable.
Computed-code alias taint propagates through nested binding/assignment patterns
and aggregates to a fixed point. Unmodeled command wrappers that forward Node
fail closed; data/lookup commands and scanned substitutions remain supported.
Trusted process/environment and native path objects cannot escape to aliases or
mutators; compound/delete writes invalidate their proof, and all native path
bindings share one mutation boundary.
Install-free Node commands need an explicit module entrypoint: eval/print and
implicit stdin are refused, while help/version remain informational. PATH
overrides and replacement/prepend assignments cannot prove installer identity;
only literal absolute-directory appends to unchanged PATH preserve that proof.
Upstream paths reject forbidden characters anywhere, including at the end.
Computed property extraction taints aliases in bindings, assignments and
parameters. Install-free shell steps may query aliases but cannot define them;
alias expansion can inject preloads or hide the actual helper executable.
Aggregate taint also follows member calls, while ordinary scalar indexed reads
remain supported. Module-context parsing models top-level await as Node does.
Code-bearing global reads and containers retain their taint through calls,
constructors, await, function returns/yields and result-valued expressions.
Ordinary data lookups do not taint their transformation results as code.
Runner-temp require exemptions are restricted to the compiler actions directory
after its unconditional setup step. Dependency-tree removals, moves and local
package mutations invalidate install credit; a later valid install restores it.
Install classification uses the same effective command/environment context as
helper discovery. Supported env/command/exec launches can prove installation;
builtin-only and introspection forms cannot launch an external installer.
Negated installers cannot establish install proof, and Bun `--cwd` relocation
options cannot prove checkout-root dependency availability.
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
