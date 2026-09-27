import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A request to join someone's travel plan. Contact details are shared only once accepted. */
const buddyRequestSchema = new Schema(
  {
    plan: { type: Schema.Types.ObjectId, ref: "TravelPlan", required: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, trim: true, maxlength: 300 },
    status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" },
  },
  { timestamps: true },
);

buddyRequestSchema.index({ plan: 1, from: 1 }, { unique: true });

export type BuddyRequestDoc = InferSchemaType<typeof buddyRequestSchema>;

export const BuddyRequest: Model<BuddyRequestDoc> =
  models.BuddyRequest || model("BuddyRequest", buddyRequestSchema);
