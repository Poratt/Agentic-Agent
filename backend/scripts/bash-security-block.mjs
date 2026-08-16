#!/usr/bin/env node
// bash-security-block.mjs — block rm -rf and protected-path writes.
// Reads JSON from stdin (harness: {tool_input:{command:"..."}}).
// Emits decision to stdout, reason to stderr. Exit 0=ALLOW, 1=BLOCK.
//
// Verb matching: exact (rm, mv) OR basename(/bin/rm) === "rm".
// Strips leading: FOO=bar env-assignments AND standalone "command"/"env" tokens.

import { readFileSync } from 'node:fs';

let raw = '';
try { raw = readFileSync(0, 'utf8'); } catch { raw = ''; }

let cmd = '';
try {
  const obj = JSON.parse(raw || '{}');
  cmd = (obj?.tool_input?.command ?? obj?.command ?? '').toString();
} catch {
  cmd = raw.trim();
}

if (!cmd) process.exit(0);

// Split on ; | & outside quotes. && / || collapse to single separator.
const SPLIT_RE = /[;|&]/;
function splitCommands(s) {
  const out = [];
  let buf = '';
  let quote = null;
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

// Strip leading env=value prefixes AND standalone "command" / "env" wrappers.
const ENV_PREFIX = /^([A-Za-z_][A-Za-z0-9_]*=[^ \t'"`]+[ \t]+)+/;
const WRAPPER_TOKENS = new Set(['command', 'env', 'builtin', 'time', 'nice', 'nohup', 'sudo', 'xargs']);

function stripWrappers(s) {
  // Repeatedly peel off leading env=val... , standalone wrapper words, or short flag-only tokens
  // (e.g., `command -p rm ...` → `rm ...`).
  for (;;) {
    const before = s;
    s = s.replace(ENV_PREFIX, '');
    s = s.replace(/^[ \t]+/, '');
    // Match a wrapper word followed by whitespace
    const m = s.match(/^([A-Za-z_][A-Za-z0-9_.+-]*)([ \t]+)(.*)$/s);
    if (m && WRAPPER_TOKENS.has(m[1])) {
      s = m[3];
      continue;
    }
    // Match a single short-flag token (e.g., `-p`) by itself followed by whitespace
    // This handles `command -p rm ...` → `-p rm ...` → consume `-p` → `rm ...`.
    const fm = s.match(/^(-[A-Za-z]+)([ \t]+)(.*)$/s);
    if (fm) {
      s = fm[3];
      continue;
    }
    if (s === before) break;
  }
  return s;
}

function basename(p) {
  // Handle both POSIX and Windows path separators.
  const m = p.match(/[^\\\/]+$/);
  let base = m ? m[0] : p;
  // Strip Windows executable suffixes for verb comparison.
  base = base.replace(/\.(exe|bat|cmd|com)$/i, '');
  return base;
}

function classifySegment(seg) {
  let s = stripWrappers(seg.trim());
  if (!s) return { verb: null, tokens: [] };

  // Extract first token.
  const m = s.match(/^[\s()]*([^\s'"()]+)(.*)$/s);
  if (!m) return { verb: null, tokens: [] };
  const first = m[1];
  let rest = m[2] || '';

  // Tokenize rest.
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

  return { verb: first, tokens };
}

const FS_MUTATING = new Set(['rm', 'mv', 'cp', 'rmdir', 'chmod', 'chown', 'rsync']);
// Destructive for path-guard only: includes Windows/PowerShell verbs.
const PATH_MUTATING = new Set([
  'rm', 'mv', 'cp', 'rmdir', 'chmod', 'chown', 'rsync',
  'Remove-Item', 'del', 'erase', 'ri', 'rd',
]);

function isProtectedArg(tok) {
  const clean = tok.replace(/^["']|["']$/g, '');
  // Match .git, .env, backend, frontend as path components
  return /(^|[\\\/])(\.git|\.env)([\\\/]|$)|(^|[\\\/])(backend|frontend)([\\\/]|$)/.test(clean);
}

function hasRecursiveFlag(tokens) {
  for (const tok of tokens) {
    if (tok === '--recursive' || tok.startsWith('--recursive=')) return true;
    if (/^--[A-Za-z]/.test(tok)) continue;
    if (tok.startsWith('-') && !tok.startsWith('--')) {
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

let decision = 'ALLOW';
let reason = '';

for (const seg of splitCommands(cmd)) {
  const { verb, tokens } = classifySegment(seg);
  if (!verb) continue;
  // Skip "git rm" — operates on index, not filesystem.
  if (verb === 'rm' && seg.match(/(^|[[:space:]])git[[:space:]]+rm([[:space:]]|$)/)) continue;

  const base = basename(verb);

  // Path guard applies to any path-mutating verb
  if (PATH_MUTATING.has(base) && hasProtectedTarget(tokens)) {
    decision = 'BLOCK';
    reason = `protected path target in ${base}`;
    break;
  }

  // Recursive flag guard
  if (FS_MUTATING.has(base) && hasRecursiveFlag(tokens)) {
    decision = 'BLOCK';
    reason = `recursive flag on ${base}`;
    break;
  }
}

if (decision === 'BLOCK') {
  process.stderr.write(`[bash-security-block] ${reason}\n`);
  console.log('SECURITY BLOCK');
  process.exit(1);
}
process.exit(0);
