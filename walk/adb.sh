#!/bin/zsh
# Hand-driver for an Android app on an emulator or device (hlstack `walk` skill).
#   adb.sh <serial> ui                 compact UI dump: content-desc/text + bounds (to LOCATE only)
#   adb.sh <serial> tap <x> <y>        device pixels (centre of a bounds box from `ui`)
#   adb.sh <serial> text <string>      type into the focused field (no spaces: use %s)
#   adb.sh <serial> key <code>         e.g. 4 back, 66 enter, 67 delete
#   adb.sh <serial> shot <file.png>    full-size screenshot to <file.png> (the evidence), plus a
#                                      1280-wide copy <file>.view.png in $TMPDIR to open and look at
#   adb.sh <serial> log [n]            last n (default 80) app log lines; filter from ADB_LOG_FILTER
#                                      (e.g. "flutter:V *:E", "ReactNativeJS:V *:E"; default "*:E")
set -e
ADB=${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}
S=$1; shift
a() { "$ADB" -s "$S" "$@"; }
case $1 in
  ui)
    a shell uiautomator dump /sdcard/eye-ui.xml >/dev/null
    a shell cat /sdcard/eye-ui.xml | grep -o '\(text\|content-desc\)="[^"]\+"[^>]*bounds="[^"]*"' \
      | sed -E 's/ (resource-id|class|package|checkable|checked|clickable|enabled|focusable|focused|scrollable|long-clickable|password|selected|index|hint)="[^"]*"//g'
    ;;
  tap)  a shell input tap "$2" "$3" ;;
  text) a shell input text "$2" ;;
  key)  a shell input keyevent "$2" ;;
  shot)
    mkdir -p "$(dirname "$2")"
    a exec-out screencap -p > "$2"
    view="${${TMPDIR:-/tmp}%/}/$(basename "$2" .png).view.png"
    sips -Z 1280 "$2" --out "$view" >/dev/null
    echo "saved $2 (view: $view)"
    ;;
  log)  set -o noglob; a logcat -d -t "${2:-80}" ${=ADB_LOG_FILTER:-*:E} ;;
  *)    sed -n '2,10p' "$0"; exit 1 ;;
esac
