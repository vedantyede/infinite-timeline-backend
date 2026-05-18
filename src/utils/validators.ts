import Joi from "joi";

// ─── Reusable primitives ──────────────────────────────────────────────────────

const isoDate = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({ "string.pattern.base": "Date must be in YYYY-MM-DD format" });

const yearString = Joi.string()
  .pattern(/^\d{1,4}$/)
  .messages({ "string.pattern.base": "Year must be a 1–4 digit number" });

const categoriesField = Joi.array()
  .items(Joi.string().trim().min(1).max(50))
  .min(1)
  .max(10)
  .required()
  .messages({
    "array.min": "At least one category is required",
    "array.max": "Maximum 10 categories allowed",
  });

// ─── Event schemas ────────────────────────────────────────────────────────────

const exactEventSchema = Joi.object({
  title:       Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).allow("").optional(),
  categories:  categoriesField,
  isExact:     Joi.boolean().valid(true).required(),
  date:        isoDate.required(),
});

const yearEventSchema = Joi.object({
  title:       Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).allow("").optional(),
  categories:  categoriesField,
  isExact:     Joi.boolean().valid(false).required(),
  rangeMode:   Joi.string().valid("year").required(),
  year:        yearString.required(),
});

const rangeEventSchema = Joi.object({
  title:       Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).allow("").optional(),
  categories:  categoriesField,
  isExact:     Joi.boolean().valid(false).required(),
  rangeMode:   Joi.string().valid("range").required(),
  year:        yearString.optional(),   // can be omitted; derived from startDate
  startDate:   isoDate.required(),
  endDate:     isoDate.required(),
}).custom((val, helpers) => {
  if (new Date(val.startDate) > new Date(val.endDate)) {
    return helpers.error("any.invalid", { message: "endDate must be on or after startDate" });
  }
  return val;
});

/** Validates any event payload via discriminated union. */
export function validateEvent(data: unknown): Joi.ValidationResult {
  const obj = data as Record<string, unknown>;

  if (obj.isExact === true)    return exactEventSchema.validate(data, { abortEarly: false });
  if (obj.rangeMode === "year")  return yearEventSchema.validate(data, { abortEarly: false });
  if (obj.rangeMode === "range") return rangeEventSchema.validate(data, { abortEarly: false });

  // Fallback — let Mongoose schema error bubble
  return exactEventSchema.validate(data, { abortEarly: false });
}

/** Partial update — all fields optional, same structural rules. */
export const updateEventSchema = Joi.object({
  title:       Joi.string().trim().min(1).max(200),
  description: Joi.string().trim().max(2000).allow(""),
  categories:  categoriesField.optional(),
  isExact:     Joi.boolean(),
  date:        isoDate,
  rangeMode:   Joi.string().valid("year", "range"),
  year:        yearString,
  startDate:   isoDate,
  endDate:     isoDate,
}).min(1).messages({ "object.min": "At least one field is required for update" });

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const registerSchema = Joi.object({
  name:     Joi.string().trim().min(2).max(80).required(),
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128).required().messages({
    "string.min": "Password must be at least 8 characters",
  }),
});

export const loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

// ─── Query schemas ────────────────────────────────────────────────────────────

export const eventQuerySchema = Joi.object({
  page:       Joi.number().integer().min(1).default(1),
  limit:      Joi.number().integer().min(1).max(100).default(20),
  sortBy:     Joi.string().valid("sortDate", "title", "createdAt").default("sortDate"),
  order:      Joi.string().valid("asc", "desc").default("asc"),
  categories: Joi.string().optional(),          // comma-separated
  isExact:    Joi.string().valid("true", "false").optional(),
  rangeMode:  Joi.string().valid("exact", "year", "range").optional(),
  search:     Joi.string().trim().max(200).optional(),
  fromYear:   yearString.optional(),
  toYear:     yearString.optional(),
});
