---
name: interrogate
description: "Use for interrogate, adversarial review, multi-model review, challenge this, or stress test this code. Adversaries try to break a change or design, and only findings proven by a run survive."
---

# Interrogate

Adversaries try to break a change or a design. A finding survives only when a run proves it. Report findings; do not apply fixes. Read [Codex runtime mapping](../../references/codex-runtime.md) before delegation.

## Frame

Use the scope the user names. Otherwise review the branch diff from its actual merge base with the intended base branch, through the working tree. Include staged and unstaged changes; do not guess the base is `main`. State the intent with [in-your-own-words](../in-your-own-words/SKILL.md), from the user's message, commits and PR description. Ask only when the intent is genuinely unclear.

## Fan out

Follow [arena](../arena/SKILL.md) Phase A steps 3 and 4 and Phase B, with these changes. Read `interrogate reviewers` instead of `arena runners`. Use isolated worktrees or scratch copies, and copy the scoped uncommitted changes into each. Keep the original working tree intact. Give each adversary the same scope, intent and brief:

> Break this change. Prove each finding against the real code with a failing test, repro script or command output showing wrong behavior. For a design or plan, run a prototype or probe the current tree. Keep repros in your own worktree. Report a title, the exact command, its output and the output the intent requires. Leave out anything you did not run, including style, naming and risks that need a future change to matter. No findings is a valid result.

Use the host's available full-capability subagents, without invented agent registrations or vendor defaults. Permission to review does not authorize destructive probes, external writes, acquisition of software or real media/inference. When delegation is unavailable, run the same proof process directly and disclose the missing independent coverage.

## Verify

Rerun every finding's command in an isolated copy. Keep it only when the output shows the failure and that failure breaks the intent. Drop the rest. Merge findings sharing a root cause.

Skip arena Phases C, D and E. Adversaries find different failures; keep every independently verified finding, not one adversary's list. A blocked repro is not a proven finding or a clean independent review.

## Output

- **Intent:** the restatement.
- **Findings:** each verified command, its output, how it breaks the intent and who found it. Say "no verified findings" when none survive.
- **Dropped:** each adversary's dropped count and reasons, with any unavailable seats or verification blockers.
