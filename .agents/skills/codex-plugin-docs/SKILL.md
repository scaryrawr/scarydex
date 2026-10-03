---
name: codex-plugin-docs
description: Write or update ScaryDex Codex plugin documentation, install guidance, port-boundary notes, attribution, and source references without claiming unsupported client capabilities.
---

Read the root `AGENTS.md`, affected manifests, skill frontmatter, README, and
notices before describing behavior. Use the
[maintenance skill](../codex-plugin-maintenance/SKILL.md) for coupled code work.

Keep the root inventory synchronized with `.agents/plugins/marketplace.json`.
Describe prerequisites, explicit user permissions, runtime limits, and helper
commands from actual code. Distinguish desktop-app support from CLI marketplace
installation and public-directory publication. A plugin does not grant tools,
hook trust, or inference entitlement.

Preserve upstream attribution and the immutable provenance baseline. Record
reviewed upstream commit URLs separately from integrated behavior. Explain
excluded Copilot/Cursor capabilities rather than hiding them or promising
parity. Retain `.codex-plugin/plugin.json`; portable `plugin.json` is recommended
upstream but the compatibility layout remains supported.

Use concise summaries, not copied upstream documentation. Date external claims
and link primary sources. The
[setup references](../../../docs/upstream-sync.md#references) were checked on
2026-10-03. Recheck changing client and gh-aw behavior before making new claims.
Repository-local skills live in `.agents/skills` and are not published plugins.

Validate YAML and local links with `bun run check`. Keep links relative to the
document's directory. Report operational blockers plainly. Never include token
values or suggest broadening a token to bypass a failed safety gate.
