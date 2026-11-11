# Discord Message Mirror

Mirrors messages from one Discord channel to one or more destination channels in real-time — including text, embeds, attachments, and edits.

---

## How it works

1. The bot sits in the **source** server and listens for new messages.
2. For every new message it forwards it to the **destination** channel(s) via Discord webhooks, preserving the author's name and avatar.
3. If a message is **edited** the mirror edits the destination copy too.
4. If a message is **deleted** the mirror can delete the destination copy or post a notification (configurable).

---

## Setup

### 1. Create a Discord bot

1. Go to <https://discord.com/developers/applications> and create a new application.
2. Under **Bot**, click **Add Bot**.
3. Enable **Message Content Intent** (required to read message text).
4. Copy the **bot token** — you'll need it in step 4.
5. Invite the bot to the **source** server with at minimum these permissions:
   - Read Messages / View Channels
   - Read Message History

### 2. Create webhooks in destination channels

For each channel you want to mirror **to**:

1. Open the channel settings → **Integrations** → **Webhooks** → **New Webhook**.
2. Copy the **Webhook URL**.

### 3. Install dependencies

```bash
cd discord-mirror
npm install
```

### 4. Configure

```bash
cp config.example.json config.json
cp .env.example .env
```

Edit `.env` and paste your bot token:

```
DISCORD_BOT_TOKEN=your-actual-token-here
```

Edit `config.json`:

| Field | Description |
|---|---|
| `channelMappings` | Array of `{ sourceChannelId, destinationWebhookUrls[] }` pairs |
| `mirrorBots` | Set `true` to also mirror messages from bots (default `false`) |
| `notifyOnDelete` | Set `true` to mirror message deletions (default `true`) |

To find a channel ID: enable **Developer Mode** in Discord settings, then right-click any channel → **Copy Channel ID**.

### 5. Run

```bash
npm start
```

---

## config.json example

```json
{
  "botToken": "YOUR_BOT_TOKEN_HERE",
  "mirrorBots": false,
  "notifyOnDelete": true,
  "channelMappings": [
    {
      "sourceChannelId": "123456789012345678",
      "destinationWebhookUrls": [
        "https://discord.com/api/webhooks/111.../aaa...",
        "https://discord.com/api/webhooks/222.../bbb..."
      ]
    }
  ]
}
```

---

## Running persistently (PM2)

```bash
npm install -g pm2
pm2 start bot.js --name discord-mirror
pm2 save
pm2 startup
```

---

## Notes

- The bot token is a secret — never commit `.env` or `config.json` to version control (both are in `.gitignore`).
- Webhooks do not require the bot to be a member of the destination server.
- Attachments are re-uploaded so they don't expire when the source CDN link does.
