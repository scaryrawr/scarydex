# Anti-Slop for Codex

TypeScript/JavaScript design guidance, a dependency-free advisory scanner, and
Codex edit hooks using the source plugin’s bundled Oxlint rules.

## Install and prerequisites

Install `anti-slop@scarydex`, then start a new session. Node.js 22.18+ is required.
Review and trust the plugin hooks separately. The skill and heuristic scanner
work without hook trust or Oxlint.

PreToolUse rejects newly introduced chained assertions and unknown aliases in
`apply_patch` changes. It does not block shell-written files. PostToolUse reports
parser-backed findings only on changed lines; it is advisory, not a security
boundary or a guarantee of full repository coverage. Generated outputs and
symlink/outside-workspace targets are excluded.

## Explicit Oxlint setup

The hooks never download packages. Once per installed plugin data location, with
user approval, run the bundled helper:

```sh
PLUGIN_DATA="<plugin-data-directory>" node "<plugin-root>/hooks/setup.mjs"
```

Use the same `PLUGIN_DATA` directory Codex supplies to this plugin’s hooks. If
omitted, the helper uses `$CODEX_HOME/cache/scarydex`, or
`~/.codex/cache/scarydex`. Hook context reports the required setup location when
missing. Setup installs pinned Oxlint 1.83.0 through the required packagefeedproxy
npm feed without repository or global configuration changes. Without setup,
the post-hook explicitly reports that parser checks could not run.

## Manual use

Ask Codex to use `anti-slop` on a diff, or run the read-only heuristic scanner:

```sh
node "<skill-directory>/scripts/scan.mjs" <workspace-path> --json
```

Heuristic candidates require review and do not replace parser-backed lint.
Read [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for rule provenance/license.
