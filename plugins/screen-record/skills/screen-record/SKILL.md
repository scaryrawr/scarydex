---
name: screen-record
description: >-
  Record agent-driven screen demos and edit video or audio with local FFmpeg.
  Use for screen recording or desktop capture while computer-use tools drive a
  workflow; trimming setup or dead time; putting videos side by side; adding
  captions or subtitles; generating local text-to-speech narration; or mixing
  and dubbing demo audio. Not for transcribing recordings, extracting
  documentation from meetings, or uploading and publishing media.
---

# Screen recording workflow

Resolve all bundled `scripts/` and `references/` paths relative to this
installed skill directory, not the workspace. Keep generated outputs in the
user’s workspace.


Keep source recordings and edited outputs in the user's workspace. Never
overwrite a source recording. Run `node scripts/screen-record.mjs doctor --capture-only` before
the first capture in a session.

Read exactly one capture reference for the current host:

- Windows: `references/windows.md`
- macOS: `references/macos.md`
- Linux: `references/linux.md`

## Prepare

1. Get the intended audience, outcome, approximate length, output path, and
   whether the demo needs microphone audio, captions, or narration. For a
   comparison, read the [evidence-video standard](references/editing.md#evidence-video-standard)
   and plan its layout and source receipts.
2. Write a concise shot list. Prepare and rehearse the application before
   recording. Silence notifications and remove credentials or private data.
3. Use the host's available computer-use tools for application interaction.
   This plugin does not provide them. If none are available, let the user drive
   the application. Do not use shell or window-manager focus workarounds.

## Capture

1. Require an explicit screen-capture request. Require separate approval for
   microphone audio. Discovery can prompt for OS permissions, but never grant
   or bypass those permissions without user approval.
   Discover inputs when needed with `node scripts/screen-record.mjs devices --json`.
   On Windows, `windows --json` lists visible non-minimized windows. Titles can
   contain private document names. Listing neither captures nor verifies
   privacy permission.
2. Start a managed recording:
   `node scripts/screen-record.mjs start --output <raw.mp4>`.
   Add platform-specific input options only as documented in the current host's
   reference. For a selected Windows window, pass `--window-id` from discovery.
   Do not combine it with `--region` or `--video-input`.
   Retain the returned `recordingId`, `statePath`, and `logPath`.
3. Drive the rehearsed shot list. Leave a short pause before the first action,
   after meaningful state changes, and before stopping.
4. Stop gracefully:
   `node scripts/screen-record.mjs stop --output <raw.mp4> --recording-id <retained-id>`.
   If interrupted or restarted, run `status --output <raw.mp4> --recording-id
   <retained-id>` before retrying. The detached recording survives a cancelled
   caller. If the start result was lost, inspect status and confirm it is the
   intended recording before recovering an ID. Never adopt a replacement ID.
   Stale state is read-only and requires inspection, not an automatic restart.
   Stop is idempotent after successful finalization. A timeout leaves the
   recording alone. Inspect state and logs, then obtain user approval before
   manual recovery. Never force-kill. Legacy recovery supports same-owner Unix
   state only and has no ID. Confirm the intended legacy recording explicitly
   before using its no-ID stop path. On Windows, stop legacy recordings with the
   pre-upgrade helper before upgrading; the new helper ignores legacy state
   because Node cannot verify its ownership there.
5. Inspect the raw file:
   `node scripts/screen-record.mjs probe --input <raw.mp4>`.

## Edit

Use `references/editing.md` for command options and subtitle/narration formats.

1. Read the [evidence-video standard](references/editing.md#evidence-video-standard)
   before editing a comparison. It defines layout, timing, provenance, and review.
2. Trim only irrelevant setup and idle time with `trim`. Preserve meaningful
   operation intervals, including waits for pending work. The simple
   `side-by-side` helper can cut off the longer clip, so use the reference's
   full-duration recipe when needed.
3. Add supplied or user-approved SRT captions with `subtitles`.
4. For narration, draft a short script grounded in visible behavior. Generate
   audio with `narrate`, then combine it with `dub`. `narrate` first checks the
   local OMLX endpoint, then falls back to SAPI on Windows, built-in `say` on
   macOS, or FFmpeg Flite on Linux. Use `voices` before selecting a non-default
   voice. Never clone a person's voice or imply that synthetic narration is a
   real speaker.
5. Probe the final file and inspect raw, intermediate, and final frames and
   motion. Preview with `ffplay <file>` when appropriate. Check duration,
   dimensions, audio presence, delivered-size readability, and private content.

Preserve the raw recording, previous derivatives, narration text, subtitle source, and final video so
the edit remains reproducible.
