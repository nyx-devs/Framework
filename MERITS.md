# Ro-School merits system

**Source of truth:** Supabase `merits` table + `merit_totals`.

## Setup

1. Run `supabase/migrations/010_merits_system.sql` in the SQL editor.
2. Add env on the **Next.js** server:
   ```
   ROBLOX_MERIT_API_KEY=<long random secret>
   SUPABASE_SERVICE_ROLE_KEY=<service role>
   DISCORD_BOT_TOKEN=<bot token>
   ```
3. Discord: set channel purpose `merits` in `discord_channels` with a real `channel_id` and `is_active = true`.
4. Link staff Roblox IDs on `profiles.roblox_user_id` so Roblox awards authorise.
5. Copy `roblox/MeritService.server.lua` into ServerScriptService; set API_BASE + same API key.
6. Enable HttpService in the Roblox experience.
7. Bot: `npm run register` then start the bot for `/merits` and `/merit-award`.

## Flows

- **Roblox** → `POST /api/roblox/merits` (Bearer key) → DB → Discord channel (best effort)
- **Website staff** → `/staff/merits` → same `awardMerit` service
- **Discord** → `/merit-award` → writes `merits` directly (service role)

If Discord is down, the merit is still saved.
