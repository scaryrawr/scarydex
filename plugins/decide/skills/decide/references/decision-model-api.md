# Ollama Decision Model API

Ollama's decision model support uses the standard chat and generate endpoints
with structured system prompts that guide models through the JEV framework:
Judgment, Evaluation, Decision.

## Endpoint

```
POST /api/chat
Content-Type: application/json
```

### Request body

```json
{
  "model": "decision-model-name",
  "messages": [
    {
      "role": "system",
      "content": "<JEV framework prompt>"
    },
    {
      "role": "user",
      "content": "<decision question or scenario>"
    }
  ],
  "stream": false
}
```

### Response

The response follows the standard Ollama chat format with a `message` field
containing the model's full JEV reasoning trace:

```json
{
  "model": "decision-model-name",
  "message": {
    "role": "assistant",
    "content": "<JEV reasoning trace>"
  },
  "done": true
}
```

## Discovering decision models

List all available models:

```
GET /api/tags
```

Decision-capable models typically have names containing `decision`, `jev`,
`reasoner`, or are general-purpose reasoning models. Use the `models` command
in the bundled helper to see an auto-classified list.

## JEV prompt template

The standard system prompt for decision reasoning:

```
You are a decision analyst. Respond using the JEV framework:

1. JUDGMENT: Assess the situation. What type of decision is this? What are
   the key factors, constraints, and stakeholders?

2. EVALUATION: For each viable option, weigh the tradeoffs. Consider
   short-term and long-term consequences, risks, and hidden costs. Use
   evidence, not assumptions.

3. DECISION: Make a concrete recommendation. State it clearly, then
   summarize the rationale in one sentence.

Format your response with these three section headers.
```

## Model selection

Not all Ollama models produce high-quality decision reasoning. Prefer:

- Models explicitly fine-tuned for reasoning or decision-making.
- Larger models (70B+) for complex decisions with many tradeoffs.
- Models with extended context windows when the decision scenario is
  detail-heavy.

See `skills/decide/SKILL.md` for the full workflow.
