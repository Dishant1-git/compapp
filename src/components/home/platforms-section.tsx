import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { worldFonts } from "@/lib/fonts";
import { siteConfig, type PlatformId } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./section-heading";

/**
 * How each product looks here: a photo and a line in that world's own palette
 * and typeface, so the difference is felt before anyone clicks.
 */
const worlds: Record<PlatformId, { image: string; mood: string; line: string; tint: string; hover: string; label: string }> = {
  trips: {
    image: "/images/trips-desert-road.webp",
    mood: "Adventure",
    line: "Let's go somewhere.",
    tint: "from-[#17251f]/90 via-[#17251f]/35 to-[#d66a3d]/10",
    label: "text-trips-accent-2", // ochre: burnt orange is too dim over the photo
    hover: "group-hover:scale-[1.06] group-hover:-translate-y-1",
  },
  companion: {
    image: "/images/companion-dinner.webp",
    mood: "Connection",
    line: "I want to meet someone.",
    tint: "from-[#130f18]/95 via-[#130f18]/50 to-[#b99ac7]/10",
    label: "text-companion-highlight",
    hover: "group-hover:scale-[1.03]",
  },
};

export function PlatformsSection() {
  return (
    <section id="platforms" className="scroll-mt-16 py-20 sm:py-28 lg:py-36">
      <Container>
        <SectionHeading
          eyebrow="Two worlds"
          title="Where you're going, and who you're going with."
          description="Use one or both. Your profile, trust and history carry across."
        />

        <div className="mt-14 grid gap-4 sm:mt-20 md:grid-cols-2 md:gap-6">
          {siteConfig.platforms.map((platform, i) => {
            const world = worlds[platform.id];
            return (
              <Reveal key={platform.id} as="article" delay={i * 150}>
                <Link
                  href={platform.href}
                  data-theme={platform.id}
                  className={cn(
                    worldFonts[platform.id],
                    "group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-transparent! p-6 text-white sm:aspect-[3/4] sm:p-10 lg:aspect-[4/5]",
                  )}
                >
                  <Image
                    src={world.image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className={cn("object-cover transition-transform duration-[1.2s] ease-(--ease-out)", world.hover)}
                  />
                  <div aria-hidden className={cn("absolute inset-0 bg-gradient-to-t", world.tint)} />

                  <div className="relative">
                    <p className={cn("eyebrow", world.label)}>
                      {platform.name} · {world.mood}
                    </p>
                    <h3 className="mt-4 font-display text-4xl leading-none sm:text-5xl lg:text-6xl">{world.line}</h3>
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75 sm:text-base">
                      {platform.description}
                    </p>
                    <ul className="mt-6 flex flex-wrap gap-2">
                      {platform.features.map((feature) => (
                        <li key={feature} className="rounded-full border border-white/25 px-3 py-1 text-xs text-white/85">
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <span className="mt-8 inline-flex items-center gap-3 text-sm font-semibold">
                      {platform.cta}
                      <span
                        aria-hidden
                        className="grid size-9 place-items-center rounded-full bg-highlight text-highlight-foreground transition-transform duration-500 ease-(--ease-out) group-hover:translate-x-1.5"
                      >
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
