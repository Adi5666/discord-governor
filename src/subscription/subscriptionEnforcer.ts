/* =========================================================
   SUBSCRIPTION ENFORCER — HARD GATE
   ---------------------------------------------------------
   - Mandatory middleware for every command
   - Prevents premium bypass
   - Integrates security + monetization
   ========================================================= */

import { ChatInputCommandInteraction } from "discord.js"
import { SubscriptionTier } from "@prisma/client"

import { checkSubscription } from "./subscriptionGuard"
import {
  enforcePermission,
  SystemRole
} from "../security/permissionResolver"
import {
  checkGlobalRateLimit
} from "../security/rateLimiter"
import {
  logAuditEvent
} from "../security/auditLogger"

/* =========================================================
   CONTEXT
   ========================================================= */

export interface EnforcerContext {
  interaction: ChatInputCommandInteraction
  requiredTier: SubscriptionTier
  requiredRole: SystemRole
}

/* =========================================================
   MAIN ENFORCER
   ========================================================= */

export async function enforceSubscription(
  context: EnforcerContext
): Promise<{
  allowed: boolean
  reason?: string
}> {
  const { interaction, requiredTier, requiredRole } = context

  const guild = interaction.guild
  const member = interaction.member

  if (!guild || !member || !interaction.user) {
    return { allowed: false, reason: "Invalid context" }
  }

  const userId = interaction.user.id
  const guildId = guild.id

  /* ---------------------------------------------------------
     1️⃣ RATE LIMIT (FAST FAIL)
     --------------------------------------------------------- */

  const tierForRateLimit = requiredTier ?? SubscriptionTier.FREE

  const rate = checkGlobalRateLimit({
    userId,
    guildId,
    tier: tierForRateLimit
  })

  if (!rate.allowed) {
    await logAuditEvent({
      guildId,
      actorId: userId,
      action: "FAILED_PERMISSION_CHECK",
      metadata: {
        reason: "RATE_LIMIT",
        retryAfterMs: rate.retryAfterMs
      }
    })

    return {
      allowed: false,
      reason: `Rate limit exceeded. Try again in ${Math.ceil(
        (rate.retryAfterMs ?? 0) / 1000
      )}s`
    }
  }

  /* ---------------------------------------------------------
     2️⃣ PERMISSION CHECK
     --------------------------------------------------------- */

  const perm = enforcePermission(
    interaction.client.permissionContextBuilder(
      guild,
      member
    ),
    requiredRole
  )

  if (!perm.allowed) {
    await logAuditEvent({
      guildId,
      actorId: userId,
      action: "FAILED_PERMISSION_CHECK",
      metadata: {
        reason: "INSUFFICIENT_ROLE",
        requiredRole,
        resolvedRole: perm.resolvedRole
      }
    })

    return {
      allowed: false,
      reason: `Requires ${requiredRole.replace("_", " ")}`
    }
  }

  /* ---------------------------------------------------------
     3️⃣ SUBSCRIPTION CHECK
     --------------------------------------------------------- */

  const sub = await checkSubscription({
    guildId,
    userId,
    requiredTier
  })

  if (!sub.allowed) {
    await logAuditEvent({
      guildId,
      actorId: userId,
      action: "FAILED_PERMISSION_CHECK",
      metadata: {
        reason: "SUBSCRIPTION_REQUIRED",
        requiredTier
      }
    })

    return {
      allowed: false,
      reason: `Requires ${requiredTier} plan`
    }
  }

  /* ---------------------------------------------------------
     4️⃣ SUCCESS AUDIT
     --------------------------------------------------------- */

  await logAuditEvent({
    guildId,
    actorId: userId,
    action: "COMMAND_EXECUTED",
    metadata: {
      command: interaction.commandName,
      tier: requiredTier,
      role: requiredRole
    }
  })

  return { allowed: true }
}
