"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The landing header: see-through over the hero photo, then a frosted bar once
 * the page scrolls, so it never sits on top of section text.
 */
export function HeaderShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color,backdrop-filter] duration-500",
        scrolled
          ? "border-border/60 bg-background/80 backdrop-blur-md"
          : "border-transparent bg-gradient-to-b from-background/70 to-transparent",
      )}
    >
      {children}
    </header>
  );
}
