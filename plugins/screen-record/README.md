# Screen Record for Codex

Record agent-driven desktop demos and edit videos with local FFmpeg. The port is
a skill and Node helper, not a Copilot extension or browser integration.

Install `screen-record@scarydex`, then start a new session. Node.js 22.18+,
FFmpeg, and ffprobe must be available. Screen/microphone capture requires the
user’s permission and host-specific OS permissions. Optional narration uses
OMLX or supported OS speech tools.

Ask “Use screen-record to record a short demo.” First run:

```sh
node "<skill-directory>/scripts/screen-record.mjs" doctor
```

Read only the capture reference for the current host: macOS, Windows, or Linux.
Rehearse with available computer-use tools, capture with managed `start`/`stop`,
then write trims, captions, layouts, and narration to new outputs. Preserve the
source. This plugin does not install computer-use or browser capabilities.

See [the skill](skills/screen-record/SKILL.md), its platform references, and
[editing options](skills/screen-record/references/editing.md). The optional
[demo-producer prompt](references/agents/demo-producer.md) describes a specialist
workflow; it is not an unsupported agent registration. Do not actually capture
screens merely to test installation.
