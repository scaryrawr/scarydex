# pstack for Codex

Rigorous workflows for understanding, design, implementation, review, and proof.
Start with `poteto-mode`, or invoke focused skills such as `how`, `architect`,
`swarm`, `interrogate`, `tdd`, `recall`, and `show-me-your-work`.

## Install and prerequisites

Install `pstack@scarydex` from the ScaryDex marketplace, then start a new session.
Ordinary skills need only Codex’s existing tools. Model overrides, subagents,
history access, and computer use are capability-dependent. See
[Codex runtime mapping](references/codex-runtime.md) before using those workflows.

Node.js 22.18+ runs the self-contained CLI helpers and validators. Git is needed
for repository work; `gh` and authenticated GitHub access are required for PR
watching. Installed users do not need Bun, npm dependencies, or writes into the
plugin cache. Bun is only the optional development test runner for the retained
TypeScript sources; its script-local `.npmrc` selects the required proxy feed.
Graphite is optional and must already be available before stack-specific steps.

## Helpers

Resolve these paths from the installed plugin root:

- `skills/poteto-mode/scripts/check-plan.mjs`: read-only Markdown plan validation.
- `skills/pstack-schema-validate/scripts/validate.mjs`: snapshot, receipt, handoff,
  and plan contracts. Use its help/usage contract, not a general JSON validator.
- `skills/show-me-your-work/scripts/log.sh`: durable decision-trail entries.
- `skills/poteto-mode/scripts/worktree-audit.sh`: read-only POSIX worktree audit.
- `skills/poteto-mode/scripts/orch/orch.mjs`: optional durable program store.
- `skills/poteto-mode/scripts/watch-pr/watch-pr.mjs`: optional GitHub PR watcher.

Codex custom-agent behavior is retained in `references/agents/` as prompts.
No status, swarm, capabilities, or handoff extension tool is registered. Use
available Codex subagents and local artifacts instead. A playbook never grants
permission to commit, publish, merge, delete state, or schedule recurring work.

## Attribution

See [NOTICE.md](NOTICE.md) and [LICENSE](LICENSE). The integrated baseline is
pstack 0.15.4 via ScaryPilot; the original 0.15.5 source was inspected for
comparison, not silently claimed as integrated. Content is updated through
ScaryPilot's pstack 0.15.13 sync (ScaryPilot commit
`ce2b8cbcaa4f29a35f47adbb15adc84f07d6a4c1`, covering Cursor commits
`b0b9c7a..77526ff`). Cursor-only extensions, native workflow tools, hosted
agents, Grok Bot features, and Cursor guide pages stay outside the port; each
is dispositioned in `upstream-sync.json`.
