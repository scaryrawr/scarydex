# Proof principle evals

`trigger-evals.json` records discovery positives and near misses using ordinary
task language, not slash names or requests for proof. `evals.json` records
task-output expectations and synthetic fixtures. No inference harness is bundled
or assumed available in Codex. Do not silently run an upstream Copilot harness.

Use an explicitly approved host-supported evaluator, with disposable synthetic
projects and no network, installations, capture, publication or extra agents.
Explicitly loading this skill measures compliance after loading, not implicit
activation. Fixtures require only Python's standard library. Keep raw transcripts,
outputs and grading outside the shipped skill.
Each case's `expected_output` describes the intended result; it is required
inventory metadata, not a generated artifact or evidence that the case passed.

Grade expectations against actual tool traces, output contents and final claims.
Re-run retained CLI tests, verify independent persistence readback, and confirm
cited artifacts survive sandbox cleanup. Check original inputs remain unchanged.
Reject a passing artifact from another build/input and a faster export that
silently skips work. Treat source-only UI checks as partial verification, not
visual or native-runtime proof.

For clean trigger comparisons, use a fresh disposable sandbox for each trial.
The existing trigger runner can reuse one root across queries; previous fixture
edits can otherwise contaminate later prompts. Preserve raw subprocess events
to distinguish real skill-tool activation from a source-file read or a final
claim. Unique staged names reduce ambiguity but cannot disable personal skills.
Keep the same prompts, repeat count, timeout and model policy on both sides.

These small synthetic cases do not demonstrate universal activation,
cross-model reliability, real UI replay quality, authorized capture/editing or
service integration coverage. Missing runtime and permission cases intentionally
exercise honest blocked outcomes without performing captures or uploads.
