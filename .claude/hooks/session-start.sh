#!/bin/bash
# Готує хмарну сесію: Python-залежності для перевірки контенту, npm-пакети, коли з'явиться код.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

python3 -c "import jsonschema" 2>/dev/null || pip install --quiet jsonschema

if [ -f package.json ]; then
  npm install --no-audit --no-fund
fi
