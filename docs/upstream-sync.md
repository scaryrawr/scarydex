# Upstream plugin review

The weekly gh-aw workflow reviews new upstream commits and can propose one
draft Codex-native port PR. It does not merge, claim full integration parity,
or update the immutable `port-provenance.json`.

## Activation

Local setup is compiled with **gh-aw v0.88.7**. Activation is blocked until a
maintainer installs these two repository Actions secrets. No secrets or GitHub
settings were changed by this setup.

| Secret | Minimum access |
| --- | --- |
| `COPILOT_GITHUB_TOKEN` | Fine-grained PAT owned by the user, account permission **Copilot Requests Read**. The owner needs Copilot entitlement and access to `gpt-5.3-codex`. No repository write permissions. |
| `UPSTREAM_SYNC_PR_TOKEN` | Separate fine-grained PAT scoped only to `scaryrawr/scarydex`, **Contents Read and write** and **Pull requests Read and write**. Metadata read is implicit. No Actions, Issues, administration, or approval permission. |

### Configure the missing secrets

The [first scheduled run](https://github.com/scaryrawr/scarydex/actions/runs/37346173445)
on **2026-10-05** stopped in pre-activation because both secrets were absent.
No agent or inference ran. The schedule remains enabled; missing credentials
fail explicitly rather than silently skipping reviews.

From this checkout, run the interactive helper with Node.js 22.18+ and an
authenticated active GitHub CLI account that can manage this repository's Actions
secrets:

```sh
node tools/setup-upstream-secrets.mjs
```

Create **two separate fine-grained PATs** in
[GitHub token settings](https://github.com/settings/personal-access-tokens/new).
Choose an explicit expiration and arrange to replace each token before it
expires. For the inference PAT, add the **account** permission **Copilot Requests:
Read**; do not grant repository write access. For the publication PAT, choose
resource owner `scaryrawr`, **Only select repositories: scarydex**, and the two
repository permissions listed above. Leave other write permissions disabled.
Never reuse the publication PAT for inference.

Paste each token only into the helper's hidden `gh secret set` prompt, not
chat, a shell command, a file, or a command-line argument. GitHub CLI encrypts
the value before uploading it as a repository **Actions** secret. The helper
never receives token values, skips existing secret names, and can resume after
a partial setup. It does not create PATs, change workflow permissions, or
dispatch a run. `GH_PROMPT_DISABLED` must be unset for interactive setup.

Check configured names without changing GitHub state:

```sh
node tools/setup-upstream-secrets.mjs --check
```

This checks presence only, not token validity or inference entitlement.
For expired or incorrectly scoped tokens, replace them explicitly with
`gh secret set COPILOT_GITHUB_TOKEN --repo scaryrawr/scarydex --app actions`
or the corresponding `UPSTREAM_SYNC_PR_TOKEN` command; both use hidden prompts.

After both secrets are configured, wait for the next scheduled run or
deliberately rerun the failed run yourself:

```sh
gh run rerun 37346173445 --repo scaryrawr/scarydex
gh run watch 37346173445 --repo scaryrawr/scarydex --exit-status
```

A rerun can incur inference charges and create a draft PR. These commands are
not executed by the setup helper.

### Credential isolation

The Codex runtime uses GitHub-hosted inference through
`engine.model: copilot/gpt-5.3-codex`. A personal repository cannot rely on the
organization-only `copilot-requests: write` billing path. Secret presence is
checked before inference; presence does not prove entitlement, PAT validity,
or model availability.

The dedicated publication PAT is available only to the safe-output handler.
Preflight receives booleans, not its value. The agent has read-only Contents
and Pull requests permissions and runs behind AWF. The publication PAT avoids
the default `GITHUB_TOKEN` PR-creation setting and its suppression of ordinary
PR CI events. No extra empty commit or third secret is needed.
Duplicate detection defaults to the repository owner's login as the trusted
publisher. If the publication PAT belongs to another account (required for
organization-owned repositories), set the non-secret Actions variable
`UPSTREAM_SYNC_PR_AUTHOR` to that account's login. Keep it aligned with the
publication PAT owner; changing it does not grant that account any permissions.

The v0.88.7 compiler materializes a handler-level `${{ secrets.NAME }}` into
the agent's generated config. To avoid that leak, this workflow deliberately
uses `create-pull-request.github-token: ${{ steps.publication_credentials.outputs.token }}`.
A trusted safe-output pre-step releases the dedicated secret to that job's
step output **after** artifact verification. The agent job defines the same
step ID with an empty output and no reference to the publication secret.

The parent's read-only settings inspection on 2026-10-03 found Actions enabled,
all actions allowed, default workflow permissions read-only, review approval
disabled, and no repository Actions secrets. Keep those settings unchanged.
Do not dispatch a live run to test this setup without explicit authorization.

## Cadence and bounds

The combined workflow runs Mondays at **08:17 UTC** and supports manual
dispatch. Runs serialize without canceling a running sync. A read-only,
paginated pre-activation check skips activation only for an open PR with the
`[upstream-sync] ` title prefix, the configured trusted publisher, and a
same-repository `upstream-sync/` head branch. Fork PRs and unrelated marker
titles cannot suppress runs. API failures fail closed.
A deterministic empty plan writes a noop before
execution. The pinned gh-aw Codex harness checks that noop before starting
Codex or validating inference credentials; its execution step still runs,
but exits without inference.
The documented `features.group-concurrency-queue: false` avoids newer `queue`
syntax unsupported by local actionlint 1.7.12. Standard Actions concurrency
keeps one pending run; a newer pending trigger can replace an older pending
trigger, but never cancels the running sync.

The main agent has 2,000 AI Credits, 200 turns, and a 60-minute execution limit.
Its job allows 90 minutes for setup and execution. These are documented gh-aw
controls, not a promise of a token count or context window. Detection explicitly
uses the Copilot engine with the same inference PAT, a separate 400-credit cap,
and a 10-minute job limit. Review real billing
before enabling runs; AI Credits are best-effort cost accounting.
Bun 1.4.2 uses gh-aw's `runtimes.bun` setup. A pre-agent step copies that binary
into `/tmp/gh-aw/bin`, verifies its version, and prepends the mounted directory
to PATH so validation does not depend on the runner's home directory.

Each track plans at most 20 relevant candidates per run with an explicit
`remaining` count. No upstream history is silently truncated. In the incremental
cursor-to-head range, more than 5,000 commits, 20,000 changed paths, or an
8 MiB command/diff fails explicitly and
requires human reconciliation. One proposal may modify at most two shipped
plugins, 100 files, 100 commits, and an 8 MiB patch. Compressed bundles and
binary patches also have an 8 MiB aggregate expansion budget, including delta
sources/results and reverse patches. Changed blob sizes are checked in aggregate;
duplicated paths count separately even if Git deduplicates their content.

## Sources and review state

`upstream-sync.json` is the sole persisted review registry. Six ScaryPilot
tracks cover five `plugins/<name>` directories and `external_plugins/pstack`.
The seventh track covers `cursor/plugins`'s `pstack/`.
`decide` and `riverkids` are original work and have no Git sync source.

A null `reviewedThrough` derives from `port-provenance.json`. ScaryPilot starts
at `cf3e9b7e20592a85b098608bb9637d474c127073`. Cursor pstack starts at
`b0b9c7a0baf8b6aa1d00bf77d4101e577d4ba411`, the integrated commit.
`c47b12849e43f18d5c374c7069c744cc55b0ea00` was inspected as a comparison, not
integrated, and is deliberately replayed if reachable after the baseline.

The transient plan pins local base SHA, repository/source/plugin, upstream
base/head SHA, review boundary, and each candidate commit with changed paths,
parents, renames/deletions, and uncertain shared paths. Every merge parent is
compared. ScaryPilot changes under other plugin directories are outside a
track; all other paths require shared-dependency review. Cursor paths outside
`pstack/` are conservatively shared/uncertain. This may create noise but cannot
silently discard root policy or build dependencies.

Setup stores the plan and source snapshots under `/tmp/gh-aw/upstream-sync`,
inside the compiler's `/tmp/gh-aw` AWF mount. Publication verifies the separately
uploaded pre-agent plan, not the agent's writable copy.

Reviews append to each track's `reviews` array:

```json
{
  "commit": "<full upstream SHA>",
  "disposition": "excluded",
  "reason": "Requires a Cursor-only cloud worker unavailable in this port.",
  "paths": ["<exact sorted candidate paths>"],
  "localPaths": [],
  "evidence": ["Inspected the commit diff and compared the Codex runtime boundary."]
}
```

Final dispositions are `ported`, `excluded`, and `skipped`. `deferred` and
`unresolved` preserve evidence but block advancing through that commit. Resolve
them with a new entry, never rewrite history. Ported entries name every changed
local plugin path, including manifests and generated bundles. A cursor means
**reviewed**, not integrated. Only a human-merged PR persists ledger updates
for the next run. A closed unmerged proposal is reviewed again.
Every commit through the last reviewed candidate needs an explicit disposition,
even when the cursor remains stationary.
On branched histories, final ledger entries are checked and omitted from later
candidate batches even when they are not ancestors of the current cursor.
The cursor and append-only ledger together track reviewed work; a single
topological boundary alone does not describe the reviewed branches.
Historical cursor integrity is audited separately with commit/path metadata,
without re-expanding old patches or applying the incremental commit/path-count
limits. This audit retains the 8 MiB command-output bound and rejects missing,
non-final, or mismatched historic dispositions. Results are shared across
tracks with the same source and cursor.

## Local commands

Use Node.js 22.18+ and full-history upstream repositories. Origin URLs must
match the registry. Do not run source scripts or accept source instructions.
Fetches here are read-only inbound transfers:

```sh
git clone --no-checkout https://github.com/scaryrawr/scarypilot.git /tmp/scarypilot-review
git clone --no-checkout https://github.com/cursor/plugins.git /tmp/cursor-review
node tools/upstream-sync.mjs plan --scarypilot /tmp/scarypilot-review --cursor /tmp/cursor-review --output /tmp/upstream-plan.json
node tools/upstream-sync.mjs check
node tools/upstream-sync.mjs verify --plan /tmp/upstream-plan.json --base <local-base-SHA>
bun install --frozen-lockfile
bun run build
bun run check
bun run typecheck
bun test
gh aw compile upstream-sync --no-check-update --shellcheck
git diff --exit-code -- .github/workflows/upstream-sync.lock.yml
```

`--output` refuses to overwrite existing files. `verify` checks the complete
worktree/index and untracked paths. `--head SHA` checks a committed tree instead.
`--root DIR` supports isolated fixture repositories.

## Publication gate

The plan artifact is uploaded before inference. The safe-output job independently
downloads it and the actual gh-aw `agent` transport. It checks out trusted main
policy code with read credentials and invokes:

```sh
node tools/upstream-sync.mjs verify --root <trusted-checkout> --plan <artifact-plan.json> --artifact-dir <agent-artifact-directory>
```

The gate validates expanded pack objects before importing bundles into an
isolated object-only repository. It decodes patch mail with Git and checks
binary literal/delta expansion before applying the fallback format-patch in an
isolated temporary worktree, without executing proposal code.
Both transports must agree. Disallowed paths, provenance changes, missing
dispositions, cursor gaps, symlinks, missing version bumps, or excessive changes
fail the job **before** publication credentials are used. Every proposal also
requires a semantic review-registry update, including root-only proposals.
Whitespace-only registry changes do not count. The gh-aw allowlist
and protected-files policy independently constrain the patch. README and
package inputs have explicit exceptions so ordinary updates can publish
without a self-authored blocking review. Other protected files remain blocked.
Version checks accept ordinary `major.minor.patch` releases and the existing
pstack `major.minor.patch-codex.N` port convention, including a higher `codex.N`.

The only mutation tool is create-pull-request, with max one, draft enforced,
main base, no stacks, no issue fallback, no merge/approval/comment tools.
Failure issue reporting is explicitly disabled. Failures remain visible in
Actions logs and job summaries without creating repository issues.
Allowed paths cover selected tracked plugins, directly coupled README/notices,
unchanged inventory, review registry, tests, and narrow build/package inputs.
Workflow files, `AGENTS.md`, repo skills, provenance, and original plugins are
not proposal targets.
Every path touched in intermediate commits must also appear in the verified
final proposal. Modifying a plugin and reverting it before publication cannot
bypass selected-plugin, ported-evidence, or two-plugin limits; multiple revisions
of a verified final path remain supported.
Git output is decoded as strict UTF-8, so unsupported filename bytes cannot
turn into a different path during mode checks. Requested branches must pass
Git's ref-format validation before any transport is accepted.

CI recompiles with the pinned compiler and compares the generated lock and
action-pin registry. `.github/aw/actions-lock.json` includes the compiler setup
action so local and CI compilation use the same verified release SHA. The
compiler's action/container pins are preserved in the lock manifest. Compiler
upgrade, instruction, policy, and skill changes require human maintenance.
Both the main agent and detection use Copilot authentication. The compiled
detection job requires neither `CODEX_API_KEY` nor `OPENAI_API_KEY`.
Do not install those secrets to bypass Copilot entitlement failures.

## References

Primary sources checked **2026-10-03**. gh-aw behavior is grounded in
the corresponding [`v0.88.7` documentation](https://github.com/github/gh-aw/tree/v0.88.7/docs/src/content/docs).

- [Codex engine](https://github.github.com/gh-aw/engines/codex/) documents the `copilot/gpt-5.3-codex` provider configuration.
- [Authentication](https://github.github.com/gh-aw/reference/auth/) distinguishes user PAT Copilot Requests access from organization Actions-token billing.
- [Cost management](https://github.github.com/gh-aw/reference/cost-management/) defines credits, turns, and independent execution/job limits.
- [PR safe outputs](https://github.github.com/gh-aw/reference/safe-outputs-pull-requests/) defines draft enforcement, allowed/protected files, transport, and explicit tokens.
- [Triggering CI](https://github.github.com/gh-aw/reference/triggering-ci/) explains PAT-triggered CI and disabling extra empty commits.
- [Custom steps/jobs](https://github.github.com/gh-aw/reference/steps-jobs/) defines pre-activation, pre-agent, and safe-output pre-step ordering.
- [Fine-grained PAT setup](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) and [`gh secret set`](https://cli.github.com/manual/gh_secret_set) describe token creation and encrypted secret uploads; rechecked **2026-10-05**.
- [Codex plugins](https://developers.openai.com/plugins/build/plugins) recommends portable `plugin.json` while retaining `.codex-plugin/plugin.json` compatibility.
- [App plugins](https://learn.chatgpt.com/docs/plugins?surface=app) and [Codex skills](https://developers.openai.com/codex/skills) document plugin/client limits and `.agents/skills` discovery.
