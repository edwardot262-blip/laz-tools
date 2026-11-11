# Telegram → Discord Mirror — Setup Guide

Mirrors messages from Telegram channels/groups you're a member of into a Discord webhook. Text, photos, videos, documents — all forwarded in real time.

Uses Telegram's official user API, so no bots to add, no permissions needed, works in any channel/group you can read.

---

## Step 1 — Get Telegram API Credentials

1. Go to **https://my.telegram.org**
2. Log in with your phone number
3. Click **API development tools**
4. Fill in the form:
   - App title: anything (e.g. "mirror")
   - Short name: anything (e.g. "mirror")
   - Platform: Desktop
5. Click **Create application**
6. Copy the **`api_id`** (a number) and **`api_hash`** (a long string)

---

## Step 2 — Get a Discord Webhook URL

1. In Discord, go to the channel you want messages to arrive in
2. Click the gear icon → **Integrations** → **Webhooks** → **New Webhook**
3. Click **Copy Webhook URL**

---

## Step 3 — Install

On your Pi (or any machine with Node.js):

```bash
cd ~/telegram-mirror-package
npm install
```

---

## Step 4 — Fill In Your Details

### Edit `.env`
Open the `.env` file and paste your API id and hash:
```
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abc123def456...
TELEGRAM_SESSION=
```
Leave `TELEGRAM_SESSION=` blank — the first run will fill it in.

---

## Step 5 — First Login (one time)

Run:
```bash
node mirror.js
```

You'll be prompted:
- **Phone number** — enter it with country code (e.g. `+15551234567`)
- **Code from Telegram** — Telegram will send you a login code; type it in
- **2FA password** — only if you have 2FA on; otherwise just press Enter

After login, it will print a long **session string**. Copy it, then open `.env` and paste it:
```
TELEGRAM_SESSION=1AQAOMTQ5LjE1NC4xNjcuNDEBu7...
```

Save `.env`. Now the bot never needs to log in again.

---

## Step 6 — Find Your Channel IDs

Run:
```bash
node list-channels.js
```

This prints every chat/channel/group you're in with their IDs. Copy the IDs of the ones you want to mirror.

Telegram channel IDs look like `-1001234567890` (start with `-100`). That's normal — use the full ID.

---

## Step 7 — Set Up Config

Edit `config.json` and add the channels you want to mirror:

```json
{
  "channelMappings": [
    {
      "sourceChannelId": "-1001234567890",
      "webhookUrls": [
        "https://discord.com/api/webhooks/..."
      ]
    },
    {
      "sourceChannelId": "-1009876543210",
      "webhookUrls": [
        "https://discord.com/api/webhooks/..."
      ]
    }
  ]
}
```

All channels can point to the same webhook, or different ones — up to you.

---

## Step 8 — Run It

### To test (foreground):
```bash
node mirror.js
```

### To run forever with PM2 (like the Discord mirror):
```bash
pm2 start mirror.js --name telegram-mirror
pm2 save
```

Check logs:
```bash
pm2 logs telegram-mirror --lines 10
```

Should show:
```
[INFO] Logged in as YourName (@username)
[INFO] Watching X channel(s). Mirror is active.
```

---

## Common Commands

| What | Command |
|---|---|
| Check logs | `pm2 logs telegram-mirror` |
| Restart | `pm2 restart telegram-mirror` |
| Stop | `pm2 stop telegram-mirror` |
| List channels you're in | `node list-channels.js` |
| Re-login (if session expires) | Delete `TELEGRAM_SESSION=` value in `.env`, run `node mirror.js` again |

---

## Adding or Removing Channels

Edit `config.json`, then restart:
```bash
pm2 restart telegram-mirror
```

---

## Troubleshooting

- **"PHONE_NUMBER_INVALID"** → Include country code with `+` (e.g. `+15551234567`)
- **"PHONE_CODE_INVALID"** → You mistyped the code. Run again.
- **"SESSION_PASSWORD_NEEDED"** → You have 2FA. Enter your Telegram 2FA password when prompted.
- **Nothing forwarding** → Run `node list-channels.js` and make sure the channel IDs in `config.json` match exactly (including the `-100` prefix).
