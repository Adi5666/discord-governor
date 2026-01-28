import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { infoEmbed } from "../ui/embeds";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("View commands, features, and how to use Discord Governor");

export async function execute(
  interaction: ChatInputCommandInteraction
) {
  const description =
    "**Discord Governor** helps you manage servers with\n" +
    "authority, transparency, and premium-grade controls.\n\n" +

    "**📌 Core Commands**\n" +
    "• `/help` — View commands & usage\n" +
    "• `/about` — Bot status & information\n" +
    "• `/features` — Feature breakdown\n" +
    "• `/pricing` — Premium plans & benefits\n\n" +

    "**🛡 Governance & Security**\n" +
    "• Permission-verified actions\n" +
    "• Immutable audit logs\n" +
    "• Abuse & rate-limit protection\n\n" +

    "**💎 Premium Servers Unlock**\n" +
    "• Higher limits\n" +
    "• Advanced controls\n" +
    "• Priority stability & support\n\n" +

    "**➡️ Get Started**\n" +
    "Server owners should review `/pricing` to unlock full power.";

  await interaction.reply({
    embeds: [
      infoEmbed("Discord Governor — Help", description),
    ],
    ephemeral: true,
  });
}
