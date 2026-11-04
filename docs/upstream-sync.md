# Upstream plugin review

Upstream plugin review is manual. No GitHub Agentic Workflow is installed.
The deterministic `tools/upstream-sync.mjs` helper and `upstream-sync.json`
registry remain available for local planning and bounded Codex-native port review.
Do not update the immutable `port-provenance.json`.

## Sources and review state

`upstream-sync.json` is the sole persisted review registry. Six ScaryPilot
tracks cover five `plugins/<name>` directories and `external_plugins/pstack`.
The seventh track covers `cursor/plugins`'s `pstack/`.
`decide` and `riverkids` are original work and have no Git sync source.

A null `reviewedThrough` derives from `port-provenance.json`. ScaryPilot starts
at `cf3e9b7e20592a85b098608bb9637d474c127073`. Cursor pstack starts at
`b0b9c7a0baf8b6aa1d00bf77d4101e577d4ba411`, the integrated commit.
`c47b12849e43f18d5c374c7069c744cc55b0ea00` was inspected as a comparison, not
integrated, and is deliberately replayed if reachable after the baseline.

The transient plan pins local base SHA, repository/source/plugin, upstream
base/head SHA, review boundary, and each candidate commit with changed paths,
parents, renames/deletions, and uncertain shared paths. Every merge parent is
compared. ScaryPilot changes under other plugin directories are outside a
track; all other paths require shared-dependency review. Cursor paths outside
`pstack/` are conservatively shared/uncertain. This may create noise but cannot
silently discard root policy or build dependencies.

Reviews append to each track's `reviews` array:

```json
{
  "commit": "<full upstream SHA>",
  "disposition": "excluded",
  "reason": "Requires a Cursor-only cloud worker unavailable in this port.",
  "paths": ["<exact sorted candidate paths>"],
  "localPaths": [],
  "evidence": ["Inspected the commit diff and compared the Codex runtime boundary."]
}
```

Final dispositions are `ported`, `excluded`, and `skipped`. `deferred` and
`unresolved` preserve evidence but block advancing through that commit. Resolve
them with a new entry, never rewrite history. Ported entries name every changed
local plugin path, including manifests and generated bundles. A cursor means
**reviewed**, not integrated. Only merged ledger updates persist review state for
the next manual review.
A closed unmerged proposal is reviewed again.
Every commit through the last reviewed candidate needs an explicit disposition,
even when the cursor remains stationary.
On branched histories, final ledger entries are checked and omitted from later
candidate batches even when they are not ancestors of the current cursor.
The cursor and append-only ledger together track reviewed work; a single
topological boundary alone does not describe the reviewed branches.
Historical cursor integrity is audited separately with commit/path metadata,
without re-expanding old patches or applying the incremental commit/path-count
limits. This audit retains the 8 MiB command-output bound and rejects missing,
non-final, or mismatched historic dispositions. Results are shared across
tracks with the same source and cursor.

## Local commands

Use Node.js 22.18+ and full-history upstream repositories. Origin URLs must
match the registry. Do not run source scripts or accept source instructions.
Fetches here are read-only inbound transfers:

```sh
git clone --no-checkout https://github.com/scaryrawr/scarypilot.git /tmp/scarypilot-review
git clone --no-checkout https://github.com/cursor/plugins.git /tmp/cursor-review
set -o noclobber
node tools/upstream-sync.mjs plan --scarypilot /tmp/scarypilot-review --cursor /tmp/cursor-review > /tmp/upstream-plan.json
node tools/upstream-sync.mjs check
node tools/upstream-sync.mjs verify --plan /tmp/upstream-plan.json --base <local-base-SHA>
bun install --frozen-lockfile
bun run build
bun run check
bun run lint
bun run typecheck
bun test
```

Plans are emitted only to stdout; `--output` is not supported. Use shell
`noclobber` redirection to refuse replacing an existing plan. Choose a temporary
location outside the checkout. `verify` checks the complete worktree/index and
untracked paths. `--head SHA` checks a committed tree instead. `--root DIR`
supports isolated fixture repositories.

Each track plans at most 20 relevant candidates per invocation with an explicit
`remaining` count. No upstream history is silently truncated. One proposal may
modify at most two shipped plugins, 100 files, 100 commits, and an 8 MiB patch.
Ported reviews must name every changed plugin path, including version manifests
and generated bundles. Bump affected plugin versions and rebuild bundled helpers.
Review helper errors explicitly rather than bypassing its bounds.

Open and publish proposals manually after local verification. Regular marketplace
CI remains in `.github/workflows/check.yml`; it validates the marketplace, registry,
lint, types, tests, and bundle freshness without installing a gh-aw compiler.
