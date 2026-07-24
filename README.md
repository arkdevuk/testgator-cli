# testgator-cli

Agent-facing command-line client for the TestGator REST API. It wraps `testgator_server`'s JSON-LD/Hydra
responses down to plain, compact JSON and handles authentication once instead of on every call — built primarily
so AI agents (and humans) can drive a TestGator instance from a shell without speaking Hydra. See
[`project.md`](./project.md) for the full design rationale.

It is a pure REST client: it talks to the same public API `testgator_client` (the React frontend) already uses,
adds nothing to the backend, and needs no MCP server or new endpoints.

## Install & build

```bash
npm install
npm run build
```

This produces `dist/main.js`. Run it directly with Node, or link it as a global `testgator-cli` binary:

```bash
npm link
testgator-cli --help
```

(Or skip linking and invoke it as `node dist/main.js --help`.)

## Configuration

`testgator-cli` needs to know which `testgator_server` instance to talk to. Resolution order:

1. `TESTGATOR_API_URL` environment variable — always wins.
2. The API URL cached by `testgator-cli setup` (see below).
3. `http://localhost` — default, local-dev fallback.

```bash
export TESTGATOR_API_URL=https://testgator.example.com
```

## Authenticate

Run one of these once per machine/session:

```bash
# login — no API URL prompt, just credentials
testgator-cli login --username alice --password secret

# setup — also configures (and caches) the API URL; interactive by default
testgator-cli setup

# setup — fully non-interactive (recommended for agents/scripts): pass all three
testgator-cli setup --api-url https://testgator.example.com --username alice --password secret

# setup also accepts a subset of flags and prompts only for what's missing
testgator-cli setup --username alice --password secret   # prompts for --api-url only
```

Both `login` and `setup` cache a JWT locally at `~/.testgator/token` (`setup` additionally caches the API URL at
`~/.testgator/api-url`). Override the cache directory with `TESTGATOR_CONFIG_DIR` if needed. Every other command
reads the cached token automatically — no need to log in again per invocation. The password itself is never
cached or logged.

If the token expires or is revoked, the next command fails with
`Error: Session expired — run \`testgator-cli login\` again.` and the stale token is cleared automatically.

## Output convention

Every data-producing command prints one line of compact JSON to stdout on success. Errors go to stderr as
`Error: ...` with a non-zero exit code — safe to parse stdout unconditionally when the exit code is 0. Output is
only colored when stdout is a real TTY, so scripts and agents parsing it always get plain text.

## Commands

Run `testgator-cli guide` for an in-CLI version of this summary (handy for an agent with no filesystem access to
this file), and `<command> [<subcommand>] --help` for full flag-level detail — every command has a worked example
in its own `--help` output.

| Command | Example |
| --- | --- |
| `login` | `testgator-cli login --username alice --password secret` |
| `setup` | `testgator-cli setup --api-url <url> --username <u> --password <p>` (non-interactive) or just `testgator-cli setup` (interactive) |
| `ping` | `testgator-cli ping` — checks the configured server is reachable, reports response time (requires `login`/`setup` first — the healthcheck route needs a JWT like everything else) |
| `project list` / `get <id>` | `testgator-cli project list` (omits `allTesters`; keeps `totalTesters`) |
| `release list` / `get <id>` / `create` / `edit <id>` | `testgator-cli release list --project 1` |
| `plan list` / `get <id>` / `create` / `edit <id>` / `duplicate <sourceId>` / `remove-tester <planId> <testerId...>` | `testgator-cli plan list --project 1` or `--release 5`; `testgator-cli plan create --release 5 --name "Regression" --due-date 2026-08-01T00:00:00+00:00`; `testgator-cli plan remove-tester 12 8f14e45f-...` |
| `question list` / `get <id>` / `create` / `edit <id>` | `testgator-cli question create --plan 12 --name "Can you log in?"` |
| `tester list` / `get <id>` / `tag add \| remove <testerId> <tag...>` / `note list \| add <testerId> ...` / `disable \| enable <testerId>` | `testgator-cli tester list --project 1`; `testgator-cli tester tag add 8f14e45f-... vip beta`; `testgator-cli tester note add 8f14e45f-... "Very responsive tester"`; `testgator-cli tester disable 8f14e45f-...` |
| `answer list` / `get <id>` / `edit <id>` / `delete <id>` | `testgator-cli answer edit 501 --state failed --comment "Reproduces every time."` (no `answer create` — testers create answers, not this CLI) |
| `tag list` / `create <id> --label <label>` / `delete <id>` | `testgator-cli tag list --search vip`; `testgator-cli tag create vip --label "VIP"` |
| `webhook enable` / `disable` / `set-url <url>` | `testgator-cli webhook enable` (admin only — `ROLE_ADMIN`) |
| `invite <email>` | `testgator-cli invite alice@example.com` — creates a tester account if one doesn't exist yet |
| `invites <e1,e2,...>` | `testgator-cli invites alice@example.com,bob@example.com` — same, batched, continues past failures |
| `test-invite <email>` | `testgator-cli test-invite alice@example.com --plan 12` — invite + enroll on a test plan |
| `test-invites <e1,e2,...>` | `testgator-cli test-invites alice@example.com,bob@example.com --plan 12` — same, batched |
| `guide` | `testgator-cli guide` — static orientation text, no auth required |

A couple of behaviors worth knowing up front:

- `plan duplicate` is the only command that populates a plan's `questionsOrder`; `plan create`, `plan edit`,
  `question create`, and `question edit` never touch it.
