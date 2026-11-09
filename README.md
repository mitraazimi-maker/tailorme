# tailor me

Sydney marketplace for everyday alterations and repairs. Customers post a job with photos, up to three local tailors send guide quotes, and the customer books one. Posting and booking are free for customers. Tailors pay for the tailor me Club by tier: Starter $29/month (5 jobs won a month), Pro $59 (15), Busy $149 (40), Studio $219 (80) or Unlimited $299 (unlimited, plus featured in search, a 15-minute head start on new jobs and a portfolio). A job is used only when a customer books the tailor; rebooks are free and unused jobs roll over one month.

Read `CLAUDE.md` first. It holds the product rules (disclaimers, "ABN checked", reviews only from bookings) that the code enforces.

## Stack

- Next.js 15 (App Router, server actions), TypeScript
- PostgreSQL via Prisma
- Stripe Billing for the Club tiers (Starter $29, Pro $59, Busy $149, Studio $219, Unlimited $299 a month)
- Email/password accounts with database sessions (bcrypt, httpOnly cookie)
- Job photos stored on local disk and served through an access-checked route

## Run it locally

```bash
cp .env.example .env          # defaults work with a local Postgres
npm install
npm run db:migrate            # creates the schema
npm run db:seed               # sample tailors from the prototype (dev only)
npm run dev
```

Seeded logins all use the password `password123`:

- Customer: `customer@example.com`
- Tailor: `linhs@example.com`, `mariams@example.com`, `ricci@example.com`, and so on

`PAYMENTS_MODE=simulate` (the default) swaps Stripe for a fake checkout page so you can test the whole loop with no keys. It only works while `APP_URL` is localhost.

To make yourself an admin (for marking ABNs as checked), put your email in `ADMIN_EMAILS` before you sign up.

## Checks

```bash
npm run typecheck
npm run lint
npm test          # rules, ABN checksum, catalogue copy, suburb distances
npm run build
```

## Going live

1. **Database:** any managed Postgres (Neon, Supabase, RDS). Set `DATABASE_URL` and run `npm run db:deploy`. Don't seed.
2. **Stripe:**
   - Create recurring monthly prices of A$29 (Starter), A$59 (Pro), A$149 (Busy), A$219 (Studio) and A$299 (Unlimited), and set `STRIPE_STARTER_PRICE_ID`, `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSY_PRICE_ID`, `STRIPE_STUDIO_PRICE_ID` and `STRIPE_UNLIMITED_PRICE_ID`. Customers pay nothing, so there is no booking checkout.
   - Set `STRIPE_SECRET_KEY` and `PAYMENTS_MODE=stripe`.
   - Add a webhook to `/api/stripe/webhook` for `checkout.session.completed` and `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`, then set `STRIPE_WEBHOOK_SECRET`.
   - Turn on the customer billing portal.
3. **Job alerts for standard Club members** go out 15 minutes after posting. Set `CRON_SECRET` and call `GET /api/cron/notify` every 5 minutes with `Authorization: Bearer <CRON_SECRET>` (Vercel Cron or any scheduler).
4. **Photos:** `src/lib/storage.ts` writes to local disk. On Vercel or any host without a persistent disk, swap it for S3/R2 before launch.
5. **Email:** `src/lib/notify.ts` only logs to the console. Wire it to Resend, Postmark or SES.
6. **ABN Lookup:** register for a free GUID and set `ABN_LOOKUP_GUID` so ABNs are checked automatically. Without it, an admin checks them on `/admin`.
7. **`APP_URL`:** set it to the public https URL.

## How the code is laid out

```
prisma/schema.prisma       data model
prisma/seed.ts             dev-only sample data
prototype/index.html       the original single-file prototype (design reference)
src/lib/catalog.ts         categories, wizard options, verbatim legal copy, guide prices
src/lib/rules.ts           who can quote / see / book / review (pure, unit tested)
src/lib/payments.ts        Stripe or simulated checkout
src/lib/bookings.ts        idempotent booking confirmation
src/lib/abn.ts             ABN checksum and ABN Lookup
src/app/post               6-step job wizard
src/app/jobs               customer: my jobs, quotes, booking, review, fit profile
src/app/tailor             tailor: dashboard, job feed, quoting, profile and prices
src/app/tailors            public search and profiles
src/app/admin              ABN checks
src/app/api                job upload, private photos, Stripe webhook
```

## Browser checks

`e2e/` holds end-to-end checks that drive the app in Chromium (Playwright): pricing and jobs (`plans.mjs`), the job form (`post.mjs`), the fit record (`fit.mjs`) and the product rules (`rules.mjs`). With the app running on :3000 (`npm run build && npm start`), run `npm run e2e`. Each file reseeds the sample data first. Screenshots land in `e2e/shots/` (ignored by git).
