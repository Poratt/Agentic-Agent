#!/bin/bash
# Test suite for bash-security-block. Validates BOTH:
# 1. The .mjs classifier (slow-path) — 86+ cases
# 2. The .sh hook wrapper (fast-path + fail-closed on missing script)
#
# Run from anywhere: bash test-hook-suite.sh

set -u

# Use global script path (NEW location, post-migration)
HOOK_MJS="C:/Users/porat/.claude/scripts/bash-security-block.mjs"
HOOK_SH_CLAUDE="C:/Users/porat/.claude/hooks/bash-security-block.sh"
HOOK_SH_ZCODE="C:/Users/porat/.zcode/hooks/bash-security-block.sh"

PASS=0; FAIL=0
check_mjs() {
  local name="$1" want="$2" input="$3"
  local out
  out=$(printf '%s' "$input" | node "$HOOK_MJS" 2>/tmp/hook_stderr)
  local rc=$?
  local got
  if [[ $rc -eq 1 ]]; then got=BLOCK; else got=ALLOW; fi
  if [[ "$got" == "$want" ]]; then
    PASS=$((PASS+1)); printf '  PASS  %s\n' "$name"
  else
    FAIL=$((FAIL+1)); printf '  FAIL  %s want=%s got=%s stderr=%s\n' "$name" "$want" "$got" "$(cat /tmp/hook_stderr)"
  fi
}

echo "=== .mjs classifier: 12 original cases ==="
check_mjs "01 rm -rf /tmp/important -> BLOCK"          BLOCK 'rm -rf /tmp/important'
check_mjs "02 ls -la -> ALLOW"                          ALLOW 'ls -la'
check_mjs "03 empty -> ALLOW"                           ALLOW ''
check_mjs "04 rm .git/config -> BLOCK"                  BLOCK 'rm .git/config'
check_mjs "05 rm -rf frontend -> BLOCK"                 BLOCK 'rm -rf frontend'
check_mjs "06 rm -f frontend -> BLOCK (stricter)"       BLOCK 'rm -f frontend'
check_mjs "07 rm -r .git -> BLOCK"                      BLOCK 'rm -r .git'
check_mjs "08 rm -r .env -> BLOCK"                      BLOCK 'rm -r .env'
check_mjs "09 rm -rf .git -> BLOCK"                     BLOCK 'rm -rf .git'
check_mjs "10 rm -f .env -> BLOCK"                      BLOCK 'rm -f .env'
check_mjs "11 rm backend/foo -> BLOCK"                  BLOCK 'rm backend/foo'
check_mjs "12 rm -fr foo -> BLOCK"                      BLOCK 'rm -fr foo'

echo ""
echo "=== recursive flags ==="
check_mjs "13 rm -rf foo -> BLOCK"                      BLOCK 'rm -rf foo'
check_mjs "14 rm -fr foo -> BLOCK"                      BLOCK 'rm -fr foo'
check_mjs "15 rm -Rf foo -> BLOCK"                      BLOCK 'rm -Rf foo'
check_mjs "16 rm -fRr foo -> BLOCK"                     BLOCK 'rm -fRr foo'
check_mjs "17 rm -r foo -> BLOCK"                       BLOCK 'rm -r foo'
check_mjs "18 rm -R foo -> BLOCK"                       BLOCK 'rm -R foo'
check_mjs "19 rm -ri foo -> BLOCK"                      BLOCK 'rm -ri foo'
check_mjs "20 rm -rfi foo -> BLOCK"                     BLOCK 'rm -rfi foo'
check_mjs "21 rm -fir foo -> BLOCK"                     BLOCK 'rm -fir foo'
check_mjs "22 rm -fi -r foo -> BLOCK"                   BLOCK 'rm -fi -r foo'
check_mjs "23 rm --recursive foo -> BLOCK"              BLOCK 'rm --recursive foo'
check_mjs "24 rm --recursive --force foo -> BLOCK"      BLOCK 'rm --recursive --force foo'
check_mjs "25 rm --force --recursive foo -> BLOCK"      BLOCK 'rm --force --recursive foo'
check_mjs "26 rm -rfv foo -> BLOCK"                     BLOCK 'rm -rfv foo'
check_mjs "27 rm -rfi -- foo -> BLOCK"                  BLOCK 'rm -rfi -- foo'
check_mjs "28 rm -rf -> BLOCK"                          BLOCK 'rm -rf'
check_mjs "29 rm --recursive -> BLOCK"                  BLOCK 'rm --recursive'
check_mjs "30 rm -fR foo -> BLOCK"                      BLOCK 'rm -fR foo'
check_mjs "31 rm -frv foo -> BLOCK"                     BLOCK 'rm -frv foo'
check_mjs "32 rm -R -f foo -> BLOCK"                    BLOCK 'rm -R -f foo'
check_mjs "33 rm -rfi --no-preserve-root / -> BLOCK"    BLOCK 'rm -rfi --no-preserve-root /'
check_mjs "34 rm --recursive=foo bar -> BLOCK"          BLOCK 'rm --recursive=foo bar'
check_mjs "35 rm --recursive=force foo -> BLOCK"        BLOCK 'rm --recursive=force foo'

