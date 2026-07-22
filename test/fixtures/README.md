# Fixtures

Realistic Hydra/JSON-LD sample payloads for each of testgator_server's main resource types, shared across unit and
functional test suites so tests don't each hand-roll their own (and drift from what the API actually returns).

## Where these came from

Not guessed — each fixture's field names and shapes are sourced directly from the real API Platform resource
definitions in `testgator_server/src/Entity/*.php` (and, for the collection envelope shape, from
`testgator_server/config/reference.php`, which confirms `hydra_prefix` defaults to `false` — see
`src/hydra/hydra.service.ts`'s docblock for the full reasoning). Specifically:

- **project** — `Project.php` (`project:read` group).
- **release** — `Release.php` (`release:read` group).
- **testPlan** — `TestPlan.php` (`testPlan:read` + `timestampable:read` groups).
- **question** — `Question.php` (`question:read` group).
- **tester** — `User.php`, exposed under the `Tester` short name for `/api/testers` (`testers:read` group). Note:
  a tester's `id` is a **UUID string**, not a number — `User.php`'s `$id` is `ORM\Column(type: 'uuid')`, unlike
  every other resource here which uses a Doctrine auto-increment int. `hydra.service.spec.ts`'s
  `resolveIriId` GUID test exists specifically because of this.
- **answer** — `Answer.php`. Note: `Answer`'s `#[ApiResource]` sets no `normalizationContext` group restriction at
  all (unlike the others), so in the real API every property is serialized regardless of `#[Groups]`.

Relation fields (`release`, `plan`, `question`, `tester`, etc.) are IRI strings, matching API Platform's default
relation serialization — also confirmed by how `testgator_client` constructs and consumes IRIs throughout
(`/api/test_plans/${id}`, `sourcePlan.questionsOrder`, etc.).

## Adding a new fixture

1. Read the real entity in `testgator_server/src/Entity/` — don't guess field names.
2. Export both an `xItemFixture` (a single shaped Hydra object: `@context`/`@id`/`@type` + fields) and an
   `xCollectionFixture` (`{ @context, @id, @type, totalItems, member: [...] }`) from `<resource>.fixture.ts`.
3. Re-export both from `index.ts`.
4. If a field's exact serialization shape is genuinely unclear from the entity alone (e.g. a custom state
   processor mutates it), say so in a comment rather than guessing silently — see the `Answer` note above for the
   pattern.
