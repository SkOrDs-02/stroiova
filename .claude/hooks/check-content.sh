#!/bin/bash
# PostToolUse: після правки content/ проганяє перевірку контенту, після правки токенів — перегенеровує тему.
# Помилка → exit 2, текст іде Claude як зворотний зв'язок.
set -uo pipefail

file=$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path",""))' 2>/dev/null)
cd "$CLAUDE_PROJECT_DIR"

case "$file" in
  */design/system/tokens.json|*/tools/gen_theme.py)
    python3 tools/gen_theme.py >/dev/null || { echo "gen_theme.py впав після правки $file" >&2; exit 2; }
    exit 0 ;;
  */content/*|*/tools/gen_tg.py|*/tools/check_content.py) ;;
  *) exit 0 ;;
esac
if ! out=$(python3 tools/check_content.py 2>&1); then
  echo "check_content.py впав після правки $file:" >&2
  echo "$out" | tail -30 >&2
  exit 2
fi
exit 0
