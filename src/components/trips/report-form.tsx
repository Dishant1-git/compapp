"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Select, Textarea } from "@/components/ui/input";
import { reportUser } from "@/lib/trips/actions";
import { REPORT_REASONS } from "@/lib/trips/constants";
import type { ActionState } from "@/lib/trips/types";

/** Inline, collapsible report form for a single traveller. */
export function ReportForm({
  reportedId,
  reportedName,
  tripId,
}: {
  reportedId: string;
  reportedName: string;
  tripId?: string;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(reportUser, {});
  const id = `report-${reportedId}`;

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none text-xs font-medium text-muted-foreground hover:text-foreground">
        Report
      </summary>

      {state.success ? (
        <p role="status" className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">
          {state.message}
        </p>
      ) : (
        <form action={action} className="mt-3 space-y-3 rounded-lg border p-3">
          <input type="hidden" name="reportedId" value={reportedId} />
          {tripId && <input type="hidden" name="tripId" value={tripId} />}
          <div>
            <Label htmlFor={`${id}-reason`}>Why are you reporting {reportedName}?</Label>
            <Select
              id={`${id}-reason`}
              name="reason"
              defaultValue={(state.values?.reason as string) ?? ""}
              required
            >
              <option value="" disabled>
                Choose a reason
              </option>
              {REPORT_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
            <FieldError id={`${id}-reason-error`} messages={state.errors?.reason} />
          </div>
          <div>
            <Label htmlFor={`${id}-details`}>Details (optional)</Label>
            <Textarea
              id={`${id}-details`}
              name="details"
              rows={3}
              defaultValue={(state.values?.details as string) ?? ""}
            />
            <FieldError id={`${id}-details-error`} messages={state.errors?.details} />
          </div>
          {state.message && <p className="text-sm text-destructive">{state.message}</p>}
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            {pending ? "Sending…" : "Send report"}
          </Button>
        </form>
      )}
    </details>
  );
}
