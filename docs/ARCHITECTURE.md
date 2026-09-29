# CompApp — How the App Works

A complete guide to the codebase: what we use, why, how every feature works end to end,
and where to change things. Read top to bottom once; afterwards use the table of contents
as a reference.

> Last updated: 28 Sep 2026. Covers Next.js 16.3, React 19.2, Mongoose 9, Tailwind 4.

## Contents

1. [What the app is](#1-what-the-app-is)
2. [Tech stack](#2-tech-stack)
3. [Running it locally](#3-running-it-locally)
4. [Folder structure](#4-folder-structure)
5. [How Next.js is used here](#5-how-nextjs-is-used-here)
6. [Architecture: the layers](#6-architecture-the-layers)
7. [The database](#7-the-database)
8. [Authentication and sessions](#8-authentication-and-sessions)
9. [Roles and permissions](#9-roles-and-permissions)
10. [Traveller features](#10-traveller-features)
11. [Agency features](#11-agency-features)
12. [Admin features](#12-admin-features)
13. [Notifications](#13-notifications)
14. [Forms: the pattern every form follows](#14-forms-the-pattern-every-form-follows)
15. [UI system and responsive design](#15-ui-system-and-responsive-design)
16. [Scripts](#16-scripts)
17. [Security model](#17-security-model)
18. [Known limitations](#18-known-limitations)
19. [How to… (recipes)](#19-how-to-recipes)
20. [Glossary](#20-glossary)

---

## 1. What the app is

**CompApp** is one web app that will host two platforms sharing **one account system and
one MongoDB database**:

| Platform | Status | What it does |
|---|---|---|
| **Stranger Trips** (`/trips`) | Built | Solo travellers book group trips run by travel agencies, meet the group in a chat, and find travel buddies. |
| **Companion** | Not built | Book a verified companion for activities. Only mentioned on the home page. |

Three kinds of people use Stranger Trips:

- **Travellers** browse trips, see how well they match each group, book a seat, chat with the group.
- **Agencies** run the trips. An admin must approve them before they can publish.
- **Admins** see and moderate everything.

---

## 2. Tech stack

| Piece | What we use | Why | Where |
|---|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | Pages, server rendering, Server Actions and API routes in one project. No separate Express server. | `src/app/` |
| UI library | **React 19** | `useActionState` and `useFormStatus` give us forms with pending states and errors for free. | everywhere |
| Language | **TypeScript** (strict) | Catches mistakes before runtime; typed routes via `PageProps<"/route">`. | everywhere |
| Styling | **Tailwind CSS 4** | Utility classes; colors come from CSS variables so the theme changes in one file. | `src/app/globals.css` |
| Database | **MongoDB** | Flexible documents; runs locally as a Windows service on port 27017. | `.env.local` → `MONGODB_URI` |
| ODM | **Mongoose 9** | Schemas, validation, indexes, `populate()` for joins. | `src/lib/db/` |
| Passwords | **bcryptjs** | Hashes passwords (cost 10). Pure JS, no native build step. | `src/lib/auth/actions.ts` |
| Sessions | **jose** | Signs a JWT stored in an HTTP-only cookie. | `src/lib/auth/session.ts` |
| Guard | **server-only** | Makes the build fail if server code (DB, secrets) is imported into a browser component. | top of server files |
| Scripts | **tsx** | Runs TypeScript scripts (seed, make-admin) directly. | `scripts/` |
| Lint | **ESLint 9** + `eslint-config-next` | Includes React Compiler rules (e.g. no reassigning variables during render). | `eslint.config.mjs` |
| Fonts | **Geist** via `next/font` | Self-hosted automatically, no layout shift. | `src/app/layout.tsx` |

**Not used (on purpose):** no Redux or global state library (the server is the source of
truth), no REST API for the UI (Server Actions instead), no UI component library (small
custom components in `src/components/ui/`), no Socket.IO (chat polls — see §10.7).

### Important: this is Next.js 16

Next.js 16 differs from older versions you may know:

- `params` and `searchParams` are **Promises**: `const { slug } = await params`.
- Middleware is now called **Proxy** (`proxy.ts`). We don't use it.
- Global type helpers exist: `PageProps<"/trips/[slug]">`, `LayoutProps<"/trips">`,
  `RouteContext<"/api/trips/[id]/messages">`.
- The exact docs for the installed version are in `node_modules/next/dist/docs/`.
  `AGENTS.md` tells AI assistants to read them before writing code.

---

## 3. Running it locally

```bash
npm install
cp .env.example .env.local     # then fill in the two values
npm run seed                   # demo data (safe to re-run)
npm run dev                    # http://localhost:3000
```

**`.env.local`** (never committed; `.gitignore` ignores `.env*` except `.env.example`):

| Variable | Example | Used by |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/compapp` | `src/lib/db/mongoose.ts`, scripts |
| `SESSION_SECRET` | 32 random bytes, base64 | `src/lib/auth/session.ts` — signs login cookies. Changing it logs everyone out. |

Generate a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

**Commands**

| Command | Does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build + TypeScript check |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run seed` | Replace demo data (only `@demo.test` accounts and what they own) |
| `npm run make-admin -- you@example.com` | Promote a registered account to admin |

**Demo logins** (password `password123`): `admin@demo.test`, `agency@demo.test`,
`himalaya@demo.test`, `pending@demo.test` (unapproved agency), `demo@demo.test` (traveller),
plus travellers like `priya@demo.test`, `sneha@demo.test`.

---

## 4. Folder structure

```
compapp/
├── .env.local / .env.example     Secrets (local) and template (committed)
├── AGENTS.md / CLAUDE.md         Notes for AI coding assistants
├── docs/ARCHITECTURE.md          This file
├── scripts/
│   ├── seed.ts                   Demo data
│   └── make-admin.ts             Promote an account to admin
└── src/
    ├── app/                      ROUTES — every folder is a URL segment
    │   ├── layout.tsx            Root layout: <html>, fonts, metadata, viewport
    │   ├── globals.css           Design tokens (colors, radius) + Tailwind
    │   ├── (marketing)/          Route group (not in URL): home page "/"
    │   ├── (auth)/               Route group: /login, /register, /register/agency
    │   ├── trips/                Stranger Trips traveller area
    │   │   ├── page.tsx          /trips — explore
    │   │   ├── [slug]/page.tsx   /trips/manali-weekend — trip detail
    │   │   ├── [slug]/group/     /trips/…/group — group chat
    │   │   ├── buddies/          /trips/buddies (+ /new)
    │   │   ├── me/               /trips/me — my trips dashboard
    │   │   ├── profile/          /trips/profile
    │   │   ├── loading.tsx       Skeleton while a trips page loads
    │   │   └── error.tsx         Friendly error screen for the trips area
    │   ├── agency/               /agency — agency area (own layout)
    │   ├── admin/                /admin — admin area (own layout)
    │   ├── notifications/        /notifications — shared by all roles
    │   └── api/trips/[id]/messages/route.ts   JSON endpoint the chat polls
    │
    ├── components/               UI pieces (no database access)
    │   ├── ui/                   Generic: Button, Input, Badge, StatCard, ReasonForm…
    │   ├── layout/               Headers, nav bars, notification bell
    │   ├── home/  auth/          Home page sections, login/register forms
    │   ├── trips/                Traveller-facing components
    │   ├── agency/               Trip form, agency profile form
    │   └── admin/                Admin nav, tables, filters
    │
    └── lib/                      LOGIC — data, rules, helpers
        ├── db/mongoose.ts        Database connection
        ├── db/models/            One file per collection (10 models)
        ├── auth/                 session.ts, dal.ts, actions.ts
        ├── trips/                Traveller logic (queries, actions, chat, matching…)
        ├── agency/               Agency queries + actions
        ├── admin/                Admin queries + actions
        ├── notifications.ts      notify() + read functions
        ├── notification-actions.ts  "Mark all read"
        ├── form-utils.ts         Shared form parsing/validation helpers
        ├── site-config.ts        App name, nav links, platform list
        └── utils.ts              cn() class-name joiner
```

**Rule of thumb:** `app/` decides *what page*, `components/` decides *how it looks*,
`lib/` decides *what data and what rules*.

---

## 5. How Next.js is used here

### 5.1 Server Components by default

Every `page.tsx` and `layout.tsx` is a **Server Component**: it runs on the server, can
`await` the database directly, and sends HTML to the browser. No `useEffect` + `fetch`
to load data.

```tsx
// src/app/trips/page.tsx (simplified)
export default async function TripsPage({ searchParams }: PageProps<"/trips">) {
  const filters = parse(await searchParams);
  const user = await getCurrentUser();          // reads the cookie
  const trips = await listTrips(filters, user); // queries MongoDB
  return <TripCard … />;                        // HTML to the browser
}
```

### 5.2 Client Components only where needed

A file starting with `"use client"` runs in the browser too. We use them only for
interactivity: forms with pending state, the mobile menu, the chat, share buttons, nav
highlighting (`usePathname`). Examples: `booking-panel.tsx`, `group-chat.tsx`,
`trips-nav.tsx`. Client components **never** import from `lib/db` or anything marked
`server-only`; they receive plain data as props.

### 5.3 Server Actions for every write

A function in a file starting with `"use server"` can be passed to a `<form action={…}>`.
When the form submits, the browser POSTs to Next.js, which runs the function on the server.
This replaces a REST API for all mutations.

```tsx
// Client component
const [state, action, pending] = useActionState(bookTrip.bind(null, tripId), {});
<form action={action}><Button disabled={pending}>Reserve my seat</Button></form>

// src/lib/trips/actions.ts  ("use server")
export async function bookTrip(tripId: string): Promise<ActionState> {
  const viewer = await getCurrentUser();   // always re-check auth on the server
  … validate, write to MongoDB …
  revalidatePath("/", "layout");           // re-render pages with fresh data
  return { success: true, message: "You're in!" };
}
```

`.bind(null, id)` pre-fills arguments (like the trip ID) without hidden inputs.

After a successful write we call **`revalidatePath`**, so the page the user is on
re-renders on the server and the new data appears without a manual refresh. Some actions
call **`redirect()`** instead (e.g. after creating a trip).

A `"use server"` file may **only export async functions**. Shared helpers therefore live
in normal modules (`form-utils.ts`, `trips/cancel.ts`, `trips/chat.ts`).

### 5.4 One API route

`src/app/api/trips/[id]/messages/route.ts` is the only JSON endpoint. The chat polls it
(`GET ?after=<ISO date>`) for new messages. Everything else uses Server Components (reads)
and Server Actions (writes).

### 5.5 Special files

| File | Purpose |
|---|---|
| `layout.tsx` | Wraps all pages below it; stays mounted when navigating between them. |
| `loading.tsx` | Shown instantly while the server renders (streaming). `/trips` has a skeleton. |
| `error.tsx` | Catches thrown errors in that section and shows "Try again". |
| `not-found.tsx` | Shown when a page calls `notFound()`. |
| `(folder)` | **Route group**: organises files and gives them a shared layout without adding to the URL. |
| `[slug]` / `[id]` | Dynamic segment; value arrives in `params`. |

### 5.6 Rendering

Almost every page reads the session cookie, so it's rendered **per request** (dynamic,
`ƒ` in the build output). The home page and `/register/agency` are static (`○`).

---

## 6. Architecture: the layers

```
Browser
  │  HTML / form POST / fetch
  ▼
app/…/page.tsx            (Server Component)    ── reads ──┐
components/… (client)     form → Server Action  ── writes ─┤
                                                           ▼
lib/*/queries.ts   "server-only"  read functions → return plain DTOs
lib/*/actions.ts   "use server"   write functions → validate → write → notify → revalidate
lib/auth/dal.ts    who is logged in, role checks
                                                           ▼
lib/db/models/*    Mongoose schemas
lib/db/mongoose.ts cached connection
                                                           ▼
MongoDB (database "compapp")
```

### Rules we follow

1. **Pages mostly don't talk to Mongoose directly**; they call functions in
   `lib/*/queries.ts`. Small exceptions: the group chat page, the admin layout's badge
   counts, and the notification bell run one simple query each.
2. **Queries return plain objects (DTOs)**, not Mongoose documents: IDs become strings,
   dates become ISO strings. React can't pass Mongoose documents or `ObjectId`s to client
   components. Types are in `src/lib/trips/types.ts`.
3. **Every action re-checks who is calling.** Hiding a button is not security; the
   server action must verify the user, role and ownership itself.
4. **Queries for each area live together**: `lib/trips` (travellers), `lib/agency`,
   `lib/admin`. Admin reuses agency and trip queries where it can.
5. **Privacy is decided in the query**, not the component. For example `getTrip()` only
   includes the captain's phone number if the viewer is booked or manages the trip.

### Database connection

`src/lib/db/mongoose.ts` caches the connection on `globalThis`. Without this, every hot
reload in development would open a new connection until MongoDB refuses more. Every
query/action starts with `await connectDB()`.

---

## 7. The database

One MongoDB database, **10 collections**. Both platforms will share `users`.

### 7.1 Relationships

```
User ──1:1── Agency (owner)            Agency ──1:N── Trip
User ──N:M── Trip   via Booking        User ──N:M── Trip via TripInterest
Trip ──1:N── Message (group chat)      User ──1:N── Notification
User ──1:N── TravelPlan ──1:N── BuddyRequest (from User → to User)
User ──1:N── Report (reporter / reported, optional Trip)
```

### 7.2 Collections

**`users`** — `src/lib/db/models/user.ts`. One account for everything.

| Field | Type | Notes |
|---|---|---|
| name, email | string | email unique, lowercased |
| passwordHash | string | `select: false` — never loaded unless asked for |
| platforms | `["trips","companion"]` | chosen at sign-up |
| role | `user` \| `agency` \| `admin` | `user` = traveller |
| status | `active` \| `suspended` | suspended can't log in |
| phone, city, birthYear, gender, bio | profile | age is computed from birthYear |
| personality | string[] | travel tags, e.g. `adventure`, `chill` (list in `trips/constants.ts`) |
| emergencyContact | `{ name, phone }` | required before booking |
| verification | `{ email, phone, identity }` booleans | set by future OTP/KYC; feeds trust score |

**`agencies`** — `agency.ts`. One per agency-role user (`owner` is unique).
Fields: name, description, city, phone, email, website, registrationNumber (GSTIN or
tourism ID), **status** (`pending` → `approved` / `rejected` / `suspended`), reviewNote,
reviewedAt, reviewedBy.

**`trips`** — `trip.ts`. slug (unique, used in URLs), title, origin, destination, region,
summary, startDate, endDate, price, maxGroupSize, minAge, vibes (personality tags),
highlights[], itinerary[{day,title,description}], inclusions[], exclusions[],
captain{name,phone,bio}, **status** (`open`/`cancelled`), cancelReason, **agency** (ref).
Indexes: `{startDate, status}`, `{agency}`.

**`bookings`** — `booking.ts`. trip, user, status (`confirmed`/`cancelled`), amount (price
at booking time), paymentStatus (`unpaid`/`paid`/`refunded`), paidAt, cancelledAt,
cancelledBy (`traveller`/`agency`/`admin`).
**Partial unique index** on `{trip, user}` where `status = confirmed`: the database itself
refuses a second active seat for the same person, but allows re-booking after a cancellation.

**`tripinterests`** — `trip-interest.ts`. `{trip, user}`, unique. "I'm interested".

**`messages`** — `message.ts`. trip, user (empty for system messages), kind
(`text`/`system`), body (≤1000 chars). Index `{trip, createdAt}` for fast chat loading.

**`notifications`** — `notification.ts`. user, title, body, href (where clicking goes),
read. Index `{user, read, createdAt}`.

**`travelplans`** — `travel-plan.ts`. A traveller's own plan for finding buddies: origin,
destination, dates, budget, lookingFor tags, note, status (`active`/`closed`).

**`buddyrequests`** — `buddy-request.ts`. plan, from, to, message, status
(`pending`/`accepted`/`declined`). Unique `{plan, from}`: one request per person per plan.

**`reports`** — `report.ts`. reporter, reported, trip (optional), reason, details, status
(`open`/`reviewed` = upheld/`dismissed`).

### 7.3 Why some data is copied

- `booking.amount` copies the trip price at booking time, so editing the trip price later
  doesn't change what earlier travellers owe.
- Trip seat counts are **not** stored; they're counted from confirmed bookings each time
  (`groupsFor()` in `trips/queries.ts`). No counter can drift out of sync.

### 7.4 Dates

Dates from `<input type="date">` are stored as **midnight UTC** (`dateInput()` in
`form-utils.ts`) and displayed with `timeZone: "UTC"` (`trips/format.ts`), so a trip on
12 Oct shows as 12 Oct everywhere regardless of the server's time zone.

---

## 8. Authentication and sessions

### 8.1 Registering (traveller)

`/register` → `RegisterForm` → `register()` in `src/lib/auth/actions.ts`:

1. Validate name, email, password (≥8), platforms, terms.
2. Reject if the email exists.
3. Hash the password with bcrypt (cost 10) and create the user with `role: "user"`.
4. `createSession()` sets the cookie.
5. Redirect to `/trips/profile?welcome=1` to set up the travel profile.

### 8.2 Registering (agency)

`/register/agency` → `registerAgency()`: creates the user with `role: "agency"` **and**
an Agency with `status: "pending"` (if the Agency insert fails, the user is deleted again).
All admins get a notification. Redirect to `/agency`, which shows a "waiting for approval"
banner.

### 8.3 Logging in

`login()`: find user by email (explicitly selecting `+passwordHash`), compare with bcrypt,
refuse `suspended` accounts, create the session, then redirect to:

- the `?next=` URL if present and safe (see below), otherwise
- the role's home from `homeFor()`: admin → `/admin`, agency → `/agency`, user → `/trips`.

The same "Incorrect email or password" message is used for unknown emails and wrong
passwords, so attackers can't check which emails are registered.

### 8.4 The session cookie

`src/lib/auth/session.ts`:

- Payload: `{ userId, role }` only — no personal data.
- Signed with HS256 using `SESSION_SECRET`; expires in **7 days**.
- Cookie `session`: `httpOnly` (JavaScript can't read it), `sameSite: lax`,
  `secure` in production, `path: /`.
- `deleteSession()` on logout.

The cookie is **signed, not encrypted**: anyone holding it can read the user ID but can't
change it without the secret.

### 8.5 Checking who's logged in: the DAL

`src/lib/auth/dal.ts` ("data access layer") is the only place that reads the cookie.

| Function | Returns / does |
|---|---|
| `getCurrentUser()` | `{id, name, email, role, personality}` or `null`. **Reloads the user from MongoDB** each request, so role changes and suspensions apply immediately even though the cookie lasts 7 days. Suspended users count as logged out. Wrapped in React `cache()` so multiple calls in one request hit the DB once. |
| `requireUser(next?)` | Same, but redirects to `/login?next=…` when logged out. |
| `requireRole(["admin"])` | Requires a role. Wrong role → **404** (so the admin area isn't advertised). |
| `getMyAgency(userId)` | The agency owned by this user (id, name, status, reviewNote). |
| `homeFor(role)` | Landing page per role. |
| `safeNext(value)` | Only allows relative paths like `/trips/x`. Blocks `//evil.com` and `/\evil.com` so login can't redirect people to another site ("open redirect"). |

Layouts **and** pages **and** actions each call these. Layouts alone aren't enough,
because Server Actions can be called without rendering the layout.

---

## 9. Roles and permissions

| Can… | Visitor | Traveller | Agency | Admin |
|---|:-:|:-:|:-:|:-:|
| Browse trips, see group (first name/age/city) | ✓ | ✓ | ✓ | ✓ |
| See match % | | ✓ | | |
| Mark interested, book, cancel own seat | | ✓ | | |
| Post in a trip's group chat | | if booked | own trips | read only |
| Travel buddies (post plans, send requests) | | ✓ | | |
| Report a traveller | | ✓ (button shown when booked on the same trip) | | |
| Create / edit / cancel trips | | | approved only, own | cancel any |
| See travellers' phone, email, emergency contact | | | own trips | ✓ |
| Mark bookings paid | | | own trips | |
| Approve/reject/suspend agencies, suspend users, make admins, resolve reports | | | | ✓ |

**Where each rule lives:** mostly in the Server Actions (`lib/*/actions.ts`) and queries
(`getTrip`, `getAgencyTrip`, `groupAccess`). Pages use `requireRole()` for whole areas.

**Why agencies and admins can't book:** it keeps roles clean (an agency booking its own
trip would inflate numbers). Use a separate traveller account to travel.

---

## 10. Traveller features

### 10.1 Explore trips — `/trips`

- Filters are a plain `<form method="get">` (`trip-filters.tsx`), so filters live in the
  URL: shareable, bookmarkable, and they work without JavaScript.
- `listTrips()` returns trips that are **open, start today or later, and belong to an
  approved agency**, filtered by destination text (regex on destination/region/title,
  user input escaped), departure city, month, max price, vibe. Up to 60.
- Seat counts come from confirmed bookings. If the viewer has a travel personality, the
  list is sorted by match % (best first).

### 10.2 Matching — `src/lib/trips/matching.ts`

Everyone picks personality tags (Party, Adventure, Chill, Trekking…). Similarity between
two tag lists uses the **Dice coefficient**:

```
compatibility(A, B) = 2 × |A ∩ B| / (|A| + |B|)  × 100
```

Example: you = {adventure, photography, chill}, Priya = {adventure, photography, trekking}
→ 2 shared → 2×2 / (3+3) = **67%**.

A **trip's** match is 40% the trip's vibe + 60% the average match with people already
booked (you're excluded from your own group). If only one signal exists, that one is used;
with no tags at all, no badge is shown. It's intentionally simple and explainable. A
future ML model can replace this one file.

### 10.3 Trip detail — `/trips/[slug]`

`getTrip(slug, viewer)` builds everything the page needs:

- **Hidden trips:** if the agency isn't approved, the trip returns `null` (404) unless the
  viewer manages it or is already booked.
- **Group:** first name only, age, city, gender, personality, and match % for each person.
  Shared tags are highlighted.
- **Captain phone:** only for booked travellers and the managing agency/admin.
- `canManage` shows a "Manage trip" button for the agency owner or admins.

On phones, the booking panel sits right under the header; on desktop it's a sticky right
sidebar (CSS grid with `lg:col-start-2 lg:row-start-1`).

### 10.4 Booking — `bookTrip()` in `src/lib/trips/actions.ts`

Checks, in order:

1. Logged in (else redirect to login) and role is `user`.
2. Trip exists, its agency is **approved**, trip is **open** and **hasn't started**.
3. **Safety profile complete:** phone, birth year, emergency contact name and phone.
   If not, the error includes a "Complete profile" link to `/trips/profile?next=<trip>`,
   which returns you to the trip after saving.
4. Age ≥ trip's `minAge`.
5. Not already booked; seats left.
6. Create the booking with `amount = trip.price`.
7. **Overbooking guard:** count confirmed bookings again. If two people took the last seat
   at the same moment and we're now over capacity, delete our booking and say "the last
   seat was just taken". (The local MongoDB is a single server without transactions, so
   this count-after-insert check replaces one.)
8. Post "Priya joined the group." to the chat, notify the agency owner, revalidate.

The booking panel then shows "Open group chat" and "Cancel my seat".

### 10.5 Cancelling a seat — `cancelBooking()`

Only your own confirmed booking, only before departure. Sets `status: cancelled`,
`cancelledBy: traveller`, posts "… left the group.", notifies the agency. A new booking
is allowed later (thanks to the partial unique index).

### 10.6 "I'm interested" — `toggleInterest()`

Adds or removes a `TripInterest`. On adding, the agency gets a notification. The agency
sees interested people (first name, age, city, tags — **no contact details**) on its trip
page.

### 10.7 Group chat — `/trips/[slug]/group`

**Who's in the group** (`groupAccess()` in `src/lib/trips/chat.ts`):

- travellers with a **confirmed** booking — can post
- the **agency owner** of the trip — can post; messages show "· Agency" and their full name
- **admins** — can read, can't post (moderation)
- everyone else sees "This group is for travellers on the trip".

**How messages flow:**

```
Page load (server): listMessages() → last 200 messages → <GroupChat initial={…}>
Every 4 s (browser): GET /api/trips/<id>/messages?after=<newest createdAt>
                     → route checks session + groupAccess → returns only newer messages
Send: form → sendMessage() Server Action → saves → client polls immediately
```

- Polling pauses while the tab is hidden (`document.visibilityState`).
- Messages are de-duplicated by ID, so a message never appears twice.
- Enter sends, Shift+Enter makes a new line.
- **System messages** (joined / left / trip cancelled / dates changed) have no author and
  are centred.
- Why polling instead of WebSockets: it works on any host (including serverless) with no
  extra server. For a few hundred active chats it's fine. See §19 to upgrade.

### 10.8 My trips — `/trips/me`

Upcoming bookings (with a "Group chat" button), past trips, your travel plans with incoming
buddy requests (Accept / Decline), and requests you've sent. Accepted requests reveal the
other person's name, email and phone.

### 10.9 Travel buddies — `/trips/buddies`

For solo travellers who want a companion outside an agency trip.

- `createTravelPlan()`: origin, destination, dates (start ≥ today, end ≥ start), budget,
  "looking for" tags, note.
- `listPlans()`: active plans that haven't ended, with the owner's first name, age, city,
  **trust score**, and your match % against (owner's tags ∪ looking-for tags).
- `sendBuddyRequest()` → owner is notified → `respondToBuddyRequest()` → requester is
  notified. **Contact details are only revealed after acceptance.**

### 10.10 Profile and trust score — `/trips/profile`

`updateProfile()` validates phone format, age 18+, bio ≤500 characters, emergency contact
(both fields or neither, and not your own number).

**Trust score** (`src/lib/trips/trust.ts`) is shown as a breakdown, not a black box:

| Item | Points |
|---|---|
| Account created | +10 |
| Email verified | +10 |
| Phone verified | +15 |
| Identity verified | +20 |
| Profile complete (bio, city, age, 3+ tags, emergency contact) | +5 each, max +25 |
| Completed trips (confirmed booking whose trip has ended) | +5 each, max +20 |
| Cancellations | −3 each, max −15 |
| Upheld reports (admin marked "reviewed") | −20 each |

Clamped to 0–100. **Only upheld reports count**, so nobody can lower someone's score just
by reporting them. Verification flags are false until OTP/KYC is built.

### 10.11 Safety

- **Safety panel** (shown once booked, `safety-panel.tsx`): call 112, call the trip
  captain, send trip details to your emergency contact on WhatsApp (`wa.me` link with a
  pre-filled message), share via the phone's share sheet (or copy to clipboard).
- **Report a traveller:** the Report button appears on group members' cards for people
  booked on the trip. Reasons: harassment, fake profile, safety concern, scam, other.
  Admins are notified. Note: `reportUser()` checks the reporter is logged in and the
  reported user exists, but doesn't yet verify they share a trip — add that check if
  reports get abused.
- Chat footer warns never to share OTPs or send money to anyone but the agency.

---

## 11. Agency features

### 11.1 Approval lifecycle

```
register ──► pending ──approve──► approved ──suspend──► suspended
                │                    ▲   │                  │
                └──reject──► rejected│   └─change GSTIN─► pending
                                 │   └──────approve──────────┘
                                 └─edit profile─► pending
```

- Only **approved** agencies can create trips (`createTrip()` checks).
- Not approved → all its trips disappear from `/trips` and trip pages 404 for the public.
  Existing bookings stay, so booked travellers can still reach the group chat.
- Changing the registration number of an approved agency, or editing a rejected one, sends
  it back to **pending** and notifies admins (`updateAgencyProfile()`).
- A banner in `app/agency/layout.tsx` explains the current status and shows the admin's note.

### 11.2 Dashboard — `/agency`

`getAgencyDashboard(agencyId)`: upcoming trips, travellers booked, interested count,
booked value and paid value; trip rows with booked/max, interested and value.

### 11.3 Creating and editing trips

One form for both (`components/agency/trip-form.tsx`); `parseTripForm()` in
`lib/agency/actions.ts` validates for both.

- Itinerary textarea: one line per day, `Title: description`.
- Highlights, inclusions, exclusions: one per line.
- Slug = `destination-title-xxxx` (4 random characters to avoid collisions).
- **Edit rules:** can't edit cancelled trips; can't set group size below current bookings;
  a trip that already started may keep its past start date. If dates change, a system
  message is posted and every booked traveller is notified. Existing bookings keep their
  original price.

### 11.4 Managing a trip — `/agency/trips/[id]`

`getAgencyTrip()` returns data only if the trip belongs to this agency.

- **Travellers:** full name, age, gender, city, phone, email, emergency contact, booked
  date and amount, payment status, plus a **Mark as paid / unpaid** button
  (`setBookingPaid()`). Agencies see contact details because they operate the trip; the
  booking panel tells travellers this before they book.
- **Interested:** people who saved the trip, with a "Booked" badge if they later booked.
- **Cancelled bookings:** who cancelled and whether it was the traveller, agency or admin.
- **Cancel trip:** requires a reason → `cancelTripAndBookings()` (see below).

### 11.5 Cancelling a whole trip — `src/lib/trips/cancel.ts`

Shared by agencies and admins: set trip `cancelled` + reason → cancel every confirmed
booking (`cancelledBy`) → post a system message → notify every traveller ("Any payment you
made will be refunded by the agency"). Refunds themselves are manual until payments exist.

---

## 12. Admin features

Area: `/admin`, layout `app/admin/layout.tsx`, guarded by `requireRole(["admin"])`.
Desktop has a left sidebar; phones and tablets get a scrollable tab strip. Red counts show
pending agencies and open reports.

| Page | Data (`lib/admin/queries.ts`) | Actions (`lib/admin/actions.ts`) |
|---|---|---|
| **Overview** `/admin` | `getAdminStats()`: users by role, new this week, suspended; agencies by status; upcoming/cancelled trips; confirmed/cancelled bookings, booked and paid value; open reports; active buddy plans; latest 8 bookings; pending agencies | — |
| **Agencies** `/admin/agencies` | `listAgencies()` filter by status, search; trip and traveller counts (via `$lookup`) | — |
| **Agency detail** `/admin/agencies/[id]` | profile, owner, last review, stats, all trips | `setAgencyStatus()` approve / reject / suspend. Reject and suspend require a note, which the agency sees. Owner is notified. |
| **Users** `/admin/users` | `listUsers()` filter by role/status, search name/email/phone/city; booking and report counts | — |
| **User detail** `/admin/users/[id]` | full profile, trust score, bookings, reports against/by, plans, agency | `setUserStatus()` suspend/reactivate; `setUserRole()` make/remove admin. Can't act on yourself; can't change an agency owner's role. |
| **Trips** `/admin/trips` | `listTrips()` upcoming / past / cancelled / all, search | `cancelTripAsAdmin()` with reason; travellers and agency notified |
| **Bookings** `/admin/bookings` | `listBookings()` filter by status and payment | — |
| **Reports** `/admin/reports` | `listReports()` open / upheld / dismissed | `resolveReport()`: **Uphold** (lowers trust score, notifies the reported user) or **Dismiss** |

Lists show up to 100 rows (newest first). Pagination is a future improvement.

**Creating the first admin:** register normally, then `npm run make-admin -- you@example.com`.

---

## 13. Notifications

`notify(userIds, { title, body?, href? })` in `src/lib/notifications.ts` inserts one
notification per user. It **never throws**: a failed notification must not undo a booking.

| Event | Who gets notified |
|---|---|
| Traveller books / cancels a seat | Agency owner |
| Traveller marks interest | Agency owner |
| Agency or admin cancels a trip | Every booked traveller (+ agency if admin cancelled) |
| Agency changes trip dates | Every booked traveller |
| New agency registers / needs re-review | All admins |
| Admin approves / rejects / suspends an agency | Agency owner |
| New safety report | All admins |
| Report upheld | The reported user |
| Buddy request sent / accepted / declined | Plan owner / requester |

The bell (`components/layout/notification-bell.tsx`) is a Server Component that counts
unread notifications on each page render. `/notifications` lists the latest 50;
"Mark all read" is `markAllNotificationsRead()`. In-app only; email/SMS/push can be added
inside `notify()` later.

---

## 14. Forms: the pattern every form follows

Every form uses the same four pieces:

```tsx
"use client";
const [state, action, pending] = useActionState<ActionState, FormData>(someAction, {});
<form action={action}>
  <Input name="email" defaultValue={state.values?.email} aria-invalid={!!state.errors?.email} />
  <FieldError messages={state.errors?.email} />
  <Button disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
</form>
```

- **`ActionState`** (`trips/types.ts`): `{ errors?, message?, success?, values? }`.
- **Validation is on the server**, in the action. HTML `required`/`type="email"` is only a
  convenience.
- **`values` echo:** React 19 resets a form after it submits. On a validation error that
  would wipe what the user typed, so actions return `values: echo(formData)` and fields use
  them as `defaultValue`. Passwords are never echoed.
- **Helpers** in `src/lib/form-utils.ts`: `text()`, `personalities()`, `lines()`,
  `dateInput()`, `todayUTC()`, `echo()`, `hasErrors()`, `PHONE_RE`, `ID_RE` (valid
  MongoDB ID, checked before every `findById` so bad IDs don't crash queries).
- **Simple buttons** (Accept, Mark paid, Uphold…) are tiny forms with a bound action:
  `<form action={resolveReport.bind(null, id, "reviewed")}>`.
- **Drastic actions** (cancel trip, suspend, reject) use `ReasonForm`
  (`components/ui/reason-form.tsx`): a collapsible box with a reason field and a browser
  confirm dialog.

---

## 15. UI system and responsive design

### 15.1 Colors and theme

All colors are **semantic tokens** defined once in `src/app/globals.css`
(`--primary`, `--muted`, `--border`, `--destructive`…) with light and dark (system
setting) values, then exposed to Tailwind (`bg-primary`, `text-muted-foreground`). The
palette is neutral grayscale on purpose; **changing the brand color means editing only
that file.**

### 15.2 Components (`src/components/ui/`)

`Button` / `ButtonLink` / `buttonClasses()` (variants primary, secondary, outline, ghost;
sizes sm/md/lg, all ≥40px tall for touch), `Input`, `Select`, `Textarea`, `Label`,
`FieldError`, `Badge` (picks a tone from a status like `approved` or `suspended`),
`StatCard`/`StatGrid`, `ReasonForm`, `Container` (max width + side padding), `Logo`.
`cn()` in `lib/utils.ts` joins class names.

### 15.3 Mobile-first layout

| Area | Phone | Tablet / desktop |
|---|---|---|
| Marketing | Hamburger menu (full-screen panel, locks scroll, Esc closes) | Inline nav |
| Auth | Single column | Split screen with brand panel (`lg`) |
| Trips / Agency | **Bottom tab bar** (app-style) | Top nav links (`md`) |
| Admin | Scrollable tab strip under header | Left sidebar (`lg`) |
| Tables (admin) | Scroll sideways *inside* their box | Full table |

Details that matter on phones:

- Inputs use 16px text so iPhones don't zoom in on focus.
- `viewportFit: cover` + `env(safe-area-inset-*)` padding keeps content clear of the
  notch and home bar.
- `min-h-dvh` instead of `100vh` (avoids mobile browser toolbar jumps).
- Pages pad their bottom so the tab bar never covers content.
- The end-to-end tests check that no page scrolls sideways at 390px width.

### 15.4 Accessibility

Labels on every input, `aria-invalid` + error text, `aria-current` on active nav links,
`aria-pressed` on the interest toggle, `role="status"` for result messages, `aria-live`
in the chat, visible focus rings, `sr-only` labels on icon buttons, checkbox chips built on
real checkboxes (work with keyboard and without JavaScript).

---

## 16. Scripts

### `npm run seed` — `scripts/seed.ts`

1. Deletes **only demo data**: users with `@demo.test` emails and everything linked to
   them (agencies, their trips, bookings, messages, interests, plans, requests, reports,
   notifications). Also removes trips from an older data format (`organizer` field).
2. Creates: 1 admin, 3 agencies (2 approved, 1 pending), 1 demo traveller + 10
   travellers with personalities, 8 upcoming trips + 1 past trip, bookings (mix of paid
   and unpaid), group chat messages, interests, 5 travel plans, 3 buddy requests,
   1 open report, sample notifications.
3. Trip dates are relative to today, so demo trips are always in the future.

Real accounts are never touched, so it's safe on a database with real data.

### `npm run make-admin -- email` — `scripts/make-admin.ts`

Sets `role: admin` and `status: active` on an existing account. Refuses agency accounts.

Both use `tsx --env-file=.env.local`, and import the same models as the app via the `@/`
path alias.

---

## 17. Security model

**What's protected, and how**

| Threat | Protection |
|---|---|
| Stolen passwords from the DB | bcrypt hashes; `passwordHash` excluded from queries by default |
| Forged login cookie | HS256 signature with `SESSION_SECRET` |
| Cookie theft via XSS | `httpOnly` cookie; React escapes all rendered text |
| Suspended/demoted user keeps access | DAL reloads the user from the DB on every request |
| Calling admin/agency actions directly | Every action checks role and ownership itself |
| Open redirect after login | `safeNext()` allows relative paths only |
| Regex injection in search | User input escaped before building `RegExp` |
| Invalid IDs crashing queries | `ID_RE` / `ObjectId.isValid` checks |
| Cross-site form posts (CSRF) | `sameSite=lax` cookie + Next.js checks the Origin header on Server Actions |
| Server code leaking to browser | `import "server-only"` makes the build fail |
| Personal data exposure | First names only in groups/plans; contact details only for accepted buddies and the trip's agency; emergency contacts never shown to other travellers |
| Double booking | Partial unique index + count-after-insert guard |

**Not handled yet (do before launch):** rate limiting on login/register/chat, email
verification, password reset, CAPTCHA on sign-up, audit log of admin actions, pagination
beyond 100 rows, file uploads (none yet), content moderation of chat.

---

## 18. Known limitations

- **Payments:** no gateway. Bookings start `unpaid`; agencies mark them paid manually.
- **Chat:** polling every 4 s, last 200 messages, text only.
- **Verification:** OTP, email and ID checks aren't built; flags stay false.
- **Notifications:** in-app only.
- **Lists:** admin lists cap at 100 rows; no pagination.
- **Images:** trips have placeholder covers; no uploads.
- **Pages missing:** Forgot password, Terms, Privacy (links exist, pages don't).
- **Companion platform:** not started.
- **"Keep me signed in"** checkbox on login does nothing (sessions are always 7 days).
- **Tests:** end-to-end tests were run by hand with Playwright during development; there's
  no committed test suite or CI yet.

---

## 19. How to… (recipes)

**Add a page** — create `src/app/<path>/page.tsx` as an async Server Component. Call
`requireUser()`/`requireRole()` if it's private. Fetch through a function in
`lib/<area>/queries.ts` that returns plain objects.

**Add a form** — write a `"use server"` action returning `ActionState` (validate with
`form-utils.ts`, check auth, write, `revalidatePath`), then a client component with
`useActionState` following §14.

**Add a field to a model** — add it to the schema in `lib/db/models/…`, include it in the
DTO type (`trips/types.ts` or the area's queries file) and the query that builds it, then
the form and the action's validation. MongoDB needs no migration; old documents simply
don't have the field (handle `undefined`).

**Send a new notification** — call `notify(userId, { title, body, href })` inside the action.

**Change the colors** — edit the variables in `src/app/globals.css` (both light and dark).

**Rename the product** — `siteConfig.name` in `src/lib/site-config.ts`.

**Add online payments (Razorpay)** — in `bookTrip()`, create an order and return its ID
instead of confirming immediately; confirm the booking (`paymentStatus: "paid"`) in a new
route handler that verifies Razorpay's webhook signature. Keep the seat-count guard.

**Make chat real-time** — keep `listMessages()`/`sendMessage()`. After saving in
`sendMessage()`, publish to Pusher/Ably/Socket.IO; in `group-chat.tsx` subscribe instead
of polling (keep polling as a fallback).

**Add the Companion platform** — `src/app/companion/`, `src/components/companion/`,
`src/lib/companion/`, reusing `lib/db` (same `users`), `lib/auth` and `notify()`.

**Deploy** — MongoDB Atlas for the database, Vercel (or any Node host) for the app. Set
`MONGODB_URI` and a new `SESSION_SECRET` in the host's environment settings, then run
`npm run make-admin` against the production database once.

---

## 20. Glossary

| Term | Meaning here |
|---|---|
| **App Router** | Next.js routing where folders in `src/app` become URLs. |
| **Server Component** | Component rendered on the server; can read the DB; ships no JS for itself. |
| **Client Component** | `"use client"` component that also runs in the browser, for interactivity. |
| **Server Action** | `"use server"` function called by a form; runs on the server. |
| **Route group** | `(name)` folder: shares a layout, not part of the URL. |
| **DAL** | Data access layer — `lib/auth/dal.ts`, the single place that answers "who is this?". |
| **DTO** | Plain, serializable object returned by queries for components. |
| **Revalidate** | Tell Next.js to re-render pages so they show fresh data. |
| **Slug** | URL-friendly trip ID, e.g. `manali-manali-weekend-escape`. |
| **Populate** | Mongoose's join: replace an ID with the referenced document. |
| **Partial unique index** | Unique only for documents matching a filter (confirmed bookings). |
| **Dice coefficient** | Overlap score between two sets, used for match %. |
| **System message** | Automatic chat message (joined, left, cancelled). |
| **Upheld report** | Admin agreed with a report; lowers the reported user's trust score. |
