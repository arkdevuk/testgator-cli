# 23 — `tester tag add` / `tester tag remove` commands

**Depends on:** 10 (tester list/get pattern)

## Summary

Let an agent attach or detach tags on a tester's profile. A tester's tags live in `User.tags` — a JSON string
array on the `Tester` API resource (`testers:read` / `testers:write`), distinct from the `TesterTag` catalog
managed in task 24. This task only mutates the array on a single tester.

## Scope

- `testgator-cli tester tag add <testerId> <tag...>` → read the tester's current `tags` via
  `GET /api/testers/<testerId>`, union in the new tag id(s), and `PATCH /api/testers/<testerId>`
  (`application/merge-patch+json`) with the full deduped `{tags: [...]}`. Server dedupes too (`setTags` does
  `array_unique`), but dedupe client-side to keep the PATCH minimal/idempotent.
- `testgator-cli tester tag remove <testerId> <tag...>` → same read-modify-write, removing the given tag id(s);
  no-op PATCH (or skip entirely) if none of them are present, mirroring how `invite` skips a redundant PATCH.
- Accept multiple tags in one call. Print the tester's resulting `tags` array as compact JSON on success; use the
  task 16 `printSuccess`/`printError` helpers.
- Add these under the existing `tester` parent command (`tester.command.ts`) via the `TesterService`.
- **Not** in scope: creating the tag in the catalog (task 24) or validating that the tag id exists there — document
  that `tag add` accepts any string id; pairing with task 24's `tag list` is the intended UX.

## Acceptance criteria

- Unit tests for `TesterService` add/remove: adding to an empty list, adding a duplicate (no change), removing a
  present tag, removing an absent tag (no-op).
- Functional tests (`nest-commander-testing` + `nock`) for both commands: a happy path and the no-op PATCH case.
