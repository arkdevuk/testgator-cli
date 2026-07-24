# 18 — `plan create` / `plan edit` commands

**Depends on:** 08 (existing `plan` group), 16 (color helper)

## Summary

Adds write commands to the existing `plan` group (currently `list`/`get`/`duplicate` only) — create a fresh test
plan directly under a release, or edit an existing one's fields.

## Scope

- `testgator-cli plan create --release <id> --name <name> --due-date <date> [--description <text>] [--state draft|published|archived] [--content <text>]`
  → `POST /api/test_plans`. Per `TestPlan.php`: `release`, `dueDate`, and `name` are required (non-nullable);
  `state` defaults to `draft` server-side; `description`/`content` are optional.
- `testgator-cli plan edit <id> [--name] [--release] [--due-date] [--description] [--state] [--content]` →
  `PATCH /api/test_plans/<id>` (merge-patch+json), sending only the fields actually passed.
- **Not in scope:** a `--questions-order` flag. `questionsOrder` is set exclusively by `plan duplicate`'s
  orchestration today (task 12); exposing it as a raw edit flag is a separate future task if an agent workflow
  actually needs it.
- Add `create`/`update` methods to the existing `PlanService` (same file as `list`/`get` — task 08), not to
  `PlanDuplicateService`, which is a separate, unrelated orchestration.
- Print the shaped created/updated plan as compact JSON; use task 16's `printSuccess`/`printError` helper for
  status/error lines.

## Acceptance criteria

- Unit tests for `PlanService.create`/`PlanService.update` (mocking `ApiClientService`): create success, edit
  success with a subset of fields, and a validation-error case.
- Functional tests via `nest-commander-testing` + `nock` for both commands, including at least one error case each.
