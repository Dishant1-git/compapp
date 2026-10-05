# CompApp

One Next.js app for two platforms, both backed by one shared MongoDB database:

- **Stranger Trips** (`/trips`): book group trips with new people, find travel buddies
- **Companion** (`/companion`): find someone to go with (sign-up and profiles built; matching next)

For a deep dive into how everything works, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Getting started

Requires Node 22.13+ and MongoDB (local or Atlas).

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

## Deploying

The app is one Node server (`next start`). Host it somewhere that runs a long-lived Node
process with the full `node_modules` folder: a VPS, Render, Railway, Fly.io or similar.
Serverless hosts are a poor fit, because Companion's photo checks load TensorFlow models
from `node_modules` at runtime and keep them in memory. Give the server at least 1 GB of RAM.

```bash
npm ci
npm run build
npm start            # listens on PORT (default 3000)
```

Requires Node 22.13 or newer. Put HTTPS in front of it (the host's own, or nginx/Caddy):
the login cookie is only sent over HTTPS in production. If you use nginx, allow uploads of
5 MB (`client_max_body_size 5m;`).

**Settings** (set them in the host's environment; `.env.example` describes each one):

| Setting | Needed for |
|---|---|
| `MONGODB_URI`, `SESSION_SECRET` | Required. The server refuses to start without them. Use a hosted database such as MongoDB Atlas, and a new secret for production. |
| `APP_URL` | Links in emails, e.g. `https://example.com`. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payments. Live keys (`rzp_live_…`) to collect real money. |
| `RAZORPAY_WEBHOOK_SECRET` | Confirming payments when the payer closes the tab. In the Razorpay dashboard add a webhook to `https://<domain>/api/payments/razorpay/webhook` for `payment.captured`. |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | Verification emails. Authorise the server's IP in Brevo (Security > Authorised IPs). |
| One SMS provider (`TWILIO_…`, `MSG91_…` or `FAST2SMS_API_KEY`) | Phone sign-in and Companion sign-up. |

On start-up the server logs a `[config]` warning for each optional setting that is missing.

### Frontend on Vercel, backend on Render

The same code can be deployed twice: once as the **backend** (database, payments, email,
logins) and once as the **frontend**, which only renders pages and asks the backend for
everything else. How it works is described at the top of `src/lib/remote.ts`.

1. **Backend on Render**: New > Blueprint > this repository (`render.yaml`). Fill in the
   settings from the table above, plus `BACKEND_SECRET` (a long random password). Set
   `APP_URL` to the Vercel address, since that is where visitors are.
2. **Frontend on Vercel**: import the repository and set only these four, then deploy:

   | Setting | Value |
   |---|---|
   | `BACKEND_URL` | The Render address, e.g. `https://compapp.onrender.com` |
   | `BACKEND_SECRET` | The same value as on Render |
   | `SESSION_SECRET` | The same value as on Render (copy it from Render's Environment tab) |
   | `APP_URL` | The Vercel address |

   `BACKEND_URL` is read when the site is built, so redeploy after changing it.
3. Point the Razorpay webhook at either address: `/api/*` on Vercel is passed to Render.

Every page view makes a few calls from Vercel to Render, so pick regions close to each
other (Render `singapore` with Vercel `sin1` or `bom1`). Render's free plan sleeps when idle
and makes the first page after a pause very slow; use a paid plan.

When you add a new data function or Server Action, run `node scripts/add-remote-guards.mjs`
so it works in the split too.

**After the first deploy**

1. Don't run `npm run seed` against the production database: it creates demo accounts with a known password.
2. Register your own account on the site, then make it an admin: `npm run make-admin -- you@example.com` (run with the production `MONGODB_URI`).
3. Set `support.email` in `src/lib/site-config.ts`; it appears on `/terms`, `/privacy` and `/refunds`.
4. Point your host's health check at `/api/health` (200 when the database is reachable).

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
| `/agency/billing` | Buy trips to publish: single trip, monthly or annual plan. Shows trips left and past plans. |
| `/trips/[slug]/book` | Reserve a seat: solo or a group of 3+, trip rules and consent, then pay the seat fee. |
| `/trips/[slug]/verify-age` | After paying: upload a photo ID so an admin can check ages. |
| `/admin` | Overview, then Agencies, Users, Trips, Bookings, Payments, Age checks and Reports. |

Rules enforced on the server: bookings need a phone number and emergency contact;
minimum age per trip; one booking per person; no overbooking; no cancelling
after departure; contact details only after a buddy request is accepted.

### Payments (Razorpay)

Prices, the refund schedule and the consent rules live in `src/lib/payments/pricing.ts`.

- **Agencies** pay to publish: ₹1,500 for one trip, ₹12,500 for 10 trips in 30 days, or
  ₹1,42,500 for 150 trips in 12 months. Each published trip uses one. One-time payments, no auto-renewal.
- **Travellers** pay a seat fee to reserve: ₹299, or ₹249 each for a group of 3 or more.
  The trip price itself is still paid to the agency, which marks it paid.
- **Age check**: after paying, the traveller uploads a photo ID (Aadhaar or another
  government ID). Solo travellers must meet the trip's minimum age (18+); a group needs
  at least 2 people aged 18+. An admin approves, asks for a new photo, or fails the check,
  which cancels the booking. ID photos are deleted once decided.
- **Refunds** of the seat fee depend on time left before departure: 100% at 7+ days,
  50% at 3 to 6 days, nothing under 3 days. A trip cancelled by the agency or an admin
  is refunded in full.

Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in `.env.local`
(see `.env.example`). Without keys, development simulates payments and no money moves;
production refuses to take payments.

**Matching**: overlap between personality tags (Dice coefficient). A trip's score is
40% the trip's vibe plus 60% the average match with people already booked
(`src/lib/trips/matching.ts`).

**Trust score**: verification + profile completeness + completed trips, minus
cancellations and upheld reports (`src/lib/trips/trust.ts`).

### Not built yet

- Paying the trip price online: only the seat fee and agency plans go through Razorpay. The trip price is paid to the agency, which marks the booking paid by hand.
- GST invoices for plans and seat fees.
- Real-time chat: the group chat polls every 4 seconds. Swap in WebSockets or Pusher when needed.
- Requiring a verified email: the link is emailed through Brevo on sign-up and from the profile pages (`src/lib/auth/email-verification.ts`), and raises the trust score, but nothing is blocked for unverified accounts yet.
- Email or push delivery of notifications (in-app only for now)

## Signing in

One account and one sign-in for everything. `/trips/**`, `/companion/**`,
`/notifications`, `/agency/**` and `/admin/**` need an account: a signed-out visitor
clicking **Explore Stranger Trips** or **Join Companion** (or opening any of those URLs)
is sent to `/login?next=<that URL>`, and comes straight back after logging in or signing
up. Switching between products never asks again.

- **`/login` and `/register`** each offer **mobile number** (6-digit code) or **email +
  password**. Links between them keep `?next=`. Already signed in? Both pages send you
  straight on.
- **New accounts** go through the product's onboarding first: Stranger Trips →
  `/trips/profile?welcome=1`, Companion → `/companion/join`. Then back to `next`.
- **No `next`:** you land on your role's home (`/trips`, `/agency` or `/admin`).
- **Safety:** `safeNext()` in `src/lib/auth/dal.ts` only allows same-site paths (no
  `//evil.com`, backslashes, whitespace, or the sign-in pages themselves).
- **Where it's enforced:** `src/proxy.ts` does a fast cookie check and redirect; the real
  checks are `requireUser()` / `requireRole()` in every layout, page and action.

## Companion

Click **Join Companion** on the home page. After signing in, onboarding is one question
per slide, saved as you go, so leaving and coming back resumes where you were:

mobile number → OTP (only if the account has no verified number yet) → birthday → look (height, body type) → location → gender →
sexual orientation → interests → drinking & smoking → photos → live selfie → profile preview → Done.

- **Accounts:** Companion needs a verified phone number. Sign up with your number and it's
  already done; sign in with email and it's added to that same account.
- **OTP:** 6 digits, valid 5 minutes, 5 tries per code, 30 s between resends, 5 texts per
  number per hour (`src/lib/auth/otp.ts`). Texts go out through Fast2SMS, MSG91 or
  Twilio, whichever has keys in `.env.local` (`src/lib/auth/sms.ts`). In development
  without one, the code is printed in the terminal and shown on screen.
- **Photos and selfie** are resized in the browser and stored in MongoDB
  (`CompanionImage`), served from `/api/companion/images/[id]`. Selfies are only visible to
  their owner and admins.
- **Selfie verification:** the selfie is taken live with the camera and a random pose, then
  compared with the profile photos on the server in a few seconds, free, with no API keys
  (face-api on TensorFlow.js/WebAssembly, `src/lib/companion/face-match.ts`). Face distance
  ≤ 0.50 is verified instantly; anything above is rejected with a reason (between 0.50 and
  0.60, tips for a clearer retake). No admin is needed; if the check itself errors, they're
  asked to try again. **`/admin/verifications`** remains as a log. The profile preview and
  `/companion` only unlock once verified. The pose isn't checked automatically.
  Thresholds live in `src/lib/companion/verification.ts`.
- **Photo moderation:** every uploaded profile photo is checked on the server before it's
  saved, free and self-hosted (`src/lib/companion/moderation.ts`): nudity (NSFWJS), possible
  minors (face-api age estimate), no clear face / no clear main person / too many people,
  face too small, and blurry, dark, washed-out, tiny or stretched images. Rejections show the
  reason. Weapons, drugs, gore, hate symbols and AI-generated images are **not** detected.
- Camera access needs `https` or `localhost`. To test on a phone, use a tunnel with https.

| Route | What it does |
|---|---|
| `/companion/join` | The onboarding slides. `?edit=1` edits a finished profile. |
| `/companion` | Your finished profile. |

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
│   ├── api/companion/images/[id]/ # Companion photos and selfies
│   ├── companion/            # Companion: /companion and /companion/join
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
│   ├── companion/            # Join-flow slides, profile card
│   └── trips/                # All Stranger Trips components
└── lib/
    ├── db/                   # Shared DB connection + Mongoose models
    ├── auth/                 # Session, DAL (requireUser, safeNext), sign-in actions, phone OTP + SMS
    ├── admin/  agency/       # queries.ts (reads) + actions.ts (writes) per area
    ├── trips/                # queries, actions, chat, cancel, matching, trust, …
    ├── companion/            # Onboarding actions, queries, moderation, selfie check
    ├── notifications.ts      # notify() + reads
    └── form-utils.ts         # Shared Server Action parsing
```

## Theming: three worlds, one brand

| World | Where | Palette | Type | Motion |
|---|---|---|---|---|
| **Midnight** (`brand`) | Landing, `/login`, `/register` | near-black, ivory, gold | Playfair Display + Manrope | cinematic: fade + blur, slow |
| **Terra** (`trips`) | `/trips/**` | sand, forest, burnt orange | DM Serif Display + DM Sans | directional: slide, image zoom |
| **Velvet** (`companion`) | `/companion/**` | plum, rose, champagne | Cormorant Garamond + Plus Jakarta Sans | soft: fade + scale |

Admin, agency and notifications keep the neutral "console" look (with dark mode).

- **Tokens:** `src/app/globals.css` holds each world's raw palette (`--brand-*`,
  `--trips-*`, `--companion-*`) and maps it onto the semantic tokens every component uses
  (`bg-primary`, `text-muted-foreground`, `bg-highlight` for the signature accent,
  `text-highlight-ink` for small accent text). Change a colour there, not in components.
- **Switching world:** a layout wraps its pages in `<Theme world="trips">`
  (`src/components/layout/theme.tsx`), which sets `data-theme` and loads that world's
  fonts (`src/lib/fonts.ts`) only on those pages.
- **Shared DNA:** one logo (`ui/logo.tsx`), pill buttons, one radius, `h1`/`h2` in the
  world's display face, `.eyebrow` labels.
- **Motion:** add `reveal` (on load) or wrap in `<Reveal>` (on scroll); the world decides
  how it moves. Everything is disabled under "reduce motion".
- **Photos:** `public/images/` (Unsplash, see `CREDITS.md`). Trips have no photos yet,
  so cards use a designed cover (`trips/trip-cover.tsx`); add a `coverImage` field to
  `Trip` to show real ones.
- **Contrast:** checked to WCAG AA. White on burnt orange fails (3.5:1), so Trips buttons
  are forest green and orange is the accent.
