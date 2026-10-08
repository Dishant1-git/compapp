import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Profile photos and verification selfies, stored in MongoDB so the app needs no
 * extra storage service. The browser resizes images before upload, so each is a
 * few hundred KB. Served by /api/companion/images/[id].
 */
const companionImageSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    kind: { type: String, enum: ["photo", "selfie"], required: true },
    contentType: { type: String, required: true },
    bytes: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true },
);

export type CompanionImageDoc = InferSchemaType<typeof companionImageSchema>;

export const CompanionImage: Model<CompanionImageDoc> =
  models.CompanionImage || model("CompanionImage", companionImageSchema);
