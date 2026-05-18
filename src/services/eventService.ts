import { FilterQuery, Types } from "mongoose";
import { Event } from "../models/Event";
import { IEventDocument, EventFilterQuery } from "../types";
import {
  deriveSortDates,
  buildPaginationMeta,
  paginationOffsets,
} from "../utils/response";
import { NotFoundError, ForbiddenError } from "../utils/errors";
import config from "../config";

// ─── Build Mongoose filter from query params ───────────────────────────────────

function buildFilter(
  userId: string,
  query: EventFilterQuery,
): FilterQuery<IEventDocument> {
  const filter: FilterQuery<IEventDocument> = {
    userId: new Types.ObjectId(userId),
  };

  // Category filter — support comma-separated list
  if (query.categories) {
    const cats = query.categories
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cats.length > 0) filter.categories = { $in: cats };
  }

  // isExact flag
  if (query.isExact !== undefined) {
    filter.isExact = query.isExact === "true";
  }

  // rangeMode — only meaningful when isExact is false
  if (query.rangeMode) {
    filter.rangeMode = query.rangeMode;
  }

  // Year range — query against the pre-computed sortDate
  if (query.fromYear || query.toYear) {
    filter.sortDate = {} as Record<string, Date>;
    if (query.fromYear) {
      (filter.sortDate as Record<string, Date>).$gte = new Date(
        `${query.fromYear}-01-01`,
      );
    }
    if (query.toYear) {
      (filter.sortDate as Record<string, Date>).$lte = new Date(
        `${query.toYear}-12-31`,
      );
    }
  }

  // Full-text search (requires text index on title + description)
  if (query.search) {
    filter.$text = { $search: query.search };
  }

  return filter;
}

// ─── Service methods ──────────────────────────────────────────────────────────

export async function getEvents(userId: string, query: EventFilterQuery) {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(
    query.limit ?? config.pagination.defaultSize,
    config.pagination.maxSize,
  );

  const filter = buildFilter(userId, query);
  const { skip } = paginationOffsets(page, limit);

  const sortField = query.sortBy ?? "sortDate";
  const sortOrder = query.order === "desc" ? -1 : 1;

  // Text-search adds a relevance score; use it when searching
  const sortSpec = query.search
    ? { score: { $meta: "textScore" }, [sortField]: sortOrder }
    : { [sortField]: sortOrder };

  // countDocuments + find run in parallel for performance
  const [total, events] = await Promise.all([
    Event.countDocuments(filter),
    Event.find(filter)
      .sort(sortSpec as any)
      .skip(skip)
      .limit(limit)
      .lean(), // lean() returns plain objects — faster, less memory
  ]);

  return {
    events,
    meta: buildPaginationMeta(total, page, limit),
  };
}

export async function getEventById(eventId: string, userId: string) {
  const event = await Event.findById(eventId).lean();
  if (!event) throw new NotFoundError("Event");
  if (event.userId.toString() !== userId) throw new ForbiddenError();
  return event;
}

export async function createEvent(
  userId: string,
  data: Record<string, unknown>,
) {
  const sortDates = deriveSortDates(
    data as Parameters<typeof deriveSortDates>[0],
  );

  const event = await Event.create({
    ...data,
    ...sortDates,
    userId: new Types.ObjectId(userId),
  });

  return event.toObject();
}

export async function updateEvent(
  eventId: string,
  userId: string,
  data: Record<string, unknown>,
) {
  const existing = await Event.findById(eventId);
  if (!existing) throw new NotFoundError("Event");
  if (existing.userId.toString() !== userId) throw new ForbiddenError();

  // Merge existing fields with updates so deriveSortDates always has full context
  const merged = { ...existing.toObject(), ...data };
  const sortDates = deriveSortDates(
    merged as Parameters<typeof deriveSortDates>[0],
  );

  Object.assign(existing, data, sortDates);
  await existing.save(); // triggers Mongoose validators

  return existing.toObject();
}

export async function deleteEvent(eventId: string, userId: string) {
  const event = await Event.findById(eventId);
  if (!event) throw new NotFoundError("Event");
  if (event.userId.toString() !== userId) throw new ForbiddenError();
  await event.deleteOne();
}

export async function bulkDeleteEvents(eventIds: string[], userId: string) {
  const result = await Event.deleteMany({
    _id: { $in: eventIds.map((id) => new Types.ObjectId(id)) },
    userId: new Types.ObjectId(userId),
  });
  return result.deletedCount;
}

/** Aggregation: count events per category for the authenticated user. */
export async function getCategoryStats(userId: string) {
  return Event.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    { $unwind: "$categories" },
    {
      $group: {
        _id: "$categories",
        count: { $sum: 1 },
        earliest: { $min: "$sortDate" },
        latest: { $max: "$sortDate" },
      },
    },
    { $sort: { count: -1 } },
  ]);
}

/** Overview stats for the dashboard header. */
export async function getTimelineStats(userId: string) {
  const [stats] = await Event.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        exactCount: { $sum: { $cond: ["$isExact", 1, 0] } },
        rangeCount: {
          $sum: { $cond: [{ $eq: ["$rangeMode", "range"] }, 1, 0] },
        },
        yearCount: { $sum: { $cond: [{ $eq: ["$rangeMode", "year"] }, 1, 0] } },
        earliestDate: { $min: "$sortDate" },
        latestDate: { $max: "$sortDate" },
      },
    },
    { $project: { _id: 0 } },
  ]);
  return stats ?? { total: 0, exactCount: 0, rangeCount: 0, yearCount: 0 };
}
