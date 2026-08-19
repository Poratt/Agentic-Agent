#!/usr/bin/env node
// scripts/telegram-command-bot.js
//
// FreeBuzCommandBot — standalone Telegram command responder.
//
// Executes slash-commands directly and replies over the Bot API — no Freebuff
// session/relay in the loop, no dropped "/" messages, no 5-minute warnings.
// The Freebuff orchestrator cannot be modified from this repo (hard-coded),
// so this script is the workaround: a long-polling bot that owns the command
// chat itself.
//
// Config:
//   TELEGRAM_COMMAND_BOT_TOKEN  — auto-loaded from backend/.env, else process env
//   ALLOWED_CHAT_ID             — only this chat may run commands (default 661157823)
//   COMMAND_BOT_LOG             — log file (default C:/tmp/command-bot.log)
//
// Usage:
//   node scripts/telegram-command-bot.js                  # poll loop (production)
//   node scripts/telegram-command-bot.js --test status    # run one command, print replies (no Telegram)
//   node scripts/telegram-command-bot.js --test-stop tests  # start a command, /stop after 3s (driver test)
// (test modes: command WITHOUT leading slash — Git Bash mangles '/'-prefixed args)
//
// Only ONE instance may poll at a time (Telegram returns 409 for a second one).

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LOG_FILE = process.env.COMMAND_BOT_LOG || 'C:/tmp/command-bot.log';
const ALLOWED_CHAT_ID = process.env.ALLOWED_CHAT_ID || '661157823';

// ---- load backend/.env (KEY=VALUE, quotes stripped, existing env wins) ----
try {
  const raw = fs.readFileSync(path.join(ROOT, 'backend', '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  /* backend/.env missing — rely on process env */
}

const TOKEN = process.env.TELEGRAM_COMMAND_BOT_TOKEN;
if (!TOKEN) {
  console.error('TELEGRAM_COMMAND_BOT_TOKEN not set (backend/.env or process env)');
  process.exit(1);
}

// ---- logging ----
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {
    /* log file unwritable — print only */
  }
  console.log(line);
}

// ---- Telegram Bot API (Node 22 global fetch; JSON body keeps Hebrew intact) ----
async function apiCall(method, payload, timeoutMs = 15000) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return res.json();
}

function clip(text) {
  const t = String(text);
  return t.length > 3500 ? t.slice(0, 3500) + '\n…(קטע)' : t;
}

// Telegram HTML parse_mode is on, so bold actually renders. Convention:
// {{b}}...{{/b}} becomes <b>...</b>; EVERYTHING else is escaped (& < >) so
// dynamic command output (git/jest/netstat) can never 400 the send.
function toHtml(text) {
  const parts = String(text).split(/\{\{b\}\}/);
  const out = [];
  for (let i = 0; i < parts.length; i += 1) {
    const [head, tail] = parts[i].split(/\{\{\/b\}\}/);
    out.push(escapeHtml(head), tail !== undefined ? '<b>' + escapeHtml(tail) + '</b>' : '');
  }
  return out.join('');
}
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendMessage(chatId, text) {
  const t = clip(text);
  try {
    const r = await apiCall('sendMessage', { chat_id: chatId, text: toHtml(t), parse_mode: 'HTML' });
    log(`sent -> ${chatId}: ${t.slice(0, 70).replace(/\n/g, ' ')}${t.length > 70 ? '…' : ''} (ok=${r.ok})`);
    return r.ok;
  } catch (e) {
    log('ERROR sendMessage: ' + e.message);
    return false;
  }
}

// ---- execution state ----
let busy = null; // { command, startedAt }
let activeChild = null; // current child process (for /stop)
let stopped = false; // /stop requested -> running handler aborts between phases

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd) {
  return new Promise((resolve, reject) => {
    log('exec: ' + cmd);
    const child = exec(cmd, { cwd: ROOT, shell: 'bash', maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      const res = {
        code: err && typeof err.code === 'number' ? err.code : err ? 1 : 0,
        stdout: stdout || '',
        stderr: stderr || '',
      };
      if (stopped) reject(new Error('stopped by /stop'));
      else resolve(res);
    });
    activeChild = child;
    child.on('exit', () => {
      if (activeChild === child) activeChild = null;
    });
  });
}

function killTree(pid) {
  return new Promise((resolve) => {
    exec(`taskkill //F //T //PID ${pid} 2>/dev/null`, { shell: 'bash' }, (err) => resolve(err ? false : true));
  });
}

