"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const icons = {
  explore: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z",
  buddies:
    "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 9v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.74",
  trips: "M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18",
  profile: "M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
};

const links = [
  { href: "/trips", label: "Explore", icon: icons.explore },
  { href: "/trips/buddies", label: "Buddies", icon: icons.buddies },
  { href: "/trips/me", label: "My trips", icon: icons.trips },
  { href: "/trips/profile", label: "Profile", icon: icons.profile },
];

const SECTIONS = ["/trips/buddies", "/trips/me", "/trips/profile", "/trips/new"];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/trips"
      ? // Explore covers the trip list and individual trip pages.
        !SECTIONS.some((s) => pathname.startsWith(s))
      : pathname.startsWith(href);
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

export function TripsDesktopNav() {
  const isActive = useIsActive();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(link.href)
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/** App-style tab bar for phones. */
export function TripsBottomNav() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Stranger Trips"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                isActive(link.href) ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <Icon d={link.icon} />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
