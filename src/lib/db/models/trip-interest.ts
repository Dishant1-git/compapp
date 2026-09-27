import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/** A traveller marked a trip as "interested" — visible to the trip's agency. */
const tripInterestSchema = new Schema(
  {
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

tripInterestSchema.index({ trip: 1, user: 1 }, { unique: true });

export type TripInterestDoc = InferSchemaType<typeof tripInterestSchema>;

export const TripInterest: Model<TripInterestDoc> =
  models.TripInterest || model("TripInterest", tripInterestSchema);
