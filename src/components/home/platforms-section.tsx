import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { siteConfig } from "@/lib/site-config";
import { SectionHeading } from "./section-heading";

export function PlatformsSection() {
  return (
    <section id="platforms" className="scroll-mt-16 border-t py-16 sm:py-24">
      <Container>
        <SectionHeading
          eyebrow="Platforms"
          title="Two ways to connect"
          description="Use one or both — your profile, trust and history carry across."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {siteConfig.platforms.map((platform) => (
            <article
              key={platform.id}
              className="flex flex-col rounded-xl border bg-card p-6 text-card-foreground sm:p-8"
            >
              <div aria-hidden className="size-12 rounded-lg bg-muted" />
              <p className="mt-6 text-sm font-medium text-muted-foreground">
                {platform.tagline}
              </p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">
                {platform.name}
              </h3>
              <p className="mt-3 text-muted-foreground">{platform.description}</p>

              <ul className="mt-6 space-y-3">
                {platform.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <svg
                      viewBox="0 0 20 20"
                      className="mt-0.5 size-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden
                    >
                      <path d="M4 10.5l4 4 8-9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <ButtonLink
                href={`/register?platform=${platform.id}`}
                variant="outline"
                className="mt-8 w-full sm:w-auto sm:self-start"
              >
                Join {platform.name}
              </ButtonLink>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
