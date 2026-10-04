---
name: highlight-reel
description: >-
  Mine a long talking-head or livestream recording into a verified highlights
  reel: timestamped highlight clips cut with ffmpeg, key-frame candidates from
  scene-diff, and takeaways with verbatim-verified quotes. Routes media
  understanding across local OMLX models (native video, unified audio+vision,
  batch STT) based on a live capability probe. Not for image generation, TTS,
  or polished document authoring (use blogify for that).
---

# Highlight reel workflow

Turn a long recording (podcast, livestream, meeting) into highlight clips,
key frames, and grounded takeaways. This skill is the audio-first sibling of
`blogify`: blogify authors a document, this skill mines the reel — and both
share the same model-routing rules below.

Resolve all bundled `scripts/` paths relative to this installed skill
directory. Keep all inputs and outputs in the user's workspace with absolute
paths; scripts refuse to write inside the skill directory.

## Model routing (read first)

Local OMLX models have **different modality support** and it changes with
model updates — do not assume. Run `uv run scripts/probe_models.py
--include-stt` once per session (or refresh `references/model-routing.md`
from `probe-report.json`) and route by the observed matrix. The
verified-on-2026-10-04 default routing:

| Task | Model | Route |
|---|---|---|
| Long-form batch STT | `nemotron-3.5-asr-streaming-0.6b` (or any `audio_stt` engine) | `/v1/audio/transcriptions` — never send audio to chat completions |
| Audio understanding / audio+text QA | `gemma-4-12B-it-qat-oQ4e-mtp` | chat completions with `input_audio` content part |
| Frame classification / OCR / constrained JSON | `gemma-4-12B-it-qat-oQ4e-mtp` (fast, contract-compliant) | chat completions with `image_url` |
| Native short-clip video | `Qwen3.5-9B-oQ4e-mtp` (35B variant too) | chat completions with `video_url`; **always pass `chat_template_kwargs: {"enable_thinking": false}`** or JSON contracts break |
| Text-only reasoning over transcript | either | `gemma-4-26B` rejects image/audio/video parts (400) on current builds — route media elsewhere |
| Takeaway/highlight text mining | Either; cross-check the other | chunked transcript only |

Known failure modes (observed): Qwen builds reject `input_audio` (HTTP 500);
Gemma builds reject `video_url` (HTTP 400 schema rejection; 507 when RAM is also tight); Qwen default builds leak
chain-of-thought into answers; both models paraphrase "verbatim" quotes and
drift clip bounds — which is why every artifact passes `verify_reel.py`.

## Workflow

1. **Transcribe with fine-grained timestamps.** Use blogify's bundled
   transcriber (same plugin): `uv run ../blogify/scripts/transcribe.py
   --input <file> --output-dir <dir> --silence-db -25 --silence-dur 0.8`.
   Default thresholds miss pauses in continuous podcast audio and produce
   multi-minute chunks with no usable timestamps; the stricter flags above
   gave a 65-minute livestream ~100s timestamp granularity.
2. **Sample frames + scene-diff.** `uv run ../blogify/scripts/sample_frames.py
   --input <video> --output-dir <frames-dir>`, then `uv run scripts/scene_diff.py
   --frames-dir <frames-dir>`. If the report says `"uniform": true` (e.g. a
   static split-screen podcast), skip broad frame classification — key frames
   add nothing and vision calls cost memory; grab candidates at the top of the
   list only.
3. **Mine takeaways + highlight bounds.** Chunk the transcript into parts of
   <= ~20 chunks and have your model work one part at a time (large single
   prompts can trip oMLX's prefill memory guard — ~100 GB on this machine;
   keep sub-agent sessions fed small slices and scaled-down frames). Require
   quotes `<=15 words copied EXACTLY including disfluencies ("uh", "right",
   repeated words) — verbatim or omitted`, and clip bounds inside the chunk
   windows they cite. For a head-to-head pick of who mined better, see
   `references/model-routing.md`.
4. **Verify deterministically — always.** `uv run scripts/verify_reel.py
   --transcript <transcript.md> --highlights <highlights.json> --takeaways
   <takeaways.md> --fix`. It snaps out-of-window bounds into their chunk
   windows; flagged quotes are never auto-fixed — re-extract them from the
   transcript text yourself, or re-run the extraction with a stricter prompt.
5. **Cut the clips.** `uv run scripts/cut_clips.py --input <video>
   --highlights <verified-highlights.json> --output-dir <clips-dir>`.
   Stream-copy first with an ffprobe duration check and automatic re-encode
   fallback when a copy drifts >2.5s off the request. Deliver
   `clips-manifest.json` + clips.
6. **Grab key frames (only if scene-diff said non-uniform).** For each
   candidate, re-extract full-res with blogify's `../blogify/scripts/extract_frame.py
   --input <video> --second <secs> --output <dir>/shot.png`, verify visually,
   and ship with alt text.

## Sub-agent guidance

- One sub-agent per model per task slice; identical prompts for head-to-head
  runs; write outputs to distinct filenames (`agent-<model>_*.json`).
- Cap frames inspected (<=6 per session), scale to <=640px, and pass
  `--pad`-style bounds instructions; treat sub-agent "done" claims as
  unverified until you read its output files.
- Some session builds fail `view_image` silently — have sub-agents state
  explicitly when they did not look, and route the visual pass to a capable
  session instead.

## Notes

- Keep `transcript/`, `highlights.json`, `takeaways.md`, `clips/`, and
  `clips-manifest.json` in the workspace; deliver the manifest, not just the
  clips.
- Estimates: nemotron STT transcribed 65 min in ~4 min; gemma frame calls ran
  2–6 s after model load; Qwen native-video on a 20 s clip ~47 s. Budget
  accordingly and prefer audio-first mining for talking-head footage.
