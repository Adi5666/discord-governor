/* =========================================================
   AUDIT LOGGER — IMMUTABLE EVENT RECORD
   ---------------------------------------------------------
   - Append-only security logging
   - No deletions, no overwrites
   - Used by bot, dashboard, API
   ========================================================= */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

/* =========================================================
   TYPES
   ========================================================= */

export type AuditAction =
  | "COMMAND_EXECUTED"
  | "ROLE_GRANTED"
  | "ROLE_REVOKED"
  | "PERMISSION_CHANGED"
  | "SUBSCRIPTION_UPGRADED"
  | "SUBSCRIPTION_DOWNGRADED"
  | "SETTINGS_CHANGED"
  | "SECURITY_OVERRIDE"
  | "BOT_ADMIN_ACTION"
  | "FAILED_PERMISSION_CHECK"

export interface AuditLogInput {
  guildId: string
  actorId: string           // Who did it
  targetId?: string         // Who was affected (optional)
  action: AuditAction
  metadata?: Record<string, any>
  ipAddress?: string        // Dashboard only
  userAgent?: string        // Dashboard only
}

/* =========================================================
   CORE LOGGER (APPEND-ONLY)
   ========================================================= */

export async function logAuditEvent(
  input: AuditLogInput
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        guildId: input.guildId,
        actorId: input.actorId,
        targetId: input.targetId ?? null,
        action: input.action,
        metadata: input.metadata ?? {},
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null
      }
    })
  } catch (error) {
    // 🚨 CRITICAL: audit logging must NEVER crash bot
    console.error("[AUDIT LOGGER FAILURE]", error)
  }
}

/* =========================================================
   SAFE WRAPPER FOR SENSITIVE ACTIONS
   ========================================================= */

export async function withAuditLog<T>(
  audit: AuditLogInput,
  action: () => Promise<T>
): Promise<T> {
  const result = await action()
  await logAuditEvent(audit)
  return result
}

/* =========================================================
   QUERY HELPERS (READ-ONLY)
   ========================================================= */

export async function getAuditLogs(
  guildId: string,
  limit = 50
) {
  return prisma.auditLog.findMany({
    where: { guildId },
    orderBy: { createdAt: "desc" },
    take: limit
  })
}

export async function getAuditLogsByUser(
  guildId: string,
  userId: string,
  limit = 50
) {
  return prisma.auditLog.findMany({
    where: {
      guildId,
      OR: [
        { actorId: userId },
        { targetId: userId }
      ]
    },
    orderBy: { createdAt: "desc" },
    take: limit
  })
}
