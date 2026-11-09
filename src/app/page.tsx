import Link from "next/link";
import Tape from "@/components/Tape";
import { TailorTile } from "@/components/ui";
import { CATEGORIES, QUICK_JOBS } from "@/lib/catalog";
import { fabric } from "@/lib/fabric";
import { getUser } from "@/lib/auth";
import { searchTailors } from "@/lib/tailors";
import { AT_HOME_NAME } from "@/lib/pickup";
import { findSuburb } from "@/lib/suburbs";

// Illustrative only: an example of a home visit, not a real booking.
const VISIT = [
  { time: "Tue 6:30pm", what: "Your tailor arrives", detail: "Navy suit trousers, at home", pat: CATEGORIES[1].pat },
  { time: "Tue 6:40pm", what: "Pinned on you", detail: "In the shoes you’ll wear them with", pat: CATEGORIES[0].pat },
  { time: "Thu 7:00pm", what: "Back at your door", detail: "Pressed and ready to wear", pat: CATEGORIES[2].pat },
];

export default async function Home() {
  const user = await getUser();
  const suburb = findSuburb(user?.suburb) ?? "Paddington";
  const near = (await searchTailors({ suburb, sort: "match" })).slice(0, 6);

  return (
    <div className="view">
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">Sydney’s private tailors, by appointment</div>
            <h1 style={{ marginTop: 14 }}>Your own tailor, <span className="hl">at your door.</span></h1>
            <p className="lede">Hems, fittings and repairs, handled the way a private tailor would. Choose your tailor, and have them come to you.</p>
            <form className="search" action="/tailors">
              <label htmlFor="q"><span>What needs doing?</span><input id="q" name="q" placeholder="e.g. hem work trousers" autoComplete="off" /></label>
              <label htmlFor="sub"><span>Suburb</span><input id="sub" name="suburb" defaultValue={suburb} autoComplete="off" /></label>
              <button className="btn btn-primary btn-brand" type="submit" aria-label="Tailor me: find tailors">tailor <i>me</i></button>
            </form>
            <div className="chips">
              <Link className="chip" href={`/tailors?pickup=1&suburb=${encodeURIComponent(suburb)}`} aria-pressed="true">Tailors who visit</Link>
              {QUICK_JOBS.map(([j, c]) => (
                <Link key={j} className="chip" href={`/tailors?q=${encodeURIComponent(j)}&cat=${c}&suburb=${encodeURIComponent(suburb)}`}>{j}</Link>
              ))}
            </div>
          </div>
          <div className="ticket" aria-label="An example home visit">
            <div className="ticket-head">
              <div><div className="eyebrow" style={{ color: "var(--tape)" }}>{AT_HOME_NAME}</div><h3 style={{ marginTop: 4 }}>An evening fitting in Paddington</h3></div>
              <span className="pill y">Example</span>
            </div>
            <ul>
              {VISIT.map((v) => (
                <li key={v.time}>
                  <div className="swatch" style={{ background: fabric(v.pat) }} />
                  <div><div className="who">{v.what}</div><div className="meta">{v.detail}</div></div>
                  <div className="price" style={{ fontSize: 14 }}>{v.time}</div>
                </li>
              ))}
            </ul>
            <div className="ticket-foot"><span className="pulse" /> With tailors who visit, in their own area</div>
          </div>
        </div>
      </section>
      <Tape />
      <section className="block" id="at-home">
        <div className="wrap">
          <div className="standard">
            <div>
              <div className="eyebrow" style={{ color: "var(--tape)" }}>Concierge · {AT_HOME_NAME}</div>
              <h2 style={{ marginTop: 12 }}>The private-tailor experience, <span className="serif-i" style={{ color: "var(--tape)" }}>at home.</span></h2>
              <p>No trip to the shopping centre, no queue at the counter. Tailors who visit come to you, fit you in your own home, and bring it back pressed.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
                <Link className="btn btn-primary" href={`/tailors?pickup=1&suburb=${encodeURIComponent(suburb)}`}>Find a tailor who visits</Link>
              </div>
              <p className="small" style={{ marginTop: 14 }}>Offered by tailors who visit, within their own area.</p>
            </div>
            <ul className="std-list">
              <li><b>They come to you</b><span>at a time that suits, morning or evening.</span></li>
              <li><b>A fitting in your own home</b><span>pinned on you, in your shoes, in your light.</span></li>
              <li><b>Back to your door, pressed</b><span>ready to wear, with your fit saved for next time.</span></li>
            </ul>
          </div>
        </div>
      </section>
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head"><h2>How it works</h2><p>A few minutes on your phone. Your tailor takes it from there.</p></div>
          <div className="steps">
            <div className="step"><span className="n">Step 1</span><h3>Tell us what needs doing</h3><p>Choose the garment and the work, and add a photo. It takes about two minutes.</p></div>
            <div className="step"><span className="n">Step 2</span><h3>Choose your tailor</h3><p>Local tailors reply with a ready date and a guide price, confirmed once they see the garment. Booking is free.</p></div>
            <div className="step"><span className="n">Step 3</span><h3>At home or at the studio</h3><p>Have your tailor come to you for a fitting, or drop it at their studio. It comes back pressed and ready to wear.</p></div>
          </div>
        </div>
      </section>
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="standard">
            <div>
              <div className="eyebrow" style={{ color: "var(--tape)" }}>The tailor me standard</div>
              <h2 style={{ marginTop: 12 }}>Looked after, every time.</h2>
              <p>Every tailor me Club member agrees to four things. It’s what makes a simple hem feel like a visit to your own tailor.</p>
            </div>
            <ul className="std-list">
              <li><b>A reply within two hours</b><span>during opening hours, with a ready date.</span></li>
              <li><b>Ready when promised</b><span>or a message before the day, never after.</span></li>
              <li><b>Pressed and ready to wear</b><span>every garment comes back pressed, not crumpled in a bag.</span></li>
              <li><b>Remembers your fit</b><span>your tailor keeps your measurements on tailor me, so next time it’s one tap.</span></li>
            </ul>
          </div>
        </div>
      </section>
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head"><h2>What can we help with?</h2><p>Everyday alterations and repairs, done properly.</p></div>
          <div className="cats">
            {CATEGORIES.map((c) => (
              <Link key={c.id} className="cat" href={`/tailors?cat=${c.id}`}>
                <div className="pat" style={{ background: fabric(c.pat) }} />
                <div><h3>{c.name}</h3><div style={{ color: "var(--ink-2)", fontSize: 14 }}>{c.desc}</div></div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      {near.length > 0 && (
        <section className="block" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head"><h2>Tailors near {suburb}</h2><Link className="btn btn-ghost btn-sm" href={`/tailors?suburb=${encodeURIComponent(suburb)}`}>See all tailors →</Link></div>
            <div className="grid-t">{near.map((t) => <TailorTile key={t.id} t={t} />)}</div>
          </div>
        </section>
      )}
      <section className="block" id="makers" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="maker" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--tape)" }}>For tailors &amp; seamstresses</div>
              <h2 style={{ marginTop: 10 }}>Be someone’s tailor.</h2>
              <p>Join the tailor me Club to meet customers nearby, offer home visits, and keep the regulars who come back.</p>
              <div style={{ marginTop: 22 }}>
                <Link className="btn btn-primary" href="/for-tailors" style={{ background: "var(--paper)", color: "var(--ink)" }}>Find out more</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
