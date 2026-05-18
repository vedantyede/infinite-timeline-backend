import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import { IUserDocument } from "../types";

const UserSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,   // never returned by default
    },
    refreshToken: {
      type: String,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_doc, ret: any) {
        delete ret.passwordHash;
        delete ret.refreshToken;
        return ret;
      },
    },
  }
);

// ── Hash password before save ──────────────────────────────────────────────────
UserSchema.pre("save", async function (next) {
  if (!this.isModified("passwordHash")) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// ── Instance method ────────────────────────────────────────────────────────────
UserSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash as string);
};

export const User = model<IUserDocument>("User", UserSchema);
