# Ro-School Discord Bot

Companion bot for the **Ro-School framework** website (Next.js + Supabase).

## Features

- Slash commands (`/help`, `/link`, `/whoami`, `/apps`, `/staffdb`, `/testdm`, …)
- **DM queue worker** — sends accept/reject DMs from `discord_dm_queue` and recent application decisions
- **Apply embed** on startup (public apply channel)
- **Database embed** — “Been accepted? Add yourself to the staff database”
- Staff database modal + HT+ approve/reject buttons
- Recruitment announcements (`@everyone` on decisions channel)

## Setup

### 1. Discord Developer Portal

1. Create an application → Bot → copy **token**
2. OAuth2 → Client ID / Secret (for website Discord login via Supabase)
3. Invite bot with scopes: `bot`, `applications.commands`
4. Permissions: Send Messages, Embed Links, Mention Everyone, Read Message History, Use Application Commands

### 2. Environment

Create `bot/.env` (or use the same vars as the website):

```env
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Channels (optional overrides)
DISCORD_APPLY_CHANNEL_ID=
DISCORD_DECISIONS_CHANNEL_ID=
DISCORD_DATABASE_CHANNEL_ID=
DISCORD_HT_REVIEW_CHANNEL_ID=

# Roblox HT+ check (optional)
ROBLOX_GROUP_ID=
ROBLOX_HT_ROLE_ID=
```

### 3. Supabase

Run website migrations, including:

- `discord_connections`
- `014_discord_dm_queue.sql` (if present in website-src / migrations)
- `staff_database_entries` (+ `status` column if using review flow)

### 4. Install & run

```bash
cd bot
npm install
npm run register    # register slash commands to your guild
npm run start       # or: npx tsx src/index.ts
# dev with reload:
npm run dev
```

You should see:

```
[roschool-bot] Logged in as ...
[dm-queue] worker started ...
```

### 5. Test DMs

In Discord:

```
/testdm
```

If that fails, enable **Allow direct messages from server members** in Discord privacy settings and ensure you share a server with the bot.

## Website integration

The website should queue DMs / post decisions using the bot token or the `discord_dm_queue` table. See the main framework README.

Keep the bot process **running** (VPS, Railway, Render worker, etc.). Vercel serverless alone cannot keep a Discord gateway connection open reliably.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run register` | Register slash commands |
| `npm run start` | Run bot |
| `npm run dev` | Run with file watch |

## Licence

Same as the Ro-School framework — adapt for your community.
