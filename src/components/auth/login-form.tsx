"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { login, type FormState } from "@/lib/auth/actions";
import { FormMessage } from "./form-message";
import { PasswordInput } from "./password-input";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});

  return (
    <form action={action} noValidate className="space-y-5">
      <FormMessage message={state.message} />
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <Label htmlFor="email">Email or username</Label>
        <Input
          id="email"
          name="email"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          required
          aria-invalid={!!state.errors?.email}
          aria-describedby="email-error"
        />
        <FieldError id="email-error" messages={state.errors?.email} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="password" className="mb-0">
            Password
          </Label>
          <Link
            href="/forgot-password" prefetch={false}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={!!state.errors?.password}
          aria-describedby="password-error"
        />
        <FieldError id="password-error" messages={state.errors?.password} />
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="remember" className="size-4 accent-primary" />
        Keep me signed in
      </label>

      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}
