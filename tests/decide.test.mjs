import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
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

// Request and response examples from Ollama's September 29, 2026 announcement.
const input = {
  state: { ticket: "I was charged twice. Please refund the extra payment." },
  questions: {
    team: { type: "choice", instructions: "Which team should handle this ticket?", criteria: { billing: "Payments and refunds", technical: "Bugs and integrations", other: "None of the above" } },
    refund: { type: "noul", instructions: "Does the customer explicitly ask for a refund?" },
    urgency: { type: "score", instructions: "How urgent is this ticket?", criteria: ["Routine", "Soon", "Urgent"] },
  },
};
const answer = {
  model: "nimble",
  answers: {
    team: { type: "choice", choice: "billing", probabilities: { billing: 0.985, technical: 0.012, other: 0.003 }, confidence: 0.922 },
    refund: { type: "noul", noul: 0.997 },
    urgency: { type: "score", score: 0.815, legend: { "0": "Routine", "1": "Soon", "2": "Urgent" }, probabilities: { "0": 0.378, "1": 0.429, "2": 0.193 }, confidence: 0.046 },
  },
  usage: { input_tokens: 841, output_tokens: 4 },
};

async function fixture({ tags = { models: [{ name: "nimble:latest" }, { name: "tev1" }, { name: "tev1:0.8b" }, { name: "org/nimble:9b-int4" }, { name: "reasoner-pro" }, { name: "not-nimble" }] }, response = answer, status = 200, raw } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-decide-"));
  cleanups.push(() => rm(dir, { recursive: true, force: true }));
  const file = path.join(dir, "input.json");
  await writeFile(file, JSON.stringify(input));
  const requests = [];
  const server = createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    requests.push({ path: req.url, method: req.method, contentType: req.headers["content-type"], body: body ? JSON.parse(body) : undefined });
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(raw ?? JSON.stringify(req.url === "/api/tags" ? tags : response));
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  cleanups.push(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function invoke(args, extraEnv = {}) {
    try {
      const result = await exec(process.execPath, [helper, ...args], { cwd: dir, env: { ...process.env, OLLAMA_BASE_URL: base + "/", ...extraEnv }, timeout: 10_000 });
      return { ...result, status: 0 };
    } catch (error) { return { stdout: error.stdout, stderr: error.stderr, status: error.code }; }
  }
  return { file, requests, invoke, writeInput: (value) => writeFile(file, typeof value === "string" ? value : JSON.stringify(value)) };
}

test("models identifies documented families without labeling generic reasoners as compatible", async () => {
  const { invoke, requests } = await fixture();
  const result = await invoke(["models"]);
  assert.equal(result.status, 0, result.stderr);
  const [candidates, all] = result.stdout.split("ALL MODELS:");
  for (const name of ["nimble:latest", "tev1", "tev1:0.8b", "org/nimble:9b-int4"]) assert.ok(candidates.includes(`- ${name}`));
  assert.match(candidates, /heuristic, not capability verification/);
  assert.ok(!candidates.includes("reasoner-pro"));
  assert.ok(!candidates.includes("not-nimble"));
  assert.match(all, /reasoner-pro/);
  assert.deepEqual(requests, [{ path: "/api/tags", method: "GET", contentType: undefined, body: undefined }]);
});

test("run sends the upstream SystemOne contract and preserves all typed answers and usage", async () => {
  const { invoke, requests } = await fixture();
  const result = await invoke(["run", "--model", "nimble", "--input", example]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), answer);
  assert.deepEqual(requests, [{ path: "/v1/systemone", method: "POST", contentType: "application/json", body: { model: "nimble", ...input } }]);
});

test("text state and null choice descriptions are supported", async () => {
  const response = { answers: { label: { type: "choice", choice: "bug", probabilities: { billing: 0.011, bug: 0.979, account: 0.010 }, confidence: 0.892 } } };
  const { file, invoke, writeInput, requests } = await fixture({ response });
  const value = { state: "Our checkout has returned 500 errors since 9am.", questions: { label: { type: "choice", instructions: "Which label fits this ticket?", criteria: { billing: null, bug: null, account: null } } } };
  await writeInput(value);
  const result = await invoke(["run", "--model", "custom-decision", "--input", file]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(requests[0].body, { model: "custom-decision", ...value });
});

test("invalid CLI arguments fail before making network requests", async () => {
  const { file, invoke, requests } = await fixture();
  for (const args of [
    ["run", "--input", file], ["run", "--model", "nimble"],
    ["run", "--model", " ", "--input", file], ["run", "--model", "", "--input", file],
    ["run", "--model", "--input", file], ["run", "--model", "nimble", "--input"],
    ["run", "--model", "nimble", "--input", ""], ["run", "--modle", "nimble", "--input", file],
    ["run", "stray"], ["models", "--model", "nimble"], ["bogus"],
  ]) {
    const result = await invoke(args);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /decide:/);
  }
  assert.deepEqual(requests, []);
});

