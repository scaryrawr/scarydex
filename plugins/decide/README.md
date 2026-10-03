# decide

Run typed decisions through Ollama's Jev-style SystemOne API. The plugin supports
choices, yes-or-no probabilities, and scores. It does not generate a reasoning
trace or use a chat prompt framework.

## Install

```sh
codex plugin add decide@scarydex
```

## Prerequisites

- Node.js 22.18 or newer. No npm dependencies or Bun are required at runtime.
- Ollama 0.35 or newer, running at `http://localhost:11434` or `OLLAMA_BASE_URL`.
- A compatible decision model. Pull one explicitly with `ollama pull nimble`,
  `ollama pull tev1`, or `ollama pull tev1:0.8b`. The helper never downloads models.

## Use

Ask Codex to use `$decide:decide`:

- "Use decide to route this support ticket to billing, technical, or other."
- "Use Ollama's decision model to score the urgency of these reports."
- "What decision models do I have available via Ollama?"

## Run the helper

From the plugin directory:

```sh
node skills/decide/scripts/decide.mjs models
node skills/decide/scripts/decide.mjs run --model nimble \
  --input skills/decide/examples/ticket.json
```

The `models` command highlights `nimble` and `tev1` families by name, including
tags. This is a heuristic, not a capability check. Custom compatible models can
be selected explicitly with `--model`.

The `run` command reads a JSON file containing `state` and named `questions`,
then prints the full SystemOne response as JSON. It preserves probabilities,
confidence, score legends, and usage. Invalid inputs, HTTP failures, and malformed
answers produce a nonzero exit status.

Review predictions before acting. A model probability is not a verified fact or
authorization to execute an action. `OLLAMA_BASE_URL` changes where the helper
sends your input, so use a trusted endpoint.

See the [API reference](skills/decide/references/decision-model-api.md) for the
request and response contracts. The bundled ticket example is adapted from
[Ollama's announcement](https://ollama.com/blog/ollama-now-supports-jev-style-decision-models).
