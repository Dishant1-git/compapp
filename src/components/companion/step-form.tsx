"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/companion/types";

/**
 * One slide of the join flow: heading, fields, error and a Continue button.
 * `onSubmit` saves the slide; when it succeeds, `onDone` moves on.
 */
export function StepForm({
  title,
  description,
  children,
  onSubmit,
  onDone,
  submitLabel = "Continue",
  pendingLabel = "Saving…",
  canSubmit = true,
  hideSubmit = false,
  footer,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  onSubmit: () => Promise<ActionResult>;
  onDone: () => void;
  submitLabel?: string;
  pendingLabel?: string;
  canSubmit?: boolean;
  /** Hide the Continue bar while the slide shows its own controls (e.g. the camera). */
  hideSubmit?: boolean;
  footer?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const heading = useRef<HTMLHeadingElement>(null);

  // Move focus to the new slide's heading so screen readers announce it.
  useEffect(() => {
    if (!heading.current?.closest("form")?.contains(document.activeElement)) {
      heading.current?.focus({ preventScroll: true });
    }
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await onSubmit().catch(() => ({ ok: false as const, error: "Something went wrong. Please try again." }));
      if (result.ok) onDone();
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col">
      <h1 ref={heading} tabIndex={-1} className="text-4xl leading-[1.05] font-medium tracking-tight text-balance outline-none sm:text-5xl">
        {title}
      </h1>
      {description && <div className="mt-3 leading-relaxed text-muted-foreground">{description}</div>}

      <div className="mt-8 flex-1 space-y-6">{children}</div>

      <div hidden={hideSubmit} className="sticky bottom-0 -mx-4 mt-8 bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0">
        {error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" fullWidth disabled={pending || !canSubmit}>
          {pending ? pendingLabel : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  );
}
