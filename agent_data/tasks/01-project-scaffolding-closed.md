# 01 — Project scaffolding

**Depends on:** —

## Summary

Set up the base NestJS + TypeScript project with `nest-commander`, ready for command development. This is the
foundation every other task builds on.

## Scope

- Initialize a NestJS project (TypeScript) in `testgator-cli/`.
- Add `nest-commander` for CLI command definition and `nest-commander-testing` as a dev dependency for functional
  tests (see task 06).
- Add Jest (NestJS default) for unit tests.
- Add ESLint (+ Prettier if consistent with other TestGator repos) for lint.
- `package.json` scripts: `build`, `start` (run the compiled CLI), `test` (unit), `test:functional` (functional/e2e),
  `lint`.
- A single trivial `hello` command wired through `nest-commander` to prove the CLI boots, parses args, and runs.
- `.gitignore` (node_modules, dist, local token cache path, env files).

## Acceptance criteria

- `npm run build && node dist/main.js hello` runs and prints something.
- `npm test` runs (even trivially) and passes.
- `npm run lint` passes.
- No backend changes, no MCP — this task only touches `testgator-cli/`.
