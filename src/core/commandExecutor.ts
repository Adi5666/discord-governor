/* =========================================================
   COMMAND EXECUTOR — SINGLE SOURCE OF TRUTH
   ---------------------------------------------------------
   - Wraps every command
   - Enforces permission + subscription + rate limits
   - Handles UX, errors, and logging
   ========================================================= */

import {
  ChatInputCommandInteraction,
  EmbedBuilder
} from "discord.js"

import {
  enforceSubscription
} from "../subscription/subscriptionEnforcer"

import {
  CommandDefinition
} from "./commandRegistry"

/* =========================================================
   EXECUTOR
   ========================================================= */

export async function executeCommand(
  interaction: ChatInputCommandInteraction,
  command: CommandDefinition
) {
  try {
    /* ---------------------------------------------
       ENFORCEMENT GATE
       --------------------------------------------- */

    const enforcement = await enforceSubscription({
      interaction,
      requiredTier: command.requiredTier,
      requiredRole: command.requiredRole
    })

    if (!enforcement.allowed) {
      return await interaction.reply({
        embeds: [buildBlockedEmbed(enforcement.reason)],
        ephemeral: true
      })
    }

    /* ---------------------------------------------
       EXECUTE COMMAND
       --------------------------------------------- */

    await command.execute(interaction)

  } catch (error) {
    console.error(
      `[COMMAND ERROR] ${interaction.commandName}`,
      error
    )

    const embed = new EmbedBuilder()
      .setTitle("⚠️ Something went wrong")
      .setDescription(
        "An unexpected error occurred while running this command.\n" +
        "Our system has logged it automatically."
      )
      .setColor(0xed4245)

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        embeds: [embed],
        ephemeral: true
      })
    } else {
      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      })
    }
  }
}

/* =========================================================
   BLOCKED / PREMIUM EMBED
   ========================================================= */

function buildBlockedEmbed(reason?: string) {
  const embed = new EmbedBuilder()
    .setTitle("🔒 Action restricted")
    .setColor(0xfaa61a)

  if (reason?.includes("plan")) {
    embed.setDescription(
      [
        "This feature is part of a premium plan.",
        "",
        `**Required:** ${reason}`,
        "",
        "👉 Use **/pricing** to view plans",
        "👉 Upgrade anytime — instant access"
      ].join("\n")
    )
  } else if (reason?.includes("Rate limit")) {
    embed.setDescription(
      [
        "You’re doing that too fast.",
        "",
        reason,
        "",
        "_Premium plans get higher limits._"
      ].join("\n")
    )
  } else {
    embed.setDescription(
      reason ?? "You are not allowed to perform this action."
    )
  }

  return embed
}
