# 04 — `login` command and token cache

**Depends on:** 03

## Summary

The `testgator-cli login` command: authenticate against `testgator_server` the same way `testgator_client` does,
and cache the resulting JWT locally so every later command can reuse it without re-authenticating.

## Scope

- `testgator-cli login` command (via `nest-commander`) supporting the team/db and LDAP flows already implemented
  in `testgator_server` / used by `testgator_client`'s `Login.jsx` — email/username + password (and whichever
  auth-mode discovery call `testgator_client` makes first, e.g. `AuthService.getAuthMode()`).
- On success, persist the JWT to a local cache file (e.g. `~/.testgator/token`), creating the directory if needed.
- Reasonable CLI feedback: success message, clear error message on bad credentials (surfacing the API's error
  detail via task 03's error handling) without leaking the password into logs.
- Explicitly out of scope: tester (OTP) login — this is for the dev-team CLI operator, not testers.

## Acceptance criteria

- Unit tests for the token-cache read/write helper in isolation (temp dir, no real filesystem pollution).
- Functional test via `nest-commander-testing`'s `CommandTestFactory`: run `login` against a `nock`-mocked auth
  endpoint (success case + bad-credentials case), assert the token file is written with the right content on
  success and that a clear error is printed (no token file written) on failure.
