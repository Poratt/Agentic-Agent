// scripts/telegram-bot-commands.js
//
// Registers the Telegram menu commands + the commands-type chat menu button
// (the button next to the message box opens the command list).
//
// Idempotent and re-runnable:
//   node scripts/telegram-bot-commands.js                          # registers on FreeBuzCommandBot (standalone responder)
//   TELEGRAM_BOT_TOKEN=<token> node scripts/telegram-bot-commands.js   # explicit bot (e.g. the relay bot @freebuzbot)
//
// Token resolution order: process env TELEGRAM_COMMAND_BOT_TOKEN →
// process env TELEGRAM_BOT_TOKEN → backend/.env TELEGRAM_COMMAND_BOT_TOKEN →
// backend/.env TELEGRAM_BOT_TOKEN.
//
// NOTE: this only configures the BOT side. For the standalone command bot the
// HANDLING lives in scripts/telegram-command-bot.js; for the relay bot the
// commands arrive as relayed messages and are executed in the agent session.
const fs = require('fs');

const COMMANDS = [
  { command: 'status', description: 'מה קורה עכשיו (משימה פעילה / ממתין לאישור / idle)' },
  { command: 'git', description: 'git status + git log --oneline -5' },
  { command: 'tests', description: 'הרצת סוויטת הטסטים המלאה ודיווח תוצאה' },
  { command: 'build', description: 'ng build מהיר, דיווח exit code' },
  { command: 'restart_backend', description: 'restart ל-:3000 עם dist עדכני' },
  { command: 'stop', description: 'עצירת המשימה הנוכחית (אם רצה)' },
  { command: 'help', description: 'רשימת הפקודות הזמינות' },
];

function tokenFromEnvFile() {
  try {
    const lines = fs.readFileSync('backend/.env', 'utf8').split(/\r?\n/);
    for (const key of ['TELEGRAM_COMMAND_BOT_TOKEN', 'TELEGRAM_BOT_TOKEN']) {
      const line = lines.find((l) => l.startsWith(key + '='));
      if (line && !process.env[key]) return line.split('=').slice(1).join('=').trim();
    }
  } catch {
    // fall through to process env
  }
  return process.env.TELEGRAM_COMMAND_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
}

async function callApi(method, payload) {
  const token = tokenFromEnvFile();
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not found (backend/.env or env)');
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`${method}: ${data.description}`);
  }
  return data.result;
}

(async () => {
  const registered = await callApi('setMyCommands', { commands: COMMANDS });
  console.log('setMyCommands ok:', JSON.stringify(registered));

  const menu = await callApi('setChatMenuButton', { menu_button: { type: 'commands' } });
  console.log('setChatMenuButton ok:', JSON.stringify(menu));

  // Empirical verification — read back what the API actually holds.
  const current = await callApi('getMyCommands', {});
  console.log('current commands:', current.map((c) => `/${c.command}`).join(', '));

  const button = await callApi('getChatMenuButton', {});
  console.log('menu button:', JSON.stringify(button));
})().catch((e) => {
  console.error('ERR:', e.message);
  process.exit(1);
});
