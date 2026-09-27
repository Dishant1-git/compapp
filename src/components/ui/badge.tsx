import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-muted text-foreground",
  positive: "bg-primary text-primary-foreground",
  warning: "border border-foreground/30 bg-background",
  danger: "border border-destructive/40 text-destructive",
};

export type BadgeTone = keyof typeof tones;

/** Maps common statuses to a tone so every list reads the same way. */
const STATUS_TONES: Record<string, BadgeTone> = {
  approved: "positive",
  active: "positive",
  confirmed: "positive",
  open: "positive",
  paid: "positive",
  accepted: "positive",
  pending: "warning",
  unpaid: "warning",
  rejected: "danger",
  suspended: "danger",
  cancelled: "danger",
  declined: "danger",
  reviewed: "danger",
};

export function Badge({
  children,
  tone,
  status,
  className,
}: {
  children?: React.ReactNode;
  tone?: BadgeTone;
  /** Pick the tone from a status value, and use it as the label if no children. */
  status?: string;
  className?: string;
}) {
  const resolved = tone ?? (status ? STATUS_TONES[status] : undefined) ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap capitalize",
        tones[resolved],
        className,
      )}
    >
      {children ?? status}
    </span>
  );
}
