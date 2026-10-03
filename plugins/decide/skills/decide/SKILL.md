---
name: decide
description: Use Ollama decision models to discover available decision-capable models and run JEV (Judgment-Evaluation-Decision) structured reasoning. Use when the user wants help making a decision, comparing options, or running a structured decision analysis; not for simple factual queries.
---

# Decide — Ollama Decision Models

Resolve all bundled `scripts/` and `references/` paths relative to this
installed skill directory, not the workspace. Keep generated outputs in the
user's workspace.

The JEV framework guides an LLM through three phases: **Judgment** (assess the
situation), **Evaluation** (weigh options and tradeoffs), and **Decision**
(make a concrete recommendation). Use this skill to discover decision-capable
models on the local Ollama instance and run structured decisions.

## Discover models

Before running any decision, check what decision-capable models are available:

```bash
node scripts/decide.mjs models
```

This lists every model on the endpoint and flags ones whose names contain
decision-related keywords (`decision`, `jev`, `reasoner`). Ollama does not
publish capability tags, so treat the classification as a heuristic; check
`GET /api/tags` directly for the raw list.

If Ollama is not running at the default address, set `OLLAMA_BASE_URL` to point
at your Ollama endpoint.

Choose a model with "decision" or "reasoner" in its name for complex
decisions. For quick judgments, any capable model works.

## Run a JEV decision

1. Frame the decision clearly. What exactly needs to be decided? What are the
   viable options? Gather context before prompting the model.

2. Run the decision analysis:

   ```bash
   node scripts/decide.mjs run \
     --model <model-name> \
     --question "<decision question>"
   ```

   The helper sends a JEV-structured prompt to Ollama and returns the full
   reasoning trace.

3. Review the output. The response should have three sections:
   - **Judgment** — situation assessment and key factors
   - **Evaluation** — option-by-option tradeoff analysis
   - **Decision** — concrete recommendation with rationale

4. Challenge the result. The model's evaluation may miss hidden costs or
   stakeholder impacts you know about. Cross-check its assumptions against
   your domain knowledge before acting.

## Run it yourself (no helper)

If you prefer, send the JEV prompt template from
`references/decision-model-api.md` directly to any Ollama chat endpoint. The
helper just wraps that with consistent formatting and model auto-discovery.

## When to use (and when not to)

Use decide for:
- Choosing between architectural or design options.
- Evaluating tradeoffs where qualitative factors matter.
- Getting a structured second opinion before committing to a path.
- Documenting the reasoning behind a decision for later review.

Do not use decide for:
- Purely factual questions with a verifiable answer.
- Decisions that require real-time data the model cannot access.
- Situations where you already have a clear answer and just need validation.

For the API endpoint details and prompt templates, see
`references/decision-model-api.md`.
