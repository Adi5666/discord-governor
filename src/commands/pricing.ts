/* =========================================================
   /PRICING COMMAND
   ---------------------------------------------------------
   - Shows plans & feature comparison
   - Explains value clearly
   - Premium SaaS-grade UX
   ========================================================= */

import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js"
import { SubscriptionTier } from "@prisma/client"
import { checkSubscription } from "../subscription/subscriptionGuard"

/* =========================================================
   PLAN DEFINITIONS (SINGLE SOURCE)
   ========================================================= */

type Plan = {
  tier: SubscriptionTier
  price: string
  title: string
  description: string
  features: string[]
}

const PLANS: Plan[] = [
  {
    tier: SubscriptionTier.FREE,
    price: "₹0 / month",
    title: "Free",
    description: "Basic protection & visibility",
    features: [
      "Basic command access",
      "Limited moderation tools",
      "Standard help & logs",
      "Community support"
    ]
  },
  {
    tier: SubscriptionTier.PRO,
    price: "₹499 / month",
    title: "Pro",
    description: "For serious communities",
    features: [
      "Advanced moderation",
      "Audit log access",
      "Role-based bot authority",
      "Dashboard role mapping",
      "Priority support"
    ]
  },
  {
    tier: SubscriptionTier.ELITE,
    price: "₹999 / month",
    title: "Elite",
    description: "Enterprise-grade security & control",
    features: [
      "Emergency overrides",
      "Raid lockdown tools",
      "Full audit visibility",
      "Advanced security controls",
      "Early access to new features",
      "Dedicated support"
    ]
  }
]

/* =========================================================
   COMMAND HANDLER
   ========================================================= */

export async function handlePricingCommand(
  interaction: ChatInputCommandInteraction
) {
  const userId = interaction.user.id
  const guildId = interaction.guild?.id ?? "DM"

  const embeds: EmbedBuilder[] = []

  for (const plan of PLANS) {
    const embed = new EmbedBuilder()
      .setTitle(`${plan.title} — ${plan.price}`)
      .setDescription(plan.description)
      .setColor(getTierColor(plan.tier))

    embed.addFields({
      name: "What you get",
      value: plan.features.map(f => `• ${f}`).join("\n")
    })

    // Highlight current plan
    const status = await checkSubscription({
      guildId,
      userId,
      requiredTier: plan.tier
    })

    if (status.allowed) {
      embed.addFields({
        name: "Status",
        value: "✅ You have access to this plan"
      })
    } else {
      embed.addFields({
        name: "Status",
        value: "🔒 Upgrade to unlock"
      })
    }

    embeds.push(embed)
  }

  embeds.push(
    new EmbedBuilder()
      .setTitle("🚀 Upgrade & Manage Subscription")
      .setDescription(
        [
          "Manage plans, billing, and server settings via the dashboard.",
          "",
          "👉 **Open dashboard:** https://your-dashboard-url.com",
          "",
          "_Secure payments • Cancel anytime • No hidden fees_"
        ].join("\n")
      )
      .setColor(0x57f287)
  )

  await interaction.reply({
    embeds,
    ephemeral: true
  })
}

/* =========================================================
   HELPERS
   ========================================================= */

function getTierColor(tier: SubscriptionTier): number {
  switch (tier) {
    case SubscriptionTier.FREE:
      return 0x95a5a6
    case SubscriptionTier.PRO:
      return 0x3498db
    case SubscriptionTier.ELITE:
      return 0xf1c40f
    default:
      return 0xffffff
  }
}
