# TestGator CLI

## What it is

`testgator-cli` is a standalone command-line tool that wraps the TestGator REST API. It exists to give AI coding
agents (Claude, primarily, invoking it through a shell/Bash tool) fast, token-efficient access to a running
TestGator instance — listing projects, test plans, questions, testers, answers, creating/updating records, and
composing multi-step workflows — without the agent needing to speak raw HTTP/JSON-LD to `testgator_server` itself.

It is a pure API *client*. It talks to the exact same public REST API that `testgator_client` (the React frontend)
already uses. It does not add anything to the backend, does not require an MCP server, and does not need any new
or specialized endpoints on `testgator_server`.

## Why it exists

`testgator_server` is a Symfony 7 + API Platform 4 backend. API Platform responses are JSON-LD/Hydra by default:
every object comes wrapped in `@context`, `@id`, `@type`; every collection comes wrapped in a `member`/`totalItems`
envelope (this project's `api_platform.yaml` leaves `hydra_prefix` off, so the keys are bare, not `hydra:`-prefixed
— see `HydraService`); relations are expressed as IRIs (`/api/test_plans/12`) rather than plain ids. That's the
right format for a generic hypermedia API client, but it's expensive for an LLM agent:

- Every response burns tokens on envelope metadata that carries no task-relevant information.
- Multi-step operations that are conceptually "one thing" (e.g. duplicating a test plan: create the plan, create
  each question, then set `questionsOrder`) require several raw HTTP round trips, each with its own full JSON-LD
  payload to parse.
- An agent working directly against the raw API has to rediscover auth flow, valid state transitions, and required
  fields by trial and error (reading docs, or hitting 400s), burning turns that a purpose-built client wouldn't need.

`testgator-cli` exists to absorb all of that: authenticate once, unwrap Hydra noise down to plain JSON, and expose
composed, task-shaped commands instead of a 1:1 mirror of every REST endpoint.

## Non-goals (for now)

- No changes to `testgator_server`. No new endpoints, no MCP server, nothing agent-specific on the backend.
- No coupling to `testgator_client`. It's a separate project so it doesn't drag React/Vite tooling into a CLI, and
  doesn't bloat the frontend bundle with CLI-only code.

This is still a real, properly engineered tool — see Testing strategy below — the scope discipline is about which
*commands* exist, not about code quality. Read-only `list`/`get` commands came first against the highest-value
collections; write and composite commands (`create`/`edit`/`delete`, `plan duplicate`, `invite`/`test-invite`) were
added as real agent workflows demanded them, and everything that exists is tested.

## How it works

