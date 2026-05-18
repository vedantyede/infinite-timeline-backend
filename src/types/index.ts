import { Document, Types } from "mongoose";

// ─── Event Types ──────────────────────────────────────────────────────────────

export type EventMode = "exact" | "year" | "range";

export type Category =
  | "polity"
  | "history"
  | "other"
  | string;

export interface IEventBase {
  title: string;
  description?: string;
  categories: Category[];
  isExact: boolean;
  userId: Types.ObjectId;
  // Denormalized for fast sort / range queries
  sortDate: Date;       // always populated — used for chronological ordering
  endSortDate?: Date;   // only for range events
}

export interface IExactEvent extends IEventBase {
  isExact: true;
  date: string;         // ISO date string  "YYYY-MM-DD"
  rangeMode?: never;
  year?: never;
  startDate?: never;
  endDate?: never;
}

export interface IRangeEvent extends IEventBase {
  isExact: false;
  rangeMode: "range";
  year: string;
  startDate: string;
  endDate: string;
  date?: never;
}

export interface IYearEvent extends IEventBase {
  isExact: false;
  rangeMode: "year";
  year: string;
  startDate?: never;
  endDate?: never;
  date?: never;
}

export type IEvent = IExactEvent | IRangeEvent | IYearEvent;

export interface IEventDocument extends IEventBase, Document {
  createdAt: Date;
  updatedAt: Date;
}

// ─── User Types ───────────────────────────────────────────────────────────────

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  refreshToken?: string;
  isActive: boolean;
}

export interface IUserDocument extends IUser, Document {
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

// ─── API / Utility Types ──────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
}

export interface EventFilterQuery extends PaginationQuery {
  categories?: string;          // comma-separated
  isExact?: string;             // "true" | "false"
  rangeMode?: EventMode;
  search?: string;              // full-text search on title/description
  fromYear?: string;
  toYear?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}
