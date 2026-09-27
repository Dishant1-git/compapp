"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Textarea } from "@/components/ui/input";
import { sendBuddyRequest } from "@/lib/trips/actions";
import type { ActionState } from "@/lib/trips/types";

export function BuddyRequestForm({ planId, ownerName }: { planId: string; ownerName: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    sendBuddyRequest.bind(null, planId),
    {},
  );

  if (state.success) {
    return <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">Request sent to {ownerName}.</p>;
  }

  return (
    <details>
      <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
        Ask to join
      </summary>
      <form action={action} className="mt-3 space-y-3">
        <label htmlFor={`msg-${planId}`} className="sr-only">
          Message to {ownerName}
        </label>
        <Textarea
          id={`msg-${planId}`}
          name="message"
          rows={2}
          maxLength={300}
          placeholder={`Say hi to ${ownerName} (optional)`}
          className="min-h-20"
        />
        <FieldError id={`msg-${planId}-error`} messages={state.errors?.message} />
        {state.message && <p className="text-sm text-destructive">{state.message}</p>}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send request"}
        </Button>
      </form>
    </details>
  );
}
