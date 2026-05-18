import mongoose from "mongoose";
import config from "./index";
import logger from "./logger";

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongo.uri, config.mongo.options);
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected — attempting reconnect…");
    });
  } catch (err) {
    logger.error("MongoDB initial connection failed:", err);
    process.exit(1);
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.connection.close();
  logger.info("MongoDB connection closed.");
}
