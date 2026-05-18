import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { sendError } from "../utils/response";

type Target = "body" | "query" | "params";

/**
 * Returns an Express middleware that validates req[target] against the given
 * Joi schema, attaches the validated+coerced value back to req[target],
 * and calls next() on success or sends a 422 on failure.
 */
export function validate(schema: Joi.Schema, target: Target = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      sendError(res, "Validation failed", 422, messages);
      return;
    }

    (req as Record<string, unknown>)[target] = value;
    next();
  };
}
