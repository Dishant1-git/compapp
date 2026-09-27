// Plain, serializable shapes passed from the data layer to components.

export type TripSummary = {
  id: string;
  slug: string;
  title: string;
  origin: string;
  destination: string;
  region?: string;
  startDate: string;
  endDate: string;
  price: number;
  maxGroupSize: number;
  bookedCount: number;
  vibes: string[];
  compatibility: number | null;
};

export type GroupMember = {
  userId: string;
  firstName: string;
  age: number | null;
  city?: string;
  gender?: string;
  personality: string[];
  compatibility: number | null;
  isYou: boolean;
};

export type TripDetail = TripSummary & {
  summary: string;
  minAge: number;
  status: "open" | "cancelled";
  highlights: string[];
  itinerary: { day: number; title: string; description: string }[];
  inclusions: string[];
  exclusions: string[];
  captain: { name: string; bio?: string; phone?: string };
  group: GroupMember[];
  myBookingId: string | null;
  agency: { id: string; name: string; city: string; approved: boolean };
  interested: boolean;
  interestedCount: number;
  /** The viewer is this trip's agency or an admin. */
  canManage: boolean;
  cancelReason?: string;
};

export type MyBooking = {
  id: string;
  amount: number;
  paymentStatus: string;
  trip: Pick<TripSummary, "slug" | "title" | "origin" | "destination" | "startDate" | "endDate">;
};

export type PlanOwner = {
  id: string;
  firstName: string;
  age: number | null;
  city?: string;
  personality: string[];
  trustScore: number;
};

export type TravelPlanSummary = {
  id: string;
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  lookingFor: string[];
  note?: string;
  owner: PlanOwner;
  compatibility: number | null;
  /** The viewer's request status on this plan, if any. */
  myRequest: "pending" | "accepted" | "declined" | null;
  isMine: boolean;
};

export type BuddyRequestView = {
  id: string;
  status: "pending" | "accepted" | "declined";
  message?: string;
  plan: { id: string; destination: string; startDate: string; endDate: string };
  person: { firstName: string; city?: string; personality: string[]; trustScore: number };
  /** Only present once the request is accepted. */
  contact?: { name: string; email: string; phone?: string };
};

/** Result of a form Server Action. `values` echoes inputs so fields survive React's form reset. */
export type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
  values?: Record<string, string | string[]>;
};
