import Link from "next/link";
import { deleteFitEntry, saveFitProfile } from "@/app/actions/customer";
import { FitHistory } from "@/components/fit";
import { fitRecordFor } from "@/lib/fit-records";
import { requireUser } from "@/lib/auth";
import { bookedTailorIds } from "@/lib/bookings";
import { db } from "@/lib/db";
import { SUBURB_NAMES } from "@/lib/suburbs";

export const metadata = { title: "Fit profile" };

export default async function FitProfile({ searchParams }: { searchParams: Promise<{ saved?: string; removed?: string }> }) {
  const user = await requireUser("/jobs/profile");
  const { saved, removed } = await searchParams;
  const [mine, booked, fit] = await Promise.all([
    db.myTailor.findMany({ where: { customerId: user.id }, include: { tailor: true }, orderBy: { createdAt: "desc" } }),
    bookedTailorIds(user.id),
    fitRecordFor(user.id, 50),
  ]);
  return (
    <div className="wrap page">
      <div className="tabs"><Link href="/jobs">My jobs</Link><Link href="/jobs/profile" aria-current="page">Fit profile &amp; my tailors</Link></div>
      <div className="page-head"><h1>Your fit</h1></div>
      {saved && <p className="notice ok" style={{ marginBottom: 16 }}>Saved.</p>}
      {removed && <p className="notice ok" style={{ marginBottom: 16 }}>Removed from your fit record.</p>}
      <div className="panel stack" id="fit-record" style={{ marginBottom: 20 }}>
        <div>
          <h2>Your fit record</h2>
          <p className="small muted" style={{ marginTop: 4 }}>
            Measurements your tailors take at the fitting. Any tailor you book through tailor me starts from them, so you don’t have to explain your fit again. Only you and the tailors you book can see it.
          </p>
        </div>
        {fit.length === 0 ? (
          <p className="muted small">Nothing yet. Your tailor adds your measurements after your first fitting.</p>
        ) : (
          <FitHistory
            entries={fit}
            action={(e) => (
              <form action={deleteFitEntry} style={{ marginTop: 8 }}>
                <input type="hidden" name="id" value={e.id} />
                <button className="link small" type="submit" aria-label={`Remove the ${e.garment} fit from ${e.tailorName}`}>Remove</button>
              </form>
            )}
          />
        )}
      </div>
      <div className="detail-grid">
        <form className="panel stack" action={saveFitProfile}>
          <div className="field" style={{ marginTop: 0 }}>
            <label htmlFor="fitNotes">Your own notes</label>
            <textarea className="inp" id="fitNotes" name="fitNotes" defaultValue={user.fitNotes ?? ""} style={{ minHeight: 180 }} placeholder={"e.g. Inseam 78 cm (flat shoes), 80 cm (heels)\nPrefers trousers with a slight break\nSleeve 61 cm"} />
            <span className="hint">Anything your tailors should know. Shared only with tailors you book through tailor me.</span>
          </div>
          <div className="two">
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor="suburb">Suburb</label>
              <input className="inp" id="suburb" name="suburb" list="fp-suburbs" defaultValue={user.suburb ?? ""} />
              <datalist id="fp-suburbs">{SUBURB_NAMES.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor="phone">Phone</label>
              <input className="inp" id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} autoComplete="tel" />
              <span className="hint">Shared with a tailor only after you book them.</span>
            </div>
          </div>
          <button className="btn btn-primary">Save</button>
        </form>
        <div className="panel">
          <h2>My tailors</h2>
          {mine.length === 0 ? (
            <p className="muted small">Tap “Make them my tailor” on a tailor’s page to keep them here.</p>
          ) : (
            <ul className="std-list">
              {mine.map((m) => (
                <li key={m.tailorId}>
                  <Link className="link" href={`/tailors/${m.tailor.slug}`}><b>{m.tailor.businessName}</b></Link>
                  <span>
                    {m.tailor.suburb} ·{" "}
                    {booked.has(m.tailorId) ? (
                      <Link className="link" href={`/post?tailor=${m.tailor.slug}&rebook=1`}>Rebook · flat $5</Link>
                    ) : (
                      <Link className="link" href={`/post?tailor=${m.tailor.slug}`}>Request a quote</Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
