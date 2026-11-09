import Link from "next/link";
import { PLANS, TIERS, planJobsLabel, planPriceLabel } from "@/lib/plans";

export default function ClubPitch() {
  return (
    <div className="maker">
      <div>
        <div className="eyebrow" style={{ color: "var(--tape)" }}>The tailor me Club · for tailors &amp; seamstresses</div>
        <h2 style={{ marginTop: 10 }}>Be someone’s tailor. Pay only for work you win.</h2>
        <p>
          One monthly plan, no commission, no per-quote fees. Quote as often as you like: a job comes out of your plan only when a customer books you.
          Rebooks from your own customers are always free, and unused jobs roll over for a month. Customers book for free, so nothing gets added to your price.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <Link className="btn btn-primary" href="/signup?as=tailor" style={{ background: "var(--paper)", color: "var(--ink)" }}>Join the Club</Link>
        </div>
      </div>
      <div className="stats">
        {TIERS.map((t) => (
          <div className="stat" key={t}>
            <b className="num">{planPriceLabel(t).replace("/month", "")}</b>
            {PLANS[t].name} · {planJobsLabel(t).toLowerCase()}
            {t === "UNLIMITED" && ", featured in search and first look at new jobs"}
          </div>
        ))}
        <div className="stat"><b className="num">0%</b>commission. Rebooks never count.</div>
      </div>
    </div>
  );
}
