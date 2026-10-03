# decide

Discover and leverage Ollama decision models using the JEV (Judgment-Evaluation-Decision) framework.

## What it does

Ollama supports decision models that guide LLMs through a structured three-phase reasoning process:

1. **Judgment** — Assess the situation, classify the decision type, and identify key factors.
2. **Evaluation** — Weigh options, consider tradeoffs, and evaluate evidence for each alternative.
3. **Decision** — Make a concrete choice or recommendation with rationale.

This plugin helps agents discover which Ollama models are suitable for decision-making and provides a reproducible workflow for running JEV-style decisions.

## Install

```sh
codex plugin add decide@scarydex
```

## Use

Invoke the skill in your conversation:

- "Use decide to help me choose between these deployment strategies."
- "Run a JEV decision analysis on this architectural option."
- "What decision models do I have available via Ollama?"

The skill resolves the bundled `skills/decide/scripts/decide.mjs` helper from the installed plugin directory. No npm dependencies or Bun are required at runtime.

## Helper CLI

```sh
# List decision-capable models available via Ollama
node skills/decide/scripts/decide.mjs models

# Run a JEV-style decision with a specific model
node skills/decide/scripts/decide.mjs run --model <model-name> --question "<decision question>"
```

## Prerequisites

- Ollama running locally or at a configurable `OLLAMA_BASE_URL` (default `http://localhost:11434`).

See `skills/decide/references/decision-model-api.md` for API details and prompt templates.
