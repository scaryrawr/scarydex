import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inspect } from "node:util";
import { mermaidLines } from "../backends/mermaid.ts";
import { checkView } from "../frontends/view.ts";
import {
  type Chart,
  type CheckResult,
  EC,
  LEVEL,
  type Rule,
  type Spec,
  stateRules,
  type Verdict,
} from "../ir.ts";
import { compile } from "../pipeline.ts";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const sources = (target: string) => {
  const full = path.join(scripts, target);
  if (!fs.statSync(full).isDirectory()) return [target];
  return fs
    .readdirSync(full, { recursive: true, encoding: "utf8" })
    .map((entry) => path.join(target, entry))
    .filter((file) => fs.statSync(path.join(scripts, file)).isFile());
};

const RECORD = `
import { registerHooks } from "node:module";
const edges = [];
registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context);
    if (context.parentURL !== import.meta.url) edges.push([context.parentURL, resolved.url]);
    return resolved;
  },
});
for (const url of process.argv.slice(1)) await import(url);
console.log(JSON.stringify(edges));
`;
const loads = (...targets: string[]) => {
  const urls = targets.flatMap(sources).map((file) => pathToFileURL(path.join(scripts, file)).href);
  const out = execFileSync("node", ["--input-type=module", "-e", RECORD, ...urls], {
    encoding: "utf8",
  });
  const name = (url: string) =>
    url.startsWith("file:") ? path.relative(scripts, fileURLToPath(url)) : url;
  return (JSON.parse(out) as string[][]).map(([from, to]) => [name(from), name(to)]);
};

const COMMENT =
  /("(?:[^"\\\n]|\\[\s\S])*"|'(?:[^'\\\n]|\\[\s\S])*'|`(?:[^`\\]|\\[\s\S])*`)|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
const codeOf = (file: string) =>
  fs.readFileSync(path.join(scripts, file), "utf8").replace(COMMENT, (_, text) => text ?? " ");

const RUNTIME =
  /\b(?:process|require|globalThis|global|Deno|Bun|Buffer|setImmediate|clearImmediate|fetch)\b|\bimport\s*\(/g;
const TYPE_IMPORT =
  /\b(?:import|export)\s+type\b\s*(?:[\w$]+|\*(?:\s*as\s+[\w$]+)?|\{[^}]*\})\s*from\s*["']([^"']*)["']/g;
const typeImports = (file: string) =>
  Array.from(codeOf(file).matchAll(TYPE_IMPORT), (m) => path.join(path.dirname(file), m[1]));

test("ir.ts imports nothing", () => {
  assert.deepEqual(loads("ir.ts"), []);
  assert.deepEqual(typeImports("ir.ts"), []);
});

test("each pass imports only ir.ts", () => {
  const files = sources("passes");
  assert.deepEqual(
    files.filter((file) => !file.endsWith(".ts")),
    [],
  );
  const found = loads("passes");
  assert.ok(found.length > 0);
  for (const [from, to] of found) assert.equal(to, "ir.ts", `${from} imports ${to}`);
  for (const file of files)
    for (const to of typeImports(file))
      assert.equal(to, "ir.ts", `${file} imports types from ${to}`);
});

test("pipeline.ts reaches no node: module", () => {
  assert.deepEqual(
    loads("pipeline.ts").filter(([, to]) => to.startsWith("node:")),
    [],
  );
  for (const to of typeImports("pipeline.ts"))
    assert.equal(to, "ir.ts", `pipeline.ts imports types from ${to}`);
});

test("ir.ts, the passes, pipeline.ts, the frontends, the backends, and every file they load are .ts files that name no listed runtime global and call no import()", () => {
  const targets = ["ir.ts", "passes", "pipeline.ts", "frontends", "backends"];
  const reached = loads(...targets).flatMap(([, to]) => (to.startsWith("node:") ? [] : [to]));
  const files = [...new Set([...targets.flatMap(sources), ...reached])];
  assert.deepEqual(
    files.filter((file) => !file.endsWith(".ts")),
    [],
  );
  for (const file of files) assert.deepEqual(codeOf(file).match(RUNTIME), null, file);
});

test("no frontend or backend loads a node: module when imported, even through another file", () => {
  for (const folder of ["frontends", "backends"]) {
    const files = fs
      .readdirSync(path.join(scripts, folder), { encoding: "utf8", recursive: true })
      .filter((f) => f.endsWith(".ts"));
    assert.ok(files.length > 0, folder);
    for (const f of files)
      for (const [, to] of loads(path.join(folder, f)))
        assert.ok(!to.startsWith("node:"), `${folder}/${f} reaches ${to}`);
  }
});

const small: Rule = { kind: "invariant", name: "Small" };

const noView = checkView({}, inspect);

const holding = (spec: Spec) => {
  const verdicts: Verdict[] = [];
  for (const rule of stateRules(spec))
    verdicts.push({ rule, outcome: "holds", messages: undefined });
  return verdicts;
};

