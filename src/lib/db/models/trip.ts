import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { PERSONALITY_IDS } from "@/lib/trips/constants";

const tripSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true, trim: true },
    origin: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
    summary: { type: String, required: true, trim: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    maxGroupSize: { type: Number, required: true, min: 2 },
    minAge: { type: Number, default: 18 },

    vibes: { type: [String], enum: PERSONALITY_IDS, default: [] },
    highlights: { type: [String], default: [] },
    itinerary: {
      type: [{ day: Number, title: String, description: String }],
      default: [],
    },
    inclusions: { type: [String], default: [] },
    exclusions: { type: [String], default: [] },

    captain: {
      name: { type: String, required: true },
      phone: { type: String },
      bio: { type: String },
    },

    status: { type: String, enum: ["open", "cancelled"], default: "open" },
    cancelReason: { type: String, trim: true },
    agency: { type: Schema.Types.ObjectId, ref: "Agency", required: true },
  },
  { timestamps: true },
);

tripSchema.index({ startDate: 1, status: 1 });
tripSchema.index({ agency: 1 });

export type TripDoc = InferSchemaType<typeof tripSchema>;

export const Trip: Model<TripDoc> = models.Trip || model("Trip", tripSchema);
