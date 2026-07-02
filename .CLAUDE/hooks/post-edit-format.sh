#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null)
if [[ -n "$FILE" ]]; then
  echo "[Hook] File edited: $FILE - agent should re-read to verify."
  [[ "$FILE" == *.ts || "$FILE" == *.html ]] && npx prettier --write "$FILE"
fi
exit 0