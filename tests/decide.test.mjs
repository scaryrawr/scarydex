import assert from "node:assert/strict";
import { execFile, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);

const helper = fileURLToPath(new URL("../plugins/decide/skills/decide/scripts/decide.mjs", import.meta.url));

const example = fileURLToPath(new URL("../plugins/decide/skills/decide/examples/ticket.json", import.meta.url));

const cleanups = [];

afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

// Typed SystemOne request and response fixtures.
const input = {
  state: { ticket: "I was charged twice. Please refund the extra payment." },
  questions: {
    team: { type: "choice", instructions: "Which team should handle this ticket?", criteria: { billing: "Payments and refunds", technical: "Bugs and integrations", other: "None of the above" } },
    refund: { type: "noul", instructions: "Does the customer explicitly ask for a refund?" },
    urgency: { type: "score", instructions: "How urgent is this ticket?", criteria: ["Routine", "Soon", "Urgent"] },
  },
};

const answer = {
  model: "clef-flash-4bit",
  answers: {
    team: { type: "choice", choice: "billing", probabilities: { billing: 0.985, technical: 0.012, other: 0.003 }, confidence: 0.985 },
    refund: { type: "noul", noul: 0.997 },
    urgency: { type: "score", score: 0.815, legend: { "0": "Routine", "1": "Soon", "2": "Urgent" }, probabilities: { "0": 0.378, "1": 0.429, "2": 0.193 }, confidence: 0.429 },
  },
  usage: { input_tokens: 841, output_tokens: 0 },
};

const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const inventory = { models: [
  { id: "clef-flash-4bit", model_type: "decision", loaded: false },
  { id: "org/OpenJev-8B-4bit", model_type: "decision", loaded: true },
  { id: "custom-router", model_type: "decision", model_alias: "router" },
  { id: "reasoner-pro", model_type: "llm" },
  { id: "clef-looking-chat", model_type: "vlm" },
] };

async function fixture({ models = inventory, response = answer, status = 200, raw, stall, commandTimeout = 10_000 } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-decide-"));
  cleanups.push(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, "input.json");
  await writeFile(file, JSON.stringify(input));
  const requests = [];

  const server = createServer(async (req, res) => {
    let body = "";

    for await (const chunk of req) body += chunk;
    requests.push({ path: req.url, method: req.method, contentType: req.headers["content-type"], authorization: req.headers.authorization, body: body ? JSON.parse(body) : undefined });

    if (stall === "headers") return;
    res.writeHead(status, { "Content-Type": "application/json" });

    if (stall === "body") { res.write(" ");

 return; }

    res.end(raw ?? JSON.stringify(req.url.endsWith("/v1/models/status") ? models : response));
  });

  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  cleanups.push(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;

  async function invoke(args, extraEnv = {}) {
    try {
      const result = await exec(process.execPath, [helper, ...args], { cwd: dir, env: { ...process.env, OMLX_BASE_URL: base + "/", OMLX_API_KEY: "", ...extraEnv }, timeout: commandTimeout });

      return { ...result, status: 0 };
    } catch (error) { return { stdout: error.stdout, stderr: error.stderr, status: error.code }; }
  }

  const writeInput = (text) => writeFile(file, text);
  const writeInputJson = (value) => writeFile(file, JSON.stringify(value));

  return { base, dir, file, requests, invoke, writeInput, writeInputJson };
}

test("models uses server metadata, including custom names, instead of name heuristics", async () => {
  const { invoke, requests } = await fixture();
  const result = await invoke(["models"]);
  assert.equal(result.status, 0, result.stderr);
  const [decisions, all] = result.stdout.split("ALL MODELS:");

  for (const name of ["clef-flash-4bit", "org/OpenJev-8B-4bit", "custom-router"]) assert.ok(decisions.includes(`- ${name}`));
  assert.match(decisions, /server-reported model_type=decision/);
  assert.match(decisions, /alias: router/);
  assert.ok(!decisions.includes("reasoner-pro"));
  assert.ok(!decisions.includes("clef-looking-chat"));
  assert.match(all, /clef-flash-4bit \(decision, not loaded\)/);
  assert.match(all, /reasoner-pro/);
  assert.deepEqual(requests, [{ path: "/v1/models/status", method: "GET", contentType: undefined, authorization: undefined, body: undefined }]);
});

test("run sends the upstream SystemOne contract and preserves all typed answers and usage", async () => {
  const { invoke, requests } = await fixture();
  const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", example]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), answer);
  assert.deepEqual(requests, [{ path: "/v1/systemone", method: "POST", contentType: "application/json", authorization: undefined, body: { model: "clef-flash-4bit", ...input } }]);
});

test("text state and null choice descriptions are supported", async () => {
  const response = { answers: { label: { type: "choice", choice: "bug", probabilities: { billing: 0.011, bug: 0.979, account: 0.010 }, confidence: 0.892 } } };
  const { file, invoke, writeInputJson, requests } = await fixture({ response });
  const value = { state: "Our checkout has returned 500 errors since 9am.", questions: { label: { type: "choice", instructions: "Which label fits this ticket?", criteria: { billing: null, bug: null, account: null } } } };
  await writeInputJson(value);
  const result = await invoke(["run", "--model", "custom-decision", "--input", file]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(requests[0].body, { model: "custom-decision", ...value });
});

test("images are read from disk and encoded as data URIs into the SystemOne request", async () => {
  const response = { answers: { food: { type: "choice", choice: "hotdog", probabilities: { hotdog: 0.94, taco: 0.06 }, confidence: 0.91 } } };
  const { dir, file, invoke, requests, writeInputJson } = await fixture({ response });
  await writeFile(path.join(dir, "photo.png"), png);
  const value = { state: "A photo is attached.", questions: { food: { type: "choice", instructions: "Is this a hotdog or taco?", criteria: { hotdog: "sausage in a bun", taco: null } } }, images: ["photo.png"] };
  await writeInputJson(value);
  const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), response);
  assert.deepEqual(requests[0].body, { model: "clef-flash-4bit", ...value, images: [`data:image/png;base64,${png.toString("base64")}`] });
});

