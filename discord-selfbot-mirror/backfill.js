require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildPayload(message) {
  const displayName = message.member?.displayName || message.author.username;
  const avatarUrl = message.author.displayAvatarURL({ format: "png", size: 128 });

  const embeds = message.embeds.map((e) => {
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

  const attachmentLines = message.attachments.map((a) => a.url).join("\n");
  let content = message.content || "";
  if (attachmentLines) content = content ? `${content}\n${attachmentLines}` : attachmentLines;

  const payload = { username: displayName, avatar_url: avatarUrl, allowed_mentions: { parse: [] } };
  if (content)       payload.content = content;
  if (embeds.length) payload.embeds  = embeds;
  return payload;
}

async function backfillChannel(channel, webhookUrls) {
  console.log(`\n[INFO] Backfilling #${channel.name || channel.id}...`);

  // Fetch last 20 messages
  const batch = await channel.messages.fetch({ limit: 20 });
  const allMessages = [...batch.values()];

  console.log(`\n  Total: ${allMessages.length} messages. Sending to webhook...`);

  // Reverse so we post oldest first
  allMessages.reverse();

  let sent = 0;
  for (const message of allMessages) {
    const payload = buildPayload(message);
    if (!payload.content && (!payload.embeds || !payload.embeds.length)) continue;

    for (const url of webhookUrls) {
      try {
        const res = await sendToWebhook(url, payload);
        if (res.status === 429) {
          // Rate limited — wait and retry
          const retryAfter = JSON.parse(res.body).retry_after || 2;
          console.log(`\n  Rate limited. Waiting ${retryAfter}s...`);
          await sleep(retryAfter * 1000);
          await sendToWebhook(url, payload);
        } else if (res.status >= 400) {
          console.error(`\n  [ERROR] Webhook ${res.status}: ${res.body}`);
        }
      } catch (e) {
        console.error(`\n  [ERROR] ${e.message}`);
      }
    }

    sent++;
    process.stdout.write(`  Sent ${sent}/${allMessages.length}\r`);
    await sleep(800); // ~1.25 messages/sec to stay under webhook rate limit
  }

  console.log(`\n  Done. Sent ${sent} messages from #${channel.name || channel.id}`);
}

const client = new Client({ checkUpdate: false });

client.once("ready", async () => {
  console.log(`[OK] Logged in as ${client.user.tag}`);
  console.log(`[INFO] Starting backfill for ${config.channelMappings.length} channel(s)...\n`);

  for (const mapping of config.channelMappings) {
    try {
      const channel = await client.channels.fetch(mapping.sourceChannelId);
      if (!channel) {
        console.error(`[SKIP] Could not find channel ${mapping.sourceChannelId}`);
        continue;
      }
      await backfillChannel(channel, mapping.webhookUrls);
    } catch (e) {
      console.error(`[ERROR] Channel ${mapping.sourceChannelId}: ${e.message}`);
    }
  }

  console.log("\n[DONE] Backfill complete.");
  process.exit(0);
});

const token = process.env.DISCORD_USER_TOKEN;
client.login(token).catch((e) => {
  console.error("[FAIL] Login failed:", e.message);
  process.exit(1);
});
