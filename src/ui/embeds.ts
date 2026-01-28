import { EmbedBuilder, Colors } from "discord.js";

/**
 * Brand configuration
 * Change here → reflected everywhere
 */
export const BRAND = {
  name: "Discord Governor",
  icon:
    "https://raw.githubusercontent.com/Adi5666/discord-governor/main/assets/logo.png",
  website: "https://discord.gg/your-invite",
  support: "https://discord.gg/your-support",
};

/**
 * Base embed factory
 */
function baseEmbed() {
  return new EmbedBuilder()
    .setAuthor({
      name: BRAND.name,
      iconURL: BRAND.icon,
      url: BRAND.website,
    })
    .setFooter({
      text: "Powered by Discord Governor • Secure • Audited",
    })
    .setTimestamp();
}

/**
 * Success message
 */
export function successEmbed(
  title: string,
  description: string
) {
  return baseEmbed()
    .setColor(Colors.Green)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
}

/**
 * Error message (user-safe)
 */
export function errorEmbed(
  title: string,
  description: string
) {
  return baseEmbed()
    .setColor(Colors.Red)
    .setTitle(`❌ ${title}`)
    .setDescription(description);
}

/**
 * Permission denied
 */
export function permissionDeniedEmbed() {
  return baseEmbed()
    .setColor(Colors.Orange)
    .setTitle("🚫 Permission Denied")
    .setDescription(
      "You do not have permission to perform this action.\n\n" +
        "If you believe this is a mistake, contact your server administrator."
    );
}

/**
 * Rate limit exceeded
 */
export function rateLimitEmbed(retryAfterMs: number) {
  const seconds = Math.ceil(retryAfterMs / 1000);

  return baseEmbed()
    .setColor(Colors.Yellow)
    .setTitle("⏳ Slow Down")
    .setDescription(
      `You are doing that too often.\n\n` +
        `Please wait **${seconds} seconds** before trying again.`
    );
}

/**
 * Premium required
 */
export function premiumRequiredEmbed() {
  return baseEmbed()
    .setColor(Colors.Blurple)
    .setTitle("💎 Premium Feature")
    .setDescription(
      "This feature is available to **Premium servers only**.\n\n" +
        "Upgrade to unlock advanced governance, audit logs, and higher limits."
    )
    .addFields({
      name: "🚀 Upgrade",
      value: "Use `/pricing` to view plans and benefits.",
    });
}

/**
 * Info / neutral embed
 */
export function infoEmbed(
  title: string,
  description: string
) {
  return baseEmbed()
    .setColor(Colors.Blurple)
    .setTitle(title)
    .setDescription(description);
}
