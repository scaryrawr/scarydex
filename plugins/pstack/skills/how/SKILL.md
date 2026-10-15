---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
---

# How

Read [Codex runtime mapping](../../references/codex-runtime.md) for delegation, models and scoped history. Every delegate is read-only. Explorer and explainer role choices come from Codex home's `pstack-models.md`. Missing lines, `auto`, and `inherit-parent` omit the model override; a rejected concrete choice falls back to inheritance, reported. Match only supported effort controls to the job per **poteto-mode**.

## 1. Assess complexity

If scope is ambiguous, state your interpretation and explore. The user can redirect.

- **Simple.** A single module, utility, or continuous trace. Explore and explain directly with `references/explainer-prompt.md`, omitting the explorer-findings section. Go to step 4.
- **Complex.** Independent research angles across a subsystem. Go to step 2.

When in doubt, take the simple path.

## 2. Explore

Split the question into 2 to 4 independent angles. Launch explorers together, each with `references/explorer-prompt.md`, its angle and read-only scope. Keep bulk findings outside the parent context.

## 3. Synthesize

Once all explorers return, use one explainer with `references/explainer-prompt.md` and their findings. Without subagent support, do the same work serially and disclose the reduced independence.

## 4. Present

Present the explanation with light edits for clarity and conversation context. Use the prompt's applicable sections: Overview, Key Concepts, How It Works, Where Things Live, Gotchas. Cite source evidence rather than inventing a mental model from summaries.
