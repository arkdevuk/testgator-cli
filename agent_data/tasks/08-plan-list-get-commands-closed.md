# 08 — `plan list` / `plan get` commands

**Depends on:** 07

## Summary

Test-plan read commands, following the pattern established in task 07.

## Scope

- `testgator-cli plan list --project <id>` — list test plans, optionally filtered by project (and by release, if
  useful — check what filters `testgator_server`'s test-plan collection endpoint actually supports).
- `testgator-cli plan get <id>` — single plan detail, including its `questionsOrder` and `state`.

## Acceptance criteria

- Unit + functional tests following task 06/07's pattern, including a filtered-list case and a not-found case.