echo ""
echo "=== must ALLOW ==="
check_mjs "36 rm -f foo -> ALLOW"                       ALLOW 'rm -f foo'
check_mjs "37 rm -i foo -> ALLOW"                       ALLOW 'rm -i foo'
check_mjs "38 rm foo -> ALLOW"                          ALLOW 'rm foo'
check_mjs "39 rm --force foo -> ALLOW"                  ALLOW 'rm --force foo'
check_mjs "40 remove -rf foo -> ALLOW"                  ALLOW 'remove -rf foo'
check_mjs "41 ls -la -> ALLOW"                          ALLOW 'ls -la'
check_mjs "42 echo rm -rf -> ALLOW"                     ALLOW 'echo rm -rf'
check_mjs "43 git rm -rf foo -> ALLOW"                  ALLOW 'git rm -rf foo'
check_mjs "44 npm rm foo -> ALLOW"                      ALLOW 'npm rm foo'
check_mjs "45 yarn remove foo -> ALLOW"                 ALLOW 'yarn remove foo'
check_mjs "46 rm -- foo -> ALLOW"                       ALLOW 'rm -- foo'
check_mjs "47 rm -i -f foo -> ALLOW"                    ALLOW 'rm -i -f foo'
check_mjs "48 rm somefile.txt -> ALLOW"                 ALLOW 'rm somefile.txt'
check_mjs "49 ls -la | grep foo -> ALLOW"               ALLOW 'ls -la | grep foo'
check_mjs "50 chmod 777 / -> ALLOW"                     ALLOW 'chmod 777 /'
check_mjs "51 echo hi -> ALLOW"                         ALLOW 'echo hi'

echo ""
echo "=== env prefix + chained ==="
check_mjs "52 FOO=bar rm -rf foo -> BLOCK"              BLOCK 'FOO=bar rm -rf foo'
check_mjs "53 FOO=1 BAR=2 rm -rf x -> BLOCK"            BLOCK 'FOO=1 BAR=2 rm -rf x'
check_mjs "54 echo hi && rm -rf foo -> BLOCK"           BLOCK 'echo hi && rm -rf foo'
check_mjs "55 echo hi; rm -rf foo -> BLOCK"             BLOCK 'echo hi; rm -rf foo'
check_mjs "56 cd /tmp && rm -r -f x -> BLOCK"           BLOCK 'cd /tmp && rm -r -f x'

