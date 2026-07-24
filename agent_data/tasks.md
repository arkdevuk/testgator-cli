# Working with `agent_data/tasks/`

This directory is the task queue for building `testgator-cli`. It's the source of truth for what's done, what's
next, and why — read it before doing any work in this repo.

## File naming

Every task is a single file: `{number}-{title}-{state}.md`.

- `number` — two-digit, zero-padded, strictly increasing (`01`, `02`, ... `22`). Numbers are assigned once and
  never reused or renumbered, even if a task is later dropped.
- `title` — kebab-case, short, matches the task's actual subject (e.g. `plan-list-get-commands`).
- `state` — one of:
  - `open` — not started, ready to be picked up once its dependencies are closed.
  - `in-progress` — actively being worked on right now. Only one task should be `in-progress` at a time.
  - `closed` — done: implemented, and verified (see "Definition of done" below).
  - `blocked` — deliberately paused, not because of an unmet dependency, but because it's been deprioritized or is
    waiting on an external decision. A `blocked` task is not next in line even if its dependencies are closed.

The state lives **only** in the filename — there's no state field inside the file. Changing state means renaming
the file, e.g. `07-project-list-get-commands-open.md` → `07-project-list-get-commands-in-progress.md` →
`...-closed.md`.

## File structure

Every task file follows the same shape:

```markdown
# {number} — {short title}

**Depends on:** {task numbers this needs to be closed first, or "none"}

## Summary

One or two sentences: what this task is and why it exists.

## Scope

Bullet points of what to actually build. Concrete enough that no two people would implement it differently —
exact command signatures, exact endpoints/fields where relevant, explicit call-outs of what's *not* in scope.

## Acceptance criteria

What "closed" requires. For this repo that always includes tests (unit + functional, per `project.md`'s testing
strategy) — a task isn't closed on working code alone.
```

## Reading the queue

To find what to work on next: list the directory sorted by number, and take the lowest-numbered `open` file whose
every `Depends on` task is `closed`. Skip `blocked` files — they're intentionally not next, regardless of number.

`ls agent_data/tasks/` sorts correctly by filename since numbers are zero-padded.

## Creating a new task

1. Pick the next unused number (highest existing number + 1 — don't fill gaps left by dropped tasks).
2. Write the file following the structure above. Ground the scope in the actual code — read the relevant
   `testgator_server` entity/endpoint (fields, filters, security) rather than guessing, the same way every prior
   task's scope was written against the real `ApiResource`/`ApiFilter` annotations, not assumptions.
3. Name it `{number}-{title}-open.md`.

## Working a task (definition of done)

1. Rename `-open` → `-in-progress` before starting.
2. Implement the scope.
3. Verify, every time, before closing — this is non-negotiable per `project.md`'s testing strategy:
   - `npm run build`
   - `npm test` (unit)
   - `npm run test:functional`
   - `npx eslint "{src,test}/**/*.ts"` — clean, or `--fix` and re-verify after
4. Rename `-in-progress` → `-closed` only once all four pass.
5. Hand back a short summary of what was built and what was verified, then stop — don't start the next task
   automatically. Wait for explicit confirmation to continue. (This has been the standing workflow for this repo:
   one task at a time, turned over for review before moving on.)

If a task turns out to need a design decision beyond its written scope (e.g. a field that isn't actually filterable
server-side, a library choice), make the call, document the reasoning in code comments and/or the task file itself,
and flag it in the handback summary — don't silently stop and wait for input on something resolvable by reading the
actual server code.

## Relationship to the Cowork task list widget

Cowork's own `TaskCreate`/`TaskUpdate` tool tracks the same work for the in-chat progress widget, but it's a
secondary display, not the source of truth — its status vocabulary (`pending` / `in_progress` / `completed`) is
narrower than this queue's (no `blocked`), and it doesn't persist in the repo. These files are what a fresh agent
(or a human) picking up this repo cold should read first; the widget is just a convenience mirror for the current
session.
