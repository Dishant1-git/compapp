# CompApp

One Next.js app for two platforms, both backed by one shared database:

- **Stranger Trips**: plan group trips with new people
- **Companion**: find someone to go with

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Folder structure

```
src/
├── app/
│   ├── layout.tsx            # Root layout (html/body, fonts, metadata, viewport)
│   ├── globals.css           # Design tokens: change the color scheme here only
│   ├── (marketing)/          # Public pages with header + footer
│   │   ├── layout.tsx
│   │   └── page.tsx          # Home  →  /
│   └── (auth)/               # Split-screen auth layout (single column on mobile)
│       ├── layout.tsx
│       ├── login/page.tsx    # →  /login
│       └── register/page.tsx # →  /register?platform=trips|companion
├── components/
│   ├── ui/                   # Primitives: Button, Input, Container, Logo
│   ├── layout/               # SiteHeader, MobileNav, SiteFooter
│   ├── home/                 # Home page sections
│   └── auth/                 # Login/Register forms and helpers
└── lib/
    ├── site-config.ts        # App name, nav links, platform definitions
    ├── utils.ts
    └── auth/actions.ts       # Login/register Server Actions (DB hookup TODO)
```

### Adding the platforms later

Route groups (folders in parentheses) don't show up in the URL. Suggested next steps:

- `src/app/(trips)/trips/...`: Stranger Trips pages, with their own layout
- `src/app/(companion)/companion/...`: Companion pages, with their own layout
- `src/lib/db/`: the single shared database client and schema used by both

## Theming

All components use semantic Tailwind colors (`bg-primary`, `text-muted-foreground`,
`border-border`, …) mapped to CSS variables in `src/app/globals.css`. To apply a
brand palette, edit the variables there (light and dark).
