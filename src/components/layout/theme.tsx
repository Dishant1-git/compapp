import { worldFonts } from "@/lib/fonts";
import { cn } from "@/lib/utils";

export type World = keyof typeof worldFonts;

/**
 * Puts everything inside into one of the three worlds: Midnight (brand),
 * Terra (trips) or Velvet (companion). Sets the colour tokens and typefaces
 * from globals.css, so components inside need no world-specific classes.
 */
export function Theme({ world, className, children }: { world: World; className?: string; children: React.ReactNode }) {
  return (
    <div data-theme={world} className={cn(worldFonts[world], "flex flex-1 flex-col", className)}>
      {children}
    </div>
  );
}
