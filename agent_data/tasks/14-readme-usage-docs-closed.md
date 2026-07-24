# 14 — README and usage docs

**Depends on:** 07 (at minimum one working command group)

## Summary

A root `README.md` so a human or agent picking up this repo cold knows how to build it, authenticate, and run
commands — `project.md` covers the *why*, this covers the *how*.

## Scope

- Install/build instructions (`npm install`, `npm run build`).
- `TESTGATOR_API_URL` configuration.
- `testgator-cli login` usage and where the token cache lives.
- A command reference: one line per command group with a short example, updated as new command tasks land.
- Link back to `agent_data/tasks/` and `project.md` for anyone wanting the full design rationale.

## Acceptance criteria

- A developer with no prior context can go from a fresh clone to a successful `testgator-cli project list` call
  using only this README.