const twoStates = (breaks: Rule[], property = "Settles"): CheckResult => ({
  spec: {
    module: "Two",
    variables: ["x"],
    invariants: ["Small"],
    properties: [property],
    deadlock: false,
    written: [],
    folder: "",
  },
  paths: undefined,
  graph: {
    states: new Map([
      ["1", { vars: { x: 0 }, start: true, breaks: [] }],
      ["2", { vars: { x: 1 }, start: false, breaks }],
    ]),
    steps: [{ from: "1", to: "2", action: "Grow" }],
  },
  rules: [{ rule: small, outcome: breaks.length ? "broken" : "holds", messages: undefined }],
  properties: [
    {
      rule: { kind: "property", name: property },
      outcome: breaks.length ? "broken" : "holds",
      messages: [
        {
          code: EC.TLC_STATE_PRINT2,
          level: LEVEL.STATE,
          body: ["1: <Initial predicate>", "x = 0"],
        },
      ],
      bug: undefined,
      initialOnly: false,
    },
  ],
  exit: breaks.length ? 1 : 0,
  stop: undefined,
  drawing: undefined,
  states: { distinct: 2, initial: 1, complete: true, cut: false },
  messages: [{ code: EC.TLC_FINISHED, level: LEVEL.NONE, body: ["Finished in 394ms at (T)"] }],
});

const body = (files: Map<string, Iterable<string | Uint8Array>>, name: string) => {
  let text = "";
  for (const part of files.get(name) ?? [])
    text += typeof part === "string" ? part : new TextDecoder().decode(part);
  return text;
};

