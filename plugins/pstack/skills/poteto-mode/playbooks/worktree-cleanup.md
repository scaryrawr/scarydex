### Worktree and simulator cleanup

**You own the disk and the safety gate.** Prune merged or abandoned git worktrees and stale iOS simulators to reclaim space. Deletion is irreversible, so every step guards against deleting something in use or holding uncommitted work.

1. Snapshot and audit. Record disk usage and run the bundled read-only `scripts/worktree-audit.sh` on POSIX, or inspect paths from `git worktree list --porcelain` directly. It performs no fetch or deletion. Determine the base ref from repository state, not a hard-coded name.
2. The disposition is advice, not permission. Cross-check candidates against active or pinned chats using available app tools. Otherwise get the in-use set from the user before deletion. Ownership that cannot be established keeps the worktree held.
3. Verify usage before deleting. Do not assume transcript files or sidebar access exists. Use scoped session-history tools only when the current host exposes them. A session may spawn arena and repro trees into sibling worktrees, so any unresolved ownership keeps the worktree held.
4. Pause on irreversible loss. `wip:N` is N tracked uncommitted edits. Show the diff and get a decision first, since removing a clean worktree is recoverable from its branch but uncommitted work is gone. Inspect untracked and ignored files too; they may be user-owned. Obtain explicit authorization for deletion. Dirty or in-use worktrees stay held.
5. Prune the confirmed set. Prefer the app’s managed-worktree archive tool when applicable; otherwise use `git worktree remove <path>`. Never force removal or recursively delete remaining artifacts without specific approval. Branch refs survive, so no commits are lost. Confirm with `df -h /` and re-list.
6. Simulators and other reclaimers. Simulators are usually the next-biggest win. `xcrun simctl --set testing delete all` (XCTestDevices clones), `xcrun simctl delete unavailable`, and `xcrun simctl runtime list` then `runtime delete <id>` for old runtimes. More when needed: Xcode `DerivedData` and `iOS DeviceSupport`, then package caches such as pnpm, uv, brew, and yarn. Clear only caches the user has not said to keep.

This is the one playbook that deletes user state with no code review to catch a slip, so the gates above are the review.

**Reply:** `df -h /` before and after with space reclaimed, the worktrees pruned, and a one-line reason for each held back (in-use by which chat, or uncommitted work).
