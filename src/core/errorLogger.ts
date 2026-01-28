import { PrismaClient } from "@prisma/client";

export type ErrorContext = {
  guildId?: string;
  userId?: string;
  command?: string;
  metadata?: Record<string, unknown>;
};

const prisma = new PrismaClient();

/**
 * Centralized error logger
 * - Logs to console (for Render)
 * - Writes immutable audit log (for disputes)
 * - NEVER throws (safe to call anywhere)
 */
export async function logError(
  error: unknown,
  context: ErrorContext = {}
) {
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  const stack =
    error instanceof Error ? error.stack : undefined;

  console.error("❌ ERROR:", {
    message: errorMessage,
    context,
    stack,
  });

  // If we don't have enough info to audit, skip DB
  if (!context.guildId || !context.userId) return;

  try {
    await prisma.auditLog.create({
      data: {
        guildId: context.guildId,
        actorId: context.userId,
        targetId: context.command,
        action: "ERROR",
        metadata: {
          message: errorMessage,
          stack,
          ...context.metadata,
        },
      },
    });
  } catch (dbError) {
    // Never crash because logging failed
    console.error("❌ Failed to write error audit log:", dbError);
  }
}

/**
 * Helper for command execution
 * Wrap command logic with this
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: ErrorContext
): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    await logError(err, context);
    return null;
  }
}
