#!/usr/bin/env node

import { open, readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
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

async function parseDecisionInput(text) {
  let input;
  try { input = JSON.parse(text); }
  catch { throw new Error("Input must be valid JSON."); }
  if (!object(input)) throw new Error("Input must be a JSON object.");
  const hasState = nonempty(input.state) || object(input.state);
  if (!hasState && input.state !== undefined && input.state !== null && input.state !== "") {
    throw new Error("state must be non-empty text or a JSON object.");
  }
  if (!object(input.questions) || Object.keys(input.questions).length === 0) {
    throw new Error("Input must contain a non-empty questions object.");
  }
  if (input.images !== undefined && (!Array.isArray(input.images) || input.images.length < 1 || input.images.length > MAX_IMAGES || !input.images.every(nonempty))) {
    throw new Error(`images must be an array of 1-${MAX_IMAGES} non-empty local image file paths. Only vision decision models such as clef-flash accept images.`);
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
      images.push((await handle.readFile()).toString("base64"));
    } finally {
      await handle.close();
    }
  }
  if (!hasState && images.length === 0) throw new Error("Input must contain state (text or an object) or images.");
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
  return { state: input.state ?? "", questions: input.questions, ...(images.length ? { images } : {}) };
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
  let response;
  try {
    response = await fetch(`${base}${endpoint}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(body === undefined ? LIST_TIMEOUT_MS : DECISION_TIMEOUT_MS),
    });
  } catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.code ?? error.cause.message : undefined;
    throw new Error(`Ollama request failed${cause ? ` (${cause})` : ""}. Start Ollama or set OLLAMA_BASE_URL. If the agent runs commands in a sandbox, the sandbox may block local HTTP even when Ollama is running; rerun this command outside the sandbox.`);
  }
  if (!response.ok) {
    const hint = endpoint === "/v1/systemone" && response.status === 404 ? " Upgrade to Ollama 0.35 or newer for SystemOne support." : "";
    const errorBody = await response.json().catch(() => null);
    const detail = object(errorBody) && nonempty(errorBody.error) ? ` ${errorBody.error}` : "";
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}.${detail}${hint}`);
  }
  try { return await response.json(); }
  catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") throw new Error("Ollama response timed out.");
    throw new Error("Ollama returned invalid JSON.");
  }
}

async function listModels(base) {
  const data = await request(base, "/api/tags");
  if (!object(data) || !Array.isArray(data.models) || data.models.some((model) =>
    !object(model) || !nonempty(model.name) || (model.size !== undefined && (typeof model.size !== "number" || !Number.isFinite(model.size) || model.size < 0)))) {
    throw new Error("Unexpected Ollama /api/tags response: invalid models list.");
  }
  if (data.models.length === 0) {
    console.log("No models found on Ollama endpoint.");
    return;
  }
  const candidates = data.models.filter((model) => /^(nimble|tev1|clef)(?::|-|$)/i.test(model.name.split("/").at(-1)));
  console.log("DECISION MODEL CANDIDATES (name heuristic, not capability verification):");
  for (const model of candidates) console.log(`  - ${model.name}`);
  if (candidates.length === 0) console.log("  None recognized. Pull nimble, tev1, or clef-flash, or explicitly select a compatible custom model.");
  console.log("\nALL MODELS:");
  for (const model of data.models) console.log(`  - ${model.name}${model.size === undefined ? "" : ` (${(model.size / 1e6).toFixed(0)}MB)`}`);
}

function usage() {
  console.log(`Usage: node scripts/decide.mjs <command> [options]

Commands:
  models                         List installed Ollama models and known decision families
  run --model <name> --input <file>  Send JSON {state, images?, questions} to /v1/systemone
  help                           Show this help

Question types: choice, noul (yes/no probability), score.
images: optional array of 1-10 local image file paths, base64-encoded into the
request. state may be omitted when images are present. Only vision decision
models such as clef-flash accept images; other models reject the request.
Output: full SystemOne JSON response, including answers, probabilities and usage.
Requires Ollama 0.35+ and a compatible decision model such as nimble, tev1, or clef-flash.
OLLAMA_BASE_URL defaults to http://localhost:11434.`);
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
  const base = new URL(process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error("OLLAMA_BASE_URL must be an HTTP(S) URL without credentials, query, or fragment.");
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
