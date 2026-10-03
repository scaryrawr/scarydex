#!/usr/bin/env node

import process from "node:process";

const args = process.argv.slice(2);
const command = args.shift();

const DEFAULT_OLLAMA_URL = "http://localhost:11434";
const LIST_TIMEOUT_MS = 10_000;
const CHAT_TIMEOUT_MS = 300_000;

function fail(message, code = 1) {
  console.error(`decide: ${message}`);
  process.exit(code);
}

function baseUrl() {
  return (process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_URL).replace(/\/+$/, "");
}

function parseArgs(values) {
  const parsed = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      parsed._.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = values[index + 1];
    if (next === undefined || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function requireOptionString(options, flag) {
  const value = options[flag];
  if (typeof value !== "string" || value.length === 0) {
    fail(`Provide --${flag} with a non-empty value.`);
  }
  return value;
}

async function apiGet(path, timeoutMs) {
  const res = await fetch(`${baseUrl()}${path}`, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Ollama API error: ${res.status} ${res.statusText}`);
  return res.json();
}

const JEV_SYSTEM_PROMPT = `You are a decision analyst. Respond using the JEV framework:

1. JUDGMENT: Assess the situation. What type of decision is this? What are the
   key factors, constraints, and stakeholders?

2. EVALUATION: For each viable option, weigh the tradeoffs. Consider
   short-term and long-term consequences, risks, and hidden costs. Use
   evidence, not assumptions.

3. DECISION: Make a concrete recommendation. State it clearly, then
   summarize the rationale in one sentence.`;

async function listModels() {
  const data = await apiGet("/api/tags", LIST_TIMEOUT_MS);
  const models = data.models || [];
  if (models.length === 0) {
    console.log("No models found on Ollama endpoint.");
    return;
  }
  const decisionKeywords = ["decision", "jev", "reasoner"];
  console.log(`Found ${models.length} model(s) on Ollama endpoint.\n`);
  console.log("DECISION-CAPABLE:");
  for (const model of models) {
    const name = model.name || model.id;
    const isDecision = decisionKeywords.some((kw) => name.toLowerCase().includes(kw));
    if (isDecision) {
      const sizeMB = ((model.size || 0) / 1e6).toFixed(0);
      console.log(`  - ${name} (${sizeMB}MB)`);
    }
  }
  console.log("\nALL MODELS:");
  for (const model of models) {
    const sizeMB = ((model.size || 0) / 1e6).toFixed(0);
    console.log(`  - ${model.name || model.id} (${sizeMB}MB)`);
  }
}

async function runDecision(options) {
  let model = options.model;
  if (typeof model !== "string" || model.length === 0) {
    const data = await apiGet("/api/tags", LIST_TIMEOUT_MS);
    const names = (data.models || []).map((m) => m.name || m.id);
    if (names.length === 0) fail("No Ollama models available. Start Ollama and pull a decision model first.");
    console.log(`Available models: ${names.join(", ")}\n`);
    fail("Provide --model with one of the above model names.");
  }
  const question = requireOptionString(options, "question");

  const result = await apiPost("/api/chat", {
    model,
    messages: [
      { role: "system", content: JEV_SYSTEM_PROMPT },
      { role: "user", content: question },
    ],
    stream: false,
  });
  if (!result.message || !result.message.content) {
    fail("Unexpected response from Ollama. No content in message.");
  }
  console.log(result.message.content);
}

function usage() {
  console.log(`Usage: node scripts/decide.mjs <command> [options]

Commands:
  models              List decision-capable and all Ollama models
  run --model <name> --question "<decision>"  Run a JEV decision analysis

Environment:
  OLLAMA_BASE_URL     Ollama endpoint (default: http://localhost:11434)

The JEV framework structures decision reasoning in three phases:
  Judgment    - Assess the situation and key factors
  Evaluation  - Weigh options and tradeoffs
  Decision    - Make a concrete recommendation`);
}

async function dispatch() {
  switch (command) {
    case "models":
      await listModels();
      break;
    case "run":
      await runDecision(parseArgs(args));
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      usage();
      break;
    default:
      fail(`unknown command: ${command}`);
  }
}

function describeError(error) {
  const parts = [];
  let current = error;
  while (current) {
    if (current instanceof AggregateError) {
      parts.push(current.errors.map((nested) => describeError(nested)).join("; "));
      break;
    }
    parts.push(current.message || String(current));
    current = current.cause;
  }
  return [...new Set(parts.filter(Boolean))].join(": ");
}

try {
  await dispatch();
} catch (error) {
  fail(`Ollama request failed against ${baseUrl()}. Start Ollama or set OLLAMA_BASE_URL. Details: ${describeError(error)}`);
}