- `edit` commands only send the fields you pass — they PATCH with merge semantics, not full replacement.
- There's no `answer create` — answers are submitted by testers via the mobile/web client; this CLI can only
  list/get/edit (review fields: `state`, `comment`, `important`, `ignored`) and delete them.
- There's no dedicated invite endpoint server-side: `invite`/`test-invite` just ensure a tester account exists
  for the email (creating one triggers testgator_server's welcome email automatically) and, for `test-invite`,
  enroll it on the given test plan (`testersEnrolled`, a full-replacement array — read-then-PATCH-the-union under
  the hood, so it never drops already-enrolled testers). The batch variants (`invites`/`test-invites`) continue
  past individual failures — check each outcome's `success` field rather than assuming all-or-nothing.
- `tester tag add`/`tester tag remove` read the tester's current `tags`, then PATCH back the deduped result
  (`tag add`) or the remainder (`tag remove`) — `tag remove` skips the PATCH entirely if none of the given tags
  are actually present. Any string is accepted as a tag id; there's no validation against a tag catalog.
- `tag create <id>` validates `<id>` against `[a-z0-9_-]+` client-side before sending — `TesterTag.php` has no
  server-side constraint on `id` itself (only the `get`/`delete` routes restrict which ids are reachable), so a
  bad id would otherwise create a tag no `get`/`delete` could ever address again.
- `tag delete` is a **soft delete** (`TesterTag.deleted = true`; the row isn't removed, and testers who already
  carry that tag id keep it) — not a hard delete.
- `tester note list <testerId>` fetches `/api/tester_annotations` filtered by `relateTo`, newest first
  (`order[created]=desc`) — paginated like every other `list` command. `tester note add <testerId> <content>`
  rejects blank content client-side (the server has no constraint on it). `createdBy` is always set server-side
  from the authenticated user; the CLI never sends it.
- `plan remove-tester <planId> <testerId...>` reads the plan's current `testersEnrolled`, then PATCHes back the
  roster minus the given tester(s) — skips the PATCH entirely if none of them are actually enrolled. It only
  detaches enrollment; it does not delete the testers' existing answers or their accounts.
- `tester disable`/`tester enable` PATCH `active` on `/api/testers/{id}`. This is **not** ROLE_ADMIN-gated: despite
  an earlier assumption, `User.php`'s Patch operation on `/api/testers/{id}` only requires ROLE_USER, and a
  field-level comment there confirms it's intentional so any team member can deactivate a tester. The CLI matches
  that — any logged-in team member can run these, not just admins.
- `project list`/`project get` never print `allTesters` (a bulky IRI array of every tester ever assigned to the
  project) — `totalTesters` (a plain count) is kept. Use `tester list --project <id>` for the actual roster.
- Drilling down the hierarchy: `release list --project <id>` for a project's releases, `plan list --project <id>`
  for test plans across every release in a project, `plan list --release <id>` for test plans in one release
  specifically (`plan list` accepts both filters together or separately).
- Every `list` command is paginated: `--items-per-page <n>` (defaults to 20 if omitted) and `--page <n>` (1-based,
  defaults to page 1). List output stays a plain JSON array with no envelope, so there's no in-band total count —
  keep incrementing `--page` until a response comes back with fewer than `--items-per-page` items. One exception:
  `tester list --project <id>` filters by project client-side (there's no server-side filter for it), so
  pagination is applied *before* that filter — a page can come back with fewer matches than `--items-per-page`
  even when more exist on other pages.

## Development

```bash
npm run test              # unit tests
npm run test:functional   # functional tests (nest-commander-testing + nock, no real server needed)
npm run test:packaging    # smoke-tests the real packaged binary (npm pack + npm install -g), not in-process dispatch
npm run lint               # eslint --fix (auto-fixes what it can)
npm run build
```

See [`agent_data/tasks.md`](./agent_data/tasks.md) for the task-queue convention this repo was built against, and
[`agent_data/tasks/`](./agent_data/tasks/) for the individual task write-ups (one per feature, closed once
implemented and verified).

## Releasing

Publishing to npm is "tag it": push a `vX.Y.Z` tag (e.g. `v1.2.3`) and
[`.github/workflows/publish.yml`](./.github/workflows/publish.yml) takes it from there. `package.json`'s own
`version` field is a placeholder, not the source of truth — the workflow sets the real published version from the
tag (`npm version --no-git-tag-version`) right before publishing, so there's no separate "bump package.json and
commit it" step to remember.

Before it publishes, the workflow:

1. Rejects any tag that doesn't look like `vX.Y.Z`.
2. Rejects any tag whose commit isn't reachable from `main` — tag protection on GitHub only controls who can
   create matching tags, not what commit they point to, so this is the actual "must be a released commit"
   enforcement (`git merge-base --is-ancestor`).
3. Runs the same quality bar as local development: `npm ci`, `lint`, unit tests, functional tests, `build`. A
   broken build never reaches npm.

Only then does it set the version from the tag and run `npm publish`.

**One-time setup required (not something a code change can do):** an `NPM_TOKEN` repo secret — an npm automation
token with publish rights for this package — must exist under Settings → Secrets and variables → Actions before
the first real publish will succeed. Without it, `npm publish` fails at the last step with an auth error; every
step before that (tag/ancestry validation, lint, tests, build) still runs and still gates correctly.

## Design rationale

[`project.md`](./project.md) covers the *why* — the problem this CLI solves for an agent working against
`testgator_server`'s Hydra API, and the constraints it operates under (pure REST client, no backend changes, no
MCP server).