// Start a fully detached background process (the :3000 backend).
// Must NOT go through run()/exec: a backgrounded child inheriting exec's
// stdio pipes keeps them open, so exec never fires its callback and the
// command hangs forever. detached:true + stdio:'ignore' avoids that entirely.
function runDetached(cmd) {
  return new Promise((resolve) => {
    try {
      const child = spawn('bash', ['-c', cmd], { cwd: ROOT, detached: true, stdio: 'ignore' });
      child.unref();
      log('detached: ' + cmd);
    } catch (e) {
      log('detached error: ' + e.message);
    }
    resolve(true);
  });
}

// ---- command handlers ----
const HELP = [
  '/status — מה קורה עכשיו (busy/idle, :3000)',
  '/git — git status + git log --oneline -5',
  '/tests — backend jest + frontend ng test (איטי, כמה דקות)',
  '/build — ng build + exit code',
  '/restart_backend — rebuild + restart :3000',
  '/stop — עצירת הפקודה הרצה',
  '/help — רשימת הפקודות',
].join('\n');

async function cmdStatus() {
  const lines = [busy
    ? `עסוק כרגע: /${busy.command} (מאז ${busy.startedAt})`
    : 'Idle — לא רץ כלום.'];
  try {
    const net = await run('netstat -ano 2>/dev/null | grep LISTENING | grep ":3000 " || echo "no :3000 listener"');
    lines.push('--- :3000 ---', net.stdout.trim() || net.stderr.trim() || 'no output');
  } catch {
    lines.push('--- :3000 ---', 'check failed');
  }
  return lines.join('\n');
}

async function cmdGit() {
  const r = await run('git status --short; echo "---LOG---"; git log --oneline -5');
  return r.stdout.trim() || r.stderr.trim() || 'no output';
}

async function cmdTests(send) {
  await send('מתחיל {{b}}/tests{{/b}}… (backend jest, ואז frontend ng test — כמה דקות)');
  const b = await run('cd backend && npx jest --runInBand > C:/tmp/jest.out 2>&1; echo EXIT=$?; tail -8 C:/tmp/jest.out');
  const bCode = parseInt((b.stdout.match(/EXIT=(\d+)/) || [])[1], 10);
  await send(`backend jest: exit ${bCode}\n${b.stdout.replace(/EXIT=\d+/, '').slice(-1400)}`);
  if (stopped) return;
  const f = await run('cd frontend && npx ng test --watch=false > C:/tmp/ngtest.out 2>&1; echo EXIT=$?; tail -8 C:/tmp/ngtest.out');
  const fCode = parseInt((f.stdout.match(/EXIT=(\d+)/) || [])[1], 10);
  await send(`frontend ng test: exit ${fCode}\n${f.stdout.replace(/EXIT=\d+/, '').slice(-1400)}`);
  return bCode === 0 && fCode === 0 ? '✅ {{b}}/tests{{/b}} — הכול עבר.' : '❌ {{b}}/tests{{/b}} — יש כשלונות (ראה למעלה).';
}

async function cmdBuild(send) {
  await send('מתחיל {{b}}/build{{/b}}… (ng build — דקה בערך)');
  const r = await run('cd frontend && npx ng build > C:/tmp/ngbuild.out 2>&1; echo EXIT=$?; tail -6 C:/tmp/ngbuild.out');
  const code = parseInt((r.stdout.match(/EXIT=(\d+)/) || [])[1], 10);
  return `${code === 0 ? '✅' : '❌'} /build exit ${code}\n${r.stdout.replace(/EXIT=\d+/, '').slice(-1200)}`;
}

async function cmdRestart(send) {
  await send('מתחיל {{b}}/restart_backend{{/b}}… (kill :3000, build, start fresh dist)');
  const net = await run('netstat -ano 2>/dev/null | grep LISTENING | grep ":3000 " | awk \'{print $NF}\' | head -1');
  const pid = net.stdout.trim();
  if (pid) {
    await run(`taskkill //F //T //PID ${pid} 2>/dev/null || true`);
    await send(`נסגר ה-instance הישן (PID {{b}}${pid}{{/b}}).`);
  } else {
    await send('לא נמצא listener על :3000 — מדלג על kill.');
  }
  await run('cd backend && npm run build > C:/tmp/backend-build.out 2>&1; echo EXIT=$?; tail -3 C:/tmp/backend-build.out');
  await runDetached('cd backend && PORT=3000 node dist/main > C:/tmp/backend.log 2>&1');
  // Poll until :3000 answers — boot takes ~5-10s, never trust a fixed sleep.
  let up = 'NO LISTENER';
  for (let i = 0; i < 15; i++) {
    await sleep(2000);
    const check = await run('netstat -ano 2>/dev/null | grep LISTENING | grep ":3000 " || echo "NO LISTENER"');
    const out = (check.stdout || check.stderr || '').trim();
    if (out && out !== 'NO LISTENER') {
      up = out;
      break;
    }
    up = out || 'NO LISTENER';
  }
  return ':3000 אחרי restart:\n' + up;
}

