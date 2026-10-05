"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/input";
import { resetPassword, type FormState } from "@/lib/auth/actions";
import { FormMessage } from "./form-message";
import { PasswordInput } from "./password-input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, {});

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage message={state.message} />
      <input type="hidden" name="token" value={token} />

      <div>
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={!!state.errors?.password}
          aria-describedby="password-error password-hint"
        />
        <p id="password-hint" className="mt-1.5 text-xs text-muted-foreground">
          At least 8 characters.
        </p>
        <FieldError id="password-error" messages={state.errors?.password} />
      </div>

      <div>
        <Label htmlFor="confirm">Type it again</Label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={!!state.errors?.confirm}
          aria-describedby="confirm-error"
        />
        <FieldError id="confirm-error" messages={state.errors?.confirm} />
      </div>

      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
