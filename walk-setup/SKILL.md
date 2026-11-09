---
name: walk-setup
description: >-
  Prepares a project for the `walk` skill and writes its `.hlstack/` folder: the walk settings
  (hosts, accounts, devices, check commands), the stack and its versions, the codebase's
  conventions as glob-indexed rules, the product's behaviour requirements read out of the
  code — every rule and requirement confirmed or rejected by the user in batches — and a
  screen-map skeleton from the routes. Any stack: it detects what the project uses and derives
  its checklist from the code, nothing is hard-coded per framework. Use when asked to "walk-setup", "set up walk", "prepare this project for walking",
  "infer the rules / conventions / requirements" of a project, or when `/walk` finds
  no `.hlstack/walk.md`. Not for setting up printers, environments or anything outside hlstack.
---

# walk-setup

Produces `.hlstack/` in the project, then **stops**. It never tests and never fixes; the
user reviews what it wrote, then runs `/walk`. Re-running it is safe: it compares with what
exists and only proposes what is new or changed.

```
.hlstack/
  walk.md            settings for the walk skill          (templates/project.md in `walk`)
  rules/             conventions, index.md maps globs → area files
    index.md  stack.md  <area>.md …
  docs/checklist.md      the detected stack and the dimensions swept (re-runs start here)
  docs/requirements.md   behaviour rules, one line each, status ✓ / ✗ / ?
  docs/flows/            optional behaviour notes per surface
  atlas/screens.md       screen-map skeleton               (templates/screens.md in `walk`)
  atlas/sync-matrix.md    optional: what reaches where between surfaces
```

Everything the user must look at is asked with AskUserQuestion in batches of at most ten,
phrased as "which of these are NOT right?" (multi-select), so confirming is one click per
batch and only the wrong ones take effort.

## 1. Detect

- **Apps in the repo**, not just at the root: find every manifest down to about three
  levels (`composer.json`, `package.json`, `pubspec.yaml`, `pom.xml`, `build.gradle*`,
  `go.mod`, `Cargo.toml`, …), skipping `vendor/`, `node_modules/`, build output. Each hit is an
  **app** with a path: `.` (the server), `mobile/`, `web/`… Everything written to
  `.hlstack/` is keyed by that path: checks run from it, rule globs carry it as a prefix
  (`mobile/lib/**`), screen-map code cells include it, the checklist has one stack section per
  app. A sibling repo the user names (not inside this one) is listed the same way with its
  absolute path.
- **Stacks and versions** per app from its manifest and lockfile.
- **Existing project memory:** `CLAUDE.md`/`AGENTS.md`, `.ai/rules/`, `docs/`, ADRs. Decisions
  already written there are imported as confirmed, not re-asked.
- **Tools on this machine:** Chrome, Node ≥ 22 (built-in WebSocket), `adb` and emulators
  when a mobile app is involved, the project's own toolchain (a pinned SDK version, a wrapper script).
- **Debug tooling per app** — what `walk` should use to read logs, the last error, the database,
  runtime errors, and to reload the app, instead of guessing from a screenshot:
  1. MCP servers the project ships: `.mcp.json`, `.claude/settings*.json` (`mcpServers`), and
     plugins the session lists; match each to an app by stack (a framework's own MCP ↔ that
     app; a mobile toolkit's MCP ↔ the mobile app).
  2. MCP tools visible in this session (names `mcp__<server>__<tool>`): list those whose name
     says logs / errors / query / reload / inspect, and note any connection step they need
     (e.g. a debug-daemon URI printed by the dev process).
  3. Fallbacks from the code: log file paths in the framework config, the dev server's output,
     `adb logcat` tags, a reload signal.
  4. Whatever is still missing is asked of the user ("how do you read this app's logs?").
  Written to `walk.md` → **Debug tools**, one row per purpose per app, tool first, fallback second.

## 2. Settings → `walk.md`

Fill `templates/project.md` from what was detected — the "Apps in this repo" table first (path,
stack, how to run its checks, how its dev process is reloaded) — then ask the user for what
cannot be read from code: hosts, test accounts, devices and how the app process is hot-reloaded, the login
that creates a fresh tenant. Propose the check commands found in `composer.json` scripts,
`package.json` scripts, CI config and `Makefile`; the user confirms or edits.
`rules/` is always hlstack's own folder. If the project already keeps rules elsewhere (for example
`.ai/rules` written by an MCP `record-rule`), leave that set alone, list it in `walk.md` as
"also read", and import nothing from it silently — a rule found there and confirmed again may be
recorded here too, so the two sets can be compared later.

## 3. Stack → `rules/stack.md` (glob `**`)

