import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * A message in a trip's group chat. Members are travellers with a confirmed
 * seat plus the agency running the trip. `kind: "system"` messages record
 * joins/leaves and have no author.
 */
const messageSchema = new Schema(
  {
    trip: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    kind: { type: String, enum: ["text", "system"], default: "text" },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true },
);

messageSchema.index({ trip: 1, createdAt: 1 });

export type MessageDoc = InferSchemaType<typeof messageSchema>;

export const Message: Model<MessageDoc> = models.Message || model("Message", messageSchema);
