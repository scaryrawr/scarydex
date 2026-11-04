import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const config = args.includes("-config") ? args[args.indexOf("-config") + 1] : undefined;
const module = args.at(-1);
const wrapper = config && fs.existsSync(`${module}.tla`)
  ? fs.readFileSync(`${module}.tla`, "utf8")
  : "";
if (wrapper.includes(`EXTENDS ${module}\n`))
  throw new Error(`Generated wrapper ${module} extends itself.`);
const tag = wrapper.match(/"chart-[0-9a-f]{32}"/)?.[0];
const drawing = tag !== undefined;
const name = drawing ? "ChartRun" : config ? path.basename(config, ".cfg") : "sany";
const dump = args.includes("-dump") ? `${args[args.indexOf("-dump") + 2]}.dot` : undefined;
const replay = process.env.STATECHART_REPLAY;

if (!replay) throw new Error("Set STATECHART_REPLAY to the approved fixture folder.");

const namespaceFile = path.join(replay, "namespace.json");
if (wrapper && fs.existsSync(namespaceFile)) {
  const names = new Set(JSON.parse(fs.readFileSync(namespaceFile, "utf8")));
  const declarations = [...wrapper.matchAll(/^(\w+) == (.*)$/gm)];
  for (const [, name] of declarations)
    if (names.has(name)) throw new Error(`Generated operator ${name} redeclares a model symbol.`);
  const cfg = fs.readFileSync(config, "utf8");
  for (const [, name, body] of declarations) {
    const section = body.includes("!PrintT(") ? "INVARIANT" : body.includes('!TLCGet("distinct")') ? "CONSTRAINT" : undefined;
    if (section && !cfg.split("\n").includes(`${section} ${name}`))
      throw new Error(`Generated config does not reference ${section} ${name}.`);
  }
  fs.appendFileSync(path.join(replay, "wrapper-audit.jsonl"), JSON.stringify({
    module, kind: drawing ? "drawing" : "bound", names: declarations.map(([, name]) => name),
  }) + "\n");
}

if (dump && fs.existsSync(path.join(replay, "graph.dot"))) {
  fs.copyFileSync(path.join(replay, "graph.dot"), dump);
}

const saved = fs.readFileSync(path.join(replay, `${name}.out`), "utf8");
process.stdout.write(tag ? saved.replace(/(<<\s*)"chart"(?=,)/g, `$1${tag}`) : saved);
const exit = path.join(replay, `${name}.exit`);
process.exit(fs.existsSync(exit) ? Number(fs.readFileSync(exit, "utf8")) : 0);
