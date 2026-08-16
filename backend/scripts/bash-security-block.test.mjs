// Tokenizer-based bash command classifier.
// Reads JSON from stdin (harness sends tool_input), extracts command, decides BLOCK/ALLOW.
// Emits the decision to stdout; harness sees exit code. Also writes reason to stderr for visibility.

import { readFileSync } from 'node:fs';

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { raw = ''; }

// Extract command from JSON, tolerate shapes: {tool_input:{command:"..."}} or {command:"..."}
let cmd = '';
try {
  const obj = JSON.parse(raw || '{}');
  cmd = (obj?.tool_input?.command ?? obj?.command ?? '').toString();
} catch {
  // Not JSON — treat the whole input as the command (fallback for ad-hoc tests)
  cmd = raw.trim();
}

if (!cmd) process.exit(0);

// Quote-aware splitter: returns segments split on ; | & that are OUTSIDE quotes.
// `&&` and `||` collapse to `&` and `|` for splitting simplicity.
const SPLIT_RE = /[;|&]/;
function splitCommands(s) {
  const out = [];
  let buf = '';
  let quote = null; // '"' | "'" | null
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (quote) {
      buf += c;
      if (c === '\\' && i + 1 < s.length) { buf += s[++i]; }
      else if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; buf += c; i++; continue; }
    if (SPLIT_RE.test(c)) {
      out.push(buf);
      buf = '';
      i++;
      // collapse && and ||: skip second char
      if ((c === '&' || c === '|') && s[i] === c) i++;
      continue;
    }
    if (c === '\\' && i + 1 < s.length) { buf += c + s[++i]; i++; continue; }
    buf += c;
    i++;
  }
  if (buf.length) out.push(buf);
  return out.map((x) => x.trim()).filter(Boolean);
}

const PROTECTED = /\.(git|env)\b|^(backend|frontend)(\/|$|\s)|[\\\/](backend|frontend)(\\|\/|$|\s)/;
// Match ".git", ".env", "backend" or "frontend" as a path component (POSIX or Windows).
// Simpler approach: substring check on the joined args for ".git" / ".env" / "backend" / "frontend".

function classifySegment(seg) {
  // Strip env=value prefixes
  let s = seg.trim();
  const ENV_PREFIX = /^([A-Za-z_][A-Za-z0-9_]*=[^ \t'"`]+[ \t]+)+/;
  s = s.replace(ENV_PREFIX, '').trim();
  if (!s) return { verb: null, rest: '' };

  // Extract first token (verb). Handle leading parens / whitespace.
  const m = s.match(/^[\s()]*([A-Za-z_][A-Za-z0-9_.+-]*)(.*)$/s);
  if (!m) return { verb: null, rest: '' };
  const verb = m[1];
  let rest = m[2] || '';

  // Tokenize rest by whitespace, respecting quotes.
  const tokens = [];
  {
    let buf = '';
    let q = null;
    for (let i = 0; i < rest.length; i++) {
      const c = rest[i];
      if (q) {
        buf += c;
        if (c === '\\' && i + 1 < rest.length) { buf += rest[++i]; }
        else if (c === q) q = null;
        continue;
      }
      if (c === '"' || c === "'") { q = c; buf += c; continue; }
      if (/\s/.test(c)) { if (buf) { tokens.push(buf); buf = ''; } continue; }
      buf += c;
    }
    if (buf) tokens.push(buf);
  }

  return { verb, tokens };
}

function isProtectedArg(tok) {
  // Strip surrounding quotes for matching
  const clean = tok.replace(/^["']|["']$/g, '');
  return /(^|[\\\/])(\.git|\.env)([\\\/]|$)|(^|[\\\/])(backend|frontend)([\\\/]|$)/.test(clean);
}

function hasRecursiveFlag(tokens) {
  for (const tok of tokens) {
    if (tok === '--recursive' || tok.startsWith('--recursive=')) return true;
    if (/^--[A-Za-z]/.test(tok)) continue; // other long flag
    if (tok.startsWith('-') && !tok.startsWith('--')) {
      // Short flag cluster: -rf, -rfi, -R, etc. Look for r or R as a flag char.
      if (/[rR]/.test(tok.slice(1))) return true;
    }
  }
  return false;
}

function hasProtectedTarget(tokens) {
  for (const tok of tokens) {
    if (isProtectedArg(tok)) return true;
  }
  return false;
}

const DESTRUCTIVE = new Set(['rm', 'mv', 'cp', 'rmdir', 'chmod', 'chown', 'rsync', 'find', 'Remove-Item', 'del']);
// Destructive rm-style: rm, mv, cp, rmdir, chmod, chown, rsync, Remove-Item, del
const FS_MUTATING = new Set(['rm', 'mv', 'cp', 'rmdir', 'chmod', 'chown', 'rsync']);

let decision = 'ALLOW';
let reason = '';

for (const seg of splitCommands(cmd)) {
  const { verb, tokens } = classifySegment(seg);
  if (!verb) continue;
  if (!DESTRUCTIVE.has(verb)) continue;

  // Path guard (applies regardless of -r) — protect .git/backend/frontend/.env
  if (hasProtectedTarget(tokens)) {
    decision = 'BLOCK';
    reason = `protected path target in ${verb}`;
    break;
  }

  // Recursive flag guard — only rm/mv/cp/rsync/chmod/chown
  if (FS_MUTATING.has(verb) && hasRecursiveFlag(tokens)) {
    decision = 'BLOCK';
    reason = `recursive flag on ${verb}`;
    break;
  }
}

if (decision === 'BLOCK') {
  process.stderr.write(`[bash-security-block] ${reason}\n`);
  console.log('SECURITY BLOCK');
  process.exit(1);
}
process.exit(0);
