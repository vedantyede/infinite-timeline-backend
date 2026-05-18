import { Schema, model, Types } from "mongoose";
import { IEventDocument } from "../types";

const EventSchema = new Schema<IEventDocument>(
  {
    // ── Core fields ────────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [1, "Title cannot be empty"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
      default: "",
    },
    categories: {
      type: [String],
      required: [true, "At least one category is required"],
      validate: {
        validator: (v: string[]) => v.length > 0 && v.length <= 10,
        message: "Between 1 and 10 categories allowed",
      },
    },

    // ── Date discriminator fields ──────────────────────────────────────────────
    isExact: {
      type: Boolean,
      required: true,
    },
    date: {
      type: String,         // "YYYY-MM-DD" for exact events
      match: [/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"],
    },
    rangeMode: {
      type: String,
      enum: ["year", "range"],
    },
    year: {
      type: String,
      match: [/^\d{1,4}$/, "year must be 1–4 digits"],
    },
    startDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD"],
    },
    endDate: {
      type: String,
      match: [/^\d{4}-\d{2}-\d{2}$/, "endDate must be YYYY-MM-DD"],
    },

    // ── Denormalized sort helpers ──────────────────────────────────────────────
    // Pre-computed on write so timeline queries never need $switch/$cond
    sortDate: {
      type: Date,
      required: true,
    },
    endSortDate: {
      type: Date,   // only set for range events
    },

    // ── Ownership ─────────────────────────────────────────────────────────────
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
//
// All read-heavy queries are (userId + …) so userId leads every compound index.
//
// 1. Primary timeline fetch — sorted chronologically per user
EventSchema.index({ userId: 1, sortDate: 1 });

// 2. Category filtering per user
EventSchema.index({ userId: 1, categories: 1, sortDate: 1 });

// 3. Range queries (fromYear / toYear) per user
EventSchema.index({ userId: 1, sortDate: 1, endSortDate: 1 });

// 4. isExact filter per user
EventSchema.index({ userId: 1, isExact: 1, sortDate: 1 });

// 5. Full-text search on title + description (Atlas or local)
EventSchema.index({ title: "text", description: "text" });

// ── Validation: enforce correct field combos per mode ─────────────────────────
EventSchema.pre("validate", function (next) {
  if (this.isExact) {
    if (!this.date) {
      this.invalidate("date", "date is required for exact events");
    }
  } else {
    if (!this.rangeMode) {
      this.invalidate("rangeMode", "rangeMode is required for non-exact events");
    }
    if (this.rangeMode === "year" && !this.year) {
      this.invalidate("year", "year is required for year-mode events");
    }
    if (this.rangeMode === "range") {
      if (!this.startDate) this.invalidate("startDate", "startDate is required for range events");
      if (!this.endDate)   this.invalidate("endDate",   "endDate is required for range events");
      if (
        this.startDate &&
        this.endDate &&
        new Date(this.startDate) > new Date(this.endDate)
      ) {
        this.invalidate("endDate", "endDate must be on or after startDate");
      }
    }
  }
  next();
});

export const Event = model<IEventDocument>("Event", EventSchema);