async function cmdStop() {
  if (!busy) return 'אין פקודה רצה כרגע — כלום לעצור.';
  const label = busy.command;
  const child = activeChild;
  stopped = true;
  busy = null;
  if (child && child.pid) {
    const killed = await killTree(child.pid);
    log(`stop /${label}: killed=${killed} (pid ${child.pid})`);
    return killed
      ? `🛑 עצרתי את {{b}}/${label}{{/b}} (PID ${child.pid}).`
      : `⚠️ ביקשתי לעצור את {{b}}/${label}{{/b}} (PID ${child.pid}) אבל התהליך לא נסגר — בדוק את הלוג.`;
  }
  return `🛑 עצרתי את {{b}}/${label}{{/b}}.`;
}

const HANDLERS = {
  status: cmdStatus,
  git: cmdGit,
  tests: cmdTests,
  build: cmdBuild,
  restart_backend: cmdRestart,
  stop: cmdStop,
  help: async () => HELP,
};

// ---- command dispatch ----
async function executeCommand(raw, sendFn) {
  const parts = raw.trim().split(/\s+/);
  const name = parts[0].replace(/^\//, '').toLowerCase();
  const handler = HANDLERS[name];
  if (!handler) {
    return sendFn(`לא מכיר את הפקודה ${parts[0]}. /help לרשימה.`);
  }
  busy = { command: name, startedAt: new Date().toLocaleTimeString('he-IL') };
  stopped = false;
  try {
    const reply = await handler(sendFn);
    if (reply) await sendFn(reply);
  } catch (e) {
    if (!stopped) {
      log('ERROR in /' + name + ': ' + (e.stack || e.message));
      await sendFn(`❌ שגיאה בפקודה /${name}: ${e.message}`);
    }
  } finally {
    busy = null;
    stopped = false;
  }
}

function handleIncoming(text, chatId, sendFn) {
  const first = text.trim().split(/\s+/)[0].toLowerCase();
  if (first === '/stop') {
    // Route directly to cmdStop — going through executeCommand would overwrite
    // the running command's busy state, losing the label of what is stopped.
    return cmdStop().then((reply) => sendFn(reply));
  }
  if (first.startsWith('/')) return executeCommand(first, sendFn);
  return sendFn('אני בוט הפקודות — שלח /help לרשימה. לשיחה עם הסוכן תשתמש ב-@freebuzbot.');
}

// ---- poll loop ----
async function poll() {
  log('polling started (allowed chat ' + ALLOWED_CHAT_ID + ')');
  let offset = 0;
  while (true) {
    try {
      const r = await apiCall('getUpdates', { offset, timeout: 50, allowed_updates: ['message'] }, 90000);
      if (!r.ok) {
        log('getUpdates !ok: ' + JSON.stringify(r).slice(0, 200));
        await sleep(5000);
        continue;
      }
      for (const u of r.result || []) {
        offset = u.update_id + 1;
        const msg = u.message;
        if (!msg || !msg.text) continue;
        if (String(msg.chat.id) !== ALLOWED_CHAT_ID) {
          log('ignored chat ' + msg.chat.id);
          continue;
        }
        const send = (t) => sendMessage(msg.chat.id, t);
        log('command from chat: ' + msg.text.replace(/\n/g, ' '));
        if (busy && !msg.text.trim().startsWith('/stop')) {
          await send(`עסוק כרגע עם /${busy.command} — נסה אחר כך (או /stop).`);
          continue;
        }
        await handleIncoming(msg.text, msg.chat.id, send);
      }
    } catch (e) {
      log('poll error: ' + e.message);
      await sleep(5000);
    }
  }
}

// ---- main ----
const MODE = process.argv[2];
if (MODE === '--test') {
  // Note: pass the command WITHOUT a leading slash (Git Bash converts a
  // leading '/' argument into a Windows path, e.g. /help -> C:/Program ...).
  const cmd = (process.argv[3] || 'help').replace(/^\//, '');
  const print = async (t) => console.log('REPLY: ' + t.replace(/\n/g, ' | '));
  executeCommand(cmd, print).then(() => process.exit(0));
} else if (MODE === '--test-stop') {
  const cmd = (process.argv[3] || 'tests').replace(/^\//, '');
  const print = async (t) => console.log('REPLY: ' + t.replace(/\n/g, ' | '));
  executeCommand(cmd, print);
  setTimeout(() => cmdStop().then(print), 3000);
  setTimeout(() => {
    log('test-stop driver finished');
    process.exit(0);
  }, 8000);
} else {
  log('bot started (chat ' + ALLOWED_CHAT_ID + ')');
  poll();
}
