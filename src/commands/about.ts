import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { infoEmbed } from "../ui/embeds";

export const data = new SlashCommandBuilder()
  .setName("about")
  .setDescription("Learn about Discord Governor, its status and purpose");

export async function execute(
  interaction: ChatInputCommandInteraction
) {
  const uptimeSeconds = Math.floor(process.uptime());
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  const description =
    "**Discord Governor** is a professional-grade governance bot built for\n" +
    "secure role management, audit logging, and subscription-based control.\n\n" +
    "**🔒 Security First**\n" +
    "• Permission-verified execution\n" +
    "• Immutable audit logs\n" +
    "• Abuse & rate-limit protection\n\n" +
    "**⚙️ Reliability**\n" +
    `• Uptime: **${hours}h ${minutes}m**\n` +
    "• Automatic crash recovery\n" +
    "• Hosted on managed infrastructure\n\n" +
    "**💎 Premium Ready**\n" +
    "• Tier-based feature access\n" +
    "• Server-scoped subscriptions\n" +
    "• Enterprise-grade architecture";

  await interaction.reply({
    embeds: [
      infoEmbed("About Discord Governor", description),
    ],
    ephemeral: true,
  });
}
