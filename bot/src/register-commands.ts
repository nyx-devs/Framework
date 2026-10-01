/**
 * Register slash commands with Discord (run once after changing definitions).
 *   cd bot && npm run register
 */
import "./load-env.js";
import { REST, Routes } from "discord.js";
import { commandDefinitions } from "./commands/definitions.js";

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error("DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID are required");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

async function main() {
  console.log(`Registering ${commandDefinitions.length} commands…`);

  if (guildId) {
    // Fast guild-scoped registration (recommended for development)
    await rest.put(Routes.applicationGuildCommands(clientId!, guildId), {
      body: commandDefinitions,
    });
    console.log(`Guild commands registered for guild ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId!), {
      body: commandDefinitions,
    });
    console.log("Global commands registered (may take up to 1 hour to appear)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
