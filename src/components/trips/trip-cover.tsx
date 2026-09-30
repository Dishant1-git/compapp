import { cn } from "@/lib/utils";

/**
 * A designed cover for a trip until trips have photos: the destination set
 * large over faint map contours, on one of the Terra colours. Colour and
 * contour angle come from the destination name, so a place always looks the same.
 */
const TONES = [
  { bg: "bg-[#17251f]", text: "text-[#fffdf7]", line: "#d9a441" }, // forest
  { bg: "bg-[#d66a3d]", text: "text-[#17251f]", line: "#17251f" }, // burnt orange
  { bg: "bg-[#d9a441]", text: "text-[#17251f]", line: "#17251f" }, // ochre
  { bg: "bg-[#52635a]", text: "text-[#fffdf7]", line: "#f3f0e7" }, // sage
] as const;

function hash(text: string) {
  let h = 0;
  for (const ch of text.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function TripCover({
  destination,
  label,
  className,
  size = "card",
  children,
}: {
  destination: string;
  /** Small line above the name, e.g. "From Delhi". */
  label?: string;
  className?: string;
  size?: "card" | "hero";
  children?: React.ReactNode;
}) {
  const h = hash(destination);
  const tone = TONES[h % TONES.length];
  const angle = (h % 7) * 15 - 45;

  return (
    <div aria-hidden className={cn("relative overflow-hidden", tone.bg, tone.text, className)}>
      {/* Contour lines, like a topographic map. Zooms and drifts on card hover. */}
      <div className="absolute inset-0 transition-[translate,scale] duration-[1.2s] ease-(--ease-out) group-hover:translate-x-3 group-hover:scale-110">
        <svg
          viewBox="0 0 400 300"
          preserveAspectRatio="xMidYMid slice"
          className="size-full opacity-25"
          style={{ transform: `rotate(${angle}deg) scale(1.4)` }}
        >
          {Array.from({ length: 9 }, (_, i) => {
            const r = 24 + i * 22;
            return (
              <ellipse
                key={i}
                cx={260}
                cy={120}
                rx={r * 1.35}
                ry={r * (0.8 + ((h >> i) % 3) * 0.08)}
                fill="none"
                stroke={tone.line}
                strokeWidth={1}
              />
            );
          })}
      </svg>
      </div>
      <div className={cn("relative flex h-full flex-col justify-between", size === "hero" ? "p-6 sm:p-10" : "p-5")}>
        <div className="flex items-start justify-between gap-3">
          {label ? <p className="eyebrow opacity-80">{label}</p> : <span />}
          {children}
        </div>
        <p
          className={cn(
            "font-display leading-[0.9] tracking-tight uppercase break-words",
            size === "hero" ? "text-6xl sm:text-8xl lg:text-9xl" : "text-5xl",
          )}
        >
          {destination}
        </p>
      </div>
    </div>
  );
}
