# Ro-School Framework

A complete open-source framework for building and running **Roblox school communities**.

Ro-School connects three parts of your community into one system:

- **Website** — public site, accounts, applications, staff portal, sessions, mail and administration
- **Discord bot** — applications, notifications, DMs, staff tools, logs and server integration
- **Roblox** — ranks, permissions, sessions, staff tools and in-game systems

The framework is designed to be **configured for your own school**, not rebuilt from scratch every time.

> **Ro-School is an RP/community framework, not a real registered school.**  
> Configure the RP notice, branding and policies for your own community.

**Stack:** Next.js 15 · Supabase · Discord.js · Roblox Open Cloud · Roblox Lua

---

## What Ro-School does

```text
                    Ro-School Framework
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
       Website            Discord              Roblox
          │                   │                   │
   Applications         Bot commands         In-game tools
   Staff portal         DMs                  Permissions
   Accounts             Notifications        Ranks
   Sessions             Logs                 Sessions
   Mail                 Staff tools          Staff GUIs
   Administration       Application embeds   API integration
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                           Supabase
                      Auth + Database
```

Everything shares the same backend so your website, Discord server and Roblox experience can work together.

### Website

- Public school website
- Student and staff accounts
- Authentication (email + Discord OAuth)
- Staff applications and management
- Staff database
- Sessions and timetable
- Student dashboard
- School mail
- Merits
- Safeguarding tools
- Administration
- Roblox / Discord integration

### Discord

The included Discord bot provides:

- Slash commands
- Application notifications
- Accept / reject DMs
- Staff database workflows
- Application embeds
- Automated notifications
- Server tools
- Database and website integration

### Roblox

The Roblox side can provide:

- Group rank integration
- Permission checks
- Staff tools
- Sessions
- In-game merits
- Staff GUIs
- Website API integration
- Roblox Open Cloud integration

---

## 1. Requirements

Before installing Ro-School you will need:

- **Node.js 20+**
- **npm**
- A **Supabase** project
- A **Discord application / bot**
- A Roblox group and experience (for Roblox features)

Optional:

- **Vercel** for the website
- A VPS, Railway, Render or another always-on host for the Discord bot
- Roblox Open Cloud API access

### Recommended tools

- Git
- VS Code
- Roblox Studio
- Discord Developer Mode enabled

---

## 2. Clone and install

```bash
git clone https://github.com/nyx-devs/Framework.git
cd Framework
```

Install the website dependencies:

```bash
npm install
```

Install the Discord bot dependencies:

```bash
cd bot
npm install
cd ..
```

You should now have a layout similar to:

```text
Framework/
├── src/
├── bot/
├── roblox/
├── supabase/
└── package.json
```

---

## 3. Environment variables

Ro-School uses environment variables for secrets and configuration.

**Never commit real `.env` files to GitHub.**

### Website

```bash
cp .env.example .env.local
```

### Discord bot

```bash
cp bot/.env.example bot/.env
```

Use the **same** Supabase URL and service role key for both website and bot.

---

### School branding

Configure identity in `.env.local`:

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

These values let you rebrand without rewriting the application.

---

### Supabase

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get these from **Supabase → Project Settings → API**.

The **service role key must only be used server-side** (website server actions / API routes and the Discord bot).

---

### Administration

```env
SCHOOL_ADMIN_PASSWORD=long_random_password
SCHOOL_ADMIN_EMAILS=you@example.com
ADMIN_SESSION_SECRET=another_long_random_string
```

Do not use short or guessable values.

Some older code paths may still accept:

```env
BLUEBIRD_ADMIN_PASSWORD=
BLUEBIRD_ADMIN_EMAILS=
```

Prefer the `SCHOOL_*` variables for new setups.

---

### Discord

```env
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_GUILD_ID=

DISCORD_APPLY_CHANNEL_ID=
DISCORD_DECISIONS_CHANNEL_ID=
DISCORD_DATABASE_CHANNEL_ID=
DISCORD_HT_REVIEW_CHANNEL_ID=
```

---

### Roblox

```env
ROBLOX_GROUP_ID=
ROBLOX_OPEN_CLOUD_API_KEY=
ROBLOX_OAUTH_CLIENT_ID=
ROBLOX_OAUTH_CLIENT_SECRET=
ROBLOX_MERIT_API_KEY=
ROBLOX_HT_ROLE_ID=
```

### Keep private

Never expose:

- Supabase service role keys  
- Discord bot tokens  
- Discord client secrets  
- Roblox Open Cloud keys  
- Merit API keys  
- Admin passwords  
- Session secrets  

---

## 4. Supabase setup

Ro-School uses Supabase for authentication, database storage and Row Level Security (RLS).

### Create your project

1. Create a project in Supabase.  
2. Wait for the database to finish provisioning.  
3. Open **SQL Editor**.  

### Run the migrations

Run the files inside `supabase/migrations/` **in filename order**.

Example:

```text
002_...
003_...
004_...
...
015_daily_sessions_gmt.sql
```

