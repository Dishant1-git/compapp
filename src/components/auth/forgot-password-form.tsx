"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { requestPasswordReset, type FormState } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, {});

  if (state.done) {
    return (
      <div role="status" className="rounded-lg border bg-muted px-4 py-4 text-sm">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-muted-foreground">
          If an account uses <span className="break-all text-foreground">{state.values?.email}</span>, we&apos;ve
          emailed a link to choose a new password. It works for 30 minutes. Look in your spam folder too.
        </p>
        {state.devLink && (
          <p className="mt-3 text-xs text-muted-foreground">
            Test mode (no email provider set), so nothing was emailed.{" "}
            <a href={state.devLink} className="font-medium text-foreground underline underline-offset-4">
              Open the reset link
            </a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} noValidate className="space-y-5">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          required
          aria-invalid={!!state.errors?.email}
          aria-describedby="email-error"
        />
        <FieldError id="email-error" messages={state.errors?.email} />
      </div>
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Sending…" : "Email me a reset link"}
      </Button>
    </form>
  );
}
