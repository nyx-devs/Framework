# Ro-School Merits — Roblox install guide

This connects your **Roblox school** to the **Ro-School website** merit system.

```
Staff in Roblox → MeritService → Website API → Database → Discord + website profile
```

---

## What you need first (website)

1. Migration `010_merits_system.sql` has been run in Supabase.
2. On the **Next.js server** (Vercel / host `.env`):

```env
ROBLOX_MERIT_API_KEY=some-long-random-secret-you-create
NEXT_PUBLIC_SITE_URL=https://your-real-domain.com
SUPABASE_SERVICE_ROLE_KEY=...
```

3. Your staff account on the website has:
   - `profiles.role` = `staff` or `admin` (or active `staff_profiles`)
   - `profiles.roblox_user_id` = **your Roblox user ID** (numbers, not username)

4. Deploy the website so `https://your-domain/api/roblox/merits` is reachable.

Generate a key (example):

```bash
# PowerShell
-join ((48..57 + 65..90 + 97..122) | Get-Random -Count 48 | % {[char]$_})
```

Use the **same** string in website `ROBLOX_MERIT_API_KEY` and in the Roblox `Config` module.

---

## Files in this folder

| File | Type in Studio | Location |
|------|----------------|----------|
| `Config.lua` | **ModuleScript** named `Config` | `ServerScriptService/Ro-School/` |
| `MeritService.lua` | **ModuleScript** named `MeritService` | `ServerScriptService/Ro-School/` |
| `MeritServer.server.lua` | **Script** named `MeritServer` | `ServerScriptService/Ro-School/` |
| `MeritStaffClient.client.lua` | **LocalScript** named `MeritStaffClient` | `StarterPlayer/StarterPlayerScripts/` |

---

## Studio setup (step by step)

### 1. Enable HTTP requests

1. Home → **Game Settings** → **Security**
2. Turn **ON** “Allow HTTP Requests”
3. Save

### 2. Create the server folder

1. In **Explorer**, open **ServerScriptService**
2. Add a **Folder** named `Ro-School`
3. Inside `Ro-School`:
   - Insert **ModuleScript** → rename to `Config` → paste contents of `Config.lua`
   - Insert **ModuleScript** → rename to `MeritService` → paste `MeritService.lua`
   - Insert **Script** (not LocalScript) → rename to `MeritServer` → paste `MeritServer.server.lua`

### 3. Edit Config

Open `Config` and set:

```lua
Config.ApiBaseUrl = "https://your-real-domain.com"  -- no trailing slash
Config.MeritApiKey = "the-same-key-as-ROBLOX_MERIT_API_KEY"
```

Optional group rank gate:

```lua
Config.StaffGroupId = 12345678       -- your group id
Config.MinimumStaffRank = 250        -- only ranks >= this see/use UI meaningfully
```

If `StaffGroupId = 0`, anyone can open the UI, but the **website still rejects** non-staff.

### 4. Client UI

1. **StarterPlayer** → **StarterPlayerScripts**
2. Insert **LocalScript** named `MeritStaffClient`
3. Paste `MeritStaffClient.client.lua`

### 5. Publish and test

1. Publish the place
2. Join with a **staff** account (Roblox ID linked on the website)
3. Press **M** to open the merit panel
4. Type a student’s **username** who is in the server
5. Amount `1`, reason e.g. `Excellent participation`
6. Click **Award merit**

**Success:** green message + merit on website `/dashboard/merits` for that student (if their Roblox is linked).  
**Failure:** red message with the API error (read it — usually “not linked” or “not staff”).

---

## Linking Roblox IDs on the website

In Supabase SQL (example):

```sql
-- Staff who awards
UPDATE public.profiles
SET roblox_user_id = 123456789,  -- their Roblox user id
    roblox_username = 'TheirName'
WHERE email = 'staff@example.com';

-- Student who receives
UPDATE public.profiles
SET roblox_user_id = 987654321,
    roblox_username = 'StudentName'
WHERE email = 'student@example.com';
```

Find a Roblox user ID on their profile URL: `https://www.roblox.com/users/USER_ID/profile`

---

## Security rules (do not break these)

| Do | Don’t |
|----|--------|
| Keep `Config` + `MeritService` under **ServerScriptService** | Put the API key in a LocalScript |
| Let the **server** call the API | Let the client HTTP to your API |
| Rely on website staff checks | Trust the client’s “I am staff” claim alone |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| “Config not set” | Edit `Config` ModuleScript values |
| “Could not reach Ro-School API” | HttpService on; correct HTTPS URL; site online |
| “Unauthorised” | API key mismatch website ↔ Config |
| “Awarder Roblox account is not linked” | Set staff `profiles.roblox_user_id` |
| “Only authorised staff” | Staff role on website profile |
| Student total not on website | Student needs `roblox_user_id` on their profile |
| UI doesn’t open | Press **M**; check Output for errors; MeritServer must run first |

---

## Optional: Discord channel

When a merit saves, the website posts to the Discord channel with purpose `merits` if configured:

```sql
UPDATE public.discord_channels
SET channel_id = 'DISCORD_CHANNEL_ID', is_active = true
WHERE purpose = 'merits';
```

---

## Test API without Roblox (optional)

```bash
curl -X POST https://your-domain.com/api/roblox/merits \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"studentRobloxId\":987654321,\"amount\":1,\"reason\":\"Test\",\"awardedByRobloxId\":123456789}"
```

---

**Support checklist:** HttpService → Config → staff Roblox ID linked → student Roblox ID linked → same API key → press M in game.
