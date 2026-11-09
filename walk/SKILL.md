---
name: walk
description: >-
  Walk a project's screens the way a person does — web app in headless Chrome, mobile app on an
  Android emulator — one action at a time, a screenshot after every step that is OPENED and
  looked at, every defect filed under .hlstack/bugs/<run>/bug-N/ with before/after screenshots and
  fixed (requirement questions are written up, not fixed), and the screen map kept current.
  Judges each screen against the project's confirmed requirements. Use when asked to "walk",
  "eye-test", "test end to end", "test like a real human", "click through every screen",
  "verify the flow by screenshot", or to re-test an area after changes. Needs `/walk-setup`
  to have been run in the project first (`.hlstack/walk.md`).
---

# Walk

Test like a person: real clicks and typing through the UI, never creating or editing data by
code. Every step: **act → wait until it settles → screenshot → open the image → verdict**.
A step never passes on page text or a UI dump alone; those only locate things and measure.

Everything project-specific (hosts, accounts, devices, check commands, pitfalls) is in the
project's **`.hlstack/walk.md`**. Read it first. If it does not exist, stop and run
`/walk-setup`; do not guess hosts or accounts.

## 0. Ask first (always)

Ask with AskUserQuestion before touching anything:

1. **Mode:** *One by one in this session (Recommended)*: cheapest, every screenshot is seen
   by the main session, slower. *Parallel*: up to 3 runners at once (§7), faster, several
   times the tokens. Never start parallel runners without a yes.
2. **Scope:** which areas or screens. Default: the flow the user described.

Then create the run folder `.hlstack/bugs/<YYYY-MM-DD>/` (add `-HHMM` if that date exists) with a
`README.md` index and `walkthrough/<area>/`, and add the run to `.hlstack/bugs/README.md`.
Bug numbers restart at 1 in each run.

## 1. Set up the drivers

**Web** (`b.mjs`, next to this file; one Chrome per runner, own port and profile):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --remote-debugging-port=9223 --user-data-dir=<scratchpad>/chrome-9223 \
  --ignore-certificate-errors --password-store=basic --window-size=1440,900 about:blank   # run_in_background
