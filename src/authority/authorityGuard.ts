/* =========================================================
   AUTHORITY GUARD
   ---------------------------------------------------------
   - Zero trust
   - No privilege escalation
   - Discord perms + dashboard roles
   - Owner immutable fallback
   - Explainable decisions
   ========================================================= */

import { PermissionsBitField, GuildMember } from "discord.js"
import { PrismaClient, GlobalRole, ServerRoleType } from "@prisma/client"

const prisma = new PrismaClient()

/* =========================================================
   TYPES
   ========================================================= */

export type AuthorityDecision = {
  allowed: boolean
  reason: string
  resolvedAuthorityLevel: number
}

export type AuthorityContext = {
  guildId: string
  userId: string
  member: GuildMember
  requiredCapability?: Capability
}

export enum Capability {
  MANAGE_BOT = "MANAGE_BOT",
  ASSIGN_ROLES = "ASSIGN_ROLES",
  BYPASS_CHECKS = "BYPASS_CHECKS",
  VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS",
  MANAGE_SUBSCRIPTION = "MANAGE_SUBSCRIPTION"
}

/*
 Authority Levels (Higher = more power)

 1000  → Bot Owner
 900   → Bot Admin
 800   → Bot Moderator
 700   → Server Owner (Discord)
 600   → Server Admin (Dashboard / Discord)
 500   → Server Moderator
 100   → Custom role
 0     → Regular member
*/

const AUTHORITY_LEVELS = {
  BOT_OWNER: 1000,
  BOT_ADMIN: 900,
  BOT_MODERATOR: 800,
  SERVER_OWNER: 700,
  SERVER_ADMIN: 600,
  SERVER_MODERATOR: 500,
  CUSTOM: 100,
  NONE: 0
}

/* =========================================================
   MAIN ENTRY
   ========================================================= */

export async function resolveAuthority(
  context: AuthorityContext
): Promise<AuthorityDecision> {
  const { guildId, userId, member, requiredCapability } = context

  // 1️⃣ GLOBAL BOT ROLE CHECK
  const user = await prisma.user.findUnique({
    where: { discordId: userId }
  })

  if (user?.globalRole) {
    const level = AUTHORITY_LEVELS[user.globalRole]
    return allow(level, `Global bot role: ${user.globalRole}`)
  }

  // 2️⃣ DISCORD SERVER OWNER (IMMUTABLE)
  if (member.guild.ownerId === userId) {
    return allow(
      AUTHORITY_LEVELS.SERVER_OWNER,
      "Discord server owner (immutable authority)"
    )
  }

  // 3️⃣ DISCORD ADMINISTRATOR PERMISSION
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return allow(
      AUTHORITY_LEVELS.SERVER_ADMIN,
      "Discord Administrator permission"
    )
  }

  // 4️⃣ DASHBOARD ROLE RESOLUTION
  const server = await prisma.server.findUnique({
    where: { discordId: guildId },
    include: {
      members: {
        where: { user: { discordId: userId } },
        include: {
          assignedRoles: {
            include: { serverRole: true }
          }
        }
      }
    }
  })

  if (!server || server.members.length === 0) {
    return deny("User not registered in server")
  }

  const memberRecord = server.members[0]

  let highestLevel = AUTHORITY_LEVELS.NONE
  let highestRoleName = "None"

  for (const assignment of memberRecord.assignedRoles) {
    const role = assignment.serverRole
    let level = AUTHORITY_LEVELS.CUSTOM

    if (role.type === ServerRoleType.ADMIN) level = AUTHORITY_LEVELS.SERVER_ADMIN
    if (role.type === ServerRoleType.MODERATOR) level = AUTHORITY_LEVELS.SERVER_MODERATOR

    if (level > highestLevel) {
      highestLevel = level
      highestRoleName = role.name
    }

    // Capability-specific checks
    if (requiredCapability) {
      if (!hasCapability(role, requiredCapability)) {
        return deny(
          `Missing capability: ${requiredCapability} (role: ${role.name})`
        )
      }
    }
  }

  if (highestLevel > AUTHORITY_LEVELS.NONE) {
    return allow(
      highestLevel,
      `Dashboard role resolved: ${highestRoleName}`
    )
  }

  // 5️⃣ FALLBACK DISCORD MOD PERMS
  if (
    member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
    member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
    member.permissions.has(PermissionsBitField.Flags.BanMembers)
  ) {
    return allow(
      AUTHORITY_LEVELS.SERVER_MODERATOR,
      "Discord moderation permissions"
    )
  }

  return deny("No sufficient authority")
}

/* =========================================================
   CAPABILITY CHECKS
   ========================================================= */

function hasCapability(
  role: {
    canManageBot: boolean
    canAssignRoles: boolean
    canBypassChecks: boolean
  },
  capability: Capability
): boolean {
  switch (capability) {
    case Capability.MANAGE_BOT:
      return role.canManageBot
    case Capability.ASSIGN_ROLES:
      return role.canAssignRoles
    case Capability.BYPASS_CHECKS:
      return role.canBypassChecks
    default:
      return false
  }
}

/* =========================================================
   PRIVILEGE ESCALATION PROTECTION
   ========================================================= */

export function canModifyTarget(
  actorLevel: number,
  targetLevel: number
): boolean {
  // ❌ Cannot modify equal or higher authority
  return actorLevel > targetLevel
}

/* =========================================================
   HELPERS
   ========================================================= */

function allow(level: number, reason: string): AuthorityDecision {
  return {
    allowed: true,
    resolvedAuthorityLevel: level,
    reason
  }
}

function deny(reason: string): AuthorityDecision {
  return {
    allowed: false,
    resolvedAuthorityLevel: AUTHORITY_LEVELS.NONE,
    reason
  }
}
