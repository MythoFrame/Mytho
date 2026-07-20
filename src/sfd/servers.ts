import truncate from "truncate";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { Discord, Slash } from "discordx";
import { DataCollector } from "../utils/data.js";
import { EMBED_COLOR } from "../utils/config.js";
import { Category } from "@discordx/utilities";
import { InteractionUtils } from "../utils/interaction.js";

@Discord()
@Category("SFD Commands")
abstract class Servers {
  @Slash("servers", { description: "Show available servers in SFD" })
  private async servers(interaction: CommandInteraction): Promise<void> {
    await interaction.deferReply();
    const { servers, totalPlayers } = await DataCollector.getServers();

    await InteractionUtils.replyOrFollowUp(interaction, {
      embeds: [
        new MessageEmbed()
          .setColor(EMBED_COLOR)
          .setTitle("Available Servers")
          .addField("Servers", servers.map(s => s.GameName).join("\n"), true)
          .addField("Current Map", servers.map(m => truncate(m.MapName, 28)).join("\n"), true)
          .addField("Players", servers.map(p => `${p.Players}${p.Bots > 0 ? `(+${p.Bots})` : ""}/${p.MaxPlayers}`).join("\n"), true)
          .setFooter({ text: `Total Players: ${totalPlayers}` })
      ]
    });
  }
}