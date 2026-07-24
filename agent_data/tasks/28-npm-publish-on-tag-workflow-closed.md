# 28 — Publish to npm on tag from `main`

**Depends on:** 13 (CI workflow pattern)

## Summary

Automatically publish `testgator-cli` to the npm registry whenever a git tag is created on the `main` branch, so a
release is just "tag it." Currently the package can't be published as-is — `package.json` has `"private": true`,
no `files` allowlist, and `UNLICENSED` — so this task covers both the workflow and the package changes it needs.

## Scope

### Package readiness (`package.json`)

- Remove `"private": true` (npm refuses to publish a private package).
- Set a real `license` — `AGPL-3.0-only` to match the project's stated license — and add a `LICENSE` file if
  absent.
- Add a `files` allowlist (at least `["dist"]`) so only build output ships, and ensure `main` points at
  `dist/main.js` (the `bin` already does).
- Add `"prepublishOnly": "npm run build"` (or build explicitly in the workflow) so `dist/` is always fresh.
- Do **not** hand-bump `version` here — the tag is the source of truth (see workflow).

### Workflow (`.github/workflows/publish.yml`)

- Trigger on tag push: `on: { push: { tags: ['v*'] } }` (adopt a `vX.Y.Z` convention; document it).
- **Enforce "tag must be on `main`."** A tag push doesn't carry a branch, so add a first job/step that fails fast
  unless the tagged commit is contained in `origin/main` — e.g. `git branch -r --contains "$GITHUB_SHA"` (with a
  full-history checkout, `fetch-depth: 0`) and assert `origin/main` is in the list, or use `git merge-base --is-ancestor`.
  If not on `main`, exit without publishing.
- Derive the npm version from the tag (strip the leading `v`) and assert it equals `package.json`'s `version`
  (fail on mismatch) — or run `npm version --no-git-tag-version "$TAG"` before publish. Pick one and document it;
  don't publish a version that disagrees with the tag.
- Gate publish behind the existing quality bar before shipping: `npm ci`, `npm run lint`, `npm test`,
  `npm run test:functional`, `npm run build` — reuse task 13's steps so a broken build never publishes.
- Publish: `npm publish` with `NODE_AUTH_TOKEN` from a repo secret (`NPM_TOKEN`); `actions/setup-node` with
  `registry-url: 'https://registry.npmjs.org'`. Add `--access public` if the package name is/looks scoped.
- Least-privilege `permissions: { contents: read }`; `concurrency` group keyed on the tag to avoid double
  publishes.
- Note in the task/PR that `NPM_TOKEN` must be added as a GitHub Actions secret (an automation token) — that's a
  repo-settings step the diff can't do.

## Acceptance criteria

- `package.json` is publishable (not private, licensed, `files` set) and `npm publish --dry-run` locally lists only
  the intended files (`dist/**`, `package.json`, `README`, `LICENSE`).
- Workflow file present; validated to: reject a tag whose commit isn't on `main`, fail on a tag/version mismatch,
  and only publish after lint + unit + functional tests + build pass.
- Publishing verified end to end against a throwaway tag (or `npm publish --dry-run` in the workflow on a test
  branch), then reverted. Document that `NPM_TOKEN` must exist as a secret for the real publish to succeed.

## Resolution (as implemented)

**Dependency deviation:** this task lists `13-ci-workflow` as a dependency, but 13 is `blocked` — no
`.github/workflows/ci.yml` exists in this repo at all (no PR-gated CI yet). Per `tasks.md`'s own reading-order rule
("take the lowest-numbered open file whose every Depends on task is closed"), 28 wasn't formally next in line.
Flagged to the user rather than resolved silently; chosen path: implement 28 **self-contained**. `publish.yml`
runs its own `npm ci`/lint/unit/functional/build gate inline (the steps 28's scope already specified explicitly)
rather than reusing a separate `ci.yml` that doesn't exist. Task 13 is untouched, still `blocked`.

**Version handling:** chose the `npm version --no-git-tag-version "$VERSION"` approach (not the
assert-package.json-matches-tag approach) — this is what "the tag is the source of truth" means in practice here:
`package.json`'s static `version` field is a placeholder, and the workflow overwrites it from the tag right before
`npm publish`, so nobody has to remember a separate "bump package.json and commit" step per release. Mirrors
`testgator_client/.github/workflows/release-docker.yml`'s tag-driven versioning (same repo org, same pattern).

**License:** confirmed via `testgator_client`/`testgator_server`'s `LICENSE` files (identical AGPLv3 text in both)
that AGPL-3.0 is this project's actual license — copied that `LICENSE` file over and set
`"license": "AGPL-3.0-only"` in `package.json`.

**Verification performed (no real GitHub Actions run possible from this sandbox — no push access):**
- `npm publish --dry-run` locally: tarball contains only `dist/**`, `package.json`, `README.md`, `LICENSE` (plus
  `dist/tsconfig.build.tsbuildinfo`, an incidental build artifact from the pre-existing `incremental: true`
  tsconfig setting — harmless, out of this task's scope to change).
- Ran every shell command from `publish.yml` locally against the real git repo: tag regex validation
  (accepts `v1.2.3`, rejects `v1.2`/`1.2.3`/`v1.2.3-beta`), `git merge-base --is-ancestor` ancestry check tested
  in both directions (a tag on `main`'s HEAD passes; a tag on a throwaway off-main branch correctly fails) using
  real throwaway tags/branches, all deleted afterward — confirmed via `git status`/`git tag`/`git branch` that the
  repo returned to its exact prior state.
- Version-from-tag flow tested against a backed-up/restored copy of the real `package.json`: `npm version
  --no-git-tag-version 9.9.9` correctly rewrote the version, `prepublishOnly` correctly re-ran `nest build`, and
  `npm publish --dry-run` produced a `testgator-cli-9.9.9.tgz` tarball — `package.json` restored to its
  task-intended content afterward (verified via diff-free `git status`).
- All four standing gates (`npm run build`, `npm test`, `npm run test:functional`,
  `npx eslint "{src,test}/**/*.ts"`) pass clean on the final state.

**NPM_TOKEN**: documented in README.md's new "Releasing" section as a required one-time repo-settings step
(Settings → Secrets and variables → Actions) that this diff cannot perform.
