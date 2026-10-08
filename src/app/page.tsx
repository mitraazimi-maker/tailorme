import Link from "next/link";
import Tape from "@/components/Tape";
import ClubPitch from "@/components/ClubPitch";
import { Disclaimer, TailorTile } from "@/components/ui";
import { CATEGORIES, PRICE_GUIDE, QUICK_JOBS } from "@/lib/catalog";
import { fabric } from "@/lib/fabric";
import { getUser } from "@/lib/auth";
import { searchTailors } from "@/lib/tailors";
import { findSuburb } from "@/lib/suburbs";

// Illustrative only: not attributed to any real tailor.
const EXAMPLE = [
  { who: "Home studio, Paddington", meta: "1.2 km · ready Thu", price: 22, pat: CATEGORIES[0].pat },
  { who: "Alterations shop, Surry Hills", meta: "1.9 km · ready today", price: 24, pat: CATEGORIES[4].pat },
  { who: "Tailor, Bondi Junction", meta: "1.6 km · ready tomorrow", price: 18, pat: CATEGORIES[2].pat },
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
            <div className="eyebrow">Sydney’s neighbourhood tailors</div>
            <h1 style={{ marginTop: 14 }}>Your own tailor, <span className="hl">from $14.</span></h1>
            <p className="lede">The hem, the zip, the jacket that never sat right. Send a photo and a local tailor takes care of it, usually with a quote inside the hour.</p>
            <form className="search" action="/tailors">
              <label htmlFor="q"><span>What needs doing?</span><input id="q" name="q" placeholder="e.g. hem work trousers" autoComplete="off" /></label>
              <label htmlFor="sub"><span>Suburb</span><input id="sub" name="suburb" defaultValue={suburb} autoComplete="off" /></label>
              <button className="btn btn-primary btn-brand" type="submit" aria-label="Tailor me: find tailors">tailor <i>me</i></button>
            </form>
            <div className="chips">
              {QUICK_JOBS.map(([j, c]) => (
                <Link key={j} className="chip" href={`/tailors?q=${encodeURIComponent(j)}&cat=${c}&suburb=${encodeURIComponent(suburb)}`}>{j}</Link>
              ))}
            </div>
          </div>
          <div className="ticket" aria-label="Example job with quotes">
            <div className="ticket-head">
              <div><div className="eyebrow">Example job · Paddington</div><h3 style={{ marginTop: 4 }}>Hem a pair of work trousers, 4 cm</h3></div>
              <span className="pill y">3 quotes</span>
            </div>
            <ul>
              {EXAMPLE.map((e) => (
                <li key={e.who}>
                  <div className="swatch" style={{ background: fabric(e.pat) }} />
                  <div><div className="who">{e.who}</div><div className="meta">{e.meta}</div></div>
                  <div className="price">${e.price}</div>
                </li>
              ))}
            </ul>
            <div className="ticket-foot"><span className="pulse" /> Example only · $5 booking fee only if you book</div>
            <div style={{ padding: "12px 16px 16px" }}><Disclaimer /></div>
          </div>
        </div>
      </section>
      <Tape />
      <section className="block">
        <div className="wrap">
          <div className="section-head"><h2>How it works</h2><p>No calling around. No guessing what it will cost.</p></div>
          <div className="steps">
            <div className="step"><span className="n">Step 1</span><h3>Describe the job</h3><p>Pick the garment and the work, add at least one photo and your timeline. Takes about two minutes.</p></div>
            <div className="step"><span className="n">Step 2</span><h3>Compare quotes</h3><p>Up to three independent tailors reply with a guide price and a ready date. The final price is confirmed once they inspect the garment.</p></div>
            <div className="step"><span className="n">Step 3</span><h3>Drop off or book a fitting</h3><p>Accept the quote you like for a flat $5 booking fee. Visit the studio or have them come to you. You deal with the tailor directly from there.</p></div>
          </div>
        </div>
      </section>
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="standard">
            <div>
              <div className="eyebrow" style={{ color: "var(--tape)" }}>The tailor me standard</div>
              <h2 style={{ marginTop: 12 }}>The tailor experience, at alteration prices.</h2>
              <p>Every tailor me Club member agrees to four simple things. It’s what makes a $20 hem feel like a visit to your own tailor.</p>
            </div>
            <ul className="std-list">
              <li><b>A reply within two hours</b><span>during opening hours, with a guide price and a ready date.</span></li>
              <li><b>Ready when promised</b><span>or a message before the day, never after.</span></li>
              <li><b>Pressed and ready to wear</b><span>every garment comes back pressed, not crumpled in a bag.</span></li>
              <li><b>Remembers your fit</b><span>your tailor keeps your measurements on tailor me, so next time it’s one tap.</span></li>
            </ul>
          </div>
        </div>
      </section>
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head"><h2>What can we help with?</h2><p>Typical Sydney prices for everyday alterations.</p></div>
          <div className="cats">
            {CATEGORIES.map((c) => (
              <Link key={c.id} className="cat" href={`/tailors?cat=${c.id}`}>
                <div className="pat" style={{ background: fabric(c.pat) }} />
                <div><h3>{c.name}</h3><div style={{ color: "var(--ink-2)", fontSize: 14 }}>{c.desc}</div></div>
                <div className="range">{c.range}</div>
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
      <section className="block" id="pricing" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="section-head"><h2>What should it cost?</h2><p>Typical Sydney prices. Bar shows the usual spread.</p></div>
          <div className="guide">
            <table>
              <thead><tr><th>Job</th><th>Typical</th><th>Range</th><th style={{ width: "30%" }}>Spread</th></tr></thead>
              <tbody>
                {PRICE_GUIDE.map(([j, m, lo, hi]) => (
                  <tr key={j}>
                    <td>{j}</td><td className="p"><b>${m}</b></td><td className="p">${lo} – ${hi}</td>
                    <td><div className="bar"><i style={{ left: `${(lo / 75) * 100}%`, width: `${Math.max(((hi - lo) / 75) * 100, 1.5)}%` }} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12 }}><Disclaimer /></div>
        </div>
      </section>
      <section className="block" id="makers" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <ClubPitch />
        </div>
      </section>
    </div>
  );
}
