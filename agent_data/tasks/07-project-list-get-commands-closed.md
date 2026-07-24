# 07 — `project list` / `project get` commands

**Depends on:** 02, 03, 05, 06

## Summary

First real read-only command group: projects. Establishes the pattern (command → API call → Hydra shaping →
plain-JSON output) that the remaining resource commands (tasks 08–11) will repeat.

## Scope

- `testgator-cli project list` — calls the projects collection endpoint, shapes the response via task 02, prints
  plain JSON (array of `{id, name, ...}`).
- `testgator-cli project get <id>` — calls the single-project endpoint, shapes and prints it; clear error on 404.
- Establish the output convention (compact JSON to stdout, non-zero exit code on error) that later command tasks
  should follow.

## Acceptance criteria

- Unit tests for the command logic with the HTTP layer mocked.
- Functional tests (per task 06's pattern) covering: `list` with results, `list` with an empty collection, `get`
  found, `get` not-found.