test("state may be omitted when images are present", async () => {
  const response = { answers: { safe: { type: "noul", noul: 0.97 } } };
  const { dir, file, invoke, requests, writeInputJson } = await fixture({ response });
  await writeFile(path.join(dir, "photo.png"), png);
  await writeInputJson({ questions: { safe: { type: "noul", instructions: "Does the image show food?" } }, images: [path.join(dir, "photo.png")] });
  const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(requests[0].body, { model: "clef-flash-4bit", state: "", questions: { safe: { type: "noul", instructions: "Does the image show food?" } }, images: [`data:image/png;base64,${png.toString("base64")}`] });
});

test("invalid image inputs fail before making network requests", async () => {
  const { dir, file, invoke, requests, writeInputJson } = await fixture();
  await writeFile(path.join(dir, "empty.png"), Buffer.alloc(0));
  await writeFile(path.join(dir, "huge.png"), Buffer.alloc(20 * 1024 * 1024 + 1));
  const questions = { food: { type: "choice", instructions: "Choose", criteria: { a: null, b: null } } };

  for (const images of ["photo.png", [], [""], ["missing.png"], ["empty.png"], ["huge.png"], Array(11).fill("photo.png"), [null]]) {
    await writeInputJson({ state: "text", questions, images });
    const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
    assert.equal(result.status, 1, JSON.stringify(images));
    assert.match(result.stderr, /decide:/);
  }

  await writeInputJson({ questions });
  const missingContext = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
  assert.equal(missingContext.status, 1);
  assert.match(missingContext.stderr, /state \(text, an object, or an array\) or images/);
  await writeInputJson({ state: "text", questions, images: ["huge.png"] });
  const oversized = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
  assert.equal(oversized.status, 1);
  assert.match(oversized.stderr, /exceeds 20971520 bytes/);
  assert.deepEqual(requests, []);
});

