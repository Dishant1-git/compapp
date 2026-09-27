# CompApp

One Next.js app for two platforms, both backed by one shared MongoDB database:

- **Stranger Trips** (`/trips`): book group trips with new people, find travel buddies
- **Companion**: find someone to go with (not built yet)

## Getting started

Requires Node 20+ and MongoDB (local or Atlas).

```bash
npm install
cp .env.example .env.local   # set MONGODB_URI and SESSION_SECRET
npm run seed                 # demo trips, travellers and plans
npm run dev
```

Demo logins (password `password123`). Each role lands on its own home page after login:

| Email | Role | Lands on |
|---|---|---|
| `admin@demo.test` | Admin | `/admin` |
| `agency@demo.test` | Agency: Wanderlust Collective (approved) | `/agency` |
| `himalaya@demo.test` | Agency: Himalayan Trails Co. (approved) | `/agency` |
| `pending@demo.test` | Agency: Coastal Nomads (awaiting approval) | `/agency` |
| `demo@demo.test` | Traveller | `/trips` |

`npm run seed` only replaces `@demo.test` accounts and their data, so it's safe to re-run.

**Your real admin account:** register normally at `/register`, then run
`npm run make-admin -- you@example.com`. After that, admins can promote others from `/admin/users`.

## Roles

| Role | Can do |
|---|---|
| **Traveller** (`user`) | Browse, mark trips as interesting, book a seat (joins the trip's group chat), cancel, travel buddies, reports |
| **Agency** (`agency`) | Sign up at `/register/agency` (starts *pending*). Once an admin approves: create, edit and cancel trips; see booked travellers (with phone, email, emergency contact) and who's interested; mark bookings paid; post in their trips' group chats |
| **Admin** (`admin`) | See everything: stats, every agency, user, trip, booking and report. Approve, reject or suspend agencies; suspend or reactivate users; promote admins; cancel any trip; uphold or dismiss reports; read any group chat |

Only **approved** agencies can publish trips. Trips from pending, rejected or suspended
agencies are hidden from travellers. Suspended users can't sign in. Everyone gets in-app
**notifications** (bell icon) for bookings, cancellations, approvals, buddy requests and reports.

## Stranger Trips features

| Route | What it does |
|---|---|
| `/trips` | Browse upcoming trips; filter by destination, departure city, month, budget, vibe. Signed-in users see a **match %** and best matches first. |
| `/trips/[slug]` | Itinerary, captain, "your potential group" (first name, age, city, personality), seats left. Reserve or cancel a seat. Once booked: **safety panel** (call 112, call captain, send trip to emergency contact on WhatsApp, share) and **report a traveller**. |
| `/trips/buddies` | Travel plans from solo travellers, sorted by compatibility. "Ask to join" sends a request. |
| `/trips/buddies/new` | Post your own plan (destination, dates, budget, who you're looking for). |
| `/trips/me` | Upcoming/past bookings, your plans with incoming requests (accept → contact details shared), requests you've sent, trips you organize. |
| `/trips/profile` | Travel personality, bio, safety details, and a **trust score** with a full breakdown. |
| `/trips/[slug]/group` | Group chat for everyone booked on the trip, plus the agency. Updates every 4 seconds. |
| `/notifications` | In-app notifications for every role. |
| `/agency` | Agency dashboard: stats, upcoming and past trips. |
| `/agency/trips/new`, `/agency/trips/[id]`, `/agency/trips/[id]/edit` | Create a trip; manage travellers, payments and interested people; edit; cancel. |
| `/agency/profile` | Agency details. Changing the registration number sends the agency back for review. |
| `/admin` | Overview, then Agencies, Users, Trips, Bookings and Reports. |

Rules enforced on the server: bookings need a phone number, birth year and emergency
contact; minimum age per trip; one seat per person; no overbooking; no cancelling
after departure; contact details only after a buddy request is accepted.

**Matching**: overlap between personality tags (Dice coefficient). A trip's score is
40% the trip's vibe plus 60% the average match with people already booked
(`src/lib/trips/matching.ts`).

**Trust score**: verification + profile completeness + completed trips, minus
cancellations and upheld reports (`src/lib/trips/trust.ts`).

### Not built yet

- Online payments: bookings start `unpaid` and agencies mark them paid by hand. Add Razorpay or Cashfree in `bookTrip`.
- Real-time chat: the group chat polls every 4 seconds. Swap in WebSockets or Pusher when needed.
- Phone OTP, email and ID verification (the `verification` flags exist on the user model)
- Email or push delivery of notifications (in-app only for now)

## Folder structure

```
scripts/seed.ts               # Demo data
scripts/make-admin.ts         # Promote an account to admin
src/
├── app/
│   ├── (marketing)/          # Home page (header + footer)
│   ├── (auth)/               # /login, /register, /register/agency
│   ├── admin/                # Admin area (sidebar on desktop, tabs on mobile)
│   ├── agency/               # Agency area (own layout + mobile tab bar)
│   ├── notifications/
│   ├── api/trips/[id]/messages/  # Group-chat polling endpoint
│   └── trips/                # Stranger Trips (own layout + mobile tab bar)
│       ├── page.tsx          # Explore
│       ├── [slug]/           # Trip detail
│       ├── buddies/          # Travel buddies (+ /new)
│       ├── me/               # My trips
│       ├── [slug]/group/     # Trip group chat
│       └── profile/          # Travel profile & trust score
├── components/
│   ├── ui/                   # Button, Input, Badge, StatCard, ReasonForm, …
│   ├── layout/               # Headers, app nav, notification bell
│   ├── admin/  agency/
│   ├── home/  auth/
│   └── trips/                # All Stranger Trips components
└── lib/
    ├── db/                   # Shared DB connection + Mongoose models
    ├── auth/                 # Session, DAL (requireRole, getMyAgency), auth actions
    ├── admin/  agency/       # queries.ts (reads) + actions.ts (writes) per area
    ├── trips/                # queries, actions, chat, cancel, matching, trust, …
    ├── notifications.ts      # notify() + reads
    └── form-utils.ts         # Shared Server Action parsing
```

The Companion platform should get its own `src/app/companion/`, `src/components/companion/`
and `src/lib/companion/`, reusing `lib/db` and `lib/auth`.

## Theming

All components use semantic Tailwind colors (`bg-primary`, `text-muted-foreground`,
`border-border`, …) mapped to CSS variables in `src/app/globals.css`. To apply a
brand palette, edit the variables there (light and dark).
