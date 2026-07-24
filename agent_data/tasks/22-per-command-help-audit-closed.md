# 22 — Per-command `--help` audit (agent-usable)

**Depends on:** all command tasks that exist at the time this is picked up (it's an audit/consistency pass, not new
commands).

## Summary

Every `@Command`/`@SubCommand` already gets a working `-h`/`--help` for free from `commander` (verified — e.g.
`plan duplicate --help` already lists arguments, options, and their descriptions). What commander does *not* give
for free is a usage example — its help output is flags-and-descriptions only. This task is a pass over every
existing (and future) command to make sure `--help` alone is enough for an agent with zero other context to invoke
it correctly on the first try — no trial-and-error, no guessing at enum values or IRI-vs-plain-id formatting.

## Scope

- Audit every command's `description`, `argsDescription`, and `@Option` descriptions for completeness: valid enum
  values spelled out where relevant (e.g. `plan create --state`'s `draft|published|archived` — already done that
  way in task 18's spec, extend the same standard everywhere), units/format for things like dates
  (`--due-date`: ISO 8601), and explicit call-outs for non-obvious behavior (e.g. task 19's "doesn't touch
  questionsOrder" note — make sure it's actually in the `--help` text, not just a code comment).
- Add a short "Example:" line to every command's `--help` output via `nest-commander`'s `@Help` decorator
  (`HelpOptions`: `'before' | 'beforeAll' | 'after' | 'afterAll'` — `'after'` is almost certainly the right choice
  here, appended below commander's own auto-generated usage block). One realistic example invocation per command is
  enough — this isn't the place for exhaustive docs (that's `README.md`, task 14).
- Cover every command that exists at the time this is picked up: `login`, `project list`/`get`, `plan
  list`/`get`/`duplicate` (+ `create`/`edit` if task 18 has landed), `question list`/`get` (+ `create`/`edit` if
  task 19 has landed), `tester list`/`get`, `answer list`/`get`, `release create`/`edit` (if task 17 has landed),
  `webhook enable`/`disable`/`set-url` (if task 20 has landed), `setup` (if task 15 has landed).

## Acceptance criteria

- A test (unit or a small script run over the compiled CLI) that asserts every registered command has a non-empty
  `@Help`-provided example line — so a newly added command without one fails this check instead of silently
  slipping through.
- Manually spot-check a handful of commands' full `--help` output reads correctly end to end (no leftover
  copy-paste from another command, correct flag names).
