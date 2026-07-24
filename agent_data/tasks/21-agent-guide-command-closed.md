# 21 — Global agent-oriented guide command

**Depends on:** 07 (at least one command group to reference), ideally after most command groups exist so the guide
is complete rather than needing constant editing (11 or later is a reasonable point to pick this up).

## Summary

`nest-commander`/`commander` already auto-generates a root `testgator-cli --help` listing every top-level command
group with a one-line description (verified — this works today, no extra code needed for that part). What's
missing is something closer to a skill.md: a single place that teaches an agent *how to use this tool as a whole*
— the auth flow, the output convention, and a few worked examples — without it needing filesystem access to
`project.md` or this repo's source.

## Scope

- A dedicated command (e.g. `testgator-cli guide`, or reuse the default/root command slot — pick whichever reads
  more naturally once other commands exist) that prints a compact, plain-text orientation covering:
  - What this tool is and does (one or two lines).
  - Auth: run `login` (or `setup`, once task 15 lands) once; the JWT is cached and every other command reuses it
    automatically.
  - Output convention: every data-producing command prints one line of compact JSON to stdout on success; errors go
    to stderr as `Error: ...` with a non-zero exit code — safe to parse `stdout` unconditionally on exit code 0.
  - The command groups that exist, one line each with a real example invocation (not just the auto-generated
    description) — e.g. `plan list --project 5`, `plan duplicate 12 --project 3 --release 5 --name "..." --due-date ...`.
  - A pointer to `<command> --help` for full flag-level detail on any specific command (task 22 makes that
    reliably useful).
- Keep it plain text, not JSON — this output is for the agent's own context/reasoning, not something a program
  parses, so no need to keep it machine-structured. Keep it short — the same "don't waste tokens" principle as
  task 16's formatting: a concise reference beats an exhaustive one.
- This needs to be **kept in sync** as new command groups land — note that maintenance cost explicitly in the code
  (a comment near the content, or a short test that fails if a top-level command exists but isn't mentioned in the
  guide, to catch drift).

## Acceptance criteria

- `testgator-cli guide` (or whatever the final command name is) runs with no auth/network required (it's static
  content — no `ApiClientService` call).
- Unit test asserting the guide's output mentions every top-level command group currently registered in
  `AppModule` (the drift-detection check described above), so this doesn't silently go stale.
- Functional test via `nest-commander-testing` confirming the command runs and prints non-empty output.
