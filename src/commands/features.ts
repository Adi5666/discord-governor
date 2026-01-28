/* =========================================================
   /FEATURES COMMAND
   ---------------------------------------------------------
   - Shows free vs premium features
   - Auto-derived from command registry
   - Explains tier requirements clearly
   - SaaS-grade discoverability
   ========================================================= */

import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import {
  COMMAND_REGISTRY,
  CommandCategory,
  CommandDefinition
} from "../core/commandRegistry"
import { SubscriptionTier } from "@prisma/client"
import { checkSubscription } from "../subscription/subscriptionGuard"

/* =========================================================
   COMMAND HANDLER
   ========================================================= */

export async function handleFeaturesCommand(
  interaction: ChatInputCommandInteraction
) {
  const userId = interaction.user.id
  const guildId = interaction.guild?.id ?? "DM"

  const embeds: EmbedBuilder[] = []

  for (const category of Object.values(CommandCategory)) {
    const commands = COMMAND_REGISTRY.filter(
      c => c.category === category && !c.hidden
    )

    if (commands.length === 0) continue

    const embed = new EmbedBuilder()
      .setTitle(`✨ ${category} Features`)
      .setColor(0x5865f2)

    let description = ""

    for (const command of commands) {
      const status = await getFeatureStatus(
        command,
        userId,
        guildId
      )
      description += formatFeatureLine(command, status)
    }

    embed.setDescription(description)
    embeds.push(embed)
  }

  embeds.push(
    new EmbedBuilder()
      .setTitle("💎 Want more power?")
      .setDescription(
        [
          "Upgrade to unlock advanced security, moderation, and control.",
          "",
          "👉 Use **/pricing** to compare plans",
          "👉 Manage everything from the dashboard",
          "",
          "_Transparent pricing • Cancel anytime_"
        ].join("\n")
      )
      .setColor(0x57f287)
  )

  await interaction.reply({
    embeds,
    ephemeral: true
  })
}

/* =========================================================
   FEATURE STATUS
   ========================================================= */

async function getFeatureStatus(
  command: CommandDefinition,
  userId: string,
  guildId: string
): Promise<{
  locked: boolean
  reason?: string
}> {
  if (
    !command.requiredTier ||
    command.requiredTier === SubscriptionTier.FREE
  ) {
    return { locked: false }
  }

  const sub = await checkSubscription({
    guildId,
    userId,
    requiredTier: command.requiredTier
  })

  if (!sub.allowed) {
    return {
      locked: true,
      reason: `${command.requiredTier} plan`
    }
  }

  return { locked: false }
}

/* =========================================================
   RENDERING
   ========================================================= */

function formatFeatureLine(
  command: CommandDefinition,
  status: { locked: boolean; reason?: string }
): string {
  let line = `• **${command.name}** — ${command.description}`

  if (status.locked) {
    line += ` 🔒 _Requires ${status.reason}_`
  }

  line += "\n"
  return line
}
