import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer, IntroNote, Stars, Status } from "@/components/ui";
import { acceptQuote, cancelJob, leaveReview } from "@/app/actions/customer";
import { requireUser } from "@/lib/auth";
import { estimate } from "@/lib/catalog";
import { db } from "@/lib/db";
import { fabric, money } from "@/lib/fabric";
import { canReview, contactShared } from "@/lib/rules";
import { patternFor } from "@/lib/tailors";

export const metadata = { title: "Job" };

type SP = { posted?: string; booked?: string; cancelled?: string; reviewed?: string; error?: string };

export default async function JobPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/jobs/${id}`);
  const job = await db.job.findUnique({
    where: { id },
    include: {
      photos: true,
      quotes: { orderBy: { priceCents: "asc" }, include: { tailor: true } },
      booking: { include: { tailor: { include: { user: { select: { email: true, phone: true } } } }, quote: true, review: true } },
      requestedTailor: { select: { businessName: true } },
    },
  });
  if (!job || job.customerId !== user.id) notFound();

  const ratings = await db.review.groupBy({ by: ["tailorId"], where: { tailorId: { in: job.quotes.map((q) => q.tailorId) } }, _avg: { rating: true }, _count: true });
  const rating = (tid: string) => ratings.find((r) => r.tailorId === tid);
  const booking = job.booking;
  const shared = contactShared(booking);
  const [lo, hi] = estimate(job.garment, job.work, job.timing);
  const reviewable = booking && canReview(user.id, booking, !!booking.review).ok;

  return (
    <div className="wrap page">
      <Link className="crumb" href="/jobs" style={{ display: "inline-block", marginTop: 0, marginBottom: 16 }}>← My jobs</Link>
      {sp.posted && <p className="notice ok" style={{ marginBottom: 16 }}>Your job is posted. We’ve sent it to {job.requestedTailor ? `${job.requestedTailor.businessName} and ` : ""}matching tailors near {job.suburb}. You’ll get up to three guide quotes, usually within the hour.</p>}
      {sp.booked && !shared && <p className="notice" style={{ marginBottom: 16 }}>Payment received. Confirming your booking… refresh in a moment.</p>}
      {sp.cancelled && <p className="notice" style={{ marginBottom: 16 }}>Payment cancelled. Nothing was charged. You can book any quote below.</p>}
      {sp.reviewed && <p className="notice ok" style={{ marginBottom: 16 }}>Thanks for your review.</p>}
      {sp.error && <p className="notice bad" role="alert" style={{ marginBottom: 16 }}>{sp.error}</p>}

      <div className="page-head">
        <div>
          <div className="eyebrow">Job {job.ref} · {job.suburb}</div>
          <h1 style={{ marginTop: 6 }}>{job.work} · {job.garment}</h1>
        </div>
        <Status s={job.status} />
      </div>

      <div className="detail-grid">
        <div className="stack">
          {shared && booking && (
            <div className="panel">
              <h2>Booked with {booking.tailor.businessName}</h2>
              <dl className="kv">
                <dt>Guide price</dt><dd className="num">{money(booking.quote.priceCents)}</dd>
                <dt>Ready by</dt><dd>{booking.quote.readyBy.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</dd>
                <dt>Email</dt><dd><a className="link" href={`mailto:${booking.tailor.user.email}`}>{booking.tailor.user.email}</a></dd>
                {booking.tailor.user.phone && <><dt>Phone</dt><dd><a className="link" href={`tel:${booking.tailor.user.phone}`}>{booking.tailor.user.phone}</a></dd></>}
                {booking.tailor.shopAddress && <><dt>Address</dt><dd>{booking.tailor.shopAddress}</dd></>}
                {booking.tailor.openingHours && <><dt>Hours</dt><dd>{booking.tailor.openingHours}</dd></>}
                <dt>Booking fee</dt><dd className="num">{money(booking.feeCents)} paid</dd>
              </dl>
              <p className="small muted" style={{ marginTop: 14 }}>Contact the tailor to arrange drop-off or a fitting. You pay the tailor directly for the work.</p>
              <div style={{ marginTop: 12 }}><Disclaimer /></div>
              <IntroNote />
            </div>
          )}

          {reviewable && booking && (
            <form className="panel stack" id="review" action={leaveReview}>
              <h2>How did {booking.tailor.businessName} go?</h2>
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="jobId" value={job.id} />
              {([["rating", "Overall"], ["fitFinish", "Fit & finish"], ["onTime", "On time"], ["quoteAccuracy", "Quote accuracy"]] as const).map(([name, label]) => (
                <div key={name} className="row-wrap" style={{ justifyContent: "space-between" }}>
                  <span>{label}</span>
                  <select className="sel" name={name} defaultValue="5" aria-label={label}>
                    {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} {n}</option>)}
                  </select>
                </div>
              ))}
              <textarea className="inp" name="body" required minLength={10} maxLength={2000} placeholder="What did they do, and how did it turn out?" />
              <p className="small muted">Reviews are published as written and can’t be edited later.</p>
              <button className="btn btn-primary">Post review</button>
            </form>
          )}
          {booking?.review && (
            <div className="panel">
              <h2>Your review</h2>
              <p><Stars rating={booking.review.rating} /></p>
              <p style={{ marginTop: 8 }}>{booking.review.body}</p>
            </div>
          )}

          {!shared && (
            <div className="panel">
              <h2>Quotes</h2>
              {job.status === "CANCELLED" ? (
                <p className="muted">You cancelled this job.</p>
              ) : job.quotes.length === 0 ? (
                <p className="muted"><span className="pulse" style={{ display: "inline-block", marginRight: 8 }} />Waiting for tailors. Most jobs get a quote within the hour during opening hours.</p>
              ) : (
                <div>
                  {job.quotes.map((q) => {
                    const r = rating(q.tailorId);
                    return (
                      <div className="quote" key={q.id}>
                        <div className="swatch" style={{ background: fabric(patternFor(q.tailor.categories)) }} />
                        <div>
                          <Link className="who link" href={`/tailors/${q.tailor.slug}`} style={{ fontWeight: 600 }}>{q.tailor.businessName}</Link>
                          <div className="small muted"><Stars rating={r?._avg.rating ?? null} count={r?._count} /> · {q.tailor.suburb} · ready {q.readyBy.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })}</div>
                        </div>
                        <div className="price">{money(q.priceCents)}</div>
                        {q.message && <p className="msg">“{q.message}”</p>}
                        <div className="acts">
                          {job.status === "OPEN" && q.status === "PENDING" ? (
                            <form action={acceptQuote}>
                              <input type="hidden" name="quoteId" value={q.id} />
                              <button className="btn btn-primary btn-sm">Book for $5 booking fee</button>
                            </form>
                          ) : <Status s={q.status} />}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 14 }}><Disclaimer /></div>
                  <p className="small muted" style={{ marginTop: 10 }}>The $5 booking fee goes to tailor me. You pay the tailor directly for the work, once they’ve inspected the garment and confirmed the price.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="stack">
          <div className="panel">
            <h2>The job</h2>
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
              <dt>Guide price</dt><dd className="num">${lo} – ${hi}</dd>
            </dl>
          </div>
          {job.status === "OPEN" && !booking?.paidAt && (
            <form action={cancelJob}>
              <input type="hidden" name="jobId" value={job.id} />
              <button className="btn btn-ghost btn-sm">Cancel this job</button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
