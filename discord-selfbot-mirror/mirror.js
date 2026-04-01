require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'config.json');
if (!fs.existsSync(CONFIG_PATH)) {
  console.error('[ERROR] config.json not found.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const channelMap = new Map();
for (const mapping of config.channelMappings) {
  channelMap.set(mapping.sourceChannelId, mapping.webhookUrls);
}

if (channelMap.size === 0) {
  console.error('[ERROR] No channelMappings found in config.json.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Download a URL and return a Buffer
// ---------------------------------------------------------------------------
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Send JSON payload to webhook
// ---------------------------------------------------------------------------
function sendToWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
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
}

// ---------------------------------------------------------------------------
// Send multipart/form-data to webhook (for file uploads)
// ---------------------------------------------------------------------------
function sendToWebhookWithFiles(webhookUrl, payload, files) {
  return new Promise((resolve, reject) => {
    const boundary = '----DiscordMirrorBoundary' + Date.now();
    const parts = [];

    // payload_json part
    const payloadJson = JSON.stringify(payload);
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="payload_json"\r\nContent-Type: application/json\r\n\r\n${payloadJson}\r\n`
    );

    // file parts
    files.forEach((f, i) => {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="files[${i}]"; filename="${f.name}"\r\nContent-Type: ${f.type}\r\n\r\n`
      );
      parts.push(f.buffer);
      parts.push('\r\n');
    });

    parts.push(`--${boundary}--\r\n`);

    const bodyParts = parts.map((p) => (typeof p === 'string' ? Buffer.from(p) : p));
    const body = Buffer.concat(bodyParts);

    const url = new URL(webhookUrl);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Build embed list from message
// ---------------------------------------------------------------------------
function buildEmbeds(message) {
  return message.embeds
    .filter((e) => e.type !== 'link') // skip link previews
    .map((e) => {
      const obj = {};
      if (e.title)          obj.title       = e.title;
      if (e.description)    obj.description = e.description;
      if (e.url)            obj.url         = e.url;
      if (e.color)          obj.color       = e.color;
      if (e.timestamp)      obj.timestamp   = e.timestamp;
      if (e.footer)         obj.footer      = { text: e.footer.text, icon_url: e.footer.iconURL };
      if (e.image)          obj.image       = { url: e.image.url };
      if (e.thumbnail)      obj.thumbnail   = { url: e.thumbnail.url };
      if (e.author)         obj.author      = { name: e.author.name, url: e.author.url, icon_url: e.author.iconURL };
      if (e.fields?.length) obj.fields      = e.fields.map((f) => ({ name: f.name, value: f.value, inline: f.inline }));
      return obj;
    });
}

// ---------------------------------------------------------------------------
// Mirror a message
// ---------------------------------------------------------------------------
async function mirror(message) {
  const webhooks = channelMap.get(message.channelId);
  if (!webhooks || webhooks.length === 0) return;

  const displayName = message.member?.displayName || message.author.username;
  const avatarUrl = message.author.displayAvatarURL({ format: 'png', size: 128 });
  const content = message.content || undefined;
  const embeds = buildEmbeds(message);

  // Download image attachments and re-upload
  const files = [];
  for (const att of message.attachments.values()) {
    try {
      const buffer = await downloadBuffer(att.url);
      files.push({ name: att.name || 'file', type: att.contentType || 'application/octet-stream', buffer });
    } catch (e) {
      console.warn(`[WARN] Could not download attachment: ${e.message}`);
    }
  }

  const payload = {
    username: displayName,
    avatar_url: avatarUrl,
    allowed_mentions: { parse: [] },
  };
  if (content)       payload.content = content;
  if (embeds.length) payload.embeds  = embeds;

  if (!content && !embeds.length && !files.length) return;

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
      console.error(`[ERROR] Failed to send to webhook: ${err.message}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
const client = new Client({ checkUpdate: false });

client.on('ready', () => {
  console.log(`[INFO] Logged in as ${client.user.tag}`);
  console.log(`[INFO] Watching ${channelMap.size} channel(s). Mirror is active.`);
});

client.on('messageCreate', async (message) => {
  if (!channelMap.has(message.channelId)) return;
  await mirror(message);
});


const token = process.env.DISCORD_USER_TOKEN || config.userToken;
if (!token || token === 'YOUR_USER_TOKEN_HERE') {
  console.error('[ERROR] No user token set.');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error(`[ERROR] Login failed: ${err.message}`);
  process.exit(1);
});
