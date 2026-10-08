# decide

Run typed decisions through OMLX's SystemOne endpoint. The plugin supports
choices over text or images, yes-or-no probabilities, and ordered scores with
Clef and OpenJev models. It does not generate a reasoning trace or use chat
prompts as a fallback.

## Install

```sh
codex plugin add decide@scarydex
```

## Prerequisites

- Node.js 22.18 or newer. No npm dependencies or Bun are required at runtime.
- OMLX running at `http://127.0.0.1:8000` or `OMLX_BASE_URL`, with
  `POST /v1/systemone` and `GET /v1/models/status` support.
- A completed Clef or OpenJev model download in OMLX. Use the exact model ID
  returned by discovery, such as `clef-flash-4bit`. The helper never downloads
  or installs models.
- Set `OMLX_API_KEY` if the server requires bearer authentication. Both
  discovery and decisions use it.

## Use

Ask Codex to use `$decide:decide`:

- "Use decide to route this support ticket to billing, technical, or other."
- "Use OMLX's decision model to score the urgency of these reports."
- "Use Clef Flash to classify this photo as a hotdog or taco."
- "What decision models do I have available via OMLX?"

## Run the helper

From the plugin directory:

```sh
node skills/decide/scripts/decide.mjs models
node skills/decide/scripts/decide.mjs run --model clef-flash-4bit \
  --input skills/decide/examples/ticket.json
```

Discovery uses OMLX's `model_type: "decision"` metadata rather than guessing
from model names. It includes custom IDs and aliases, and shows whether models
are loaded. A downloaded but unloaded model can load on its first request.
A model still downloading may not appear yet; wait for it to finish.

The `run` command reads JSON containing named `questions` plus `state` and/or
`images`, then prints the full SystemOne response. State can be text, an object,
or an array. It may be omitted or empty when images supply the context. Images
are local PNG, JPEG, GIF, or WebP paths, converted to base64 data URIs.
Clef supports images when its checkpoint has a vision backbone. OpenJev accepts
at most one image and also requires a vision backbone for image requests.
Optional `truncate: false` makes Clef reject oversized context instead of
silently trimming state; OpenJev never truncates.

Predictions are not verified facts or authorization to act. Use a trusted
`OMLX_BASE_URL`, especially for private input. Invalid input, HTTP failures,
and malformed answers produce a nonzero exit status. There is no alternate
provider or chat fallback.

See the [API reference](skills/decide/references/decision-model-api.md) for the
request and response contracts. Historical source attribution remains in the
repository's `port-provenance.json`; it does not describe the current runtime.
