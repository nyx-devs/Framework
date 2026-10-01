# Ro-School Merits — Full Roblox code + install

## Studio layout

```
ServerScriptService
└── Ro-School                    (Folder)
    ├── Config                  (ModuleScript)  ← Config.lua
    ├── MeritService            (ModuleScript)  ← MeritService.lua
    └── MeritServer             (Script)        ← MeritServer.server.lua

StarterPlayer
└── StarterPlayerScripts
    └── MeritStaffClient        (LocalScript)   ← MeritStaffClient.client.lua
```

---

## 1. Game Settings

**Game Settings → Security → Allow HTTP Requests = ON**

---

## 2. Website `.env`

```env
ROBLOX_MERIT_API_KEY=your-long-secret
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

Staff profile must have `roblox_user_id` set. Student too (to show total on website).

---

## 3. Config.lua (ModuleScript)

```lua
local Config = {}

Config.ApiBaseUrl = "https://your-school.vercel.app/0"
Config.MeritApiKey = "sk_live_5vT8nQ4LkR9xW2mP"

Config.StaffGroupId = 0
Config.MinimumStaffRank = 250

Config.MeritAmounts = { 1, 2, 3, 5 }

Config.MeritReasons = {
	"Excellent participation",
	"Outstanding work",
	"Helping another student",
	"Positive behaviour",
	"Leadership",
	"Improvement",
	"Other",
}

return Config
```

---

## 4. MeritService.lua (ModuleScript)

Paste the full contents of **MeritService.lua** from this folder.

---

## 5. MeritServer.server.lua (Script)

Paste the full contents of **MeritServer.server.lua**.

---

## 6. MeritStaffClient.client.lua (LocalScript)

Paste the full contents of **MeritStaffClient.client.lua**.

---

## 7. In game

1. Publish
2. Join as staff (Roblox ID linked on website)
3. Press **M**
4. Enter student username (in server), amount, reason
5. Award merit

---

## Files in this folder

| File | Paste as |
|------|----------|
| `Config.lua` | ModuleScript `Config` |
| `MeritService.lua` | ModuleScript `MeritService` |
| `MeritServer.server.lua` | Script `MeritServer` |
| `MeritStaffClient.client.lua` | LocalScript `MeritStaffClient` |
| `INSTALL.md` | Detailed troubleshooting |

---

## Security

- API key only in **Config** under **ServerScriptService**
- Never in LocalScripts
- Website always re-checks staff + permissions
