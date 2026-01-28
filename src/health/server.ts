import express from "express";
import { PrismaClient } from "@prisma/client";
import { Client } from "discord.js";

const app = express();
const PORT = process.env.PORT || 3000;

// These will be injected from index.ts
let prisma: PrismaClient | null = null;
let discordClient: Client | null = null;

/**
 * Initialize health server dependencies
 */
export function registerHealthDependencies(
  prismaClient: PrismaClient,
  client: Client
) {
  prisma = prismaClient;
  discordClient = client;
}

/**
 * Basic health endpoint for Render / monitoring
 */
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Start HTTP server
 */
export function startHealthServer() {
  app.listen(PORT, () => {
    console.log(`[HEALTH] Server running on port ${PORT}`);
  });
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  console.log(`[SHUTDOWN] Signal received: ${signal}`);

  try {
    if (discordClient) {
      console.log("[SHUTDOWN] Destroying Discord client...");
      await discordClient.destroy();
    }

    if (prisma) {
      console.log("[SHUTDOWN] Disconnecting database...");
      await prisma.$disconnect();
    }
  } catch (err) {
    console.error("[SHUTDOWN] Error during cleanup:", err);
  } finally {
    console.log("[SHUTDOWN] Exit complete.");
    process.exit(0);
  }
}

/**
 * Process-level crash & exit protection
 */
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled Rejection:", reason);
  shutdown("unhandledRejection");
});
