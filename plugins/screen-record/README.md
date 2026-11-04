# Screen Record for Codex

Record agent-driven desktop demos and edit videos with local FFmpeg. The port is
a skill and Node helper, not a Copilot extension or browser integration.

Install `screen-record@scarydex`, then start a new session. Node.js 22.18+,
FFmpeg, and ffprobe must be available. Screen/microphone capture requires the
user’s permission and host-specific OS permissions. Optional narration uses
OMLX or supported OS speech tools.

Ask “Use screen-record to record a short demo.” First run:

```sh
node "<skill-directory>/scripts/screen-record.mjs" doctor --capture-only
```

Read only the capture reference for the current host: macOS, Windows, or Linux.
Rehearse with available computer-use tools, capture with managed `start`/`stop`,
then write trims, captions, layouts, and narration to new outputs. Preserve the
source. This plugin does not install computer-use or browser capabilities.

Managed `start` returns a persistent `recordingId`, state path, and log path.
Retain the ID for `status` and `stop --recording-id <id>`. Recordings survive
caller cancellation and session restarts. Query status before retrying an
interrupted start. A mismatched ID never authorizes stopping a replacement.
Successful stop retains final state and is idempotent. A timeout leaves the
recording alone. Stale state needs inspection and user-approved manual recovery,
not a force kill or automatic restart.

Each worker writes state to its recording-ID-specific file. Output-based lookup
uses a separate reference, so a delayed old-worker publication cannot overwrite
a replacement recording's state. Use the returned `statePath` to inspect the full
state; previous generation files are retained.

Legacy recovery supports same-owner Unix state only. Confirm an ID-less legacy
recording before stopping it without an ID. Legacy workers delete their state
when they finish; the helper waits for their original worker and FFmpeg processes
to exit and never manufactures a recording ID. On Windows, stop legacy recordings
with the pre-upgrade helper before upgrading; the new helper ignores legacy state
because Node cannot verify its ownership there.

On Windows, `windows --json` lists visible, non-minimized, non-cloaked windows
without changing focus. Pass a returned `windowId` to `start --window-id <id>`.
This needs PowerShell and an FFmpeg build with gdigrab HWND support, normally
FFmpeg 7.0 or newer. IDs include process lifetime and window metadata, so
rediscover stale selections. Titles may contain private document names.
Discovery does not prove capture permission.

Comparisons follow the
[evidence-video standard](skills/screen-record/references/editing.md#evidence-video-standard).
It preserves operation timing and source provenance, with readable labeled
panels, timed highlights, and same-frame magnified detail when needed. The
full-duration recipe avoids the simple helper's shorter-clip cutoff.

See [the skill](skills/screen-record/SKILL.md), its platform references, and
[editing options](skills/screen-record/references/editing.md). The optional
[demo-producer prompt](references/agents/demo-producer.md) describes a specialist
workflow; it is not an unsupported agent registration. Do not actually capture
screens merely to test installation.
