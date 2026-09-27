/**
 * Seed demo data for Stranger Trips.
 *   npm run seed
 *
 * Only touches demo data: users with an @demo.test email and everything they
 * own. Real accounts and trips are left alone, so it's safe to re-run.
 */
import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";
import { Agency } from "@/lib/db/models/agency";
import { Booking } from "@/lib/db/models/booking";
import { BuddyRequest } from "@/lib/db/models/buddy-request";
import { Message } from "@/lib/db/models/message";
import { Notification } from "@/lib/db/models/notification";
import { Report } from "@/lib/db/models/report";
import { TravelPlan } from "@/lib/db/models/travel-plan";
import { Trip } from "@/lib/db/models/trip";
import { TripInterest } from "@/lib/db/models/trip-interest";
import { User } from "@/lib/db/models/user";
import type { Personality } from "@/lib/trips/constants";

const PASSWORD = "password123";
const DAY = 24 * 60 * 60 * 1000;

function daysFromNow(days: number) {
  const d = new Date(Date.now() + days * DAY);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

type SeedUser = {
  key: string;
  name: string;
  city: string;
  birthYear: number;
  gender: "female" | "male";
  personality: Personality[];
  bio: string;
};

const travellers: SeedUser[] = [
  { key: "priya", name: "Priya Sharma", city: "Delhi", birthYear: 1999, gender: "female", personality: ["adventure", "photography", "trekking"], bio: "Weekend trekker, weekday analyst. Always carrying a camera." },
  { key: "arjun", name: "Arjun Mehta", city: "Mumbai", birthYear: 1997, gender: "male", personality: ["party", "nightlife", "social"], bio: "Here for good music and better company." },
  { key: "sneha", name: "Sneha Iyer", city: "Bangalore", birthYear: 2001, gender: "female", personality: ["chill", "food", "culture"], bio: "I plan trips around what I'm going to eat." },
  { key: "rohan", name: "Rohan Verma", city: "Chandigarh", birthYear: 1998, gender: "male", personality: ["adventure", "trekking", "introvert"], bio: "Quiet on the trail, loud at the summit." },
  { key: "ananya", name: "Ananya Gupta", city: "Jaipur", birthYear: 2000, gender: "female", personality: ["photography", "culture", "chill"], bio: "Old forts, slow mornings, film cameras." },
  { key: "kabir", name: "Kabir Singh", city: "Delhi", birthYear: 1996, gender: "male", personality: ["party", "social", "food"], bio: "Will organise the group dinner." },
  { key: "meera", name: "Meera Nair", city: "Kochi", birthYear: 1995, gender: "female", personality: ["chill", "introvert", "photography"], bio: "Sunsets and a good book." },
  { key: "vikram", name: "Vikram Rao", city: "Hyderabad", birthYear: 1999, gender: "male", personality: ["adventure", "social", "nightlife"], bio: "Rafting, paragliding, anything with an adrenaline rush." },
  { key: "isha", name: "Isha Kapoor", city: "Chandigarh", birthYear: 2002, gender: "female", personality: ["social", "party", "food"], bio: "First solo trip this year!" },
  { key: "dev", name: "Dev Patel", city: "Ahmedabad", birthYear: 1997, gender: "male", personality: ["trekking", "adventure", "photography"], bio: "Collecting Himalayan passes." },
];

type SeedTrip = {
  title: string;
  origin: string;
  destination: string;
  region: string;
  start: number;
  nights: number;
  price: number;
  maxGroupSize: number;
  vibes: Personality[];
  summary: string;
  highlights: string[];
  itinerary: [string, string][];
  inclusions: string[];
  exclusions: string[];
  captain: { name: string; phone: string; bio: string };
  members: string[];
};

const commonInclusions = ["Transport in AC tempo traveller", "Stays on twin/triple sharing", "Breakfast & dinner", "Trip captain throughout"];
const commonExclusions = ["Lunch", "Personal expenses", "Adventure activities unless listed"];

const trips: SeedTrip[] = [
  {
    title: "Manali Weekend Escape",
    origin: "Delhi", destination: "Manali", region: "Himachal Pradesh",
    start: 14, nights: 2, price: 7999, maxGroupSize: 16,
    vibes: ["adventure", "social", "photography", "chill"],
    summary: "Overnight Volvo from Delhi, two days in the mountains and a group you'll keep in touch with. Perfect first stranger trip.",
    highlights: ["Solang Valley snow point", "Old Manali cafés", "Bonfire night with the group"],
    itinerary: [["Arrive in Manali", "Check in, meet the group, evening walk around Old Manali"], ["Solang Valley", "Snow point, optional paragliding, bonfire at night"], ["Hadimba & departure", "Hadimba temple, Mall Road, overnight bus back"]],
    inclusions: commonInclusions, exclusions: commonExclusions,
    captain: { name: "Aditya", phone: "+91 98100 11111", bio: "Has led 40+ Himachal trips. Knows every chai stall on the way." },
    members: ["priya", "rohan", "vikram", "isha", "dev"],
  },
  {
    title: "Goa Beach & Nightlife Getaway",
    origin: "Mumbai", destination: "Goa", region: "Goa",
    start: 21, nights: 3, price: 11999, maxGroupSize: 20,
    vibes: ["party", "nightlife", "social", "food"],
    summary: "North Goa beaches by day, the best clubs by night. Scooters, seafood and sunsets with a crew of new friends.",
    highlights: ["Beach hopping on scooters", "Sunset cruise", "Night market"],
    itinerary: [["Arrival & Baga", "Check in, beach time, welcome dinner"], ["North Goa", "Fort Aguada, Anjuna, sunset cruise, clubbing"], ["South Goa", "Palolem, Cabo de Rama, seafood dinner"], ["Departure", "Brunch and goodbyes"]],
    inclusions: commonInclusions, exclusions: [...commonExclusions, "Club entry"],
    captain: { name: "Tanya", phone: "+91 98200 22222", bio: "Goa local and the reason your playlist will improve." },
    members: ["arjun", "kabir", "isha", "vikram"],
  },
  {
    title: "Kasol & Kheerganga Trek",
    origin: "Delhi", destination: "Kasol", region: "Himachal Pradesh",
    start: 10, nights: 3, price: 5999, maxGroupSize: 14,
    vibes: ["trekking", "adventure", "chill", "introvert"],
    summary: "Parvati Valley at its best — riverside camps in Kasol and the hot springs at the top of Kheerganga.",
    highlights: ["Kheerganga hot springs", "Riverside camping", "Chalal village walk"],
    itinerary: [["Kasol", "Arrive, riverside camp, Chalal walk"], ["Trek to Kheerganga", "12 km trek, hot springs, overnight in camps"], ["Descend to Barshaini", "Trek down, Manikaran gurudwara"], ["Departure", "Overnight bus to Delhi"]],
    inclusions: [...commonInclusions, "Trek guide & camping gear"], exclusions: commonExclusions,
    captain: { name: "Rahul", phone: "+91 98100 33333", bio: "Certified trek leader, Parvati Valley regular." },
    members: ["rohan", "dev", "meera"],
  },
  {
    title: "Rishikesh Rafting & Camping",
    origin: "Delhi", destination: "Rishikesh", region: "Uttarakhand",
    start: 7, nights: 2, price: 4999, maxGroupSize: 18,
    vibes: ["adventure", "social", "party"],
    summary: "16 km of white-water rafting, beach camps on the Ganga and the evening aarti. A short, high-energy weekend.",
    highlights: ["16 km rafting", "Riverside beach camp", "Ganga aarti at Triveni Ghat"],
    itinerary: [["Arrive & camp", "Check in, volleyball on the beach, bonfire"], ["Rafting day", "Rafting, cliff jumping, Beatles Ashram, aarti"], ["Departure", "Café breakfast and head home"]],
    inclusions: [...commonInclusions, "Rafting with certified guides"], exclusions: commonExclusions,
    captain: { name: "Neha", phone: "+91 98100 44444", bio: "Ex-rafting guide, now herding strangers into friendships." },
    members: ["vikram", "kabir", "priya"],
  },
  {
    title: "Gokarna Coastal Trail",
    origin: "Bangalore", destination: "Gokarna", region: "Karnataka",
    start: 28, nights: 2, price: 6499, maxGroupSize: 12,
    vibes: ["chill", "trekking", "photography"],
    summary: "The quieter side of the coast: a beach-to-beach trek, cliffside sunsets and hammocks.",
    highlights: ["Beach trek: Kudle → Om → Half Moon → Paradise", "Sunset at Om Beach", "Temple town walk"],
    itinerary: [["Arrive & Kudle beach", "Check in, sunset at Kudle"], ["Coastal trek", "Beach-to-beach trek, boat back"], ["Departure", "Mahabaleshwar temple, head back"]],
    inclusions: commonInclusions, exclusions: commonExclusions,
    captain: { name: "Karthik", phone: "+91 98450 55555", bio: "Coast lover, knows the tide tables by heart." },
    members: ["sneha", "meera"],
  },
  {
    title: "Spiti Valley Circuit",
    origin: "Chandigarh", destination: "Spiti", region: "Himachal Pradesh",
    start: 40, nights: 7, price: 21999, maxGroupSize: 12,
    vibes: ["adventure", "photography", "culture", "introvert"],
    summary: "A week in the cold desert — monasteries, fossil villages and the highest post office in the world.",
    highlights: ["Key Monastery", "Chandratal Lake", "Hikkim post office"],
    itinerary: [["Chandigarh → Narkanda", "Drive and acclimatise"], ["Narkanda → Sangla", "Kinnaur valley"], ["Sangla → Nako", "Nako lake"], ["Nako → Kaza", "Tabo monastery on the way"], ["Kaza villages", "Key, Kibber, Hikkim, Langza"], ["Kaza → Chandratal", "Camp by the lake"], ["Chandratal → Manali", "Over Kunzum and Rohtang"], ["Departure", "Head back to Chandigarh"]],
    inclusions: [...commonInclusions, "Oxygen cylinder & first aid"], exclusions: commonExclusions,
    captain: { name: "Tenzin", phone: "+91 98160 66666", bio: "Grew up in Kaza. Will teach you to say julley properly." },
    members: ["rohan", "ananya", "dev"],
  },
  {
    title: "Rajasthan Heritage Trail",
    origin: "Delhi", destination: "Jaipur & Udaipur", region: "Rajasthan",
    start: 35, nights: 4, price: 12499, maxGroupSize: 16,
    vibes: ["culture", "food", "photography"],
    summary: "Forts, palaces and dal baati — the pink city and the city of lakes with a curious, food-loving group.",
    highlights: ["Amber Fort at sunrise", "Lake Pichola boat ride", "Rajasthani thali night"],
    itinerary: [["Jaipur", "Hawa Mahal, City Palace, street food walk"], ["Amber & Nahargarh", "Amber Fort, sunset at Nahargarh"], ["To Udaipur", "Drive via Chittorgarh fort"], ["Udaipur", "City Palace, Lake Pichola boat ride"], ["Departure", "Morning at Sajjangarh"]],
    inclusions: commonInclusions, exclusions: [...commonExclusions, "Monument entry fees"],
    captain: { name: "Simran", phone: "+91 98100 77777", bio: "History nerd and thali expert." },
    members: ["ananya", "sneha", "kabir"],
  },
  {
    title: "Valley of Flowers Trek",
    origin: "Delhi", destination: "Valley of Flowers", region: "Uttarakhand",
    start: 55, nights: 5, price: 14999, maxGroupSize: 14,
    vibes: ["trekking", "photography", "adventure"],
    summary: "A UNESCO valley carpeted in wildflowers, plus the high-altitude lake at Hemkund Sahib.",
    highlights: ["Valley of Flowers", "Hemkund Sahib", "Ghangaria village"],
    itinerary: [["Delhi → Rishikesh", "Evening aarti"], ["Rishikesh → Govindghat", "Scenic mountain drive"], ["Trek to Ghangaria", "10 km trek"], ["Valley of Flowers", "Full day in the valley"], ["Hemkund Sahib", "Trek to the lake"], ["Return", "Trek down and drive back"]],
    inclusions: [...commonInclusions, "Trek guide & permits"], exclusions: commonExclusions,
    captain: { name: "Manish", phone: "+91 98100 88888", bio: "Botanist who got lost in the mountains and never came back." },
    members: ["priya"],
  },
];

// A finished trip so trust scores reflect completed travel.
const pastTrip: SeedTrip = {
  title: "McLeodganj & Triund",
  origin: "Delhi", destination: "McLeodganj", region: "Himachal Pradesh",
  start: -30, nights: 2, price: 5499, maxGroupSize: 14,
  vibes: ["trekking", "chill", "culture"],
  summary: "Tibetan cafés, the Dalai Lama temple and a night under the stars at Triund.",
  highlights: ["Triund trek", "Bhagsu waterfall"],
  itinerary: [["McLeodganj", "Cafés and monastery"], ["Triund", "Trek and camp"], ["Departure", "Trek down, head home"]],
  inclusions: commonInclusions, exclusions: commonExclusions,
  captain: { name: "Aditya", phone: "+91 98100 11111", bio: "Has led 40+ Himachal trips." },
  members: ["demo", "priya", "rohan", "meera", "ananya"],
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (see .env.example)");
  await mongoose.connect(uri);
  await Promise.all(
    [User, Agency, Trip, Booking, TravelPlan, BuddyRequest, Report, TripInterest, Message, Notification].map(
      (m) => (m as typeof User).init(),
    ),
  );

  // Remove previous demo data only.
  const oldUsers = await User.find({ email: /@demo\.test$/ }).select("_id");
  const oldIds = oldUsers.map((u) => u._id);
  const oldAgencies = await Agency.find({ owner: { $in: oldIds } }).select("_id");
  // Older seeds linked trips to a user via `organizer`; the raw collection sees that field.
  const oldTrips = await Trip.collection
    .find({ $or: [{ agency: { $in: oldAgencies.map((a) => a._id) } }, { organizer: { $exists: true } }] })
    .project({ _id: 1 })
    .toArray();
  const oldTripIds = oldTrips.map((t) => t._id);
  await Promise.all([
    Booking.deleteMany({ $or: [{ user: { $in: oldIds } }, { trip: { $in: oldTripIds } }] }),
    BuddyRequest.deleteMany({ $or: [{ from: { $in: oldIds } }, { to: { $in: oldIds } }] }),
    TravelPlan.deleteMany({ user: { $in: oldIds } }),
    Report.deleteMany({ $or: [{ reporter: { $in: oldIds } }, { reported: { $in: oldIds } }] }),
    TripInterest.deleteMany({ $or: [{ user: { $in: oldIds } }, { trip: { $in: oldTripIds } }] }),
    Message.deleteMany({ $or: [{ user: { $in: oldIds } }, { trip: { $in: oldTripIds } }] }),
    Notification.deleteMany({ user: { $in: oldIds } }),
    Trip.deleteMany({ _id: { $in: oldTripIds } }),
    Agency.deleteMany({ _id: { $in: oldAgencies.map((a) => a._id) } }),
  ]);
  await User.deleteMany({ _id: { $in: oldIds } });

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const ids = new Map<string, Types.ObjectId>();

  const admin = await User.create({
    name: "Site Admin",
    email: "admin@demo.test",
    passwordHash,
    role: "admin",
    verification: { email: true, phone: true, identity: true },
  });

  // Agencies: two approved (they run all the trips) and one waiting for review.
  async function createAgency(key: string, owner: string, a: { name: string; city: string; phone: string; registrationNumber: string; description: string }, status: "approved" | "pending") {
    const user = await User.create({
      name: owner,
      email: `${key}@demo.test`,
      passwordHash,
      role: "agency",
      platforms: ["trips"],
      city: a.city,
      phone: a.phone,
      verification: { email: true, phone: true, identity: status === "approved" },
    });
    return Agency.create({
      ...a,
      owner: user._id,
      email: `${key}@demo.test`,
      status,
      reviewedAt: status === "approved" ? new Date() : undefined,
      reviewedBy: status === "approved" ? admin._id : undefined,
    });
  }

  const wanderlust = await createAgency("agency", "Rhea Malhotra", {
    name: "Wanderlust Collective",
    city: "Delhi",
    phone: "+91 98100 00000",
    registrationNumber: "07AABCW1234F1Z5",
    description: "Small-group trips for solo travellers since 2019. Beaches, rivers and heritage.",
  }, "approved");
  const himalayan = await createAgency("himalaya", "Tenzin Norbu", {
    name: "Himalayan Trails Co.",
    city: "Manali",
    phone: "+91 98160 00000",
    registrationNumber: "MOT/HP/2021/0456",
    description: "Certified trek leaders running Himalayan treks and road trips.",
  }, "approved");
  const pendingAgency = await createAgency("pending", "Karan Desai", {
    name: "Coastal Nomads",
    city: "Goa",
    phone: "+91 98220 00000",
    registrationNumber: "30AAFCC5678K1Z2",
    description: "Surf camps and coastal road trips along the Konkan coast.",
  }, "pending");

  const HIMALAYAN = new Set(["Kasol & Kheerganga Trek", "Spiti Valley Circuit", "Valley of Flowers Trek", "McLeodganj & Triund", "Manali Weekend Escape"]);

  const demo = await User.create({
    name: "Demo Traveller",
    email: "demo@demo.test",
    passwordHash,
    platforms: ["trips"],
    city: "Chandigarh",
    birthYear: 1998,
    gender: "unspecified",
    personality: ["adventure", "photography", "chill"],
    bio: "Trying out Stranger Trips.",
    phone: "+91 90000 00001",
    emergencyContact: { name: "Mom", phone: "+91 90000 00002" },
    verification: { email: true, phone: true, identity: false },
  });
  ids.set("demo", demo._id);

  for (const [i, t] of travellers.entries()) {
    const user = await User.create({
      ...t,
      email: `${t.key}@demo.test`,
      passwordHash,
      platforms: ["trips"],
      phone: `+91 91000 ${String(10000 + i).padStart(5, "0")}`,
      emergencyContact: { name: "Family", phone: `+91 92000 ${String(10000 + i).padStart(5, "0")}` },
      verification: { email: true, phone: i % 3 !== 0, identity: i % 2 === 0 },
    });
    ids.set(t.key, user._id);
  }

  const tripIds = new Map<string, Types.ObjectId>();
  for (const t of [...trips, pastTrip]) {
    const startDate = daysFromNow(t.start);
    const trip = await Trip.create({
      slug: slugify(`${t.destination} ${t.title}`),
      title: t.title,
      origin: t.origin,
      destination: t.destination,
      region: t.region,
      summary: t.summary,
      startDate,
      endDate: new Date(+startDate + t.nights * DAY),
      price: t.price,
      maxGroupSize: t.maxGroupSize,
      vibes: t.vibes,
      highlights: t.highlights,
      itinerary: t.itinerary.map(([title, description], i) => ({ day: i + 1, title, description })),
      inclusions: t.inclusions,
      exclusions: t.exclusions,
      captain: t.captain,
      agency: HIMALAYAN.has(t.title) ? himalayan._id : wanderlust._id,
    });
    tripIds.set(t.title, trip._id);
    await Booking.insertMany(
      t.members.map((key, i) => ({
        trip: trip._id,
        user: ids.get(key),
        amount: t.price,
        // Mix of paid and unpaid so the agency view has something to manage.
        paymentStatus: t.start < 0 || i % 2 === 0 ? "paid" : "unpaid",
      })),
    );
    await Message.insertMany(
      t.members.map((key) => ({ trip: trip._id, kind: "system", body: `${key === "demo" ? "Demo" : travellers.find((u) => u.key === key)!.name.split(" ")[0]} joined the group.` })),
    );
  }

  // A lively group chat on the Manali trip.
  const manali = tripIds.get("Manali Weekend Escape")!;
  const t0 = Date.now() - 2 * DAY;
  await Message.insertMany([
    { trip: manali, user: himalayan.owner, body: "Welcome everyone! Bus leaves Majnu ka Tilla at 7:30 PM. Carry warm layers — it's 2°C at Solang.", createdAt: new Date(t0) },
    { trip: manali, user: ids.get("priya"), body: "So excited! Anyone want to split a paragliding slot?", createdAt: new Date(t0 + 3600e3) },
    { trip: manali, user: ids.get("rohan"), body: "I'm in for paragliding 🙌", createdAt: new Date(t0 + 3700e3) },
    { trip: manali, user: ids.get("isha"), body: "First solo trip — see you all at the bus!", createdAt: new Date(t0 + 5000e3) },
  ]);

  // People who saved trips without booking yet.
  const interests: [string, string][] = [
    ["demo", "Spiti Valley Circuit"], ["demo", "Valley of Flowers Trek"], ["sneha", "Goa Beach & Nightlife Getaway"],
    ["meera", "Spiti Valley Circuit"], ["arjun", "Rishikesh Rafting & Camping"], ["ananya", "Valley of Flowers Trek"],
    ["kabir", "Manali Weekend Escape"], ["isha", "Rajasthan Heritage Trail"],
  ];
  await TripInterest.insertMany(interests.map(([user, title]) => ({ user: ids.get(user), trip: tripIds.get(title) })));

  // One open safety report for the admin queue.
  await Report.create({
    reporter: ids.get("isha"),
    reported: ids.get("kabir"),
    trip: tripIds.get("Goa Beach & Nightlife Getaway"),
    reason: "harassment",
    details: "Kept messaging me privately after I said no. Please look into it.",
  });

  await Notification.insertMany([
    { user: admin._id, title: `New agency to review: ${pendingAgency.name}`, href: `/admin/agencies/${pendingAgency._id}` },
    { user: admin._id, title: "New safety report", body: "Harassment or abuse", href: "/admin/reports" },
    { user: himalayan.owner, title: "Priya is interested in Valley of Flowers Trek", href: `/agency/trips/${tripIds.get("Valley of Flowers Trek")}` },
    { user: wanderlust.owner, title: "Your agency is approved — you can now publish trips.", href: "/agency", read: true },
  ]);

  const plans = [
    { key: "priya", origin: "Delhi", destination: "Leh Ladakh", start: 45, nights: 7, budget: 30000, lookingFor: ["adventure", "photography"], note: "Planning to rent bikes in Leh. Looking for 1–2 people who can ride." },
    { key: "arjun", origin: "Mumbai", destination: "Goa", start: 18, nights: 3, budget: 12000, lookingFor: ["party", "nightlife"], note: "Sunburn-style weekend, splitting a villa." },
    { key: "meera", origin: "Kochi", destination: "Pondicherry", start: 25, nights: 3, budget: 9000, lookingFor: ["chill", "food", "culture"], note: "Slow trip — cafés, French quarter, Auroville." },
    { key: "rohan", origin: "Chandigarh", destination: "Tirthan Valley", start: 12, nights: 3, budget: 8000, lookingFor: ["trekking", "introvert"] },
    { key: "demo", origin: "Chandigarh", destination: "Hampi", start: 30, nights: 4, budget: 10000, lookingFor: ["photography", "culture", "chill"], note: "Bouldering and sunsets." },
  ] as const;

  const planIds = new Map<string, Types.ObjectId>();
  for (const p of plans) {
    const startDate = daysFromNow(p.start);
    const plan = await TravelPlan.create({
      user: ids.get(p.key),
      origin: p.origin,
      destination: p.destination,
      startDate,
      endDate: new Date(+startDate + p.nights * DAY),
      budget: p.budget,
      lookingFor: [...p.lookingFor],
      note: "note" in p ? p.note : undefined,
    });
    planIds.set(p.key, plan._id);
  }

  await BuddyRequest.create([
    { plan: planIds.get("demo"), from: ids.get("ananya"), to: demo._id, message: "Hampi is on my list too! I shoot film — would love to join." },
    { plan: planIds.get("demo"), from: ids.get("meera"), to: demo._id, message: "Up for slow mornings and sunsets?" },
    { plan: planIds.get("priya"), from: ids.get("dev"), to: ids.get("priya"), message: "I ride and have done Khardung La before.", status: "accepted" },
  ]);

  console.log(`Seeded ${trips.length + 1} trips, 3 agencies, ${travellers.length + 5} users, ${plans.length} travel plans.`);
  console.log(`Logins (password: ${PASSWORD}):`);
  console.log("  admin@demo.test     admin");
  console.log("  agency@demo.test    agency (Wanderlust Collective, approved)");
  console.log("  himalaya@demo.test  agency (Himalayan Trails Co., approved)");
  console.log("  pending@demo.test   agency (Coastal Nomads, awaiting approval)");
  console.log("  demo@demo.test      traveller");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
