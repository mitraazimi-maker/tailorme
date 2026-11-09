import Link from "next/link";
import { notFound } from "next/navigation";
import { markCompleted, recordFit, submitQuote, withdrawQuote } from "@/app/actions/tailor";
import { FitHistory } from "@/components/fit";
import { MAX_FIT_NOTE, MEASURES, fitApplies, measuresFor } from "@/lib/fit";
import { fitRecordFor } from "@/lib/fit-records";
import { creditsForTailor } from "@/lib/credits";
import { Disclaimer, IntroNote, Status } from "@/components/ui";
import { requireTailor } from "@/lib/auth";
import { MAX_QUOTES_PER_JOB, estimate } from "@/lib/catalog";
import { db } from "@/lib/db";
import { money } from "@/lib/fabric";
import { canQuote, canTailorSeeJob, contactShared } from "@/lib/rules";
import { HOME_FITTING, picksUpFrom, pickupPriceLabel } from "@/lib/pickup";
import { distanceKm } from "@/lib/suburbs";

export const metadata = { title: "Job" };

const isoDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });

export default async function TailorJob({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ quoted?: string; error?: string; fit?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { tailor } = await requireTailor(`/tailor/jobs/${id}`);
  const job = await db.job.findUnique({
    where: { id },
    include: {
      photos: true,
      quotes: { where: { status: { in: ["PENDING", "ACCEPTED"] } } },
      booking: { include: { customer: { select: { firstName: true, email: true, phone: true, fitNotes: true, id: true } } } },
      customer: { select: { firstName: true } },
    },
  });
  if (!job) notFound();
  const bookedHere = job.booking && contactShared(job.booking) && job.booking.tailorId === tailor.id ? job.booking : null;
  const access = canTailorSeeJob(tailor, job, bookedHere ? tailor.id : null);
  const mine = await db.quote.findUnique({ where: { jobId_tailorId: { jobId: job.id, tailorId: tailor.id } } });
  if (!access.ok && !mine) {
    return (
      <div className="wrap page narrow">
        <div className="page-head"><h1>{job.work} · {job.garment}</h1></div>
        <p className="notice">{access.reason} {access.reason.includes("Club") && <Link className="link" href="/tailor">Join the Club</Link>}</p>
      </div>
    );
  }
  const credits = mine ? null : await creditsForTailor(tailor);
  const quoteVerdict = canQuote(tailor, job, job.quotes.length, !!mine, credits);
  const isTheirRebook = job.exclusive && job.requestedTailorId === tailor.id;
  const [lo, hi] = estimate(job.garment, job.work, job.timing);
  const km = distanceKm(tailor.suburb, job.suburb);
  const pastJobs = bookedHere
    ? await db.booking.findMany({
        where: { tailorId: tailor.id, customerId: bookedHere.customer.id, id: { not: bookedHere.id }, status: { in: ["CONFIRMED", "COMPLETED"] } },
        include: { job: true, quote: true },
        orderBy: { bookedAt: "desc" },
        take: 10,
      })
    : [];
  // Booked here = a paid booking with this tailor, so they see the customer's whole fit record.
  const fitEntries = bookedHere ? await fitRecordFor(bookedHere.customer.id) : [];
  const thisFit = bookedHere ? fitEntries.find((e) => e.bookingId === bookedHere.id) : undefined;
  const otherFits = fitEntries.filter((e) => e !== thisFit);
  const askFit = !!bookedHere && fitApplies(job.garment);

  return (
    <div className="wrap page">
      <Link className="crumb" href="/tailor/jobs" style={{ display: "inline-block", marginTop: 0, marginBottom: 16 }}>← Open jobs</Link>
      {sp.quoted && <p className="notice ok" style={{ marginBottom: 16 }}>Quote sent. We’ve let {job.customer.firstName} know.</p>}
      {sp.error && <p className="notice bad" role="alert" style={{ marginBottom: 16 }}>{sp.error}</p>}
      <div className="page-head">
        <div>
          <div className="eyebrow">Job {job.ref} · {job.customer.firstName} · {job.suburb}{km != null && ` · ${km} km`}</div>
          <h1 style={{ marginTop: 6 }}>{job.work} · {job.garment}</h1>
        </div>
        <Status s={bookedHere ? bookedHere.status : job.status} />
      </div>

      <div className="detail-grid">
        <div className="stack">
          <div className="panel">
            <div className="photos">
              {job.photos.map((p, i) => (
                <a key={p.id} href={`/api/photos/${p.id}`} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/photos/${p.id}`} alt={`Job photo ${i + 1}`} />
                </a>
              ))}
            </div>
            <p style={{ marginTop: 14, whiteSpace: "pre-wrap" }}>{job.description}</p>
            <dl className="kv" style={{ marginTop: 14 }}>
              <dt>Fitting</dt><dd>{job.fitting ?? "Tailor to advise"}</dd>
              <dt>Timing</dt><dd>{job.timing}</dd>
              <dt>Pickup</dt><dd>{job.wantsPickup ? "Wants pickup, delivery & home fitting" : "Will drop it off"}</dd>
              <dt>Customer saw a guide of</dt><dd className="num">${lo} – ${hi}</dd>
              <dt>Quotes so far</dt><dd className="num">{job.quotes.length} / {MAX_QUOTES_PER_JOB}</dd>
            </dl>
          </div>

          {bookedHere && (
            <div className="panel">
              <h2>{bookedHere.customer.firstName} booked you</h2>
              <dl className="kv">
                <dt>Email</dt><dd><a className="link" href={`mailto:${bookedHere.customer.email}`}>{bookedHere.customer.email}</a></dd>
                {bookedHere.customer.phone && <><dt>Phone</dt><dd><a className="link" href={`tel:${bookedHere.customer.phone}`}>{bookedHere.customer.phone}</a></dd></>}
              </dl>
              {bookedHere.customer.fitNotes && (
                <div style={{ marginTop: 14 }}>
                  <b>{bookedHere.customer.firstName}’s own notes</b>
                  <p className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{bookedHere.customer.fitNotes}</p>
                </div>
              )}
              {pastJobs.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <b>Past jobs with you</b>
                  <ul className="small muted" style={{ paddingLeft: 18 }}>
                    {pastJobs.map((p) => <li key={p.id}>{p.job.work} · {p.job.garment} · {money(p.quote.priceCents)} · {p.bookedAt?.toLocaleDateString("en-AU")}</li>)}
                  </ul>
                </div>
              )}
              <p className="small muted" style={{ marginTop: 14 }}>Confirm the final price after you inspect the garment. The customer pays you directly.</p>
              {bookedHere.status === "CONFIRMED" && (
                <form action={markCompleted} style={{ marginTop: 12 }}>
                  <input type="hidden" name="bookingId" value={bookedHere.id} />
                  <input type="hidden" name="jobId" value={job.id} />
                  <button className="btn btn-ink btn-sm">Mark as picked up</button>
                  {askFit && !thisFit && <span className="small muted" style={{ marginLeft: 10 }}>No fit recorded for this job yet.</span>}
                </form>
              )}
            </div>
          )}

          {bookedHere && (
            <div className="panel stack" id="fit">
              <div>
                <h2>{bookedHere.customer.firstName}’s fit record</h2>
                {otherFits.length === 0 && <p className="small muted" style={{ marginTop: 4 }}>Nothing saved from earlier fittings yet.</p>}
              </div>
              {otherFits.length > 0 && <FitHistory entries={otherFits} />}
              {askFit && (
                <form className="stack" action={recordFit} style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                  <input type="hidden" name="jobId" value={job.id} />
                  <div>
                    <b>{thisFit ? "Your fit for this job" : "Record the fit"}</b>
                    <p className="small muted" style={{ marginTop: 4 }}>
                      Takes a minute after the pinning. In centimetres; leave blank what you didn’t take. Saved to {bookedHere.customer.firstName}’s fit record on tailor me, so rebooking you is one tap. {bookedHere.customer.firstName} and the tailors they book through tailor me can see it.
                    </p>
                  </div>
                  {sp.fit && <p className="notice ok small" role="status">Fit saved to {bookedHere.customer.firstName}’s record.</p>}
                  <div className="fit-grid">
                    {measuresFor(job.garment).map((k) => (
                      <div className="field" key={k}>
                        <label htmlFor={`m_${k}`}>{MEASURES[k]}</label>
                        <input className="inp" id={`m_${k}`} name={`m_${k}`} inputMode="decimal" placeholder="cm" defaultValue={thisFit?.measurements[k] ?? ""} />
                      </div>
                    ))}
                  </div>
                  <div className="field" style={{ marginTop: 0 }}>
                    <label htmlFor="fitNotesIn">Fit notes</label>
                    <textarea className="inp" id="fitNotesIn" name="notes" maxLength={MAX_FIT_NOTE} defaultValue={thisFit?.notes ?? ""} placeholder="e.g. Wears 5 cm heels with these. Likes a slight break. Left leg 1 cm shorter." />
                  </div>
                  <button className="btn btn-ink btn-sm" style={{ alignSelf: "flex-start" }}>{thisFit ? "Update fit" : "Save fit"}</button>
                </form>
              )}
            </div>
          )}
        </div>

        <aside className="stack">
          {mine ? (
            <div className="panel stack">
              <h2>Your quote</h2>
              <dl className="kv">
                <dt>Guide price</dt><dd className="num">{money(mine.priceCents)}</dd>
                {mine.pickupFeeCents != null && <><dt>Pickup &amp; home fitting</dt><dd className="num">{pickupPriceLabel(mine.pickupFeeCents)}</dd></>}
                <dt>Ready by</dt><dd>{mine.readyBy.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</dd>
                <dt>Status</dt><dd><Status s={mine.status} /></dd>
              </dl>
              {mine.message && <p className="muted">“{mine.message}”</p>}
              {mine.status === "PENDING" && job.status === "OPEN" && (
                <form action={withdrawQuote}><input type="hidden" name="jobId" value={job.id} /><button className="btn btn-ghost btn-sm">Withdraw quote</button></form>
              )}
              <Disclaimer />
            </div>
          ) : quoteVerdict.ok ? (
            <form className="panel stack" action={submitQuote}>
              <h2>Send a guide quote</h2>
              <input type="hidden" name="jobId" value={job.id} />
              <div className="two">
                <div className="field" style={{ marginTop: 0 }}><label htmlFor="price">Guide price ($)</label><input className="inp" id="price" name="price" type="number" min={1} step="1" required inputMode="numeric" /></div>
                <div className="field" style={{ marginTop: 0 }}><label htmlFor="readyBy">Ready by</label><input className="inp" id="readyBy" name="readyBy" type="date" min={isoDate(new Date())} required /></div>
              </div>
              {job.wantsPickup && (
                picksUpFrom(tailor, job.suburb) ? (
                  <div className="field" style={{ marginTop: 0 }}>
                    <label htmlFor="pickupFee">Pickup, delivery &amp; home fitting ($)</label>
                    <input className="inp" id="pickupFee" name="pickupFee" type="number" min={0} max={200} step="1" defaultValue={(tailor.pickupFeeCents ?? 0) / 100} />
                    <span className="hint">The customer asked for it. Your usual price is filled in; it’s paid to you. {HOME_FITTING}</span>
                  </div>
                ) : (
                  <p className="notice small">The customer asked for pickup, delivery and a home fitting. {tailor.offersPickup ? `${job.suburb} is outside your ${tailor.pickupRadiusKm} km pickup area` : "You don’t offer pickup"}, so say in your message if they’ll need to drop it off.</p>
                )
              )}
              <div className="field" style={{ marginTop: 0 }}>
                <label htmlFor="message">Message (optional)</label>
                <textarea className="inp" id="message" name="message" maxLength={600} placeholder="e.g. Happy to keep the original hem. Drop off any weekday before 11." />
              </div>
              <Disclaimer />
              <button className="btn btn-primary">Send quote</button>
              {credits && (
                <p className="small muted">
                  {isTheirRebook
                    ? "A rebook from your own customer: free, it won’t use one of your jobs."
                    : credits.unlimited
                      ? "Unlimited plan: no limit on jobs."
                      : `If they book you, this uses 1 of your ${credits.left} jobs left this month. Quoting is free.`}
                </p>
              )}
              <IntroNote className="small muted" />
            </form>
          ) : (
            <div className="panel stack"><p className="muted">{quoteVerdict.reason}</p>{credits && !credits.unlimited && credits.left === 0 && <Link className="btn btn-primary btn-sm" href="/tailor" style={{ alignSelf: "flex-start" }}>See plans</Link>}</div>
          )}
        </aside>
      </div>
    </div>
  );
}
