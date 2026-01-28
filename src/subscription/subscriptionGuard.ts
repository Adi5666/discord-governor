/* =========================================================
   SUBSCRIPTION GUARD
   ---------------------------------------------------------
   - Feature-level premium enforcement
   - Server + User subscriptions
   - Grace period support
   - No bypass loopholes
   - Explainable denials
   ========================================================= */

import { PrismaClient, SubscriptionTier } from "@prisma/client"

const prisma = new PrismaClient()

/* =========================================================
   TYPES
   ========================================================= */

export type SubscriptionDecision = {
  allowed: boolean
  tier: SubscriptionTier
  reason: string
  expiresAt?: Date
}

export type SubscriptionContext = {
  guildId: string
  userId: string
  requiredTier: SubscriptionTier
}

/*
 Tier hierarchy (higher = more power)

 FREE   → 0
 PRO    → 1
 ELITE  → 2
*/

const TIER_LEVEL: Record<SubscriptionTier, number> = {
  FREE: 0,
  PRO: 1,
  ELITE: 2
}

/*
 Grace period in days
 Prevents sudden lockouts on payment failure
*/
const GRACE_PERIOD_DAYS = 3

/* =========================================================
   MAIN ENTRY
   ========================================================= */

export async function checkSubscription(
  context: SubscriptionContext
): Promise<SubscriptionDecision> {
  const { guildId, userId, requiredTier } = context

  const now = new Date()

  // 1️⃣ SERVER SUBSCRIPTION (HIGHEST PRIORITY)
  const serverSub = await prisma.serverSubscription.findUnique({
    where: { serverId: guildId }
  })

  if (serverSub) {
    const decision = evaluateSubscription(
      serverSub.tier,
      serverSub.active,
      serverSub.endsAt,
      requiredTier,
      "Server subscription"
    )
    if (decision.allowed) return decision
  }

  // 2️⃣ USER SUBSCRIPTION (FALLBACK)
  const userSub = await prisma.userSubscription.findUnique({
    where: { userId }
  })

  if (userSub) {
    return evaluateSubscription(
      userSub.tier,
      userSub.active,
      userSub.endsAt,
      requiredTier,
      "User subscription"
    )
  }

  // 3️⃣ NO SUBSCRIPTION
  return deny(
    SubscriptionTier.FREE,
    `Feature requires ${requiredTier} plan`
  )
}

/* =========================================================
   SUBSCRIPTION EVALUATION
   ========================================================= */

function evaluateSubscription(
  tier: SubscriptionTier,
  active: boolean,
  endsAt: Date | null,
  requiredTier: SubscriptionTier,
  source: string
): SubscriptionDecision {
  const now = new Date()

  // Tier insufficient
  if (TIER_LEVEL[tier] < TIER_LEVEL[requiredTier]) {
    return deny(
      tier,
      `${source} tier ${tier} does not include this feature`
    )
  }

  // Active subscription
  if (active) {
    return allow(
      tier,
      `${source} active`,
      endsAt ?? undefined
    )
  }

  // Grace period handling
  if (endsAt) {
    const graceUntil = new Date(endsAt)
    graceUntil.setDate(graceUntil.getDate() + GRACE_PERIOD_DAYS)

    if (now <= graceUntil) {
      return allow(
        tier,
        `${source} in grace period`,
        graceUntil
      )
    }
  }

  return deny(
    tier,
    `${source} expired — upgrade to continue`
  )
}

/* =========================================================
   HELPERS
   ========================================================= */

function allow(
  tier: SubscriptionTier,
  reason: string,
  expiresAt?: Date
): SubscriptionDecision {
  return {
    allowed: true,
    tier,
    reason,
    expiresAt
  }
}

function deny(
  tier: SubscriptionTier,
  reason: string
): SubscriptionDecision {
  return {
    allowed: false,
    tier,
    reason
  }
}
