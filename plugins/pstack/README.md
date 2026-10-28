# pstack for Codex

Rigorous workflows for understanding, design, implementation, review, and proof.
Start with `poteto-mode`, or invoke focused skills such as `how`, `architect`,
`swarm`, `interrogate`, `tdd`, `recall`, and `show-me-your-work`.
Use `ketchup` for a read-only catch-up, `in-your-own-words` to restate the goal,
and `sharpen` to rewrite a prompt before sending it. Sharpen returns only the
rewritten prompt; it does not execute the task.

Use [create-formal-verification-skill](skills/create-formal-verification-skill/SKILL.md)
to check one costly, hard-to-test property and generate a project-local skill.
Use [maintain-formal-verification-skill](skills/maintain-formal-verification-skill/SKILL.md)
after covered code changes to distinguish verification drift from product bugs.
Use [statechart](skills/statechart/SKILL.md) to turn a TLA+ model into observable
states and numbered bug paths, or an agreed Mermaid chart into a TLA+ skeleton.
The portable scripts do not install Java, TLC or rendering dependencies.
Statechart parsing rejects TLC model values (such as unquoted `Actor`) and
functions with non-string keys instead of conflating their state identities
with strings. Unsupported or partially parsed values, including interval notation,
also fail explicitly. Quoted strings, booleans and ordinary integer values remain supported.
Parallel-region state captions cannot contain the reserved separator ` | `:
combined states use it between regions. Flat combined-state captions remain supported.
Automatic region extraction skips such captions and keeps ordinary chart rendering.

## Install and prerequisites

Install `pstack@scarydex` from the ScaryDex marketplace, then start a new session.
Ordinary skills need only Codex's existing tools. Model overrides, subagents,
history access, and computer use are capability-dependent. See
[Codex runtime mapping](references/codex-runtime.md) before using those workflows.

Node.js 22.18+ runs the self-contained CLI helpers and validators. Git is needed
for repository work; `gh` and authenticated GitHub access are required for PR
watching and orchestration frontier discovery. Installed users do not need Bun,
npm dependencies, or writes into the plugin cache. Bun is only the optional
development test runner for the retained TypeScript sources; its script-local
`.npmrc` selects the required proxy feed. Graphite remains optional for the
stack-shipping steps that explicitly use it, not for orchestration discovery.

Formal workflows need a suitable local verifier, with TLA+ the default for
event-order models. No verifier or model service is bundled or silently installed.
If no code-level verifier supports the language, generated-input tests exercise
the real code and are labeled testing, not formal proof. Generated skills live
under `.agents/skills/`; checks record their coverage, assumptions, bounds and
last sync commit. Deliberate failure-sensitivity mutations stay in isolated
scratch copies, not the user's live product tree.

`setup-pstack` offers app-verification and formal-verification skill generation
once each when the project lacks them. Neither runs unless the user accepts.

## Helpers

Resolve these paths from the installed plugin root:

- `skills/poteto-mode/scripts/check-plan.mjs`: read-only Markdown plan validation.
- `skills/pstack-schema-validate/scripts/validate.mjs`: snapshot, receipt, handoff,
  and plan contracts. Use its help/usage contract, not a general JSON validator.
- `skills/show-me-your-work/scripts/log.sh`: durable decision-trail entries.
- `skills/show-me-your-work/scripts/log.mjs`: portable Node decision-trail writer.
- `skills/poteto-mode/scripts/worktree-audit.sh`: read-only POSIX worktree audit.
  Use `--base <ref>` when the integration branch differs from the remote default.
  The audit uses local refs only, never fetches, and preserves worktree paths
  containing spaces. Remote-tracking refs can be stale.
- `skills/poteto-mode/scripts/orch/orch.mjs`: optional durable program store.
  `frontier set --repo <checkout> [--prs <n,...>]` discovers a linear GitHub PR
  base chain, pins local branch SHAs, and checks an optional PR order pin.
  Origin's CLI adapter is not included.
- `skills/poteto-mode/scripts/watch-pr/watch-pr.mjs`: optional GitHub PR watcher.
  Review threads are paginated so unresolved findings beyond the first 100 are
  not missed.

Artifact validation confines inputs to regular, non-symlink files inside the
current workspace on macOS and Linux. It fails closed elsewhere; evidence
references inside artifacts remain data, not files to read or commands to run.

Ordinary feature, fix and refactoring completion uses the smallest adequate
caller-facing check and reports its observed result or exact verification gap.
This does not require a full suite, extra agent, app launch or media capture.

Codex custom-agent behavior is retained in `references/agents/` as prompts.
No status, swarm, capabilities, or handoff extension tool is registered. Use
available Codex subagents and local artifacts instead. A playbook never grants
permission to commit, publish, merge, delete state, or schedule recurring work.
Ketchup lists every waiting item with its recommendation, evidence and risk so
the reply itself supports a decision. It reuses existing visual evidence; it
does not start an app, capture media, or generate images to fill a catch-up.

## Attribution

See [NOTICE.md](NOTICE.md) and [LICENSE](LICENSE). The immutable original import
baseline is pstack 0.15.4 via ScaryPilot; the original 0.15.5 source was inspected
for comparison, not silently claimed as integrated. The previous content update
was ScaryPilot commit `ce2b8cbcaa4f29a35f47adbb15adc84f07d6a4c1`, covering Cursor
`b0b9c7a..77526ff`.

This Codex port integrates the portable pstack 0.15.28 changes through
[Cursor commit `88d47514`](https://github.com/cursor/plugins/commit/88d47514b82e7c44f00f2b2a72ff6dd12158038c),
following the prior `6ce45c59` integration.
The append-only `upstream-sync.json` registry records exact reviewed paths,
adaptations and exclusions. Cursor-only extensions, native workflow tools,
hosted agents, Grok Bot features, Origin integration, vendor-specific model
defaults, Claude harness packaging and Cursor guide pages remain outside this
port. The upstream root Agent Plugins manifest does not replace the existing
Codex manifest.

The subsequent ScaryPilot review through
[`53263e5b`](https://github.com/scaryrawr/scarypilot/commit/53263e5b135e6c1dbab762b81b9165bf73eccb6e)
ports its portable statechart integration, workspace-confined validator,
read-only worktree audit, Node decision log and proportionate completion gate.
The statechart copy includes the Windows output-folder validation fix and
dependency-free regression tests. TLC-backed checks require existing Java and
an explicitly supplied `TLA2TOOLS` jar; without them those tests report skips.
The reviewed stable TLC reference is 1.7.4, not the replaceable 1.8.0 prerelease.
This does not claim integration of later Cursor statechart or renderer releases.
