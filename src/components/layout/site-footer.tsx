import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/lib/site-config";

const columns = [
  {
    title: "Platforms",
    links: siteConfig.platforms.map((p) => ({
      label: p.name,
      href: p.href,
    })),
  },
  {
    title: "Account",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Create account", href: "/register" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
      { label: "Refunds", href: "/refunds" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <Container className="grid gap-10 py-12 pb-[max(3rem,env(safe-area-inset-bottom))] sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {siteConfig.description}
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="eyebrow text-muted-foreground">{col.title}</h3>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <Container className="border-t py-6 text-sm text-muted-foreground">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </Container>
    </footer>
  );
}
