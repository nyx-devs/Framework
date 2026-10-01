--[[
  Bluebird Primary School — MeritService (ModuleScript, SERVER ONLY)
  ServerScriptService → Bluebird Primary School → MeritService
]]

local HttpService = game:GetService("HttpService")
local Config = require(script.Parent:WaitForChild("Config"))

local MeritService = {}

function MeritService.IsStaffRank(player: Player): boolean
	if not Config.StaffGroupId or Config.StaffGroupId == 0 then
		return true -- website still validates API key + staff link
	end
	local ok, rank = pcall(function()
		return player:GetRankInGroup(Config.StaffGroupId)
	end)
	return ok and rank >= (Config.MinimumStaffRank or 255)
end

function MeritService.Award(awarder: Player, student: Player, amount: number, reason: string)
	if not awarder or not awarder:IsA("Player") then
		return false, "Invalid awarder"
	end
	if not student or not student:IsA("Player") then
		return false, "Invalid student"
	end
	if typeof(amount) ~= "number" or amount == 0 then
		return false, "Invalid amount"
	end
	reason = tostring(reason or ""):gsub("^%s+", ""):gsub("%s+$", "")
	if #reason < 3 then
		return false, "Reason too short"
	end
	if #reason > 200 then
		reason = string.sub(reason, 1, 200)
	end

	if Config.MeritApiKey == "REPLACE_WITH_LONG_RANDOM_SECRET" then
		return false, "Set MeritApiKey in Config"
	end

	local kind = if amount < 0 then "bad" else "positive"

	local body = {
		studentRobloxId = student.UserId,
		studentRobloxUsername = student.Name,
		amount = math.floor(amount),
		reason = reason,
		meritKind = kind,
		awardedByRobloxId = awarder.UserId,
		awardedByName = awarder.DisplayName,
		serverId = game.JobId,
		sessionId = tostring(game.PlaceId),
		idempotencyKey = string.format(
			"rbx:%s:%d:%d:%d:%s:%d",
			kind,
			awarder.UserId,
			student.UserId,
			math.floor(amount),
			reason,
			os.time()
		),
	}

	local ok, response = pcall(function()
		return HttpService:RequestAsync({
			Url = Config.ApiBaseUrl .. "/api/roblox/merits",
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json",
				["Authorization"] = "Bearer " .. Config.MeritApiKey,
			},
			Body = HttpService:JSONEncode(body),
		})
	end)

	if not ok then
		warn("[Bluebird Primary School] HTTP error", response)
		return false, "Could not reach Bluebird Primary School API"
	end

	local decoded = nil
	pcall(function()
		decoded = HttpService:JSONDecode(response.Body)
	end)

	if response.Success and type(decoded) == "table" and decoded.ok then
		return true, decoded
	end
	return false, (decoded and decoded.error) or ("HTTP " .. tostring(response.StatusCode))
end

return MeritService
