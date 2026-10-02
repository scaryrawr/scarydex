# Digivolution for Codex

Adaptive repository-guidance reflection, ported from a Copilot extension to a
Codex skill and dependency-free command hooks.

Install `digivolution@scarydex`, start a new session, and review/trust its hooks.
Node.js 22.18+ is required. The skill can also be invoked manually without hooks.

The hooks observe UserPromptSubmit, PostToolUse for Bash, Stop, and SessionEnd.
A repository-specific user correction, recovered validation-command usage error,
or repeated validation failure followed by a changed successful command can
trigger one Stop continuation asking for a narrow guidance review. Routine
success, a lone failure, or an uninterpretable output does not trigger it.
Reflection can legitimately result in no edit.

State is session/repository/turn-scoped under `PLUGIN_DATA`, with a Codex-home
cache fallback. It stores hashes and booleans, not prompts, command text, or tool
output. SessionEnd removes it. The issued flag and `stop_hook_active` prevent
reflection loops. These hooks do not apply to subagent Stop events.

Updates target the narrowest `AGENTS.md` or existing `.agents/skills` resource.
No Copilot instruction files or generic “lessons learned” are generated. See
[the skill](skills/digivolution/SKILL.md) for update criteria and exclusions.
