import { Category } from "@discordx/utilities";
import { CommandInteraction, Message, MessageActionRow, MessageEditOptions, ModalActionRowComponent, ModalSubmitInteraction, TextInputComponent } from "discord.js";
import { Discord, Guard, ModalComponent, Slash } from "discordx";
import { RequiredPerms } from "../guards/required-perms.js";
import { InteractionUtils } from "../utils/interaction.js";
import { Logger } from "../utils/logger.js";
import { MessageUtils } from "../utils/message.js";

@Discord()
@Category("Management Commands")
abstract class EditMessage {
  @Slash("edit-message", { description: "Edit Mytho's message" })
  @Guard(RequiredPerms({
    textChannel: ["VIEW_CHANNEL", "SEND_MESSAGES"]
  }))
  private async editMessage(interaction: CommandInteraction): Promise<void> {
    const modal = MessageUtils.createMessageModal("Edit Message", "EditMessageForm");
    modal.addComponents(new MessageActionRow<ModalActionRowComponent>().addComponents(new TextInputComponent()
      .setCustomId("idField")
      .setLabel("Message ID")
      .setStyle("SHORT")
      .setMinLength(18)
      .setMaxLength(18)
      .setRequired(true)
    ));
    await interaction.showModal(modal);
  }

  @ModalComponent("EditMessageForm")
  private async handle(interaction: ModalSubmitInteraction): Promise<void> {
    Logger.LogDebug("Handling edit-message");
    const [message, title, description, meta, id] = ["messageField", "titleField", "descriptionField", "metaField", "idField"].map((id) =>
      interaction.fields.getTextInputValue(id)
    );

    let targetMessage: Message<boolean> | undefined;
    try {
      targetMessage = await interaction.channel?.messages.fetch(id);
    } catch (e) {
      Logger.LogWarn(`Couldn't fetch message with given ID (${e})`);
      return await InteractionUtils.replyOrFollowUp(interaction, {
        content: "Couldn't find message with given ID, or you are in the wrong channel",
        ephemeral: true
      });
    }
    if (!targetMessage?.editable) {
      await InteractionUtils.replyOrFollowUp(interaction, { content: "Can't edit this message", ephemeral: true });
    } else {
      const messageEditOptions = MessageUtils.assembleMessage(message, title, description, meta) as MessageEditOptions;

      if (Object.keys(messageEditOptions).length > 0) {
        await targetMessage?.edit(messageEditOptions);
        await InteractionUtils.replyOrFollowUp(interaction, { content: "Message edited", ephemeral: true });
      } else {
        await InteractionUtils.replyOrFollowUp(interaction, { content: "Fill the form", ephemeral: true });
      }
    }
  }
}