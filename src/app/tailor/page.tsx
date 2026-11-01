import Link from "next/link";
import { changeTier, joinClub, manageBilling } from "@/app/actions/tailor";
import { Status } from "@/components/ui";
import { requireTailor } from "@/lib/auth";
import { db } from "@/lib/db";
import { money } from "@/lib/fabric";
import { paymentsMode } from "@/lib/payments";
import { HEAD_START_MINUTES, MAX_PORTFOLIO_PHOTOS } from "@/lib/catalog";
import { isClubMember, isPlus, isSuspended } from "@/lib/rules";
import { TailorTabs } from "./TailorTabs";

export const metadata = { title: "Tailor dashboard" };

export default async function TailorHome({ searchParams }: { searchParams: Promise<{ club?: string; tier?: string }> }) {
  const { tailor } = await requireTailor();
  const { club, tier } = await searchParams;
  const [services, quotes, bookings] = await Promise.all([
    db.service.count({ where: { tailorId: tailor.id } }),
    db.quote.findMany({ where: { tailorId: tailor.id, status: "PENDING" }, include: { job: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.booking.findMany({
      where: { tailorId: tailor.id, status: { in: ["CONFIRMED", "COMPLETED"] } },
      include: { job: true, customer: { select: { firstName: true } }, quote: true },
      orderBy: { paidAt: "desc" },
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
  const plus = isPlus(tailor);
  const suspended = isSuspended(tailor);
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
      {tier === "plus" && <p className="notice ok" style={{ marginBottom: 16 }}>You’re on Club Plus. You’re now featured in search and get first look at new jobs.</p>}
      {tier === "club" && <p className="notice ok" style={{ marginBottom: 16 }}>You’re back on Club at $10/month.</p>}

      <div className="detail-grid">
        <div className="stack">
          {member && (
            <div className="notice">
              <b style={{ color: "var(--ink)" }}>Keep your regulars booking through tailor me.</b> When a past customer rebooks you here it costs
              them a flat $5, the job comes only to you, and every booking adds to your reviews and your “Booked through tailor me” count.
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
            <h2 style={{ margin: 0 }}>{plus ? "Club Plus" : member ? "Club" : "Not a member yet"}</h2>
            <Status s={tailor.clubStatus} label={tailor.clubStatus === "NONE" ? "inactive" : undefined} />
          </div>
          {member && (
            <p className="muted small">
              {plus ? "$29/month" : "$10/month"}. No lead fees, no commission, unlimited quotes.
              {tailor.clubRenewsAt && ` Renews ${tailor.clubRenewsAt.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}.`}
            </p>
          )}
          {!member && !suspended && (
            <>
              <p className="muted small">Join to appear in search, see job photos and quote. No lead fees and no commission. Customers pay tailor me the booking fee, not you.</p>
              {tailor.clubStatus === "PAST_DUE" && <p className="notice bad">Your last payment didn’t go through. Update your card to stay listed.</p>}
              <form action={joinClub}><input type="hidden" name="tier" value="CLUB" /><button className="btn btn-ghost" style={{ width: "100%" }}>Join the Club · $10/month</button></form>
            </>
          )}
          {!plus && !suspended && (
            <div className="notice" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <b style={{ color: "var(--ink)" }}>Club Plus · $29/month</b>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li><b>Featured</b> at the top of search</li>
                <li>See and quote new jobs <b>{HEAD_START_MINUTES} minutes</b> before everyone else</li>
                <li>A portfolio of up to {MAX_PORTFOLIO_PHOTOS} photos on your profile</li>
              </ul>
              <form action={member ? changeTier : joinClub}>
                <input type="hidden" name="tier" value="PLUS" />
                <button className="btn btn-primary" style={{ width: "100%" }}>{member ? "Upgrade to Club Plus" : "Join Club Plus · $29/month"}</button>
              </form>
              {member && <span className="small">The difference is prorated for the rest of this month.</span>}
            </div>
          )}
          {plus && (
            <form action={changeTier}><input type="hidden" name="tier" value="CLUB" /><button className="btn btn-ghost btn-sm">Switch back to Club · $10/month</button></form>
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
