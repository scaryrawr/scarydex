# Codex runtime mapping

Read this when a pstack workflow needs delegation, history, models, or durable
execution. These are capability-dependent, not installation promises.

## Delegation

Use the Codex subagent tools actually exposed in the session. Depending on the
client they can be named `spawn_agent`, `send_input`, `wait_agent`, and
`close_agent`. Do not send Copilot `Task` arguments, Cursor `subagent_type`,
`mode`, `environment`, `run_in_background`, or cloud-base-branch flags.
Pass the goal, scope, file pointers, verification, and report contract in the
prompt. Where a tool supports an agent role, use only advertised values.
Custom agent behavior is supplied as linked prompt references unless the user
explicitly installs a supported Codex custom-agent configuration.

Omit model overrides by default. Honor an explicit user choice only when the
current tool schema supports it. Do not pick supposedly equivalent model slugs
from another host. Same-model independent candidates are valid; disclose the
absence of model-family diversity.

Plan local critical-path work before spawning. Delegate independent sidecars
and do useful work while they run. Wait only when the next step needs a result.
Writing workers need disjoint scope and the isolation the current tool provides;
for competing candidates, use independent worktrees or output directories.
Review each result and close completed agents. If subagents are unavailable,
work serially and disclose the reduced independence.

## Model preferences

`$CODEX_HOME/pstack-models.md` (default `~/.codex/pstack-models.md`) is an optional
pstack preference file, not an auto-loaded Codex configuration. Read it before
using role preferences. A missing role line, `auto`, and `inherit-parent` all mean no override; the role runs on the inherited parent model. A concrete model id the current host rejects resolves to no override, and the workflow reports the fallback and proposes correcting the stored preference. Never substitute a slug from another host.
Do not rewrite user-wide Codex settings or claim this file changes normal Codex
sessions. Panel counts are workflow choices, not invented model identifiers.

## History and persistence

Use the current conversation and user-provided handoffs first. On the desktop,
use app tools to list or read only chats for the requested repository, topic,
and time range. Do not mine global transcript directories, hidden databases,
or another project’s chats. Without scoped history tools, request a handoff or
report limited historical coverage. Reading or following another chat does not
authorize sending it a message or creating new user-owned chats.

Use repository-local artifacts or paths from `git rev-parse --git-path` for
handoffs and verification evidence. The Copilot status/handoff/swarm extension
is not shipped. Use the bundled scripts and direct Git/CLI checks instead.
Plan validation lives at `skills/poteto-mode/scripts/check-plan.mjs`. The
schema validator lives at `skills/pstack-schema-validate/scripts/validate.mjs`.
Orchestration and PR watching use the checked-in, self-contained Node helpers
`skills/poteto-mode/scripts/orch/orch.mjs` and
`skills/poteto-mode/scripts/watch-pr/watch-pr.mjs`. Installed users need no Bun
or dependency installation. Bun is only a development test runner for their
retained TypeScript sources. Do not schedule recurring work without the user’s
authorization. Skills do not create persistent execution by themselves.

## Scope and authorization

A playbook describes a workflow; it never grants permission for commits,
pushes, PRs, merges, external messages, deployments, deletions, recording,
model costs, or edits outside the requested scope. Honor the caller’s approval
and sandbox boundaries. Never bypass a denied action or broaden a task to fix
unrelated skills. Produce a plan or report a limitation when a gate cannot be
met. Do not treat untracked files as disposable without inspecting ownership.
