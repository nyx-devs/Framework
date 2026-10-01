# Ro-School Framework — Full Setup Guide

Open-source website + Discord bot + Roblox integration for **Roblox Ro-Schools**.

Stack: **Next.js 15**, **Supabase**, **Discord.js**, **Roblox Open Cloud**.

> This is **not** a real registered school. Configure the RP notice for your community.  
> **Never commit secrets** (`.env`, tokens, service role keys) to GitHub.

---

## Table of contents

1. [What you get](#1-what-you-get)
2. [Requirements](#2-requirements)
3. [Clone & install](#3-clone--install)
4. [Environment variables](#4-environment-variables)
5. [Supabase setup](#5-supabase-setup)
6. [Discord app & bot](#6-discord-app--bot)
7. [Run the website](#7-run-the-website)
8. [Run the Discord bot](#8-run-the-discord-bot)
9. [Roblox setup](#9-roblox-setup)
10. [Sessions timetable](#10-sessions-timetable)
11. [Staff applications & DMs](#11-staff-applications--dms)
12. [Deploy (Vercel + bot host)](#12-deploy-vercel--bot-host)
13. [Permissions & security](#13-permissions--security)
14. [Troubleshooting](#14-troubleshooting)
15. [Project structure](#15-project-structure)

---

## 1. What you get

| Piece | Purpose |
|--------|---------|
| **Website** | Public school site, student portal, staff portal, applications, merits, sessions, mail, safeguarding |
| **Supabase** | Auth, database, RLS |
| **Discord bot** (`bot/`) | Slash commands, accept/reject DMs, apply embed, staff database flow |
| **Roblox scripts** (`roblox/`) | In-game merit awarding (staff GUI) |

---

## 2. Requirements

- Node.js **20+** (18+ may work)
- npm
- A [Supabase](https://supabase.com) project
- A [Discord application](https://discord.com/developers/applications) (bot + OAuth)
- Optional: Roblox group + Open Cloud API key + experience
- Optional: [Vercel](https://vercel.com) for the website; a always-on host for the bot (Railway, Render, VPS, your PC)

---

## 3. Clone & install

```bash
git clone https://github.com/eqeno/roschool-framework.git
cd roschool-framework

# Website
npm install

# Discord bot
cd bot
npm install
cd ..
```

If your zip folder is still named `bluebird-school`, rename it:

```bash
mv bluebird-school roschool-framework
cd roschool-framework
```

---

## 4. Environment variables

### Website — copy template

```bash
cp .env.example .env.local
```

### Bot — copy template

```bash
cp bot/.env.example bot/.env
```

Use the **same** Supabase URL and **service role** key in both website and bot.

### Branding (public)

```env
NEXT_PUBLIC_SCHOOL_NAME=Your Ro-School Name
NEXT_PUBLIC_SCHOOL_SHORT_NAME=YourSchool
NEXT_PUBLIC_SCHOOL_TAGLINE=Learning community on Roblox
NEXT_PUBLIC_SCHOOL_MOTTO=Learning · Kindness · Community
NEXT_PUBLIC_SCHOOL_DESCRIPTION=Official website for your Ro-School.
NEXT_PUBLIC_SCHOOL_RP_NOTICE=This is a Roblox-based learning community. It is not a registered school.
NEXT_PUBLIC_SCHOOL_ADDRESS=Your School|Roblox|United Kingdom

NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_DISCORD_INVITE_URL=https://discord.gg/your-invite
NEXT_PUBLIC_CONTACT_EMAIL=contact@example.com
NEXT_PUBLIC_ROBLOX_EXPERIENCE_URL=
NEXT_PUBLIC_ROBLOX_GROUP_URL=
NEXT_PUBLIC_SCHOOL_EMAIL_DOMAIN=school.local
```

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_or_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Find these in Supabase → **Project Settings → API**.

### Admin panel (optional)

```env
SCHOOL_ADMIN_PASSWORD=long_random_password
SCHOOL_ADMIN_EMAILS=you@example.com
ADMIN_SESSION_SECRET=another_long_random_string

# Legacy aliases some code still reads:
BLUEBIRD_ADMIN_PASSWORD=
BLUEBIRD_ADMIN_EMAILS=
```

### Discord

```env
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=

# Optional channel overrides
DISCORD_APPLY_CHANNEL_ID=
DISCORD_DECISIONS_CHANNEL_ID=
DISCORD_DATABASE_CHANNEL_ID=
DISCORD_HT_REVIEW_CHANNEL_ID=
```

### Roblox

```env
ROBLOX_GROUP_ID=
ROBLOX_OPEN_CLOUD_API_KEY=
ROBLOX_OAUTH_CLIENT_ID=
ROBLOX_OAUTH_CLIENT_SECRET=
ROBLOX_MERIT_API_KEY=choose_a_long_secret_for_game_server
ROBLOX_HT_ROLE_ID=
```

**Never put service role, bot token, or Open Cloud keys in client-side code.**

---

## 5. Supabase setup

### 5.1 Create project

1. Create a project at supabase.com  
2. Wait until the database is ready  

### 5.2 Run SQL migrations

In **SQL Editor**, run files under `supabase/migrations/` **in filename order**:

```
002_…  003_…  004_…  …  015_daily_sessions_gmt.sql
```

Also run any extras you need from:

- `supabase/schema.sql` (if required by your tree)
- `bot-extras/website-src/014_discord_dm_queue.sql` — DM queue for the bot  
- `bot-extras/website-src/013_staff_database_status.sql` — staff DB review status  

If a statement errors with “already exists”, you can usually continue.

### 5.3 Auth URLs

**Authentication → URL configuration**

- **Site URL:** `http://localhost:3000` (later your production URL)  
- **Redirect URLs:**  
  - `http://localhost:3000/**`  
  - `https://YOUR_VERCEL_DOMAIN/**`  

### 5.4 Discord OAuth provider

**Authentication → Providers → Discord**

- Enable Discord  
- Client ID / Secret from Discord Developer Portal  
- Callback URL (shown by Supabase), typically:  
  `https://YOUR_PROJECT.supabase.co/auth/v1/callback`  

Add that **same** callback in Discord → OAuth2 → Redirects.

---

## 6. Discord app & bot

### 6.1 Create application

1. [Discord Developer Portal](https://discord.com/developers/applications) → New Application  
2. **Bot** → Add Bot → copy **token** → `DISCORD_BOT_TOKEN`  
3. **OAuth2** → copy Client ID / Secret  
4. Enable privileged intents if your code needs them (Message Content only if you read message text)

### 6.2 Invite the bot

OAuth2 → URL Generator:

- Scopes: `bot`, `applications.commands`  
- Permissions: Send Messages, Embed Links, Attach Files, Read Message History, Mention Everyone, Use Application Commands  

Open the URL and invite to your server. Copy the server ID → `DISCORD_GUILD_ID`.

### 6.3 Channels (recommended)

| Purpose | Env var |
|---------|---------|
| Public apply embed | `DISCORD_APPLY_CHANNEL_ID` |
| Accept/reject + @everyone | `DISCORD_DECISIONS_CHANNEL_ID` |
| “Add yourself to database” | `DISCORD_DATABASE_CHANNEL_ID` |
| HT+ review | `DISCORD_HT_REVIEW_CHANNEL_ID` |

Right-click channel → Copy Channel ID (Developer Mode on).

---

## 7. Run the website

```bash
# from repo root
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful checks:

- Home page loads with **your** school name  
- Register / login works  
- Discord login (if provider configured)  
- Staff portal only after staff permissions / Roblox rank  

Production build test:

```bash
npm run build
npm run start
```

---

## 8. Run the Discord bot

The bot is a **separate long-running process** (not Vercel serverless).

```bash
cd bot
# ensure bot/.env is filled (same Supabase service role as website)
npm install
npm run register
npm run start
```

Expected logs:

```
[roschool-bot] Logged in as YourBot#1234
[dm-queue] worker started ...
```

### Test DMs

In Discord:

```
/testdm
```

If it fails:

1. Privacy → allow DMs from server members  
2. You must share a server with the bot  
3. Bot token and guild ID are correct  

### Bot scripts

| Command | Purpose |
|---------|---------|
| `npm run register` | Register slash commands to the guild |
| `npm run start` | Run bot |
| `npm run dev` | Run with auto-reload |

---

## 9. Roblox setup

### 9.1 Group & experience

1. Create a Roblox group → put ID in `ROBLOX_GROUP_ID`  
2. Create/publish your school experience  
3. Set `NEXT_PUBLIC_ROBLOX_GROUP_URL` and `NEXT_PUBLIC_ROBLOX_EXPERIENCE_URL`  

### 9.2 Open Cloud

1. Create an API key with the scopes you need (group membership / ranks as required)  
2. Set `ROBLOX_OPEN_CLOUD_API_KEY`  

### 9.3 Rank → role mapping

Edit `src/lib/roblox/ranks.ts` (or your ranks config) so Roblox ranks map to bands (student, staff, SLT, HT, etc.).

Permissions are enforced **server-side** from verified group rank + staff tables — not from the client.

### 9.4 In-game merits

See `roblox/INSTALL.md` and scripts in `roblox/`.

Typical flow:

1. Place ModuleScripts / Scripts under ServerScriptService  
2. Set `Config.ApiBaseUrl` to your **live** website URL  
3. Set the same merit API key as `ROBLOX_MERIT_API_KEY`  
4. Enable **HttpService** in the experience  
5. Staff with group rank use the merit GUI; server calls your website API  

Some scripts may still use older “Bluebird” folder names — rename folders in Studio to match the script, or edit the script names to match your hierarchy.

---

## 10. Sessions timetable

Default:

- **Every day · 7:15 pm – 8:40 pm GMT**

Behaviour:

- **Staff → Sessions** ensures the next **14 days** of daily slots  
- Staff with `sessions.cancel` can **Cancel** a session  
- Cancelled sessions are **not** auto-recreated  
- Students see upcoming scheduled/live sessions under **Dashboard → Sessions**  

Optional SQL seed (30 days): `supabase/migrations/015_daily_sessions_gmt.sql`.

---

## 11. Staff applications & DMs

Flow:

1. Applicant applies on the website  
2. Staff sets status **Accepted** or **Rejected**  
3. Decisions channel can announce; database channel explains staff DB form  
4. **Bot** sends the applicant a **DM** (queue + application poll)  

Requirements for DMs:

- Bot process **running**  
- Applicant has **linked Discord** on the website  
- `/testdm` works for that user  
- `014_discord_dm_queue.sql` applied (recommended)  
- Website and bot share the same Supabase project  

---

## 12. Deploy (Vercel + bot host)

### Website (Vercel)

1. Push repo to GitHub (**no** `.env.local`)  
2. Import project in Vercel  
3. Add **all** production env vars from `.env.example`  
4. Set `NEXT_PUBLIC_SITE_URL` to `https://your-domain.vercel.app`  
5. Deploy  
6. Update Supabase Site URL + Redirect URLs to production  
7. Update Discord OAuth redirects if needed  

### Bot (must stay online)

Deploy `bot/` to e.g.:

- Railway / Render / Fly.io **worker**  
- A VPS with `npm run start` under systemd/pm2  
- Your PC only for testing  

Set the same Discord + Supabase env vars on that host.

Vercel **cannot** reliably host the Discord gateway bot.

---

## 13. Permissions & security

- Service role key: **server and bot only**  
- Discord bot token: **bot host only**  
- Roblox Open Cloud / merit keys: **server only**  
- RLS should stay **enabled** on user data tables  
- Staff power should come from **Roblox rank + server checks**, not client claims  

### Before going public

- [ ] Secrets rotated if they were ever pasted in chat  
- [ ] `.env*` gitignored (except `.env.example`)  
- [ ] Supabase redirects limited to real domains  
- [ ] Bot invited only to your school server  
- [ ] RP notice visible where appropriate  

---

## 14. Troubleshooting

| Problem | What to check |
|---------|----------------|
| Build fails on Vercel | Local `npm run build`; fix TS/lint; don’t typecheck the bot from the Next app if excluded |
| Discord login fails | Supabase Discord provider; redirect URL = Supabase callback; Site URL |
| OAuth goes to localhost in production | `NEXT_PUBLIC_SITE_URL` must be production URL |
| Staff portal redirects away | User has no staff permission / Roblox rank not mapped |
| Merits fail in-game | HttpService on; correct `ApiBaseUrl`; merit API key matches; staff rank check |
| No accept DM | Bot online; `/testdm`; Discord linked; DM privacy; service role on bot |
| Sessions empty | Open Staff → Sessions once; run `015_…` SQL; permissions |
| “Missing Access” on `register` | Bot not in guild, or wrong `DISCORD_GUILD_ID` / Client ID |

---

## 15. Project structure

```
/
├── README.md                 ← this guide
├── .env.example              ← website env template
├── package.json              ← Next.js app
├── src/
│   ├── app/                  ← pages (public, dashboard, staff, admin, api)
│   ├── components/
│   └── lib/                  ← auth, supabase, roblox, discord, sessions, merits…
├── supabase/
│   ├── migrations/           ← run in order
│   └── schema.sql
├── roblox/                   ← in-experience Lua + install notes
├── bot/                      ← Discord bot
│   ├── README.md
│   ├── .env.example
│   └── src/
└── bot-extras/               ← optional SQL + website hooks for bot features
```

---

## Quick command cheat sheet

```bash
# Website
npm install
cp .env.example .env.local   # then edit
npm run dev
npm run build && npm run start

# Bot
cd bot
npm install
cp .env.example .env         # then edit
npm run register
npm run start
```

---

## Licence / responsibility

Adapt this framework for your own community. You are responsible for Roblox, Discord, and privacy compliance for your members.

If something fails, check **logs** (Vercel, Supabase, bot terminal) before changing random config.
