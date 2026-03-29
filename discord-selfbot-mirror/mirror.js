require('dotenv').config();
const { Client } = require('discord.js-selfbot-v13');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const CONFIG_PATH = path.join(__dirname, 'config.json');

if (!fs.existsSync(CONFIG_PATH)) {
  console.error('[ERROR] config.json not found. Copy config.example.json to config.json and fill in your values.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Build lookup: sourceChannelId -> webhookUrl[]
const channelMap = new Map();
for (const mapping of config.channelMappings) {
  channelMap.set(mapping.sourceChannelId, mapping.webhookUrls);
}

if (channelMap.size === 0) {
  console.error('[ERROR] No channelMappings found in config.json.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Webhook sender (raw HTTPS — no extra deps)
// ---------------------------------------------------------------------------

function sendToWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Build webhook payload from a Discord message
// ---------------------------------------------------------------------------

function buildPayload(message) {
  const author = message.author;
  const member = message.member;
  const displayName = member?.displayName || author.username;
  const avatarUrl = author.displayAvatarURL({ format: 'png', size: 128 });

  // Rebuild embeds as plain objects (webhooks accept embed objects directly)
  const embeds = message.embeds.map((e) => {
    const obj = {};
    if (e.title)       obj.title       = e.title;
    if (e.description) obj.description = e.description;
    if (e.url)         obj.url         = e.url;
    if (e.color)       obj.color       = e.color;
    if (e.timestamp)   obj.timestamp   = e.timestamp;
    if (e.footer)      obj.footer      = { text: e.footer.text, icon_url: e.footer.iconURL };
    if (e.image)       obj.image       = { url: e.image.url };
    if (e.thumbnail)   obj.thumbnail   = { url: e.thumbnail.url };
    if (e.author)      obj.author      = { name: e.author.name, url: e.author.url, icon_url: e.author.iconURL };
    if (e.fields?.length) obj.fields   = e.fields.map((f) => ({ name: f.name, value: f.value, inline: f.inline }));
    return obj;
  });

  // Collect attachment URLs as extra content lines
  const attachmentLines = message.attachments
    .map((a) => a.url)
    .join('\n');

  let content = message.content || '';
  if (attachmentLines) content = content ? `${content}\n${attachmentLines}` : attachmentLines;

  const payload = {
    username: displayName,
    avatar_url: avatarUrl,
    allowed_mentions: { parse: [] },
  };

  if (content)        payload.content = content;
  if (embeds.length)  payload.embeds  = embeds;

  return payload;
}

// ---------------------------------------------------------------------------
// Mirror helper
// ---------------------------------------------------------------------------

async function mirror(message) {
  const webhooks = channelMap.get(message.channelId);
  if (!webhooks || webhooks.length === 0) return;

  const payload = buildPayload(message);

  // Skip completely empty payloads
  if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) return;

  for (const url of webhooks) {
    try {
      const res = await sendToWebhook(url, payload);
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

// New messages
client.on('messageCreate', async (message) => {
  if (!channelMap.has(message.channelId)) return;
  await mirror(message);
});

// Edited messages — re-send with [edited] prefix
client.on('messageUpdate', async (oldMsg, newMsg) => {
  if (!channelMap.has(newMsg.channelId)) return;
  // Fetch full message if partial
  const full = newMsg.partial ? await newMsg.fetch().catch(() => null) : newMsg;
  if (!full) return;

  const webhooks = channelMap.get(full.channelId);
  if (!webhooks) return;

  const payload = buildPayload(full);
  if (payload.content) payload.content = `**[edited]** ${payload.content}`;
  else payload.content = '**[edited]**';

  for (const url of webhooks) {
    try {
      await sendToWebhook(url, payload);
    } catch (err) {
      console.error(`[ERROR] Failed to forward edit: ${err.message}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

const token = process.env.DISCORD_USER_TOKEN || config.userToken;

if (!token || token === 'YOUR_USER_TOKEN_HERE') {
  console.error('[ERROR] No user token set. Add DISCORD_USER_TOKEN to your .env file.');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error(`[ERROR] Login failed: ${err.message}`);
  process.exit(1);
});
