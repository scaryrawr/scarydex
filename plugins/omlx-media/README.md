# OMLX Media for Codex

Local image generation/editing, speech generation, transcription, and grounded
recording-to-document workflows. Skills call scripts; no MCP server, Copilot SDK,
or host extension is required.

## Install and prerequisites

Install `omlx-media@scarydex`, then start a new session. The checked-in
`scripts/media.mjs` runs on Node.js 22.18+ without npm install. Set
`OMLX_BASE_URL` (default `http://127.0.0.1:8000`) and optional `OMLX_API_KEY` in the
execution environment. OMLX must already be running with appropriate models.
Do not commit or display credentials. No credentials are embedded in the plugin.

Local OMLX inference requires macOS on Apple Silicon. The HTTP client can run
on Windows or Linux against an explicitly configured remote OMLX server.
Recording transcription requires recording-specific remote consent. Sending
transcripts or frames to a hosted author or classifier requires separate consent.

Recording and frame preparation need FFmpeg and ffprobe. Optional `blogify`
classification and Python image fallback helpers need `uv`. Legacy image
deduplication and cropping also need ImageMagick. `uv` can
install script-declared packages and requires normal network/install approval.
In sandboxes that cannot write uv's default cache (`~/.cache/uv`), every `uv`
command fails at startup with `Failed to initialize cache` / `Operation not
permitted`. Run `export UV_CACHE_DIR="${TMPDIR:-/tmp}/uv-cache"` and the `uv`
commands in the same shell invocation. The export does not persist across
independent shell-tool calls; for those, pass
`uv --cache-dir "${TMPDIR:-/tmp}/uv-cache"` on every invocation.

## Usage

Ask for `image-gen`, `audio`, `blogify`, or `highlight-reel`. Or create a JSON argument file and run:

```sh
node "<plugin-root>/scripts/media.mjs" image --input-json <arguments.json>
node "<plugin-root>/scripts/media.mjs" speech --input-json <arguments.json>
node "<plugin-root>/scripts/media.mjs" transcribe --input-json <arguments.json>
node "<plugin-root>/scripts/media.mjs" prepare-frames --input-json <arguments.json>
node "<plugin-root>/scripts/media.mjs" --help
```

Results are JSON. Errors go to stderr with nonzero exit status. Inputs/outputs
must use absolute paths and outputs must be new files. Existing outputs are
never overwritten; image sources remain read-only. Use workspace output paths.

For a recording, pass `input` and a fresh `output_dir` to `transcribe`, instead
of `output`. It saves mono 16 kHz WAV chunks, `transcript.md`, `chunks.json`, and
`manifest.json`. Chunk offsets are not word timestamps or speaker labels.
Use `prepare-frames` with `input` and a different fresh `output_dir` for periodic
samples or explicit `seconds`. It does not classify, rank, or deduplicate frames.
Use `format: "jpeg"` for `.jpg` files accepted by the optional classifier.

Preparation accepts nonempty sources up to 4 GiB and 2 hours. Output directories
must be outside the plugin, must not exist, and must have an existing parent.
The total deadline defaults to 600 seconds. Recording mode has at most 120
serial chunks and 120-second requests. It requires a literal loopback endpoint
unless the user approves `allow_remote: true`, and never follows redirects.
Frame preparation has at most 120 frames and 256 megapixels of total output.
It preserves fractional requested timestamps in the manifest, not measured PTS.
Failures retain partial files and `failure.json`, without a complete manifest.
Retry into a new directory. See the [transcription reference](skills/blogify/references/transcription.md)
and [frame reference](skills/blogify/references/frames.md) for options and limits.

The helper retains ScaryPilot’s model discovery, capability checks, operation
validation, authenticated local REST requests, and exclusive artifact writes.
The TypeBox dependency is bundled; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Real model/image/audio quality
requires manual verification on the user’s OMLX installation.
