---
name: image-gen
description: Create or generatively edit images into saved PNG files with local OMLX models. Not for image analysis, screenshot explanations, or ordinary resizing and conversion.
---

# OMLX Images

Resolve `<plugin-root>` as two directories above this installed skill directory.
The bundled helper needs Node.js 22.18+ and a running OMLX instance, not MCP or a
dependency install. Configure `OMLX_BASE_URL` and optional `OMLX_API_KEY` through
the environment; default endpoint is `http://127.0.0.1:8000`.

1. Write a finished visual prompt. For edits, state what must change and what
   must stay, including identity, pose, crop, text, and privacy blur.
2. Write a JSON argument file in the workspace with `prompt` and a new absolute
   `.png` `output` path. Run:

   ```sh
   node "<plugin-root>/scripts/media.mjs" image --input-json <arguments.json>
   ```

3. Omit `sources` to generate. Include absolute read-only `sources` paths to
   edit; optional `mask` is an absolute PNG/JPEG/WebP path. Sources are never
   modified. The helper refuses existing outputs and selects a loaded capable
   model unless `model` is supplied.
4. Optional fields: `size` (`auto`, `square`, `portrait`, `landscape`, or
   `WIDTHxHEIGHT`), `variants` (1–4). Generation permits `advanced.quality`
   (`standard`, `hd`, `quality`) and `advanced.style` (`natural`, `vivid`).
   Editing permits `strength` (0–1), `advanced.steps` (positive integer), and
   `advanced.guidance` (nonnegative number). Do not mix operation-specific fields.
5. Inspect the saved result. Retry only with a deliberate prompt or parameter
   change and a new output path. Return the saved image and chosen model.

The Python helpers remain available for standalone skill use. Read
[references/generation.md](references/generation.md) or
[references/editing.md](references/editing.md) only if that fallback is needed.
