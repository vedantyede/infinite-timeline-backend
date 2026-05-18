import { Router } from "express";
import * as eventController from "../controllers/eventController";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { eventQuerySchema, updateEventSchema } from "../utils/validators";

const router = Router();

// All event routes require authentication
router.use(authenticate);

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats",            eventController.getTimelineStats);
router.get("/stats/categories", eventController.getCategoryStats);

// ── Collection ────────────────────────────────────────────────────────────────
router.get(
  "/",
  validate(eventQuerySchema, "query"),
  eventController.listEvents
);

// createEvent uses its own discriminated validation inside the controller
router.post("/", eventController.createEvent);

// Bulk delete (before /:id to avoid route clash)
router.delete(
  "/bulk",
  eventController.bulkDeleteEvents
);

// ── Single resource ────────────────────────────────────────────────────────────
router.get("/:id",    eventController.getEvent);
router.patch(
  "/:id",
  validate(updateEventSchema),
  eventController.updateEvent
);
router.delete("/:id", eventController.deleteEvent);

export default router;
