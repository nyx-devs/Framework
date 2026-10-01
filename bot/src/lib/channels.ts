/** Discord channel IDs — override with env if needed */

/** Public: apply embed */
export const APPLY_CHANNEL_ID =
  process.env.DISCORD_APPLY_CHANNEL_ID || "1554212036987191386";

/** Decisions: @everyone accept / reject announcements */
export const DECISIONS_CHANNEL_ID =
  process.env.DISCORD_DECISIONS_CHANNEL_ID || "1554225870376276030";

/**
 * Staff database intake — accepted applicants see instructions
 * and can open the fill-out form here.
 */
export const DATABASE_CHANNEL_ID =
  process.env.DISCORD_DATABASE_CHANNEL_ID ||
  process.env.DISCORD_STAFF_DB_CHANNEL_ID ||
  "1554225870376276030";

/**
 * HT+ review — new database entries land here for approval.
 */
export const HT_REVIEW_CHANNEL_ID =
  process.env.DISCORD_HT_REVIEW_CHANNEL_ID ||
  process.env.DISCORD_STAFF_DB_CHANNEL_ID ||
  DATABASE_CHANNEL_ID;
