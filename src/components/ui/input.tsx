import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

// text-base (16px) prevents iOS Safari from zooming in on focus.
export const inputClasses =
  "block h-12 w-full rounded-lg border border-input bg-background px-4 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive disabled:opacity-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium", className)}
      {...props}
    />
  );
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-destructive">
      {messages[0]}
    </p>
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(inputClasses, "appearance-auto pr-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(inputClasses, "h-auto min-h-28 py-3 leading-relaxed", className)}
      {...props}
    />
  );
}