test("invalid CLI arguments fail before making network requests", async () => {
  const { file, invoke, requests } = await fixture();

  for (const args of [
    ["run", "--input", file], ["run", "--model", "clef-flash-4bit"],
    ["run", "--model", " ", "--input", file], ["run", "--model", "", "--input", file],
    ["run", "--model", "--input", file], ["run", "--model", "clef-flash-4bit", "--input"],
    ["run", "--model", "clef-flash-4bit", "--input", ""], ["run", "--modle", "clef-flash-4bit", "--input", file],
    ["run", "stray"], ["models", "--model", "clef-flash-4bit"], ["bogus"],
  ]) {
    const result = await invoke(args);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /decide:/);
  }

  assert.deepEqual(requests, []);
});

test("invalid JSON, request shapes and unreadable files fail without contacting OMLX", async () => {
  const { file, invoke, writeInput, requests } = await fixture();

  const invalidTexts = ["{", ...[null, [], {}, { state: " ", questions: input.questions }, { state: "text", questions: {} },
    { state: "text", questions: { a: { type: "chat", instructions: "Choose" } } },
    { state: "text", questions: { a: { type: "noul", instructions: " " } } },
    { state: "text", questions: { a: { type: "choice", instructions: "Choose", criteria: [] } } },
    { state: "text", questions: { a: { type: "choice", instructions: "Choose", criteria: { a: 1 } } } },
    { state: "text", questions: { a: { type: "score", instructions: "Score", criteria: [1] } } },
  ].map((value) => JSON.stringify(value))];

  for (const text of invalidTexts) {
    await writeInput(text);
    const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
    assert.equal(result.status, 1, text);
    assert.match(result.stderr, /decide:/);
  }

  assert.equal((await invoke(["run", "--model", "clef-flash-4bit", "--input", "missing.json"])).status, 1);
  assert.deepEqual(requests, []);
});

test("malformed and incomplete SystemOne answers are rejected, not reported as decisions", async () => {
  for (const response of [null, { message: { content: "fake reasoning" } }, { answers: {} },
    { ...answer, answers: { ...answer.answers, refund: { type: "noul", noul: 2 } } },
    { ...answer, answers: { ...answer.answers, team: { ...answer.answers.team, choice: "unknown" } } },
    { ...answer, answers: { ...answer.answers, team: { ...answer.answers.team, probabilities: {} } } },
    { ...answer, answers: { ...answer.answers, team: { ...answer.answers.team, probabilities: { billing: 0.7, technical: 0.3, other: 0.1 } } } },
    { ...answer, answers: { ...answer.answers, team: { ...answer.answers.team, probabilities: { billing: 0.8, technical: 0.2, extra: 0 } } } },
    { ...answer, answers: { ...answer.answers, urgency: { ...answer.answers.urgency, probabilities: { "0": 0.7, "1": 0.1, "2": 0.3 } } } },
    { ...answer, answers: { ...answer.answers, urgency: { ...answer.answers.urgency, score: null } } },
    { ...answer, answers: { ...answer.answers, urgency: { ...answer.answers.urgency, legend: {} } } },
  ]) {
    const { file, invoke } = await fixture({ response });
    const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unexpected SystemOne response/);
    assert.equal(result.stdout, "");
  }
});

test("probability maps accept near-1 rounding and reject mismatched score keys", async () => {
  const rounded = {
    ...answer,
    answers: {
      ...answer.answers,
      team: { ...answer.answers.team, probabilities: { billing: 0.985, technical: 0.012, other: 0.0029 } },
      urgency: { ...answer.answers.urgency, probabilities: { "0": 0.3333, "1": 0.3333, "2": 0.3333 } },
    },
  };

  const { file: roundedFile, invoke: invokeRounded } = await fixture({ response: rounded });
  const roundedResult = await invokeRounded(["run", "--model", "clef-flash-4bit", "--input", roundedFile]);
  assert.equal(roundedResult.status, 0, roundedResult.stderr);

  const badScoreKeys = {
    ...answer,
    answers: {
      ...answer.answers,
      urgency: { ...answer.answers.urgency, probabilities: { "0": 0.5, "1": 0.5, "3": 0 } },
    },
  };

  const { file, invoke } = await fixture({ response: badScoreKeys });
  const badResult = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
  assert.equal(badResult.status, 1);
  assert.match(badResult.stderr, /invalid probabilities or confidence/);
});

