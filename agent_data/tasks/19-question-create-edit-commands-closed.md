# 19 — `question create` / `question edit` commands

**Depends on:** 09 (existing `question` group), 16 (color helper)

## Summary

Adds write commands to the existing `question` group (currently `list`/`get` only) — create a question directly
under a test plan, or edit an existing one.

## Scope

- `testgator-cli question create --plan <id> --name <name> [--content <text>] [--display-order <n>]` →
  `POST /api/questions`. Per `Question.php`: `plan` and `name` are required (non-nullable); `content` is nullable;
  `displayOrder` defaults to `0` server-side.
- `testgator-cli question edit <id> [--name] [--plan] [--content] [--display-order]` →
  `PATCH /api/questions/<id>` (merge-patch+json), sending only the fields actually passed.
- Creating a question this way does **not** automatically append it to its plan's `questionsOrder` (same caveat as
  `plan duplicate`'s own question-creation step — see task 12/18). Say so plainly in the command's own `--help`
  description so an agent doesn't assume ordering is automatic.
- Add `create`/`update` methods to the existing `QuestionService` (same file as `list`/`get` — task 09).
- Print the shaped created/updated question as compact JSON; use task 16's `printSuccess`/`printError` helper for
  status/error lines.

## Acceptance criteria

- Unit tests for `QuestionService.create`/`QuestionService.update` (mocking `ApiClientService`): create success,
  edit success with a subset of fields, and a validation-error case.
- Functional tests via `nest-commander-testing` + `nock` for both commands, including at least one error case each.
