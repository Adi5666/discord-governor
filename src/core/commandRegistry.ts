import { Collection, ChatInputCommandInteraction } from "discord.js";
import { PrismaClient, SubscriptionTier } from "@prisma/client";
import { logError, withErrorHandling } from "./errorLogger";
import { rateLimitGuard } from "./rateLimiter";
import * as embeds from "../ui/embeds";

// Initialize Prisma
const prisma = new PrismaClient();

// Command type
export type BotCommand = {
  data: any; // SlashCommandBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  premium?: boolean; // true if requires premium
  requiredTier?: SubscriptionTier; // minimum subscription tier
};

// Command registry
export class CommandRegistry {
  private commands: Collection<string, BotCommand> = new Collection();

  constructor() {}

  /**
   * Register a command
   */
  register(command: BotCommand) {
    const name = command.data.name.toLowerCase();

    if (this.commands.has(name)) {
      throw new Error(`Duplicate command registration: ${name}`);
    }

    this.commands.set(name, command);
  }

  /**
   * Execute a command with full enforcement
   */
  async executeCommand(
    interaction: ChatInputCommandInteraction
  ): Promise<void> {
    const name = interaction.commandName.toLowerCase();
    const command = this.commands.get(name);

    if (!command) {
      await interaction.reply({
        embeds: [
          embeds.errorEmbed(
            "Command Not Found",
            `The command \`${name}\` does not exist or failed to load.`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    // Fetch subscription for server
    const guildId = interaction.guildId!;
    const userId = interaction.user.id;

    let subscription: { tier: SubscriptionTier } | null = null;

    try {
      subscription = await prisma.subscription.findUnique({
        where: { guildId },
      });
    } catch (err) {
      await logError(err, { guildId, userId, command: name });
    }

    const tier = subscription?.tier || "FREE";

    // Rate limiting enforcement
    const rateResult = rateLimitGuard({ userId, guildId, tier });

    if (!rateResult.allowed) {
      await interaction.reply({
        embeds: [embeds.rateLimitEmbed(rateResult.retryAfterMs!)],
        ephemeral: true,
      });
      return;
    }

    // Premium enforcement
    if (command.premium && tier === "FREE") {
      await interaction.reply({
        embeds: [embeds.premiumRequiredEmbed()],
        ephemeral: true,
      });
      return;
    }

    if (
      command.requiredTier &&
      SubscriptionTier[tier] < SubscriptionTier[command.requiredTier]
    ) {
      await interaction.reply({
        embeds: [embeds.premiumRequiredEmbed()],
        ephemeral: true,
      });
      return;
    }

    // Execute command safely with error logging
    await withErrorHandling(() => command.execute(interaction), {
      guildId,
      userId,
      command: name,
    });
  }

  /**
   * Get command collection (read-only)
   */
  getCommands() {
    return this.commands;
  }
}