test("HTTP failures and invalid JSON return actionable errors", async () => {
  for (const status of [404, 500]) {
    const { file, invoke } = await fixture({ status, response: { detail: "Decision model unavailable" } });
    const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`OMLX API error: ${status}`));
    assert.match(result.stderr, /Decision model unavailable/);

    if (status === 404) assert.match(result.stderr, /supports \/v1\/systemone/);
  }

  const { invoke } = await fixture({ raw: "not JSON" });
  const result = await invoke(["models"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid JSON/);
});

test("discovery handles empty inventories and rejects malformed status metadata", async () => {
  for (const models of [{ models: [] }, { models: [{ id: "generic-chat", model_type: "llm" }] }, {}, { models: [null] }, { models: [{ id: 5, model_type: "decision" }] }, { models: [{ id: "clef" }] }, { models: [{ id: "clef", model_type: "decision", loaded: "yes" }] }]) {
    const { invoke } = await fixture({ models });
    const result = await invoke(["models"]);
    const valid = Array.isArray(models.models) && (models.models.length === 0 || models.models[0]?.id === "generic-chat");
    assert.equal(result.status, valid ? 0 : 1);

    if (!valid) assert.match(result.stderr, /invalid models list/);
    else assert.match(result.stdout, models.models.length === 0 ? /No models found/ : /None available/);
  }
});

test("unreachable endpoints and invalid URL configuration fail clearly", async () => {
  const { invoke } = await fixture();
  const unreachable = await invoke(["models"], { OMLX_BASE_URL: "http://127.0.0.1:0" });
  assert.equal(unreachable.status, 1);
  assert.match(unreachable.stderr, /Start OMLX or set OMLX_BASE_URL/);

  for (const url of ["file:///tmp/omlx", "http://user:secret@localhost", "http://localhost?token=secret", "not a URL"]) {
    const result = await invoke(["models"], { OMLX_BASE_URL: url });
    assert.equal(result.status, 1);
    assert.ok(!result.stderr.includes("secret"));
  }
});

test("help documents the typed workflow without contacting OMLX", async () => {
  const { invoke, requests } = await fixture();

  for (const args of [[], ["help"], ["--help"], ["-h"]]) {
    const result = await invoke(args);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /--input/);
    assert.match(result.stdout, /\/v1\/systemone/);
  }

  assert.deepEqual(requests, []);
});

test("choice and score reject criterion counts outside 2–26 before network access", async () => {
  const { file, invoke, writeInputJson, requests } = await fixture();

  for (const type of ["choice", "score"]) {
    for (const count of [0, 1, 27]) {
      const labels = Array.from({ length: count }, (_, index) => `option${index}`);
      const criteria = type === "choice" ? Object.fromEntries(labels.map((label) => [label, null])) : labels;
      await writeInputJson({ state: "Ticket", questions: { label: { type, instructions: "Classify this ticket", criteria } } });
      const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
      assert.equal(result.status, 1, `${type} with ${count} criteria`);
      assert.match(result.stderr, /2–26/);
    }
  }

  assert.deepEqual(requests, []);
});

test("choice and score accept both supported criterion-count boundaries", async () => {
  for (const count of [2, 26]) {
    const labels = Array.from({ length: count }, (_, index) => `option${index}`);
    const probabilities = Object.fromEntries(labels.map((_, index) => [String(index), index === count - 1 ? 1 : 0]));

    const response = {
      answers: {
        label: { type: "choice", choice: labels[count - 1], probabilities: Object.fromEntries(labels.map((label, index) => [label, index === count - 1 ? 1 : 0])), confidence: 1 },
        level: { type: "score", score: count - 1, legend: Object.fromEntries(labels.map((label, index) => [String(index), label])), probabilities, confidence: 1 },
      },
    };

    const { file, invoke, writeInputJson } = await fixture({ response });
    await writeInputJson({ state: "Ticket", questions: {
      label: { type: "choice", instructions: "Classify", criteria: Object.fromEntries(labels.map((label) => [label, null])) },
      level: { type: "score", instructions: "Score", criteria: labels },
    } });
    const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), response);
  }
});

