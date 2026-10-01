--[[
  Bluebird Primary School School — Merit staff UI
  StarterPlayer → StarterPlayerScripts → MeritStaffClient (LocalScript)

  Top-right "Merits" button + Positive / Bad toggle
]]

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local pg = player:WaitForChild("PlayerGui")

local folder = ReplicatedStorage:WaitForChild("Bluebird Primary SchoolMerits", 60)
if not folder then
	warn("[Bluebird Primary School] Bluebird Primary SchoolMerits missing — is MeritServer running?")
	return
end

local AwardRemote = folder:WaitForChild("AwardMerit")
local NotifyRemote = folder:WaitForChild("MeritNotify")

local kind = "positive" -- or "bad"

local gui = Instance.new("ScreenGui")
gui.Name = "Bluebird Primary SchoolMeritGui"
gui.ResetOnSpawn = false
gui.Parent = pg

local openBtn = Instance.new("TextButton")
openBtn.Size = UDim2.new(0, 110, 0, 36)
openBtn.Position = UDim2.new(1, -122, 0, 16)
openBtn.BackgroundColor3 = Color3.fromRGB(11, 29, 69)
openBtn.TextColor3 = Color3.new(1, 1, 1)
openBtn.Font = Enum.Font.GothamBold
openBtn.TextSize = 14
openBtn.Text = "Merits"
openBtn.Parent = gui
Instance.new("UICorner", openBtn).CornerRadius = UDim.new(0, 6)

local frame = Instance.new("Frame")
frame.Size = UDim2.new(0, 340, 0, 360)
frame.Position = UDim2.new(0.5, -170, 0.5, -180)
frame.BackgroundColor3 = Color3.fromRGB(11, 29, 69)
frame.Visible = false
frame.Parent = gui
Instance.new("UICorner", frame).CornerRadius = UDim.new(0, 8)

local title = Instance.new("TextLabel")
title.Size = UDim2.new(1, -20, 0, 32)
title.Position = UDim2.new(0, 10, 0, 8)
title.BackgroundTransparency = 1
title.Font = Enum.Font.GothamBold
title.TextSize = 18
title.TextColor3 = Color3.new(1, 1, 1)
title.TextXAlignment = Enum.TextXAlignment.Left
title.Text = "Award merit"
title.Parent = frame

-- Type: Positive | Bad
local posBtn = Instance.new("TextButton")
posBtn.Size = UDim2.new(0.45, 0, 0, 32)
posBtn.Position = UDim2.new(0, 12, 0, 48)
posBtn.Font = Enum.Font.GothamBold
posBtn.TextSize = 13
posBtn.Text = "Positive (+)"
posBtn.Parent = frame
Instance.new("UICorner", posBtn).CornerRadius = UDim.new(0, 4)

local badBtn = Instance.new("TextButton")
badBtn.Size = UDim2.new(0.45, 0, 0, 32)
badBtn.Position = UDim2.new(0.52, 0, 0, 48)
badBtn.Font = Enum.Font.GothamBold
badBtn.TextSize = 13
badBtn.Text = "Bad (−)"
badBtn.Parent = frame
Instance.new("UICorner", badBtn).CornerRadius = UDim.new(0, 4)

local function styleType()
	if kind == "positive" then
		posBtn.BackgroundColor3 = Color3.fromRGB(34, 140, 80)
		posBtn.TextColor3 = Color3.new(1, 1, 1)
		badBtn.BackgroundColor3 = Color3.fromRGB(40, 50, 70)
		badBtn.TextColor3 = Color3.fromRGB(180, 190, 210)
		title.Text = "Award positive merit"
	else
		badBtn.BackgroundColor3 = Color3.fromRGB(180, 50, 50)
		badBtn.TextColor3 = Color3.new(1, 1, 1)
		posBtn.BackgroundColor3 = Color3.fromRGB(40, 50, 70)
		posBtn.TextColor3 = Color3.fromRGB(180, 190, 210)
		title.Text = "Issue bad merit"
	end
end
styleType()

posBtn.MouseButton1Click:Connect(function()
	kind = "positive"
	styleType()
end)
badBtn.MouseButton1Click:Connect(function()
	kind = "bad"
	styleType()
end)

local function label(text, y)
	local l = Instance.new("TextLabel")
	l.Size = UDim2.new(1, -24, 0, 16)
	l.Position = UDim2.new(0, 12, 0, y)
	l.BackgroundTransparency = 1
	l.Font = Enum.Font.Gotham
	l.TextSize = 12
	l.TextColor3 = Color3.fromRGB(170, 190, 220)
	l.TextXAlignment = Enum.TextXAlignment.Left
	l.Text = text
	l.Parent = frame
end

label("Student username (in this server)", 90)
local studentBox = Instance.new("TextBox")
studentBox.Size = UDim2.new(1, -24, 0, 32)
studentBox.Position = UDim2.new(0, 12, 0, 108)
studentBox.BackgroundColor3 = Color3.fromRGB(20, 40, 80)
studentBox.TextColor3 = Color3.new(1, 1, 1)
studentBox.PlaceholderText = "Username"
studentBox.Font = Enum.Font.Gotham
studentBox.TextSize = 14
studentBox.Text = ""
studentBox.Parent = frame
Instance.new("UICorner", studentBox).CornerRadius = UDim.new(0, 4)

