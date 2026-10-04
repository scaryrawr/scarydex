#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# ///
"""Verify a highlights JSON + takeaways markdown against the timestamped transcript.

Catches the two failure modes local models actually produce:
1. Clip bounds that drift outside the transcript chunk windows they cite.
2. "Verbatim" quotes that were quietly cleaned up (disfluencies dropped, words
   reordered) — every word must appear, in order, in the transcript; only
   punctuation/spacing/case may differ.

Usage:
  uv run scripts/verify_reel.py --transcript {transcript.md} --highlights {highlights.json}
      [--takeaways {takeaways.md}] [--fix] [--pad 15]

--fix snaps out-of-window clip bounds into the nearest containing chunk window
(rewrites the highlights file). Quotes are never auto-fixed: a flagged quote
means re-extract it from the transcript verbatim.

Exit code 0 when everything passes (after any --fix), 1 otherwise.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

CHUNK_RE = re.compile(r"\[(\d+):(\d+)(?:[:–-](\d+):(\d+))?\]")


def parse_windows(transcript_text: str) -> list[tuple[float, float]]:
    windows: list[tuple[float, float]] = []
    for m in CHUNK_RE.finditer(transcript_text):
        start = int(m.group(1)) * 60 + int(m.group(2))
        if m.group(3) is not None:
            end = int(m.group(3)) * 60 + int(m.group(4))
        else:
            continue
        windows.append((float(start), float(end)))
    return windows


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def snap(start: float, end: float, windows: list[tuple[float, float]], pad: float):
    for a, b in windows:
        if start >= a - pad and end <= b + pad:
            return max(start, a), min(end, b), True
    # nearest window: clamp into it
    best = min(windows, key=lambda w: min(abs(start - w[0]), abs(end - w[1])))
    return best[0], best[1], False


def main() -> None:
    ap = argparse.ArgumentParser(description="Verify highlight reel metadata against transcript.")
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--highlights", required=True)
    ap.add_argument("--takeaways", default="")
    ap.add_argument("--fix", action="store_true")
    ap.add_argument("--pad", type=float, default=15.0)
    args = ap.parse_args()

    tpath = Path(args.transcript).expanduser()
    transcript = tpath.read_text(encoding="utf-8")
    windows = parse_windows(transcript)
    cj = tpath.parent / "chunks.json"
    if windows and cj.is_file():
        try:
            rich = [(float(c["start"]), float(c["end"]))
                   for c in json.loads(cj.read_text(encoding="utf-8"))]
            if len(rich) > len(windows):
                windows = rich
        except (ValueError, KeyError, TypeError):
            pass
    if not windows:
        sys.exit("error: no [start-end] chunk headers found in transcript")
    tn = norm(transcript)

    clips = json.loads(Path(args.highlights).expanduser().read_text(encoding="utf-8"))
    problems = 0

    for clip in clips:
        st, en = float(clip["start_sec"]), float(clip["end_sec"])
        if en - st > 240:
            print(f"LONG  {clip.get('title','')[:40]} ({en - st:.0f}s > 240s)")
            problems += 1
        if any(st >= a - args.pad and en <= b + args.pad for a, b in windows):
            clip["verified"] = True
        else:
            new_st, new_en, snapped = snap(st, en, windows, args.pad)
            clip["start_sec"], clip["end_sec"] = int(new_st), int(new_en)
            clip["verified"] = bool(snapped)
            print(f"SNAP  {clip.get('title','')[:40]} {st:.0f}-{en:.0f} -> {new_st:.0f}-{new_en:.0f}")
            problems += 1

    if args.fix and problems:
        Path(args.highlights).expanduser().write_text(json.dumps(clips, indent=2) + "\n", encoding="utf-8")
        print(f"wrote fixed {args.highlights}")

    if args.takeaways:
        md = Path(args.takeaways).expanduser().read_text(encoding="utf-8")
        quotes = [q for q in re.findall(r'[\u201c"]([^\u201c"\n`]{8,})[\u201d"]', md)]
        bad = [q for q in quotes if norm(q) not in tn]
        for q in bad:
            print(f"QUOTE not verbatim: {q[:80]}")
        print(f"quotes: {len(quotes) - len(bad)}/{len(quotes)} verbatim")
        problems += len(bad)

    ok = all(c.get("verified", True) for c in clips) and problems == 0
    print("PASS" if ok else "FAIL")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
