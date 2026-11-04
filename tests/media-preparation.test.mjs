import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, test } from "node:test";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const roots = [];

const servers = [];

const shim = fileURLToPath(new URL("./fixtures/media-spawn.mjs", import.meta.url));

const metadata = {
  format: { duration: "12", start_time: "0" },
  streams: [
    { index: 0, codec_type: "video", width: 320, height: 180, duration: "12" },
    { index: 1, codec_type: "audio", sample_rate: "16000", duration: "12" },
  ],
};

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function fixture(probe = metadata) {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "media-preparation-")));
  roots.push(root);
  const plugin = path.join(root, "plugin");
  await mkdir(path.join(plugin, "scripts"), { recursive: true });
  const helper = path.join(plugin, "scripts", "media.mjs");
  await copyFile(new URL("../plugins/omlx-media/scripts/media.mjs", import.meta.url), helper);
  const input = path.join(root, "source.fixture");
  await writeFile(input, JSON.stringify(probe));

  return {
    root, plugin, input,
    invoke: (operation, args, environment = {}, onSpawn) => new Promise((resolve, reject) => {
      const child = spawn("node", ["--import", shim, helper, operation, "--json", JSON.stringify({ input, ...args })], {
        env: { ...process.env, OMLX_BASE_URL: "http://127.0.0.1:1", OMLX_API_KEY: "", ...environment },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "", stderr = "";
      const timer = setTimeout(() => child.kill(), 15_000);
      child.stdout.on("data", (part) => { stdout += part; });
      child.stderr.on("data", (part) => { stderr += part; });
      child.once("error", reject);
      child.once("close", (code) => {
        clearTimeout(timer);
        resolve({ code, stdout, stderr });
      });

      onSpawn?.(child);
    }),
  };
}

async function service({ reply, redirect, hang, models } = {}) {
  const requests = [], uploads = [], headers = [];

  const server = createServer(async (request, response) => {
    requests.push(request.url);
    headers.push(request.headers.authorization);

    if (request.url === "/v1/models/status") {
      if (hang === "models") return;
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(models ?? { models: [{ id: "fixture-stt", engine_type: "audio_stt", loaded: true }] }));

      return;
    }

    const parts = [];

    for await (const part of request) parts.push(Buffer.from(part));
    uploads.push(Buffer.concat(parts));

    if (redirect) { response.writeHead(307, { location: redirect }).end();

 return; }

    if (hang === "headers") return;
    response.setHeader("content-type", "application/json");

    if (hang === "body") { response.write('{"text":"');

 return; }

    response.end(reply ? reply(uploads.length) : JSON.stringify({ text: `Chunk ${uploads.length}.` }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  servers.push(server);
  const address = server.address();
  assert.ok(Value.Check(Type.Object({ port: Type.Integer() }), address));

  return { requests, uploads, headers, environment: { OMLX_BASE_URL: `http://127.0.0.1:${address.port}`, OMLX_API_KEY: "fixture-auth" } };
}

async function failure(result, code, directory) {
  assert.equal(result.code, 1, result.stderr);
  assert.match(result.stderr, code);
  assert.equal(result.stdout, "");

  if (directory) {
    const record = JSON.parse(await readFile(path.join(directory, "failure.json"), "utf8"));
    assert.equal(record.status, "incomplete");
    assert.match(record.error.code, code);
    await assert.rejects(stat(path.join(directory, "manifest.json")), { code: "ENOENT" });

    return record;
  }
}

test("recording CLI saves bounded serial authenticated PCM uploads and source-relative metadata", async () => {
  const { root, input, invoke } = await fixture();
  const before = await readFile(input);
  const server = await service();
  const output_dir = path.join(root, "recording");
  const result = await invoke("transcribe", { output_dir, chunk_seconds: 10, language: "en", prompt: "Vocabulary" }, server.environment);
  assert.equal(result.code, 0, result.stderr);
  const saved = JSON.parse(result.stdout);
  assert.equal(saved.kind, "recording");
  assert.equal(saved.chunks, 2);
  assert.equal(saved.model, "fixture-stt");
  assert.deepEqual(server.headers, ["Bearer fixture-auth", "Bearer fixture-auth", "Bearer fixture-auth"]);
  assert.equal(server.uploads.length, 2);

  for (const upload of server.uploads) {
    assert.ok(upload.includes(Buffer.from("RIFF")));
    assert.ok(upload.includes(Buffer.from("Vocabulary")));
  }

  const manifest = JSON.parse(await readFile(saved.manifest, "utf8"));
  assert.equal(manifest.status, "complete");
  assert.equal(manifest.source, input);
  assert.deepEqual(manifest.chunks.map((chunk) => [chunk.start_seconds, chunk.end_seconds]), [[0, 10], [10, 12]]);
  assert.match(await readFile(saved.transcript, "utf8"), /not word or speaker timestamps/);
  assert.deepEqual((await readdir(output_dir)).sort(), ["chunk-001.wav", "chunk-002.wav", "chunks.json", "manifest.json", "transcript.md"]);
  assert.deepEqual(await readFile(input), before);
  assert.doesNotMatch(result.stdout + result.stderr, /fixture-auth/);
});

test("frame CLI keeps fractional timestamps, unrotated crop, bounded dimensions and JPEG compatibility", async () => {
  const { root, input, invoke } = await fixture();
  const before = await readFile(input);
  const output_dir = path.join(root, "frames");

  const result = await invoke("prepare-frames", { output_dir, seconds: [1.1, 1.4, 11.999], width: 160,
    crop: { x: 20, y: 10, width: 200, height: 100 }, format: "jpeg" });

  assert.equal(result.code, 0, result.stderr);
  const saved = JSON.parse(result.stdout);
  assert.equal(saved.classification_script_compatible, true);
  const manifest = JSON.parse(await readFile(saved.manifest, "utf8"));
  assert.deepEqual(manifest.frames.map((frame) => frame.requested_seconds), [1.1, 1.4, 11.999]);
  assert.deepEqual(manifest.dimensions, { width: 160, height: 80 });
  assert.deepEqual(manifest.frames.map((frame) => path.basename(frame.file)),
    ["t_000m01s_f0000.jpg", "t_000m01s_f0001.jpg", "t_000m12s_f0002.jpg"]);
  const extracted = JSON.parse(await readFile(manifest.frames[0].file, "utf8"));

  for (const flag of ["-n", "-noautorotate", "-noaccurate_seek", "-protocol_whitelist"]) assert.ok(extracted.request.includes(flag));
  assert.match(extracted.request[extracted.request.indexOf("-vf") + 1], /crop=200:100:20:10:exact=1,scale=160:80/);
  assert.deepEqual(await readFile(input), before);
});

test("default frame sampling is 24 start-inclusive end-exclusive samples without upscaling", async () => {
  const { root, invoke } = await fixture();
  const result = await invoke("prepare-frames", { output_dir: path.join(root, "default") });
  assert.equal(result.code, 0, result.stderr);
  const saved = JSON.parse(result.stdout);
  assert.equal(saved.frames, 24);
  assert.equal(saved.format, "png");
  assert.equal(saved.classification_script_compatible, false);
  const manifest = JSON.parse(await readFile(saved.manifest, "utf8"));
  assert.deepEqual(manifest.dimensions, { width: 320, height: 180 });
  assert.equal(manifest.frames[0].requested_seconds, 0);
  assert.equal(manifest.frames.at(-1).requested_seconds, 11.5);
});

test("selected stream extent and delayed origins govern recording and frame work, not container length", async () => {
  const probe = {
    format: { duration: "90", start_time: "10" },
    streams: [
      { index: 0, codec_type: "video", width: 320, height: 180, start_time: "12", fixture_duration: 4 },
      { index: 1, codec_type: "audio", start_time: "13", fixture_duration: 10 },
    ],
  };

  const { root, invoke } = await fixture(probe);
  const server = await service();
  const audio = await invoke("transcribe", { output_dir: path.join(root, "audio") }, server.environment);
  assert.equal(audio.code, 0, audio.stderr);
  const recording = JSON.parse(await readFile(JSON.parse(audio.stdout).manifest, "utf8"));
  assert.deepEqual(recording.source_audio_range, { start: 3, end: 13 });
  const frames = await invoke("prepare-frames", { output_dir: path.join(root, "video"), max_frames: 2 });
  assert.equal(frames.code, 0, frames.stderr);
  const video = JSON.parse(await readFile(JSON.parse(frames.stdout).manifest, "utf8"));
  assert.deepEqual(video.source_video_range, { start: 2, end: 6 });
  assert.deepEqual(video.frames.map((frame) => frame.requested_seconds), [2, 4]);
  await failure(await invoke("prepare-frames", { output_dir: path.join(root, "early"), seconds: [1] }), /INVALID_RANGE/);
  await failure(await invoke("transcribe", { output_dir: path.join(root, "extent") },
    { ...server.environment, MEDIA_FIXTURE_MODE: "incomplete-extent" }), /INVALID_MEDIA/);
});

test("recording-only options, conflicting outputs and bounded frame shapes fail before side effects", async () => {
  const { root, invoke } = await fixture();

  for (const extra of [{ chunk_seconds: 60 }, { timeout_seconds: 600 }, { allow_remote: false }]) {
    await failure(await invoke("transcribe", { output: path.join(root, "legacy.txt"), ...extra }), /Invalid transcription arguments/);
  }

  await failure(await invoke("transcribe", { output: path.join(root, "x.txt"), output_dir: path.join(root, "x") }), /Invalid transcription arguments/);

  for (const args of [{ max_frames: 0 }, { max_frames: 121 }, { seconds: [1, 1] }, { seconds: [1], start: 0 },
    { width: 4097 }, { crop: { x: 300, y: 0, width: 100, height: 10 } }, { start: 1, end: 1 },
    { seconds: [12] }, { timeout_seconds: 0 }, { format: "webp" }]) {
    await failure(await invoke("prepare-frames", { output_dir: path.join(root, "invalid"), ...args }), /Invalid frame preparation arguments|INVALID_(INPUT|CROP|RANGE)/);
  }

  await assert.rejects(stat(path.join(root, "invalid")), { code: "ENOENT" });
});

test("fresh directory ownership rejects existing paths, dangling symlinks, traversal, plugin aliases and missing parents", async () => {
  const { root, plugin, input, invoke } = await fixture();
  const before = await readFile(input);
  const existing = path.join(root, "existing");
  await mkdir(existing);
  await writeFile(path.join(existing, "keep"), "untouched");
  const alias = path.join(root, "plugin-alias");
  await symlink(plugin, alias, "dir");
  const dangling = path.join(root, "dangling");
  await symlink(path.join(root, "missing"), dangling, "dir");

  for (const [output_dir, code] of [[existing, /OUTPUT_CONFLICT/], [dangling, /OUTPUT_CONFLICT/],
    [path.join(plugin, "bad"), /PLUGIN_OUTPUT_FORBIDDEN/], [path.join(alias, "bad"), /PLUGIN_OUTPUT_FORBIDDEN/],
    [root + "/parent/../bad", /INVALID_PATH/], [path.join(root, "missing", "nested"), /INVALID_OUTPUT/], ["relative", /ABSOLUTE_PATH_REQUIRED/]]) {
    await failure(await invoke("prepare-frames", { output_dir, max_frames: 1 }), code);
  }

  assert.equal(await readFile(path.join(existing, "keep"), "utf8"), "untouched");
  assert.deepEqual(await readFile(input), before);
});

test("resource limits reject source duration, dimensions, chunk counts, work and source bytes before creating output", async () => {
  const { root, input, invoke } = await fixture();

  const cases = [
    ["prepare-frames", { ...metadata, format: { duration: "7201" } }, {}, /MEDIA_DURATION_LIMIT/],
    ["prepare-frames", { ...metadata, streams: [{ index: 0, codec_type: "video", width: 16384, height: 16384 }] }, {}, /MEDIA_DIMENSION_LIMIT/],
    ["transcribe", { format: { duration: "7200" }, streams: [{ index: 0, codec_type: "audio", duration: "7200" }] }, { chunk_seconds: 10 }, /CHUNK_COUNT_LIMIT/],
    ["prepare-frames", { format: { duration: "12" }, streams: [{ index: 0, codec_type: "video", width: 4096, height: 4096, duration: "12" }] }, { width: 4096, max_frames: 120 }, /FRAME_WORK_LIMIT/],
    ["transcribe", { ...metadata, streams: [metadata.streams[0]] }, {}, /NO_AUDIO_STREAM/],
    ["prepare-frames", { ...metadata, streams: [metadata.streams[1]] }, {}, /NO_VIDEO_STREAM/],
    ["prepare-frames", { format: { duration: "NaN" }, streams: [] }, {}, /INVALID_MEDIA/],
  ];

  for (const [operation, probe, args, code] of cases) {
    await writeFile(input, JSON.stringify(probe));
    await failure(await invoke(operation, { output_dir: path.join(root, "limited"), ...args }), code);
  }

  await truncate(input, 4 * 1024 ** 3 + 1);
  await failure(await invoke("prepare-frames", { output_dir: path.join(root, "large") }), /INVALID_INPUT/);
  await truncate(input, 0);
  await failure(await invoke("prepare-frames", { output_dir: path.join(root, "empty") }), /INVALID_INPUT/);
  await assert.rejects(stat(path.join(root, "limited")), { code: "ENOENT" });
});

test("remote endpoints require consent before any request and redirects never transmit onward", async () => {
  const { root, invoke } = await fixture();

  for (const endpoint of ["http://localhost:8000", "https://remote.invalid", "http://127.0.0.1.evil.invalid"]) {
    await failure(await invoke("transcribe", { output_dir: path.join(root, "remote") },
      { OMLX_BASE_URL: endpoint }), /REMOTE_ENDPOINT_FORBIDDEN/);
  }

  for (const endpoint of ["file:///tmp", "http://user:pass@127.0.0.1", "http://127.0.0.1?key=x"]) {
    await failure(await invoke("transcribe", { output_dir: path.join(root, "invalid-endpoint") },
      { OMLX_BASE_URL: endpoint }), /INVALID_ENDPOINT/);
  }

  const target = await service();
  const redirect = await service({ redirect: target.environment.OMLX_BASE_URL });
  const output_dir = path.join(root, "redirect");
  await failure(await invoke("transcribe", { output_dir }, redirect.environment), /OMLX_UNREACHABLE/, output_dir);
  assert.equal(target.requests.length, 0);

  const remote = await invoke("transcribe", { output_dir: path.join(root, "consented"), allow_remote: true },
    { ...target.environment, OMLX_BASE_URL: target.environment.OMLX_BASE_URL.replace("127.0.0.1", "localhost") });

  assert.equal(remote.code, 0, remote.stderr);
});

test("malformed discovery cannot use explicit-model fallback in recording mode", async () => {
  const { root, invoke } = await fixture();

  for (const [index, models] of [{ models: [] }, { models: "bad" }, { models: [{}] }, { models: [{ id: "", model_type: "audio_stt" }] }].entries()) {
    const server = await service({ models });
    const output_dir = path.join(root, `models-${index}`);
    await failure(await invoke("transcribe", { output_dir, model: "explicit" }, server.environment), /MODEL_NOT_FOUND|INVALID_MODEL_STATUS/);
    assert.equal(server.uploads.length, 0);
    await assert.rejects(stat(output_dir), { code: "ENOENT" });
  }
});

test("partial chunks retain completed text and extraction failures retain frames without a complete manifest", async () => {
  const { root, invoke } = await fixture();
  const server = await service({ reply: (index) => JSON.stringify({ text: index === 1 ? "Keep completed text." : "" }) });
  const output_dir = path.join(root, "partial");
  const record = await failure(await invoke("transcribe", { output_dir, chunk_seconds: 10 }, server.environment), /INVALID_RESPONSE/, output_dir);
  assert.equal(record.chunks[0].text, "Keep completed text.");
  assert.ok((await stat(path.join(output_dir, "chunk-002.wav"))).size > 44);
  const frames = path.join(root, "partial-frames");

  const saved = await failure(await invoke("prepare-frames", { output_dir: frames, max_frames: 2 },
    { MEDIA_FIXTURE_MODE: "fail-second-frame" }), /MEDIA_PROCESS_FAILED/, frames);

  assert.equal(saved.frames.length, 1);
  assert.equal(saved.artifacts.length, 1);
});

test("malformed and oversized response bodies retain incomplete artifacts", async () => {
  const { root, invoke } = await fixture();

  for (const [index, reply, code] of [
    [0, () => "not JSON", /INVALID_RESPONSE/], [1, () => JSON.stringify({ language: "en" }), /INVALID_RESPONSE/],
    [2, () => JSON.stringify({ text: "x".repeat(1024 ** 2) }), /RESPONSE_SIZE_LIMIT/],
  ]) {
    const server = await service({ reply });
    const output_dir = path.join(root, `response-${index}`);
    await failure(await invoke("transcribe", { output_dir }, server.environment), code, output_dir);
  }
});

test("total transcript bytes are bounded across serial requests", async () => {
  const probe = { format: { duration: "90" }, streams: [{ index: 0, codec_type: "audio", duration: "90" }] };
  const { root, invoke } = await fixture(probe);
  const server = await service({ reply: () => JSON.stringify({ text: "x".repeat(1_000_000) }) });
  const output_dir = path.join(root, "large-transcript");

  const record = await failure(await invoke("transcribe", { output_dir, chunk_seconds: 10 },
    server.environment), /TRANSCRIPT_SIZE_LIMIT/, output_dir);

  assert.equal(server.uploads.length, 9);
  assert.equal(record.chunks.length, 8);
});

test("SIGINT cancels the real CLI request and retains partial artifacts", async () => {
  const { root, invoke } = await fixture();
  const server = await service({ hang: "headers" });
  const output_dir = path.join(root, "interrupted");
  let timer;

  try {
    const result = await invoke("transcribe", { output_dir }, server.environment, (child) => {
      timer = setInterval(() => {
        if (server.uploads.length) {
          clearInterval(timer);
          child.kill("SIGINT");
        }
      }, 10);
    });

    await failure(result, /CANCELLED/, output_dir);
    assert.ok((await stat(path.join(output_dir, "chunk-001.wav"))).size > 44);
  } finally {
    clearInterval(timer);
  }
});

test("operation deadlines bound stalled headers, response bodies, extraction and diagnostic buffers", async () => {
  const { root, invoke } = await fixture();

  for (const hang of ["models", "headers", "body"]) {
    const server = await service({ hang });
    const output_dir = path.join(root, hang);
    await failure(await invoke("transcribe", { output_dir, timeout_seconds: 1 }, server.environment),
      /OPERATION_TIMEOUT/, hang === "models" ? undefined : output_dir);
  }

  for (const [mode, code] of [["hang", /OPERATION_TIMEOUT/], ["diagnostics", /MEDIA_DIAGNOSTICS_LIMIT/]]) {
    const output_dir = path.join(root, mode);
    await failure(await invoke("prepare-frames", { output_dir, max_frames: 1, timeout_seconds: 1 },
      { MEDIA_FIXTURE_MODE: mode }), code, output_dir);
  }
});

test("missing media dependencies and invalid PCM fail explicitly rather than installing or publishing", async () => {
  const { root, invoke } = await fixture();

  for (const command of ["ffmpeg", "ffprobe"]) {
    await failure(await invoke("prepare-frames", { output_dir: path.join(root, command), max_frames: 1 },
      { MEDIA_FIXTURE_MODE: `missing-${command}` }), command === "ffmpeg" ? /FFMPEG_NOT_FOUND/ : /FFPROBE_NOT_FOUND/);
  }

  const server = await service();
  const output_dir = path.join(root, "bad-pcm");
  await failure(await invoke("transcribe", { output_dir },
    { ...server.environment, MEDIA_FIXTURE_MODE: "bad-audio" }), /INVALID_MEDIA/, output_dir);
  assert.equal(server.uploads.length, 0);
});
