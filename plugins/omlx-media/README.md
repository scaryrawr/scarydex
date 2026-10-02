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

The `blogify` and Python image fallback helpers additionally need `uv`; video
workflows need FFmpeg/ffprobe and image tools described in their skills. `uv` can
install script-declared packages and requires normal network/install approval.

## Usage

Ask for `image-gen`, `audio`, or `blogify`. Or create a JSON argument file and run:

```sh
node "<plugin-root>/scripts/media.mjs" image --input-json <arguments.json>
node "<plugin-root>/scripts/media.mjs" speech --input-json <arguments.json>
node "<plugin-root>/scripts/media.mjs" transcribe --input-json <arguments.json>
node "<plugin-root>/scripts/media.mjs" --help
```

Results are JSON. Errors go to stderr with nonzero exit status. Inputs/outputs
must use absolute paths and outputs must be new files. Existing outputs are
never overwritten; image sources remain read-only. Use workspace output paths.

The helper retains ScaryPilot’s model discovery, capability checks, operation
validation, authenticated local REST requests, and exclusive artifact writes.
The TypeBox dependency is bundled; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Real model/image/audio quality
requires manual verification on the user’s OMLX installation.
