# tailor me

Project context for Claude Code. Read this before making changes. It records the decisions made while designing the prototype in Claude (8 Oct 2026).

## What it is

A Sydney marketplace that connects people with local tailors and seamstresses for **everyday alterations and repairs**: hems, take-in/let-out, zips and buttons, mending, jeans, school/work uniforms, curtains, same-day express. Modelled loosely on hipages, but for tailoring.

**Positioning:** "Your own tailor, from $14." Affordable luxury: a splurge people can afford. The *experience* feels premium. The *work* is simple and cheap.

**Not for:** bridal, made-to-measure, bespoke or luxury work. That belongs to Soraya Tailoring (high-end, partner business). tailor me must not compete with it. Soraya will send its low-value/simple overflow jobs to tailor me.

## Business model (decided)

- **Tailors:** $10/month membership, called **the tailor me Club**. No lead fees. No commission. Unlimited quotes.
- **Customers:** posting a job is free. A flat **$5 booking fee per job** (not per item) is charged only when the customer **accepts a quote**.
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
- **Voice:** plain, warm, like a person. "Your own tailor, from $14." Never "Uber for tailors" or "on-demand alteration marketplace".
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
- Who can quote, see a job, book, review; contact details only after the $5 is paid: `src/lib/rules.ts` (pure, unit tested).
- "ABN checked" badge only when `abnStatus = CHECKED` (ABN Lookup or an admin on `/admin`). Never add a stronger badge.
- Reviews: created only through `leaveReview` against a paid booking. There is no update path for reviews anywhere, including admin. Keep it that way.
- Only Club members (`clubStatus = ACTIVE`) are listed publicly, get job alerts, see job photos and can quote. Max three quotes per job.
- Sample data (`isSample`) is dev-only; the seed refuses to run in production, and a banner shows while any exists.

Payments: `PAYMENTS_MODE=simulate` gives a fake checkout page and only works when `APP_URL` is localhost. Production uses Stripe Checkout for the $5 fee and Stripe Billing for the Club, synced by `/api/stripe/webhook`. Booking confirmation is idempotent (`src/lib/bookings.ts`).

Not built yet: real email (`src/lib/notify.ts` only logs), cloud photo storage (`src/lib/storage.ts` writes to disk), in-app messaging, tailor portfolio photos, password reset, suburb SEO pages.

## Next steps (not yet done)

1. ~~Turn the prototype into a real app~~ Done (v1, see "The app"). Remaining before launch: email provider, S3/R2 photo storage, password reset, Stripe live keys and webhook, ABN Lookup GUID.
2. Consider reusing the Spotfinder codebase (marketplace with Stripe and commission logic already built).
3. Suburb SEO landing pages ("Trouser hems in Marrickville from $15"). This is the main growth channel.
4. Plain-English terms of use for customers and tailors (introductions only, no liability for work). Get legal review.
5. One-page agreement with Soraya Tailoring: what it sends, what it gets, who owns the customer, how it's listed, exit terms. Confirm Rabie is comfortable with Soraya's subcontractors listing on tailor me.
6. Pilot: 10–15 tailors in 3–4 suburbs, jobs routed by hand, then build.

## Known risks

- Low revenue ceiling ($10/month + $5/booking) means volume is everything. Go dense in a few suburbs first.
- Repeat customers may go direct to the tailor to skip the $5.
- The brand promises an experience the tailors must deliver. Keep the luxury in what tailor me controls: booking, messages, fit profile, the four standards.
- Competitors: Google Maps "alterations near me", Airtasker (lists tailoring in Sydney).
