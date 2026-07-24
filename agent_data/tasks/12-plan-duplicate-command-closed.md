# 12 — `plan duplicate` composite command

**Depends on:** 08, 09

## Summary

First write/composite command: duplicate a test plan into another project/release, bundling what would otherwise
be several raw API calls (create plan, create each question, set `questionsOrder`) into one CLI invocation — the
canonical example from `project.md` of why composite commands exist.

## Scope

- `testgator-cli plan duplicate <sourceId> --project <id> --release <id> --name <name> --due-date <date>` —
  mirrors the logic already implemented in `testgator_client`'s `DuplicateTestingPlan.jsx` (create the new plan,
  create each selected question against it, then set `questionsOrder` on the new plan) but as a single CLI call.
- Partial-failure handling: if question creation fails partway through, report clearly which questions were
  created and which weren't, rather than leaving an ambiguous half-duplicated plan with no explanation.

## Acceptance criteria

- Unit tests for the orchestration logic (mocking each underlying API call) covering the happy path and a
  mid-sequence failure.
- Functional test via `nest-commander-testing` + `nock`, mocking the full sequence of API calls this command makes,
  asserting the right calls happen in the right order with the right payloads.
