# 15 — `setup` interactive command

**Depends on:** 04 (login/auth flow), 05 (token cache)

## Summary

A first-run interactive command that walks a human operator through configuring `testgator-cli` — API URL, then
team username/password — and persists the resulting session, so they don't have to know the two-step
"export TESTGATOR_API_URL, then run login" dance today's setup requires.

## Scope

- `testgator-cli setup` — interactive prompts, in order: API URL (default: current `TESTGATOR_API_URL` env var if
  set, else `http://localhost`), username, password (masked input). Use `nest-commander`'s built-in Inquirer
  integration (`@QuestionSet`/`@Question` decorators + `InquirerService`) rather than a bespoke readline/prompt
  library — it's already a transitive dependency of `nest-commander` and is the idiomatic way to do this in this
  stack.
- After collecting the answers, run the *same* auth-mode-discovery + login flow `AuthService.login()` already
  implements (reuse it, don't duplicate it) against the API URL just entered — so a wrong URL or bad credentials
  fail loudly during setup itself, not on the next unrelated command.
- Persistence: today `TokenCacheService` only persists a JWT (`~/.testgator/token`). This command needs the API URL
  persisted too, so a user who's run `setup` doesn't have to keep exporting `TESTGATOR_API_URL`. Widen the on-disk
  cache accordingly (e.g. a small `config.json` alongside/replacing the bare `token` file) and have
  `ApiConfigService.apiUrl` fall back to the cached value when the env var isn't set — the env var must stay the
  explicit override it already is. Whatever shape is chosen must stay backward compatible with every existing
  test's `TESTGATOR_CONFIG_DIR`/`token`-file setup (see the functional specs in `test/functional/*.functional-spec.ts`).
- **Do not cache the plaintext password.** It's used once, in memory, to obtain the JWT — exactly like `login` —
  then discarded. Only `apiUrl` and the resulting token get persisted. (Mirrors `LoginCommand`'s existing "never log
  the password" guarantee — see `login.command.spec.ts`'s test of the same name.)
- On success: a short human-readable confirmation (API URL, logged in as which username) — this is an interactive,
  human-facing command, not agent JSON output, so no `console.log(JSON.stringify(...))` here.
- On failure (bad credentials, unreachable API, etc.): print the underlying error clearly and don't leave a
  partial/corrupt cache file behind.

## Acceptance criteria

- Unit tests for the orchestration logic, mocking `InquirerService`'s answers and `AuthService.login`, covering the
  happy path and a login failure.
- Functional test via `nest-commander-testing` + `nock`. Interactive prompts don't trivially work under
  `CommandTestFactory` — work out and document the approach used (most likely overriding the `InquirerService`
  provider on the testing module with canned answers via `.overrideProvider()`).
- Every existing command's tests keep passing unmodified against the (possibly widened) cache file format.
