/* =========================================================
   /HELP COMMAND
   ---------------------------------------------------------
   - Auto-generated from command registry
   - Shows locked commands with reasons
   - Premium-aware & authority-aware
   - DM & Guild compatible
   ========================================================= */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionsBitField
} from "discord.js"
import {
  groupCommandsByCategory,
  CommandCategory,
  CommandDefinition
} from "../core/commandRegistry"
import { resolveAuthority } from "../authority/authorityGuard"
import { checkSubscription } from "../subscription/subscriptionGuard"
import { SubscriptionTier } from "@prisma/client"

/* =========================================================
   COMMAND HANDLER
   ========================================================= */

export async function handleHelpCommand(
  interaction: ChatInputCommandInteraction
) {
  const isGuild = !!interaction.guild
  const userId = interaction.user.id
  const guildId = interaction.guild?.id

  const categories = groupCommandsByCategory()
  const embeds: EmbedBuilder[] = []

  for (const category of Object.values(CommandCategory)) {
    const commands = categories[category]
    if (!commands || commands.length === 0) continue

    const embed = new EmbedBuilder()
      .setTitle(`📘 ${category}`)
      .setColor(0x5865f2)

    let description = ""

    for (const cmd of commands) {
      const status = await getCommandStatus(
        interaction,
        cmd,
        isGuild,
        userId,
        guildId
      )

      description += formatCommandLine(cmd, status)
    }

    embed.setDescription(description || "_No commands available_")
    embeds.push(embed)
  }

  await interaction.reply({
    embeds,
    ephemeral: true
  })
}

/* =========================================================
   COMMAND STATUS RESOLUTION
   ========================================================= */

async function getCommandStatus(
  interaction: ChatInputCommandInteraction,
  command: CommandDefinition,
  isGuild: boolean,
  userId: string,
  guildId?: string
): Promise<{
  locked: boolean
  reason?: string
}> {
  // Context checks
  if (command.context?.guildOnly && !isGuild) {
    return { locked: true, reason: "Server only command" }
  }

  if (command.context?.dmAllowed === false && !isGuild) {
    return { locked: true, reason: "Not available in DMs" }
  }

  // Authority checks (guild only)
  if (isGuild && command.requiredCapability && interaction.member) {
    const authority = await resolveAuthority({
      guildId: guildId!,
      userId,
      member: interaction.member as any,
      requiredCapability: command.requiredCapability
    })

    if (!authority.allowed) {
      return { locked: true, reason: authority.reason }
    }
  }

  // Subscription checks
  if (command.requiredTier && command.requiredTier !== SubscriptionTier.FREE) {
    const sub = await checkSubscription({
      guildId: guildId ?? "DM",
      userId,
      requiredTier: command.requiredTier
    })

    if (!sub.allowed) {
      return {
        locked: true,
        reason: `Requires ${command.requiredTier} plan`
      }
    }
  }

  return { locked: false }
}

/* =========================================================
   RENDERING
   ========================================================= */

function formatCommandLine(
  command: CommandDefinition,
  status: { locked: boolean; reason?: string }
): string {
  let line = `**/${command.name}** — ${command.description}`

  if (status.locked) {
    line += ` 🔒 _${status.reason}_`
  }

  line += "\n"
  return line
}
