#!/bin/bash
INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null)
echo "[WARN] Agent is about to OVERWRITE entire file: $FILE. If this was not requested, the agent should use str_replace instead."
exit 0