test("invalid JSON, request shapes and unreadable files fail without contacting Ollama", async () => {
  const { file, invoke, writeInput, requests } = await fixture();
  for (const value of ["{", null, [], {}, { state: " ", questions: input.questions }, { state: "text", questions: {} },
    { state: "text", questions: { a: { type: "chat", instructions: "Choose" } } },
    { state: "text", questions: { a: { type: "noul", instructions: " " } } },
    { state: "text", questions: { a: { type: "choice", instructions: "Choose", criteria: [] } } },
    { state: "text", questions: { a: { type: "choice", instructions: "Choose", criteria: { a: 1 } } } },
    { state: "text", questions: { a: { type: "score", instructions: "Score", criteria: [1] } } },
  ]) {
    await writeInput(value);
    const result = await invoke(["run", "--model", "nimble", "--input", file]);
    assert.equal(result.status, 1, JSON.stringify(value));
    assert.match(result.stderr, /decide:/);
  }
  assert.equal((await invoke(["run", "--model", "nimble", "--input", "missing.json"])).status, 1);
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
    const result = await invoke(["run", "--model", "nimble", "--input", file]);
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
  const roundedResult = await invokeRounded(["run", "--model", "nimble", "--input", roundedFile]);
  assert.equal(roundedResult.status, 0, roundedResult.stderr);

  const badScoreKeys = {
    ...answer,
    answers: {
      ...answer.answers,
      urgency: { ...answer.answers.urgency, probabilities: { "0": 0.5, "1": 0.5, "3": 0 } },
    },
  };
  const { file, invoke } = await fixture({ response: badScoreKeys });
  const badResult = await invoke(["run", "--model", "nimble", "--input", file]);
  assert.equal(badResult.status, 1);
  assert.match(badResult.stderr, /invalid probabilities or confidence/);
});

test("HTTP failures and invalid JSON return actionable errors", async () => {
  for (const status of [404, 500]) {
    const { file, invoke } = await fixture({ status, response: { error: "Decision model unavailable" } });
    const result = await invoke(["run", "--model", "nimble", "--input", file]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`Ollama API error: ${status}`));
    assert.match(result.stderr, /Decision model unavailable/);
    if (status === 404) assert.match(result.stderr, /Upgrade to Ollama 0.35/);
  }
  const { invoke } = await fixture({ raw: "not JSON" });
  const result = await invoke(["models"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /invalid JSON/);
});

test("discovery handles empty and unrecognized inventories and rejects malformed tags", async () => {
  for (const tags of [{ models: [] }, { models: [{ name: "llama3.1", size: 4_700_000_000 }] }, {}, { models: [null] }, { models: [{ name: 5 }] }, { models: [{ name: "nimble", size: "bad" }] }]) {
    const { invoke } = await fixture({ tags });
    const result = await invoke(["models"]);
    const valid = Array.isArray(tags.models) && (tags.models.length === 0 || tags.models[0]?.name === "llama3.1");
    assert.equal(result.status, valid ? 0 : 1);
    if (!valid) assert.match(result.stderr, /invalid models list/);
    else assert.match(result.stdout, tags.models.length === 0 ? /No models found/ : /None recognized/);
  }
});

test("unreachable endpoints and invalid URL configuration fail clearly", async () => {
  const { invoke } = await fixture();
  const unreachable = await invoke(["models"], { OLLAMA_BASE_URL: "http://127.0.0.1:0" });
  assert.equal(unreachable.status, 1);
  assert.match(unreachable.stderr, /Start Ollama or set OLLAMA_BASE_URL/);
  for (const url of ["file:///tmp/ollama", "http://user:secret@localhost", "http://localhost?token=secret", "not a URL"]) {
    const result = await invoke(["models"], { OLLAMA_BASE_URL: url });
    assert.equal(result.status, 1);
    assert.ok(!result.stderr.includes("secret"));
  }
});

test("help documents the typed workflow without contacting Ollama", async () => {
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
  const { file, invoke, writeInput, requests } = await fixture();
  for (const type of ["choice", "score"]) {
    for (const count of [0, 1, 27]) {
      const labels = Array.from({ length: count }, (_, index) => `option${index}`);
      const criteria = type === "choice" ? Object.fromEntries(labels.map((label) => [label, null])) : labels;
      await writeInput({ state: "Ticket", questions: { label: { type, instructions: "Classify this ticket", criteria } } });
      const result = await invoke(["run", "--model", "nimble", "--input", file]);
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
    const { file, invoke, writeInput } = await fixture({ response });
    await writeInput({ state: "Ticket", questions: {
      label: { type: "choice", instructions: "Classify", criteria: Object.fromEntries(labels.map((label) => [label, null])) },
      level: { type: "score", instructions: "Score", criteria: labels },
    } });
    const result = await invoke(["run", "--model", "nimble", "--input", file]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), response);
  }
});

test("scores use the criterion-index scale rather than the probability scale", async () => {
  for (const [score, probabilities] of [[0, { "0": 1, "1": 0, "2": 0 }], [1.5, { "0": 0, "1": 0.5, "2": 0.5 }], [2, { "0": 0, "1": 0, "2": 1 }], [-0.1, { "0": 1, "1": 0, "2": 0 }], [2.1, { "0": 0, "1": 0, "2": 1 }]]) {
    const response = { ...answer, answers: { ...answer.answers, urgency: { ...answer.answers.urgency, score, probabilities } } };
    const { file, invoke } = await fixture({ response });
    const result = await invoke(["run", "--model", "nimble", "--input", file]);
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
