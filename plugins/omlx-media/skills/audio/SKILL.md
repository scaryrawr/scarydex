---
name: audio
description: Generate local OMLX speech or transcribe an audio file into a saved transcript. Not for realtime microphone streaming or long-form video-to-document workflows.
---

# OMLX Audio

Use the bundled Node helper. Resolve `<plugin-root>` as two directories above
this installed skill directory. No MCP server or dependency install is needed.
The helper uses `OMLX_BASE_URL` (default `http://127.0.0.1:8000`) and optional
`OMLX_API_KEY`. Do not expose the key or send recordings to another service.

Write arguments to a temporary JSON file in the workspace, then run:

```sh
node "<plugin-root>/scripts/media.mjs" speech --input-json <arguments.json>
node "<plugin-root>/scripts/media.mjs" transcribe --input-json <arguments.json>
```

- Speech arguments: `input` (text), `output` (new absolute `.wav` path), optional
  `model`, `voice`, `language`, `speed`, `instructions`, `response_format`.
  Other formats are `mp3`, `opus`, `flac`, and `pcm`; match the output extension.
  Voice availability depends on the model. Never clone a person’s voice or imply
  synthetic speech is their actual recording.
- Transcription arguments: `input` (existing absolute audio path), `output` (new
  absolute `.txt` path), optional `model`, `language`, `prompt` (vocabulary).
- The helper selects a loaded audio model, or an installed model that OMLX loads
  on demand. It refuses to overwrite existing outputs and returns JSON with the
  chosen model, output file, and transcription text when applicable.

Inspect the output and report its absolute path. Keep files in the workspace.
For silence-aware chunking and approximate timestamps on long recordings, use
`blogify` instead. These scripts do not support realtime ASR or streamed playback.
