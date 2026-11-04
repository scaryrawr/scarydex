import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const config = args.includes("-config") ? args[args.indexOf("-config") + 1] : undefined;
const name = config ? path.basename(config, ".cfg") : "sany";
const dump = args.includes("-dump") ? `${args[args.indexOf("-dump") + 2]}.dot` : undefined;
const replay = process.env.STATECHART_REPLAY;

if (!replay) throw new Error("Set STATECHART_REPLAY to the approved fixture folder.");

if (dump && fs.existsSync(path.join(replay, "graph.dot"))) {
  fs.copyFileSync(path.join(replay, "graph.dot"), dump);
}

const tag = fs.existsSync("ChartRun.tla")
  ? fs.readFileSync("ChartRun.tla", "utf8").match(/"chart-[0-9a-f]{32}"/)?.[0]
  : undefined;
const saved = fs.readFileSync(path.join(replay, `${name}.out`), "utf8");
process.stdout.write(tag ? saved.replace(/(<<\s*)"chart"(?=,)/g, `$1${tag}`) : saved);
const exit = path.join(replay, `${name}.exit`);
process.exit(fs.existsSync(exit) ? Number(fs.readFileSync(exit, "utf8")) : 0);
