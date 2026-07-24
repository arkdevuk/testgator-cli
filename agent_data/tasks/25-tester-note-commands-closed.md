# 25 — `tester note list` / `tester note add` commands

**Depends on:** 10 (tester list/get pattern), 16 (color helper)

## Summary

Read and append free-text notes on a tester. Notes are `TesterAnnotation` records linked to a tester via
`relateTo`, authored by the logged-in user (`createdBy`).

## Scope

- `testgator-cli tester note list <testerId>` → `GET /api/tester_annotations?relateTo=/api/testers/<testerId>`
  (server exposes a `SearchFilter` on `relateTo` exact, plus an `OrderFilter` on `created`/`updated`). Default to
  newest-first via `?order[created]=desc`. Shape each note to compact JSON (`id`, `content`, `createdBy`,
  `created`), reusing `HydraService`/`PaginationService`.
- `testgator-cli tester note add <testerId> <content>` → `POST /api/tester_annotations` with
  `{relateTo: '/api/testers/<testerId>', content}`. Requires ROLE_USER; `createdBy` is set server-side by
  `TesterAnnotationStateProcessor`, so don't send it.
- Print shaped result / success line via task 16 helpers; clear errors (404 for an unknown tester, empty content).
- Add these under the existing `tester` parent command via `TesterService` (or a small `TesterNoteService`).
- **Not** in scope: edit/delete of notes — server restricts `Patch`/`Delete` to the note's creator or ROLE_ADMIN;
  defer to a later task if needed.

## Acceptance criteria

- Unit tests: list builds the correct `relateTo` + order query and shapes results; add posts the correct body.
- Functional tests for both commands' happy paths and a 404 (unknown tester) case.
