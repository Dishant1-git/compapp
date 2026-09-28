import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { GENDERS, PERSONALITY_IDS } from "@/lib/trips/constants";

// Shared across both platforms: one account works for Stranger Trips and Companion.
// Email sign-ups have email + password; Companion sign-ups may only have a verified phone.
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
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

// Unique only when set, so many phone-only accounts can exist without an email.
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } },
);
userSchema.index({ phone: 1, "verification.phone": 1 });

export type UserDoc = InferSchemaType<typeof userSchema>;

export const User: Model<UserDoc> = models.User || model("User", userSchema);

let emailIndexChecked: Promise<void> | undefined;

/**
 * Databases created before phone sign-up have a plain unique index on email,
 * which rejects a second account without one. Swap it for the partial index
 * above. Safe to call repeatedly; only does work once per process.
 */
export function ensureUserEmailIndex() {
  emailIndexChecked ??= (async () => {
    const indexes = await User.collection.indexes().catch(() => []);
    const legacy = indexes.find((i) => i.name === "email_1" && !i.partialFilterExpression);
    if (legacy) await User.collection.dropIndex("email_1");
    await User.createIndexes();
  })().catch((error) => {
    emailIndexChecked = undefined;
    throw error;
  });
  return emailIndexChecked;
}
