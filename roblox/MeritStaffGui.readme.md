# In-game staff merit UI

1. Put `MeritService.server.lua` in **ServerScriptService** (configure API_BASE + API_KEY).
2. Enable **HttpService** in Game Settings → Security.
3. Build a ScreenGui for staff only (check group rank or a server attribute `IsStaff`).
4. On confirm, fire a RemoteEvent to the server; the server calls `MeritService.Award`.
5. Never send the API key to the client.

Suggested RemoteEvent payload: `{ targetUserId, amount, reason }`.
