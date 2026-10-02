---
name: setup-pstack
description: Configure pstack’s optional per-role Codex model preferences. Use when asked to configure pstack models or change its role choices, not to alter Codex’s global model settings.
---

# Setup pstack

Read [Codex runtime mapping](../../references/codex-runtime.md).
Resolve Codex home from `CODEX_HOME`, otherwise `~/.codex`.
The optional `pstack-models.md` is read by pstack workflows, not automatically
loaded by Codex. Preserve unrelated user configuration.

1. Inspect the current subagent tool schema or an available first-party model
   listing. Do not invent model IDs. When no listing exists, use `auto`.
2. Read an existing `pstack-models.md` and preserve its valid role choices.
3. Show proposed role preferences. Set explicit model IDs only when the user
   chose them and the current host permits them. `auto` and `inherit-parent`
   mean no override. Panel lists determine worker count, not model availability.
4. Write the confirmed preferences. Ask for normal filesystem approval if Codex
   home is outside the writable scope; do not move the file to bypass approval.

Example:

```markdown
# pstack model preferences
feature, refactoring: auto
bug-fix: auto
perf-issue: auto
hillclimb: auto
judgment and prose: auto
hardest tasks: auto
how explorer: auto
how explainer: auto
why investigators: auto
why synthesizer: auto
reflect tooling: auto
reflect judgment, divergent, synthesizer: auto
arena runners: auto, auto, auto
arena cross-judge pool: auto
swarm workers: auto
architect runners: auto, auto, auto
interrogate reviewers: auto, auto, auto
```

Report the path and explicit choices. Explain that only pstack workflows read
this file and that subagents inherit the parent unless an allowed override is
chosen. Do not add always-applied Copilot instructions or edit Codex config.
