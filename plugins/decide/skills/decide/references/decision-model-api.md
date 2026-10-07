# Ollama decision model API

Source: [Ollama's Jev-style decision-model announcement](https://ollama.com/blog/ollama-now-supports-jev-style-decision-models),
published September 29, 2026. Jev is TypeSafe's decision API, not an acronym for a
three-phase reasoning prompt. The criterion bounds and score formula are defined
in [Ollama's SystemOne implementation](https://github.com/ollama/ollama/blob/main/decision/systemone.go).
Image input behavior matches Ollama's
[request types](https://github.com/ollama/ollama/blob/main/decision/types.go)
and [clef encoder](https://github.com/ollama/ollama/blob/main/decision/clef.go).

## Endpoint

`POST /v1/systemone` with `Content-Type: application/json`, available in Ollama
0.35 and newer. The default base URL is `http://localhost:11434`.

## Request

The helper accepts `run --model <name> --input <file>`. The UTF-8 JSON file
contains `state` and `questions`. The model comes from the CLI flag, not the file.
The helper sends these fields without adding chat messages or system prompts:

```json
{
  "model": "nimble",
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

- `state`: non-empty text or a JSON object containing the context. It may be
  omitted or empty only when `images` is present.
- `images`: optional array of 1-10 local image file paths, each 20 MiB or
  smaller (helper limits). The helper base64-encodes each file into the
  request's top-level `images` field. The API accepts `images` only for the
  `clef` encoding, such as `clef-flash`; other decision models return
  `image inputs are not supported by this decision model`. `videos` are
  unsupported.
- `questions`: a non-empty object of named questions, each with non-empty `instructions`.
- `choice`: `criteria` maps 2–26 option names to descriptions or `null`.
- `noul`: a yes-or-no question, with no criteria required.
- `score`: `criteria` is an array of 2–26 ordered labels.

## Response

The announcement's example response is:

```json
{
  "model": "nimble",
  "answers": {
    "team": {
      "type": "choice",
      "choice": "billing",
      "probabilities": {"billing": 0.985, "technical": 0.012, "other": 0.003},
      "confidence": 0.922
    },
    "refund": {"type": "noul", "noul": 0.997},
    "urgency": {
      "type": "score",
      "score": 0.815,
      "legend": {"0": "Routine", "1": "Soon", "2": "Urgent"},
      "probabilities": {"0": 0.378, "1": 0.429, "2": 0.193},
      "confidence": 0.046
    }
  },
  "usage": {"input_tokens": 841, "output_tokens": 4}
}
```

`noul` is the model's yes probability, between zero and one. Choices name one
of the supplied criteria. Scores are the probability-weighted average of
zero-based criterion indices, ranging from zero to `criteria.length - 1`.
For the three urgency labels above, the score is `0 × P(Routine) + 1 × P(Soon) +
2 × P(Urgent)`, on a zero-to-two scale. Probabilities are indexed by the labels
in `legend`. Confidence is returned for
choice and score answers. These values are model estimates, not verified facts.

The helper validates an answer for each requested question and prints the full
response JSON. It does not discard usage or generate an explanation.

## Discovery

`GET /api/tags` lists installed models. The known families are `nimble`,
`tev1`, including `tev1:0.8b`, and `clef`, such as the vision-capable
`clef-flash`. The helper recognizes these names and tagged, hyphen-suffixed, or
namespaced variants as candidates. `GET /api/show` or `ollama show <model>`
reports the actual `decision` and `vision` capabilities. Name matching does not verify API support;
custom compatible models can be selected explicitly.

## Image request

A vision decision model scores the image as part of the state. Paths are a
convenience of this helper; the API itself carries base64 strings:

```sh
node scripts/decide.mjs run --model clef-flash --input photo-decision.json
```

```sh
curl http://localhost:11434/v1/systemone \
  -H 'Content-Type: application/json' \
  -d "{\"model\":\"clef-flash\",\"state\":\"Classify the attached food.\",\"images\":[\"$(base64 < photo.png | tr -d '\\n')\"],\"questions\":{\"food\":{\"type\":\"choice\",\"instructions\":\"Is this a hotdog or taco?\",\"criteria\":{\"hotdog\":\"Sausage in a bun\",\"taco\":null}}}}"
```

## Direct request

The bundled example omits `model`, so add it before calling the API directly.
A minimal text-state request is:

```sh
curl http://localhost:11434/v1/systemone \
  -H 'Content-Type: application/json' \
  -d '{"model":"nimble","state":"Our checkout has returned 500 errors since 9am.","questions":{"label":{"type":"choice","instructions":"Which label fits this ticket?","criteria":{"billing":null,"bug":null,"account":null}}}}'
```

## Helper errors and limits

- CLI flags are strict. Unknown flags and positional arguments are rejected.
- Inputs are validated before network access. Files are read locally, then sent
  to the configured endpoint. Image paths must be readable, non-empty files of
  at most 20 MiB, with at most 10 images per request.
- Discovery times out after 10 seconds. Decisions time out after 300 seconds.
- HTTP failures, invalid JSON, and incomplete or invalid answers exit nonzero.
- A SystemOne 404 includes a reminder to check Ollama 0.35 support.
- `OLLAMA_BASE_URL` accepts HTTP or HTTPS without credentials, query parameters,
  or fragments. It can include a reverse-proxy path prefix.
- The helper does not install Ollama, download models, retry requests, or fall
  back to the generative chat API.