test("scores use the criterion-index scale rather than the probability scale", async () => {
  for (const [score, probabilities] of [[0, { "0": 1, "1": 0, "2": 0 }], [1.5, { "0": 0, "1": 0.5, "2": 0.5 }], [2, { "0": 0, "1": 0, "2": 1 }], [-0.1, { "0": 1, "1": 0, "2": 0 }], [2.1, { "0": 0, "1": 0, "2": 1 }]]) {
    const response = { ...answer, answers: { ...answer.answers, urgency: { ...answer.answers.urgency, score, probabilities } } };
    const { file, invoke } = await fixture({ response });
    const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);

    if (score >= 0 && score <= 2) {
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).answers.urgency.score, score);
    } else {
      assert.equal(result.status, 1);
      assert.match(result.stderr, /invalid score or legend/);
      assert.equal(result.stdout, "");
    }
  }
});

test("OMLX bearer authentication reaches discovery and decisions without entering output", async () => {
  const { file, invoke, requests } = await fixture();

  for (const args of [["models"], ["run", "--model", "clef-flash-4bit", "--input", file]]) {
    const result = await invoke(args, { OMLX_API_KEY: "test-private-key" });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!`${result.stdout}${result.stderr}`.includes("test-private-key"));
  }

  assert.equal(requests.length, 2);

  for (const request of requests) assert.equal(request.authorization, "Bearer test-private-key");
});

test("reverse-proxy paths are preserved for discovery and inference", async () => {
  const { base, file, invoke, requests } = await fixture();

  for (const args of [["models"], ["run", "--model", "custom-router", "--input", file]]) {
    const result = await invoke(args, { OMLX_BASE_URL: `${base}/omlx/` });
    assert.equal(result.status, 0, result.stderr);
  }

  assert.deepEqual(requests.map((request) => request.path), ["/omlx/v1/models/status", "/omlx/v1/systemone"]);
});

test("array state and explicit truncation settings reach SystemOne unchanged", async () => {
  const { file, invoke, requests, writeInputJson } = await fixture();

  for (const truncate of [false, true]) {
    const value = { ...input, state: [{ ticket: "Charged twice" }], truncate };
    await writeInputJson(value);
    const result = await invoke(["run", "--model", "org/OpenJev-8B-4bit", "--input", file]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(requests.at(-1).body, { model: "org/OpenJev-8B-4bit", ...value });
  }
});

test("invalid truncation settings and unsupported image formats fail before network access", async () => {
  const { dir, file, invoke, requests, writeInputJson } = await fixture();

  for (const truncate of ["false", 0, null]) {
    await writeInputJson({ ...input, truncate });
    const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /truncate must be a boolean/);
  }

  await writeFile(path.join(dir, "bad.png"), "not an image");
  await writeInputJson({ ...input, images: ["bad.png"] });
  const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unsupported image format/);
  assert.deepEqual(requests, []);
});

test("image MIME types come from bytes rather than filename extensions", async () => {
  const { dir, file, invoke, requests, writeInputJson } = await fixture();

  for (const [mime, bytes] of [
    ["image/png", png],
    ["image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0])],
    ["image/gif", Buffer.from("GIF89a")],
    ["image/webp", Buffer.from("RIFF0000WEBP")],
  ]) {
    await writeFile(path.join(dir, "image.bin"), bytes);
    await writeInputJson({ ...input, images: ["image.bin"] });
    const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(requests.at(-1).body.images, [`data:${mime};base64,${bytes.toString("base64")}`]);
  }
});

test("OMLX validation and authentication errors are reported without retries or chat fallback", async () => {
  for (const [status, response, detail] of [
    [400, { detail: "OpenJev takes at most one image per request" }, "OpenJev takes at most one image"],
    [401, { detail: "Invalid API key" }, "Invalid API key"],
    [403, { error: { message: "Inference key required" } }, "Inference key required"],
    [413, { detail: "State exceeds context length" }, "State exceeds context length"],
    [422, { detail: [{ msg: "Field required" }] }, "Field required"],
  ]) {
    const { file, invoke, requests } = await fixture({ status, response });
    const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(detail));
    assert.equal(result.stdout, "");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, "/v1/systemone");
  }
});

