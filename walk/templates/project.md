# walk settings — <project name>

Written by `/walk-setup` on <date>. Re-run `/walk-setup` when a host, account, device or
version changes. Everything the `walk` skill needs that is specific to this project.

## Apps in this repo
| App | Path | Stack | Checks run from | Dev process / reload |
| --- | --- | --- | --- | --- |
| <server / web app> | `.` | <framework + version> | `.` | <dev server with hot reload; nothing to do> |
| <mobile app> | `<sub>/` or `/abs/path` (sibling repo) | <toolkit + version> | `<sub>/` | <dev process to find; reload signal/command> |
Rule globs, screen-map code cells and bug notes carry the app path as prefix (`<sub>/lib/**`).

## Stack
<one line per app, versions from the lockfiles; details in rules/stack.md>

## Hosts
| Surface | URL | Notes |
| --- | --- | --- |
| <web app> | https://… | <auth guard, SPA/server-rendered> |
| <admin> | https://… | |
| <API> | https://… | <how the mobile app reaches it; tunnel?> |

## Accounts
| Role | Login | Notes |
| --- | --- | --- |
| <admin> | user / password | |
| <owner / tenant> | create a fresh one per run via <screen> | |
| <limited role> | user / password | sees only <scope> |

## Devices (mobile)
| Device | Serial | App process | Hot reload |
| --- | --- | --- | --- |
| <Tablet> | emulator-5554 | <how to find the dev process> (never kill) | <reload command> |
Preconditions before driving: <API reachable? sign-in? open a shift? keypad in cents?>

## Driver settings
```
CDP_TOAST_SEL=…      # selector of toasts/alerts (default covers common toast libraries + role=alert|status)
CDP_ERROR_SEL=…      # selector of visible field errors
CDP_PAGE_JS=…        # js expression giving the current page name
ADB_LOG_FILTER=…     # logcat filter, e.g. "<AppTag>:V *:E"
```

## Debug tools (prefer the tool, fall back to the command)
| App | Purpose | Tool | Fallback | Notes |
| --- | --- | --- | --- | --- |
| `.` | server log | `mcp__<server>__<read-log>` | `tail -n 200 <log path>` | |
| `.` | last error | `mcp__<server>__<last-error>` | same log | |
| `.` | database (read-only) | `mcp__<server>__<query>` | `<cli> -e "…"` | never write through it |
| `<mobile>/` | runtime errors | `mcp__<server>__<runtime-errors>` | `adb.sh <serial> log` | <connection step first?> |
| `<mobile>/` | hot reload / restart | `mcp__<server>__<hot-reload>` | `<signal or command>` | |
| `<mobile>/` | inspect widget tree | `mcp__<server>__<inspector>` | `adb.sh <serial> ui` | |

## Numbers that must agree
<e.g. app bill = receipt = back-office record = reports = shift close; rounding rule>

## Checks (run once at the end, in this order)
```bash
<formatter>
<static analysis>
<test suite>          # note: shared test DB → one run at a time?
<types> && <lint>
<mobile analyze/test> # toolchain path if not on PATH
```
Before a commit: <rebuild step, e.g. front-end build tracked in git>

## Where things go
- Conventions: `.hlstack/rules/` (index.md maps globs → files); lessons are appended there. Also read: <other rules folders the project has, e.g. .ai/rules>
- Requirements: `.hlstack/docs/requirements.md`
- Screen map: `.hlstack/atlas/screens.md` (columns: <Page | Controller> / <Route | Component> / <Widget file>)
- Bug runs: `.hlstack/bugs/<run>/`

## Known noise and pitfalls
- <log lines that are known and not bugs>
- <dark mode mechanism, logout being POST, wording coming from a language pack, …>
