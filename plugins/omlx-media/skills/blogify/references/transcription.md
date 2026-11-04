# Transcription

Bounded recording preparation and optional silence-aware transcription.

## Bounded recording preparation

Run `node "<plugin-root>/scripts/media.mjs" transcribe --input-json <args.json>`
with an absolute `input` and a fresh `output_dir`. Resolve `<plugin-root>` as two
directories above the installed skill. A short audio file can instead use a new
`.txt` `output`. The two output forms are mutually exclusive. Recording-only
options are rejected in text mode.

Recording mode extracts fixed mono 16 kHz WAV chunks and submits them serially
to `/v1/audio/transcriptions`. Discovery through `/v1/models/status` prefers a
loaded STT model, then an installed STT model for on-demand loading. A valid
explicit `model` takes priority. Malformed discovery never falls back to an
unverified model in recording mode.

| Option or limit | Recording mode |
| --- | --- |
| `chunk_seconds` | Integer from 10 to 120, default 60. At most 120 chunks. |
| `timeout_seconds` | Total deadline from 1 to 1800 seconds, default 600. |
| Per-request deadline | 120 seconds, including response reads. |
| Source | Nonempty local file up to 4 GiB and 2 hours, with an audio stream. |
| Responses | At most 1 MiB per JSON response and 8 MiB accumulated transcript. |
| `model`, `language`, `prompt` | Optional model and recognition guidance. |
| `allow_remote` | Defaults to false. Literal `127.0.0.0/8` and `::1` endpoints are allowed. Never follows redirects. Set true only with recording-specific consent. |
| Artifacts | Per-chunk WAV files, `transcript.md`, `chunks.json`, and final `manifest.json`. |

The output directory's parent must exist. Outputs must be outside the plugin.
The complete manifest records the canonical source, duration, model, selected
audio range, format, artifact paths, and actual extracted chunk offsets and text.
Chunks cover the selected audio stream, not a longer video or container.
Missing stream duration triggers a bounded local decode-to-null measurement
within the total deadline.

Fixed chunks can split a word or sentence. They do not remove silence, align
words, or identify speakers. Correct jargon only against supplied source
material. Do not infer a speaker from a chunk boundary.

A failure retains extracted audio and `failure.json`, including completed chunk
text and error details. It does not publish a complete manifest. Inspect partial
artifacts without treating them as a completed transcript. Retry into a new
directory. There is no automatic remote or cloud fallback.

## Legacy silence-aware pipeline

Use `uv run scripts/transcribe.py --input <absolute-recording> --output-dir
<fresh-absolute-dir>` only when silence-aware preparation is explicitly needed.
The script requires `uv`, Python, FFmpeg, and ffprobe. It does not enforce the
bounded CLI's fresh directories or loopback-only endpoint. Check the destination,
dependencies, and recording-specific transmission consent first. Do not use it
to bypass a CLI error.

### Pipeline

1. **Extract audio** — 16 kHz mono WAV. ASR models want mono 16 kHz; anything
   else wastes bytes and can hurt accuracy.
2. **Silence map** — `silencedetect=noise=-30dB:d=1.5` finds pauses. This is
   used to *skip* dead air and to place chunk cuts at natural pauses.
3. **Chunk plan** — `plan_chunks.py` merges speech into ~120 s windows, cutting
   only at silence so no word is split. Pure-silence spans are dropped.
4. **Parallel transcription** — each chunk is sliced and POSTed to
   `/v1/audio/transcriptions`. ~3 concurrent requests is a good default; OMLX
   tends to serialize heavy work, so more concurrency yields little.
5. **Assembly** — chunks are ordered and prefixed with `[mm:ss–mm:ss]`.

## Timestamp and attribution limits

- **No timestamps.** parakeet returns `{"text": ...}` with no word/segment
  timings. Reconstruct timestamps from chunk offsets. For tighter timing, shrink
  legacy `--chunk-sec` or bounded `chunk_seconds` at the cost of more requests.
  Bounded mode still enforces its 120-chunk limit.
- **No speaker diarization.** The transcript cannot tell you *who* spoke. For a
  multi-person meeting, attribution must come from another source (the Teams
  meeting chat, calendar attendees, or on-screen name tags). Do not invent
  speaker labels.

## Quality tips

- **Jargon errors are normal.** Expect product names, acronyms, and code terms
  to be mistranscribed (e.g. "agenic", "1.js", garbled tool names). Correct
  them against ground truth — the slide deck, repo names, or a known glossary —
  before publishing. Never "clean up" a transcript into claims it does not
  support.
- **Silence threshold.** If chunks are getting cut mid-sentence, lower the
  sensitivity (`--silence-dur 2.0`) or raise `--silence-db` toward `-25`. If
  long monologues never split, do the opposite.
- **Chunk length.** 90–120 s balances timestamp granularity against request
  count. Very long chunks can exceed model context or produce run-on text.
- **Empty/echoed chunks.** A chunk that is almost all silence can transcribe to
  a stray word ("Hello?") or repeat filler. Skipping silence (the default)
  largely avoids this; if you still see it, tighten the silence detection.

## Model selection

`transcribe.py` auto-discovers a model from `/v1/models`, preferring an id
containing `parakeet`, then `asr` / `whisper` / `canary`. Override with
`--model`. This script's name-based discovery differs from the CLI's capability
discovery. Neither workflow publishes speaker labels or word timestamps.

## Parakeet vs. gemma `input_audio`

OMLX gemma-4 also accepts an `input_audio` part and can transcribe. In testing
it was genuinely good — comparable accuracy on both clear speech and jargon
(`x64`, `ARM64`, `GitHub`), with **cleaner punctuation and capitalization**
(e.g. "DevBoxes"). But **parakeet remains the default** for bulk transcription:

- **Faster** (sub-second vs 2–4 s per clip) — compounds across many chunks.
- **Simpler, scalable API** — multipart file upload with no size ceiling.
  gemma needs base64-in-JSON (~1 MB per 25 s), so a full talk can't go in one
  call; you'd have to chunk anyway.
- **More literal** — gemma occasionally smooths or drops a word, or hallucinates
  a phrase; parakeet stays closer to the raw utterance.

Use gemma `input_audio` when you want **cleaner short-clip transcription**, or to
**reason about audio directly** (summarize, answer a question, gauge tone) in a
single call — something parakeet (pure ASR) can't do.

## Cross-referencing frames

Because both the transcript timestamps and the frame filenames (see
`references/frames.md`) are on the original video timeline, you can line up "the
speaker demos X at 34:59" with the frame captured at 34:59. Keep timelines
aligned — do not silence-*remove* the audio, only skip silence for
transcription.
