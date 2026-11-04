import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { EC } from "../ir.ts";
import { readTrace } from "../frontends/trace.ts";
import { parseValue } from "../frontends/value.ts";
import { checkView, json } from "../frontends/view.ts";
import { inspect } from "node:util";

test("qualified action names survive a temporal counterexample and its back edge", () => {
  const trace = readTrace([
    { code: EC.TLC_STATE_PRINT2, level: 4, body: ["1: <module!Start line 1>", "/\\ x = 0"] },
    { code: EC.TLC_STATE_PRINT2, level: 4, body: ["2: <module!Advance line 2>", "/\\ x = 1"] },
    { code: EC.TLC_BACK_TO_STATE, level: 4, body: ["1: Back to state: <module!Reset line 3>"] },
  ]);
  assert.deepEqual(trace.seq.map(state => state.action), ["module!Start", "module!Advance", "module!Reset"]);
  assert.equal(trace.loop, 0);
  assert.deepEqual(trace.seq[2].vars, trace.seq[0].vars);
});

test("rich TLC value identities remain distinct before view projection", () => {
  assert.deepEqual(parseValue("Actor"), { kind: "model", name: "Actor" });
  assert.equal(parseValue('"Actor"'), "Actor");
  assert.deepEqual(parseValue("1..3"), { kind: "interval", lo: 1, hi: 3 });
  assert.deepEqual(parseValue("(1 :> TRUE @@ Actor :> FALSE)"), {
    kind: "function", printedAs: "pairs",
    keys: [1, { kind: "model", name: "Actor" }], values: [true, false],
  });
  assert.notDeepEqual(parseValue("{1, 2}"), parseValue("<<1, 2>>"));
  assert.throws(() => parseValue("{1, 2"), /cannot read/);
});

test("digit-leading TLC identifiers remain words without changing integers or intervals", () => {
  assert.deepEqual(parseValue("1Actor"), { kind: "model", name: "1Actor" });
  assert.deepEqual(parseValue("[1st |-> TRUE]"), {
    kind: "function", printedAs: "record", keys: ["1st"], values: [true],
  });
  assert.deepEqual(parseValue("(1Actor :> -12)"), {
    kind: "function", printedAs: "pairs",
    keys: [{ kind: "model", name: "1Actor" }], values: [-12],
  });
  assert.equal(parseValue("123"), 123);
  assert.equal(parseValue("-123"), -123);
  assert.deepEqual(parseValue("-2..3"), { kind: "interval", lo: -2, hi: 3 });
  assert.throws(() => parseValue("-1Actor"), /cannot read/);
});

test("view interval projection preserves small, empty and boundary-sized ranges", () => {
  assert.deepEqual(json(parseValue("-2..2")), [-2, -1, 0, 1, 2]);
  assert.deepEqual(json(parseValue("2..1")), []);
  const maximum = json(parseValue("1..100000"));
  assert.ok(Array.isArray(maximum));
  assert.equal(maximum.length, 100000);
  assert.equal(maximum[0], 1);
  assert.equal(maximum.at(-1), 100000);
  assert.throws(() => json(parseValue("1..100001")), /interval.*100000/i);
  assert.throws(() => json(parseValue("{1..100001}")), /interval.*100000/i);
  assert.throws(() => json(parseValue("9007199254740992..9007199254740992")), /safe integers/i);
});

test("unused huge intervals do not expand, and accessed ones fail within a bounded worker heap", () => {
  execFileSync("node", ["--max-old-space-size=64", "--input-type=module", "-e", `
    import assert from "node:assert/strict";
    import { inspect } from "node:util";
    import { checkView } from ${JSON.stringify(new URL("../frontends/view.ts", import.meta.url).href)};
    const vars = { ignored: { kind: "interval", lo: 1, hi: 2147483647 }, x: 2, ["__proto__"]: 3 };
    const view = checkView({
      state: ({ x }) => String(x),
      step: (action, from, to) => action + from.x + to.x,
      group: ({ x }) => x === 2 ? "phase" : undefined,
      colors: { phase: "blue" },
    }, inspect);
    assert.equal(view.state(vars), "2");
    assert.equal(view.step("Go", vars, vars), "Go22");
    assert.equal(view.group(vars), "phase");
    const proto = checkView({ state: vars => String(vars.__proto__) }, inspect);
    assert.equal(proto.state(vars), "3");
    const accessed = checkView({ state: vars => String(vars.ignored.length) }, inspect);
    assert.throws(() => accessed.state(vars), /interval.*100000/i);
  `], { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "pipe"] });
});

test("view exports and phase colors are validated before compilation", () => {
  assert.throws(() => checkView({ surprise: true }, inspect), /exports surprise/);
  assert.throws(() => checkView({ group: () => "phase" }, inspect), /no colors/);
  assert.throws(() => checkView({ colors: { phase: "red" } }, inspect), /color/);
  const view = checkView({ group: () => "phase", colors: { phase: "blue" } }, inspect);
  assert.equal(view.group?.({ x: parseValue("1..3") }), "phase");
});
