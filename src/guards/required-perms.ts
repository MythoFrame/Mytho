import { Client, CommandInteraction, Formatters, GuildChannel, GuildMember, MessageEmbed } from "discord.js";
import { GuardFunction, Next } from "discordx";
import type { PermissionsType } from "@discordx/utilities";
import { InteractionUtils } from "../utils/interaction.js";

/**
 * This ensures the bot has the required permissions to execute the command
 */
export function RequiredPerms(permissions: {
  textChannel: PermissionsType;
  /**
   * Add voice permissions, setting this will do 3 things
   * 1. it will ensure the member calling this is in a voice channel
   * 2: it will enforce the bot has the correct permissions supplied in the voice channel the member is in
   * 3: it will ensure the voice channel is joinable and not full
   */
  voice?: PermissionsType;
}): GuardFunction<CommandInteraction> {
  return async function (arg: CommandInteraction, client: Client, next: Next): Promise<unknown> {
    const channel = arg.channel;
    if (!(channel instanceof GuildChannel) || !arg.inGuild()) {
      return next();
    }
    const guild = arg.guild;
    const perms = typeof permissions.textChannel === "function" ? await permissions.textChannel(arg) : permissions.textChannel;
    if (!channel.permissionsFor(guild?.me!).has(perms)) {
      return InteractionUtils.replyOrFollowUp(
        arg,
        { content: `Mytho doesn't have the required permissions to perform the action in this channel. Please enable "${perms.join(", ")}" under channel permissions for Mytho`, ephemeral: true }
      );
    }

    if (permissions.voice) {
      const voicePerms = typeof permissions.voice === "function" ? await permissions.voice(arg) : permissions.voice;
      const member = arg.member;
      if (member instanceof GuildMember) {
        const voiceChannel = member?.voice?.channel;
        if (voiceChannel) {
          if (!voiceChannel.permissionsFor(guild?.me!).has(voicePerms)) {
            return InteractionUtils.replyOrFollowUp(
              arg,
              {
                content: `Mytho doesn't have permissions to connect and/or to speak in your voice channel. Please enable "${voicePerms.join(", ")}" under channel permissions for Mytho.`,
                ephemeral: true
              }
            );
          }
          if (!voiceChannel.joinable) {
            const embed = new MessageEmbed()
              .setTitle(Formatters.inlineCode(arg.commandName))
              .setColor("#ff0000")
              .setDescription(`${member}, Mytho is unable to join the voice channel as it is already full.`)
              .setFooter({
                text: `${client?.user!.username} • This is not a source for official briefing • Please use the appropriate forums`
              })
              .setTimestamp();
            return InteractionUtils.replyOrFollowUp(arg, {
              embeds: [embed],
              ephemeral: true
            });
          }
        } else {
          const embed = new MessageEmbed()
            .setTitle(Formatters.inlineCode(arg.commandName))
            .setColor("#ff0000")
            .setDescription(`${member}, you need to join a voice channel first.`)
            .setFooter({
              text: `${client?.user!.username} • This is not a source for official briefing • Please use the appropriate forums`
            })
            .setTimestamp();
          return InteractionUtils.replyOrFollowUp(arg, {
            embeds: [embed],
            ephemeral: true
          });
        }
      }
    }
    return next();
  };
}