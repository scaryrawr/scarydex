import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { validatePlanText } from "../plugins/pstack/skills/poteto-mode/scripts/plan-rules.mjs";

const roots = [];

afterEach(async () => { for (const dir of roots.splice(0)) await rm(dir, { recursive: true, force: true }); });

async function root() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scarydex-pstack-"));
  roots.push(dir);

  return dir;
}

const validator = new URL("../plugins/pstack/skills/pstack-schema-validate/scripts/validate.mjs", import.meta.url).pathname;

test("basic plans require a title and executable checklist", () => {
  assert.equal(validatePlanText("# Plan\n\n- [ ] Run the regression check.\n", "basic").findings.length, 0);
  const invalid = validatePlanText("No title and no checklist", "basic");
  assert.ok(invalid.findings.some((finding) => finding.rule === "h1"));
  assert.ok(invalid.findings.length > 1);
  assert.throws(() => validatePlanText("# Plan", "invented"), /unknown plan profile/);
});

test("the receipt CLI validates persisted evidence and rejects missing proof", async () => {
  const cwd = await root(), file = path.join(cwd, "receipt.json");

  const receipt = { schemaVersion: 1, receiptId: "0123456789abcdef0123", pr: 12, sha: "abc123", verdict: "unit-test-verified",
    verifier: "fixture", summary: "Regression passed", evidence: [{ kind: "command", value: "npm test passed" }], createdAt: "2026-10-01T20:00:00Z" };

  await writeFile(file, JSON.stringify(receipt));
  const valid = spawnSync(process.execPath, [validator, "receipt", file], { cwd, encoding: "utf8" });
  assert.equal(valid.status, 0, valid.stderr); assert.match(valid.stdout, /receipt contract valid/);
  receipt.evidence = []; await writeFile(file, JSON.stringify(receipt));
  const invalid = spawnSync(process.execPath, [validator, "receipt", file], { encoding: "utf8" });
  assert.equal(invalid.status, 1); assert.match(invalid.stderr, /evidence.*non-empty array/);
});

test("decision log appends rows and neutralizes spreadsheet formulas", async () => {
  const cwd = await root(), file = path.join(cwd, "decisions.tsv");
  const script = new URL("../plugins/pstack/skills/show-me-your-work/scripts/log.sh", import.meta.url).pathname;

  for (const decision of ["=danger()", "choose\nfixture"]) {
    const result = spawnSync("bash", [script, file, "test", decision, "because", "proof", "pass"], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  }

  const lines = (await readFile(file, "utf8")).trimEnd().split("\n");
  assert.equal(lines.length, 3); assert.equal(lines[0], "ts\tphase\tdecision\twhy\tevidence\tresult");
  assert.equal(lines[1].split("\t")[2], "'=danger()"); assert.equal(lines[2].split("\t")[2], "choose fixture");
});

test("the documented multi-PR skeleton passes its own verified-stack contract", async () => {
  const guide = await readFile(new URL("../plugins/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md", import.meta.url), "utf8");
  const skeleton = guide.match(/```markdown\n([\s\S]*?)\n```/);
  assert.ok(skeleton);
  assert.deepEqual(validatePlanText(skeleton[1], "verified-stack").findings, []);
  const broken = skeleton[1].replaceAll("Parallel Codex workers at the PR head", "Workers will verify sometime");
  assert.ok(validatePlanText(broken, "verified-stack").findings.some((finding) => finding.rule === "live-lanes"));
});

test("program cadence accepts hourly and 30-minute only on the audit tick or status message line", async () => {
  const guide = await readFile(new URL("../plugins/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md", import.meta.url), "utf8");
  const skeleton = guide.match(/```markdown\n([\s\S]*?)\n```/)[1];
  const cadence = (text) => validatePlanText(text, "verified-stack").findings.some((finding) => finding.rule === "audit-cadence");
  assert.equal(cadence(skeleton.replace("Arm the hourly audit tick", "Arm the 30-minute audit tick")), false);
  assert.equal(cadence(skeleton.replace("Arm the hourly audit tick", "Arm the hourglass audit tick")), true);
  const stray = skeleton.replace("Arm the hourly audit tick", "Arm the audit tick").replace("- [ ] Use this tick prompt, verbatim.", "- [ ] Review the hourly metrics dashboard.\n- [ ] Use this tick prompt, verbatim.");
  assert.equal(cadence(stray), true);
});

test("fenced example text cannot satisfy the audit cadence check", async () => {
  const guide = await readFile(new URL("../plugins/pstack/skills/poteto-mode/playbooks/multi-phase-plan.md", import.meta.url), "utf8");
  const skeleton = guide.match(/```markdown\n([\s\S]*?)\n```/)[1];
  const cadence = (text) => validatePlanText(text, "verified-stack").findings.some((finding) => finding.rule === "audit-cadence");
  const withoutCadence = (text) => text.replace("Arm the hourly audit tick", "Arm the audit tick");
  const tilde = withoutCadence(skeleton).replace("- [ ] Use this tick prompt, verbatim.", "~~~text\nhourly audit tick\n~~~\n- [ ] Use this tick prompt, verbatim.");
  assert.equal(cadence(tilde), true);
  const nested = withoutCadence(skeleton).replace("- [ ] Use this tick prompt, verbatim.", "```text\n~~~\nhourly audit tick\n~~~\n```\n- [ ] Use this tick prompt, verbatim.");
  assert.equal(cadence(nested), true);
  const outside = skeleton.replace("- [ ] Use this tick prompt, verbatim.", "~~~text\nexample only\n~~~\n- [ ] Use this tick prompt, verbatim.");
  assert.equal(cadence(outside), false);
});

test("bundled orchestration runs under Node without dependencies or duplicate execution", async () => {
  const cwd = await root(), helper = path.join(cwd, "orch.mjs"), store = path.join(cwd, "store");
  await writeFile(helper, await readFile(new URL("../plugins/pstack/skills/poteto-mode/scripts/orch/orch.mjs", import.meta.url)));
  const invoke = (...args) => spawnSync(process.execPath, [helper, "--store", store, "--json", ...args], { cwd, encoding: "utf8" });
  const initialized = invoke("init"); assert.equal(initialized.status, 0, initialized.stderr);
  assert.ok(JSON.parse(initialized.stdout));
  const added = invoke("unit", "add", "fixture", "--track", "port"); assert.equal(added.status, 0, added.stderr);
  assert.equal(JSON.parse(added.stdout).id, "fixture");
  const list = invoke("unit", "list"); assert.equal(list.status, 0, list.stderr);
  assert.equal(JSON.parse(list.stdout).length, 1);
});

test("bundled PR watcher exposes help without GitHub access or package installs", async () => {
  const cwd = await root(), helper = path.join(cwd, "watch-pr.mjs");
  await writeFile(helper, await readFile(new URL("../plugins/pstack/skills/poteto-mode/scripts/watch-pr/watch-pr.mjs", import.meta.url)));
  const result = spawnSync(process.execPath, [helper, "--help"], { cwd, encoding: "utf8", env: { PATH: "" } });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /immutable queued stack/);
});
