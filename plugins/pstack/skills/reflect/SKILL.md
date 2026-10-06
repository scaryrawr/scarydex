---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
---

# Reflect

For delegation, models, and scoped history, read
[Codex runtime mapping](../../references/codex-runtime.md).


Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Gather the active conversation

Use the active conversation already in context. When the app’s scoped chat-reading tools is available, query only the current session ID and the time range needed for this task. Do not search unrelated sessions. If the current session cannot be queried, write a tight digest from the visible conversation and pass that instead.

### 2. Spawn three reviewers in parallel

One message, three subagent calls with the default Codex subagent. Each reviewer reads its role line in `pstack-models.md`; a missing line, `auto`, and `inherit-parent` all mean omit `model`. A rejected concrete id resolves to no override, reported. Each prompt forbids file writes; the parent applies edits.

| Lens | `model` | Prompt template |
|---|---|---|
| Judgment | configured reflect-judgment model or inherited parent model | `references/judgment-reviewer.md` |
| Tooling | configured reflect-tooling model or inherited parent model | `references/tooling-reviewer.md` |
| Divergent | configured reflect-judgment model or inherited parent model | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the scoped conversation digest where marked. Use a transcript reference only when the current Codex host explicitly provides one. Reviewers return findings in the subagent response body.

### 3. Synthesize

One subagent call with the default Codex subagent and the model from the `reflect judgment, divergent, synthesizer` role line. Omit `model` when the line is missing or set to `auto` or `inherit-parent`. The prompt forbids file writes but allows available integrations for citation checks. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

Backlog items file to whatever devex / backlog tracker your team uses automatically. Only the Accepted list waits for approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): follow the poteto-mode Authoring a skill playbook and run focused task or trigger evals when an eval harness is available.
- `tune description: <skill path>` (the skill exists but did not trigger when it should have): add realistic positive and negative trigger cases, then tighten the description against them.
- `new skill via authoring playbook: <kebab-name>`: follow the Authoring a skill playbook. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
