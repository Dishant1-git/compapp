import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const AGENCY_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type AgencyStatus = (typeof AGENCY_STATUSES)[number];

/** A travel agency that runs trips. Owned by one user with role "agency". */
const agencySchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    city: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    website: { type: String, trim: true },
    // e.g. Ministry of Tourism approval number or GSTIN — checked by an admin.
    registrationNumber: { type: String, trim: true },

    // Only approved agencies can publish trips; others' trips are hidden.
    status: { type: String, enum: AGENCY_STATUSES, default: "pending" },
    reviewNote: { type: String, trim: true },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

agencySchema.index({ status: 1 });

export type AgencyDoc = InferSchemaType<typeof agencySchema>;

export const Agency: Model<AgencyDoc> = models.Agency || model("Agency", agencySchema);
