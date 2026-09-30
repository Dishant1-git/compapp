import Image from "next/image";
import Link from "next/link";
import { Theme } from "@/components/layout/theme";
import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/lib/site-config";

/**
 * Auth layout, in the brand's Midnight world: one centred column on phones,
 * and a cinematic photo panel beside the form on large screens.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Theme world="brand" className="grid lg:grid-cols-2">
      <aside className="grain relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <Image src="/images/auth-clouds.webp" alt="" fill priority sizes="50vw" className="drift object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/30" />

        <Logo className="relative z-10" />
        <div className="relative z-10 max-w-md">
          <p className="eyebrow text-highlight">One account · Two worlds</p>
          <h2 className="mt-5 text-5xl leading-[1.05] font-medium tracking-tight text-balance">
            Places and people, <em className="text-highlight-ink">one door.</em>
          </h2>
          <ul className="mt-10 space-y-4 border-t pt-6">
            {siteConfig.platforms.map((p) => (
              <li key={p.id} className="flex items-baseline justify-between gap-6">
                <span className="font-display text-2xl">{p.name}</span>
                <span className="text-sm text-muted-foreground">{p.tagline}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </aside>

      <div className="flex flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-12">
        <header className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <Link href="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            ← Back to home
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="reveal w-full max-w-md">{children}</div>
        </main>
      </div>
    </Theme>
  );
}
