--[[
  Bluebird Primary School School — MeritServer (Script)
  ServerScriptService → Bluebird Primary School → MeritServer
]]

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local MeritService = require(script.Parent:WaitForChild("MeritService"))
local Config = require(script.Parent:WaitForChild("Config"))

local folder = ReplicatedStorage:FindFirstChild("Bluebird Primary SchoolMerits")
if not folder then
	folder = Instance.new("Folder")
	folder.Name = "Bluebird Primary SchoolMerits"
	folder.Parent = ReplicatedStorage
end

local function remote(name: string)
	local r = folder:FindFirstChild(name)
	if not r then
		r = Instance.new("RemoteEvent")
		r.Name = name
		r.Parent = folder
	end
	return r
end

local AwardRemote = remote("AwardMerit")
local NotifyRemote = remote("MeritNotify")

local cooldowns: { [number]: number } = {}
local COOLDOWN_SEC = 2

AwardRemote.OnServerEvent:Connect(function(player: Player, payload: any)
	if typeof(payload) ~= "table" then
		return
	end

	if MeritService.IsStaffRank and not MeritService.IsStaffRank(player) then
		NotifyRemote:FireClient(player, false, "You do not have staff rank in the Bluebird Primary School group.")
		return
	end

	local now = os.clock()
	if cooldowns[player.UserId] and now - cooldowns[player.UserId] < COOLDOWN_SEC then
		NotifyRemote:FireClient(player, false, "Please wait a moment.")
		return
	end
	cooldowns[player.UserId] = now

	local targetUserId = tonumber(payload.targetUserId)
	local amount = math.abs(tonumber(payload.amount) or 0)
	local kind = tostring(payload.kind or "positive"):lower()
	if kind ~= "bad" then
		kind = "positive"
	end
	local reason = tostring(payload.reason or "")

	if not targetUserId or amount < 1 then
		NotifyRemote:FireClient(player, false, "Invalid student or amount.")
		return
	end

	-- Allow listed magnitudes only (1,2,3,5) for both positive and bad
	local allowed = false
	for _, a in ipairs(Config.MeritAmounts or { 1, 2, 3, 5 }) do
		if a == amount then
			allowed = true
			break
		end
	end
	if not allowed then
		NotifyRemote:FireClient(player, false, "Amount not allowed.")
		return
	end

	local student = Players:GetPlayerByUserId(targetUserId)
	if not student then
		NotifyRemote:FireClient(player, false, "That student is not in this server.")
		return
	end
	if student.UserId == player.UserId then
		NotifyRemote:FireClient(player, false, "You cannot award a merit to yourself.")
		return
	end

	-- Positive = +amount, Bad = -amount (website stores merit_kind)
	local signed = if kind == "bad" then -amount else amount

	local ok, result = MeritService.Award(player, student, signed, reason)
	if ok then
		local total = type(result) == "table" and result.total or "?"
		local label = if kind == "bad" then "Bad merit" else "Merit"
		NotifyRemote:FireClient(
			player,
			true,
			string.format("%s recorded for %s. Net total: %s", label, student.Name, tostring(total))
		)
		-- Optional: notify student
		NotifyRemote:FireClient(
			student,
			true,
			string.format(
				"You received a %s (%s%d): %s",
				label,
				if kind == "bad" then "-" else "+",
				amount,
				reason
			)
		)
	else
		NotifyRemote:FireClient(player, false, tostring(result))
	end
end)

print("[Bluebird Primary School] MeritServer ready (positive + bad merits)")
