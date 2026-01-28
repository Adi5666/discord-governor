/* =========================================================
   RATE LIMITER — ANTI-ABUSE CORE
   ---------------------------------------------------------
   - Per user + per guild
   - Tier-aware (free vs premium)
   - Sliding window
   - Safe for bot & dashboard
   ========================================================= */

import { SubscriptionTier } from "@prisma/client"

/* =========================================================
   TYPES
   ========================================================= */

interface RateLimitConfig {
  windowMs: number        // Time window
  maxRequests: number    // Max actions in window
}

interface RateLimitState {
  timestamps: number[]
}

/* =========================================================
   CONFIGURATION (WORLD-CLASS DEFAULTS)
   ========================================================= */

const RATE_LIMITS: Record<SubscriptionTier, RateLimitConfig> = {
  FREE: {
    windowMs: 60_000,     // 1 minute
    maxRequests: 10
  },
  BASIC: {
    windowMs: 60_000,
    maxRequests: 30
  },
  PRO: {
    windowMs: 60_000,
    maxRequests: 80
  },
  ENTERPRISE: {
    windowMs: 60_000,
    maxRequests: 200
  }
}

/* =========================================================
   INTERNAL STATE (IN-MEMORY)
   ========================================================= */

// key format: `${scope}:${id}`
const bucket = new Map<string, RateLimitState>()

/* =========================================================
   CORE CHECK
   ========================================================= */

export function checkRateLimit(options: {
  scope: "USER" | "GUILD"
  id: string
  tier: SubscriptionTier
}): {
  allowed: boolean
  remaining: number
  retryAfterMs?: number
} {
  const { scope, id, tier } = options
  const key = `${scope}:${id}`
  const now = Date.now()

  const config = RATE_LIMITS[tier]
  if (!config) {
    // Safety fallback
    return { allowed: true, remaining: Infinity }
  }

  let state = bucket.get(key)
  if (!state) {
    state = { timestamps: [] }
    bucket.set(key, state)
  }

  // Remove old timestamps
  state.timestamps = state.timestamps.filter(
    ts => now - ts < config.windowMs
  )

  if (state.timestamps.length >= config.maxRequests) {
    const oldest = state.timestamps[0]
    const retryAfterMs =
      config.windowMs - (now - oldest)

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs
    }
  }

  // Record action
  state.timestamps.push(now)

  return {
    allowed: true,
    remaining:
      config.maxRequests - state.timestamps.length
  }
}

/* =========================================================
   COMBINED CHECK (USER + GUILD)
   ========================================================= */

export function checkGlobalRateLimit(options: {
  userId: string
  guildId: string
  tier: SubscriptionTier
}) {
  const userCheck = checkRateLimit({
    scope: "USER",
    id: options.userId,
    tier: options.tier
  })

  if (!userCheck.allowed) return userCheck

  const guildCheck = checkRateLimit({
    scope: "GUILD",
    id: options.guildId,
    tier: options.tier
  })

  return guildCheck
}

/* =========================================================
   MAINTENANCE (OPTIONAL)
   ========================================================= */

// Prevent memory leaks on long uptime
export function pruneRateLimiter() {
  const now = Date.now()
  for (const [key, state] of bucket.entries()) {
    state.timestamps = state.timestamps.filter(
      ts => now - ts < 60_000
    )
    if (state.timestamps.length === 0) {
      bucket.delete(key)
    }
  }
}
