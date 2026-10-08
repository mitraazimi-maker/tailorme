import Link from "next/link";

export default function ClubPitch() {
  return (
    <div className="maker">
      <div>
        <div className="eyebrow" style={{ color: "var(--tape)" }}>The tailor me Club · for tailors &amp; seamstresses</div>
        <h2 style={{ marginTop: 10 }}>Be someone’s tailor. $10 a month.</h2>
        <p>No lead fees and no commission. Quote as many jobs as you like and keep every dollar you charge. Customers pay tailor me a flat $5 when they book you, so there’s nothing taken from your price.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <Link className="btn btn-primary" href="/signup?as=tailor" style={{ background: "var(--paper)", color: "var(--ink)" }}>Join the Club · $10/month</Link>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><b className="num">$10</b>a month to join the Club</div>
        <div className="stat"><b className="num">0%</b>commission on your work</div>
        <div className="stat"><b className="num">∞</b>quotes, no lead fees</div>
        <div className="stat"><b className="num">$5</b>paid by the customer, not you</div>
      </div>
    </div>
  );
}
