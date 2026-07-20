import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, ButtonInteraction, CommandInteraction, MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import { ButtonComponent, Discord, Slash, SlashOption } from "discordx";
import { RowDataPacket } from "mysql2/promise";
import { EMBED_COLOR, MAX_INTERACTIVE_MESSAGES } from "../utils/config.js";
import { Database, DataCollector } from "../utils/data.js";
import { Category } from "@discordx/utilities";
import { InteractionUtils } from "../utils/interaction.js";
import { Logger } from "../utils/logger.js";

@Discord()
@Category("SFD Commands")
export abstract class List {
  public static categories: ApplicationCommandOptionChoiceData[];
  private interactiveMessages = new Map<string, InteractiveMessage>();

  public static initCategories(): void {
    Logger.LogDebug("Fetching categories...");
    const uniqueIds = new Set();
    List.categories = DataCollector.getDatabasePosts().filter(element => {
      const isDuplicate = uniqueIds.has(element.Description);

      if (!isDuplicate) {
        uniqueIds.add(element.Description);
        return true;
      }

      return false;
    }).map(e => ({ name: e.Description, value: e.Description }));
  }

  public static getCategories(): ApplicationCommandOptionChoiceData[] {
    return List.categories;
  }

  @ButtonComponent("next-btn")
  private async nextButton(interaction: ButtonInteraction) {
    let embed = this.interactiveMessages.get(interaction.message.id);
    if (embed === undefined) return;
    embed.counter = embed.counter < embed.content.length - 1 ? embed.counter + 1 : 0;

    await interaction.update({
      embeds: [new MessageEmbed()
        .setColor(EMBED_COLOR)
        .setTitle(embed.title)
        .setDescription("```" + embed.content[embed.counter] + "```")]
    });

    this.interactiveMessages.set(interaction.message.id, embed);
  }

  @ButtonComponent("previous-btn")
  private async previousButton(interaction: ButtonInteraction) {
    let embed = this.interactiveMessages.get(interaction.message.id);
    if (embed === undefined) return;
    embed.counter = embed.counter > 0 ? embed.counter - 1 : embed.content.length - 1;

    await interaction.update({
      embeds: [new MessageEmbed()
        .setColor(EMBED_COLOR)
        .setTitle(embed.title)
        .setDescription("```" + embed.content[embed.counter] + "```")]
    });

    this.interactiveMessages.set(interaction.message.id, embed);
  }

  @Slash("list", { description: "Get a list of available categories or posts" })
  private async list(@SlashOption("category", {
    description: "Name of the category",
    autocomplete: async (interaction: AutocompleteInteraction) => {
      await interaction.respond(List.categories);
    },
    type: "STRING",
    required: false
  }) category: string, interaction: CommandInteraction): Promise<void> {
    let title, content;
    if (category === undefined) {
      title = "Categories";
      const temp: string[] = [];
      const rows = await Database.query<RowDataPacket[]>("SELECT description FROM category ORDER BY description");
      for (let i = 0; i < rows.length; i++) {
        temp.push(`${rows[i].description}`);
      }

      content = temp.join("\n").match(/(?=[\s\S])(?:.*\n?){1,10}/g);
    } else {
      title = `Posts for ${category}`;
      const temp: string[] = [];
      const rows = await Database.query<RowDataPacket[]>("SELECT title FROM post JOIN category ON id_category = category.id WHERE description=? ORDER BY title", category);
      for (let i = 0; i < rows.length; i++) {
        temp.push(`${i + 1}: ${rows[i].title}`);
      }

      content = temp.join("\n").match(/(?=[\s\S])(?:.*\n?){1,15}/g);
    }

    if (content === null || content.length === 0) {
      await InteractionUtils.replyOrFollowUp(interaction, { content: "No category with this title", ephemeral: true });
    } else {
      const next = new MessageButton()
        .setLabel("Next")
        .setStyle("PRIMARY")
        .setCustomId("next-btn");

      const previous = new MessageButton()
        .setLabel("Previous")
        .setStyle("PRIMARY")
        .setCustomId("previous-btn");

      const row = new MessageActionRow().addComponents(previous, next);

      await InteractionUtils.replyOrFollowUp(interaction, {
        embeds: [
          new MessageEmbed()
            .setColor(EMBED_COLOR)
            .setTitle(title)
            .setDescription("```" + content[0] + "```")
        ],
        components: [row]
      });

      const message = await interaction.fetchReply();
      this.interactiveMessages.set(message.id, { counter: 0, content: content, title: title });
      if (this.interactiveMessages.size > MAX_INTERACTIVE_MESSAGES) {
        const [firstKey] = this.interactiveMessages.keys();
        this.interactiveMessages.delete(firstKey);
      }
    }
  }
}

interface InteractiveMessage {
  counter: number,
  content: string[],
  title: string
}