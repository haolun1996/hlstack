# Dimensions — the stack-agnostic seed

These questions apply to any codebase. `walk-setup` extends them with the dimensions of the
stack it DETECTS in the project (§4 of SKILL.md) and writes the combined list to the project's
`.hlstack/docs/checklist.md`. For each dimension: dominant pattern + counts, conflicts flagged,
one rule line proposed.

- Folder layout: where each kind of thing lives; what a new feature touches
- Naming: files, classes, functions, database tables/columns, routes, events
- Money and quantities: type used (decimal / integer cents / float), rounding rule, currency formatting
- Dates and time: storage zone, display format, "business day" vs timestamp
- IDs exposed outside: public ids / ULIDs vs auto-increment; what a URL shows
- Errors: how a failure reaches the user (exception → response shape), logging, user-facing wording
- Validation: at the boundary (request objects / schemas) vs inline; where messages live
- Authorization: policies / middleware / guards; 404 vs 403 for things you may not see
- Multi-tenancy or scoping: how a row is tied to a tenant/branch/user; fail-open or fail-closed
- Configuration: env vs config files vs database settings; what must never be hard-coded
- Tests: framework, folder layout, naming, fixtures/factories, what must always have a test
- Localization: hard-coded strings vs translation keys; where wording lives
- Logging / audit: what is recorded, by whom
- Background work: queues, jobs, schedulers; idempotency
- Formatting and lint: the exact commands; what CI runs
- Git: branch naming, commit style, what is generated and tracked (build outputs)
- Documentation that must move with code: schema diagrams, API docs, changelogs
- Things deliberately NOT used (and why)