echo ""
echo "=== other destructive verbs ==="
check_mjs "57 cp -r backend /tmp -> BLOCK"              BLOCK 'cp -r backend /tmp'
check_mjs "58 cp -r foo bar -> BLOCK"                   BLOCK 'cp -r foo bar'
check_mjs "59 rmdir .git -> BLOCK"                      BLOCK 'rmdir .git'
check_mjs "60 chmod -R 777 / -> BLOCK"                  BLOCK 'chmod -R 777 /'
check_mjs "61 rsync -r src dst -> BLOCK"                BLOCK 'rsync -r src dst'
check_mjs "62 mv -rf src dst -> BLOCK"                  BLOCK 'mv -rf src dst'
check_mjs "63 Remove-Item .git -> BLOCK"                BLOCK 'Remove-Item .git'
check_mjs "64 mv .env old.env -> BLOCK"                 BLOCK 'mv .env old.env'
check_mjs "65 rm foo/.git/x -> BLOCK"                   BLOCK 'rm foo/.git/x'
check_mjs "66 rm build/frontend -> BLOCK"               BLOCK 'rm build/frontend'
check_mjs "67 rm frontend -> BLOCK"                     BLOCK 'rm frontend'

echo ""
echo "=== quotes / escapes ==="
check_mjs "68 rm -rf 'foo bar' -> BLOCK"                BLOCK "rm -rf 'foo bar'"
check_mjs "69 echo 'rm -rf foo' -> ALLOW"               ALLOW "echo 'rm -rf foo'"
check_mjs "70 echo \"rm -rf foo\" -> ALLOW"             ALLOW 'echo "rm -rf foo"'
check_mjs "71 rm \"-rf\" foo -> ALLOW"                  ALLOW 'rm "-rf" foo'
check_mjs "72 rm foo \"-rfi\" -> ALLOW"                 ALLOW 'rm foo "-rfi"'

echo ""
echo "=== absolute path / builtin wrappers ==="
check_mjs "73 /bin/rm -rf foo -> BLOCK"                 BLOCK '/bin/rm -rf foo'
check_mjs "74 /usr/bin/rm -r foo -> BLOCK"              BLOCK '/usr/bin/rm -r foo'
check_mjs "75 C:/Windows/System32/rm.exe -rf foo -> BLOCK" BLOCK 'C:/Windows/System32/rm.exe -rf foo'
check_mjs "76 command rm -rf foo -> BLOCK"              BLOCK 'command rm -rf foo'
check_mjs "77 env rm -rf foo -> BLOCK"                  BLOCK 'env rm -rf foo'
check_mjs "78 command -p rm -rf foo -> BLOCK"           BLOCK 'command -p rm -rf foo'
check_mjs "79 sudo rm -rf foo -> BLOCK"                 BLOCK 'sudo rm -rf foo'
check_mjs "80 nice rm -rf foo -> BLOCK"                 BLOCK 'nice rm -rf foo'
check_mjs "81 /bin/mv -rf src dst -> BLOCK"             BLOCK '/bin/mv -rf src dst'
check_mjs "82 FOO=bar command rm -rf foo -> BLOCK"      BLOCK 'FOO=bar command rm -rf foo'
check_mjs "83 command sudo rm -rf foo -> BLOCK"         BLOCK 'command sudo rm -rf foo'
check_mjs "84 sudo ls -la -> ALLOW"                     ALLOW 'sudo ls -la'
check_mjs "85 command ls -> ALLOW"                      ALLOW 'command ls'
check_mjs "86 env FOO=bar ls -> ALLOW"                  ALLOW 'env FOO=bar ls'

echo ""
echo "=== HOOK SHELL WRAPPERS (fast-path + fail-closed) ==="
echo "    NOTE: tests 90, 92 require the NEW Claude hook content (fail-closed)."
echo "    Old on-disk version is fail-open; pending manual save from chat."
echo ""

# 87: fast-path allow for benign command via Claude hook
out=$(printf '%s' '{"tool_input":{"command":"ls -la"}}' | bash "$HOOK_SH_CLAUDE" 2>/tmp/hook_stderr)
rc=$?
if [[ $rc -eq 0 ]]; then PASS=$((PASS+1)); echo "  PASS  87 Claude hook: ls -la -> ALLOW (fast-path)"; else FAIL=$((FAIL+1)); echo "  FAIL  87 Claude hook: ls -la want=ALLOW got=BLOCK stderr=$(cat /tmp/hook_stderr)"; fi

