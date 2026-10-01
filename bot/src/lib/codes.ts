import { randomInt } from "crypto";
import { getSupabase } from "./supabase.js";

/** Generate a short link code for Discord ↔ Ro-School verification. */
export async function createLinkCode(discordUserId: string): Promise<string> {
  const sb = getSupabase();
  const code = String(randomInt(100000, 999999));
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await sb.from("integration_events").insert({
    event_type: "discord_link_code",
    status: "pending",
    payload: {
      code,
      discord_user_id: discordUserId,
      expires_at: expires,
      provider: "discord",
    },
  });

  return code;
}
