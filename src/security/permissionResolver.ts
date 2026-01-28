/* =========================================================
   PERMISSION RESOLVER — ZERO LOOPHOLES
   ---------------------------------------------------------
   - Resolves REAL authority in a Discord server
   - Independent of role names
   - Used by bot commands & dashboard
   ========================================================= */

import {
  Guild,
  GuildMember,
  PermissionsBitField
} from "discord.js"

/* =========================================================
   SYSTEM ROLES (BOT-SIDE)
   ========================================================= */

export enum SystemRole {
  BOT_OWNER = "BOT_OWNER",
  BOT_ADMIN = "BOT_ADMIN",
  BOT_MODERATOR = "BOT_MODERATOR",

  SERVER_OWNER = "SERVER_OWNER",
  SERVER_ADMIN = "SERVER_ADMIN",
  SERVER_MODERATOR = "SERVER_MODERATOR",

  MEMBER = "MEMBER"
}

/* =========================================================
   PERMISSION CONTEXT
   ========================================================= */

export interface PermissionContext {
  guild: Guild
  member: GuildMember
  botOwners: string[]          // hardcoded or env
  botAdmins: string[]          // from DB
  botModerators: string[]      // from DB
}

/* =========================================================
   MAIN RESOLVER
   ========================================================= */

export function resolveSystemRole(
  context: PermissionContext
): SystemRole {
  const { guild, member } = context

  const userId = member.id

  /* -----------------------------
     BOT OWNER (ABSOLUTE)
     ----------------------------- */
  if (context.botOwners.includes(userId)) {
    return SystemRole.BOT_OWNER
  }

  /* -----------------------------
     SERVER OWNER (ABSOLUTE)
     ----------------------------- */
  if (guild.ownerId === userId) {
    return SystemRole.SERVER_OWNER
  }

  /* -----------------------------
     BOT ADMINS / MODS
     ----------------------------- */
  if (context.botAdmins.includes(userId)) {
    return SystemRole.BOT_ADMIN
  }

  if (context.botModerators.includes(userId)) {
    return SystemRole.BOT_MODERATOR
  }

  /* -----------------------------
     DISCORD PERMISSION ANALYSIS
     ----------------------------- */

  const perms = member.permissions

  // Administrator = full control
  if (perms.has(PermissionsBitField.Flags.Administrator)) {
    return SystemRole.SERVER_ADMIN
  }

  // Admin-like but no Administrator
  const adminLikePerms = [
    PermissionsBitField.Flags.ManageGuild,
    PermissionsBitField.Flags.ManageRoles,
    PermissionsBitField.Flags.ManageChannels,
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.BanMembers
  ]

  const hasAdminLike = adminLikePerms.every(p =>
    perms.has(p)
  )

  if (hasAdminLike) {
    return SystemRole.SERVER_ADMIN
  }

  // Moderator-level perms
  const modPerms = [
    PermissionsBitField.Flags.KickMembers,
    PermissionsBitField.Flags.ModerateMembers,
    PermissionsBitField.Flags.ManageMessages
  ]

  const hasModPerms = modPerms.some(p =>
    perms.has(p)
  )

  if (hasModPerms) {
    return SystemRole.SERVER_MODERATOR
  }

  return SystemRole.MEMBER
}

/* =========================================================
   POWER COMPARISON
   ========================================================= */

const ROLE_POWER: Record<SystemRole, number> = {
  BOT_OWNER: 100,
  SERVER_OWNER: 95,
  BOT_ADMIN: 90,
  SERVER_ADMIN: 85,
  BOT_MODERATOR: 70,
  SERVER_MODERATOR: 60,
  MEMBER: 10
}

export function hasRequiredPower(
  userRole: SystemRole,
  requiredRole: SystemRole
): boolean {
  return ROLE_POWER[userRole] >= ROLE_POWER[requiredRole]
}

/* =========================================================
   HIGH-LEVEL CHECK
   ========================================================= */

export function enforcePermission(
  context: PermissionContext,
  requiredRole: SystemRole
): {
  allowed: boolean
  resolvedRole: SystemRole
} {
  const resolvedRole = resolveSystemRole(context)

  return {
    allowed: hasRequiredPower(resolvedRole, requiredRole),
    resolvedRole
  }
}
