# hlstack

Claude Code skills, one folder each. Install by symlinking the folders you want into
`~/.claude/skills/`:

```bash
git clone <this repo> ~/WorkSpace/hlstack
ln -s ~/WorkSpace/hlstack/walk ~/.claude/skills/walk
ln -s ~/WorkSpace/hlstack/walk-setup ~/.claude/skills/walk-setup
```

| Skill | What it does |
| --- | --- |
| [`walk-setup`](walk-setup/SKILL.md) | Prepares a project for `walk`: writes `.hlstack/` (settings, stack, conventions as glob-indexed rules, behaviour requirements read from the code and confirmed by you, a screen-map skeleton from the routes). Any stack: it detects what the project uses and derives the checklist from the code. Run it once per project, re-run when things change. |
| [`walk`](walk/SKILL.md) | Walks the screens like a person — web in headless Chrome, mobile over adb — screenshot after every step, opened and judged, bugs filed under `.hlstack/bugs/<run>/bug-N/` with before/after, defects fixed with a test, requirement questions written up. Needs `walk-setup` first. |

What a project ends up with:

```
.hlstack/
  walk.md            settings the walk skill reads (hosts, accounts, devices, checks)
  rules/             conventions; index.md maps file globs → rule files
  docs/              checklist.md (detected stack + dimensions swept), requirements.md (✓ / ✗ / ?), flows/
  atlas/             screens.md (screen → URL → code → screenshot → last walked), sync-matrix.md
  bugs/<run>/        one folder per walk: README index, walkthrough screenshots, bug-N/
```

`walk/hooks/cited.sh` is a PostToolUse hook `walk-setup` installs per project: when an edited file is
cited in `.hlstack/`, Claude is reminded to update those lines in the same change.
`walk/b.mjs` drives Chrome over CDP with no dependencies (Node's built-in WebSocket);
`walk/adb.sh` drives an Android emulator or device. Both are documented at the top of the file.
