#!/bin/sh
# hlstack drift reminder — a Claude Code PostToolUse hook for Edit|Write|MultiEdit.
# When the edited file is cited anywhere in .hlstack/ (requirements Source cells, screen-map
# code cells, flow notes, sync matrix), it hands Claude a note listing those lines, so a change
# that alters behaviour updates .hlstack in the same change. Never blocks, never loops.
# Installed by /walk-setup as .hlstack/hooks/cited.sh with this settings.json entry:
#   "hooks": {"PostToolUse": [{"matcher": "Edit|Write|MultiEdit",
#             "hooks": [{"type": "command", "command": "sh .hlstack/hooks/cited.sh"}]}]}
input=$(cat)
file=$(printf '%s' "$input" | python3 -c 'import sys,json
try: print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))
except Exception: print("")' 2>/dev/null)
[ -n "$file" ] || exit 0
root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
[ -d "$root/.hlstack" ] || exit 0
case "$file" in "$root/.hlstack/"*) exit 0 ;; esac   # editing .hlstack itself: nothing to say

rel=${file#"$root"/}
noext=${rel%.*}
stem=$(basename "$noext")

# Tokens the .hlstack files might cite: the extension-less path, its shorter suffixes with at
# least two segments (a page name like admin/plans/edit), and a specific-enough bare stem.
set -- -F -e "$noext"
p=$noext
while [ "${p#*/}" != "$p" ]; do
  p=${p#*/}
  case "$p" in */*) set -- "$@" -e "$p" ;; esac
done
[ ${#stem} -ge 8 ] && set -- "$@" -e "$stem"

hits=$(grep -rn "$@" "$root/.hlstack/docs" "$root/.hlstack/atlas" 2>/dev/null | grep -v '/bugs/' | sed "s#^$root/##" | head -8)
[ -n "$hits" ] || exit 0

msg=$(printf 'hlstack: %s is cited in .hlstack. If this change alters what the screen does or where its code lives, update these lines in the same change (requirements status/note, screen map cells, flow notes):\n%s' "$rel" "$hits")
python3 -c 'import json,sys
print(json.dumps({"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":sys.argv[1]}}))' "$msg"
exit 0
