import "reflect-metadata";
import path from "path";
import { Intents, Interaction } from "discord.js";
import { Client } from "discordx";
import { dirname, importx } from "@discordx/importer";
import { Database, DataCollector } from "./utils/data.js";
import { Logger } from "./utils/logger.js";

const bot = new Client({
  intents: [Intents.FLAGS.GUILDS],
  botGuilds: process.env.RELEASE ? undefined : [(client) => client.guilds.cache.map((guild) => guild.id)]
});

bot.once("ready", async (): Promise<void> => {
  await bot.guilds.fetch();

  if (process.env.RELEASE) {
    await bot.clearApplicationCommands(...bot.guilds.cache.map((g) => g.id));
    await bot.initGlobalApplicationCommands({ log: true });
    Logger.LogInfo(`GUILDS: ${bot.guilds.cache.map(guild => `${guild.name}(${guild.id})`).join(", ")}`);
  } else {
    await bot.initApplicationCommands({
      global: { log: true }, guild: { log: true }
    });
  }

  await DataCollector.startCollectingData();
  Logger.LogInfo("Mytho is ONLINE");
});

bot.on("interactionCreate", async (interaction: Interaction): Promise<void> => {
  if (!interaction.isCommand || !interaction.isRepliable) return;
  try {
    await bot.executeInteraction(interaction);
  } catch (e) {
    Logger.LogError(`FATAL ERROR (${e})`);
  }
});

async function run(): Promise<void> {
  await Database.connect("mytho");
  await importx(path.join(dirname(import.meta.url), "/{sfd,management}/**/*.{ts,js}").replaceAll("\\", "/"));
  if (!process.env.BOT_TOKEN) {
    throw Error("Missing TOKEN");
  }

  await bot.login(process.env.BOT_TOKEN);
}

await run();