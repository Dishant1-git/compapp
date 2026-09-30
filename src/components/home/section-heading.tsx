import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/utils";

/** Editorial section opener: small gold label with a rule, then a large serif heading. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <Reveal className={cn("max-w-3xl", className)}>
      <p className="eyebrow flex items-center gap-4 text-highlight">
        <span aria-hidden className="h-px w-10 bg-current" />
        {eyebrow}
      </p>
      <h2 className="mt-5 text-4xl leading-[1.05] font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 max-w-xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
          {description}
        </p>
      )}
    </Reveal>
  );
}
