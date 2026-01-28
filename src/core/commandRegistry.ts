/* =========================================================
   COMMAND REGISTRY
   ---------------------------------------------------------
   - Single source of truth for all commands
   - Auto powers /help, /features, /pricing
   - Authority + Subscription aware
   - Dashboard & bot always in sync
   ========================================================= */

import { SubscriptionTier } from "@prisma/client"
import { Capability } from "../authority/authorityGuard"

/* =========================================================
   TYPES
   ========================================================= */

export type CommandContextRequirement = {
  guildOnly?: boolean
  dmAllowed?: boolean
  requiresInteractionUser?: boolean
}

export type CommandDefinition = {
  name: string
  description: string
  category: CommandCategory

  // Security
  requiredCapability?: Capability
  requiredTier?: SubscriptionTier

  // UX / Context
  context?: CommandContextRequirement

  // Visibility
  hidden?: boolean
}

export enum CommandCategory {
  GENERAL = "General",
  MODERATION = "Moderation",
  SECURITY = "Security",
  PREMIUM = "Premium",
  ADMIN = "Admin",
  INFO = "Info"
}

/* =========================================================
   COMMAND REGISTRY (LOCKED)
   ========================================================= */

export const COMMAND_REGISTRY: CommandDefinition[] = [
  // ==========================
  // GENERAL
  // ==========================
  {
    name: "help",
    description: "View all available commands and how to use them",
    category: CommandCategory.GENERAL,
    context: { dmAllowed: true }
  },
  {
    name: "features",
    description: "See free vs premium features",
    category: CommandCategory.INFO,
    context: { dmAllowed: true }
  },
  {
    name: "pricing",
    description: "View subscription plans and upgrade options",
    category: CommandCategory.INFO,
    context: { dmAllowed: true }
  },
  {
    name: "dashboard",
    description: "Open the web dashboard for this server",
    category: CommandCategory.GENERAL,
    context: { guildOnly: true }
  },

  // ==========================
  // MODERATION
  // ==========================
  {
    name: "audit",
    description: "View recent moderation & security logs",
    category: CommandCategory.MODERATION,
    requiredCapability: Capability.VIEW_AUDIT_LOGS,
    requiredTier: SubscriptionTier.PRO,
    context: { guildOnly: true }
  },
  {
    name: "lockdown",
    description: "Temporarily lock the server during raids",
    category: CommandCategory.SECURITY,
    requiredCapability: Capability.MANAGE_BOT,
    requiredTier: SubscriptionTier.ELITE,
    context: { guildOnly: true }
  },

  // ==========================
  // ADMIN / SECURITY
  // ==========================
  {
    name: "assign-role",
    description: "Assign managed roles via dashboard authority",
    category: CommandCategory.ADMIN,
    requiredCapability: Capability.ASSIGN_ROLES,
    requiredTier: SubscriptionTier.PRO,
    context: { guildOnly: true }
  },
  {
    name: "override",
    description: "Emergency security override (logged & limited)",
    category: CommandCategory.SECURITY,
    requiredCapability: Capability.BYPASS_CHECKS,
    requiredTier: SubscriptionTier.ELITE,
    context: { guildOnly: true }
  },

  // ==========================
  // PREMIUM / BUSINESS
  // ==========================
  {
    name: "subscription",
    description: "View current subscription status",
    category: CommandCategory.PREMIUM,
    requiredTier: SubscriptionTier.FREE,
    context: { guildOnly: true }
  },
  {
    name: "upgrade",
    description: "Upgrade your plan and unlock features",
    category: CommandCategory.PREMIUM,
    requiredTier: SubscriptionTier.FREE,
    context: { dmAllowed: true }
  }
]

/* =========================================================
   UTILITIES
   ========================================================= */

/**
 * Get visible commands for help menu
 */
export function getVisibleCommands(): CommandDefinition[] {
  return COMMAND_REGISTRY.filter(cmd => !cmd.hidden)
}

/**
 * Group commands by category (for /help UI)
 */
export function groupCommandsByCategory(): Record<
  CommandCategory,
  CommandDefinition[]
> {
  const grouped = {} as Record<CommandCategory, CommandDefinition[]>

  for (const cmd of getVisibleCommands()) {
    if (!grouped[cmd.category]) {
      grouped[cmd.category] = []
    }
    grouped[cmd.category].push(cmd)
  }

  return grouped
}

/**
 * Get command definition safely
 */
export function getCommandDefinition(
  name: string
): CommandDefinition | undefined {
  return COMMAND_REGISTRY.find(cmd => cmd.name === name)
}
