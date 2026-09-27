import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { REPORT_REASONS } from "@/lib/trips/constants";

const reportSchema = new Schema(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reported: { type: Schema.Types.ObjectId, ref: "User", required: true },
    trip: { type: Schema.Types.ObjectId, ref: "Trip" },
    reason: { type: String, enum: REPORT_REASONS.map((r) => r.id), required: true },
    details: { type: String, trim: true, maxlength: 1000 },
    status: { type: String, enum: ["open", "reviewed", "dismissed"], default: "open" },
  },
  { timestamps: true },
);

export type ReportDoc = InferSchemaType<typeof reportSchema>;

export const Report: Model<ReportDoc> = models.Report || model("Report", reportSchema);
