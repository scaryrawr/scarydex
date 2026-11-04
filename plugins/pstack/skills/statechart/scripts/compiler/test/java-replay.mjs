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
const drawing = wrapper.includes("\nChartMark ==");
const name = drawing ? "ChartRun" : config ? path.basename(config, ".cfg") : "sany";
const dump = args.includes("-dump") ? `${args[args.indexOf("-dump") + 2]}.dot` : undefined;
const replay = process.env.STATECHART_REPLAY;

if (!replay) throw new Error("Set STATECHART_REPLAY to the approved fixture folder.");

if (dump && fs.existsSync(path.join(replay, "graph.dot"))) {
  fs.copyFileSync(path.join(replay, "graph.dot"), dump);
}

const tag = drawing ? wrapper.match(/"chart-[0-9a-f]{32}"/)?.[0] : undefined;
const saved = fs.readFileSync(path.join(replay, `${name}.out`), "utf8");
process.stdout.write(tag ? saved.replace(/(<<\s*)"chart"(?=,)/g, `$1${tag}`) : saved);
const exit = path.join(replay, `${name}.exit`);
process.exit(fs.existsSync(exit) ? Number(fs.readFileSync(exit, "utf8")) : 0);
