import moment from "moment";
import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, CommandInteraction, MessageEmbed } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { RowDataPacket } from "mysql2/promise";
import { EMBED_COLOR } from "../utils/config.js";
import { Database, DataCollector } from "../utils/data.js";
import { List } from "./list.js";
import { Category } from "@discordx/utilities";
import { InteractionUtils } from "../utils/interaction.js";
import { Logger } from "../utils/logger.js";

@Discord()
@Category("SFD Commands")
export abstract class Post {
  private static posts: ApplicationCommandOptionChoiceData[];

  public static initPosts(): void {
    Logger.LogDebug("Fetching posts...");
    Post.posts = DataCollector.getDatabasePosts().map(e => ({ name: e.Title, value: e.Title }));
  }

  @Slash("post", { description: "Select a post you want to read" })
  private async post(@SlashOption("category", {
    description: "Name of the category",
    autocomplete: async (interaction: AutocompleteInteraction) => {
      await interaction.respond(List.getCategories());
    },
    type: "STRING"
  }) @SlashOption("post", {
    description: "Name of the post",
    autocomplete: async (interaction: AutocompleteInteraction) => {
      await interaction.respond(Post.posts.filter(p => DataCollector.getDatabasePosts().some(d => d.Description === interaction.options.getString("category") && d.Title === p.name)));
    },
    type: "STRING"
  }) category: string, title: string, interaction: CommandInteraction): Promise<void> {
    const rows = await Database.query<RowDataPacket[]>("SELECT DISTINCT title, content, date FROM post JOIN category ON id_category = category.id WHERE description=? AND title=?", category, title);
    if (rows.length === 0) {
      await InteractionUtils.replyOrFollowUp(interaction, { content: "No posts with this title", ephemeral: true });
    } else {
      let embed = new MessageEmbed().setColor(EMBED_COLOR).setTitle(`${category} - ${rows[0].title}`).setDescription("```" + rows[0].content + "```");
      if (rows[0].date !== null) embed.setFooter({ text: moment(rows[0].date).format("YYYY/MM/DD") });

      await InteractionUtils.replyOrFollowUp(interaction, {
        embeds: [embed]
      });
    }
  }
}