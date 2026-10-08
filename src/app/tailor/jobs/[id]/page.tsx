import Link from "next/link";
import { notFound } from "next/navigation";
import { markCompleted, submitQuote, withdrawQuote } from "@/app/actions/tailor";
import { Disclaimer, IntroNote, Status } from "@/components/ui";
import { requireTailor } from "@/lib/auth";
import { MAX_QUOTES_PER_JOB, estimate } from "@/lib/catalog";
import { db } from "@/lib/db";
import { money } from "@/lib/fabric";
import { canQuote, canTailorSeeJob, contactShared } from "@/lib/rules";
import { distanceKm } from "@/lib/suburbs";

export const metadata = { title: "Job" };

const isoDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });

export default async function TailorJob({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ quoted?: string; error?: string }> }) {
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
  const quoteVerdict = canQuote(tailor, job, job.quotes.length, !!mine);
  const [lo, hi] = estimate(job.garment, job.work, job.timing);
  const km = distanceKm(tailor.suburb, job.suburb);
  const pastJobs = bookedHere
    ? await db.booking.findMany({
        where: { tailorId: tailor.id, customerId: bookedHere.customer.id, id: { not: bookedHere.id }, status: { in: ["CONFIRMED", "COMPLETED"] } },
        include: { job: true, quote: true },
        orderBy: { paidAt: "desc" },
        take: 10,
      })
    : [];

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
              <div style={{ marginTop: 14 }}>
                <b>Fit notes</b>
                <p className="muted" style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{bookedHere.customer.fitNotes || "None saved yet."}</p>
              </div>
              {pastJobs.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <b>Past jobs with you</b>
                  <ul className="small muted" style={{ paddingLeft: 18 }}>
                    {pastJobs.map((p) => <li key={p.id}>{p.job.work} · {p.job.garment} · {money(p.quote.priceCents)} · {p.paidAt?.toLocaleDateString("en-AU")}</li>)}
                  </ul>
                </div>
              )}
              <p className="small muted" style={{ marginTop: 14 }}>Confirm the final price after you inspect the garment. The customer pays you directly.</p>
              {bookedHere.status === "CONFIRMED" && (
                <form action={markCompleted} style={{ marginTop: 12 }}>
                  <input type="hidden" name="bookingId" value={bookedHere.id} />
                  <input type="hidden" name="jobId" value={job.id} />
                  <button className="btn btn-ink btn-sm">Mark as picked up</button>
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
              <div className="field" style={{ marginTop: 0 }}>
                <label htmlFor="message">Message (optional)</label>
                <textarea className="inp" id="message" name="message" maxLength={600} placeholder="e.g. Happy to keep the original hem. Drop off any weekday before 11." />
              </div>
              <Disclaimer />
              <button className="btn btn-primary">Send quote</button>
              <IntroNote className="small muted" />
            </form>
          ) : (
            <div className="panel"><p className="muted">{quoteVerdict.reason}</p></div>
          )}
        </aside>
      </div>
    </div>
  );
}
