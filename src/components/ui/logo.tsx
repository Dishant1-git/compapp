import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * The same mark and wordmark in every world: two overlapping rings (places
 * and people). The second ring takes the world's signature colour.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" fill="none" strokeWidth={1.6} aria-hidden>
        <circle cx="12" cy="16" r="8.5" stroke="currentColor" />
        <circle cx="20" cy="16" r="8.5" className="stroke-highlight" />
      </svg>
      <span className="font-logo text-xl font-semibold tracking-tight">{siteConfig.name}</span>
    </Link>
  );
}
