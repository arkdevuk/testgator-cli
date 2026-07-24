# 20 — `webhook enable` / `webhook disable` / `webhook set-url` commands

**Depends on:** 07 (pattern), 16 (color helper)

## Summary

Covers both of the requested webhook commands (enable/disable, and updating the webhook URL) in one task, since
they're the same underlying resource and would touch the same module anyway.

There is no dedicated Webhook entity/endpoint in `testgator_server` — outbound webhooks (`WebhookService.php`) are
configured through the generic key-value `Settings` resource (`/api/settings/{id}`, composite id
`"{section}.{name}"`):
- `webhook.enable_webhook` — `value` must be the *string* `"true"` or `"false"`.
- `webhook.webhook_url` — `value` is the target URL. The server validates it with a `SafeUrl` constraint
  (rejects private/loopback/link-local targets — an SSRF guard) specifically when `id === 'webhook.webhook_url'`,
  so a bad URL already comes back as a clear validation error through the existing `ApiClientError` path.

**Write access to Settings requires `ROLE_ADMIN`** (`Settings.php`: `Post`/`Patch`/`Delete` are all
`security: "is_granted('ROLE_ADMIN')"`) — a non-admin dev-team login will get a 403. This is the "must crash if
user has insufficient access" behavior the request calls for, and it falls out of the *existing* error-handling
pattern for free: don't add any special-casing to swallow or retry a 403, just let `ApiClientError` propagate to
`Error: ...` + non-zero exit like every other command already does. The acceptance criteria below just requires
proving it with a test.

## Scope

- `testgator-cli webhook enable` → sets `webhook.enable_webhook` to `"true"`.
- `testgator-cli webhook disable` → sets `webhook.enable_webhook` to `"false"`.
- `testgator-cli webhook set-url <url>` → sets `webhook.webhook_url` to `<url>`.
- All three are logically a **PATCH-or-create upsert**: `Settings` rows use a manually-assigned composite id, not
  an auto-increment one, so there's no guarantee the row already exists on a given instance. Try
  `PATCH /api/settings/{id}` first; if that 404s, fall back to `POST /api/settings` with the full payload
  (`section`, `name`, `value`, `autoload: false`, `public: false` — webhook config is admin-only operational
  config, so it should not be marked public). Verify this assumption (that the rows may not pre-exist) against a
  real `testgator_server` instance if one's available when this is picked up; adjust if they're always seeded.
- Add a `WebhookService` + `WebhookModule` + `webhook` parent command, following the established resource-command
  shape. Print the shaped result (or a short confirmation) on success; use task 16's `printSuccess`/`printError`
  helper for status/error lines.
- On a 403 (insufficient permissions): surface the server's error via the existing `ApiClientError` → `Error: ...`
  path and a non-zero exit code — no special handling, no retry, no silent fallback.

## Acceptance criteria

- Unit tests for `WebhookService` (mocking `ApiClientService`): PATCH-succeeds path, PATCH-404-then-POST-fallback
  path, and a 403-insufficient-permissions case for at least one of the three commands.
- Functional tests via `nest-commander-testing` + `nock` covering all three commands' happy paths plus one 403 case.
