// Central place for app-wide copy and navigation. Rename the product here.

export type PlatformId = "trips" | "companion";

export type Platform = {
  id: PlatformId;
  name: string;
  tagline: string;
  description: string;
  features: string[];
};

export const siteConfig = {
  name: "CompApp",
  description:
    "Plan trips with like-minded strangers and find companions — one account, two platforms.",
  nav: [
    { label: "Platforms", href: "/#platforms" },
    { label: "How it works", href: "/#how-it-works" },
  ],
  platforms: [
    {
      id: "trips",
      name: "Stranger Trips",
      tagline: "Plan trips with new people",
      description:
        "Create or join group trips with travellers who share your destination, dates and budget.",
      features: [
        "Browse and join open trips",
        "Plan itineraries together",
        "Split costs transparently",
      ],
    },
    {
      id: "companion",
      name: "Companion",
      tagline: "Find someone to go with",
      description:
        "Match with verified companions for events, activities or everyday outings near you.",
      features: [
        "Verified profiles",
        "Match by interests and location",
        "Safe in-app chat",
      ],
    },
  ] satisfies Platform[],
};
