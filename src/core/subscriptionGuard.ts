/**
 * subscriptionGuard.ts
 *
 * Centralized subscription enforcement and audit logging
 * for Discord Governor bot.
 *
 * Ensures:
 * - Premium commands cannot be bypassed
 * - Command execution is fully logged
 * - Immutable audit history
 * - Integration with commandRegistry
 */

import { ChatInputCommandInteraction } from "discord.js";
import { PrismaClient, SubscriptionTier } from "@prisma/client";
import { logError } from "./errorLogger";
import { premiumRequiredEmbed, infoEmbed } from "../ui/embeds";

// Initialize Prisma client
const prisma = new PrismaClient();

// Options for guarding a command
export type GuardOptions = {
  premium?: boolean;              // If true, command requires any premium tier
  requiredTier?: SubscriptionTier; // Minimum tier for command
  ephemeral?: boolean;            // Should reply be ephemeral? Defaults to true
};

/**
 * subscriptionGuard
 *
 * Central enforcement of premium/subscription for a command.
 * Also records audit logs of command execution.
 *
 * @param interaction Discord command interaction
 * @param options Guard options (premium/required tier)
 * @returns boolean (true if command allowed, false if blocked)
 */
export async function subscriptionGuard(
  interaction: ChatInputCommandInteraction,
  options: GuardOptions = {}
): Promise<boolean> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const commandName = interaction.commandName.toLowerCase();

  let subscription: { tier: SubscriptionTier } | null = null;

  // Fetch subscription from database
  try {
    subscription = await prisma.subscription.findUnique({
      where: { guildId },
    });
  } catch (err) {
    await logError(err, { guildId, userId, command: commandName });
    // Do not block execution on DB error, but record audit as failed
    await recordAudit({
      guildId,
      userId,
      commandName,
      tier: "UNKNOWN",
      success: false,
    });
    return false;
  }

  const tier = subscription?.tier || "FREE";

  // Premium enforcement
  if (options.premium && tier === "FREE") {
    await interaction.reply({
      embeds: [premiumRequiredEmbed()],
      ephemeral: options.ephemeral ?? true,
    });
    await recordAudit({ guildId, userId, commandName, tier, success: false });
    return false;
  }

  // Required tier enforcement
  if (options.requiredTier && SubscriptionTier[tier] < SubscriptionTier[options.requiredTier]) {
    await interaction.reply({
      embeds: [premiumRequiredEmbed()],
      ephemeral: options.ephemeral ?? true,
    });
    await recordAudit({ guildId, userId, commandName, tier, success: false });
    return false;
  }

  // Passed all checks, log success
  await recordAudit({ guildId, userId, commandName, tier, success: true });
  return true;
}

/**
 * recordAudit
 *
 * Immutable logging of every command execution for security & accountability.
 * Stores:
 * - guildId
 * - userId
 * - command name
 * - subscription tier
 * - success / failure
 * - timestamp
 */
async function recordAudit(params: {
  guildId: string;
  userId: string;
  commandName: string;
  tier: string;
  success: boolean;
}) {
  try {
    await prisma.commandAudit.create({
      data: {
        guildId: params.guildId,
        userId: params.userId,
        command: params.commandName,
        subscriptionTier: params.tier,
        success: params.success,
        executedAt: new Date(),
      },
    });
  } catch (err) {
    // Critical: log the error but don't crash command execution
    await logError(err, {
      guildId: params.guildId,
      userId: params.userId,
      command: params.commandName,
      tier: params.tier,
    });
  }
}

/**
 * Helper function for future dashboard integration
 * Can fetch all audit logs for a guild in read-only mode
 */
export async function fetchGuildAudit(guildId: string) {
  try {
    return await prisma.commandAudit.findMany({
      where: { guildId },
      orderBy: { executedAt: "desc" },
    });
  } catch (err) {
    console.error("Failed to fetch guild audit:", err);
    return [];
  }
}
