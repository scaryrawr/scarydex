# Better Init for Codex

Creates concise `AGENTS.md` guidance and repeatable project skills under
`.agents/skills`, based on verified repository commands and boundaries.

Install `better-init@scarydex`, start a new session, then ask “Use better-init to
initialize this repo for Codex” or “Refresh our stale AGENTS.md.” No external
runtime or service is required.

The workflow inspects executable configuration first, preserves existing useful
guidance, and writes only the owning surfaces. It accounts for nested guides and
`AGENTS.override.md`. Initialization and general refreshes include a concise
project review skill by default at `.agents/skills/code-review/SKILL.md`, or
refresh an existing owning review skill instead of duplicating it. The skill
maps changed paths to behavior, tests, and verified validation; useful existing
contract checks are preserved. Explicit instructions-only scope or a request
to skip review guidance takes precedence.

It does not generate Copilot-only instructions, rewrite
Codex user configuration, or create specialist agents as a showcase.
The review skill is for Codex sessions, not a claim of GitHub-hosted Copilot
review discovery or access to locally configured MCP tools.

For large repositories, the optional read-only research prompt is at
[repo-instruction-researcher](references/agents/repo-instruction-researcher.md).
It is a prompt reference, not a registered Copilot agent. See
[the skill](skills/better-init/SKILL.md) for the complete procedure.
