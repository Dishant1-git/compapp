// Trust score: a transparent 0–100 score built from verification, profile
// completeness and trip history. Shown as a breakdown, not just a number.

export type TrustInput = {
  verification: { email: boolean; phone: boolean; identity: boolean };
  hasBio: boolean;
  hasCity: boolean;
  hasAge: boolean;
  personalityCount: number;
  hasEmergencyContact: boolean;
  tripsCompleted: number;
  cancellations: number;
  /** Only reports that moderators have upheld count against a user. */
  upheldReports: number;
};

export type TrustItem = { label: string; points: number; max: number };

export type TrustScore = { score: number; items: TrustItem[] };

export function computeTrust(input: TrustInput): TrustScore {
  const items: TrustItem[] = [
    { label: "Account created", points: 10, max: 10 },
    { label: "Email verified", points: input.verification.email ? 10 : 0, max: 10 },
    { label: "Phone verified", points: input.verification.phone ? 15 : 0, max: 15 },
    { label: "Identity verified", points: input.verification.identity ? 20 : 0, max: 20 },
    {
      label: "Profile complete",
      points:
        (input.hasBio ? 5 : 0) +
        (input.hasCity ? 5 : 0) +
        (input.hasAge ? 5 : 0) +
        (input.personalityCount >= 3 ? 5 : 0) +
        (input.hasEmergencyContact ? 5 : 0),
      max: 25,
    },
    {
      label: `Trips completed (${input.tripsCompleted})`,
      points: Math.min(input.tripsCompleted * 5, 20),
      max: 20,
    },
  ];

  if (input.cancellations > 0) {
    items.push({
      label: `Cancellations (${input.cancellations})`,
      points: -Math.min(input.cancellations * 3, 15),
      max: 0,
    });
  }
  if (input.upheldReports > 0) {
    items.push({
      label: `Upheld reports (${input.upheldReports})`,
      points: -input.upheldReports * 20,
      max: 0,
    });
  }

  const total = items.reduce((sum, item) => sum + item.points, 0);
  return { score: Math.max(0, Math.min(100, total)), items };
}
