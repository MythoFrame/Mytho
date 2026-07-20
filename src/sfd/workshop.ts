import moment from "moment";
import fetch from "node-fetch";
import truncate from "truncate";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { Discord, Slash, SlashOption } from "discordx";
import { EMBED_COLOR } from "../utils/config.js";
import { Category } from "@discordx/utilities";
import { InteractionUtils } from "../utils/interaction.js";
import { Logger } from "../utils/logger.js";

@Discord()
@Category("SFD Commands")
abstract class Workshop {
  @Slash("workshop", { description: "Search for an item in the workshop" })
  private async workshop(@SlashOption("name", { description: "Name of the item to search" }) name: string, interaction: CommandInteraction): Promise<void> {
    if (!process.env.STEAM_KEY) {
      return await InteractionUtils.replyOrFollowUp(interaction, { content: "Missing Steam Key", ephemeral: true });
    }
    await interaction.deferReply();
    const response = await fetch("https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/?" + new URLSearchParams({
      key: process.env.STEAM_KEY,
      appid: "855860",
      creator_appid: "855860",
      return_playtime_stats: "1",
      search_text: name
    }), {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      Logger.LogWarn(`Error while retrieving this item from workshop (${response.status})`);
      return await InteractionUtils.replyOrFollowUp(interaction, "There was an error connecting to Steam");
    }
    let item: any = await response.json();
    if (!item.response.publishedfiledetails) {
      return await InteractionUtils.replyOrFollowUp(interaction, `Can't find this item`);
    }
    item = item.response.publishedfiledetails[0];
    await InteractionUtils.replyOrFollowUp(interaction, {
      embeds: [
        new MessageEmbed()
          .setColor(EMBED_COLOR)
          .setTitle(item.title)
          .setDescription(truncate(item.file_description, 350))
          .setImage(item.preview_url)
          .setFooter({ text: moment(item.time_created * 1000).format("YYYY/MM/DD") + `\nViews: ${item.views} | Subscription: ${item.subscriptions}` })
          .setURL(`https://steamcommunity.com/sharedfiles/filedetails/?id=${item.publishedfileid}/`)
      ]
    });
  }
}