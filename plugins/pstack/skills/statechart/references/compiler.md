# Check a model with the statechart compiler

Use Node.js 22.18+ on macOS or Linux. The compiler requires POSIX process-group cleanup; it does not claim Windows parity. Java 11+ and a local `tla2tools.jar` must already exist. Set `TLA2TOOLS` to its absolute path and optionally `JAVA` to the Java executable. No mise, Java, TLC or rendering package is installed.

Copy the model, config and local dependencies to an approved scratch folder outside the repository. Inspect a view module and its dependencies before executing them. Views are code, not untrusted configuration. Use immutable approved copies and a fresh output folder; the compiler does not provide the conversion workflow's mapping-import fingerprints or replacement inventory.

```sh
node "<skill dir>/scripts/compiler/statechart.mjs" SPEC.tla --out "<fresh output>"
```

Options are `--config FILE`, `--view FILE` and `--out DIR`. The default config shares the spec's basename, and default output is `statechart-out` beside the spec. Only exits 0 and 1 publish: 0 means the checked rules hold; 1 means at least one breaks. Errors and signals publish nothing. Existing nonempty output is refused, never replaced.

## Write the model

Write each reader-agreed rule as an invariant or property. Add a variable when a rule has no modeled value; never weaken a rule to make it pass. Make `Next` a disjunction of concrete actions so TLC can name steps. Deadlock is a rule, including at a valid terminal state: add a terminal stuttering action when ending there is intended. A rule named `NoDeadlock` remains distinct from the generated deadlock check.

Tie modeled actions and guards to real code when modeling an implementation. Replay every reported bug path against caller-reachable code with a test or live repro. A model counterexample alone is not proof of a product bug.

## Label the chart

The view exports `state(vars)` returning a string for a flat chart, an array for hierarchy, or an object whose keys name parallel regions. Label what the reader sees or cares about, not variable names. TLC sets become arrays; sequences become objects keyed from 1; model values remain distinguishable in the compiler's internal representation.

Optional `step(action, from, to)` labels arrows. Equal visible outcomes should share labels. A condition on another parallel region is derived from its state; do not obscure it with a redundant bracketed label. Return `null` only for steps the reader does not need. Keep every chart state reachable, preserve an outgoing arrow when the model has one, and hide all steps of an arrow or none.

Optional `group(vars)`, `colors` and `title` name phases, theme colors and the chart title. Colors are `blue`, `orange`, `purple`, `yellow`, `teal`, `tan` or `pink`. Callbacks must depend only on their arguments. The compiler shares their answers between chart and report.

## Read and deliver the output

`report.md` lists rule verdicts, shortest invariant paths, temporal counterexamples and unverified rules. `tlc.out` preserves plain TLC output; a missing chart path can also produce `tlc-RULE.out`. A state marked `breaks` always breaks a rule; `mayBreak` means only some underlying model states do.

The full chart budget is 500 states. Above it, only bug paths are drawn; a passing large model may have no `chart.mmd`. The first verdict uses the written config. After a failure, reruns remove failed rules and stop at 100,000 distinct states. Rules beyond a bound or error are not checked, not passing. Constraints and symmetry can omit or collapse behavior; explain those limits from the report.

Show `chart.mmd` as Mermaid and provide the report and exact regeneration command with a fresh output path. Optional images need an already available, explicitly approved renderer and actual image inspection. Pele and automatic renderer acquisition are not part of this port.
