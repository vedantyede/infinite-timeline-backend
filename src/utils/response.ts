import { Response } from "express";
import { ApiResponse, PaginationMeta } from "../types";

// ─── Standard response senders ────────────────────────────────────────────────

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
  meta?: PaginationMeta
): void {
  const body: ApiResponse<T> = { success: true, data, message };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  errors?: unknown
): void {
  const body: ApiResponse = { success: false, message };
  if (errors) (body as Record<string, unknown>).errors = errors;
  res.status(statusCode).json(body);
}

// ─── Pagination ────────────────────────────────────────────────────────────────

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/** Returns { skip, limit } from page + limit for use in Mongoose queries. */
export function paginationOffsets(
  page: number,
  limit: number
): { skip: number; limit: number } {
  return { skip: (page - 1) * limit, limit };
}

// ─── sortDate helpers ─────────────────────────────────────────────────────────

/** Derive the denormalized sortDate (and optional endSortDate) from the raw payload. */
export function deriveSortDates(data: {
  isExact: boolean;
  date?: string;
  rangeMode?: string;
  year?: string;
  startDate?: string;
  endDate?: string;
}): { sortDate: Date; endSortDate?: Date } {
  if (data.isExact && data.date) {
    return { sortDate: new Date(data.date) };
  }
  if (data.rangeMode === "year" && data.year) {
    return { sortDate: new Date(`${data.year}-01-01`) };
  }
  if (data.rangeMode === "range" && data.startDate && data.endDate) {
    return {
      sortDate:    new Date(data.startDate),
      endSortDate: new Date(data.endDate),
    };
  }
  throw new Error("Cannot derive sortDate from provided data");
}
