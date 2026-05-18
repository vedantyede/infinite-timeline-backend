import app from "./app";
import { connectDB, disconnectDB } from "./config/database";
import config from "./config";
import logger from "./config/logger";

async function bootstrap(): Promise<void> {
  await connectDB();

  const server = app.listen(config.port, () => {
    logger.info(`Server running on port ${config.port} [${config.env}]`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    logger.info(`${signal} received — shutting down gracefully…`);

    server.close(async () => {
      await disconnectDB();
      logger.info("Server closed.");
      process.exit(0);
    });

    // Force-exit after 10 s if connections haven't drained
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection:", reason);
    shutdown("unhandledRejection");
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception:", err);
    shutdown("uncaughtException");
  });
}

bootstrap();
