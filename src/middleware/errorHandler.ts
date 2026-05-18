import { Request, Response, NextFunction } from "express";
import { Error as MongooseError } from "mongoose";
import { MongoServerError } from "mongodb";
import { AppError } from "../utils/errors";
import { sendError } from "../utils/response";
import logger from "../config/logger";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // ── Known operational errors ───────────────────────────────────────────────
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode);
    return;
  }

  // ── Mongoose validation error ──────────────────────────────────────────────
  if (err instanceof MongooseError.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    sendError(res, "Validation failed", 422, messages);
    return;
  }

  // ── Mongoose cast error (bad ObjectId) ────────────────────────────────────
  if (err instanceof MongooseError.CastError) {
    sendError(res, `Invalid ${err.path}: ${err.value}`, 400);
    return;
  }

  // ── MongoDB duplicate key ──────────────────────────────────────────────────
  if ((err as MongoServerError).code === 11000) {
    const field = Object.keys((err as MongoServerError).keyPattern ?? {})[0];
    sendError(res, `${field ?? "Field"} already exists`, 409);
    return;
  }

  // ── Unknown / programmer errors ────────────────────────────────────────────
  logger.error("Unhandled error:", { message: err.message, stack: err.stack });
  sendError(res, "Internal server error", 500);
}

export function notFoundHandler(_req: Request, res: Response): void {
  sendError(res, "Route not found", 404);
}
