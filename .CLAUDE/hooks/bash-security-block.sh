#!/bin/bash
INPUT=$(cat)
if echo "$INPUT" | grep -qE '(rm|mv).*(\.git|backend|frontend|\.env)'; then
  echo 'SECURITY BLOCK'
  exit 1
fi
exit 0