import { Command, CommandRunner, Help } from 'nest-commander';

/**
 * MAINTENANCE: `testgator-cli --help` already auto-lists every top-level
 * command group with its one-line @Command description — that part needs no
 * extra code. What this file adds is the missing "how to use this tool as a
 * whole" orientation (auth flow, output convention, worked examples), which
 * only a human/agent reading source would otherwise piece together.
 *
 * Whenever a new top-level command group is registered in AppModule (a new
 * `@Command(...)`-decorated parent, not a `@SubCommand`), add a line for it
 * below too — guide.command.spec.ts's drift-detection test fails the build
 * if a registered top-level command's name isn't mentioned here.
 */
const GUIDE_TEXT = `TestGator CLI — agent orientation

A REST client for testgator_server (Symfony/API Platform). Manage projects,
releases, test plans, questions, testers, and answers from the command line.

Auth: run \`login --username <user> --password <pass>\` once, or \`setup\`
(interactive, and also accepts --api-url/--username/--password directly —
pass all three for a fully non-interactive run, e.g. from an agent). The JWT
is cached locally — every other command reuses it automatically; no need to
log in again per invocation.

Output convention: every data command prints one line of compact JSON to
stdout on success. Errors go to stderr as \`Error: ...\` with a non-zero exit
code — safe to parse stdout unconditionally when the exit code is 0.

Command groups (run \`<command> [<subcommand>] --help\` for full flag detail):
  guide                     This command — prints this text.
  ping                      Check the configured server is reachable. Errors if not set up
                             or not logged in — the healthcheck route still requires a JWT.
  login                     Authenticate once. login -u alice -p secret
  setup                     setup --api-url <url> --username <u> --password <p> (non-interactive);
                             omit any of the three to be prompted for it instead.
  project list|get <id>     Read-only. Omits allTesters (bulky IRI list) but keeps
                             totalTesters; see tester list --project <id> for the roster.
  release list|get|create|edit
                             release list --project 1
                             release create --project 1 --name v1.4.0
                             release edit 3 --name v1.4.1
  plan list|get|create|edit|duplicate|remove-tester
                             plan create --release 5 --name "Regression" --due-date 2026-08-01T00:00:00+00:00
                             plan duplicate 12 --project 3 --release 5 --name "Copy" --due-date <date>
                             plan remove-tester <planId> <testerId...> detaches enrollment only
                             (testersEnrolled) — answers and the tester accounts are unaffected.
                             Skips the PATCH if none of the given testers are enrolled.
                             plan remove-tester 12 8f14e45f-...
  question list|get|create|edit
                             question create --plan 12 --name "Can you log in?"
  tester list|get           Read-only. tester list --project 1
  tester tag add|remove <testerId> <tag...>
                             Read-modify-write on tester.tags. tag add accepts any
                             string id — no catalog validation. tag remove skips the
                             PATCH entirely if none of the given tags are present.
                             tester tag add 8f14e45f-... vip beta
  tester note list|add <testerId> ...
                             Free-text notes (TesterAnnotation). list is newest first
                             (order[created]=desc), paginated. add rejects blank content
                             client-side. createdBy is always set server-side.
                             tester note add 8f14e45f-... "Very responsive tester"
  tester disable|enable <testerId>
                             PATCHes active. NOT ROLE_ADMIN-gated — any logged-in
                             team member can do this (User.php only requires ROLE_USER
                             on this operation). Existing answers/enrollments untouched.
                             tester disable 8f14e45f-...
  answer list|get|edit|delete
                             No \`answer create\` — answers are created by testers, not
                             this CLI. answer edit 501 --state failed --comment "..."
  tag list|create|delete    Tag catalog (TesterTag). create <id> --label <label> validates
                             <id> against [a-z0-9_-]+ client-side. delete is a SOFT delete
                             (deleted=true; testers keeping that tag id are unaffected).
                             tag create vip --label "VIP"
  webhook enable|disable|set-url <url>
                             Admin only (ROLE_ADMIN) — fails with a clear error otherwise.
  invite <email>            Create a tester account for this email if none exists yet
                             (testgator_server emails the welcome message automatically).
  invites <e1,e2,...>       Same, for a comma-separated list. Continues past individual
                             failures — check each outcome's "success" field.
  test-invite <email>       Same as invite, plus enrolls the tester on --plan <id>.
                             test-invite alice@example.com --plan 12
  test-invites <e1,e2,...>  Same, for a comma-separated list, in one PATCH.
                             test-invites alice@example.com,bob@example.com --plan 12

Notes an agent should know up front:
  - Every \`list\` command is paginated: --items-per-page <n> (default 20)
    and --page <n> (1-based, default 1). Output stays a plain JSON array —
    there's no in-band total count, so keep incrementing --page until a
    response comes back with fewer than --items-per-page items.
  - \`plan duplicate\` sets the new plan's questionsOrder; \`question create\`/
    \`plan create\`/\`plan edit\` do NOT touch any plan's questionsOrder.
  - Write commands only send the fields you pass (PATCH = merge, not replace).
  - There's no dedicated invite endpoint server-side: \`invite\`/\`test-invite\`
    just ensure a tester account exists (creating one triggers the welcome
    email automatically) and, for \`test-invite\`, enroll it on the plan.
  - \`project list\`/\`project get\` never print \`allTesters\` — it's stripped
    client-side since it's a bulky, rarely-needed IRI array. Use \`tester
    list --project <id>\` if you actually need that roster.

────────────────────────────────────────────────────────────────────────────
How TestGator fits together

  Project    Top-level container for one app/product. Releases and the pool
             of testers you can draw from both belong to a project.
  Release    A version of the project under test (e.g. "v1.4.0"). Test plans
             belong to a release, not directly to a project.
  Test plan  A named, due-dated set of questions handed to enrolled testers
             (testersEnrolled). state is draft|published|archived — testers
             only ever see plans that are published.
  Question   One thing to check within a test plan (e.g. "Can you log in?").
             A plan's questionsOrder controls the order testers see them in.
  Tester     A person doing the testing — an account with no password (OTP/
             magic-link login only). Not created directly; see "inviting
             testers" below.
  Answer     A tester's response to one question on one plan: state
             (pass|pass_with_bugs|failed|blocked|pending) plus a comment and
             optional attachments/systemInfos. Created by testers only — this
             CLI can list/get/edit (review fields)/delete, never create one.

Drilling down the hierarchy (project -> release -> test plan):
  $ testgator-cli release list --project 1     # releases in project 1
  $ testgator-cli plan list --project 1        # test plans across every release in project 1
  $ testgator-cli plan list --release 5        # test plans in release 5 only
  \`plan list\` accepts --project and --release together or separately; \`release
  list\` only filters by --project (a release always belongs to exactly one).

Paginating through a large list:
  $ testgator-cli answer list --plan 12 --items-per-page 20 --page 1
  $ testgator-cli answer list --plan 12 --items-per-page 20 --page 2
  Keep raising --page until a call returns fewer than --items-per-page items
  — that's the last page. --items-per-page defaults to 20 and --page to 1
  when omitted, so a plain \`answer list --plan 12\` is just page 1 at 20.

Setting up a release + test plan + questions (brief example):
  $ testgator-cli release create --project 1 --name v1.4.0 \\
      --description "Adds one-time-code login and a redesigned logout flow."
  $ testgator-cli plan create --release 5 --name "Login flow" \\
      --due-date 2026-08-01T00:00:00+00:00 \\
      --description "Covers OTP login and logout across web and mobile." \\
      --content "Use the staging app at https://staging.example.com. Report any bug via the comment field, even minor ones."
  $ testgator-cli question create --plan 12 \\
      --name "Can you log in with a valid one-time code?" \\
      --content "Request a code, enter it, and confirm you land on your dashboard."
  $ testgator-cli question create --plan 12 --name "Does logout return to the homepage?"
  $ testgator-cli plan edit 12 --state published
  (ids above — release 5, plan 12 — come from each create command's JSON
  output; published is what makes the plan visible to enrolled testers.)
  \`--description\` is a short summary (release, plan); \`--content\` is longer
  free-form text (plan-wide instructions, or a single question's detail) —
  both optional on every create/edit command that has them.

Inviting testers:
  $ testgator-cli test-invite alice@example.com --plan 12
  $ testgator-cli test-invites bob@example.com,carol@example.com --plan 12
  Each creates the tester's account if it doesn't exist yet (welcome email
  sent automatically) and enrolls them on plan 12. Someone already enrolled
  is left alone — this never removes an existing tester from the plan.

Getting results (brief example):
  $ testgator-cli answer list --plan 12 --state failed
  $ testgator-cli answer get 501
  Both print compact JSON — list returns every failed answer on plan 12
  (each with its question IRI, state, comment); get returns one answer's
  full detail, including systemInfos and attachment (files) metadata.
  \`answer edit 501 --ignored true\` excludes a bad/duplicate answer from
  stats without deleting it.`;

@Command({
  name: 'guide',
  description:
    'Print an agent-oriented orientation for this CLI (auth, output convention, examples). Start here.',
})
export class GuideCommand extends CommandRunner {
  run(): Promise<void> {
    console.log(GUIDE_TEXT);
    return Promise.resolve();
  }

  @Help('after')
  example(): string {
    return '\nExample:\n  $ testgator-cli guide\n';
  }
}
