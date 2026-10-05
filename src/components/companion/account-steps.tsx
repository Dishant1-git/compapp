"use client";

import { useEffect, useRef, useState } from "react";
import { FieldError, Input, Label, Select } from "@/components/ui/input";
import {
  sendCode,
  sendEmailVerificationCode,
  verifyCode,
  verifyEmailCode,
  type VerifyResult,
} from "@/lib/companion/actions";
import { COUNTRY_CODES, maskPhone } from "@/lib/phone";
import { StepForm } from "./step-form";

/** A code that was sent: by text to `phone`, or by email when `email` is set. */
export type SentCode = { phone: string; email?: string; devCode?: string; sentAt: number };

const RESEND_SECONDS = 30;

/** "di•••••@gmail.com" */
function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(3, name.length - 2))}@${domain}`;
}

export function PhoneStep({ email, onSent }: { email?: string; onSent: (sent: SentCode) => void }) {
  const [countryCode, setCountryCode] = useState<string>(COUNTRY_CODES[0].code);
  const [number, setNumber] = useState("");
  const sent = useRef<SentCode>(null);
  const [emailing, setEmailing] = useState(false);
  const [emailError, setEmailError] = useState<string>();

  async function emailInstead() {
    setEmailing(true);
    setEmailError(undefined);
    const result = await sendEmailVerificationCode().catch(() => null);
    setEmailing(false);
    if (result?.ok) onSent({ phone: "", email: result.email, devCode: result.devCode, sentAt: Date.now() });
    else setEmailError(result?.error ?? "Couldn't send the email. Try again.");
  }

  return (
    <StepForm
      title="What's your mobile number?"
      description={`Companion needs a verified number${email ? " or email" : ""}. We'll text you a 6-digit code. Your number is never shown on your profile.`}
      footer={
        email && (
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <button
              type="button"
              onClick={emailInstead}
              disabled={emailing}
              className="font-medium text-foreground underline underline-offset-4 disabled:opacity-50"
            >
              {emailing ? "Sending…" : `Email a code to ${maskEmail(email)} instead`}
            </button>
            <FieldError id="email-code-error" messages={emailError ? [emailError] : undefined} />
          </div>
        )
      }
      pendingLabel="Sending code…"
      submitLabel="Send code"
      canSubmit={number.replace(/\D/g, "").length >= 7}
      onSubmit={async () => {
        const result = await sendCode({ countryCode, number });
        if (result.ok) sent.current = { phone: result.phone, devCode: result.devCode, sentAt: Date.now() };
        return result.ok ? { ok: true } : result;
      }}
      onDone={() => sent.current && onSent(sent.current)}
    >
      <div>
        <Label htmlFor="companion-phone">Mobile number</Label>
        {/* Widths live on wrappers: Select and Input are always w-full. */}
        <div className="flex gap-2">
          <div className="w-28 shrink-0">
            <Select
              aria-label="Country code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="px-3"
            >
              {COUNTRY_CODES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </Select>
          </div>
          <div className="min-w-0 flex-1">
            <Input
              id="companion-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      </div>
    </StepForm>
  );
}

export function OtpStep({
  sent,
  onResent,
  onChangeNumber,
  onVerified,
}: {
  sent: SentCode;
  onResent: (sent: SentCode) => void;
  onChangeNumber: () => void;
  onVerified: (result: Extract<VerifyResult, { ok: true }>) => void;
}) {
  const [code, setCode] = useState("");
  const verified = useRef<Extract<VerifyResult, { ok: true }>>(null);
  const [resendError, setResendError] = useState<string>();
  const [resending, setResending] = useState(false);
  const secondsLeft = useCountdown(sent.sentAt + RESEND_SECONDS * 1000);

  async function resend() {
    setResending(true);
    setResendError(undefined);
    const result = await (
      sent.email ? sendEmailVerificationCode() : sendCode({ countryCode: "", number: sent.phone })
    ).catch(() => null);
    setResending(false);
    if (result?.ok) {
      setCode("");
      onResent({ ...sent, devCode: result.devCode, sentAt: Date.now() });
    } else {
      setResendError(result?.error ?? "Couldn't send a new code. Try again.");
    }
  }

  return (
    <StepForm
      title="Enter your code"
      description={
        <>
          Sent to{" "}
          <span className="font-medium text-foreground">
            {sent.email ? maskEmail(sent.email) : maskPhone(sent.phone)}
          </span>
          .{sent.email ? " Check your spam folder if you don't see it. " : " "}
          <button type="button" onClick={onChangeNumber} className="font-medium text-foreground underline underline-offset-4">
            {sent.email ? "Use my mobile number" : "Change number"}
          </button>
        </>
      }
      submitLabel="Verify"
      pendingLabel="Verifying…"
      canSubmit={code.length === 6}
      onSubmit={async () => {
        const result = sent.email ? await verifyEmailCode({ code }) : await verifyCode({ phone: sent.phone, code });
        if (result.ok) verified.current = result;
        return result.ok ? { ok: true } : result;
      }}
      onDone={() => verified.current && onVerified(verified.current)}
      footer={
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {secondsLeft > 0 ? (
            <p>Resend code in {secondsLeft}s</p>
          ) : (
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="font-medium text-foreground underline underline-offset-4 disabled:opacity-50"
            >
              {resending ? "Sending…" : "Resend code"}
            </button>
          )}
          <FieldError id="resend-error" messages={resendError ? [resendError] : undefined} />
        </div>
      }
    >
      {sent.devCode && (
        <p className="rounded-lg border border-dashed px-4 py-3 text-sm">
          <span className="font-medium">Development mode:</span> no {sent.email ? "email" : "SMS"} provider is
          set up, so here&apos;s your code: <span className="font-mono font-semibold tracking-widest">{sent.devCode}</span>
        </p>
      )}
      <div>
        <Label htmlFor="companion-otp">6-digit code</Label>
        <Input
          id="companion-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="text-center font-mono text-2xl tracking-[0.5em]"
          autoFocus
        />
      </div>
    </StepForm>
  );
}

/** Whole seconds until `until` (a timestamp), ticking down to 0. */
function useCountdown(until: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return Math.min(RESEND_SECONDS, Math.max(0, Math.ceil((until - now) / 1000)));
}
