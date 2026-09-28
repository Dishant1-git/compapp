"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ICONS } from "@/components/layout/app-nav";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Overview", icon: ICONS.dashboard, exact: true },
  { href: "/admin/agencies", label: "Agencies", icon: ICONS.agencies },
  { href: "/admin/users", label: "Users", icon: ICONS.users },
  { href: "/admin/trips", label: "Trips", icon: ICONS.trips },
  { href: "/admin/bookings", label: "Bookings", icon: ICONS.bookings },
  { href: "/admin/reports", label: "Reports", icon: ICONS.reports },
  { href: "/admin/verifications", label: "Verification", icon: ICONS.verify },
];

function useIsActive() {
  const pathname = usePathname();
  return (link: (typeof links)[number]) =>
    link.exact ? pathname === link.href : pathname.startsWith(link.href);
}

/** Horizontal, scrollable tabs below the header on phones and tablets. */
export function AdminTabs({ badges }: { badges: Record<string, number> }) {
  const isActive = useIsActive();
  return (
    <nav aria-label="Admin" className="border-b lg:hidden">
      <ul className="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6">
        {links.map((link) => (
          <li key={link.href} className="shrink-0">
            <Link
              href={link.href}
              aria-current={isActive(link) ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium",
                isActive(link) ? "bg-muted text-foreground" : "text-muted-foreground",
              )}
            >
              {link.label}
              <Count n={badges[link.href]} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Vertical sidebar on large screens. */
export function AdminSidebar({ badges }: { badges: Record<string, number> }) {
  const isActive = useIsActive();
  return (
    <nav aria-label="Admin" className="sticky top-24 hidden self-start lg:block">
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={isActive(link) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                isActive(link) ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d={link.icon} />
              </svg>
              <span className="flex-1">{link.label}</span>
              <Count n={badges[link.href]} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Count({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="rounded-full bg-destructive px-1.5 text-[10px] leading-4 font-bold text-white">{n}</span>
  );
}
