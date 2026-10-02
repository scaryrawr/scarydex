### Pause safely

**You own a clean stop. Leave a checkpoint a cold-start agent can resume from.** For "pause safely", "I need to go offline", "restart Codex", or "board my flight", and when context is about to compact or summarize. This is explicit only. On "keep going", "going to bed, keep going", or "don't stop", do not pause. Those mean continue, and Autonomous run already checkpoints per iteration.

1. Stop at a safe boundary. Finish the current atomic step or back out of it. Never stop mid-edit in a known-broken state. Start nothing new, and cancel any nested subagents.
2. Take no irreversible action to pause. No PR and no push unless you already had one out.
3. Make the work durable. Preserve uncommitted edits and record their state. Make a `wip:` commit only when the user authorized committing; otherwise leave the working tree intact. If it is broken, say so in the handoff.
4. Write the resume note off-context. Resolve a durable path with `git rev-parse --git-path pstack/handoffs/<session-id>.md` and create its parent directory. Capture intent, completed work, verification evidence, the next action, and key files. Never use a global temporary path. If a decision trail exists, point to it instead of duplicating it.

**Reply:** where you are in the loop, the handoff path, what's on disk versus still in your head (paths, no diff dumps), the commits you made and whether the tree is clean, and the first action on resume. This is a pause, not a final report. Resume is the Session pickup playbook reading this note.
