import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { PERSONALITY_IDS } from "@/lib/trips/constants";

/** A solo traveller's plan, used to find travel buddies going the same way. */
const travelPlanSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    origin: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: Number, required: true, min: 0 },
    lookingFor: { type: [String], enum: PERSONALITY_IDS, default: [] },
    note: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ["active", "closed"], default: "active" },
  },
  { timestamps: true },
);

travelPlanSchema.index({ status: 1, startDate: 1 });

export type TravelPlanDoc = InferSchemaType<typeof travelPlanSchema>;

export const TravelPlan: Model<TravelPlanDoc> =
  models.TravelPlan || model("TravelPlan", travelPlanSchema);
