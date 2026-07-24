# 02 — Hydra/JSON-LD response-shaping utility

**Depends on:** 01

## Summary

Core, standalone utility that turns a raw Hydra/JSON-LD response from `testgator_server` into plain JSON. This is
the single biggest token-saving piece of the whole tool and is used by every command that touches the API — build
it once, well-tested, before any real command depends on it.

## Scope

- A service/function that accepts a raw Hydra **object** response and strips `@context`, `@id`, `@type`, exposing
  the plain fields plus a resolved plain `id` (extracted from the IRI where the object doesn't already carry a
  numeric `id`).
- A service/function that accepts a raw Hydra **collection** response (`hydra:member`, `hydra:totalItems`,
  `hydra:view`) and returns `{ items: [...], totalItems: number }` with each item shaped via the object shaper
  above.
- IRI → plain id resolution helper (e.g. `/api/test_plans/12` → `12`), used both for the response's own id and for
  resolving relation fields that are IRIs.
- Explicitly out of scope: calling the API at all — this task is pure data transformation, no HTTP.

## Acceptance criteria

- Unit tests (Jest) covering: a typical object response, a typical collection response, an empty collection, a
  response missing optional fields, and IRI resolution edge cases (trailing slash, non-numeric id, nested IRIs in
  relation fields).
- Fixtures used in tests are realistic — modeled on actual `testgator_server` API Platform output (check
  `testgator_server`'s API Platform resource definitions / `testgator_client`'s `agent_data/api-doc.jsonld` for real
  shapes rather than guessing).
