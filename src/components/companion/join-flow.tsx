"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { finishProfile } from "@/lib/companion/actions";
import { DEFAULT_DISTANCE_KM, FIRST_PROFILE_STEP, JOIN_STEPS, type JoinStep } from "@/lib/companion/constants";
import { publicProfile, resumeStep, type CompanionDraft } from "@/lib/companion/types";
import { cn } from "@/lib/utils";
import {
  BirthdayStep,
  GenderStep,
  InterestsStep,
  LifestyleStep,
  LocationStep,
  LookStep,
  SexualityStep,
  type StepProps,
} from "./about-steps";
import { OtpStep, PhoneStep, type SentCode } from "./account-steps";
import { PhotoStep } from "./photo-step";
import { ProfileCard } from "./profile-card";
import { SelfieStep } from "./selfie-step";
import { StepForm } from "./step-form";

const emptyDraft = (name: string): CompanionDraft => ({
  name,
  birthDate: null,
  heightCm: null,
  bodyType: null,
  city: "",
  sharedLocation: false,
  maxDistanceKm: DEFAULT_DISTANCE_KM,
  gender: null,
  sexuality: [],
  showSexuality: true,
  hobbies: [],
  drinking: null,
  smoking: null,
  photos: [],
  selfie: null,
});

const PROFILE_STEPS: Partial<Record<JoinStep, (props: StepProps) => React.ReactNode>> = {
  birthday: BirthdayStep,
  look: LookStep,
  location: LocationStep,
  gender: GenderStep,
  sexuality: SexualityStep,
  interests: InterestsStep,
  lifestyle: LifestyleStep,
  photos: PhotoStep,
  selfie: SelfieStep,
};

/**
 * Companion onboarding for a signed-in account, one question per slide:
 * phone or email → code (only if neither is verified yet) → birthday → look → location → gender → orientation →
 * interests → habits → photos → live selfie → preview.
 * Each slide saves as you go, so leaving and coming back resumes where you were.
 */
export function JoinFlow({
  initialStep,
  initialDraft,
  initialName = "",
  email,
}: {
  initialStep: JoinStep;
  initialDraft?: CompanionDraft;
  initialName?: string;
  /** The account's email, if it has one: offered as another way to verify. */
  email?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [draft, setDraft] = useState(() => initialDraft ?? emptyDraft(initialName));
  const [sent, setSent] = useState<SentCode | null>(null);

  const index = JOIN_STEPS.indexOf(step);
  const firstProfileIndex = JOIN_STEPS.indexOf(FIRST_PROFILE_STEP);
  // Once the number is verified there's no going back to the account slides.
  const canGoBack = index > 0 && index !== firstProfileIndex;
  const progress = index / (JOIN_STEPS.length - 1);

  function go(to: JoinStep, dir: "forward" | "back" = "forward") {
    setDirection(dir);
    setStep(to);
    window.scrollTo({ top: 0 });
  }
  const next = () => go(JOIN_STEPS[index + 1]);
  const back = () => go(JOIN_STEPS[index - 1], "back");

  const update: StepProps["update"] = useCallback(
    (patch) => setDraft((d) => ({ ...d, ...(typeof patch === "function" ? patch(d) : patch) })),
    [],
  );

  const ProfileStep = PROFILE_STEPS[step];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          disabled={!canGoBack}
          aria-label="Back"
          className="-ml-2 grid size-10 shrink-0 place-items-center rounded-full hover:bg-muted disabled:invisible"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          role="progressbar"
          aria-label="Sign-up progress"
          aria-valuemin={1}
          aria-valuemax={JOIN_STEPS.length}
          aria-valuenow={index + 1}
          aria-valuetext={`Step ${index + 1} of ${JOIN_STEPS.length}`}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(progress, 0.04) * 100}%` }}
          />
        </div>
        <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {index + 1}/{JOIN_STEPS.length}
        </span>
      </div>

      <div
        key={step}
        className={cn(
          "mt-8 flex flex-1 flex-col",
          direction === "forward" ? "motion-safe:animate-slide-in-right" : "motion-safe:animate-slide-in-left",
        )}
      >
        {step === "phone" && (
          <PhoneStep
            email={email}
            onSent={(s) => {
              setSent(s);
              next();
            }}
          />
        )}
        {step === "otp" && sent && (
          <OtpStep
            sent={sent}
            onResent={setSent}
            onChangeNumber={back}
            onVerified={(result) => {
              if (result.finished) return router.replace("/companion");
              setDraft(result.draft);
              go(resumeStep(result.draft));
            }}
          />
        )}
        {ProfileStep && <ProfileStep draft={draft} update={update} onDone={next} />}
        {step === "preview" && (
          <StepForm
            title="Here's your profile"
            description="This is how others will see you. Use the back arrow to change anything."
            submitLabel="Done"
            pendingLabel="Creating your profile…"
            onSubmit={finishProfile}
            // Straight on to the people near them.
            onDone={() => router.replace("/companion/discover")}
          >
            <ProfileCard profile={publicProfile(draft)} />
          </StepForm>
        )}
      </div>
    </div>
  );
}
