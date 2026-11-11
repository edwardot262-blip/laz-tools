require('dotenv').config();
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { NewMessage } = require('telegram/events');
const fs = require('fs');
const path = require('path');
const https = require('https');

const CONFIG_PATH = path.join(__dirname, 'config.json');
if (!fs.existsSync(CONFIG_PATH)) {
  console.error('[ERROR] config.json not found.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const channelMap = new Map();
for (const mapping of config.channelMappings) {
  channelMap.set(String(mapping.sourceChannelId), mapping.webhookUrls);
}

if (channelMap.size === 0) {
  console.error('[ERROR] No channelMappings found in config.json.');
  process.exit(1);
}

const apiId = parseInt(process.env.TELEGRAM_API_ID, 10);
const apiHash = process.env.TELEGRAM_API_HASH;
const sessionString = process.env.TELEGRAM_SESSION || '';

if (!apiId || !apiHash) {
  console.error('[ERROR] TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env');
  process.exit(1);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sendToWebhook(webhookUrl, payload, retries = 4) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await new Promise((resolve, reject) => {
      const body = JSON.stringify(payload);
      const url = new URL(webhookUrl);
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    if (result.status === 429 && attempt < retries) {
      let retryAfter = 1;
      try { retryAfter = JSON.parse(result.body).retry_after || 1; } catch (_) {}
      console.warn(`[WARN] Rate limited. Waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000 + 200);
      continue;
    }
    return result;
  }
}

async function sendToWebhookWithFiles(webhookUrl, payload, files, retries = 4) {
  const boundary = '----TGMirrorBoundary' + Date.now();
  const parts = [];
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n`);
  files.forEach((f, i) => {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="files[${i}]"; filename="${f.name}"\r\nContent-Type: ${f.type}\r\n\r\n`);
    parts.push(f.buffer);
    parts.push('\r\n');
  });
  parts.push(`--${boundary}--\r\n`);
  const body = Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : p));

  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await new Promise((resolve, reject) => {
      const url = new URL(webhookUrl);
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': body.length },
      }, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
    if (result.status === 429 && attempt < retries) {
      let retryAfter = 1;
      try { retryAfter = JSON.parse(result.body).retry_after || 1; } catch (_) {}
      console.warn(`[WARN] Rate limited (files). Waiting ${retryAfter}s...`);
      await sleep(retryAfter * 1000 + 200);
      continue;
    }
    return result;
  }
}

function extensionForMime(mime) {
  if (!mime) return 'bin';
  if (mime.includes('jpeg')) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('mp4')) return 'mp4';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp3')) return 'mp3';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('pdf')) return 'pdf';
  return 'bin';
}

(async () => {
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
  });

  if (!sessionString) {
    const input = require('input');
    await client.start({
      phoneNumber: async () => await input.text('Phone number (with country code, e.g. +15551234567): '),
      password: async () => await input.text('2FA password (press enter if none): '),
      phoneCode: async () => await input.text('Code from Telegram: '),
      onError: (err) => console.log(err),
    });
    console.log('\n==========================================');
    console.log('COPY THIS SESSION STRING AND PASTE IT INTO .env AS TELEGRAM_SESSION:');
    console.log('==========================================');
    console.log(client.session.save());
    console.log('==========================================\n');
    console.log('Then restart the bot. You won\'t need to log in again.');
    process.exit(0);
  }

  await client.connect();
  const me = await client.getMe();
  console.log(`[INFO] Logged in as ${me.firstName} (@${me.username || 'no username'})`);
  console.log(`[INFO] Watching ${channelMap.size} channel(s). Mirror is active.`);

  client.addEventHandler(async (event) => {
    const message = event.message;
    if (!message) return;

    const chatId = String(message.chatId?.value || message.chatId || '');
    const normalizedId = chatId.replace(/^-100/, '');

    let webhooks = channelMap.get(chatId);
    if (!webhooks) webhooks = channelMap.get(normalizedId);
    if (!webhooks) webhooks = channelMap.get('-100' + normalizedId);
    if (!webhooks || webhooks.length === 0) return;

    console.log(`[MSG] chat=${chatId} text=${(message.text || '').slice(0, 60)}`);

    let senderName = 'Telegram';
    try {
      const sender = await message.getSender();
      if (sender) {
        senderName = sender.firstName || sender.title || sender.username || 'Telegram';
        if (sender.lastName) senderName += ' ' + sender.lastName;
      } else {
        const chat = await message.getChat();
        if (chat) senderName = chat.title || 'Telegram';
      }
    } catch (_) {}

    const content = message.text ? message.text.slice(0, 1990) : undefined;
    const files = [];
    if (message.media) {
      try {
        const buffer = await client.downloadMedia(message.media, {});
        if (buffer) {
          let name = 'file';
          let type = 'application/octet-stream';
          if (message.photo) {
            name = 'photo.jpg';
            type = 'image/jpeg';
          } else if (message.document) {
            name = message.document.attributes?.find(a => a.fileName)?.fileName || `file.${extensionForMime(message.document.mimeType)}`;
            type = message.document.mimeType || 'application/octet-stream';
          } else if (message.video) {
            name = 'video.mp4';
            type = 'video/mp4';
          }
          files.push({ name, type, buffer });
        }
      } catch (e) {
        console.warn(`[WARN] Could not download media: ${e.message}`);
      }
    }

    if (!content && files.length === 0) return;

    const payload = {
      username: senderName,
      allowed_mentions: { parse: [] },
    };
    if (content) payload.content = content;

    for (const url of webhooks) {
      try {
        let res;
        if (files.length > 0) {
          res = await sendToWebhookWithFiles(url, payload, files);
        } else {
          res = await sendToWebhook(url, payload);
        }
        if (res.status >= 400) {
          console.error(`[ERROR] Webhook returned ${res.status}: ${res.body}`);
        }
      } catch (err) {
        console.error(`[ERROR] Failed to send: ${err.message}`);
      }
    }
  }, new NewMessage({}));
})();