test("legacy provider configuration does not redirect OMLX requests", async () => {
  const { invoke, requests } = await fixture();
  const result = await invoke(["models"], { OLLAMA_BASE_URL: "http://127.0.0.1:0" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].path, "/v1/models/status");
});

test("OMLX keepalive whitespace does not change the final JSON decision", async () => {
  const { file, invoke } = await fixture({ raw: `\n \n${JSON.stringify(answer)}` });
  const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), answer);
});

test("discovery preserves server-reported unavailability without guessing vision support", async () => {
  const { invoke } = await fixture({ models: { models: [
    { id: "custom-decision", model_type: "decision", unavailable_reason: "Unsupported checkpoint" },
  ] } });

  const result = await invoke(["models"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /custom-decision \(unavailable: Unsupported checkpoint\)/);
  assert.ok(!result.stdout.includes("vision"));
});

test("FastAPI validation arrays preserve messages without dumping input values", async () => {
  const { file, invoke, requests } = await fixture({ status: 422, response: { detail: [
    { loc: ["body", "state"], msg: "Field required", input: "private-state" },
    null,
    { msg: 42 },
    { input: "private-value" },
    { loc: ["body", "truncate"], msg: "Input should be a valid boolean", input: "private-flag" },
  ] } });

  const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /OMLX API error: 422/);
  assert.match(result.stderr, /Field required/);
  assert.match(result.stderr, /Input should be a valid boolean/);
  assert.ok(!result.stderr.includes("private-"));
  assert.equal(result.stdout, "");
  assert.equal(requests.length, 1);
});

for (const [phase, status] of [["headers", 200], ["body", 200], ["body", 500]]) {
  test(`discovery reports ${phase} timeouts (HTTP ${status}) without connectivity guidance`, { timeout: 20_000 }, async () => {
    const { invoke, requests } = await fixture({ stall: phase, status, commandTimeout: 15_000 });
    const result = await invoke(["models"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, phase === "headers" ? /OMLX request timed out/ : /OMLX response timed out/);
    assert.ok(!result.stderr.includes("Start OMLX"));
    assert.ok(!result.stderr.includes("sandbox"));
    assert.equal(result.stdout, "");
    assert.equal(requests.length, 1);
  });
}

test("malformed HTTP error bodies preserve the server status", async () => {
  const { invoke, requests } = await fixture({ status: 500, raw: "not JSON" });
  const result = await invoke(["models"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /OMLX API error: 500/);
  assert.ok(!result.stderr.includes("invalid JSON"));
  assert.equal(result.stdout, "");
  assert.equal(requests.length, 1);
});

test("HTTP 200 keepalive error envelopes preserve the server failure message", async () => {
  for (const [error, message] of [[{ message: "Memory guard rejected inference", type: "server_error" }, "Memory guard rejected inference"], ["Decision inference failed", "Decision inference failed"]]) {
    const { file, invoke, requests } = await fixture({ raw: ` \n${JSON.stringify({ error })}` });
    const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(message));
    assert.ok(!result.stderr.includes("missing answers"));
    assert.equal(result.stdout, "");
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, "/v1/systemone");
  }
});

test("a null optional error field does not override a valid decision", async () => {
  const response = { ...answer, error: null };
  const { file, invoke } = await fixture({ response });
  const result = await invoke(["run", "--model", "clef-flash-4bit", "--input", file]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), response);
});


test("the documented base64 filter removes line feeds without corrupting payload characters", async () => {
  const reference = await readFile(new URL("../plugins/decide/skills/decide/references/decision-model-api.md", import.meta.url), "utf8");
  const argument = reference.match(/tr -d '([^']*)'/);
  assert.ok(argument, "The image curl example must include its line-feed filter.");
  const result = spawnSync("tr", ["-d", argument[1]], { input: "nG9v\nbnJ5\n", encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "nG9vbnJ5");
});
