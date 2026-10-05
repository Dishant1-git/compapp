import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * A government ID uploaded to prove a traveller's age. Private: served by
 * /api/trips/documents/[id] to its owner and admins only, and deleted as soon
 * as an admin has decided the age check.
 */
const idDocumentSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    booking: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    contentType: { type: String, required: true },
    bytes: { type: Number, required: true },
    data: { type: Buffer, required: true, select: false },
  },
  { timestamps: true },
);

export type IdDocumentDoc = InferSchemaType<typeof idDocumentSchema>;

export const IdDocument: Model<IdDocumentDoc> = models.IdDocument || model("IdDocument", idDocumentSchema);
