require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);
const apiHash = process.env.TELEGRAM_API_HASH;
const sessionString = process.env.TELEGRAM_SESSION || '';

(async () => {
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, { connectionRetries: 5 });
  await client.connect();
  const dialogs = await client.getDialogs({});
  console.log('\nAll channels/chats you are in:\n');
  console.log('ID'.padEnd(20), '|', 'Type'.padEnd(10), '|', 'Name');
  console.log('-'.repeat(80));
  for (const d of dialogs) {
    const id = String(d.id?.value || d.id || '');
    const type = d.isChannel ? 'channel' : d.isGroup ? 'group' : d.isUser ? 'user' : '?';
    console.log(id.padEnd(20), '|', type.padEnd(10), '|', d.title || d.name || '(no name)');
  }
  process.exit(0);
})();
