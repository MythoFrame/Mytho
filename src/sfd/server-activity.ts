import { CommandInteraction, MessageEmbed } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { RowDataPacket } from "mysql2/promise";
import { Database, DataCollector } from "../utils/data.js";
import { EMBED_COLOR } from "../utils/config.js";
import { Category } from "@discordx/utilities";
import { InteractionUtils } from "../utils/interaction.js";
import moment from "moment";

@Discord()
@Category("SFD Commands")
abstract class ServerActivity {
  @Slash("server-activity", { description: "List most played servers" })
  private async serverActivity(@SlashOption("name", {
    description: "Exact name of the server",
    required: false
  }) name: string, interaction: CommandInteraction): Promise<void> {
    await interaction.deferReply();
    let allTime: number = 0;
    let week: number = 0;

    if (name === undefined) {
      const data = new Map<string, number>();
      const time = moment(Date.now() - 604800000).format("YYYY-MM-DD HH:mm:ss");
      const rows = await Database.query<RowDataPacket[]>("SELECT * FROM server JOIN log ON id_log = log.id where log.timestamp > ?", time);
      for (const point of rows) {
        data.set(point.title, point.players + data.get(point.title) || 0);
      }

      const activity: Map<string, string> = DataCollector.calculateActivity(data, 20);

      await InteractionUtils.replyOrFollowUp(interaction, {
        embeds: [
          new MessageEmbed()
            .setColor(EMBED_COLOR)
            .setTitle("Top servers this week")
            .addField("Server", [...activity.keys()].join("\n"), true)
            .addField("Playtime", [...activity.values()].join("\n"), true)
        ]
      });
    } else {
      const rows = await Database.query<RowDataPacket[]>("SELECT * FROM server JOIN log ON id_log = log.id WHERE title=?", name);
      for (const point of rows) {
        allTime += point.players;
        if (point.timestamp > Date.now() - 604800000) {
          week += point.players;
        }
      }

      if (rows.length === 0) {
        await InteractionUtils.replyOrFollowUp(interaction, "Unable to find server activity");
      } else {
        await InteractionUtils.replyOrFollowUp(interaction, {
          embeds: [
            new MessageEmbed()
              .setColor(EMBED_COLOR)
              .setTitle(name + ": collective playtime")
              .setDescription("\nThis week: " + (week > 60 ? Math.floor(week / 60) + "h " + (week % 60) + "m" : week + "m") + "\nTotal: " + (allTime > 60 ? Math.floor(allTime / 60) + "h " + (allTime % 60) + "m" : allTime + "m"))
          ]
        });
      }
    }
  }
}