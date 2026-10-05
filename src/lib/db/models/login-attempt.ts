import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Wrong-password counter for one email address, to slow down password guessing.
 * Documents remove themselves when the lockout window ends.
 */
const loginAttemptSchema = new Schema({
  email: { type: String, required: true, unique: true },
  failures: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

loginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type LoginAttemptDoc = InferSchemaType<typeof loginAttemptSchema>;

export const LoginAttempt: Model<LoginAttemptDoc> =
  models.LoginAttempt || model("LoginAttempt", loginAttemptSchema);
