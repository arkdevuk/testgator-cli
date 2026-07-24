# 16 — Console colors + minimal formatting

**Depends on:** 07 (at least one command to retrofit)

## Summary

Retrofit every command's human-readable console output (status/confirmation lines, `Error: ...` lines) with minimal
ANSI coloring for readability, without touching the JSON payloads commands print — those are read by an agent, not
a human, and must stay pure, valid, unstyled JSON on their own line. Keep the styling itself minimal: this is
explicitly about not wasting output tokens, so no boxes, banners, or multi-line frames — a color and a short symbol
prefix at most.

## Scope

- Pick a minimal-dependency color library (e.g. `picocolors` — tiny, zero dependencies, auto-detects `NO_COLOR` /
  non-TTY output) rather than hand-rolling ANSI escape codes or reaching for a heavier option like `chalk`.
- Add one small shared helper (e.g. `src/cli-output.ts`) with a couple of tiny functions — something like
  `printSuccess(message)` (green, short prefix) and `printError(message)` (red `Error: ` prefix) — and use it
  everywhere instead of every command hand-writing its own `console.error(\`Error: ${message}\`)`.
- Apply it to every existing command with a plain-text status line: `login`, `plan duplicate`'s success/error paths,
  and every resource group's list/get error paths (project/plan/question/tester/answer).
- Do **not** touch any `console.log(JSON.stringify(...))` call — list/get results and `plan duplicate`'s result
  object must remain exactly as they are: compact, uncolored, valid JSON.
- Colors must auto-disable in non-TTY contexts (piped output, `NO_COLOR=1`, and critically, Jest's test runner) —
  most small libraries do this by default; verify it rather than assuming it.

## Acceptance criteria

- A unit test asserting the helper strips to plain text when colors are disabled, so nothing downstream needs ANSI
  awareness.
- Every existing unit + functional test's exact-string assertions (e.g. `'Error: Not Found'`) keep passing
  unmodified — colors being off under Jest's non-TTY runner is what makes this possible; if that's not true for the
  chosen library, this task isn't done.
- No `console.log(JSON.stringify(...))` call site or its test assertions change.
