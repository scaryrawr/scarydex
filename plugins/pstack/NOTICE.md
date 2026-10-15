# pstack attribution and port boundary

Adapted from [pstack](https://github.com/cursor/plugins/tree/main/pstack) by
Lauren Tan, distributed under the included [MIT license](LICENSE).
ScaryDex starts from ScaryPilot’s reviewed pstack 0.15.4 skills and deterministic
helpers, integrated from Cursor repository commit
`b0b9c7a0baf8b6aa1d00bf77d4101e577d4ba411`.
The original Cursor 0.15.5 tree at
`c47b12849e43f18d5c374c7069c744cc55b0ea00` was inspected for comparison, not
silently imported as a new baseline. Repository-wide provenance is recorded in
`port-provenance.json` at the marketplace root.

The portable update to pstack 0.15.25 is pinned to Cursor commit
[`6ce45c59b9301a638c1fe1a7b8dc2a82b650898f`](https://github.com/cursor/plugins/commit/6ce45c59b9301a638c1fe1a7b8dc2a82b650898f).
Its reviewed changes and dispositions are appended in `upstream-sync.json`;
the original provenance baseline remains immutable.

Codex-specific changes:

- Native `.codex-plugin` metadata and Codex skill discovery, without copying
  Cursor's root manifest or host-only frontmatter.
- Project skills under `.agents/skills`, explicit pstack model preferences in
  Codex home, and scoped app history instead of harness transcript scanning.
- Codex subagent workflows with inherited models rather than Copilot Task,
  dynamic workflows, or Cursor model slugs and cloud flags. The receiving chat
  owns the workflow; delegates receive the installed mode path.
- Agent behavior retained as linked prompt references, not unsupported agent
  registration manifests.
- Local scripts and artifacts replace Copilot capabilities, status, handoff,
  receipt, worktree, and swarm extension tool dependencies.
- Preserved contract/plan validation, decision logs, worktree audit, PR watcher,
  and orchestration scripts. The latter two ship as bundled Node helpers
  instead of installing dependencies into the plugin cache.
- GitHub PR base-chain orchestration discovery replaces its Graphite dependency.
  Origin's host-specific adapter is excluded. Frontier order, SHA and generation
  safeguards remain in place.
- Read-only ketchup catch-ups use existing visual artifacts or supported diagrams,
  not an assumed visualize tool or unsolicited media capture.
- Explicit approval and scope boundaries for external writes and deletions.

The `deslop` skill was adapted by ScaryPilot from Cursor’s `cursor-team-kit` and
retains that attribution. Cursor-only `make-bot-ui`, Benny automation pack,
logos, and Copilot native extensions are not included. GitHub Copilot review-bot
recognition in the PR watcher remains because it is platform data, not a runtime
dependency. Existing ScaryPilot sync tooling is not shipped: its ownership and
extension checks do not describe this port.