Facts, not guesses: framework and major versions that change how code is written; the chosen
library for each job as "use X, not Y"; the toolchain for the checks; what is deliberately
absent (no browser-test package, no ORM, …). One line each. Confirm in one batch. Add the
one-line stack summary to the top of `CLAUDE.md` if it is not there.

## 4. Conventions → `rules/<area>.md`

Nothing here is specific to a framework; the checklist is built from what the project uses.

1. **Build the project's checklist** `docs/checklist.md`:
   - start from `dimensions.md` (next to this file: the stack-agnostic questions);
   - for each framework and major library detected in §1 (web framework, ORM, UI kit, state
     library, test runner, mobile toolkit…), add the dimensions that matter for it: how it
     routes, fetches data, validates, persists, authorizes, renders forms and errors, tests,
     builds. Derive them from the library's role and from what the code actually does (an
     Explore agent per library, "medium" breadth), not from a memorised list;
   - if a skill or tool that infers conventions for that stack is installed in the session, hand
     those dimensions to it and keep the rest here;
   - write the list with the detected stack and versions at the top. A re-run starts from this
     file and only adds dimensions for things that are new.
2. **Sweep.** For each dimension: sample the code, state the dominant pattern **with counts**
   ("38 Form Requests, 4 inline validations"), flag conflicts instead of picking silently.
3. **Open-ended pass:** helpers everyone uses, naming, folder layout, traps already fixed once
   (tests named for regressions; comments that say "never" or "always").
4. **Confirm** in batches per area; the user also says which side of each conflict wins.
5. **Write** area files in the shared format: a short `##` heading per rule, a few lines, the
   "why" included; `index.md` maps globs → files. Write them yourself, never through another
   tool's rule writer: hlstack's set stays its own.
6. If `CLAUDE.md` lacks the "read the matching rules before editing" paragraph, add it,
   pointing at `.hlstack/rules/index.md` (and keep any existing pointer to another rules set).

## 5. Requirements → `requirements.md`

What the product should DO, read out of services, validation, policies, state machines,
tests and existing docs. Only decision-worthy behaviour: where two sensible products would
differ (money and rounding, who may do what, what reaches the other side, what cancel/undo
does, limits, defaults). Not "Save saves".

Format, grouped by area, one line each:

```
| # | Rule | Status | Source | Note |
| R12 | Every tender except store credit rounds the bill to 5 sen | ✓ | PaymentService::closingRounding | |
| R13 | An owner cannot approve their own purchase order | ? | PurchaseOrderPolicy | walk 2026-11-09: owner blocked, no hint why |
```

`✓` confirmed · `✗` rejected (the user's expected behaviour goes in Note; `walk` treats the
current behaviour as a DEFECT) · `?` open. Rules imported from `CLAUDE.md`/`.ai/rules` start
as `✓`; everything else is asked in batches. Scope to the areas the user plans to walk; more
areas can be added on a re-run.

## 6. Screen map skeleton → `screens.md`

One row per screen from the code, per app — whatever lists routes or screens in that stack (a
route-list command, a routes folder, the router file) — run from each app's path, and write code
cells with the app prefix (`mobile/lib/ui/...`). Fill URL and code cells (page + controller,
or route file, or widget file), leave Screenshot and Walked empty. Pick the column set in
`templates/screens.md` that fits the stack. Group by surface (admin, app, public, mobile).

## 7. Keep `.hlstack/` current while coding

Nothing updates `.hlstack/` on its own; two things make ordinary coding sessions do it:

- **A standing rule in `CLAUDE.md`** (add it next to the stack line if missing): a change that
  alters behaviour a `✓` requirement, a flow note or a sync-matrix row describes, or that
  moves/renames code a screen-map row names, updates that line in the SAME change.
- **A reminder hook.** Copy `walk/hooks/cited.sh` (next to the `walk` skill) to
  `.hlstack/hooks/cited.sh`, then — after asking the user, since it edits their settings — add
  to the project's `.claude/settings.json`:
  ```json
  "hooks": {"PostToolUse": [{"matcher": "Edit|Write|MultiEdit",
            "hooks": [{"type": "command", "command": "sh .hlstack/hooks/cited.sh"}]}]}
  ```
  On every edit it greps `.hlstack/docs` and `.hlstack/atlas` for the edited file's path, page
  name or class stem and hands Claude the citing lines as context. It never blocks or loops.
  Merge into existing hooks; never replace them.

## 8. Stop and report

List what was written, how many rules and requirements are ✓ / ✗ / ?, whether the hook was
installed, and remind the user to review `.hlstack/walk.md` (accounts especially) and then run
`/walk`. Nothing is committed.
