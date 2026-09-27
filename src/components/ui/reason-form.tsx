"use client";

import { useActionState } from "react";
import type { ActionState } from "@/lib/trips/types";
import { Button } from "./button";
import { FieldError, Textarea } from "./input";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * A collapsible "do something drastic, with a reason" form — cancel a trip,
 * reject/suspend an agency. The reason is shown to the affected people.
 */
export function ReasonForm({
  action: submit,
  trigger,
  label,
  placeholder,
  submitLabel,
  confirmText,
  field = "reason",
  required = true,
  variant = "outline",
}: {
  action: Action;
  trigger: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  confirmText?: string;
  /** Form field name the Server Action reads. */
  field?: string;
  required?: boolean;
  variant?: "primary" | "outline";
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submit, {});

  if (state.success) {
    return <p className="rounded-lg bg-muted px-3 py-2 text-sm font-medium">{state.message}</p>;
  }

  return (
    <details className="group rounded-lg border">
      <summary className="flex h-11 cursor-pointer list-none items-center justify-center px-4 text-sm font-medium hover:bg-muted">
        {trigger}
      </summary>
      <form
        action={action}
        onSubmit={(e) => {
          if (confirmText && !confirm(confirmText)) e.preventDefault();
        }}
        className="space-y-3 border-t p-3"
      >
        <label className="block text-sm font-medium">
          {label}
          <Textarea
            name={field}
            rows={3}
            placeholder={placeholder}
            className="mt-1.5 min-h-20"
            required={required}
          />
        </label>
        <FieldError id={`${field}-error`} messages={state.errors?.[field]} />
        {state.message && <p className="text-sm text-destructive">{state.message}</p>}
        <Button type="submit" size="sm" variant={variant} disabled={pending}>
          {pending ? "Working…" : submitLabel}
        </Button>
      </form>
    </details>
  );
}
