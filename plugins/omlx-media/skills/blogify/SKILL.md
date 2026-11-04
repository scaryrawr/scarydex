---
name: blogify
description: >-
  Use this skill to turn a video or audio recording (a talk, meeting, or demo)
  into written content: documentation, a blog post, tutorial, changelog, or
  notes. Handles transcription, takeaway synthesis, screenshot/frame selection,
  and grounded drafting from local OpenAI-compatible media models. Not for
  real-time transcription, generic video editing, or non-generative media
  processing.
---

# Blogify workflow

Resolve all bundled `scripts/` and `references/` paths relative to this
installed skill directory, not the workspace. Keep generated outputs in the
user's workspace. Resolve `<plugin-root>` as two directories above this
installed skill directory.


Produce four reviewable artifacts from the recording: transcript, takeaways,
selected frames, and final prose. Run the audio and frame tracks in parallel when
the input is video.

## Requirements

- `$OMLX_BASE_URL` should point at the OpenAI-compatible media endpoint (defaults
  to `http://127.0.0.1:8000` if unset); set `$OMLX_API_KEY` only if the
  endpoint requires auth (otherwise an empty key is assumed).
- Node.js 22.18+, `ffmpeg`, and `ffprobe` for bounded recording preparation.
- Optional classification needs `uv` and its script-declared dependencies.
  Legacy deduplication and cropping also need ImageMagick. Do not install
  dependencies without the user's approval.
- Use absolute source paths and fresh output directories outside the plugin.
  Create the common parent if needed, but leave each `output_dir` nonexistent.
  Never overwrite a recording, preparation manifest, or earlier run.
- Recording mode requires a literal loopback endpoint. Set `allow_remote: true`
  only after explicit consent to transmit this recording to the configured
  endpoint. Separately approve sending transcript text or frames to hosted
  authors or classifiers.
- Do not switch to legacy scripts to bypass validation, privacy, missing
  dependencies, or output-conflict errors.

## Sandboxed `uv` cache

Some Codex sandboxes cannot write to uv's default cache (`~/.cache/uv`), so every
`uv` command fails at startup with `Failed to initialize cache` / `Operation not
permitted` — before any script or dependency install even runs. Point the cache
at a writable temp location by running this export and the workflow's `uv`
commands in the same shell invocation:

```sh
export UV_CACHE_DIR="${TMPDIR:-/tmp}/uv-cache"
```

The export does not persist across independent shell-tool calls. For those,
pass the cache directory on every `uv` invocation:
`uv --cache-dir "${TMPDIR:-/tmp}/uv-cache" run …`.
Runs pointed at the same cache reuse it, so only genuinely missing packages need
network.

## First: get the intent

Collect the **output type, audience, tone, and scope** from the prompt or user
before drafting. Use `references/authoring.md` for the authoring checklist.

## Workflow

1. **Transcribe.** Write arguments to a workspace JSON file, then run
   `node "<plugin-root>/scripts/media.mjs" transcribe --input-json <args.json>`
   with `input` and a fresh `output_dir`. Read `manifest.json`, `transcript.md`,
   and `chunks.json`. The fixed-length chunks preserve source offsets, not
   word timestamps or speaker labels. For short audio needing only text, pass
   a new `.txt` `output` instead. Never pass both output forms.
   Use `references/transcription.md` for limits and the optional silence-aware
   legacy script workflow.
2. **Mine takeaways.** From the transcript, synthesize per-topic takeaways in
   the reader's voice. Correct mistranscribed jargon against ground truth
   (slides, repo names). Stay grounded — never invent claims. For long
   recordings, fan out per-topic synthesis to sub-agents.
3. **Prepare candidate frames.** In parallel with transcription, run
   `node "<plugin-root>/scripts/media.mjs" prepare-frames --input-json <args.json>`
   with the same `input` and a different fresh `output_dir`. Read the manifest
   for exact requested timestamps and paths. Uniform sampling can miss a brief
   transition. Request a narrower `start` and `end`, or explicit `seconds`,
   when needed. This command does not rank, detect scenes, or deduplicate.
   Request `format: "jpeg"` if using the optional classifier or deduplication
   scripts. They do not discover the default PNG files.
4. **Classify frames only when useful.** Inspect a small candidate set directly.
   For a larger set, run
   `uv run scripts/classify_frames.py --frames-dir <candidates>
   --output <dir>/classification.json --context "<one line about the video>"
   --categories "<A,B,...,OTHER>" --batch-size 4 --select-dir <fresh-selected-dir>`.
   Keep the preparation manifest separate. Optional deduplication uses
   `uv run scripts/dedupe_frames.py --frames-dir <candidates> --output-dir <fresh-dir>`.
   Use a short enum of categories. The vision model is a classifier, not an
   open-ended captioner. It
   returns constrained JSON labels (validated against the enum). `--batch-size`
   classifies several frames per request to amortize the endpoint's large fixed
   per-request cost (~6–8 s); 4 is a safe default, raise it for distinct frames.
   For sampling pitfalls, batching, and targeted re-sampling, use `references/frames.md`. The local OMLX
   model is the default; if its per-request cost makes a large frame set
   impractical even when batched, `references/frames.md` documents a **privacy-gated cloud-subagent
   fallback** (only with explicit user consent, since frames leave the machine).
5. **Pick and polish images.** Choose frames against the transcript and output
   intent. Re-run `prepare-frames` with explicit `seconds` into a fresh directory.
   Pass source-pixel `crop` geometry to remove overlays, and source `width` for
   full resolution within the 4096-pixel limit. Verify the images visually
   before using them. See `references/frames.md` for options and legacy scripts.
6. **Author the output.** Draft the doc/blog per the requested intent. Add a
   screenshot only where it makes the text easier to understand, placed next to
   the concept, with descriptive alt text. Use `references/authoring.md`.
7. **If in a repo, wire and validate.** Follow the repo's image/LFS conventions,
   optionally embed the recording/slides, run its markdown lint / link / TOC
   checks, and respect its PR conventions (some repos want changes left in the
   working tree). Use `references/authoring.md`.

## Notes

- Keep the transcript, takeaways, frame manifest, and selected frames in the
  workspace — deliver the artifacts, not just the final prose.
- The transcript and the frame filenames share the video timeline, so you can
  line up "demoed at 34:59" with the frame captured at 34:59.
- Run only the scripts bundled here; do not copy them elsewhere.
- A preparation manifest records input and timestamps, not transcript accuracy
  or frame usefulness. Keep jargon correction, attribution, authoring, and
  final editorial selection in this skill.
- Failures retain partial files and `failure.json`. They are not complete
  transcripts or frame sets. Inspect them, then retry with a new `output_dir`.
