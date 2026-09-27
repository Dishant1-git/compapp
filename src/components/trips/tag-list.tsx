import { personalityLabel } from "@/lib/trips/constants";
import { cn } from "@/lib/utils";

export function TagList({
  tags,
  highlight = [],
  className,
}: {
  tags: readonly string[];
  /** Tags shared with the viewer are emphasised. */
  highlight?: readonly string[];
  className?: string;
}) {
  if (!tags.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {tags.map((tag) => (
        <li
          key={tag}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium",
            highlight.includes(tag)
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {personalityLabel(tag)}
        </li>
      ))}
    </ul>
  );
}
