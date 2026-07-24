# 06 — Testing infrastructure

**Depends on:** 01

## Summary

Wire up the two-tier testing setup described in `project.md` — unit tests and `nest-commander-testing` functional
tests — with a shared fixtures directory, so every later command task can just write tests against an established
pattern instead of re-deriving the setup each time.

## Scope

- Jest configuration for unit tests (`*.spec.ts` colocated with source).
- A separate Jest project/config (or a `test:functional` script) for functional tests using
  `nest-commander-testing`'s `CommandTestFactory`, which boots the real Nest application context and runs commands
  end-to-end.
- `nock` (or equivalent) wired into the functional-test setup to intercept outbound HTTP calls at the network
  boundary.
- A `test/fixtures/` (or similar) directory holding realistic Hydra/JSON-LD sample payloads for each resource type
  (project, release, test plan, question, tester, answer) — modeled on real `testgator_server` responses, reused
  across command test suites rather than re-declared inline each time.
- One example unit spec and one example functional spec (can reuse task 01's `hello` command) demonstrating both
  patterns end-to-end, as a template for later tasks to copy.

## Acceptance criteria

- `npm test` runs unit specs; `npm run test:functional` runs functional specs; both pass.
- The example functional spec actually exercises `CommandTestFactory` running a real command and asserting on
  stdout — not just calling the command's method directly.
- Fixtures directory documented (a short README or comment) explaining where the sample payloads came from and how
  to add new ones.
