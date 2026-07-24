# 13 — CI workflow

**Depends on:** 06, 07

## Summary

Give `testgator-cli` the same PR-gated CI treatment as `testgator_client` and `testgator_server`: lint + unit +
functional tests required to pass before merge to `main`.

## Scope

- `.github/workflows/ci.yml`: triggered on `pull_request` (+ `workflow_dispatch`), matching the sibling repos'
  pattern — `main` has no direct pushes, so PR-only is sufficient.
- `concurrency` group to cancel superseded runs, explicit least-privilege `permissions: { contents: read }`.
- Steps: checkout, setup Node, `npm ci`, `npm run lint`, `npm test` (unit), `npm run test:functional`.
- Should become the required status check on this repo's branch protection / ruleset once merged, same as the
  other repos — call this out in the PR description so it gets wired up on GitHub, but the actual ruleset
  configuration is a repo-settings change, not something this task's diff can do.

## Acceptance criteria

- Workflow runs successfully on a PR and fails the build if lint, unit tests, or functional tests fail (verify by
  temporarily breaking one on a throwaway branch/PR, confirming the check goes red, then reverting).
