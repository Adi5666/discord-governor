import { SubscriptionTier } from "@prisma/client";

type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const userBuckets = new Map<string, Bucket>();
const guildBuckets = new Map<string, Bucket>();

/**
 * Rate limit configuration per subscription tier
 */
const USER_LIMITS: Record<SubscriptionTier, RateLimitConfig> = {
  FREE: {
    windowMs: 60_000, // 1 minute
    max: 10,
  },
  BASIC: {
    windowMs: 60_000,
    max: 30,
  },
  PRO: {
    windowMs: 60_000,
    max: 100,
  },
  ENTERPRISE: {
    windowMs: 60_000,
    max: 1000,
  },
};

/**
 * Guild-wide protection (prevents spam storms)
 */
const GUILD_LIMIT: RateLimitConfig = {
  windowMs: 10_000, // 10 seconds
  max: 50,
};

/**
 * Core rate limiter logic
 */
function checkBucket(
  key: string,
  bucketMap: Map<string, Bucket>,
  config: RateLimitConfig
): boolean {
  const now = Date.now();
  const bucket = bucketMap.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucketMap.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return true;
  }

  if (bucket.count >= config.max) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/**
 * Main rate-limit guard
 * Call this BEFORE executing any command
 */
export function rateLimitGuard(options: {
  userId: string;
  guildId: string;
  tier: SubscriptionTier;
}): { allowed: boolean; retryAfterMs?: number } {
  const { userId, guildId, tier } = options;

  const userConfig = USER_LIMITS[tier];

  // User-level limit
  const userAllowed = checkBucket(
    userId,
    userBuckets,
    userConfig
  );

  if (!userAllowed) {
    const bucket = userBuckets.get(userId)!;
    return {
      allowed: false,
      retryAfterMs: Math.max(bucket.resetAt - Date.now(), 0),
    };
  }

  // Guild-level protection
  const guildAllowed = checkBucket(
    guildId,
    guildBuckets,
    GUILD_LIMIT
  );

  if (!guildAllowed) {
    const bucket = guildBuckets.get(guildId)!;
    return {
      allowed: false,
      retryAfterMs: Math.max(bucket.resetAt - Date.now(), 0),
    };
  }

  return { allowed: true };
}

/**
 * Memory safety: periodic cleanup
 * Prevents unbounded growth
 */
setInterval(() => {
  const now = Date.now();

  for (const [key, bucket] of userBuckets.entries()) {
    if (bucket.resetAt <= now) {
      userBuckets.delete(key);
    }
  }

  for (const [key, bucket] of guildBuckets.entries()) {
    if (bucket.resetAt <= now) {
      guildBuckets.delete(key);
    }
  }
}, 60_000);
