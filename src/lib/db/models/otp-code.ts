import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * The current phone verification code for a number, plus the counters used to
 * rate-limit sending and guessing. Only a hash of the code is stored.
 * Documents clean themselves up a day after the last change.
 */
const otpCodeSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, required: true },
    // Sends in the current rate-limit window.
    windowStartedAt: { type: Date, required: true },
    sendCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

otpCodeSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export type OtpCodeDoc = InferSchemaType<typeof otpCodeSchema>;

export const OtpCode: Model<OtpCodeDoc> = models.OtpCode || model("OtpCode", otpCodeSchema);
