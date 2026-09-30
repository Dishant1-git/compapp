"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import { siteConfig } from "@/lib/site-config";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="grid size-11 place-items-center rounded-full hover:bg-foreground/5"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden
        >
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 top-18 bottom-0 z-40 overflow-y-auto border-t bg-background px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <nav className="flex flex-col">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="border-b px-1 py-4 font-display text-3xl tracking-tight"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 grid gap-3">
            {signedIn ? (
              <form action={logout} className="grid">
                <Button type="submit" variant="outline" size="lg">
                  Log out
                </Button>
              </form>
            ) : (
              <>
                <ButtonLink href="/login" variant="outline" size="lg" onClick={close}>
                  Log in
                </ButtonLink>
                <ButtonLink href="/register" size="lg" onClick={close}>
                  Sign up
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
