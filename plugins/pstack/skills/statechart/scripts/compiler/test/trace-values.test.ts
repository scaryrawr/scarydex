import assert from "node:assert/strict";
import { test } from "node:test";
import { EC } from "../ir.ts";
import { readTrace } from "../frontends/trace.ts";
import { parseValue } from "../frontends/value.ts";
import { checkView } from "../frontends/view.ts";
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

test("view exports and phase colors are validated before compilation", () => {
  assert.throws(() => checkView({ surprise: true }, inspect), /exports surprise/);
  assert.throws(() => checkView({ group: () => "phase" }, inspect), /no colors/);
  assert.throws(() => checkView({ colors: { phase: "red" } }, inspect), /color/);
  const view = checkView({ group: () => "phase", colors: { phase: "blue" } }, inspect);
  assert.equal(view.group?.({ x: parseValue("1..3") }), "phase");
});
