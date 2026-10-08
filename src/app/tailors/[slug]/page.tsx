import Link from "next/link";
import { notFound } from "next/navigation";
import { Disclaimer, Flags, IntroNote, Stars } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { catName } from "@/lib/catalog";
import { db } from "@/lib/db";
import { fabric, money } from "@/lib/fabric";
import { getTailorBySlug, replyLabel } from "@/lib/tailors";
import { toggleMyTailor } from "@/app/actions/customer";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const t = await db.tailorProfile.findUnique({ where: { slug: (await params).slug }, select: { businessName: true, suburb: true } });
  return { title: t ? `${t.businessName}, ${t.suburb}` : "Tailor" };
}

export default async function Profile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getUser();
  const data = await getTailorBySlug(slug, user?.suburb ?? null);
  // Lapsed members aren't listed, but their own page stays visible to them.
  if (!data || (data.profile.clubStatus !== "ACTIVE" && data.profile.userId !== user?.id)) notFound();
  const { profile: t, card, sub } = data;
  const isMine = user ? !!(await db.myTailor.findUnique({ where: { customerId_tailorId: { customerId: user.id, tailorId: t.id } } })) : false;
  const reply = replyLabel(card.replyMins);
  const subs: [string, number | null][] = [["Fit & finish", sub.fitFinish], ["On time", sub.onTime], ["Quote accuracy", sub.quoteAccuracy]];

  return (
    <div className="view wrap">
      <Link className="crumb" href="/tailors" style={{ display: "inline-block" }}>← All tailors</Link>
      <div className="prof-hero" style={{ background: fabric(card.pat) }} />
      <div className="prof-grid">
        <div className="prof-main">
          <div className="prof-title">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Flags t={card} /></div>
            <h1 style={{ marginTop: 12 }}>{t.businessName}</h1>
            <div className="row">
              <Stars rating={card.rating} />
              {card.reviews > 0 && <span className="num">{card.reviews} review{card.reviews === 1 ? "" : "s"}</span>}
              <span>· {t.suburb}{card.km != null && <>, <span className="num">{card.km} km</span></>}</span>
              {t.yearsExperience != null && <span className="num">· {t.yearsExperience} yrs experience</span>}
            </div>
            {t.bio && <p style={{ marginTop: 16, maxWidth: "62ch", fontSize: 17 }}>{t.bio}</p>}
            <div className="tags" style={{ marginTop: 12 }}>{t.categories.map((c) => <span key={c} className="tag">{catName(c)}</span>)}</div>
          </div>

          {t.services.length > 0 && (
            <div>
              <h2>Services &amp; prices</h2>
              <div className="svc">
                {t.services.map((s) => (
                  <div className="it" key={s.id}>
                    <div>{s.name}{s.note && <small>{s.note}</small>}</div>
                    <span className="dots" />
                    <span className="pr">{s.priceCents != null ? money(s.priceCents) : s.priceText}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}><Disclaimer /></div>
            </div>
          )}

          <div>
            <h2>Reviews</h2>
            {card.rating == null ? (
              <p className="muted">No reviews yet. Reviews come only from customers who booked through tailor me.</p>
            ) : (
              <>
                <div className="score">
                  <div className="big num">{card.rating.toFixed(1)}</div>
                  <div className="bars">
                    {subs.map(([l, v]) => (
                      <div key={l}><span>{l}</span><div className="bar"><i style={{ left: 0, width: `${((v ?? 0) / 5) * 100}%` }} /></div><span className="num">{(v ?? 0).toFixed(1)}</span></div>
                    ))}
                  </div>
                </div>
                {t.reviews.map((r) => (
                  <div className="review" key={r.id}>
                    <div className="h"><b>{r.customer.firstName}</b><span aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></div>
                    <div className="job">Booked through tailor me · {r.booking.job.work} · {r.booking.job.garment}</div>
                    <p>{r.body}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <aside className="book">
          <div className="eyebrow">Request a quote</div>
          <h3>{reply ? `Usually replies in ${reply}` : "Replies within two hours in opening hours"}</h3>
          <div className="facts">
            <div><small>From</small><b className="num">{money(card.fromCents)}</b></div>
            <div><small>Fittings</small><b>{t.comesToCustomer ? "Studio or home" : "At studio"}</b></div>
            <div><small>Rush jobs</small><b>{t.sameDay ? "Same day" : "Not offered"}</b></div>
            <div><small>Speaks</small><b>{t.languages.join(", ") || "English"}</b></div>
          </div>
          {t.openingHours && <p className="small muted">Hours: {t.openingHours}</p>}
          {user?.id !== t.userId && (
            <>
              <Link className="btn btn-primary" href={`/post?tailor=${t.slug}`}>Get a quote from {t.businessName.split(" ")[0].replace(/’s$|'s$/, "")}</Link>
              <form action={toggleMyTailor}>
                <input type="hidden" name="tailorId" value={t.id} />
                <input type="hidden" name="slug" value={t.slug} />
                <button className="btn btn-ghost" style={{ width: "100%" }}>{isMine ? "★ Your tailor" : "Make them my tailor"}</button>
              </form>
            </>
          )}
          <div className="mytailor"><span>Your tailor sees your fit notes and past jobs, so rebooking is quick.</span></div>
          <Disclaimer />
          <p style={{ fontSize: 13, color: "var(--ink-2)" }}>tailor me charges a flat $5 booking fee when you accept a quote. </p>
          <IntroNote className="small muted" />
        </aside>
      </div>
    </div>
  );
}
