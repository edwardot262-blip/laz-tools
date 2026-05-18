require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  WebhookClient,
  EmbedBuilder,
  AttachmentBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------
const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('[ERROR] config.json not found. Copy config.example.json to config.json and fill in your values.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

const config = loadConfig();

// ---------------------------------------------------------------------------
// Build a lookup: sourceChannelId -> array of WebhookClient
// ---------------------------------------------------------------------------
const webhookMap = new Map(); // sourceChannelId -> WebhookClient[]

for (const mapping of config.channelMappings) {
  const clients = mapping.destinationWebhookUrls.map(
    (url) => new WebhookClient({ url })
  );
  webhookMap.set(mapping.sourceChannelId, clients);
}

if (webhookMap.size === 0) {
  console.error('[ERROR] No channel mappings found in config.json.');
  process.exit(1);
}

console.log(`[INFO] Watching ${webhookMap.size} source channel(s).`);

// ---------------------------------------------------------------------------
// Discord client
// ---------------------------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Download a Discord attachment and return an AttachmentBuilder so we can
 * re-upload it through the destination webhook (avoids broken CDN links).
 */
async function fetchAttachment(attachment) {
  const res = await fetch(attachment.url);
  const buffer = Buffer.from(await res.arrayBuffer());
  return new AttachmentBuilder(buffer, { name: attachment.name || 'file' });
}

/**
 * Mirror a single message to all destination webhooks mapped to its channel.
 */
async function mirrorMessage(message) {
  const webhooks = webhookMap.get(message.channelId);
  if (!webhooks) return;

  // Build base payload
  const username = message.member?.displayName || message.author.username;
  const avatarURL = message.author.displayAvatarURL({ size: 128 });

  // Re-fetch attachments so they survive Discord's CDN expiry
  const files = [];
  for (const att of message.attachments.values()) {
    try {
      files.push(await fetchAttachment(att));
    } catch (err) {
      console.warn(`[WARN] Could not fetch attachment ${att.name}: ${err.message}`);
    }
  }

  const payload = {
    username,
    avatarURL,
    content: message.content || undefined,
    embeds: message.embeds.map((e) => EmbedBuilder.from(e)),
    files,
    allowedMentions: { parse: [] }, // don't ping anyone in the destination
  };

  for (const hook of webhooks) {
    try {
      await hook.send(payload);
    } catch (err) {
      console.error(`[ERROR] Failed to send to webhook: ${err.message}`);
    }
  }
}

/**
 * Edit a previously mirrored message.
 * We store a mapping of source message ID -> destination webhook message IDs
 * so we can edit them later.
 */
// In-memory store: sourceMessageId -> [{ webhookClient, webhookMessageId }]
const messageIdMap = new Map();

async function mirrorMessageWithTracking(message) {
  const webhooks = webhookMap.get(message.channelId);
  if (!webhooks) return;

  const username = message.member?.displayName || message.author.username;
  const avatarURL = message.author.displayAvatarURL({ size: 128 });

  const files = [];
  for (const att of message.attachments.values()) {
    try {
      files.push(await fetchAttachment(att));
    } catch (err) {
      console.warn(`[WARN] Could not fetch attachment ${att.name}: ${err.message}`);
    }
  }

  const payload = {
    username,
    avatarURL,
    content: message.content || undefined,
    embeds: message.embeds.map((e) => EmbedBuilder.from(e)),
    files,
    allowedMentions: { parse: [] },
  };

  const tracked = [];

  for (const hook of webhooks) {
    try {
      const sent = await hook.send({ ...payload, fetchReply: true });
      // sent.id may be available depending on discord.js version
      if (sent && sent.id) {
        tracked.push({ hook, messageId: sent.id });
      }
    } catch (err) {
      console.error(`[ERROR] Failed to send to webhook: ${err.message}`);
    }
  }

  if (tracked.length > 0) {
    messageIdMap.set(message.id, tracked);
    // Evict oldest entries to cap memory usage
    if (messageIdMap.size > 2000) {
      const firstKey = messageIdMap.keys().next().value;
      messageIdMap.delete(firstKey);
    }
  }
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

client.once('ready', () => {
  console.log(`[INFO] Logged in as ${client.user.tag}`);
  console.log('[INFO] Discord mirror is active.');
});

// New message
client.on('messageCreate', async (message) => {
  // Ignore bots (unless config says otherwise) and webhook messages
  if (message.author.bot && !config.mirrorBots) return;
  if (message.webhookId) return;
  if (!webhookMap.has(message.channelId)) return;

  await mirrorMessageWithTracking(message);
});

// Edited message
client.on('messageUpdate', async (oldMessage, newMessage) => {
  if (!newMessage.channelId) return;
  if (!webhookMap.has(newMessage.channelId)) return;
  if (newMessage.author?.bot && !config.mirrorBots) return;
  if (newMessage.webhookId) return;

  const tracked = messageIdMap.get(newMessage.id);

  // Fetch full message if partial
  const full = newMessage.partial ? await newMessage.fetch() : newMessage;

  if (tracked && tracked.length > 0) {
    // Edit the already-mirrored messages
    for (const { hook, messageId } of tracked) {
      try {
        await hook.editMessage(messageId, {
          content: full.content || '',
          embeds: full.embeds.map((e) => EmbedBuilder.from(e)),
          allowedMentions: { parse: [] },
        });
      } catch (err) {
        console.error(`[ERROR] Failed to edit mirrored message: ${err.message}`);
      }
    }
  } else {
    // No tracked ID — just re-send as a new message with an [edited] note
    const webhooks = webhookMap.get(full.channelId);
    if (!webhooks) return;

    const username = full.member?.displayName || full.author?.username || 'Unknown';
    const avatarURL = full.author?.displayAvatarURL({ size: 128 });

    for (const hook of webhooks) {
      try {
        await hook.send({
          username,
          avatarURL,
          content: `**[edited]** ${full.content || ''}`.trim(),
          embeds: full.embeds.map((e) => EmbedBuilder.from(e)),
          allowedMentions: { parse: [] },
        });
      } catch (err) {
        console.error(`[ERROR] Failed to re-send edited message: ${err.message}`);
      }
    }
  }
});

// Deleted message — optionally notify destination
client.on('messageDelete', async (message) => {
  if (!config.notifyOnDelete) return;
  if (!webhookMap.has(message.channelId)) return;

  const tracked = messageIdMap.get(message.id);
  const webhooks = webhookMap.get(message.channelId);

  if (tracked && tracked.length > 0) {
    for (const { hook, messageId } of tracked) {
      try {
        await hook.deleteMessage(messageId);
      } catch (err) {
        // Message may already be gone — that's fine
      }
    }
    messageIdMap.delete(message.id);
  } else if (webhooks) {
    // Fall back to a notification embed
    const embed = new EmbedBuilder()
      .setDescription('*A message was deleted in the source channel.*')
      .setColor(0xff4444)
      .setTimestamp();

    for (const hook of webhooks) {
      try {
        await hook.send({ embeds: [embed], allowedMentions: { parse: [] } });
      } catch (err) {
        console.error(`[ERROR] Failed to send delete notification: ${err.message}`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
const token = process.env.DISCORD_BOT_TOKEN || config.botToken;
if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
  console.error('[ERROR] No bot token provided. Set DISCORD_BOT_TOKEN in your .env file or botToken in config.json.');
  process.exit(1);
}

client.login(token).catch((err) => {
  console.error(`[ERROR] Login failed: ${err.message}`);
  process.exit(1);
});
