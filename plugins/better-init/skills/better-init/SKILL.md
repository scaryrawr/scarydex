---
name: better-init
description: Create or refresh concise Codex repository guidance in AGENTS.md and task-specific project skills. Use for repository initialization, bootstrap, stale instructions, or reorganizing guidance; not for merely explaining existing instructions.
---

# Better Init for Codex

Create the smallest durable instruction set that changes how Codex works in this
repository. Improve existing `/init` output in place. Preserve user-authored
constraints and unrelated configuration.

## Inspect before writing

Prioritize the user’s named package or workflow. Read executable sources first:
manifests, lockfiles, task runners, CI, test/build/lint/formatter configuration,
code-generation rules, contributor docs, and representative entrypoints.
Then inspect existing root and nested `AGENTS.md`, `AGENTS.override.md`,
`.agents/skills`, `.codex/agents`, and other instruction surfaces already used by
the project. Also inspect parent guidance that applies to this checkout.

Prefer verified commands and paths over claims in prose. For a large repository,
delegate read-only discovery using the prompt at
[repo-instruction-researcher](../../references/agents/repo-instruction-researcher.md)
if Codex subagents are available. For a small repo, investigate directly. Do not
install tooling or run side-effecting setup just to discover its instructions.

## Keep only facts an agent would miss

- Exact setup, build, lint, format, typecheck, test, migration, generation, and
  narrow validation commands, with working directory and required order.
- Package boundaries, real entrypoints, generated outputs, and ownership.
- Required services and environment loading, without secrets.
- Nonstandard conventions, expensive/flaky suites, and release/safety gates.
- Repeatable workflows that warrant a task-specific skill.

Do not inventory every directory or add generic engineering advice. Resolve
contradictions rather than copying them into another file.

## Choose the owning surface

### `AGENTS.md`

Put portable repository-wide facts in the root file. Use nested files only at
meaningful subsystem boundaries with different commands or constraints. Codex
combines guidance from the project root toward the working directory; narrower
guidance governs its subtree. Link deeper docs instead of duplicating them.
Aim for a concise guide, usually 200–400 words.

`AGENTS.override.md` takes precedence over `AGENTS.md` in the same directory.
Inspect it before editing a guide that would otherwise be shadowed. Do not
create an override merely as another place for the same instructions.

### `.agents/skills/<name>/SKILL.md`

Use a project skill for repeatable, task-specific procedures such as releases,
migrations, verification, or repository-specific reviews. Give it a matching
lowercase kebab-case name and a precise description. Keep optional deterministic
helpers in `scripts/`, detailed guidance in `references/`, and templates in
`assets/`. Make linked paths relative to the skill. Preserve an existing skill
layout unless the user requests migration.

A review skill must name the repository-specific evidence to inspect, checks to
run, and actionable finding criteria. Codex has no required `code-review` skill
name. Do not claim that GitHub Copilot review will consume Codex-only skills.

### `.codex/agents/<name>.toml`, only when warranted

A specialist may justify an independent context and repeatable delegation.
Prefer a reusable prompt or skill when that suffices. If the user wants a custom
Codex agent, verify the installed client’s supported custom-agent format first.
Current standalone agent files use `name`, `description`, and
`developer_instructions`; optional `sandbox_mode = "read-only"` suits research.
Do not invent Copilot `.agent.md` manifests, pin a model without the user’s
choice, or alter shared `.codex/config.toml` merely to initialize guidance.

### Existing compatibility files

Preserve useful `.github/copilot-instructions.md`, `.github/instructions`,
`CLAUDE.md`, or `GEMINI.md` when they serve other clients. They are not Codex’s
native instruction surfaces. Do not generate harness-specific duplicates by
default. Preserve an existing `CLAUDE.md` shim without expanding it.

## Reconcile and verify

Assign each fact one owner, tighten stale guidance, then make focused edits.
It is valid for the result to be only `AGENTS.md`. Re-read every changed file,
verify commands and paths against source, check frontmatter and links, and ensure
new skills have unique names and clear triggers. Report files changed, what
each owns, and any command you could not verify.
