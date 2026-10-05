// Central place for app-wide copy and navigation. Rename the product here.

export type PlatformId = "trips" | "companion";

export type Platform = {
  id: PlatformId;
  name: string;
  tagline: string;
  description: string;
  features: string[];
  /** Where it lives. Signed-out visitors are sent to log in first, then brought back. */
  href: string;
  /** Label of its button on the home page. */
  cta: string;
};

export const siteConfig = {
  name: "CompApp",
  description:
    "Plan trips with like-minded strangers and find companions — one account, two platforms.",
  // Shown on the terms, privacy and refund pages. Set the address people should write to.
  support: { email: "" },
  nav: [
    { label: "Stranger Trips", href: "/trips" },
    { label: "Companion", href: "/companion" },
    { label: "Platforms", href: "/#platforms" },
    { label: "How it works", href: "/#how-it-works" },
  ],
  platforms: [
    {
      id: "trips",
      name: "Stranger Trips",
      href: "/trips",
      cta: "Explore Stranger Trips",
      tagline: "Plan trips with new people",
      description:
        "Create or join group trips with travellers who share your destination, dates and budget.",
      features: [
        "Browse and book group trips",
        "See who's going and your match %",
        "Find travel buddies going your way",
      ],
    },
    {
      id: "companion",
      name: "Companion",
      href: "/companion",
      cta: "Join Companion",
      tagline: "Find someone to go with",
      description:
        "Match with verified companions for events, activities or everyday outings near you.",
      features: [
        "Verified profiles",
        "Match by interests and location",
        "Safe in-app chat",
      ],
    },
  ] as Platform[],
};
