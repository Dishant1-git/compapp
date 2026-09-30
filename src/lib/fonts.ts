import {
  Cormorant_Garamond,
  DM_Sans,
  DM_Serif_Display,
  Manrope,
  Playfair_Display,
  Plus_Jakarta_Sans,
} from "next/font/google";

// Each world's typefaces, self-hosted by next/font. A world's fonts load only
// on pages inside it (see <Theme>). Playfair also draws the logo everywhere,
// so the root layout loads it.

export const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
  display: "swap",
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap" });

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const worldFonts = {
  brand: manrope.variable,
  trips: `${dmSerif.variable} ${dmSans.variable}`,
  companion: `${cormorant.variable} ${jakarta.variable}`,
} as const;
