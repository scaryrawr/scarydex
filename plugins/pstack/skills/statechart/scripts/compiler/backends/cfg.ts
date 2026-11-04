import { CHART_STATES, type ConfigSection, RERUN_STATES, type Spec } from "../ir.ts";

export function configText(sections: ConfigSection[], extra: string[]) {
  const lines: string[] = [];
  for (const s of sections) lines.push(`${s.key} ${s.tokens.join(" ")}`);
  lines.push(...extra);
  return lines.join("\n");
}

export function compilerNames(reserved: ReadonlySet<string>) {
  const taken = new Set(reserved);
  const fresh = (base: string) => {
    let name = base;
    for (let suffix = 1; taken.has(name); suffix++) name = `${base}_${suffix}`;
    taken.add(name);
    return name;
  };
  return {
    tlc: fresh("ChartTLC"),
    naturals: fresh("ChartNaturals"),
    bound: fresh("ChartBound"),
    budget: fresh("ChartBudget"),
    broken: fresh("ChartBroken"),
    mark: fresh("ChartMark"),
  };
}

type CompilerNames = ReturnType<typeof compilerNames>;

export const boundRun = (module: string, wrapper: string, names: CompilerNames) =>
  [
    `---- MODULE ${wrapper} ----`,
    `EXTENDS ${module}`,
    `${names.tlc} == INSTANCE TLC`,
    `${names.naturals} == INSTANCE Naturals`,
    `${names.bound} == ${names.naturals}!<(${names.tlc}!TLCGet("distinct"), ${RERUN_STATES})`,
    `====`,
  ].join("\n");

export function chartRun({ module, variables, invariants }: Spec, tag: string, wrapper: string, names: CompilerNames) {
  const every: string[] = [];
  for (const name of invariants) every.push(`(IF ~${name} THEN {"${name}"} ELSE {}) \\cup `);
  return [
    `---- MODULE ${wrapper} ----`,
    `EXTENDS ${module}`,
    `${names.tlc} == INSTANCE TLC`,
    `${names.naturals} == INSTANCE Naturals`,
    `${names.budget} == ${names.naturals}!<=(${names.tlc}!TLCGet("distinct"), ${CHART_STATES})`,
    `${names.broken} == ${every.join("")}{}`,
    `${names.mark} == ${names.broken} = {} \\/ ${names.tlc}!PrintT(<<"${tag}", <<${variables.join(", ")}>>, ${names.broken}>>)`,
    `====`,
  ].join("\n");
}
