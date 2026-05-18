import { Request, Response, NextFunction } from "express";
import * as eventService from "../services/eventService";
import { validateEvent } from "../utils/validators";
import { sendSuccess, sendError } from "../utils/response";
import { EventFilterQuery } from "../types";
import { ValidationError } from "../utils/errors";

export async function listEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { events, meta } = await eventService.getEvents(userId, req.query as EventFilterQuery);
    sendSuccess(res, events, "Events retrieved", 200, meta);
  } catch (err) {
    next(err);
  }
}

export async function getEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const event = await eventService.getEventById(req.params.id, req.user!.userId);
    sendSuccess(res, event);
  } catch (err) {
    next(err);
  }
}

export async function createEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Discriminated validation based on isExact / rangeMode
    const { error, value } = validateEvent(req.body);
    if (error) {
      const messages = error.details.map((d) => d.message);
      sendError(res, "Validation failed", 422, messages);
      return;
    }

    const event = await eventService.createEvent(req.user!.userId, value);
    sendSuccess(res, event, "Event created", 201);
  } catch (err) {
    next(err);
  }
}

export async function updateEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (Object.keys(req.body as object).length === 0) {
      throw new ValidationError("Request body cannot be empty");
    }

    const event = await eventService.updateEvent(
      req.params.id,
      req.user!.userId,
      req.body as Record<string, unknown>
    );
    sendSuccess(res, event, "Event updated");
  } catch (err) {
    next(err);
  }
}

export async function deleteEvent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await eventService.deleteEvent(req.params.id, req.user!.userId);
    sendSuccess(res, null, "Event deleted");
  } catch (err) {
    next(err);
  }
}

export async function bulkDeleteEvents(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      sendError(res, "ids must be a non-empty array", 422);
      return;
    }
    const deleted = await eventService.bulkDeleteEvents(ids, req.user!.userId);
    sendSuccess(res, { deleted }, `${deleted} event(s) deleted`);
  } catch (err) {
    next(err);
  }
}

export async function getCategoryStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await eventService.getCategoryStats(req.user!.userId);
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}

export async function getTimelineStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await eventService.getTimelineStats(req.user!.userId);
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}
