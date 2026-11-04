# Windows capture

The managed recorder uses FFmpeg `gdigrab` for the screen and DirectShow
(`dshow`) for optional audio.

## Preflight

Run:

```text
node scripts/screen-record.mjs doctor --capture-only
node scripts/screen-record.mjs devices --json
```

`devices` prints DirectShow device names. Copy an audio device name exactly.
Windows may prompt for microphone privacy permission. `gdigrab` does not require
a camera device.

Before upgrading, stop any legacy recordings with the pre-upgrade helper. The
new helper ignores legacy state on Windows because Node cannot verify its
ownership; legacy recovery is limited to same-owner Unix state.

For a selected application window, run `node scripts/screen-record.mjs windows --json`.
It lists visible, non-minimized, non-cloaked top-level windows without focusing
or capturing them. Titles may expose private document names. Discovery does
not verify OS capture permission. PowerShell and gdigrab HWND support are
required, normally FFmpeg 7.0 or newer.

## Capture

Capture the full virtual desktop:

```text
node scripts/screen-record.mjs start --output raw.mp4
```

Capture a region:

```text
node scripts/screen-record.mjs start --output raw.mp4 --region 100,80,1280,720
```

Capture a selected window using an ID returned by discovery:

```text
node scripts/screen-record.mjs start --output raw.mp4 --window-id <windowId>
```

The helper revalidates window identity before the detached worker starts.
A renamed, closed, or replaced window can invalidate the selection.
Rediscover rather than guessing handles or titles. Do not combine `--window-id`
with `--region` or `--video-input`. Retain the returned `recordingId` for
status and stop. Screen and microphone approval remain separate.

Capture a microphone:

```text
node scripts/screen-record.mjs start --output raw.mp4 \
  --audio-device "Microphone (device name)"
```

The region is `x,y,width,height` in virtual-desktop coordinates. Keep width and
height even for H.264 output. A negative x-coordinate can address a monitor to
the left of the primary display.

DirectShow audio captures the named input. Desktop/system audio requires a
loopback device exposed by the installed audio driver; do not assume one exists.

## Narration

Narration first checks the local OMLX endpoint. When OMLX is unavailable,
Windows falls back to installed SAPI voices:

```text
node scripts/screen-record.mjs voices
node scripts/screen-record.mjs narrate --text-file narration.txt \
  --output narration.wav --voice "Microsoft Mark" --rate 1
```

Use `--engine sapi` to select SAPI explicitly. The system default voice is used
when `--voice` is omitted. SAPI narration is local and does not send text to a
service.

Reference: [FFmpeg `gdigrab` and `dshow` devices](https://ffmpeg.org/ffmpeg-devices.html).
