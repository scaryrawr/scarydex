---
name: swarm
description: Fan out independent Codex workers for coverage, competing candidates, or exploration and consolidate their evidence. Use for swarm requests or explicit parallel review and verification.
---

# Swarm

Read [Codex runtime mapping](../../references/codex-runtime.md).
Use Codex subagents, not Copilot dynamic workflows.

## Frame

State the done predicate, required artifact, and shape: independent coverage,
a race, or a mixture. Declare `first pass`, `rank all`, or `best-of` for races.
Derive worker count from the requested coverage, respecting the active tool’s
concurrency limit. Omit model overrides unless the user selected available
models. Give writing candidates independent worktrees or output directories.

Each brief stands alone: goal, exclusive scope, input pointers, exact acceptance
criteria, checks to run, and required evidence. Verification briefs name exact
SHAs. Measurement briefs also name sample count, sample definition, and order.
Require those details in each result, along with `PASS`, `ISSUES`, or `BLOCKED`.

## Fan out

Keep immediate blocking work local. Spawn independent slices, then do useful
non-overlapping work. Wait when their output is needed. Track handles and close
completed workers. If subagents are unavailable, run slices serially and explain
that the results are not independent. Do not silently claim parallel coverage.

## Aggregate

Inspect the actual artifacts and verify each report’s SHAs and measurement
method against its brief. A worker’s `PASS` is not proof. Rerun a read-only slice
once when required evidence is missing; after a second miss, record a gap.
Never blindly replay writing work. Coverage is incomplete until every required
slice has accepted evidence. Apply the declared race rule and disclose dropouts.

## Report

Return one consolidated table with worker verdicts, evidence, concrete issues,
and gaps. Missing evidence never counts as a pass. Review changes yourself
before accepting or integrating them.
