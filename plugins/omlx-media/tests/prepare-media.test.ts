import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { prepareFrames } from "../src/prepare-frames.ts";
import { prepareRecording } from "../src/prepare-recording.ts";
import { OmlxClient } from "../src/omlx-client.ts";
import { runMediaProcess } from "../src/media-io.ts";

const haveFFmpeg = ["ffmpeg", "ffprobe"].every((command) =>
  spawnSync(command, ["-version"], { timeout: 2000, stdio: "ignore" }).status === 0);

const FrameManifest = Type.Object({
  source_video_range: Type.Object({ start: Type.Number(), end: Type.Number() }),
  frames: Type.Array(Type.Object({ requested_seconds: Type.Number(), file: Type.String() })),
});

test("synthetic 1fps source yields the covering frame across all 24 requests, including after final PTS", { skip: !haveFFmpeg }, async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "media-cover-")));

  try {
    const input = path.join(root, "synthetic.mkv");
    const signal = AbortSignal.timeout(20_000);
    await runMediaProcess("ffmpeg", [
      "-nostdin", "-v", "error", "-n", "-f", "lavfi", "-i", "testsrc2=size=160x120:rate=1",
      "-t", "4", "-c:v", "mpeg4", "-g", "100", "-threads", "1", input,
    ], signal);
    const original = await readFile(input);
    const result = await prepareFrames({ input, output_dir: path.join(root, "frames") });
    const manifest: unknown = JSON.parse(await readFile(result.manifest, "utf8"));
    assert.ok(Value.Check(FrameManifest, manifest));
    assert.deepEqual(manifest.source_video_range, { start: 0, end: 4 });
    assert.equal(manifest.frames.length, 24);

    const reference = await runMediaProcess("ffmpeg", [
      "-nostdin", "-v", "error", "-i", input, "-vf", "format=rgb24", "-threads", "1", "-f", "framemd5", "-",
    ], signal);

    const hashes = reference.split("\n").filter((line) => line.startsWith("0,")).map((line) => line.split(",").at(-1)?.trim());

    for (const frame of manifest.frames) {
      const pixels = await runMediaProcess("ffmpeg", [
        "-nostdin", "-v", "error", "-i", frame.file, "-vf", "format=rgb24", "-threads", "1", "-f", "framemd5", "-",
      ], signal);

      assert.equal(pixels.trim().split(",").at(-1)?.trim(), hashes[Math.floor(frame.requested_seconds)]);
    }

    assert.deepEqual(await readFile(input), original);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invocation cancellation records incomplete failure and refuses further media work", async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "media-cancel-")));
  const input = path.join(root, "input.fixture");
  await writeFile(input, "fixture");
  const controller = new AbortController();
  const output_dir = path.join(root, "frames");

  try {
    await assert.rejects(prepareFrames({ input, output_dir }, {
      processRunner: async (command, args, signal) => {
        if (command === "ffprobe") return JSON.stringify({
          format: { duration: "4" },
          streams: [{ index: 0, codec_type: "video", width: 160, height: 120, duration: "4" }],
        });

        if (args.includes("-version")) return "fixture";
        controller.abort();

        return runMediaProcess("ffmpeg", ["-version"], signal);
      },
    }, controller.signal), /cancelled.*Incomplete artifacts retained/);
    const record = JSON.parse(await readFile(path.join(output_dir, "failure.json"), "utf8"));
    assert.equal(record.error.code, "CANCELLED");
    await assert.rejects(stat(path.join(output_dir, "manifest.json")), { code: "ENOENT" });
    const cancelled = new AbortController();
    cancelled.abort();
    await assert.rejects(prepareRecording({ input, output_dir: path.join(root, "aborted") }, {
      processRunner: async () => { throw new Error("Already cancelled preparation must not spawn"); },
      fetchImplementation: async () => { throw new Error("Already cancelled preparation must not transmit"); },
    }, cancelled.signal), /cancelled/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recording request deadlines include streamed response bodies and accept literal IPv6 loopback", async () => {
  const server = createServer((_request, response) => {
    response.setHeader("content-type", "application/json");
    response.write('{"models":[');
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    assert.ok(Value.Check(Type.Object({ port: Type.Integer() }), address));

    const client = new OmlxClient({ OMLX_BASE_URL: `http://127.0.0.1:${address.port}` }, fetch, {
      recording: { allowRemote: false }, requestTimeoutMs: 50, maxResponseBytes: 1024 ** 2,
    });

    await assert.rejects(client.selectAudioModel("transcription"), /response exceeded its deadline/);

    const ipv6 = new OmlxClient({ OMLX_BASE_URL: "http://[::1]:8000" }, async (_url, init) => {
      assert.equal(init?.redirect, "error");

      return Response.json({ models: [{ id: "stt", model_type: "audio_stt", loaded: false }] });
    }, { recording: { allowRemote: false } });

    assert.equal(await ipv6.selectAudioModel("transcription"), "stt");
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
