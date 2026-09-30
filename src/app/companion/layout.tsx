import type { Metadata } from "next";
import Image from "next/image";
import { Theme } from "@/components/layout/theme";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { logout } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: { default: "Companion", template: "%s | Companion" },
};

export default async function CompanionLayout({ children }: LayoutProps<"/companion">) {
  // Every Companion page needs an account. The pages check too, with their exact
  // URL for the return trip; the proxy usually redirects before either runs.
  await requireUser("/companion");

  return (
    <Theme world="companion" className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Large screens: a warm, low-lit photo holds the mood beside the content. */}
      <aside className="grain relative hidden overflow-hidden lg:sticky lg:top-0 lg:block lg:h-dvh">
        <Image src="/images/companion-concert.webp" alt="" fill priority sizes="42vw" className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-[#b99ac7]/10" />
        <div className="absolute inset-x-0 bottom-0 z-10 p-12 xl:p-16">
          <p className="eyebrow text-highlight">Companion · Connection</p>
          <p className="mt-5 max-w-sm font-display text-5xl leading-[1.05] font-medium xl:text-6xl">
            Meet someone <em>worth the evening.</em>
          </p>
        </div>
      </aside>

      {/* Phones: a soft plum glow instead of the photo. */}
      <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,rgb(185_154_199/0.16),transparent_55%)] lg:bg-none">
        <header className="pt-[env(safe-area-inset-top)]">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Logo />
              <span className="eyebrow border-l pl-3 text-companion-accent">Companion</span>
            </div>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </Theme>
  );
}
