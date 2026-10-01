--[[############################################################################
  Bluebird Primary School SCHOOL — COMPLETE ROBLOX MERIT SYSTEM
  ##############################################################################
  Copy each SECTION into Studio as the type shown in the header comment.

  Full install steps: INSTALL.md in this folder
############################################################################]]


--[[============================================================================
  SECTION 1 of 4 — ModuleScript
  Name: Config
  Parent: ServerScriptService → Folder "Bluebird Primary School"
============================================================================]]

--[[
local Config = {}

Config.ApiBaseUrl = "https://YOUR-DOMAIN.example.com"
Config.MeritApiKey = "REPLACE_WITH_LONG_RANDOM_SECRET"

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
]]


--[[============================================================================
  SECTION 2 of 4 — ModuleScript
  Name: MeritService
  Parent: ServerScriptService → Bluebird Primary School
  (Use the real code from MeritService.lua — do not leave commented)
============================================================================]]

-- Prefer pasting MeritService.lua, MeritServer.server.lua, MeritStaffClient.client.lua
-- and Config.lua as separate instances. This combined file is a map only.

print("[Bluebird Primary School] Use INSTALL.md + the four separate .lua files in this folder.")
