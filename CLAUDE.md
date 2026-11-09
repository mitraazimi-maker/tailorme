# tailor me

Project context for Claude Code. Read this before making changes. It records the decisions made while designing the prototype in Claude (8 Oct 2026).

## What it is

A Sydney marketplace that connects people with local tailors and seamstresses for **everyday alterations and repairs**: hems, take-in/let-out, zips and buttons, mending, jeans, school/work uniforms, curtains, same-day express. Modelled loosely on hipages, but for tailoring.

**Positioning:** "Your own tailor, at your door." (changed 2 Nov 2026 from "Your own tailor, from $14.") Affordable luxury: the *experience* feels premium, led by home visits (tailor me at home). The *work* is simple and cheap.

**Customer-facing pages** (decided 2 Nov 2026): the home page, search results and tailor profiles show **no price structure** (no Club prices, no price guide or "from $X"; a tailor's own service list on their profile is the exception). Saying booking is free is fine. Marketing copy doesn't dwell on dealing with the tailor separately; the legally required notices (rule 3 acknowledgement, rule 4 notice on booking, profiles and footer) stay.

**Not for:** bridal, made-to-measure, bespoke or luxury work. That belongs to Soraya Tailoring (high-end, partner business). tailor me must not compete with it. Soraya will send its low-value/simple overflow jobs to tailor me.

## Business model (decided)

- **Tailors pay, customers don't** (decided 9 Nov 2026; replaces the $10 Club, $29 Club Plus, the 15%/min $5 customer booking fee, the flat $5 rebook fee and customer rewards). The **tailor me Club** has three tiers, each including a number of **jobs won** a month:
  - **Starter $29/month:** 5 jobs. **Pro $59/month:** 10 jobs. **Busy $149/month:** 25 jobs. **Studio $249/month:** 50 jobs. **Unlimited $299/month**: unlimited jobs, plus Featured first in search (always labelled "Featured" and disclosed as paid placement), a **15-minute head start** on new matching jobs, and a portfolio gallery (up to 12 photos).
  - A job is used **only when a customer books the tailor**, never for a quote that loses. Quotes are unlimited while the tailor has jobs left.
  - **Rebooks are free**: a booking from a customer who booked that tailor through tailor me before never uses a job (otherwise tailors would take regulars off the app).
  - **Unused jobs roll over for one month**, then expire. When a tailor runs out, they can't send new quotes until the 1st (Sydney time) or until they upgrade, which takes effect at once. Quotes already sent can still be booked; customers are never blocked.
- **Customers:** posting and booking are **free**. Accepting a quote books the tailor straight away and shares contact details.
- **Repeat bookings:** rebooking a tailor the customer has already booked goes only to that tailor (they can open it to others), and is free for both sides.
- **Off-app bookings** (decided 1 Nov 2026): a tailor found booking an introduced customer outside tailor me (to avoid using a job) is **suspended from the Club for 6 months**. Found = a customer report an admin upholds. Admins can warn instead.
- **Pickup, delivery & home fitting** (decided 1 Nov 2026): tailors may offer it at their own price, within their own radius. A **free fitting at home is always included, at pickup only**: the tailor pins the garment on the customer when collecting it; delivery is a drop-off with no second fitting. It is the tailor's service, paid to the tailor; tailor me takes nothing from it. tailor me does not move garments (batched courier days are a later pilot).
- **"tailor me at home"** (decided 2 Nov 2026) is the concierge name for the pickup service, and the site leads with it as the premium experience. Only tailors who offer it visit, so copy always says "tailors who visit" or similar, never that every tailor comes to you (ACL misleading-conduct risk). Names and lines live in `src/lib/pickup.ts`.
- Customers pay the tailor **directly** for the work. Payment for the work does not run through the platform.
- **Introductions only.** tailor me is not a party to the agreement between customer and tailor and is not responsible for disputes, damaged garments or the work itself. Tailors are independent businesses.
- Tailors **will not** be required to hold public liability insurance. Tailors want simplicity.

## Hard product rules

1. **Every job must include at least one photo.** Posting is blocked without one. Also require a short written description.
2. **Quote disclaimer shown wherever a price or quote appears:**
   "Quotes are a guide only. The tailor must inspect the garment and how it is made before confirming the final price."
3. **Customer must tick an acknowledgement before posting:** quotes are a guide only, the final price is confirmed after inspection, and the work and payment are arranged directly with the tailor, not tailor me.
4. **Introduction-service notice** on booking, profiles and footer:
   "tailor me introduces you to independent tailors. Any agreement, the work and payment are between you and the tailor. tailor me is not a party to that agreement."
5. **Never claim what isn't checked.** Use "ABN checked" (verify via ABN Lookup). Do not use "Verified", "Trusted", "Guaranteed" or similar. These imply vouching for work quality (Australian Consumer Law misleading-conduct risk).
6. **Reviews only from customers who booked through tailor me.** Never write or edit reviews.

## The tailor me standard (Club members agree to)

- A reply within two hours (during opening hours) with a guide price and ready date
- Ready when promised, or a message before the day
- Pressed and ready to wear on pickup
- Remembers your fit: measurements and past jobs saved so rebooking is one tap

Keep it to these four. Tailors want simplicity.

## Brand

- **Name:** "tailor me". Always **lowercase, two words**, everywhere (site, signage, invoices, social). Never "TailorMe" or "Tailor Me". CamelCase reads as dated.
- **Wordmark:** "tailor" upright + *me* in italic brass, set in Bodoni Moda. **No icon next to the wordmark.** Square icon (favicon/app/social) = italic brass *me* on a dark ground. Never a "tm" monogram (reads as ™).
- **Primary CTA label:** "tailor *me*" (wordmark in the button), with an aria-label describing the action.
- **Signature motif:** brass measuring tape (cm ticks). Used as a page divider and as the job-form progress bar. It is the brand pattern, not a logo.
- **Voice:** plain, warm, like a person. "Your own tailor, at your door." Never "Uber for tailors" or "on-demand alteration marketplace".
- **Photography:** real tailors' hands, pins, chalk, real local shops. No flat illustrations, gradients or mascots.
- The business name is registered. Still to do: tailorme.com.au domain, IP Australia trademark (classes 35 and 40, file the logo design too), @tailorme social handles.

## Design system (current)

Based on Refero's "warm cream editorial / quiet luxury" reference (styles.refero.design, ElevenLabs entry).

- **Colours (light):** canvas `#FDFCFC`, band/feature `#F5F3F1`, card `#FFFFFF`, ink `#0C0A08`, secondary text `#44403B`, muted `#777169`, hairline `#EBE8E4`, brass `#B08A52`.
- **Colours (dark):** canvas `#11100E`, band `#1B1917`, card `#1F1D1A`, ink `#F5F3F1`, secondary `#CFC9C1`, hairline `#2E2B27`, brass `#C9A46C`.
- **Type:** headings Inter Tight 300, tracking −0.02em, line-height ~1.08. Body Inter 400/500, 16px. Labels Geist Mono. **Bodoni Moda only for the wordmark, the brand button and large italic accent words** (e.g. *from $14.*). It is beautiful but hard to read small. Never use it for body or small headings.
- **Shape:** pill buttons, chips and search bar (9999px). Cards 20px, big panels 24px. Whisper shadows, 1px hairlines, no heavy shadows.
- **Brass is the only accent:** wordmark *me*, hero price, measuring tape. Everything else is neutral.
- Fabric-pattern swatches (CSS gradients) stand in for photos and are desaturated.
- Must support light and dark mode and work at 400px phone width.

## The app

Next.js 15 + Prisma/Postgres + Stripe. See `README.md` for setup and layout. The original single-file prototype lives in `prototype/index.html` as the design reference; `src/app/globals.css` is ported from it.

Where the hard rules live in code. Keep them there, not scattered:
- Verbatim disclaimer, introduction notice and acknowledgement text: `src/lib/catalog.ts` (a unit test pins the wording). Render with `<Disclaimer />` and `<IntroNote />` from `src/components/ui.tsx`.
- Photo + description + acknowledgement required to post: `src/app/api/jobs/route.ts` (server-side; the wizard only mirrors it). Photo types are checked by magic bytes.
- Who can quote, see a job, book, review; contact details only once the customer books: `src/lib/rules.ts` (pure, unit tested).
- "ABN checked" badge only when `abnStatus = CHECKED` (ABN Lookup or an admin on `/admin`). Never add a stronger badge.
- Reviews: created only through `leaveReview` against a paid booking. There is no update path for reviews anywhere, including admin. Keep it that way.
- Only Club members (`clubStatus = ACTIVE`) are listed publicly, get job alerts, see job photos and can quote. Max three quotes per job.
- Club tiers and jobs: prices, allowances, Sydney months and rollover are in `src/lib/plans.ts` (pure, unit tested); `creditsForTailor()` in `src/lib/credits.ts` counts new (non-repeat) bookings won per month. `canQuote()` takes the tailor's credits and refuses new quotes when none are left, except on the tailor's own rebook. Booking is `bookQuote()` in `src/lib/bookings.ts`, which sets `isRepeat`. `clubSince` stops months before joining from rolling over.
- Unlimited: `isUnlimited()` and the head start (`visibleFrom`) live in `src/lib/rules.ts`. The head start only applies when an Unlimited member actually matches the job (`Job.openToAllAt`, set in `src/lib/alerts.ts`); otherwise everyone sees it at once. Unlimited members are alerted on posting; the other tiers by `/api/cron/notify` once `openToAllAt` passes. "Featured" only reorders the default "Best match" sort; an explicit sort the customer picks is respected. Never show Featured without the label.
- No contact details before a booking is made: `src/lib/contact-filter.ts` (unit tested) blocks phone numbers, emails, websites and social handles in job descriptions, quote messages, profile name/intro/hours, prices and portfolio captions. Apply it to any new field shown before booking.
- Rebook: `/post?tailor=<slug>&rebook=1`. Only counts if the customer has booked that tailor before (`bookedTailorIds` in `src/lib/bookings.ts`, checked server-side). Exclusive jobs are hidden from other tailors in `rules.ts` and the feed query.
- Suspension: `isClubMember()` is false while `suspendedUntil` is in the future, so every Club-only check applies. Use `activeMemberWhere()` in queries, never `clubStatus: "ACTIVE"` on its own. Reports (`ConductReport`) can only be filed by a customer who booked that tailor; admins decide on `/admin`.
- Pickup: who collects where is `picksUpFrom()` in `src/lib/pickup.ts` (unit tested); the home-fitting wording is `HOME_FITTING` there. A quote carries the tailor's `pickupFeeCents` only when the customer asked (`Job.wantsPickup`) and the tailor offers it. The pickup note goes through the contact filter.
- Fit record (decided 2 Nov 2026): the tailor of a live booking records measurements and notes after the fitting (`recordFit`, one `FitRecord` per booking, they can correct their own). It belongs to the customer: they see and can delete every entry on `/jobs/profile` but can't edit a tailor's. Every tailor the customer has booked sees the whole record, from all tailors. Rules and the per-garment measurement lists are in `src/lib/fit.ts` (unit tested); fit notes go through the contact filter. The prompt is optional; never make it block marking a job done.
- Sample data (`isSample`) is dev-only; the seed refuses to run in production, and a banner shows while any exists.

Payments: only tailors pay. `PAYMENTS_MODE=simulate` gives a fake Club checkout page and only works when `APP_URL` is localhost. Production uses Stripe Billing for the three tiers (`STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSY_PRICE_ID`, `STRIPE_STUDIO_PRICE_ID`, `STRIPE_UNLIMITED_PRICE_ID`; tier comes from the subscription price), synced by `/api/stripe/webhook`. Booking is free and idempotent (`bookQuote` in `src/lib/bookings.ts`).

Not built yet: real email (`src/lib/notify.ts` only logs), cloud photo storage (`src/lib/storage.ts` writes to disk), in-app messaging, password reset, suburb SEO pages.

## Next steps (not yet done)

1. ~~Turn the prototype into a real app~~ Done (v1, see "The app"). Remaining before launch: email provider, S3/R2 photo storage, password reset, Stripe live keys, the three tier prices and the webhook, ABN Lookup GUID.
2. Consider reusing the Spotfinder codebase (marketplace with Stripe and commission logic already built).
3. Suburb SEO landing pages ("Trouser hems in Marrickville from $15"). This is the main growth channel.
4. Plain-English terms of use for customers and tailors (introductions only, no liability for work). Get legal review. Include the non-circumvention section drafted in `docs/club-terms-non-circumvention-draft.md`.
5. One-page agreement with Soraya Tailoring: what it sends, what it gets, who owns the customer, how it's listed, exit terms. Confirm Rabie is comfortable with Soraya's subcontractors listing on tailor me.
6. Pilot: 10–15 tailors in 3–4 suburbs, jobs routed by hand, then build.

## Known risks

- Revenue is memberships only ($29–299 per tailor a month), so it's capped by how many tailors pay, and tailors only stay if the jobs come. Before there's demand, a tailor paying $29 who wins 1 job will churn. Go dense in a few suburbs first and consider free months for pilot tailors.
- With no customer fee, customers have no reason to go direct; the risk moves to tailors taking new customers off-app before booking (to save a job). Defences: free rebooks, exclusive rebooks, contact details blocked before booking, "Booked N times through tailor me" on profiles, and a draft Club terms clause (`docs/club-terms-non-circumvention-draft.md`, needs legal review). None of it stops a determined customer; it removes the reasons to bother.
- The brand promises an experience the tailors must deliver. Keep the luxury in what tailor me controls: booking, messages, fit profile, the four standards.
- Competitors: Google Maps "alterations near me", Airtasker (lists tailoring in Sydney).
