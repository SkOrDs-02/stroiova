#!/bin/bash
# PreToolUse: content/telegrams.json генерується tools/gen_tg.py, руками не правимо.
set -uo pipefail

file=$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path",""))' 2>/dev/null)
case "$file" in
  */content/telegrams.json)
    echo "content/telegrams.json генерується: правте дані в tools/gen_tg.py і запустіть python3 tools/gen_tg.py content/telegrams.json" >&2
    exit 2 ;;
esac
exit 0
