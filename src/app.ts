import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";

import config from "./config";
import logger from "./config/logger";
import authRoutes from "./routes/auth";
import eventRoutes from "./routes/events";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(mongoSanitize());           // strip $ and . from req.body/query/params

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server (no origin) or whitelisted origins
      if (!origin || config.cors.allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max:      config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many requests, please try again later." },
});
app.use("/api", limiter);

// ── Tighter limiter on auth endpoints ─────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 10,
  message: { success: false, message: "Too many auth attempts, please slow down." },
});
app.use("/api/auth/login",    authLimiter);
app.use("/api/auth/register", authLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));      // reject suspiciously large bodies
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── HTTP logging ──────────────────────────────────────────────────────────────
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: () => config.env === "test",
  })
);

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",   authRoutes);
app.use("/api/events", eventRoutes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
