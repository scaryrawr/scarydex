# OMLX decision model API

The current runtime contract comes from OMLX's
[SystemOne request schema](https://github.com/scaryrawr/omlx/blob/e92744893724f3a8ba21a9294d82dd8155c1422e/omlx/api/systemone_models.py),
[server endpoints](https://github.com/scaryrawr/omlx/blob/e92744893724f3a8ba21a9294d82dd8155c1422e/omlx/server.py),
[Clef implementation](https://github.com/scaryrawr/omlx/blob/e92744893724f3a8ba21a9294d82dd8155c1422e/omlx/models/clef.py), and
[OpenJev implementation](https://github.com/scaryrawr/omlx/blob/e92744893724f3a8ba21a9294d82dd8155c1422e/omlx/models/openjev.py).
Historical attribution is preserved in the repository's `port-provenance.json`.

## Endpoint and configuration

`POST /v1/systemone` with `Content-Type: application/json` returns typed decisions.
The base URL defaults to `http://127.0.0.1:8000`. `OMLX_BASE_URL` overrides it and
can contain a reverse-proxy path prefix. Use a server root, not a `/v1` suffix.
The URL must use HTTP(S) without credentials, query parameters, or fragments.
`OMLX_API_KEY` adds `Authorization: Bearer <key>` to both discovery and inference.

## Request

The helper accepts `run --model <name> --input <file>`. The UTF-8 JSON file
contains `state` and `questions`. The model comes from the CLI flag, not the file.
The helper sends these fields without adding chat messages or system prompts:

```json
{
  "model": "clef-flash-4bit",
  "state": { "ticket": "I was charged twice. Please refund the extra payment." },
  "questions": {
    "team": {
      "type": "choice",
      "instructions": "Which team should handle this ticket?",
      "criteria": {
        "billing": "Payments and refunds",
        "technical": "Bugs and integrations",
        "other": "None of the above"
      }
    },
    "refund": {
      "type": "noul",
      "instructions": "Does the customer explicitly ask for a refund?"
    },
    "urgency": {
      "type": "score",
      "instructions": "How urgent is this ticket?",
      "criteria": ["Routine", "Soon", "Urgent"]
    }
  }
}
```

The helper supports the following input forms:

- `state`: non-empty text, a JSON object, or an array containing the context. It may be
  omitted or empty only when `images` is present.
- `images`: optional array of 1-10 local PNG, JPEG, GIF, or WebP paths, each
  non-empty and at most 20 MiB. The helper detects the MIME type from file bytes
  and sends `data:image/<type>;base64,...` strings, not bare base64 or local paths.
  The server decodes and validates the images. Clef requires a vision backbone;
  OpenJev requires a vision backbone and accepts at most one image per request.
  Videos are not supported by this helper.
- `truncate`: optional boolean passed unchanged to OMLX. Clef defaults to `true`
  and cuts state to fit its context. `false` requests an HTTP 413 instead.
  OpenJev accepts this field for API symmetry but never truncates.
- `questions`: a non-empty object of named questions, each with non-empty `instructions`.
- `choice`: `criteria` maps 2–26 option names to descriptions or `null`.
- `noul`: a yes-or-no question, with no criteria required.
- `score`: `criteria` is an array of 2–26 ordered labels.

## Response

An illustrative response is:

```json
{
  "model": "clef-flash-4bit",
  "answers": {
    "team": {
      "type": "choice",
      "choice": "billing",
      "probabilities": {"billing": 0.985, "technical": 0.012, "other": 0.003},
      "confidence": 0.985
    },
    "refund": {"type": "noul", "noul": 0.997},
    "urgency": {
      "type": "score",
      "score": 0.815,
      "legend": {"0": "Routine", "1": "Soon", "2": "Urgent"},
      "probabilities": {"0": 0.378, "1": 0.429, "2": 0.193},
      "confidence": 0.429
    }
  },
  "usage": {"input_tokens": 841, "output_tokens": 0}
}
```

`noul` is the model's yes probability, between zero and one. Choices name one
of the supplied criteria. Scores are the probability-weighted average of
zero-based criterion indices, ranging from zero to `criteria.length - 1`.
For the three urgency labels above, the score is `0 × P(Routine) + 1 × P(Soon) +
2 × P(Urgent)`, on a zero-to-two scale. Probabilities are indexed by the labels
in `legend`. Confidence is returned for
choice and score answers and has model-specific semantics. Clef uses the maximum
option probability; OpenJev uses its own choice and score confidence formulas. These values are model estimates, not verified facts.

The helper validates an answer for each requested question and prints the full
response JSON. It does not discard usage or generate an explanation.

## Discovery

`GET /v1/models/status` returns a `models` array with `id`, `model_type`, and
optional `loaded`, `model_alias`, and `unavailable_reason` fields among other
status metadata. The helper selects `model_type: "decision"` rather than
matching names. It displays aliases and unavailability reasons, and lists all
models with their type and loaded status. Custom IDs work without a name allowlist.

A downloaded model need not already be loaded. A download in progress may not
be discoverable. Use the exact ID or alias from this endpoint for `--model`.
There is no discovery fallback to an untyped model list or another provider.

## Image request

A vision decision model scores the image as part of the state. Paths are a
convenience of this helper; the API itself carries base64 data URIs:

```sh
node scripts/decide.mjs run --model clef-flash-4bit --input photo-decision.json
```

```sh
curl http://127.0.0.1:8000/v1/systemone \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"clef-flash-4bit\",\"state\":\"Classify the attached food.\",\"images\":[\"data:image/png;base64,$(base64 < photo.png | tr -d '\\n')\"],\"questions\":{\"food\":{\"type\":\"choice\",\"instructions\":\"Is this a hotdog or taco?\",\"criteria\":{\"hotdog\":\"Sausage in a bun\",\"taco\":null}}}}"
```

## Direct request

The bundled example omits `model`, so add it before calling the API directly.
A minimal text-state request is:

```sh
curl http://127.0.0.1:8000/v1/systemone \
  -H 'Content-Type: application/json' \
  -d '{"model":"clef-flash-4bit","state":"Our checkout has returned 500 errors since 9am.","questions":{"label":{"type":"choice","instructions":"Which label fits this ticket?","criteria":{"billing":null,"bug":null,"account":null}}}}'
```

## Helper errors and limits

- CLI flags are strict. Unknown flags and positional arguments are rejected.
- Inputs are validated before network access. Files are read locally, then sent
  to the configured endpoint. Image paths must be readable, non-empty files of
  at most 20 MiB, with at most 10 images per request.
- Discovery times out after 10 seconds. Decisions time out after 300 seconds.
  Timeouts before headers or during body reads, including error-response bodies,
  are reported as timeouts rather than connectivity failures or HTTP errors.
- HTTP failures, invalid JSON, and incomplete or invalid answers exit nonzero.
- A SystemOne 404 includes a reminder to check endpoint support and the model ID.
- OMLX error text is preserved from FastAPI `detail` or JSON `error` messages.
  Validation-detail arrays contribute their `msg` strings, not raw input values.
- `OMLX_BASE_URL` accepts HTTP or HTTPS without credentials, query parameters,
  or fragments. It can include a reverse-proxy path prefix.
- The helper does not install servers, download models, retry requests, or fall
  back to the generative chat API.