# 88: fast-path allow for benign command via ZCode hook (workspace guard requires ZCODE_PROJECT_DIR)
out=$(ZCODE_PROJECT_DIR="C:/Porat/Practice/ai/agentic-admin" printf '%s' '{"tool_input":{"command":"ls -la"}}' | ZCODE_PROJECT_DIR="C:/Porat/Practice/ai/agentic-admin" bash "$HOOK_SH_ZCODE" 2>/tmp/hook_stderr)
rc=$?
if [[ $rc -eq 0 ]]; then PASS=$((PASS+1)); echo "  PASS  88 ZCode hook: ls -la in agentic-admin -> ALLOW"; else FAIL=$((FAIL+1)); echo "  FAIL  88 ZCode hook: ls -la want=ALLOW got=BLOCK stderr=$(cat /tmp/hook_stderr)"; fi

# 89: ZCode hook: outside agentic-admin workspace -> silent exit 0
out=$(printf '%s' '{"tool_input":{"command":"rm -rf foo"}}' | bash "$HOOK_SH_ZCODE" 2>/tmp/hook_stderr)
rc=$?
if [[ $rc -eq 0 ]]; then PASS=$((PASS+1)); echo "  PASS  89 ZCode hook: rm -rf outside agentic-admin -> ALLOW (workspace guard)"; else FAIL=$((FAIL+1)); echo "  FAIL  89 ZCode hook outside workspace want=ALLOW got=BLOCK"; fi

# 90: Claude hook: rm -rf → must go to slow-path → BLOCK via .mjs
out=$(printf '%s' '{"tool_input":{"command":"rm -rf /tmp/test"}}' | bash "$HOOK_SH_CLAUDE" 2>/tmp/hook_stderr)
rc=$?
if [[ $rc -eq 1 ]]; then PASS=$((PASS+1)); echo "  PASS  90 Claude hook: rm -rf /tmp/test -> BLOCK (slow-path)"; else FAIL=$((FAIL+1)); echo "  FAIL  90 Claude hook: rm -rf want=BLOCK got=ALLOW stderr=$(cat /tmp/hook_stderr)"; fi

# 91: ZCode hook (in agentic-admin): rm -rf → BLOCK
out=$(ZCODE_PROJECT_DIR="C:/Porat/Practice/ai/agentic-admin" printf '%s' '{"tool_input":{"command":"rm -rf /tmp/test"}}' | ZCODE_PROJECT_DIR="C:/Porat/Practice/ai/agentic-admin" bash "$HOOK_SH_ZCODE" 2>/tmp/hook_stderr)
rc=$?
if [[ $rc -eq 1 ]]; then PASS=$((PASS+1)); echo "  PASS  91 ZCode hook: rm -rf in agentic-admin -> BLOCK"; else FAIL=$((FAIL+1)); echo "  FAIL  91 ZCode hook: rm -rf want=BLOCK got=ALLOW stderr=$(cat /tmp/hook_stderr)"; fi

# 92 (CRITICAL): FAIL-CLOSED test — script missing from global path → BLOCK on rm
# Temporarily rename the .mjs to simulate missing.
mv "$HOOK_MJS" "${HOOK_MJS}.bak"
out=$(printf '%s' '{"tool_input":{"command":"rm -rf /tmp/test"}}' | bash "$HOOK_SH_CLAUDE" 2>/tmp/hook_stderr)
rc=$?
err_msg=$(cat /tmp/hook_stderr)
mv "${HOOK_MJS}.bak" "$HOOK_MJS"
if [[ $rc -eq 1 ]] && echo "$err_msg" | grep -q "missing"; then
  PASS=$((PASS+1)); echo "  PASS  92 Claude hook: script missing -> BLOCK (fail-closed)"
else
  FAIL=$((FAIL+1)); echo "  FAIL  92 Claude hook: missing-script want=BLOCK got=rc=$rc stderr=$err_msg"
fi

echo "---"
echo "pass=$PASS fail=$FAIL"
