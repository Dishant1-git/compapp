import "server-only";
import { connectDB } from "@/lib/db/mongoose";
import { CompanionProfile } from "@/lib/db/models/companion-profile";
import { User } from "@/lib/db/models/user";
import { imageUrl, type CompanionDraft, type SelfieStatus } from "./types";

export type CompanionAccount = {
  name: string;
  phone: string | null;
  /** The account's email, if it has one: a code can be sent there instead of a text. */
  email: string | null;
  /** Companion needs a verified phone number or a verified email address. */
  verified: boolean;
};

export async function getCompanionAccount(userId: string): Promise<CompanionAccount | null> {
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
