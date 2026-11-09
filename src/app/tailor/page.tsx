import Link from "next/link";
import { buyExtraJobs, changeTier, featuredInSuburb, joinClub, joinFeatured, manageBilling, stopFeatured } from "@/app/actions/tailor";
import { Status } from "@/components/ui";
import { requireTailor } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/fabric";
import { paymentsMode } from "@/lib/payments";
import { CreditsMeter, ExtraJobsForm, FeaturedCard, PlanCards } from "@/components/plans";
import { creditsForTailor } from "@/lib/credits";
import { PLANS, cheapestFor, featuredSpotsLeft, hasCredit, money0, planPriceLabel, resetLabel } from "@/lib/plans";
import { isClubMember, isFeatured, isSuspended } from "@/lib/rules";
import { TailorTabs } from "./TailorTabs";

export const metadata = { title: "Tailor dashboard" };

export default async function TailorHome({ searchParams }: { searchParams: Promise<{ club?: string; tier?: string; featured?: string; extras?: string; error?: string }> }) {
  const { tailor } = await requireTailor();
  const { club, tier, featured, extras, error } = await searchParams;
  const [services, quotes, bookings] = await Promise.all([
    db.service.count({ where: { tailorId: tailor.id } }),
    db.quote.findMany({ where: { tailorId: tailor.id, status: "PENDING" }, include: { job: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.booking.findMany({
      where: { tailorId: tailor.id, status: { in: ["CONFIRMED", "COMPLETED"] } },
      include: { job: true, customer: { select: { firstName: true } }, quote: true },
      orderBy: { bookedAt: "desc" },
      take: 20,
    }),
  ]);
  const todo = [
    !tailor.categories.length && "Choose the services you offer",
    !services && "Add your prices",
    !tailor.bio && "Write a short intro",
    !tailor.abn && "Add your ABN",
  ].filter(Boolean) as string[];
  const member = isClubMember(tailor);
  const suspended = isSuspended(tailor);
  const credits = member ? await creditsForTailor(tailor) : null;
  const spots = featuredSpotsLeft(await featuredInSuburb(tailor.suburb, tailor.id));
  // Bought extras two months running? Say which plan would be cheaper.
  const better = credits && credits.extras > 0 ? cheapestFor(credits.used) : null;
  const warnings = await db.conductReport.findMany({ where: { tailorId: tailor.id, status: "WARNED" }, orderBy: { resolvedAt: "desc" }, take: 3 });

  return (
    <div className="wrap page">
      <TailorTabs current="/tailor" />
      <div className="page-head"><h1>{tailor.businessName}</h1><Link className="btn btn-ghost btn-sm" href={`/tailors/${tailor.slug}`}>View public profile</Link></div>
      {club && <p className="notice ok" style={{ marginBottom: 16 }}>Welcome to the tailor me Club. It can take a moment for your membership to show as active.</p>}
      {suspended && (
        <div className="notice bad" role="alert" style={{ marginBottom: 16 }}>
          <b style={{ color: "var(--ink)" }}>Your Club membership is suspended until {tailor.suspendedUntil!.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.</b>{" "}
          You’re hidden from search and can’t quote on new jobs. Bookings you already have still stand.
          {tailor.suspensionReason && <div style={{ marginTop: 6 }}>Reason: {tailor.suspensionReason}</div>}
        </div>
      )}
      {!suspended && warnings.length > 0 && (
        <div className="notice bad" style={{ marginBottom: 16 }}>
          <b style={{ color: "var(--ink)" }}>Warning on your account:</b> {warnings[0].adminNote} A further upheld report of booking customers outside tailor me means a 6-month suspension.
        </div>
      )}
      {error && <p className="notice bad" role="alert" style={{ marginBottom: 16 }}>{error}</p>}
      {tier && member && <p className="notice ok" style={{ marginBottom: 16 }}>You’re on {PLANS[tailor.clubTier].name} at {planPriceLabel(tailor.clubTier)}.</p>}
      {featured === "1" && isFeatured(tailor) && <p className="notice ok" style={{ marginBottom: 16 }}>You’re Featured. You show first in search in your area and get first look at new jobs.</p>}
      {featured === "stopped" && <p className="notice ok" style={{ marginBottom: 16 }}>Featured is off.</p>}
      {featured === "ending" && <p className="notice ok" style={{ marginBottom: 16 }}>Featured will stop at the end of the month you’ve paid for.</p>}
      {extras && <p className="notice ok" style={{ marginBottom: 16 }}>Extra jobs added. They’re yours until {resetLabel()}.</p>}
      {credits && !hasCredit(credits) && (
        <div className="notice bad" role="alert" style={{ marginBottom: 16 }}>
          <b style={{ color: "var(--ink)" }}>You’ve used this month’s jobs.</b> Buy extra jobs or move up a plan to keep quoting now, or wait until {resetLabel()}. Rebooks from your own customers are always free, and quotes you’ve already sent can still be booked.
        </div>
      )}

      <div className="detail-grid">
        <div className="stack">
          {member && (
            <div className="notice">
              <b style={{ color: "var(--ink)" }}>Keep your regulars booking through tailor me.</b> When a past customer rebooks you here it’s free
              for them and doesn’t use one of your monthly jobs. The job comes only to you, and every booking adds to your reviews and your “Booked through tailor me” count.
              Point them to <Link className="link" href={`/tailors/${tailor.slug}`}>your profile</Link> and the Rebook button.
            </div>
          )}
          {todo.length > 0 && (
            <div className="panel">
              <h2>Finish your profile</h2>
              <ul className="std-list">{todo.map((t) => <li key={t}><Link className="link" href="/tailor/profile">{t}</Link></li>)}</ul>
            </div>
          )}
          <div className="panel">
            <div className="row-wrap" style={{ justifyContent: "space-between" }}><h2>Your bookings</h2><Link className="link small" href="/tailor/jobs">Find new jobs →</Link></div>
            {bookings.length === 0 ? <p className="muted">No bookings yet.</p> : (
              <div className="joblist">
                {bookings.map((b) => (
                  <Link key={b.id} className="jobrow" href={`/tailor/jobs/${b.jobId}`} style={{ gridTemplateColumns: "1fr auto" }}>
                    <div>
                      <div className="eyebrow">Job {b.job.ref} · {b.customer.firstName} · {b.job.suburb}</div>
                      <h3>{b.job.work} · {b.job.garment}</h3>
                      <div className="small muted">Guide {money(b.quote.priceCents)} · ready {b.quote.readyBy.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</div>
                    </div>
                    <Status s={b.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="panel">
            <h2>Quotes waiting on the customer</h2>
            {quotes.length === 0 ? <p className="muted">None right now.</p> : (
              <div className="joblist">
                {quotes.map((q) => (
                  <Link key={q.id} className="jobrow" href={`/tailor/jobs/${q.jobId}`} style={{ gridTemplateColumns: "1fr auto" }}>
                    <div><div className="eyebrow">Job {q.job.ref} · {q.job.suburb}</div><h3>{q.job.work} · {q.job.garment}</h3></div>
                    <b className="num mono">{money(q.priceCents)}</b>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        <aside className="panel stack">
          <div className="eyebrow" style={{ color: "var(--tape)" }}>The tailor me Club</div>
          <div className="row-wrap" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>{member ? PLANS[tailor.clubTier].name : "Not a member yet"}</h2>
            <Status s={tailor.clubStatus} label={tailor.clubStatus === "NONE" ? "inactive" : undefined} />
          </div>
          {member && (
            <p className="muted small">
              {planPriceLabel(tailor.clubTier)}. Customers book you for free; you never pay commission or per quote.
              {tailor.clubRenewsAt && ` Renews ${tailor.clubRenewsAt.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}.`}
            </p>
          )}
          {credits && <CreditsMeter credits={credits} />}
          {credits && <ExtraJobsForm action={buyExtraJobs} />}
          {better && better.tier !== tailor.clubTier && PLANS[better.tier].priceCents > PLANS[tailor.clubTier].priceCents && (
            <p className="notice small">At {credits!.used} jobs a month, {PLANS[better.tier].name} ({money0(PLANS[better.tier].priceCents)}) costs less than your plan plus extra jobs.</p>
          )}
          {!member && !suspended && (
            <>
              <p className="muted small">Join to appear in search, see job photos and quote. Quote as often as you like: a job is used only when a customer books you, and rebooks are free. Unused jobs roll over for a month.</p>
              {tailor.clubStatus === "PAST_DUE" && <p className="notice bad">Your last payment didn’t go through. Update your card to stay listed.</p>}
            </>
          )}
          {!suspended && <PlanCards current={member ? tailor.clubTier : null} action={member ? changeTier : joinClub} verb={member ? "switch" : "join"} />}
          {member && <span className="small muted">Switching takes effect straight away; the price difference is prorated.</span>}
          {!suspended && (
            <FeaturedCard active={isFeatured(tailor)} renewsAt={tailor.featuredRenewsAt} spotsLeft={spots} suburb={tailor.suburb} join={joinFeatured} stop={stopFeatured} canJoin={member} />
          )}
          {member && paymentsMode() === "stripe" && tailor.stripeCustomerId && <form action={manageBilling}><button className="btn btn-ghost btn-sm">Manage billing</button></form>}
          <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%" }} />
          <b>The tailor me standard</b>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
            <li>A reply within two hours (in opening hours) with a guide price and ready date</li>
            <li>Ready when promised, or a message before the day</li>
            <li>Pressed and ready to wear on pickup</li>
            <li>Remember your customer’s fit</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
