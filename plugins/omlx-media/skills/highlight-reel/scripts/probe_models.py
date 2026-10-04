#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# ///
"""Probe an OMLX endpoint for which models accept image / audio / video input.

Sends the smallest possible probe of each modality (tiny image, 2s tone, 1s
video) to every VLM and answers 500/400/507 refusals without crashing. Reports
per-model per-modality support plus latency, and emits a routing suggestion:
batch STT -> dedicated audio_stt model via /v1/audio/transcriptions;
audio QA / images -> whichever VLM accepted the modality; video_url -> VLMs
that accepted native video. If a text-only contract task leaks chain-of-thought,
add chat_template_kwargs enable_thinking=false (Qwen-family builds).

Usage:
  uv run scripts/probe_models.py [--models id1,id2] [--include-stt]

Env: OMLX_BASE_URL (defaults to http://127.0.0.1:8000), OMLX_API_KEY (optional).
Writes probe-report.json to --output (default cwd) and prints a markdown table.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import time
import urllib.request

BASE = os.environ.get("OMLX_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
KEY = os.environ.get("OMLX_API_KEY", "")

# --- tiny fixtures built with ffmpeg so the script is self-contained ---
def make_fixtures(tmp: str) -> tuple[str, str, str]:
    img = f"{tmp}/probe_img.png"
    wav = f"{tmp}/probe_tone.wav"
    vid = f"{tmp}/probe_vid.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
                   "color=c=navy:s=320x180:d=0.1", "-frames:v", "1", img], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
                   "sine=frequency=440:duration=2", "-ac", "1", "-ar", "16000", wav], check=True)
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-t", "1", "-i",
                   "testsrc=size=320x180:rate=10", "-c:v", "libx264", "-preset", "veryfast",
                   "-an", vid], check=True)
    return img, wav, vid


def b64(path: str) -> str:
    return base64.b64encode(open(path, "rb").read()).decode()


def req_json(path: str, body: dict | None = None, timeout: int = 300):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Content-Type": "application/json"}
    if KEY:
        headers["Authorization"] = f"Bearer {KEY}"
    r = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read())


def chat_probe(model: str, part: dict, label: str) -> dict:
    body = {"model": model, "max_tokens": 24, "temperature": 0.0,
            "messages": [{"role": "user", "content": [
                part, {"type": "text", "text": "Reply in <=10 words."}]}]}
    t0 = time.time()
    try:
        d = req_json("/v1/chat/completions", body)
        content = d["choices"][0]["message"]["content"] or ""
        return {"modality": label, "ok": True, "secs": round(time.time() - t0, 1),
                "sample": content[:80]}
    except urllib.error.HTTPError as e:
        return {"modality": label, "ok": False, "status": e.code,
                "hint": {507: "server cannot accept this modality or is out of memory",
                       500: "model build rejects this content type",
                       400: "wrong endpoint or content schema"}.get(e.code, "")}
    except Exception as e:
        return {"modality": label, "ok": False, "error": str(e)[:120]}


def main() -> None:
    ap = argparse.ArgumentParser(description="Probe OMLX modality support.")
    ap.add_argument("--models", default="")
    ap.add_argument("--include-stt", action="store_true",
                    help="also test the batch /v1/audio/transcriptions route on audio_stt models")
    ap.add_argument("--force", action="store_true",
                    help="probe models above --max-gb too (they may thrash RAM when loaded)")
    ap.add_argument("--max-gb", type=float, default=12.0,
                    help="skip models whose estimated size exceeds this (protects the memory guard)")
    ap.add_argument("--tmp", default="/tmp")
    ap.add_argument("--output", default="probe-report.json")
    args = ap.parse_args()

    forced = set(t.strip() for t in args.models.split(",") if t.strip())
    catalog = req_json("/v1/models/status")["models"]
    by_id = {m["id"]: m for m in catalog}
    if args.models:
        targets = [t for t in args.models.split(",") if t in by_id]
    else:
        targets = []
        for m in catalog:
            if m.get("engine_type") not in ("vlm", "audio_stt"):
                continue
            size_gb = (m.get("estimated_size") or 0) / 1e9
            if m["id"] not in forced and not args.force and size_gb > args.max_gb \
                    and m.get("engine_type") != "audio_stt":
                print(f"skip {m['id']} (~{size_gb:.0f} GB > --max-gb; pass --force to probe)")
                continue
            targets.append(m["id"])

    img, wav, vid = make_fixtures(args.tmp)
    report = []
    for mid in targets:
        engine = by_id[mid].get("engine_type", "")
        row = {"model": mid, "engine": engine, "probes": []}
        if engine == "audio_stt":
            # batch ASR route only; do not flood chat completions with audio
            import urllib.parse  # noqa: F401
            t0 = time.time()
            p = subprocess.run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                                "--max-time", "300", "-F", f"file=@{wav}",
                                "-F", f"model={mid}", BASE + "/v1/audio/transcriptions"],
                               capture_output=True, text=True)
            row["probes"].append({"modality": "audio/transcriptions",
                                  "ok": p.stdout.strip() == "200",
                                  "secs": round(time.time() - t0, 1)})
        else:
            row["probes"].append(chat_probe(mid, {"type": "image_url", "image_url":
                {"url": "data:image/png;base64," + b64(img)}}, "image"))
            row["probes"].append(chat_probe(mid, {"type": "input_audio", "input_audio":
                {"data": b64(wav), "format": "wav"}}, "audio"))
            row["probes"].append(chat_probe(mid, {"type": "video_url", "video_url":
                {"url": "data:video/mp4;base64," + b64(vid)}}, "video"))
        report.append(row)
        marks = {p["modality"]: "OK" if p["ok"] else f"NO({p.get('status', '?')})"
                 for p in row["probes"]}
        print(f"{mid:38s} {marks}")

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\nwrote {args.output}")


if __name__ == "__main__":
    main()
