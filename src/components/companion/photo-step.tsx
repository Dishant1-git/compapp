"use client";

import { useRef, useState } from "react";
import { removePhoto, uploadPhoto } from "@/lib/companion/actions";
import { MAX_PHOTOS, MIN_PHOTOS } from "@/lib/companion/constants";
import { cn } from "@/lib/utils";
import type { StepProps } from "./about-steps";
import { resizeImage } from "./resize-image";
import { StepForm } from "./step-form";

export function PhotoStep({ draft, update, onDone }: StepProps) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [removing, setRemoving] = useState<string>();
  const [error, setError] = useState<string>();
  const photos = draft.photos;
  const free = MAX_PHOTOS - photos.length - uploading;

  async function add(files: FileList | null) {
    const picked = Array.from(files ?? []).slice(0, Math.max(free, 0));
    if (input.current) input.current.value = "";
    if (!picked.length) return;
    setError(undefined);
    setUploading((n) => n + picked.length);

    // One at a time keeps each request small and the order predictable.
    for (const file of picked) {
      try {
        const body = new FormData();
        body.set("photo", await resizeImage(file), "photo.jpg");
        const result = await uploadPhoto(body);
        if (result.ok) update((d) => ({ photos: [...d.photos, result.photo] }));
        else setError(result.error);
      } catch {
        setError("We couldn't read one of those photos. Try a JPEG or PNG.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function remove(id: string) {
    setRemoving(id);
    setError(undefined);
    const result = await removePhoto(id).catch(() => null);
    setRemoving(undefined);
    if (result?.ok) update((d) => ({ photos: d.photos.filter((p) => p.id !== id) }));
    else setError(result?.error ?? "Couldn't remove that photo. Try again.");
  }

  return (
    <StepForm
      title="Add your photos"
      description={`Add at least ${MIN_PHOTOS}, up to ${MAX_PHOTOS}. Clear photos of your face work best. The first one is your main photo.`}
      canSubmit={photos.length >= MIN_PHOTOS && uploading === 0}
      onSubmit={async () => ({ ok: true })}
      onDone={onDone}
    >
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: MAX_PHOTOS }, (_, i) => {
          const photo = photos[i];
          if (photo) {
            return (
              <div key={photo.id} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- private, auth-gated image */}
                <img src={photo.url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium">
                    Main
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(photo.id)}
                  disabled={!!removing}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute top-1.5 right-1.5 grid size-8 place-items-center rounded-full bg-background/90 shadow disabled:opacity-50"
                >
                  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            );
          }
          const isUploading = i < photos.length + uploading;
          return (
            <button
              key={`slot-${i}`}
              type="button"
              onClick={() => input.current?.click()}
              disabled={isUploading || free <= 0}
              aria-label={isUploading ? "Uploading photo" : "Add a photo"}
              className={cn(
                "grid aspect-[3/4] place-items-center rounded-xl border-2 border-dashed border-input text-muted-foreground transition-colors",
                isUploading ? "animate-pulse bg-muted" : "hover:bg-muted",
              )}
            >
              {isUploading ? (
                <span className="text-xs">Uploading…</span>
              ) : (
                <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => add(e.target.files)}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </StepForm>
  );
}
