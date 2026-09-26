import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/lib/site-config";

/**
 * Auth layout: single centered column on mobile, split screen on large
 * screens with a brand panel on the left.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between bg-muted p-10 lg:flex xl:p-14">
        <Logo />
        <div className="max-w-md">
          <h2 className="text-3xl font-bold tracking-tight text-balance xl:text-4xl">
            One account for every journey.
          </h2>
          <p className="mt-4 text-muted-foreground">{siteConfig.description}</p>
          <ul className="mt-8 space-y-3">
            {siteConfig.platforms.map((p) => (
              <li key={p.id} className="rounded-lg border bg-card p-4">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted-foreground">{p.tagline}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} {siteConfig.name}
        </p>
      </aside>

      <div className="flex flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-10">
        <header className="flex items-center justify-between lg:justify-end">
          <Logo className="lg:hidden" />
          <Link
            href="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            ← Back to home
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
