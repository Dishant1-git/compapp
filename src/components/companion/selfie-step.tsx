"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSelfieStatus, submitSelfie } from "@/lib/companion/actions";
import { SELFIE_POSES } from "@/lib/companion/constants";
import type { SelfieStatus } from "@/lib/companion/types";
import type { StepProps } from "./about-steps";
import { resizeImage } from "./resize-image";
import { StepForm } from "./step-form";

type Shot = { blob: Blob; url: string };

const POLL_MS = 8000;

/**
 * Live selfie for photo verification. It only uses the camera (no file picker),
 * and asks for a random pose, so a saved photo can't be passed off as live.
 * The server compares it with the profile photos in a few seconds; clear
 * results come back straight away. If the check isn't sure, an admin reviews it
 * and this slide waits, checking back every few seconds. The profile preview
 * stays locked until the selfie is verified.
 */
export function SelfieStep({ draft, update, onDone }: StepProps) {
  const video = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [pose, setPose] = useState<string>();
  const [shot, setShot] = useState<Shot | null>(null);
  const [cameraError, setCameraError] = useState<string>();
  const [starting, setStarting] = useState(false);
  const submitted = useRef<SelfieStatus>(null);
  const status = draft.selfie?.status;

  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [stream]);

  useEffect(() => () => void (shot && URL.revokeObjectURL(shot.url)), [shot]);

  // While in review, check back until an admin (or the verification service) decides.
  useEffect(() => {
    if (status !== "pending") return;
    const timer = setInterval(async () => {
      const latest = await getSelfieStatus().catch(() => null);
      if (latest && latest.status !== "pending") {
        update((d) => ({ selfie: d.selfie && { ...d.selfie, status: latest.status, note: latest.note } }));
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [status, update]);

  async function openCamera() {
    setCameraError(undefined);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        "Your browser can't open the camera here. Use a recent browser, and make sure the site is opened over https.",
      );
      return;
    }
    setStarting(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      setPose(SELFIE_POSES[Math.floor(Math.random() * SELFIE_POSES.length)]);
      setShot(null);
      setStream(media);
    } catch (error) {
      setCameraError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera access was blocked. Allow it in your browser's site settings, then try again."
          : "We couldn't open your camera. Check that no other app is using it.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const blob = await resizeImage(v, 1280, 0.9);
    setShot({ blob, url: URL.createObjectURL(blob) });
    setStream(null); // stops the camera
  }

  const verified = status === "verified" && !shot;
  const waiting = status === "pending" && !shot && !stream;

  return (
    <StepForm
      title={verified ? "You're verified!" : waiting ? "Checking your selfie" : "Verify it's you"}
      description={
        verified
          ? "Your selfie matches your photos. Your profile will show a verified badge."
          : waiting
            ? "Our automatic check wasn't sure, so a person is taking a look. Your profile unlocks as soon as it's approved."
            : "Take a quick live selfie. We compare it with your photos so everyone on Companion knows profiles are real. It's never shown on your profile."
      }
      submitLabel={verified ? "See my profile" : waiting ? "Waiting for verification…" : "Submit selfie"}
      pendingLabel={shot ? "Checking your selfie…" : "Loading…"}
      canSubmit={verified || !!shot}
      hideSubmit={!!stream}
      onSubmit={async () => {
        if (!shot) {
          submitted.current = status ?? null;
          return { ok: true };
        }
        const body = new FormData();
        body.set("selfie", shot.blob, "selfie.jpg");
        body.set("pose", pose ?? "");
        const result = await submitSelfie(body);
        if (!result.ok) return result;
        // Stay on this slide to show the result (verified, rejected or in review).
        submitted.current = null;
        update({ selfie: result.selfie });
        setShot(null);
        return { ok: true };
      }}
      // Only move on to the preview once verified; otherwise stay and wait.
      onDone={() => submitted.current === "verified" && onDone()}
    >
      {stream ? (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video
              ref={video}
              autoPlay
              playsInline
              muted
              className="aspect-[3/4] w-full -scale-x-100 object-cover"
            />
            <div aria-hidden className="pointer-events-none absolute inset-[12%] rounded-[50%] border-2 border-white/70" />
            <p className="absolute inset-x-3 top-3 rounded-lg bg-black/60 px-3 py-2 text-center text-sm font-medium text-white">
              {pose}
            </p>
          </div>
          <p className="sr-only" aria-live="polite">
            Camera is on. {pose}, then take the selfie.
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="outline" size="lg" onClick={() => setStream(null)}>
              Cancel
            </Button>
            <Button type="button" size="lg" fullWidth onClick={capture}>
              Take selfie
            </Button>
          </div>
        </div>
      ) : shot ? (
        <div className="space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview (blob URL) */}
          <img src={shot.url} alt="Your selfie" className="aspect-[3/4] w-full rounded-2xl object-cover" />
          <p className="text-sm text-muted-foreground">
            Pose: <span className="font-medium text-foreground">{pose}</span>
          </p>
          <Button type="button" variant="outline" fullWidth onClick={openCamera} disabled={starting}>
            Retake
          </Button>
        </div>
      ) : verified ? (
        <VerifiedBadge photoUrl={draft.photos[0]?.url} />
      ) : waiting ? (
        <div className="space-y-4">
          <div role="status" className="flex items-center gap-4 rounded-xl border p-4">
            <span
              aria-hidden
              className="size-8 shrink-0 animate-spin rounded-full border-[3px] border-muted border-t-primary"
            />
            <div className="text-sm">
              <p className="font-medium">Being reviewed by our team</p>
              <p className="mt-0.5 text-muted-foreground">
                This usually takes a few hours. You can close this page. Come back to this link and
                sign in with your number, and you&apos;ll pick up here. Or retake the selfie in
                better light to try the automatic check again.
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" fullWidth onClick={openCamera} disabled={starting}>
            {starting ? "Opening camera…" : "Retake selfie"}
          </Button>
          <CameraError message={cameraError} />
        </div>
      ) : (
        <div className="space-y-4">
          {status === "rejected" && (
            <div role="alert" className="rounded-lg border border-destructive/40 px-4 py-3 text-sm text-destructive">
              <p className="font-medium">We couldn&apos;t verify your last selfie.</p>
              <p className="mt-1">
                {draft.selfie?.note ? `Reason: ${draft.selfie.note}` : "Make sure your face is clear and matches your photos."}
              </p>
              <p className="mt-1">Please take a new one.</p>
            </div>
          )}

          <ul className="space-y-2 rounded-xl bg-muted p-4 text-sm">
            <li>• Face the camera in good light</li>
            <li>• Remove sunglasses, masks or hats</li>
            <li>• Copy the pose shown on screen</li>
          </ul>

          {draft.photos[0] && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image */}
              <img src={draft.photos[0].url} alt="" className="size-12 rounded-full object-cover" />
              We&apos;ll compare it with your main photo.
            </div>
          )}

          <Button type="button" size="lg" fullWidth onClick={openCamera} disabled={starting}>
            {starting ? "Opening camera…" : "Open camera"}
          </Button>
          <CameraError message={cameraError} />
        </div>
      )}
    </StepForm>
  );
}

function VerifiedBadge({ photoUrl }: { photoUrl?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border p-8 text-center">
      <div className="relative">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image
          <img src={photoUrl} alt="" className="size-24 rounded-full object-cover" />
        ) : (
          <div className="size-24 rounded-full bg-muted" />
        )}
        <span className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <p className="font-medium">Photo verified</p>
    </div>
  );
}

function CameraError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