Optional extras may live under `bot-extras/`. Only run optional SQL for features you use (for example the Discord DM queue).

> If a migration reports that something already exists, check whether it was already applied before running it again.

---

## 5. Authentication

Ro-School uses Supabase Auth.

### Local development

**Authentication → URL configuration**

- **Site URL:** `http://localhost:3000`  
- **Redirect URLs:** `http://localhost:3000/**`  

### Production

After deploying:

- **Site URL:** `https://your-domain.com`  
- **Redirect URLs:** `https://your-domain.com/**`  

### Discord login

In Supabase: **Authentication → Providers → Discord**

1. Enable Discord.  
2. Enter Client ID and Client Secret from the Discord Developer Portal.  
3. Copy the Supabase callback URL, for example:  
   `https://YOUR_PROJECT.supabase.co/auth/v1/callback`  
4. Add that URL under **Discord Developer Portal → OAuth2 → Redirects**.  

---

## 6. Discord bot

The bot is a **separate process** from the website.

### Create the Discord application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).  
2. Create a new application.  
3. Open **Bot** → Add Bot → copy the token → `DISCORD_BOT_TOKEN`.  
4. Copy the application Client ID → `DISCORD_CLIENT_ID`.  
5. Configure OAuth2 if Discord website login is enabled.  

Enable privileged intents only if the bot code requires them.

### Invite the bot

OAuth2 URL Generator:

**Scopes**

- `bot`  
- `applications.commands`  

**Permissions** (typical)

- Send Messages  
- Embed Links  
- Attach Files  
- Read Message History  
- Use Application Commands  
- Mention Everyone (only if you use decision announcements)  

Invite the bot to your school server, then set:

```env
DISCORD_GUILD_ID=your_server_id
```

### Discord channels

| Purpose | Environment variable |
| --- | --- |
| Application embed | `DISCORD_APPLY_CHANNEL_ID` |
| Application decisions | `DISCORD_DECISIONS_CHANNEL_ID` |
| Staff database | `DISCORD_DATABASE_CHANNEL_ID` |
| Higher-level review | `DISCORD_HT_REVIEW_CHANNEL_ID` |

Enable Developer Mode in Discord, right-click a channel → **Copy Channel ID**.

---

## 7. Start the website

From the project root:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Check that:

- Your school branding appears  
- Registration works  
- Login works  
- The dashboard loads  
- Discord login works (if configured)  
- Staff permissions behave correctly  

### Production build

```bash
npm run build
npm run start
```

Fix any build errors before deploying.

---

## 8. Start the Discord bot

The Discord bot must stay running separately from Next.js.

```bash
cd bot
npm install
npm run register
npm run start
```

You should see something like:

```text
[roschool-bot] Logged in as YourBot
[dm-queue] worker started
```

### Development mode

```bash
npm run dev
```

### Test Discord DMs

```text
/testdm
```

If DMs are not working, check:

1. The bot is online.  
2. You share a server with the bot.  
3. Discord privacy allows DMs from server members.  
4. The Discord account is linked on the website.  
5. Bot token and guild ID are correct.  

---

## 9. Roblox setup

### Group

```env
ROBLOX_GROUP_ID=your_group_id
```

### Experience

```env
NEXT_PUBLIC_ROBLOX_GROUP_URL=
NEXT_PUBLIC_ROBLOX_EXPERIENCE_URL=
```

### Roblox Open Cloud

Create an API key with only the permissions you need, then:

```env
ROBLOX_OPEN_CLOUD_API_KEY=your_key
```

Keep this key server-side.

### Rank mapping

Configure rank → role mapping in the framework Roblox config (for example `src/lib/roblox/ranks.ts`).

Example bands:

```text
Student
Teacher
Senior Teacher
Senior Leadership
Headteacher
Administration
```

Your structure is configurable. **Permissions must be verified server-side.** Never trust a rank supplied by the Roblox client alone.

---

## 10. In-game systems

Roblox integration lives in:

```text
roblox/
```

Read:

```text
roblox/INSTALL.md
```

A typical Studio hierarchy:

```text
ServerScriptService
└── RoSchool
    ├── Config
    ├── Services
    └── ...
```

Exact names depend on your scripts. For API-powered features:

1. Set the website production URL in config.  
2. Enable **HttpService**.  
3. Configure the merit / API key to match the website.  
4. Install the scripts.  
5. Test with a staff-ranked account.  

---

## 11. Sessions

Default timetable:

```text
Every day · 7:15 PM – 8:40 PM GMT
```

Staff can manage sessions on the website:

- Create upcoming daily slots  
- Show sessions to students  
- Mark sessions live  
- **Cancel** sessions  
- Cancelled sessions are **not** auto-recreated  

Optional SQL for seeding daily sessions:

```text
supabase/migrations/015_daily_sessions_gmt.sql
```

---

## 12. Staff applications

Typical flow:

```text
Applicant
    │
    ▼
Website application
    │
    ▼
Supabase
    │
    ▼
Staff review
    │
    ├── Accepted
    └── Rejected
    │
    ▼
Discord notification
    │
    ▼
Applicant DM (bot)
```

For DMs to work:

- Bot process is online  
- Applicant has linked Discord  
- Website and bot use the same Supabase project  
- DM queue migration is applied if your version uses it  

---

## 13. Deployment

### Website (Vercel)

1. Push the repository to GitHub (**without** secrets).  
2. Import the project in Vercel.  
3. Add production environment variables.  
4. Set:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

5. Deploy.  
6. Update Supabase auth URLs.  
7. Update Discord OAuth redirects.  
8. Test login and staff permissions.  

**Never upload**

```text
.env
.env.local
.env.production
```

Only commit the template:

```text
.env.example
```

### Discord bot hosting

The bot is a long-running process. Do **not** run it as a normal Vercel serverless function.

Host options:

- Railway  
- Render  
- Fly.io  
- A VPS  
- Your own server  
- Your PC for development  

```bash
cd bot
npm run start
```

In production, use a process manager (PM2, systemd, etc.) where appropriate.

---

## 14. Security

### Never expose

```text
SUPABASE_SERVICE_ROLE_KEY
DISCORD_BOT_TOKEN
DISCORD_CLIENT_SECRET
ROBLOX_OPEN_CLOUD_API_KEY
ROBLOX_MERIT_API_KEY
ADMIN_SESSION_SECRET
```

### Permissions

Staff permissions must be checked on the **server**.

Do not rely on:

- Client-side role checks  
- Hidden buttons alone  
- Frontend variables  
- User-supplied permissions  

Hiding a button does not stop someone calling an API.

### Supabase

Keep RLS enabled on user-facing tables. Review policies before going public.

---

## 15. Pre-launch checklist

- [ ] Website builds successfully  
- [ ] Authentication works  
- [ ] Production OAuth redirects are configured  
- [ ] Supabase RLS is enabled  
- [ ] Staff permissions are server-side  
- [ ] Discord bot is online  
- [ ] Discord commands work  
- [ ] Application flow works  
- [ ] Application DMs work  
- [ ] Roblox integration works  
- [ ] Merit system works (if enabled)  
- [ ] `.env` files are ignored by Git  
- [ ] No secrets in Git history  
- [ ] Production domain is configured  
- [ ] RP notice is visible  
- [ ] Roblox and Discord links are correct  

---

## 16. Troubleshooting

| Problem | Check |
| --- | --- |
| Website will not build | Run `npm run build` locally and fix errors |
| Discord login fails | Supabase Discord provider + OAuth redirect URL |
| Production login goes to localhost | `NEXT_PUBLIC_SITE_URL` must be the production URL |
| Staff portal inaccessible | Rank mapping and server-side permissions |
| Roblox API fails | Open Cloud key and scopes |
| Merits do not work | HttpService, API URL, merit key |
| Application DM not sent | Bot online, Discord linked, DM privacy, service role on bot |
| Sessions not appearing | Migrations, Staff → Sessions, permissions |
| Slash commands missing | `npm run register` in `bot/` |
| Bot “Missing Access” | Bot in guild, correct `DISCORD_GUILD_ID` / Client ID |
| Supabase requests fail | URL, publishable key, RLS policies |
| Env vars seem missing | Restart dev server after editing `.env.local` |

Always check logs first:

```text
Vercel
Supabase
Discord bot terminal
Roblox Studio Output
Browser console
```

Do not randomly change config until you know which component failed.

---

## 17. Project structure

```text
Framework/
├── README.md
├── .env.example
├── package.json
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── dashboard/
│   │   ├── staff/
│   │   └── ...
│   ├── components/
│   └── lib/
│       ├── auth/
│       ├── supabase/
│       ├── roblox/
│       ├── discord/
│       ├── sessions/
│       └── merits/
│
├── supabase/
│   ├── migrations/
│   └── schema.sql
│
├── bot/
│   ├── .env.example
│   ├── package.json
│   ├── README.md
│   └── src/
│
├── roblox/
│   ├── INSTALL.md
│   └── ...
│
└── bot-extras/
    └── ...
```

---

## Quick start

If Supabase, Discord and env files are already configured:

### Website

```bash
npm install
npm run dev
```

### Discord bot

```bash
cd bot
npm install
npm run register
npm run start
```

### Production website build

```bash
npm run build
npm run start
```

---

## Licence and responsibility

Ro-School is intended for **Roblox roleplay and community projects**.

You are responsible for your own community, including:

- Roblox and Discord compliance  
- Privacy and data handling  
- Moderation and staff access  
- Community rules  
- Notices shown to members  

Ro-School does **not** make your Roblox community a real-world registered school.

---

## Contributing

Pull requests, bug reports and improvements are welcome.

When adding features, keep them modular and configurable so they work across different Ro-School communities rather than being hard-coded for one school.

**Build the framework once. Configure it for your school.**