label("Amount (1–5)", 148)
local amountBox = Instance.new("TextBox")
amountBox.Size = UDim2.new(0.35, 0, 0, 32)
amountBox.Position = UDim2.new(0, 12, 0, 166)
amountBox.BackgroundColor3 = Color3.fromRGB(20, 40, 80)
amountBox.TextColor3 = Color3.new(1, 1, 1)
amountBox.Text = "1"
amountBox.Font = Enum.Font.Gotham
amountBox.TextSize = 14
amountBox.Parent = frame
Instance.new("UICorner", amountBox).CornerRadius = UDim.new(0, 4)

label("Reason", 206)
local reasonBox = Instance.new("TextBox")
reasonBox.Size = UDim2.new(1, -24, 0, 32)
reasonBox.Position = UDim2.new(0, 12, 0, 224)
reasonBox.BackgroundColor3 = Color3.fromRGB(20, 40, 80)
reasonBox.TextColor3 = Color3.new(1, 1, 1)
reasonBox.Text = "Excellent participation"
reasonBox.Font = Enum.Font.Gotham
reasonBox.TextSize = 14
reasonBox.Parent = frame
Instance.new("UICorner", reasonBox).CornerRadius = UDim.new(0, 4)

local status = Instance.new("TextLabel")
status.Size = UDim2.new(1, -24, 0, 36)
status.Position = UDim2.new(0, 12, 0, 264)
status.BackgroundTransparency = 1
status.Font = Enum.Font.Gotham
status.TextSize = 12
status.TextColor3 = Color3.fromRGB(200, 210, 230)
status.TextXAlignment = Enum.TextXAlignment.Left
status.TextWrapped = true
status.Text = "Choose Positive or Bad, then Award."
status.Parent = frame

local awardBtn = Instance.new("TextButton")
awardBtn.Size = UDim2.new(0.55, 0, 0, 34)
awardBtn.Position = UDim2.new(0, 12, 0, 308)
awardBtn.BackgroundColor3 = Color3.fromRGB(26, 74, 156)
awardBtn.TextColor3 = Color3.new(1, 1, 1)
awardBtn.Font = Enum.Font.GothamBold
awardBtn.TextSize = 14
awardBtn.Text = "Award"
awardBtn.Parent = frame
Instance.new("UICorner", awardBtn).CornerRadius = UDim.new(0, 4)

local closeBtn = Instance.new("TextButton")
closeBtn.Size = UDim2.new(0.3, 0, 0, 34)
closeBtn.Position = UDim2.new(0.65, 0, 0, 308)
closeBtn.BackgroundColor3 = Color3.fromRGB(40, 50, 70)
closeBtn.TextColor3 = Color3.new(1, 1, 1)
closeBtn.Font = Enum.Font.Gotham
closeBtn.TextSize = 14
closeBtn.Text = "Close"
closeBtn.Parent = frame
Instance.new("UICorner", closeBtn).CornerRadius = UDim.new(0, 4)

local function setOpen(on)
	frame.Visible = on
end

openBtn.MouseButton1Click:Connect(function()
	setOpen(not frame.Visible)
end)
closeBtn.MouseButton1Click:Connect(function()
	setOpen(false)
end)

awardBtn.MouseButton1Click:Connect(function()
	local name = studentBox.Text:gsub("^%s+", ""):gsub("%s+$", "")
	local amount = tonumber(amountBox.Text)
	local reason = reasonBox.Text
	if name == "" or not amount or amount < 1 or #reason < 3 then
		status.Text = "Fill student, amount (1+), and reason."
		status.TextColor3 = Color3.fromRGB(255, 120, 120)
		return
	end
	local target = nil
	for _, p in ipairs(Players:GetPlayers()) do
		if p.Name:lower() == name:lower() or p.DisplayName:lower() == name:lower() then
			target = p
			break
		end
	end
	if not target then
		status.Text = "Student not in this server."
		status.TextColor3 = Color3.fromRGB(255, 120, 120)
		return
	end
	status.Text = "Sending…"
	status.TextColor3 = Color3.fromRGB(200, 210, 230)
	AwardRemote:FireServer({
		targetUserId = target.UserId,
		amount = math.abs(amount),
		kind = kind, -- "positive" or "bad"
		reason = reason,
	})
end)

NotifyRemote.OnClientEvent:Connect(function(success, message)
	status.Text = tostring(message)
	status.TextColor3 = success and Color3.fromRGB(120, 220, 150) or Color3.fromRGB(255, 120, 120)
end)

UserInputService.InputBegan:Connect(function(input, processed)
	if processed then
		return
	end
	if input.KeyCode == Enum.KeyCode.M then
		setOpen(not frame.Visible)
	end
end)

print("[Bluebird Primary School] Merit UI ready — Positive / Bad toggle")
