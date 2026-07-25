#!/usr/bin/env node
// css-nesting-check.mjs — PreToolUse CSS nesting enforcer.
//
// Enforces the css-conventions rule:
//   "Deep nesting is mandatory — Never write flat selectors like
//    .parent .child .sub — use nesting instead."
//
// This blocks (exit 2) any CSS file whose content contains a flat
// compound selector: a selector with a combinator (descendant space,
// ">", "+", "~") AND that does NOT start with "&".
//
// Valid nested form is never flagged:
//   .parent { &.variant { ... } .child { .sub {} } }
//
// Detection scans the raw text char-by-char (NOT line-by-line), so both
// multi-line and one-liner CSS are caught:
//   .a .b { ... }            -> flagged (flat)
//   .a { .b { ... } }       -> OK (nested)
//
// Input (stdin): the PreToolUse event JSON. We read `tool_input`.
//   Write -> tool_input.content (full new content)
//   Edit  -> read tool_input.file_path from disk, apply
//            old_string -> new_string in memory (no disk write).
//
// Output: nothing on pass (exit 0). On violation: ZCode block JSON
// on stdout + exit code 2.

import { readFileSync } from 'node:fs';

const EXIT_BLOCK = 2;

function readEvent() {
  let raw = '';
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    return null;
  }
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Normalize possibly-cased tool_input keys.
function pick(obj, ...names) {
  if (!obj) return undefined;
  for (const n of names) {
    if (obj[n] !== undefined) return obj[n];
  }
  return undefined;
}

// Apply an Edit in memory: replace first occurrence of old_string.
function applyEditInMemory(content, oldStr, newStr) {
  if (oldStr == null || newStr == null) return content;
  const idx = content.indexOf(oldStr);
  if (idx === -1) return content;
  return content.slice(0, idx) + newStr + content.slice(idx + oldStr.length);
}

// Strip /* ... */ and // comments so they never fake a violation.
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

// Extract candidate selector strings by scanning the raw text:
// buffer chars until '{' (selector candidate) or '}'/';' (reset buffer).
// '@'-led rules (media/keyframes/etc.) are filtered out.
function extractCandidateSelectors(css) {
  const clean = stripComments(css);
  const candidates = [];
  let buffer = '';
  for (const ch of clean) {
    if (ch === '{') {
      candidates.push(buffer.trim());
      buffer = '';
    } else if (ch === '}' || ch === ';') {
      buffer = '';
    } else {
      buffer += ch;
    }
  }
  return candidates.filter((s) => s && !s.startsWith('@'));
}

// Does a single selector string contain a combinator between two compound
// pieces, without starting with "&"? Returns the offending slice or null.
function scanSelector(selector) {
  if (selector.startsWith('&')) return null;

  const spaceCombo = /\.[A-Za-z0-9_-]+\s+\.[A-Za-z0-9_-]+/;
  const punctCombo = /\.[A-Za-z0-9_-]+\s*[>+~]\s*\.[A-Za-z0-9_-]+/;

  const m =
    selector.match(punctCombo) ||
    selector.match(spaceCombo) ||
    selector.match(/#[A-Za-z0-9_-]+\s+\.[A-Za-z0-9_-]+/) ||
    selector.match(/\.[A-Za-z0-9_-]+\s+#[A-Za-z0-9_-]+/);

  if (m) {
    const slice = m[0].trim();
    if (slice.startsWith('&')) return null;
    return slice;
  }
  return null;
}

function checkCss(text) {
  const violations = [];
  const selectors = extractCandidateSelectors(text);
  selectors.forEach((sel) => {
    const hit = scanSelector(sel);
    if (hit) {
      violations.push(`flat selector "${hit}" — use nesting, not ".a .b"`);
    }
  });
  return violations;
}

function main() {
  const event = readEvent();
  if (!event) process.exit(0);

  const toolName = String(event.tool_name || event.toolName || '').toLowerCase();
  const input = event.tool_input || event.toolInput || {};

  let cssText = null;
  let label = '';

  if (toolName === 'write') {
    const path = String(pick(input, 'file_path', 'filePath', 'path') || '');
    if (!path.endsWith('.css')) process.exit(0);
    cssText = String(pick(input, 'content', 'content') || '');
    label = path;
  } else if (toolName === 'edit') {
    const path = String(pick(input, 'file_path', 'filePath', 'path') || '');
    if (!path.endsWith('.css')) process.exit(0);
    let onDisk = '';
    try {
      onDisk = readFileSync(path, 'utf8');
    } catch {
      process.exit(0);
    }
    cssText = applyEditInMemory(
      onDisk,
      pick(input, 'old_string', 'oldString', 'old_string'),
      pick(input, 'new_string', 'newString', 'new_string'),
    );
    label = path;
  } else {
    process.exit(0);
  }

  const violations = checkCss(cssText);
  if (violations.length === 0) process.exit(0);

  const reason =
    `CSS nesting violation in ${label}:\n  - ${violations.join('\n  - ')}`;
  process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
  process.exit(EXIT_BLOCK);
}

main();