test("the pipeline turns a hand-built graph into the out folder's files with no TLC", () => {
  const broken = compile(twoStates([small]), noView);
  assert.equal(broken.exit, 1);
  assert.deepEqual(
    [...broken.files.keys()],
    ["chart.mmd", "report.md", "tlc.out", "tlc-Settles.out"],
  );
  assert.equal(body(broken.files, "report.md"), broken.report);
  assert.equal(body(broken.files, "tlc.out"), "Finished in 00s at (T)\n");
  assert.equal(body(broken.files, "tlc-Settles.out"), "State 1: <Initial predicate>\nx = 0\n");
  assert.equal(
    broken.report,
    [
      "# Two",
      "",
      "TLC reached 2 states and 1 steps. The chart draws 2 states and 1 arrows.",
      "",
      "## Small breaks",
      "The shortest path has 1 step:",
      "0. 0",
      "1. Grow: 1",
      "",
      "## Settles breaks",
      "TLC found a counterexample. It is in tlc-Settles.out.",
    ].join("\n"),
  );
  assert.match(
    body(broken.files, "chart.mmd"),
    /^ {2}(s\d+) --> (s\d+): Grow\n[\s\S]*^ {2}class \2 breaks$/m,
  );

  const holds = compile(twoStates([]), noView);
  assert.equal(holds.exit, 0);
  assert.deepEqual([...holds.files.keys()], ["chart.mmd", "report.md", "tlc.out"]);
  assert.match(holds.report, /^## Rules that hold\nSmall, Settles$/m);
  assert.doesNotMatch(body(holds.files, "chart.mmd"), /breaks/);
});

test("an invariant and a property with one name stay two rules", () => {
  const reportWithSmallProperty = (breaks: Rule[]) => {
    const result = twoStates(breaks);
    const step = result.graph.steps[0];
    result.spec.properties = ["Small"];
    result.properties = [
      {
        rule: { kind: "property", name: "Small" },
        outcome: "broken",
        messages: [],
        bug: { start: "1", path: [{ action: "Grow", state: "2", step }], loop: 1, stutters: true },
        initialOnly: false,
      },
    ];
    return compile(result, noView).report;
  };
  const both = reportWithSmallProperty([small]);
  assert.match(both, /^## Small breaks\nThe shortest path has 1 step:$/m);
  assert.match(
    both,
    /^## Small breaks\nTLC's counterexample is in tlc-Small\.out\. It has 1 step:$/m,
  );
  assert.match(reportWithSmallProperty([]), /^## Rules that hold\nSmall$/m);
});

test("a PROPERTY that breaks with no path writes TLC's counterexample", () => {
  const result = twoStates([]);
  result.properties[0].outcome = "broken";
  const { report, files } = compile(result, noView);
  assert.match(
    report,
    /^## Settles breaks\nTLC found a counterexample\. It is in tlc-Settles\.out\.$/m,
  );
  assert.equal(body(files, "tlc-Settles.out"), "State 1: <Initial predicate>\nx = 0\n");
});

test("a rule named NoDeadlock leaves the deadlock rule a name of its own", () => {
  const holds = (result: CheckResult) => {
    result.spec.deadlock = true;
    result.rules = holding(result.spec);
    return compile(result, noView).report.match(/^## Rules that hold\n(.*)$/m)?.[1];
  };
  const invariant = twoStates([]);
  invariant.spec.invariants = ["NoDeadlock"];
  assert.equal(holds(invariant), "NoDeadlock, CHECK_DEADLOCK, Settles");
  assert.equal(holds(twoStates([], "NoDeadlock")), "Small, CHECK_DEADLOCK, NoDeadlock");
  assert.equal(holds(twoStates([])), "Small, NoDeadlock, Settles");
});

test("a run that does not check for deadlock never names CHECK_DEADLOCK", () => {
  const invariant = twoStates([]);
  invariant.spec.invariants = ["Small", "NoDeadlock"];
  for (const result of [invariant, twoStates([], "NoDeadlock")]) {
    result.rules = holding(result.spec);
    assert.doesNotMatch(compile(result, noView).report, /CHECK_DEADLOCK/);
  }
});

test("default labels preserve literal TLC strings that resemble missing custom values", () => {
  for (const text of ["undefined", "NaN", "[object Object]"]) {
    const result = twoStates([small]);
    const state = result.graph.states.get("2");
    assert.ok(state);
    state.vars.x = text;
    const compiled = compile(result, noView);
    assert.equal(compiled.exit, 1);
    assert.ok(body(compiled.files, "chart.mmd").includes(text));
    assert.ok(compiled.report.includes(text));
    assert.throws(
      () => compile(result, checkView({ state: () => text }, inspect)),
      /The view's state\(\) returned/,
    );
  }
});

for (const scenario of ["starts", "moves"]) {
  test(`25 correlated regions with impossible ${scenario} fall back within a bounded worker heap`, () => {
    execFileSync("node", ["--max-old-space-size=64", "--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { inspect } from "node:util";
    import { checkView } from ${JSON.stringify(new URL("../frontends/view.ts", import.meta.url).href)};
    import { project } from ${JSON.stringify(new URL("../pipeline.ts", import.meta.url).href)};
    import { walk } from ${JSON.stringify(new URL("../passes/reach.ts", import.meta.url).href)};
    const flags = value => Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => ["flag" + i, value]),
    );
    const multipleStarts = ${scenario === "starts"};
    const graph = {
      states: new Map([
        ["off", { vars: flags(false), start: true, breaks: [] }],
        ["on", { vars: flags(true), start: multipleStarts, breaks: [] }],
      ]),
      steps: [],
    };
    if (!multipleStarts) {
      graph.states.set("other", { vars: flags("other"), start: false, breaks: [] });
      graph.steps.push(
        { from: "off", to: "on", action: "Set" },
        { from: "off", to: "other", action: "Set" },
      );
    }

    const view = checkView({
      state: vars => Object.fromEntries(
        Object.entries(vars).map(([name, value]) => [name, String(value)]),
      ),
    }, inspect);
    const { chart } = project(graph, walk(graph), view, []);
    assert.match(chart.lie, multipleStarts ? /where the model never starts/ : /which the model never does/);
    assert.equal(chart.regions.length, 1);
    assert.equal(chart.regions[0].states.length, multipleStarts ? 2 : 3);
    `], { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
  });
}

test("portable Mermaid charts define every emitted phase, failure, path and loop class", () => {
  const colors = {
    Blue: "blue", Orange: "orange", Purple: "purple", Yellow: "yellow",
    Teal: "teal", Tan: "tan", Pink: "pink",
  };
  const chart: Chart = {
    title: undefined, colors, paths: ["Small"], loops: ["Settles"],
    notes: [], inside: 0, quiet: 0,
    regions: [{
      name: "", steps: [], arrows: [],
      states: Object.keys(colors).map((group, i) => ({
        path: [group], group, start: i === 0, members: [i],
        works: false, lead: true, repeats: true,
        breaks: i < 2 ? [{ rule: small, always: i === 0 }] : [],
      })),
    }],
  };
  const lines = mermaidLines(chart);
  const classes = new Set(lines.flatMap(line => /^  class \S+ (\S+)$/.exec(line)?.slice(1) ?? []));
  assert.deepEqual([...classes].sort(), [...Object.values(colors), "breaks", "mayBreak", "bugPath", "repeats"].sort());
  for (const cls of classes) {
    const definitions = lines.filter(line => line.startsWith(`  classDef ${cls} `));
    assert.equal(definitions.length, 1, `missing or duplicate class definition for ${cls}`);
    assert.ok(lines.some(line => new RegExp(`^  class lg\\d+ ${cls}$`).test(line)), cls);
  }
  for (const color of Object.values(colors))
    assert.ok(lines.some(line => line.startsWith(`  classDef ${color} fill:#`)), color);
  assert.ok(lines.some(line => /^  classDef bugPath .*stroke-width:4px/.test(line)));
  assert.ok(lines.some(line => /^  classDef repeats .*stroke-dasharray:/.test(line)));
});
