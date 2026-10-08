import Link from "next/link";
import ClubPitch from "@/components/ClubPitch";

export const metadata = { title: "For tailors" };

export default function ForTailors() {
  return (
    <div className="wrap page">
      <ClubPitch />
      <div className="steps" style={{ marginTop: 48 }}>
        <div className="step"><span className="n">Step 1</span><h3>Set up your profile</h3><p>Your services, your prices, your suburb. Add your ABN and we check it on ABN Lookup.</p></div>
        <div className="step"><span className="n">Step 2</span><h3>Quote on local jobs</h3><p>Every job comes with photos. Reply with a guide price and a ready date. Confirm the final price once you see the garment.</p></div>
        <div className="step"><span className="n">Step 3</span><h3>Get booked</h3><p>The customer pays tailor me $5 to book you and gets your details. They pay you directly for the work. No commission.</p></div>
      </div>
      <div className="standard" style={{ marginTop: 48 }}>
        <div><div className="eyebrow" style={{ color: "var(--tape)" }}>The tailor me standard</div><h2 style={{ marginTop: 12 }}>Four things Club members agree to.</h2><p>Kept short on purpose.</p></div>
        <ul className="std-list">
          <li><b>A reply within two hours</b><span>during opening hours, with a guide price and a ready date.</span></li>
          <li><b>Ready when promised</b><span>or a message before the day.</span></li>
          <li><b>Pressed and ready to wear</b><span>on pickup.</span></li>
          <li><b>Remembers your fit</b><span>measurements and past jobs are saved, so rebooking is quick.</span></li>
        </ul>
      </div>
      <p style={{ marginTop: 32 }}><Link className="btn btn-primary" href="/signup?as=tailor">Create your tailor account</Link></p>
      <p className="intro-note">Tailors are independent businesses, not employees or agents of tailor me. tailor me introduces customers and is not a party to the agreement between you and your customer.</p>
    </div>
  );
}
