import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A plan an agency bought: a number of trips it can publish before it expires. */
const agencyPlanSchema = new Schema(
  {
    agency: { type: Schema.Types.ObjectId, ref: "Agency", required: true },
    plan: { type: String, enum: ["single", "monthly", "annual"], required: true },
    tripsTotal: { type: Number, required: true, min: 1 },
    tripsUsed: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    payment: { type: Schema.Types.ObjectId, ref: "Payment" },
  },
  { timestamps: true },
);

agencyPlanSchema.index({ agency: 1, expiresAt: 1 });

export type AgencyPlanDoc = InferSchemaType<typeof agencyPlanSchema>;

export const AgencyPlan: Model<AgencyPlanDoc> = models.AgencyPlan || model("AgencyPlan", agencyPlanSchema);
