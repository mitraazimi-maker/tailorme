import Link from "next/link";
import AutoSubmitForm from "@/components/AutoSubmitForm";
import { TailorRow } from "@/components/ui";
import { CATEGORIES, isCategory } from "@/lib/catalog";
import { SUBURB_NAMES, findSuburb } from "@/lib/suburbs";
import { searchTailors, type Search } from "@/lib/tailors";

export const metadata = { title: "Find a tailor" };

type SP = Record<string, string | string[] | undefined>;
const list = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);
const one = (v: string | string[] | undefined) => list(v)[0];

export default async function Results({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const suburb = findSuburb(one(sp.suburb)) ?? "Paddington";
  const sort = (["match", "near", "rating", "price"] as const).find((s) => s === one(sp.sort)) ?? "match";
  const maxKm = Math.min(Math.max(Number(one(sp.km)) || 25, 2), 25);
  const s: Search = {
    q: one(sp.q) ?? "",
    suburb,
    cats: list(sp.cat).filter(isCategory),
    mobile: one(sp.mobile) === "1",
    express: one(sp.express) === "1",
    maxKm,
    minRating: Number(one(sp.rating)) || 0,
    sort,
  };
  const results = await searchTailors(s);
  const unknownSuburb = one(sp.suburb) && !findSuburb(one(sp.suburb));

  return (
    <AutoSubmitForm action="/tailors" className="view wrap results-layout">
      <input type="hidden" name="q" value={s.q} />
      <details className="filters" open>
        <summary className="fsum">Filters</summary>
        <div className="fbody">
          <div>
            <h4>Suburb</h4>
            <input className="inp" name="suburb" defaultValue={suburb} list="suburb-list" />
          </div>
          <div>
            <h4>Service</h4>
            {CATEGORIES.map((c) => (
              <label key={c.id} className="check"><input type="checkbox" name="cat" value={c.id} defaultChecked={s.cats!.includes(c.id)} />{c.name}</label>
            ))}
          </div>
          <div>
            <h4>Options</h4>
            <label className="check"><input type="checkbox" name="mobile" value="1" defaultChecked={s.mobile} />Comes to me for fittings</label>
            <label className="check"><input type="checkbox" name="express" value="1" defaultChecked={s.express} />Same-day available</label>
          </div>
          <div>
            <h4>Distance <span className="range-out">up to {maxKm} km</span></h4>
            <input type="range" name="km" min={2} max={25} defaultValue={maxKm} />
          </div>
          <div>
            <h4>Rating</h4>
            <select className="sel" name="rating" defaultValue={String(s.minRating || 0)} style={{ width: "100%" }}>
              <option value="0">Any</option><option value="4.8">4.8 and up</option><option value="4.9">4.9 and up</option>
            </select>
          </div>
          <noscript><button className="btn btn-ink btn-sm">Apply</button></noscript>
          <Link className="btn btn-ghost btn-sm" href={`/tailors?suburb=${encodeURIComponent(suburb)}`}>Clear filters</Link>
        </div>
      </details>
      <div style={{ minWidth: 0 }}>
        <div className="results-head">
          <div>
            <div className="eyebrow">Near {suburb}</div>
            <h1 style={{ marginTop: 4 }}>{results.length} tailor{results.length === 1 ? "" : "s"}{s.q ? ` for “${s.q}”` : ""}</h1>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, color: "var(--ink-2)" }}>
            Sort
            <select className="sel" name="sort" defaultValue={sort}>
              <option value="match">Best match</option><option value="near">Nearest</option><option value="rating">Highest rated</option><option value="price">Lowest price</option>
            </select>
          </label>
        </div>
        {unknownSuburb && <p className="notice" style={{ marginBottom: 14 }}>We don’t know “{one(sp.suburb)}” yet, so we’re showing tailors near {suburb}.</p>}
        <div className="list">
          {results.length ? results.map((t) => <TailorRow key={t.id} t={t} />) : <div className="empty">No tailors match those filters. Widen the distance or clear a filter.</div>}
        </div>
        <div className="est" style={{ marginTop: 22 }}>
          <span>Not sure who to pick?</span>
          <Link className="btn btn-primary btn-sm" href="/post" style={{ marginLeft: "auto" }}>Post a job and get 3 quotes</Link>
        </div>
      </div>
      <SuburbList />
    </AutoSubmitForm>
  );
}

function SuburbList() {
  return <datalist id="suburb-list">{SUBURB_NAMES.map((n) => <option key={n} value={n} />)}</datalist>;
}
