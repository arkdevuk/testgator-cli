# 26 — `plan remove-tester` command

**Depends on:** 08 (plan list/get pattern), 18 (plan edit / PATCH mechanics)

## Summary

The inverse of enrolling a tester. Enrollment lives in `TestPlan.testersEnrolled` (a ManyToMany to `User`); `invite`
already enrolls by read-modify-writing that array. This task removes a tester from a plan the same way.

## Scope

- `testgator-cli plan remove-tester <planId> <testerId...>` → `GET /api/test_plans/<planId>`, drop the given tester
  IRI(s) (`/api/testers/<id>`) from `testersEnrolled`, then `PATCH /api/test_plans/<planId>`
  (`application/merge-patch+json`) with the reduced `{testersEnrolled: [...]}` — the same single-PATCH pattern the
  `invite` service uses in reverse.
- Accept multiple tester ids in one call. If none of them are enrolled, skip the PATCH entirely (no-op), mirroring
  `invite`'s "already enrolled → no PATCH" behavior.
- Removing a tester detaches them from the plan only; it does **not** delete their existing answers or the tester
  account. Note this in the command help.
- Print the plan's resulting enrolled count / ids as compact JSON on success; task 16 helpers for status/errors.
- Add under the existing `plan` parent command via `PlanService`.

## Acceptance criteria

- Unit tests: remove an enrolled tester, remove several at once, remove a not-enrolled tester (no-op PATCH),
  remove from an empty plan.
- Functional tests: happy path (single PATCH issued) and the no-op case (no PATCH), plus a 404 for an unknown plan.
