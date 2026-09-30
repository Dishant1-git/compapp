import { cn } from "@/lib/utils";

export function CompatibilityBadge({
  value,
  className,
}: {
  value: number | null;
  className?: string;
}) {
  if (value === null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-semibold",
        value >= 60 ? "text-highlight-ink" : "text-muted-foreground",
        className,
      )}
      title="How well your travel personality matches this trip and group"
    >
      {value >= 60 && <span aria-hidden className="size-1.5 rounded-full bg-highlight" />}
      {value}% match
    </span>
  );
}
