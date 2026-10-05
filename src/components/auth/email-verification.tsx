"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { sendMyEmailCode, verifyMyEmailCode } from "@/lib/auth/actions";

/**
 * Shows whether the account's email is verified. If not: email a 6-digit code,
 * then type it in. `next` is where to go once verified (default: stay here).
 */
export function EmailVerification({ email, verified, next }: { email: string; verified: boolean; next?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState<{ devCode?: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(verified);
  if (!email) return null;

  if (done) {
    return (
      <section className="rounded-xl border bg-card p-5 text-sm">
        <p className="font-semibold">Email verified</p>
        <p className="mt-1 break-all text-muted-foreground">{email}</p>
      </section>
    );
  }

  function send() {
    setError(undefined);
    startTransition(async () => {
      const result = await sendMyEmailCode().catch(() => null);
      if (result?.ok) {
        setCode("");
        setSent({ devCode: result.devCode });
      } else setError(result?.error ?? "Couldn't send the email. Try again.");
    });
  }

  function verify(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const result = await verifyMyEmailCode(code).catch(() => null);
      if (!result?.ok) return setError(result?.error ?? "Something went wrong. Try again.");
      setDone(true);
      if (next) router.push(next);
      else router.refresh();
    });
  }

  return (
    <section className="rounded-xl border bg-card p-5 text-sm">
      <p className="font-semibold">Verify your email</p>
      {!sent ? (
        <>
          <p className="mt-1 text-muted-foreground">
            We&apos;ll email a 6-digit code to <span className="break-all text-foreground">{email}</span>.
          </p>
          <Button type="button" size="sm" className="mt-4" disabled={pending} onClick={send}>
            {pending ? "Sending…" : "Email me a code"}
          </Button>
        </>
      ) : (
        <form onSubmit={verify} className="mt-1">
          <p className="text-muted-foreground">
            We sent a code to <span className="break-all text-foreground">{email}</span>. It works for 5
            minutes. Check your spam folder if you don&apos;t see it.
          </p>
          {sent.devCode && (
            <p className="mt-3 rounded-lg border border-dashed px-3 py-2">
              <span className="font-medium">Development mode:</span> no email provider is set up, so here&apos;s
              your code: <span className="font-mono font-semibold tracking-widest">{sent.devCode}</span>
            </p>
          )}
          <Label htmlFor="email-code" className="mt-4">
            6-digit code
          </Label>
          <Input
            id="email-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="max-w-48 text-center font-mono text-xl tracking-[0.4em]"
            autoFocus
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="submit" size="sm" disabled={pending || code.length !== 6}>
              {pending ? "Checking…" : "Verify"}
            </Button>
            <button
              type="button"
              onClick={send}
              disabled={pending}
              className="font-medium underline underline-offset-4 disabled:opacity-50"
            >
              Send a new code
            </button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
