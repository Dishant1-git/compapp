import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { GENDERS, PERSONALITY_IDS } from "@/lib/trips/constants";

// Shared across both platforms: one account works for Stranger Trips and Companion.
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    platforms: { type: [String], enum: ["trips", "companion"], default: [] },
    // user = traveller, agency = runs trips (see Agency model), admin = full access.
    role: { type: String, enum: ["user", "agency", "admin"], default: "user" },
    // Suspended accounts can't sign in.
    status: { type: String, enum: ["active", "suspended"], default: "active" },

    // Profile
    phone: { type: String, trim: true },
    city: { type: String, trim: true },
    birthYear: { type: Number, min: 1900 },
    gender: { type: String, enum: GENDERS.map((g) => g.id), default: "unspecified" },
    bio: { type: String, trim: true, maxlength: 500 },
    personality: { type: [String], enum: PERSONALITY_IDS, default: [] },
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
    },

    // Set by verification flows (OTP / KYC) once those are integrated.
    verification: {
      email: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      identity: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> = models.User || model("User", userSchema);
