import "dotenv/config";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { PrismaClient } from "@prisma/client";

import { startHealthServer, registerHealthDependencies } from "./health/server";
import { registerCommands } from "./core/commandRegistry";

// -----------------------------
// ENV VALIDATION (FAIL FAST)
// -----------------------------
if (!process.env.DISCORD_TOKEN) {
  throw new Error("DISCORD_TOKEN is missing in environment variables");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing in environment variables");
}

// -----------------------------
// INITIALIZE CORE SERVICES
// -----------------------------
const prisma = new PrismaClient();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
  partials: [Partials.Channel],
});

// -----------------------------
// DISCORD EVENTS
// -----------------------------
client.once("ready", async () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);

  try {
    await prisma.$connect();
    console.log("✅ Database connected");

    await registerCommands(client);
    console.log("✅ Commands registered");
  } catch (err) {
    console.error("❌ Startup failure:", err);
    process.exit(1);
  }
});

// -----------------------------
// GLOBAL ERROR VISIBILITY
// -----------------------------
client.on("error", (err) => {
  console.error("❌ Discord client error:", err);
});

client.on("shardError", (err) => {
  console.error("❌ Discord shard error:", err);
});

// -----------------------------
// BOOTSTRAP
// -----------------------------
async function bootstrap() {
  try {
    // Inject dependencies for graceful shutdown
    registerHealthDependencies(prisma, client);

    // Start health server BEFORE login
    startHealthServer();

    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error("❌ Fatal bootstrap error:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
