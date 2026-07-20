import { ColorResolvable, MessageActionRow, MessageEditOptions, MessageEmbed, MessageOptions, Modal, ModalActionRowComponent, TextInputComponent } from "discord.js";

export abstract class MessageUtils {
  public static createMessageModal(modalTitle: string, modalId: string) {
    const modal = new Modal()
      .setTitle(modalTitle)
      .setCustomId(modalId);

    const messageComponent = new MessageActionRow<ModalActionRowComponent>().addComponents(new TextInputComponent()
      .setCustomId("messageField")
      .setLabel("Message Content")
      .setStyle("PARAGRAPH")
      .setMaxLength(2000)
    );

    const titleComponent = new MessageActionRow<ModalActionRowComponent>().addComponents(new TextInputComponent()
      .setCustomId("titleField")
      .setLabel("Title of the embed")
      .setStyle("SHORT")
      .setMaxLength(256)
    );

    const descriptionComponent = new MessageActionRow<ModalActionRowComponent>().addComponents(new TextInputComponent()
      .setCustomId("descriptionField")
      .setLabel("Write down your description")
      .setStyle("PARAGRAPH")
    );

    const metaComponent = new MessageActionRow<ModalActionRowComponent>().addComponents(new TextInputComponent()
      .setCustomId("metaField")
      .setLabel("Meta (footer$color)")
      .setStyle("SHORT")
      .setMaxLength(80)
    );

    return modal.addComponents(messageComponent, titleComponent, descriptionComponent, metaComponent);
  }

  public static checkHexColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  public static assembleMessage(message: string, title: string, description: string, meta: string): MessageOptions | MessageEditOptions {
    let embed: MessageEmbed | undefined;
    if (title && description) {
      embed = new MessageEmbed().setTitle(title).setDescription(description);
      if (meta) {
        const [footer, color] = meta.split("$")
        if (footer) embed.setFooter({ text: footer });
        if (color && MessageUtils.checkHexColor(color)) embed.setColor(color as ColorResolvable);
      }
    }

    let messageOptions: MessageOptions | MessageEditOptions = {};
    messageOptions.content = message ? message : null;
    if (embed !== undefined) messageOptions.embeds = [embed];
    return messageOptions;
  }
}