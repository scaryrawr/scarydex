# riverkids

Coordinate RiverKids teaching teams from two sources of truth:

- Slack: the `#team-riverkids-teachers` channel (swap requests, fill-in
  asks, supply needs, announcements).
- Planning Center: Sunday Service plans, the RiverKids team roster, and
  per-person assignments under the Planning Center MCP.

The `riverkids-coordinator` skill cross-references both: who is scheduled,
whether their slot is confirmed, whether Slack shows an unresolved swap or
absence for that date, and what needs a follow-up. It answers with a
coordination brief; it never mutates Planning Center, and it only posts to
Slack after the user approves the exact text and destination.

## Prerequisites

- A configured Planning Center MCP connection (Services scope).
- A configured Slack MCP connection.
- The skill re-resolves channel, service-type, and team ids on every run;
  cached ids in the skill are hints, not constants.

## Try it

- “Give me the RiverKids coverage brief for the next service, including any
  unanswered swap requests in Slack.”
- “Is anyone scheduled as an open gap this month for RiverKids?”
- “Draft a reply in the thread to the teacher who asked to swap on 10/11.”
