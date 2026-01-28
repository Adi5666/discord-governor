/* =========================================================
   DISCORD GOVERNOR — ENTRY POINT
   ---------------------------------------------------------
   - Initializes client
   - Registers commands
   - Routes execution safely
   ========================================================= */

import "dotenv/config"
import {
  Client,
  GatewayIntentBits,
  Interaction
} from "discord.js"

import {
  COMMAND_REGISTRY
} from "./core/commandRegistry"

import {
  executeCommand
} from "./core/commandExecutor"

import {
  PermissionContext
} from "./security/permissionResolver"

/* =========================================================
   ENV VALIDATION
   ========================================================= */

const REQUIRED_ENV = [
  "DISCORD_TOKEN",
  "BOT_OWNER_IDS"
]

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing env variable: ${key}`)
  }
}

const BOT_OWNER_IDS =
  process.env.BOT_OWNER_IDS!.split(",")

/* =========================================================
   CLIENT
   ========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
})

/* =========================================================
   PERMISSION CONTEXT BUILDER
   ========================================================= */

client.permissionContextBuilder = (
  guild,
  member
): PermissionContext => {
  return {
    guild,
    member,
    botOwners: BOT_OWNER_IDS,
    botAdmins: [],       // later from DB
    botModerators: []    // later from DB
  }
}

/* =========================================================
   READY
   ========================================================= */

client.once("ready", async () => {
  console.log(
    `✅ Governor online as ${client.user?.tag}`
  )

  console.log(
    `📦 Loaded ${COMMAND_REGISTRY.length} commands`
  )
})

/* =========================================================
   INTERACTION HANDLER
   ========================================================= */

client.on(
  "interactionCreate",
  async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return

    const command = COMMAND_REGISTRY.find(
      c => c.name === interaction.commandName
    )

    if (!command) {
      return interaction.reply({
        content: "Unknown command.",
        ephemeral: true
      })
    }

    await executeCommand(interaction, command)
  }
)

/* =========================================================
   LOGIN
   ========================================================= */

client.login(process.env.DISCORD_TOKEN)
