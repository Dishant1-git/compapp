import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import {
  BODY_TYPES,
  COMPANION_GENDERS,
  DEFAULT_DISTANCE_KM,
  DRINKING,
  HOBBIES,
  SEXUALITIES,
  SMOKING,
} from "@/lib/companion/constants";

const ids = (options: readonly { id: string }[]) => options.map((o) => o.id);

// GeoJSON point, so matching can later use $near. Only set when the person shares their location.
const pointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false },
);

/**
 * A person's Companion dating profile. The account itself (name, phone,
 * verification) lives on User; this holds everything collected in the join flow.
 * Saved slide by slide, so `status` stays "draft" until they tap Done.
 */
const companionProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    status: { type: String, enum: ["draft", "active"], default: "draft" },
    completedAt: Date,

    birthDate: Date,
    heightCm: Number,
    bodyType: { type: String, enum: ids(BODY_TYPES) },
    location: {
      city: { type: String, trim: true },
      point: { type: pointSchema, default: undefined },
    },
    // How far away the profiles they're shown may be (see DISTANCES).
    maxDistanceKm: { type: Number, default: DEFAULT_DISTANCE_KM },
    gender: { type: String, enum: ids(COMPANION_GENDERS) },
    sexuality: { type: [String], enum: ids(SEXUALITIES), default: [] },
    showSexuality: { type: Boolean, default: true },
    hobbies: { type: [String], enum: ids(HOBBIES), default: [] },
    drinking: { type: String, enum: ids(DRINKING) },
    smoking: { type: String, enum: ids(SMOKING) },

    // Ordered; the first one is the main profile photo.
    photos: [{ type: Schema.Types.ObjectId, ref: "CompanionImage" }],
    selfie: {
      image: { type: Schema.Types.ObjectId, ref: "CompanionImage" },
      pose: String,
      status: { type: String, enum: ["pending", "verified", "rejected"] },
      submittedAt: Date,
      reviewedAt: Date,
      note: String,
      // Face-match distance from the automatic check (lower = more alike).
      matchDistance: Number,
    },
  },
  { timestamps: true },
);

companionProfileSchema.index({ "location.point": "2dsphere" });
companionProfileSchema.index({ status: 1, "selfie.status": 1 });

export type CompanionProfileDoc = InferSchemaType<typeof companionProfileSchema>;

export const CompanionProfile: Model<CompanionProfileDoc> =
  models.CompanionProfile || model("CompanionProfile", companionProfileSchema);
