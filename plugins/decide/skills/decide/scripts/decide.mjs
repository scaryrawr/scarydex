#!/usr/bin/env node

import { open, readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const DEFAULT_OMLX_URL = "http://127.0.0.1:8000";
const LIST_TIMEOUT_MS = 10_000;
const DECISION_TIMEOUT_MS = 300_000;
const PROBABILITY_SUM_EPSILON = 0.01;
const MAX_IMAGES = 10;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonempty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function probability(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function validateDistribution(probabilities, keys) {
  if (!object(probabilities)) return false;
  const actual = Object.keys(probabilities);
  if (actual.length !== keys.length || keys.some((key) => !Object.hasOwn(probabilities, key)) || actual.some((key) => !keys.includes(key))) {
    return false;
  }
  let total = 0;
  for (const key of keys) {
    const value = probabilities[key];
    if (!probability(value)) return false;
    total += value;
  }
  return Math.abs(total - 1) <= PROBABILITY_SUM_EPSILON;
}

function requireOption(options, name) {
  if (!nonempty(options[name])) throw new Error(`Provide --${name} with a non-empty value.`);
  return options[name];
}

function imageDataUri(bytes, file) {
  let mime;
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) mime = "image/png";
  else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = "image/jpeg";
  else if (["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6))) mime = "image/gif";
  else if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") mime = "image/webp";
  else throw new Error(`Unsupported image format: ${file}. Use PNG, JPEG, GIF, or WebP.`);
  return `data:${mime};base64,${bytes.toString("base64")}`;
}

async function parseDecisionInput(text) {
  let input;
  try { input = JSON.parse(text); }
  catch { throw new Error("Input must be valid JSON."); }
  if (!object(input)) throw new Error("Input must be a JSON object.");
  const hasState = nonempty(input.state) || object(input.state) || Array.isArray(input.state);
  if (!hasState && input.state !== undefined && input.state !== null && input.state !== "") {
    throw new Error("state must be non-empty text, a JSON object, or an array.");
  }
  if (!object(input.questions) || Object.keys(input.questions).length === 0) {
    throw new Error("Input must contain a non-empty questions object.");
  }
  if (input.images !== undefined && (!Array.isArray(input.images) || input.images.length < 1 || input.images.length > MAX_IMAGES || !input.images.every(nonempty))) {
    throw new Error(`images must be an array of 1-${MAX_IMAGES} non-empty local image file paths. Only vision decision models accept images.`);
  }
  if (input.truncate !== undefined && typeof input.truncate !== "boolean") {
    throw new Error("truncate must be a boolean.");
  }
  const images = [];
  for (const file of input.images ?? []) {
    let handle;
    try { handle = await open(file); }
    catch { throw new Error(`Image file is unreadable: ${file}`); }
    try {
      const { size } = await handle.stat();
      if (size === 0) throw new Error(`Image file is empty: ${file}`);
      if (size > MAX_IMAGE_BYTES) throw new Error(`Image file exceeds ${MAX_IMAGE_BYTES} bytes: ${file}`);
      images.push(imageDataUri(await handle.readFile(), file));
    } finally {
      await handle.close();
    }
  }
  if (!hasState && images.length === 0) throw new Error("Input must contain state (text, an object, or an array) or images.");
  for (const [name, question] of Object.entries(input.questions)) {
    if (!nonempty(name) || !object(question) || !nonempty(question.instructions)) {
      throw new Error(`Question ${JSON.stringify(name)} requires non-empty instructions.`);
    }
    switch (question.type) {
      case "choice":
        if (!object(question.criteria) || Object.keys(question.criteria).length < 2 || Object.keys(question.criteria).length > 26 ||
            Object.entries(question.criteria).some(([key, value]) => !nonempty(key) || (value !== null && typeof value !== "string"))) {
          throw new Error(`Choice question ${name} requires 2–26 criteria mapping option names to strings or null.`);
        }
        break;
      case "score":
        if (!Array.isArray(question.criteria) || question.criteria.length < 2 || question.criteria.length > 26 || !question.criteria.every(nonempty)) {
          throw new Error(`Score question ${name} requires a criteria array of 2–26 labels.`);
        }
        break;
      case "noul":
        break;
      default:
        throw new Error(`Question ${name} has unsupported type. Use choice, noul, or score.`);
    }
  }
  const request = { state: input.state ?? "", questions: input.questions };
  if (images.length) request.images = images;
  if (input.truncate !== undefined) request.truncate = input.truncate;
  return request;
}

function validateAnswers(result, questions) {
  if (!object(result) || !object(result.answers)) throw new Error("Unexpected SystemOne response: missing answers object.");
  for (const [name, question] of Object.entries(questions)) {
    const answer = result.answers[name];
    if (!object(answer) || answer.type !== question.type) throw new Error(`Unexpected SystemOne response: missing or mismatched answer for ${name}.`);
    if (question.type === "noul") {
      if (!probability(answer.noul)) throw new Error(`Unexpected SystemOne response: invalid noul for ${name}.`);
      continue;
    }
    const keys = question.type === "choice" ? Object.keys(question.criteria) : question.criteria.map((_, index) => String(index));
    if (!validateDistribution(answer.probabilities, keys) || !probability(answer.confidence)) {
      throw new Error(`Unexpected SystemOne response: invalid probabilities or confidence for ${name}.`);
    }
    if (question.type === "choice" && !keys.includes(answer.choice)) throw new Error(`Unexpected SystemOne response: invalid choice for ${name}.`);
    if (question.type === "score") {
      if (typeof answer.score !== "number" || !Number.isFinite(answer.score) ||
          answer.score < 0 || answer.score > question.criteria.length - 1 ||
          !object(answer.legend) || keys.some((key) => answer.legend[key] !== question.criteria[Number(key)])) {
        throw new Error(`Unexpected SystemOne response: invalid score or legend for ${name}.`);
      }
    }
  }
}

async function request(base, endpoint, body) {
  const headers = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (process.env.OMLX_API_KEY) headers.Authorization = `Bearer ${process.env.OMLX_API_KEY}`;

  let response;
  try {
    response = await fetch(`${base}${endpoint}`, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(body === undefined ? LIST_TIMEOUT_MS : DECISION_TIMEOUT_MS),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") throw new Error("OMLX request timed out.");
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.code ?? error.cause.message : undefined;
    throw new Error(`OMLX request failed${cause ? ` (${cause})` : ""}. Start OMLX or set OMLX_BASE_URL. If the agent runs commands in a sandbox, the sandbox may block local HTTP even when OMLX is running; rerun this command outside the sandbox.`);
  }
  let data;
  try { data = await response.json(); }
  catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") throw new Error("OMLX response timed out.");
    if (response.ok) throw new Error("OMLX returned invalid JSON.");
    data = null;
  }
  if (!response.ok) {
    const hint = endpoint === "/v1/systemone" && response.status === 404 ? " Check that this OMLX server supports /v1/systemone and that the requested decision model is available." : "";
    const message = object(data) ? data.detail ?? data.error : undefined;
    let detail = "";
    if (Array.isArray(message)) {
      const messages = [];
      for (const entry of message) {
        if (object(entry) && nonempty(entry.msg)) messages.push(entry.msg);
      }
      if (messages.length) detail = ` ${messages.join("; ")}`;
    } else if (nonempty(message)) detail = ` ${message}`;
    else if (object(message) && nonempty(message.message)) detail = ` ${message.message}`;
    throw new Error(`OMLX API error: ${response.status} ${response.statusText}.${detail}${hint}`);
  }
  return data;
}

async function listModels(base) {
  const data = await request(base, "/v1/models/status");
  if (!object(data) || !Array.isArray(data.models) || data.models.some((model) =>
    !object(model) || !nonempty(model.id) || !nonempty(model.model_type) ||
    (model.loaded !== undefined && typeof model.loaded !== "boolean") ||
    (model.model_alias !== undefined && !nonempty(model.model_alias)) ||
    (model.unavailable_reason !== undefined && model.unavailable_reason !== null && !nonempty(model.unavailable_reason)))) {
    throw new Error("Unexpected OMLX /v1/models/status response: invalid models list.");
  }
  if (data.models.length === 0) {
    console.log("No models found on OMLX endpoint. Finish downloading a decision model in OMLX, then retry.");
    return;
  }
  const decisions = data.models.filter((model) => model.model_type === "decision");
  console.log("DECISION MODELS (server-reported model_type=decision):");
  for (const model of decisions) console.log(`  - ${model.id}${model.model_alias ? ` (alias: ${model.model_alias})` : ""}${model.unavailable_reason ? ` (unavailable: ${model.unavailable_reason})` : ""}`);
  if (decisions.length === 0) console.log("  None available. Finish downloading a Clef or OpenJev decision model in OMLX, then retry.");
  console.log("\nALL MODELS:");
  for (const model of data.models) console.log(`  - ${model.id} (${model.model_type}${model.loaded === undefined ? "" : model.loaded ? ", loaded" : ", not loaded"})`);
}

function usage() {
  console.log(`Usage: node scripts/decide.mjs <command> [options]

Commands:
  models                         List OMLX models and server-reported decision models
  run --model <name> --input <file>  Send JSON {state, images?, questions, truncate?} to /v1/systemone
  help                           Show this help

Question types: choice, noul (yes/no probability), score.
images: optional array of 1-10 PNG, JPEG, GIF, or WebP file paths, sent as data URIs in the
request. state may be omitted when images are present. Only vision decision
models with a vision backbone accept images. OpenJev accepts at most one image.
Output: full SystemOne JSON response, including answers, probabilities and usage.
Requires an OMLX server with SystemOne support and a Clef or OpenJev model.
Use the exact model ID from models. truncate is optional and boolean (Clef only).
OMLX_BASE_URL defaults to http://127.0.0.1:8000. OMLX_API_KEY is optional.`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === undefined || ["help", "--help", "-h"].includes(command)) {
    if (args.length) throw new Error("Help does not accept arguments.");
    usage();
    return;
  }
  if (!["models", "run"].includes(command)) throw new Error(`Unknown command: ${command}`);
  const { values } = parseArgs({
    args,
    options: command === "run" ? { model: { type: "string" }, input: { type: "string" } } : {},
    strict: true,
    allowPositionals: false,
  });
  let model, input;
  if (command === "run") {
    model = requireOption(values, "model");
    const file = requireOption(values, "input");
    input = await parseDecisionInput(await readFile(file, "utf8"));
  }
  let base;
  try { base = new URL(process.env.OMLX_BASE_URL || DEFAULT_OMLX_URL); }
  catch { throw new Error("OMLX_BASE_URL must be a valid HTTP(S) URL."); }
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error("OMLX_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment.");
  }
  const url = base.href.replace(/\/+$/, "");
  if (command === "models") return listModels(url);
  const result = await request(url, "/v1/systemone", { model, ...input });
  validateAnswers(result, input.questions);
  console.log(JSON.stringify(result, null, 2));
}

try { await main(); }
catch (error) {
  console.error(`decide: ${error.message}`);
  process.exitCode = 1;
}
