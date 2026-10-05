import "server-only";
import { connectDB } from "@/lib/db/mongoose";
import { CompanionProfile } from "@/lib/db/models/companion-profile";
import { User } from "@/lib/db/models/user";
import { ID_RE } from "@/lib/form-utils";
import { firstName } from "@/lib/trips/format";
import { DEFAULT_DISTANCE_KM, ageFrom } from "./constants";
import { imageUrl, type CompanionDraft, type NearbyProfile, type SelfieStatus } from "./types";
import { isFrontend, remoteCall } from "@/lib/remote";

export type CompanionAccount = {
  name: string;
  phone: string | null;
  /** The account's email, if it has one: a code can be sent there instead of a text. */
  email: string | null;
  /** Companion needs a verified phone number or a verified email address. */
  verified: boolean;
};

export async function getCompanionAccount(userId: string): Promise<CompanionAccount | null> {
  if (isFrontend()) return remoteCall("companion/queries.getCompanionAccount", [userId]);
  await connectDB();
  const user = await User.findById(userId).select("name phone email verification").lean();
  if (!user) return null;
  return {
    name: user.name,
    phone: user.phone ?? null,
    email: user.email ?? null,
    verified: !!user.verification?.phone || (!!user.email && !!user.verification?.email),
  };
}

/** The saved profile as the join flow sees it, plus whether they've already finished. */
export async function getCompanionDraft(
  userId: string,
): Promise<{ draft: CompanionDraft; active: boolean } | null> {
  if (isFrontend()) return remoteCall("companion/queries.getCompanionDraft", [userId]);
  await connectDB();
  const [user, profile] = await Promise.all([
    User.findById(userId).select("name").lean(),
    CompanionProfile.findOne({ user: userId }).lean(),
  ]);
  if (!user) return null;

  const selfie = profile?.selfie;
  return {
    active: profile?.status === "active",
    draft: {
      name: user.name,
      birthDate: profile?.birthDate ? profile.birthDate.toISOString().slice(0, 10) : null,
      heightCm: profile?.heightCm ?? null,
      bodyType: profile?.bodyType ?? null,
      city: profile?.location?.city ?? "",
      sharedLocation: !!profile?.location?.point,
      maxDistanceKm: profile?.maxDistanceKm ?? DEFAULT_DISTANCE_KM,
      gender: profile?.gender ?? null,
      sexuality: profile?.sexuality ?? [],
      showSexuality: profile?.showSexuality ?? true,
      hobbies: profile?.hobbies ?? [],
      drinking: profile?.drinking ?? null,
      smoking: profile?.smoking ?? null,
      photos: (profile?.photos ?? []).map((id) => ({ id: String(id), url: imageUrl(String(id)) })),
      selfie:
        selfie?.image && selfie.status
          ? {
              status: selfie.status as SelfieStatus,
              url: imageUrl(String(selfie.image)),
              note: selfie.note ?? undefined,
            }
          : null,
    },
  };
}

// ─── Discover: other people's profiles ───────────────────────────────────────

const EARTH_RADIUS_KM = 6371;
/** Most profiles shown in one visit, nearest first. */
const NEARBY_LIMIT = 30;

/** Only live, photo-verified profiles are ever shown to other people. */
const VISIBLE = { status: "active", "selfie.status": "verified" } as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Distance in km between two [lng, lat] points. */
function kmBetween([lng1, lat1]: number[], [lng2, lat2]: number[]) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export type Nearby = {
  city: string;
  maxDistanceKm: number;
  /** False when the viewer only typed a city: they can then only be matched within it. */
  sharedLocation: boolean;
  profiles: NearbyProfile[];
};

/**
 * Profiles within the viewer's chosen distance, nearest first. Distance needs a
 * shared location on both sides; anyone who only typed their city is matched to
 * people in a city of the same name. Null if the viewer's own profile isn't live.
 */
export async function getNearbyProfiles(userId: string): Promise<Nearby | null> {
  if (isFrontend()) return remoteCall("companion/queries.getNearbyProfiles", [userId]);
  await connectDB();
  const me = await CompanionProfile.findOne({ user: userId, ...VISIBLE }).select("location maxDistanceKm").lean();
  if (!me) return null;

  const city = me.location?.city ?? "";
  const here = me.location?.point?.coordinates;
  const maxDistanceKm = me.maxDistanceKm ?? DEFAULT_DISTANCE_KM;
  const inMyCity = { "location.city": new RegExp(`^${escapeRegex(city)}$`, "i") };

  const found = await CompanionProfile.find({
    ...VISIBLE,
    user: { $ne: userId },
    ...(here
      ? {
          $or: [
            { "location.point": { $geoWithin: { $centerSphere: [here, maxDistanceKm / EARTH_RADIUS_KM] } } },
            { "location.point": { $exists: false }, ...inMyCity },
          ],
        }
      : inMyCity),
  })
    .limit(200)
    .lean();
  const users = await User.find({ _id: { $in: found.map((p) => p.user) }, status: "active" }).select("name").lean();
  const names = new Map(users.map((u) => [String(u._id), u.name]));

  const profiles = found
    .filter((p) => names.has(String(p.user)))
    .map((p): NearbyProfile => {
      const there = p.location?.point?.coordinates;
      return {
        id: String(p._id),
        name: firstName(names.get(String(p.user))!),
        age: p.birthDate ? ageFrom(p.birthDate) : null,
        verified: true,
        heightCm: p.heightCm ?? null,
        bodyType: p.bodyType ?? null,
        city: p.location?.city ?? "",
        gender: p.gender ?? null,
        sexuality: p.showSexuality ? p.sexuality : [],
        showSexuality: p.showSexuality,
        hobbies: p.hobbies,
        drinking: p.drinking ?? null,
        smoking: p.smoking ?? null,
        photos: p.photos.map((id) => ({ id: String(id), url: imageUrl(String(id)) })),
        distanceKm: here && there ? Math.round(kmBetween(here, there)) : null,
      };
    })
    // No distance means matched by city name, so they're in the viewer's own city.
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0))
    .slice(0, NEARBY_LIMIT);

  return { city, maxDistanceKm, sharedLocation: !!here, profiles };
}

/** Who a request is for, as shown on the subscription page. Null if that profile isn't visible. */
export async function getRequestTarget(
  viewerId: string,
  profileId: string,
): Promise<{ name: string; photoUrl: string | null } | null> {
  if (isFrontend()) return remoteCall("companion/queries.getRequestTarget", [viewerId, profileId]);
  if (!ID_RE.test(profileId)) return null;
  await connectDB();
  const profile = await CompanionProfile.findOne({ _id: profileId, user: { $ne: viewerId }, ...VISIBLE })
    .select("user photos")
    .lean();
  const user = profile && (await User.findOne({ _id: profile.user, status: "active" }).select("name").lean());
  if (!profile || !user) return null;
  return { name: firstName(user.name), photoUrl: profile.photos[0] ? imageUrl(String(profile.photos[0])) : null };
}
