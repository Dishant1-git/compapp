import Link from "next/link";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site-config";

/** Shared layout for the terms, privacy and refund pages. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** e.g. "5 October 2026" */
  updated: string;
  children: React.ReactNode;
}) {
  const { email } = siteConfig.support;
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <h1 className="text-4xl leading-[1.05] tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">Last updated {updated}</p>
      <div className="mt-10 space-y-8 leading-relaxed">{children}</div>
      <section className="mt-10 border-t pt-6 text-sm text-muted-foreground">
        <p>
          Questions about this page?{" "}
          {email ? (
            <a href={`mailto:${email}`} className="font-medium text-foreground underline underline-offset-4">
              {email}
            </a>
          ) : (
            "Contact our support team."
          )}
        </p>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/terms" className="underline underline-offset-4">
            Terms
          </Link>
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy
          </Link>
          <Link href="/refunds" className="underline underline-offset-4">
            Refunds and cancellations
          </Link>
        </p>
      </section>
    </Container>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
