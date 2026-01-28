import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { infoEmbed } from "../ui/embeds";
import { CommandRegistry } from "../core/commandRegistry";
import { PrismaClient } from "@prisma/client";

export const data = new SlashCommandBuilder()
  .setName("features")
  .setDescription("See all features, free vs premium");

// Optional: Inject registry for permission/premium checks
export async function execute(interaction: ChatInputCommandInteraction) {
  const prisma = new PrismaClient();
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  let subscription;
  try {
    subscription = await prisma.subscription.findUnique({
      where: { guildId },
    });
  } catch (err) {
    console.error("Failed to fetch subscription:", err);
  }

  const tier = subscription?.tier || "FREE";

  const description =
    "**Discord Governor — Features**\n\n" +
    "**🆓 Free Tier**\n" +
    "• Basic governance commands: `/help`, `/about`\n" +
    "• Permission-verified execution\n" +
    "• Basic audit logs\n" +
    "• Standard rate limits\n\n" +
    "**💎 Premium Tier**\n" +
    "• Advanced role & authority control\n" +
    "• Extended audit history\n" +
    "• Higher execution & rate limits\n" +
    "• Premium-only governance modules\n" +
    "• Priority support & feature updates\n\n" +
    `Your current tier: **${tier}**\n` +
    "Use `/pricing` to upgrade and unlock full server potential.";

  await interaction.reply({
    embeds: [infoEmbed("Features Overview", description)],
    ephemeral: true,
  });
}
