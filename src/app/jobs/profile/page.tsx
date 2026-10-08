import Link from "next/link";
import { saveFitProfile } from "@/app/actions/customer";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SUBURB_NAMES } from "@/lib/suburbs";

export const metadata = { title: "Fit profile" };

export default async function FitProfile({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const user = await requireUser("/jobs/profile");
  const { saved } = await searchParams;
  const mine = await db.myTailor.findMany({ where: { customerId: user.id }, include: { tailor: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="wrap page">
      <div className="tabs"><Link href="/jobs">My jobs</Link><Link href="/jobs/profile" aria-current="page">Fit profile &amp; my tailors</Link></div>
      <div className="page-head"><h1>Your fit</h1></div>
      {saved && <p className="notice ok" style={{ marginBottom: 16 }}>Saved.</p>}
      <div className="detail-grid">
        <form className="panel stack" action={saveFitProfile}>
          <div className="field" style={{ marginTop: 0 }}>
            <label htmlFor="fitNotes">Measurements and fit notes</label>
            <textarea className="inp" id="fitNotes" name="fitNotes" defaultValue={user.fitNotes ?? ""} style={{ minHeight: 180 }} placeholder={"e.g. Inseam 78 cm (flat shoes), 80 cm (heels)\nPrefers trousers with a slight break\nSleeve 61 cm"} />
            <span className="hint">Shared only with tailors you book through tailor me.</span>
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
                  <span>{m.tailor.suburb} · <Link className="link" href={`/post?tailor=${m.tailor.slug}`}>Request a quote</Link></span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
