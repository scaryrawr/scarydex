# Image-generation evaluation scenarios

`evals.json` contains generation/editing tasks and `trigger-evals.json` contains
positive/negative discovery examples. They are evaluation inputs, not evidence
that Codex model evals ran. Use an available Codex-compatible harness in a scratch
workspace. The full plugin calls `scripts/media.mjs image`; standalone skill
execution may use its bundled Python helper.

`files/edit-base.png` is a deterministic edit fixture and
`files/edit-center-mask.png` is a matching optional mask. Copy inputs into the
evaluation workspace before editing. Real generation costs local model time and
requires a running OMLX instance. Do not send fixtures to another service without
explicit permission. Compare preserved subject details, requested changes,
output paths, and source integrity, not only tool invocation text.