**Stack:** NestJS (TypeScript), using [`nest-commander`](https://github.com/jmcdo29/nest-commander) to define CLI
subcommands as Nest providers — giving the CLI proper dependency injection, modular command classes, and testability
instead of a bespoke argv parser, while staying lightweight enough for a single-operator tool.

**Transport:** HTTP calls to `testgator_server`'s existing public REST API (JSON-LD/Hydra) via `@nestjs/axios`.

**Auth:** `testgator-cli login` performs the same login flow `testgator_client` uses (team/db or LDAP for dev-team
accounts) and caches the resulting JWT locally (e.g. `~/.testgator/token`). Every other command reuses the cached
token automatically, so an agent session only authenticates once, not per call.

**Response shaping:** Every API response is unwrapped before being printed — `@context`/`@id`/`@type` stripped,
`member`/`totalItems` collections flattened to a plain `{ items, totalItems }` (list commands print just `items`,
as a bare JSON array), and a resource's own `@id` resolved down to a plain `id` field when one isn't already
present. Relation fields (e.g. a plan's `release`) are deliberately left as IRI strings rather than guessed at —
callers resolve those themselves where it's actually needed. What reaches the agent's context is the minimum
needed to act, not the full hypermedia envelope.

**Command design:** Top-level command groups mostly mirror TestGator's domain (`project`, `release`, `plan`,
`question`, `tester`, `answer`), plus a few operational/workflow groups that don't map to a single entity
(`webhook`, `invite`/`invites`/`test-invite`/`test-invites`, `ping`, `guide`). Simple CRUD-shaped things map to
`list` / `get` / `create` / `edit` subcommands. Anything that's conceptually one operation but multiple API calls
under the hood (e.g. duplicating a plan, or inviting + enrolling a tester) becomes a single composite command
instead of forcing the caller to chain primitives.

Every `list` subcommand is paginated (`--page`, `--items-per-page`, defaulting to page 1 / 20 items) rather than
always fetching a collection in one shot — `testgator_server` paginates every collection endpoint regardless, so
this CLI makes that explicit and controllable instead of silently only ever returning the server's default first
page.

**Output:** Compact JSON to stdout by default (agent-friendly), since that's the primary consumer. Every
data-producing command prints one line of JSON on success (an array for `list`, an object for everything else) and
writes `Error: ...` to stderr with a non-zero exit code on failure — safe to parse stdout unconditionally when the
exit code is 0. A human-readable/table mode can be added later if useful for manual use, but isn't needed yet.

## Testing strategy

This is meant to be a real, maintained tool, not a throwaway script — it gets proper test coverage from the
first command onward, at two levels:

**Unit tests (Jest, NestJS's default runner).** Colocated `*.spec.ts` files next to each command and service.
These test command logic, argument/option parsing, response-shaping (Hydra → plain JSON), and error handling in
isolation, with the HTTP layer mocked (`@nestjs/axios`'s `HttpService` mocked directly, or `nock` at the network
boundary) — no real network calls, no server required, fast enough to run on every change.

**Functional tests (`nest-commander-testing`).** `nest-commander`'s companion testing package exposes
`CommandTestFactory`, which boots the real Nest application context and runs commands end-to-end exactly as the
compiled CLI would — real argument parsing, real provider resolution, real command execution — and asserts on the
actual stdout/exit code. The HTTP layer is mocked at the network boundary (`nock`) with realistic Hydra/JSON-LD
fixture payloads (modeled on real `testgator_server` responses), so these tests validate the full request →
shape → print pipeline without needing a live backend.

True end-to-end testing against a live/dockerized `testgator_server` is a possible later addition, not required
for v1 — the server already has its own test suite covering its own correctness; this CLI's functional tests exist
to prove "given a known API response, the CLI produces the right output," not to re-test the API itself.

This repo should eventually get the same PR-gated CI treatment as its siblings (`testgator_client`,
`testgator_server`): lint + unit + functional tests required to pass before merge to `main`. Not wired up yet —
today that same bar (`npm run lint`, `npm run test`, `npm run test:functional`, `npm run build`, all clean) is
enforced manually before every change is considered done.

## Relationship to the other TestGator repositories

| Repo | Role |
|---|---|
| `testgator` | Main docs repo — architecture, deployment guides (Docker Swarm, k8s, single-node), server docs (`doc/server/*`). |
| `testgator_server` | Symfony 7 + API Platform 4 backend — the REST API this CLI talks to. |
| `testgator_client` | React 19 + Vite frontend — the human-facing app, and the other consumer of the same public API. |
| `testgator-website` | Gatsby marketing site — unrelated to the API, listed here only for completeness. |
| `testgator-cli` | This project — an agent-facing CLI client of the same API `testgator_client` uses. |

## Status

No longer a brief — this is a working, tested CLI. `login`/`setup` (auth), `ping` (connectivity check), and `guide`
(in-CLI agent orientation, mirroring this doc) are in place, alongside full `list`/`get` coverage (all paginated)
for `project`, `release`, `plan`, `question`, `tester`, and `answer`, plus `create`/`edit` for `release`/`plan`/
`question`, `edit`/`delete` for `answer` (no `answer create` — answers are tester-submitted), a `plan duplicate`
composite command, `webhook enable`/`disable`/`set-url`, and `invite`/`invites`/`test-invite`/`test-invites` for
onboarding testers. See [`README.md`](./README.md) for the full command reference and worked examples, and run
`testgator-cli guide` for the same summary from the command line.

The token cache format (`~/.testgator/token`, plus `~/.testgator/api-url` when set via `setup`) has held steady
since the first auth command. Every command shipped so far carries unit + functional test coverage per the
strategy below — see [`agent_data/tasks/`](./agent_data/tasks/) for the per-feature task write-ups this repo was
built against. New commands and flags (e.g. list pagination) continue to land the same way: implement, update
`README.md`/the in-CLI `guide`/`--help` text, then unit + functional tests before merge.
