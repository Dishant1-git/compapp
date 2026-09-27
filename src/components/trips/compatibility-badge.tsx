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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        value >= 60 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        className,
      )}
      title="How well your travel personality matches this trip and group"
    >
      {value}% match
    </span>
  );
}
