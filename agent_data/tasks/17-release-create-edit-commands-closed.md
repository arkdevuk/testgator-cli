# 17 — `release create` / `release edit` commands

**Depends on:** 07 (pattern), 16 (color helper)

## Summary

First release-resource commands. No `release list`/`release get` exist yet (out of scope here — `plan-duplicate.service.ts`
already does an internal, non-CLI-exposed `GET /api/releases/{id}`) — this task only adds create/edit, matching
what was actually requested.

## Scope

- `testgator-cli release create --project <id> --name <name> [--description <text>]` →
  `POST /api/releases` with `{name, project: '/api/projects/<id>', description}`. Per `Release.php`: `project` and
  `name` are required (non-nullable columns); `description` defaults to `''` server-side, so it's optional here.
- `testgator-cli release edit <id> [--name <name>] [--project <id>] [--description <text>]` →
  `PATCH /api/releases/<id>` (`application/merge-patch+json`, via `ApiClientService.patch()`), sending only the
  fields actually passed.
- Add a `ReleaseService` (+ `ReleaseModule`, `release.command.ts` parent) following the same shape as
  `ProjectService`/`PlanService` — thin resource layer over `ApiClientService`/`HydraService`.
- Print the shaped created/updated release as compact JSON on success; use task 16's `printSuccess`/`printError`
  helper for status/error lines instead of hand-written `console.error`.
- Clear error handling: server-side validation errors (missing name/project on create, 404 on edit of a
  nonexistent id) surfaced via the existing `ApiClientError` → `Error: ...` path, non-zero exit code.

## Acceptance criteria

- Unit tests for `ReleaseService` (mocking `ApiClientService`): create success, edit success with a subset of
  fields, and a validation-error case.
- Functional tests via `nest-commander-testing` + `nock` for both commands' happy paths and at least one error case
  each.
