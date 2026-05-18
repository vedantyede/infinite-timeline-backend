import winston from "winston";
import config from "./index";

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: config.env === "production" ? "info" : "debug",
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: "timeline-api" },
  transports: [
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

// Pretty console output in dev
if (config.env !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), simple()),
    })
  );
}

export default logger;
