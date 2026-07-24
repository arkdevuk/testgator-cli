# 11 — `answer list` / `answer get` commands

**Depends on:** 07

## Summary

Answer read commands, following the pattern established in task 07. Likely the highest-value read command for an
agent verifying tester feedback, since answers carry state (pass/pass-with-bugs/failed/blocked) plus comments and
attachments.

## Scope

- `testgator-cli answer list --question <id>` (and/or `--plan <id>` if useful) — list answers.
- `testgator-cli answer get <id>` — single answer detail, including attachments metadata.

## Acceptance criteria

- Unit + functional tests following task 06/07's pattern.
