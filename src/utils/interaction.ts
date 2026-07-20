import { BaseCommandInteraction, InteractionReplyOptions, MessageComponentInteraction, ModalSubmitInteraction } from "discord.js";

/**
 * Automatically choose the correct way to reply to an interaction
 */
export abstract class InteractionUtils {
  public static async replyOrFollowUp(interaction: BaseCommandInteraction | MessageComponentInteraction | ModalSubmitInteraction, replyOptions: (InteractionReplyOptions & { ephemeral?: boolean }) | string): Promise<void> {
    // if interaction is already replied
    if (interaction.replied) {
      await interaction.followUp(replyOptions);
      return;
    }

    // if interaction is deferred but not replied
    if (interaction.deferred) {
      await interaction.editReply(replyOptions);
      return;
    }

    // if interaction is not handled yet
    await interaction.reply(replyOptions);
  }
}