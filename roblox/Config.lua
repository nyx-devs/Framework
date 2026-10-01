--[[
  Bluebird Primary School School — Config (SERVER ONLY)
  ServerScriptService → Bluebird Primary School → Config
]]
local Config = {}

Config.ApiBaseUrl = "https://bluebird-school.vercel.app"
Config.MeritApiKey = "sk_live_5vT8nQ4LkR9xW2mP"

-- Bluebird Primary School group: used in-game to gate merit UI (server-side)
Config.StaffGroupId = 0 -- set to real group id
Config.MinimumStaffRank = 25 -- ranks >= this may use merit tools

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
Config.BadMeritReasons = {
	"Disruptive behaviour",
	"Disrespect",
	"Not following instructions",
	"Inappropriate language",
	"Other",
}

return Config
