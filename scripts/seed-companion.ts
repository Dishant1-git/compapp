/**
 * Seed finished, verified demo profiles for Companion, so the discover page
 * (/companion/discover) has people to show.
 *   npm run seed:companion              add (or refresh) the demo profiles
 *   npm run seed:companion -- --remove  take them out again
 *
 * Only touches demo data: accounts with an @companion-demo.test email, their
 * profiles and their photos. They have no password, so nobody can sign in as
 * them. Photos are the site's own stock images (public/images), not portraits.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { ensureSrvDns } from "@/lib/db/dns";
import { CompanionImage } from "@/lib/db/models/companion-image";
import { CompanionProfile } from "@/lib/db/models/companion-profile";
import { User } from "@/lib/db/models/user";

const DEMO_EMAIL = /@companion-demo\.test$/;

type DemoPerson = {
  name: string;
  city: string;
  /** [lng, lat] of the city centre. Leave out for someone who only typed their city. */
  point?: [number, number];
  gender: "female" | "male";
  born: string; // yyyy-mm-dd
  heightCm: number;
  bodyType: string;
  hobbies: string[];
  drinking: string;
  smoking: string;
  photo: string;
};

// Distances are from Ludhiana, to try the distance options.
const people: DemoPerson[] = [
  { name: "Simran Kaur", city: "Ludhiana", point: [75.85, 30.91], gender: "female", born: "1999-04-12", heightCm: 163, bodyType: "slim", hobbies: ["music", "coffee", "travel", "dancing"], drinking: "socially", smoking: "never", photo: "brand-solo-street.webp" },
  { name: "Harman Gill", city: "Ludhiana", gender: "male", born: "1996-11-03", heightCm: 178, bodyType: "athletic", hobbies: ["fitness", "cricket", "foodie"], drinking: "rarely", smoking: "never", photo: "trips-hikers.webp" },
  { name: "Jasleen Sandhu", city: "Jalandhar", point: [75.58, 31.33], gender: "female", born: "2000-07-21", heightCm: 160, bodyType: "average", hobbies: ["reading", "movies", "cooking"], drinking: "never", smoking: "never", photo: "companion-dinner.webp" }, // ~55 km
  { name: "Arjun Brar", city: "Moga", point: [75.17, 30.82], gender: "male", born: "1997-02-15", heightCm: 181, bodyType: "muscular", hobbies: ["fitness", "gaming", "music"], drinking: "socially", smoking: "occasionally", photo: "brand-friends-sunset.webp" }, // ~66 km
  { name: "Navneet Dhillon", city: "Patiala", point: [76.39, 30.34], gender: "female", born: "1998-09-30", heightCm: 166, bodyType: "athletic", hobbies: ["yoga", "photography", "travel", "pets"], drinking: "rarely", smoking: "never", photo: "companion-concert.webp" }, // ~80 km
  { name: "Kabir Sethi", city: "Chandigarh", point: [76.78, 30.73], gender: "male", born: "1995-05-08", heightCm: 175, bodyType: "average", hobbies: ["startups", "tech", "coffee"], drinking: "socially", smoking: "never", photo: "brand-solo-street.webp" }, // ~90 km
  { name: "Mehak Sidhu", city: "Bathinda", point: [74.95, 30.21], gender: "female", born: "2001-01-19", heightCm: 158, bodyType: "curvy", hobbies: ["singing", "fashion", "art"], drinking: "never", smoking: "never", photo: "companion-dinner.webp" }, // ~116 km
  { name: "Gurpreet Randhawa", city: "Amritsar", point: [74.87, 31.63], gender: "male", born: "1994-12-01", heightCm: 183, bodyType: "athletic", hobbies: ["trekking", "running", "foodie"], drinking: "rarely", smoking: "never", photo: "trips-hikers.webp" }, // ~125 km
  { name: "Tanya Malhotra", city: "Delhi", point: [77.21, 28.61], gender: "female", born: "1997-06-25", heightCm: 165, bodyType: "slim", hobbies: ["concerts", "writing", "coffee"], drinking: "socially", smoking: "never", photo: "brand-friends-sunset.webp" }, // ~285 km
];

async function removeDemo() {
  const users = await User.find({ email: DEMO_EMAIL }).select("_id").lean();
  const ids = users.map((u) => u._id);
  await CompanionImage.deleteMany({ owner: { $in: ids } });
  await CompanionProfile.deleteMany({ user: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set (see .env.example)");
  ensureSrvDns();
  await mongoose.connect(uri);

  const removed = await removeDemo();
  if (process.argv.includes("--remove")) {
    console.log(`Removed ${removed} Companion demo profile${removed === 1 ? "" : "s"}.`);
    return;
  }

  for (const [i, p] of people.entries()) {
    const born = new Date(`${p.born}T00:00:00Z`);
    const user = await User.create({
      name: p.name,
      email: `${p.name.toLowerCase().replace(/\s+/g, ".")}@companion-demo.test`,
      platforms: ["companion"],
      city: p.city,
      gender: p.gender,
      birthYear: born.getUTCFullYear(),
      verification: { email: true, identity: true },
    });
    const data = await readFile(path.join(process.cwd(), "public/images", p.photo));
    const photo = await CompanionImage.create({
      owner: user._id,
      kind: "photo",
      contentType: "image/webp",
      bytes: data.length,
      data,
    });
    await CompanionProfile.create({
      user: user._id,
      status: "active",
      completedAt: new Date(Date.now() - i * 60_000),
      birthDate: born,
      heightCm: p.heightCm,
      bodyType: p.bodyType,
      location: p.point ? { city: p.city, point: { type: "Point", coordinates: p.point } } : { city: p.city },
      gender: p.gender,
      sexuality: ["straight"],
      hobbies: p.hobbies,
      drinking: p.drinking,
      smoking: p.smoking,
      photos: [photo._id],
      // Marked verified without a selfie: these aren't real people.
      selfie: { status: "verified", submittedAt: new Date(), reviewedAt: new Date() },
    });
  }
  console.log(`Seeded ${people.length} Companion demo profiles: ${people.map((p) => p.city).join(", ")}.`);
  console.log("Take them out again with: npm run seed:companion -- --remove");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
