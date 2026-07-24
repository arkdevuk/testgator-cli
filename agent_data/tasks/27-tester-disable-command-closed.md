# 27 — `tester disable` / `tester enable` commands (admin)

**Depends on:** 10 (tester list/get pattern), 16 (color helper)

## Summary

Deactivate (or reactivate) a tester account. A tester's `active` flag lives on the `Tester` API resource; setting
it false disables the account. Per this task's requirement, the CLI command is intended for admins
(ROLE_ADMIN) — follow the same "requires ROLE_ADMIN" convention the `webhook` commands already use.

## Scope

- `testgator-cli tester disable <testerId>` → `PATCH /api/testers/<testerId>`
  (`application/merge-patch+json`) with `{active: false}`.
- `testgator-cli tester enable <testerId>` → same with `{active: true}` (natural companion; keeps the account
  recoverable).
- Command help states it requires ROLE_ADMIN and that a non-admin login fails with a clear error — matching the
  wording pattern in `webhook-enable.command.ts` / `webhook-disable.command.ts`. Surface the server's 403 as a
  readable "requires ROLE_ADMIN" message rather than a raw error.
- Print the tester's resulting `active` state as compact JSON on success; task 16 helpers for status/errors.
- Add under the existing `tester` parent command via `TesterService`.

## Design note to resolve during implementation

The server currently allows **any ROLE_USER** to PATCH `active` on `/api/testers/{id}` (see the `testers:write`
group comment in `User.php`), so the ROLE_ADMIN requirement is not enforced server-side today. Before closing this
task, decide and document one of:

1. **(Recommended)** Tighten the server so writing `active` requires ROLE_ADMIN (dedicated operation or a
   validation/voter check), so the guarantee is real — then the CLI simply surfaces the 403. This touches
   `testgator_server`; if chosen, split it into a paired server task and depend on it.
2. Enforce the check client-side only (read the caller's roles first, refuse if not admin) — weaker, since the API
   still permits it; only acceptable as an interim.

Do not silently ship a command that claims "admin only" while the API accepts it from anyone.

## Acceptance criteria

- Unit tests for `TesterService` disable/enable: correct PATCH body, and a 403 mapped to a clear ROLE_ADMIN error.
- Functional tests for both commands' happy paths and the 403 case.
- The chosen enforcement approach (server-tightened vs. client-side) is documented in the command help and the
  handback summary.

## Resolution (as implemented)

Neither of the two options above was taken. Re-reading `User.php` at implementation time surfaced a third fact:
the "any ROLE_USER can PATCH active" behavior isn't an oversight — there's an explicit code comment on the
`active` field ("'testers:write' is required so a team member (ROLE_USER) can PATCH {active: false}") confirming
it's intentional. The premise of this task (that it should be admin-only) conflicted with that documented intent.

Surfaced to the user as a decision point rather than picked silently; chosen answer: **implement `tester
disable`/`tester enable` for any logged-in team member, matching the server's actual (intentional) design.** No
ROLE_ADMIN check exists client- or server-side. Command help and README both say so explicitly, so nobody reading
this CLI's docs is misled into thinking it's admin-gated. The "403 → ROLE_ADMIN error" unit/functional tests from
the acceptance criteria above don't apply under this resolution; disable/enable are tested for their happy paths
and a 404 (unknown tester) instead.
