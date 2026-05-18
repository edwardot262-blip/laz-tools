# Discord Mirror Bot — Setup Guide

This bot watches Discord channels and forwards every message (text, images, embeds) to a webhook in real time.

---

## What You Need Before Starting

1. Your **Discord user token** (see Step 1 below)
2. One or more **Discord channel IDs** you want to monitor
3. One or more **Discord webhook URLs** to forward messages to

---

## Step 1 — Get Your Discord Token

1. Open Discord in your **web browser** (not the app)
2. Press **F12** to open developer tools
3. Click the **Console** tab
4. Paste this and press Enter:

```
window.webpackChunkdiscord_app.push([[Math.random()],{},e=>{for(let c in e.c)if(e.c[c]?.exports?.default?.getToken)console.log(e.c[c].exports.default.getToken())}])
```

5. Copy the token that appears (looks like: `NjM2Mj...`)

---

## Step 2 — Get Channel IDs

1. In Discord, go to **Settings → Advanced → Enable Developer Mode**
2. Right-click any channel you want to monitor
3. Click **Copy Channel ID**

---

## Step 3 — Get a Webhook URL

1. In the Discord server you want to RECEIVE messages, go to a channel
2. Click the gear icon (Edit Channel) → **Integrations** → **Webhooks**
3. Click **New Webhook**, give it a name, click **Copy Webhook URL**

---

## Step 4 — Fill In Your Details

### Edit `.env`
Open the `.env` file and replace `PASTE_YOUR_TOKEN_HERE` with your token:
```
DISCORD_USER_TOKEN=NjM2MjE2MjA2Njc1OTM1MjY5.XXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXX
```

### Edit `config.json`
Open `config.json` and replace the placeholders:
- `PASTE_CHANNEL_ID_HERE` → the channel ID you want to monitor
- `PASTE_WEBHOOK_URL_HERE` → the webhook URL to forward to

You can add as many channels as you want by copying the block.
You can send one channel to multiple webhooks by adding more URLs to `webhookUrls`.

Example:
```json
{
  "channelMappings": [
    {
      "sourceChannelId": "1234567890123456789",
      "webhookUrls": [
        "https://discord.com/api/webhooks/111/abc"
      ]
    },
    {
      "sourceChannelId": "9876543210987654321",
      "webhookUrls": [
        "https://discord.com/api/webhooks/111/abc",
        "https://discord.com/api/webhooks/222/xyz"
      ]
    }
  ]
}
```

---

## Step 5 — Install and Run (on a VPS/Server)

Run these commands on your server one at a time:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs

# Install PM2 (keeps the bot running 24/7)
npm install -g pm2

# Go to the bot folder
cd ~/discord-mirror

# Install dependencies
npm install

# Start the bot
pm2 start mirror.js --name mirror

# Save so it restarts automatically on reboot
pm2 save
pm2 startup
```

---

## Step 6 — Check It's Working

```bash
pm2 logs mirror --lines 10
```

You should see:
```
[INFO] Logged in as YourUsername
[INFO] Watching X channel(s). Mirror is active.
```

---

## Common Commands

| What you want to do | Command |
|---|---|
| Check logs | `pm2 logs mirror` |
| Restart the bot | `pm2 restart mirror` |
| Stop the bot | `pm2 stop mirror` |
| Update token | Edit `.env` then run `pm2 restart mirror --update-env` |

---

## Updating Your Token

Tokens expire. When the bot stops working, get a new token (Step 1) and run:

```bash
# Replace YOUR_NEW_TOKEN with the new token
echo 'DISCORD_USER_TOKEN=YOUR_NEW_TOKEN' > ~/.env && pm2 restart mirror --update-env
```

---

## Adding or Removing Channels

Edit `config.json` to add/remove channel entries, then restart:

```bash
pm2 restart mirror
```