D=~/.claude/skills/walk/b.mjs
CDP_PORT=9223 node $D go https://<host>/login
CDP_PORT=9223 CDP_WIDTH=390 node $D shot <file>      # phone width
```

Commands: `go, url, wait, shot <file> [full], click <text> [nth], clicksel <css> [nth],
clickjs <js>, type <css|label> <value>, key <Key>, keys [css] <chars>, select <css> <label>,
file <css> <path>, fields, text [css], eval <js>, drift`. After each command it prints
toasts, the page name and visible field errors; `walk.md` may set `CDP_TOAST_SEL`,
`CDP_ERROR_SEL`, `CDP_PAGE_JS` for the project's markup. `shot … full` captures the whole
scrolled page. Never pass `--hide-scrollbars`.

**Mobile** (`adb.sh`, one runner per device):

```bash
A=~/.claude/skills/walk/adb.sh
$A <serial> ui                  # locate: content-desc/text + bounds
$A <serial> tap <x> <y>         # centre of a bounds box
$A <serial> text <string>  |  key <code>  |  log [n]
$A <serial> shot <file.png>     # full-size evidence + a 1280-wide .view.png to open
```

Open the **`.view.png`**: it costs a fraction of the original and the original stays in
the bug folder. Never kill a dev-server or app process you did not start; reload it the way `walk.md` says.

**Accounts and sign-in** come from `walk.md`. A second user needs its own Chrome profile or
port; a GET to `/logout` signs nobody out.

## 2. The loop, every step

1. One action.
2. Settle: the driver waits for load; on mobile poll `ui` until the expected text appears.
3. Screenshot into `.hlstack/bugs/<run>/walkthrough/<area>/NN-what.png`, numbered in order.
4. **Open it with Read and look.** Verdict: PASS, or what is wrong.

**On every screen check:**
- **Requirements:** `.hlstack/docs/requirements.md`. Breaking a `✓` rule is a DEFECT. Behaviour no
  rule covers becomes a new `?` line there, with the screenshot, for the user to answer after
  the run.
- **Alignment:** `drift` on every form (controls in one row at different heights).
- **Text:** overflow, clipping, wrapping, wording, plurals ("1 items"), date format, empty states.
- **Page furniture:** breadcrumbs or titles, a confirmation after every save.
- **Both paths:** invalid or empty first (read the messages), then valid; reload and confirm
  what was saved.
- **Numbers that must agree** across screens, as listed in `walk.md` (money, stock, totals).
- **Phone width:** clipped text, buttons off screen, keyboard over inputs, snackbars over
  buttons. Walk the same flow at every size the product supports.
- **Who sees what:** sign in as a limited role and check it sees only its own data.

**When a step fails or a number is off,** read before guessing: the server log, the last error
and the database through the Debug tools in `walk.md` (tool first, fallback second). Quote the
log line in the bug note. After a fix, reload the app the way that table says.

**Work area by area.** Finish an area (screens walked, bugs written, fixes re-checked,
screen map rows updated) before starting the next. Context gets summarised on long runs; a
finished area loses nothing.

## 3. A bug

Folder `.hlstack/bugs/<run>/bug-N/`: `bug.md` (template: `templates/bug.md`), `screenshot.png`,
and for a fix `before/` and `after/` images.

**DEFECT vs REQUIREMENT.** If the fix would change what the product does and no `✓`
requirement settles it, it is a REQUIREMENT: write it up, add the `?` line, do not fix.
Everything else is a DEFECT: fix it.

**Fixing:**
- Read the project's rules for the path first (`.hlstack/rules/index.md`, or wherever
  `walk.md` says they live).
- Fix at the root: one guard in the shared function beats a patch on the screen you saw.
- Every server-side change gets a test. Prove it by reverting the change and watching the
  test fail.
- Re-walk the screen, screenshot into `after/`, open it.
- Record a durable lesson in `.hlstack/rules/<area>.md` (+ `index.md`), the same format
  `walk-setup` writes; never through another tool's rule writer.

## 4. Wrap up a run

1. **Run index** `.hlstack/bugs/<run>/README.md`: bugs with title and type.
2. **Screen map** `.hlstack/atlas/screens.md`, per area as you finish it:
   - already listed: new screenshot, Walked = this run; check the code cells still exist
   - new screen: add a row; gone from the app: delete the row
   - not walked this run: leave it; its Walked date shows how fresh it is
3. **Requirements:** every new `?` line has a screenshot path; tell the user how many wait.
   If the project keeps behaviour notes (`.hlstack/docs/flows/*.md`) or a sync matrix
   (`.hlstack/atlas/sync-matrix.md`), refresh the parts for the areas walked and date the change.
4. **Checks**, once, at the end: the commands in `walk.md`, in order, each run from its app's
   path (the "Apps in this repo" table), respecting its notes (e.g. a shared test database
   means one test run at a time).
5. **Report:** fixed / requirement questions / not fixed, check results, and the data left
   behind (records made, sessions left open, users created, settings switched on).
6. **Never commit.** If asked: one commit per bug, no co-author trailer, and whatever
   `walk.md` says must be rebuilt first.

## 5. Driver pitfalls

- **Chrome stopped reaching the page after a login:** it was offering to save the password.
  Always start with `--password-store=basic`.
- **`click` by text hit a link with the same text:** use `clicksel 'form button[type=submit]'`
  or `key Enter`.
- **Native selects:** `select <css> <option label>`. **Date inputs:** `keys <css> <digits>`.
  **Uploads:** `file <css> <path>`.
- **A field error that will not clear:** typing while the page re-rendered left a stale one;
  wait, then retype.
- **Mid-animation screenshots:** wait for the UI dump to show the expected text first.

## 6. Data hygiene

Prefer a fresh account or tenant per run. Note every record made outside normal use, close
sessions you opened, delete test uploads, restore any password you changed.

## 7. Parallel mode (only after the user said yes)

- Runners are fresh `general-purpose` agents, not forks (a fork copies the whole conversation).
- At most 3 at a time; queue the rest and start one as each finishes.
- One Chrome port and profile per web runner; at most one runner per device.
- Brief each runner with: load the `walk` skill and follow it except §0 and §4.4; its area,
  port or device, accounts; its bug-number block (e.g. 20–29) and walkthrough prefix (`C-`);
  it fixes ONLY files of its own screens and returns shared-code fixes as proposed diffs in
  `bug.md`; keep tool calls lean (several driver commands per Bash call; a runner stops at
  about 200 steps); report steps → screenshot → PASS/FAIL, bugs, screen-map rows, shared fixes
  needed, data left behind.
- When a runner finishes, the main session opens every bug screenshot it made plus about 1 in
  10 of its walkthrough shots (re-do the area if they do not match the report), makes the
  shared fixes with a test each, merges the map rows and the index, and runs §4 once at the end.
- A runner that stops at its step limit is resumed with SendMessage: "finish what is left,
  then report".
