### Autopilot-stack

Run Autopilot-full without merging. Re-read both playbooks at each checkpoint; this one's no-merge rule wins.

1. **Stop at verified instead of merging.** Each owner reports its exact head and green receipts for the coordinator's audit. Hand verified PRs to the operator. Nobody merges, closes a PR or arms auto-merge. After handoff, nobody pushes without the operator's go. Every checkpoint or authorized wake prompt names this file so the no-merge rule survives a restart.
2. **Stack only real dependencies.** Independent PRs start from trunk. Base a dependent PR on the branch it builds on, per **Size and stacks** in `playbooks/opening-a-pr.md`. Its owner rebases onto that parent under explicit authority; only the stack root rebases onto trunk. A lower head change requires restacking descendants through their owners, never concurrent topology writes. Shipping's patch-id rule governs verdict reuse, and unchanged patches do not waive the existing combined-base integration, live and perf proof.

Keep Autopilot-full's durable trail, bounded supervision, exact receipt audits and immediate zero-writes holds. The operator owns landing, regardless of autonomy over implementation.

**Reply:** list each PR and exact-head verdict, dependencies, operator gates and parked follow-ups instead of what merged.
