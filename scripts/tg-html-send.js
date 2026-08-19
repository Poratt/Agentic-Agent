#!/usr/bin/env node
// scripts/tg-html-send.js
//
// Sends a Telegram message with HTML parse_mode enabled — bold actually
// renders (sendMessage without parse_mode shows "**" literally).
//
// Convention: {{b}}...{{/b}} becomes <b>...</b>; EVERYTHING else is escaped
// (& < >), so free text is always safe — a stray "<" can never 400 the send.
// Do NOT write raw <b> in the payload — use the {{b}} markers.
//
// Usage (payload file avoids Git Bash UTF-8 mangling of inline Hebrew):
//   node scripts/tg-html-send.js relay "C:/tmp/tg-msg.txt"
//   node scripts/tg-html-send.js command "C:/tmp/tg-msg.txt"
//
// Tokens come from backend/.env: relay -> TELEGRAM_BOT_TOKEN,
// command -> TELEGRAM_COMMAND_BOT_TOKEN. Chat: 661157823 (ALLOWED_CHAT_ID).

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHAT_ID = process.env.ALLOWED_CHAT_ID || '661157823';

// ---- load backend/.env ----
try {
  const raw = fs.readFileSync(path.join(ROOT, 'backend', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  /* backend/.env missing — rely on process env */
}

const [botName, filePath] = process.argv.slice(2);
if (!botName || !filePath) {
  console.error('usage: node scripts/tg-html-send.js <relay|command> <utf8-text-file>');
  process.exit(1);
}
const TOKEN = process.env[botName === 'command' ? 'TELEGRAM_COMMAND_BOT_TOKEN' : 'TELEGRAM_BOT_TOKEN'];
if (!TOKEN) {
  console.error(`token for "${botName}" not found in backend/.env`);
  process.exit(1);
}

// {{b}} markers -> <b> tags; everything else escaped.
function toHtml(text) {
  const parts = String(text).split(/\{\{b\}\}/);
  const out = [];
  for (let i = 0; i < parts.length; i += 1) {
    const [head, tail] = parts[i].split(/\{\{\/b\}\}/);
    out.push(
      escapeHtml(head),
      tail !== undefined ? '<b>' + escapeHtml(tail) + '</b>' : '',
    );
  }
  return out.join('');
}
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

(async () => {
  const text = fs.readFileSync(filePath, 'utf8');
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text: toHtml(text), parse_mode: 'HTML' }),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('send failed:', data.description);
    process.exit(1);
  }
  console.log('sent ok, message_id:', data.result.message_id);
})().catch((e) => {
  console.error('error:', e.message);
  process.exit(1);
});
