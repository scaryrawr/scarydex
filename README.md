# ScaryDex

A Codex plugin marketplace ported from ScaryPilot. It contains only these six
plugins, primarily as skills with bundled script helpers:

| Plugin | Purpose | Runtime |
| --- | --- | --- |
| `pstack` | Planning, architecture, review, delegation, verification, and durable handoffs | Skills + self-contained Node scripts |
| `anti-slop` | JavaScript/TypeScript design guidance and edit checks | Skills + Codex command hooks; Node.js; explicit Oxlint setup |
| `better-init` | Concise Codex repository initialization and guidance | Skills and reusable research prompt |
| `digivolution` | Evidence-triggered post-task repository-guidance reflection | Skill + Codex command hooks; Node.js |
| `omlx-media` | Local images, speech, transcription, and recording-to-document workflows | Skills + self-contained Node helper; optional Python helpers |
| `screen-record` | Screen capture, demo editing, captions, and narration | Skill + Node helper + FFmpeg |

`anti-slop` keeps the source plugin’s canonical name (the requested “antislop”).
No Azure, Azure DevOps, Codespaces, Playwright, Chrome, or other source plugins
are included. No Copilot SDK extensions or browser servers are registered.
Screen recording can use computer-use tools already available in your session;
it does not install a browser plugin.

## Install

On a Codex client that supports local/Git marketplaces:

```sh
codex plugin marketplace add scaryrawr/scarydex
codex plugin add pstack@scarydex
codex plugin add anti-slop@scarydex
codex plugin add better-init@scarydex
codex plugin add digivolution@scarydex
codex plugin add omlx-media@scarydex
codex plugin add screen-record@scarydex
```

For an unpublished local checkout, run
`codex plugin marketplace add /absolute/path/to/scarydex` instead. Install only
the plugins you want, then start a new session. In the desktop app, use its
marketplace/plugin controls when available. CLI marketplace setup is independent
of public-directory or workspace publication; this repository has not been
submitted to the public plugin directory.

Review and trust the hook definitions for `anti-slop` and `digivolution` before
expecting them to run. Installation does not grant hook trust. Skills and manual
scripts remain useful with hooks disabled. Runtime capabilities differ by
Codex client; no plugin grants additional tool access or bypasses permissions.

## Try it

- “Use pstack’s poteto-mode to plan and verify this change.”
- “Use better-init to refresh this repo’s AGENTS.md for Codex.”
- “Use anti-slop to review this TypeScript diff.”
- “Digivolve the repo guidance if this task exposed a durable correction.”
- “Generate an image with the local OMLX model.”
- “Record a short demo and trim the setup time.”

Installed skill identifiers are namespaced, such as `$pstack:poteto-mode`,
`$better-init:better-init`, and `$omlx-media:image-gen`. Natural-language requests
can also select them.

See each plugin’s README for prerequisites and helpers. Media/recording skills
resolve helpers from the installed plugin, not from the workspace’s current
directory. Outputs stay in the user’s workspace, never inside the plugin cache.

## Develop and validate

Node.js 22.18+ is required. The repository’s `.npmrc` selects
`https://packagefeedproxy.microsoft.io/npm/`; do not change global npm settings.

```sh
npm ci --ignore-scripts
npm run build
npm run check
npm run typecheck
npm test
node tools/smoke-install.mjs  # optional, requires Codex CLI
```

`build` produces the checked-in, self-contained OMLX and pstack CLI helpers.
Installed users do not run npm or install their development dependencies. `check` validates the exact
marketplace inventory, native manifests, skill YAML, local Markdown links, hook
registration, and bundle hashes. Tests cover Codex hook wire formats,
Anti-Slop’s bundled lint rules, OMLX domain behavior and CLI failures, and pstack
contract/plan validation. Optional Bun tests for the retained pstack helpers:

```sh
cd plugins/pstack/skills/poteto-mode/scripts
bun install --frozen-lockfile
bun test orch watch-pr
```

Tests do not run screen capture or real model generation. Verify those manually
with the user’s recording permission and a running OMLX instance.

## Structure and provenance

The catalog is `.agents/plugins/marketplace.json`. Each published plugin lives
under `plugins/<name>/` with a native `.codex-plugin/plugin.json`. Copilot custom
agent behavior is retained as prompt references, not unsupported registrations.

`port-provenance.json` records the ScaryPilot source commit and pstack baseline.
Original Cursor pstack was inspected as a comparison; Cursor-only UI and
cloud-worker assumptions were not imported. See `THIRD_PARTY_NOTICES.md` and
plugin-specific notices for attribution and licenses.
