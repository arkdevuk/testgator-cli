# 05 — Automatic token attachment

**Depends on:** 03, 04

## Summary

Every command other than `login` needs the cached JWT attached to its outgoing requests automatically, and a clear
error (not a raw 401) when there's no valid token yet.

## Scope

- Read the cached token (task 04's cache file) and attach it as `Authorization: Bearer <token>` to every request
  made through task 03's HTTP client.
- If no token file exists, fail fast with a clear message ("Not logged in — run `testgator-cli login` first")
  instead of making a doomed request.
- If the API responds `401`, surface a clear "session expired, run `testgator-cli login` again" message rather than
  the raw error body.

## Acceptance criteria

- Unit tests: request gets the `Authorization` header when a token is cached; missing-token case short-circuits
  with the expected error and makes no HTTP call; a mocked 401 response is translated into the expected message.
