# Discord Selfbot Mirror - Auto Setup Script
# Run this from PowerShell on your Desktop

$folder = "$env:USERPROFILE\Desktop\discord-selfbot-mirror"
New-Item -ItemType Directory -Force -Path $folder | Out-Null
Set-Location $folder

Write-Host "[1/4] Creating files..." -ForegroundColor Cyan

# package.json
@'
{
  "name": "discord-selfbot-mirror",
  "version": "1.0.0",
  "main": "mirror.js",
  "scripts": { "start": "node mirror.js" },
  "dependencies": {
    "debug": "^4.4.3",
    "discord.js-selfbot-v13": "^3.7.1",
    "dotenv": "^16.4.5"
  }
}
'@ | Set-Content package.json

# .env - prompt user for token
$token = Read-Host "Paste your Discord user token"
"DISCORD_USER_TOKEN=$token" | Set-Content .env

# config.json
@'
{
  "channelMappings": [
    {
      "sourceChannelId": "467090736005775382",
      "webhookUrls": [
        "https://discord.com/api/webhooks/1487948147513622558/PBSDc9vmZ9XxdLcxXenZxR8WhS2j4TMUoR7Sne-_-6RBxEfRDvVf925uu5Jb848OmcGG"
      ]
    }
  ]
}
'@ | Set-Content config.json

# mirror.js
@'
require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
const channelMap = new Map();
for (const m of config.channelMappings) channelMap.set(m.sourceChannelId, m.webhookUrls);

function sendToWebhook(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
    };
    const req = (url.protocol === "https:" ? https : http).request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: data }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function buildPayload(message) {
  const displayName = message.member?.displayName || message.author.username;
  const avatarUrl = message.author.displayAvatarURL({ format: "png", size: 128 });
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
  const attachmentLines = message.attachments.map((a) => a.url).join("\n");
  let content = message.content || "";
  if (attachmentLines) content = content ? `${content}\n${attachmentLines}` : attachmentLines;
  const payload = { username: displayName, avatar_url: avatarUrl, allowed_mentions: { parse: [] } };
  if (content)       payload.content = content;
  if (embeds.length) payload.embeds  = embeds;
  return payload;
}

async function mirror(message) {
  const webhooks = channelMap.get(message.channelId);
  if (!webhooks) return;
  const payload = buildPayload(message);
  if (!payload.content && (!payload.embeds || !payload.embeds.length)) return;
  for (const url of webhooks) {
    try {
      const res = await sendToWebhook(url, payload);
      if (res.status >= 400) console.error(`[ERROR] Webhook ${res.status}: ${res.body}`);
    } catch (e) { console.error("[ERROR]", e.message); }
  }
}

const client = new Client({ checkUpdate: false });

client.on("ready", () => {
  console.log(`[OK] Logged in as ${client.user.tag}`);
  console.log(`[OK] Watching ${channelMap.size} channel(s). Mirror is active!`);
});

client.on("messageCreate", async (msg) => {
  if (!channelMap.has(msg.channelId)) return;
  await mirror(msg);
});

client.on("messageUpdate", async (_, newMsg) => {
  if (!channelMap.has(newMsg.channelId)) return;
  const full = newMsg.partial ? await newMsg.fetch().catch(() => null) : newMsg;
  if (!full) return;
  const webhooks = channelMap.get(full.channelId);
  const payload = buildPayload(full);
  payload.content = `**[edited]** ${payload.content || ""}`.trim();
  for (const url of webhooks) {
    try { await sendToWebhook(url, payload); } catch (e) { console.error("[ERROR]", e.message); }
  }
});

const token = process.env.DISCORD_USER_TOKEN;
client.login(token).catch((e) => { console.error("[FAIL] Login failed:", e.message); process.exit(1); });
'@ | Set-Content mirror.js

Write-Host "[2/4] Installing dependencies (this may take a minute)..." -ForegroundColor Cyan
npm install

Write-Host "[3/4] Done! Starting mirror..." -ForegroundColor Green
Write-Host ""
Write-Host "Folder created at: $folder" -ForegroundColor Yellow
Write-Host "To start the mirror again later, open PowerShell in that folder and run: node mirror.js" -ForegroundColor Yellow
Write-Host ""

node mirror.js
