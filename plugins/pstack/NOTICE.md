# pstack attribution and port boundary

Adapted from [pstack](https://github.com/cursor/plugins/tree/main/pstack) by
Lauren Tan, distributed under the included [MIT license](LICENSE).
ScaryDex starts from ScaryPilot’s reviewed pstack 0.15.4 skills and deterministic
helpers, integrated from Cursor repository commit
`b0b9c7a0baf8b6aa1d00bf77d4101e577d4ba411`.
The original Cursor 0.15.5 tree at
`c47b12849e43f18d5c374c7069c744cc55b0ea00` was inspected for comparison, not
silently imported as a new baseline. Repository-wide provenance is recorded in
`port-provenance.json` at the marketplace root.

The portable update to pstack 0.15.25 is pinned to Cursor commit
[`6ce45c59b9301a638c1fe1a7b8dc2a82b650898f`](https://github.com/cursor/plugins/commit/6ce45c59b9301a638c1fe1a7b8dc2a82b650898f).
Its reviewed changes and dispositions are appended in `upstream-sync.json`;
the original provenance baseline remains immutable.

The subsequent portable pstack 0.15.28 update is integrated through
[`88d47514b82e7c44f00f2b2a72ff6dd12158038c`](https://github.com/cursor/plugins/commit/88d47514b82e7c44f00f2b2a72ff6dd12158038c).
It includes premise/root-cause/idempotence refinements, reduced marginal guidance,
branded-type guards, complete catch-ups, formal-verification creation/maintenance,
and rewrite-only sharpen. The Codex testing principle retains independent-oracle
and defect-injection guidance while adopting the internal-refactor check.
Skill-name and local-link validation plus help-map regression coverage replace
the upstream docs-versus-tree check. The review ledger distinguishes integrated
content from unrelated or host-only history.

Codex-specific changes:

- Native `.codex-plugin` metadata and Codex skill discovery, without copying
  Cursor's root manifest or host-only frontmatter.
- Project skills under `.agents/skills`, explicit pstack model preferences in
  Codex home, and scoped app history instead of harness transcript scanning.
- Codex subagent workflows with inherited models rather than Copilot Task,
  dynamic workflows, or Cursor model slugs and cloud flags. The receiving chat
  owns the workflow; delegates receive the installed mode path.
- Agent behavior retained as linked prompt references, not unsupported agent
  registration manifests.
- Local scripts and artifacts replace Copilot capabilities, status, handoff,
  receipt, worktree, and swarm extension tool dependencies.
- Preserved contract/plan validation, decision logs, worktree audit, PR watcher,
  and orchestration scripts. The latter two ship as bundled Node helpers
  instead of installing dependencies into the plugin cache.
- GitHub PR base-chain orchestration discovery replaces its Graphite dependency.
  Origin's host-specific adapter is excluded. Frontier order, SHA and generation
  safeguards remain in place.
- Read-only ketchup catch-ups use existing visual artifacts or supported diagrams,
  not an assumed visualize tool or unsolicited media capture.
- Explicit approval and scope boundaries for external writes and deletions.
- Formal-verification skills generated under `.agents/skills/`, with tool
  prerequisites, stated bounds, real-code fallback testing and isolated scratch
  mutation checks. Maintenance preserves product code, findings and dirty-work
  evidence rather than claiming an uncommitted tree is covered by a sync commit.
  Missing sync records require an evidence-backed baseline or full reconciliation
  with current covered code, never an assumed baseline from a file's last edit.

The `deslop` skill was adapted by ScaryPilot from Cursor’s `cursor-team-kit` and
retains that attribution. Cursor-only `make-bot-ui`, Benny automation pack,
logos, and Copilot native extensions are not included. GitHub Copilot review-bot
recognition in the PR watcher remains because it is platform data, not a runtime
dependency. Existing ScaryPilot sync tooling is not shipped: its ownership and
extension checks do not describe this port.
Claude harness trees, their generator/marketplace, and Claude tool/model/history
mappings are also excluded. The native Codex manifest and runtime mapping remain
authoritative; no upstream packaging script is executed during porting.

The next portable update is reviewed through ScaryPilot commit
[`53263e5b135e6c1dbab762b81b9165bf73eccb6e`](https://github.com/scaryrawr/scarypilot/commit/53263e5b135e6c1dbab762b81b9165bf73eccb6e).
It adds statechart from the ScaryPilot upstream-0.15.30 integration, including
Windows output-folder validation, proportionate acceptance-condition evidence
and its synthetic eval metadata, workspace-confined artifact reads, a portable
Node decision log, and a strictly read-only worktree audit. The original import
and earlier integration records above remain unchanged.

Statechart uses preinstalled Java/TLC and optionally an already available
Mermaid renderer. It never silently installs those prerequisites. Mapping
modules execute code and must be inspected before use. Unlisted output files
and symlinks block folder replacement. The portable suite is retained with
Node subprocesses under Bun and Codex plan-fixture vocabulary. Full TLC-backed
coverage is not claimed when Java or the supplied jar is unavailable.
Local statechart corrections confine rule-derived filenames, resolve composite
membership from declared hierarchy, preserve arbitrary TLC function keys and
directive-prefixed state identifiers, and retain shared Linux test preloads
until suite teardown.
Input-change protection also fingerprints transitive local TLA+ modules referenced
by `EXTENDS` and `INSTANCE`, including fixed and comparison models, before TLC runs.
TLC model values and non-string function keys are explicitly unsupported: parsing
stops rather than conflating them with string values or keys in state identities.
Graph/trace variables, parallel-region captions and guard state lists preserve
prototype-named keys as own properties instead of invoking inherited setters or
reading inherited values.
Sets and sequences retain distinct internal state identities while both remain
arrays for mapping code. Set identity ignores member order; comparison-model
field omission preserves this collection metadata.
Parallel-region state captions containing the combined-state separator ` | `
are rejected before conversion or comparison, rather than silently collapsing
distinct region combinations. Flat combined-state captions remain supported.
Generated action-label scaffolds use computed own properties and own-property
fallbacks. Comparison mappings treat only own variables and record fields as
model data, including prototype-named missing fields and guarded `in` checks.
Unsupported or partially parsed TLC values no longer fall back to source strings.
Chart-generated mappings use own-property action fallback too. Automatic region
extraction falls back to ordinary rendering for separator-bearing captions while
explicit parallel input retains its ambiguity check.
Region extraction also falls back when normalized captions collide. Guarded
child overrides of same-labeled parent transitions fail explicitly until their
fallback semantics are supported. Copy-based publication claims an empty
destination exclusively and never recursively deletes that destination after
a failed copy; a failure reports potentially incomplete output.
Node loader hooks fingerprint actual mapping imports, including reexports and
callback dynamic imports, before evaluation. Rendering subprocesses return their
observations over a private pipe; conflicting or changed inputs prevent publication.
ScaryPilot's Copilot SDK deletion requires no local extension migration because
this port already excludes that extension. Its gh-stack/bootstrap installer,
Copilot agent registration, source sync machinery and CI provisioning are not
shipped; the existing bundled GitHub discovery and Codex manifest remain intact.
Later Cursor-only changes are outside this ScaryPilot review.
