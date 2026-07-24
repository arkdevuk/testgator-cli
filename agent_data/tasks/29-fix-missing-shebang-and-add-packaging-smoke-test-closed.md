# 29 — Fix missing shebang, add a real packaging smoke test

**Depends on:** none

## Summary

`npm install -g testgator-cli` produced a broken binary: `testgator-cli guide` failed with
`line 1: use strict: command not found` — the shell was trying to interpret `dist/main.js` as a shell script.
Root cause: `src/main.ts` had no `#!/usr/bin/env node` shebang, so the compiled `dist/main.js` (the file
`package.json`'s `bin` field points at) had none either. Every existing test (unit + functional) drives commands
in-process via `nest-commander-testing`'s `CommandTestFactory` — none of them actually execute the packaged
binary the way a real `npm install -g` user does, so this was invisible to the standing four-gate verification the
whole session relied on.

## Scope

- Add `#!/usr/bin/env node` as the first line of `src/main.ts`.
- Verify TypeScript preserves it through `nest build` (it does — confirmed `dist/main.js` starts with the shebang
  after a clean rebuild, despite `removeComments: true` in `tsconfig.json`; shebangs aren't treated as regular
  comments).
- Add a smoke test that exercises the actual packaged artifact, not just in-process command dispatch: `npm pack`,
  install the resulting tarball into a scratch global prefix, and run the real installed binary. This is the only
  way to catch this class of bug (missing shebang, wrong `bin` path, missing `files` entries, non-executable
  permissions) — none of it is visible to `CommandTestFactory`-based tests.

## Acceptance criteria

- `npm pack` → `npm install -g <tarball> --prefix <scratch>` → `<scratch>/bin/testgator-cli --help` succeeds and
  prints real output (not a shell syntax error).
- Standing four-gate verification still passes: `npm run build`, `npm test`, `npm run test:functional`,
  `npx eslint "{src,test}/**/*.ts"`.
- A new automated smoke test exists so this can't silently regress on a future change to `main.ts`, `tsconfig.json`,
  or `package.json`'s `bin`/`files` fields.

## Resolution (as implemented)

Added the shebang to `src/main.ts` (one line). Verified the fix three ways:
1. Rebuilt clean (`rm -rf dist && npm run build`) and confirmed `dist/main.js` starts with `#!/usr/bin/env node`.
2. `npm pack` → `npm install -g ./testgator-cli-*.tgz --prefix /tmp/scratch` → `testgator-cli --help` — real
   end-to-end reproduction of the user's exact failure, now passing.
3. Added `test/packaging.smoke-spec.ts` (see below) so this is checked automatically going forward, not just
   verified by hand this once.

**Not done as part of this task:** publishing the fixed version to npm. This repo's own `agent.md`-equivalent
convention (documented in the workspace-level `agent.md`, and by extension how npm publish has been handled all
session) is that the person runs publish/release commands themselves — this task only fixes and verifies the code
locally. A new patch version needs to be tagged/published by the user for real installs to pick up the fix.
