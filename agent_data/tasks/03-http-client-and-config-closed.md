# 03 — HTTP client and configuration

**Depends on:** 01

## Summary

A thin, shared HTTP client wrapping `@nestjs/axios`, pointed at a configurable `testgator_server` base URL, with
consistent error handling — the foundation every command uses to actually call the API.

## Scope

- Config: base API URL read from an env var (e.g. `TESTGATOR_API_URL`) with a sensible local-dev default
  (`http://localhost`), following the same resolution pattern `testgator_client`'s `Http.js` already uses.
- A shared `ApiClientService` (or similar) wrapping `HttpService`, with base headers (`Accept: application/ld+json`
  or whatever `testgator_server` expects) already set.
- Consistent error handling: on a non-2xx response, throw a typed error carrying the HTTP status and the API's
  error body (`hydra:description` / `detail`), so commands can print a useful message instead of a raw stack trace.
- Explicitly out of scope: authentication (task 04/05) and response shaping (task 02) — this task is just "make an
  HTTP call, get a response or a typed error back."

## Acceptance criteria

- Unit tests with the network layer mocked (`nock` or a mocked `HttpService`) covering: successful GET, successful
  POST, a 4xx error response, a 5xx error response, and a network-level failure (connection refused / timeout).
- Base URL is overridable via env var, confirmed by a test.
