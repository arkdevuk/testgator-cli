# 24 — `tag list` / `tag create` / `tag delete` commands

**Depends on:** 07 (project list/get pattern), 16 (color helper)

## Summary

CRUD over the `TesterTag` catalog — the shared pool of tags (id + label) a team draws from when tagging testers
(task 23). Backed by the `TesterTag` API resource.

## Scope

- `testgator-cli tag list [--search <text>]` → `GET /api/tester_tags`; `--search` maps to the server's
  `SearchFilter` on `label` (partial), i.e. `?label=<text>`. Shape the Hydra collection to compact JSON
  (`id`, `label`, `deleted`), reusing `HydraService`/`PaginationService` like the other `list` commands.
- `testgator-cli tag create <id> --label <label>` → `POST /api/tester_tags` with `{id, label}`. Per `TesterTag.php`
  the `id` is caller-supplied and must match `[a-z0-9_-]+` (mirror that constraint client-side with a clear error
  before the request); `label` is required (`NotBlank`, max 128). Requires ROLE_USER.
- `testgator-cli tag delete <id>` → `DELETE /api/tester_tags/<id>`. Note this is a **soft delete** server-side
  (sets `deleted = true` via `TesterTagStateProcessor`); reflect that in the command help so it's not mistaken for
  a hard delete. Requires ROLE_USER.
- Print shaped result / success line via task 16 helpers; clear errors for validation (bad id shape, blank label)
  and 404 on delete.
- Add a new `tag` parent command + `TagService`/`TagModule` following the `project`/`release` shape.

## Acceptance criteria

- Unit tests for `TagService`: list (with and without `--search`), create success + invalid-id rejection, delete.
- Functional tests for all three commands' happy paths and at least one error case (invalid id on create,
  404 on delete).
