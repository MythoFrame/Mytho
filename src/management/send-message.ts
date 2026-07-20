import { Category } from "@discordx/utilities";
import { CommandInteraction, MessageOptions, ModalSubmitInteraction } from "discord.js";
import { Discord, Guard, ModalComponent, Slash } from "discordx";
import { RequiredPerms } from "../guards/required-perms.js";
import { InteractionUtils } from "../utils/interaction.js";
import { Logger } from "../utils/logger.js";
import { MessageUtils } from "../utils/message.js";

@Discord()
@Category("Management Commands")
abstract class SendMessage {
  @Slash("send-message", { description: "Send a message" })
  @Guard(RequiredPerms({
    textChannel: ["VIEW_CHANNEL", "SEND_MESSAGES"]
  }))
  private async sendMessage(interaction: CommandInteraction): Promise<void> {
    await interaction.showModal(MessageUtils.createMessageModal("Send Message", "SendMessageForm"));
  }

  @ModalComponent("SendMessageForm")
  private async handle(interaction: ModalSubmitInteraction): Promise<void> {
    Logger.LogDebug("Handling send-message");
    const [message, title, description, meta] = ["messageField", "titleField", "descriptionField", "metaField"].map((id) =>
      interaction.fields.getTextInputValue(id)
    );

    const messageOptions = MessageUtils.assembleMessage(message, title, description, meta) as MessageOptions;

    if (Object.keys(messageOptions).length > 0) {
      await interaction.channel?.send(messageOptions);
      await InteractionUtils.replyOrFollowUp(interaction, { content: "Message sent", ephemeral: true });
    } else {
      await InteractionUtils.replyOrFollowUp(interaction, { content: "Fill the form", ephemeral: true });
    }
  }
}