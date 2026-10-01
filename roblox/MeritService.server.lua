--[[
  Bluebird Primary School School — MeritService (SERVER ONLY)
  Place in ServerScriptService. Do NOT put the API key in a LocalScript.

  Setup:
  1. Create a Secret or set the API key in a ModuleScript only required from the server.
  2. Set BLUEBIRD_API_BASE to your deployed site URL (https://...).
  3. Staff awarding: call MeritService.Award(playerStaff, targetPlayer, amount, reason)

  The website must have:
    ROBLOX_MERIT_API_KEY=<same key>
    Awarder's Roblox user linked on a staff Bluebird Primary School profile.
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local MeritService = {}

-- >>> CONFIGURE THESE ON THE SERVER ONLY <<<
local API_BASE = "https://bluebird-school.vercel.app" -- no trailing slash
local API_KEY = "sk_live_5vT8nQ4LkR9xW2mP" -- same as server env

local ENDPOINT = API_BASE .. "/api/roblox/merits"

function MeritService.Award(awarder: Player, student: Player, amount: number, reason: string)
	assert(awarder and awarder:IsA("Player"), "awarder required")
	assert(student and student:IsA("Player"), "student required")
	assert(typeof(amount) == "number", "amount required")
	assert(typeof(reason) == "string" and #reason >= 3, "reason required")

	local body = {
		studentRobloxId = student.UserId,
		studentRobloxUsername = student.Name,
		amount = amount,
		reason = reason,
		awardedByRobloxId = awarder.UserId,
		awardedByName = awarder.DisplayName,
		serverId = tostring(game.JobId),
		sessionId = tostring(game.PlaceId),
		idempotencyKey = string.format(
			"rbx:%d:%d:%d:%s:%d",
			awarder.UserId,
			student.UserId,
			amount,
			reason,
			os.time()
		),
	}

	local ok, response = pcall(function()
		return HttpService:RequestAsync({
			Url = ENDPOINT,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
				["Authorization"] = "Bearer " .. API_KEY,
			},
			Body = HttpService:JSONEncode(body),
		})
	end)

	if not ok then
		return false, "Could not reach Bluebird Primary School API"
	end

	local decoded = nil
	pcall(function()
		decoded = HttpService:JSONDecode(response.Body)
	end)

	if response.Success and decoded and decoded.ok then
		return true, decoded
	end

	local err = (decoded and decoded.error) or ("HTTP " .. tostring(response.StatusCode))
	return false, err
end

return MeritService
