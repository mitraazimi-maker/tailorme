import Link from "next/link";
import { DISCLAIMER, INTRO, catName } from "@/lib/catalog";
import { fabric, money } from "@/lib/fabric";
import { replyLabel, type TailorCard } from "@/lib/tailor-display";

/** Rule 2: shown wherever a price or quote appears. */
export function Disclaimer({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="disc" style={style}>
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 5v5M9 12.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span>{DISCLAIMER}</span>
    </div>
  );
}

/** Rule 4: introduction-service notice. */
export const IntroNote = ({ className = "intro-note" }: { className?: string }) => <p className={className}>{INTRO}</p>;

export const Wordmark = () => (
  <span className="wordmark">
    tailor <i>me</i>
  </span>
);

export function Stars({ rating, count }: { rating: number | null; count?: number }) {
  if (rating == null) return <span className="muted small">New on tailor me</span>;
  return (
    <span className="stars">
      <span className="s">★</span> {rating.toFixed(2)}
      {count != null && <span className="num muted" style={{ fontWeight: 400 }}> ({count})</span>}
    </span>
  );
}

export function Flags({ t }: { t: Pick<TailorCard, "abnChecked" | "sameDay" | "comesToCustomer"> }) {
  return (
    <>
      {t.abnChecked && <span className="pill good">✓ ABN checked</span>}
      {t.sameDay && <span className="pill">Same day</span>}
      {t.comesToCustomer && <span className="pill">Comes to you</span>}
    </>
  );
}

export function TailorTile({ t }: { t: TailorCard }) {
  const reply = replyLabel(t.replyMins);
  return (
    <Link className="tcard" href={`/tailors/${t.slug}`}>
      <div className="cover" style={{ background: fabric(t.pat) }}>
        <div className="badge-row"><Flags t={t} /></div>
      </div>
      <div className="body">
        <h3>{t.name}</h3>
        <div className="row">
          <span>{t.suburb}{t.km != null && <> · <span className="num">{t.km} km</span></>}</span>
          <Stars rating={t.rating} />
        </div>
        <div className="row">
          <span>{reply ? `Replies ${reply}` : ""}</span>
          {t.fromCents != null && <span className="num">From <b style={{ color: "var(--ink)" }}>{money(t.fromCents)}</b></span>}
        </div>
        <div className="tags">{t.categories.slice(0, 3).map((c) => <span key={c} className="tag">{catName(c)}</span>)}</div>
      </div>
    </Link>
  );
}

export function TailorRow({ t }: { t: TailorCard }) {
  const reply = replyLabel(t.replyMins);
  return (
    <Link className="lrow" href={`/tailors/${t.slug}`}>
      <div className="cover" style={{ background: fabric(t.pat) }} />
      <div className="info">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Flags t={t} /></div>
        <h3>{t.name}</h3>
        <div style={{ fontSize: 14, color: "var(--ink-2)" }}>
          <Stars rating={t.rating} count={t.reviews || undefined} /> · {t.suburb}
          {t.km != null && <> <span className="num">{t.km} km</span></>}
          {reply && <> · replies {reply}</>}
        </div>
        <p className="bio">{t.bio}</p>
      </div>
      <div className="side">
        {t.fromCents != null && <div className="from">From<b>{money(t.fromCents)}</b></div>}
        <span className="btn btn-ink btn-sm">View</span>
      </div>
    </Link>
  );
}

const STATUS_CLASS: Record<string, string> = {
  OPEN: "open", BOOKED: "booked", CONFIRMED: "confirmed", COMPLETED: "confirmed", ACTIVE: "active",
  PENDING_PAYMENT: "warn", PAST_DUE: "warn", CANCELLED: "", CANCELED: "", PENDING: "open", ACCEPTED: "confirmed", DECLINED: "", WITHDRAWN: "",
};
export const Status = ({ s, label }: { s: string; label?: string }) => (
  <span className={`status ${STATUS_CLASS[s] ?? ""}`}>{label ?? s.replace(/_/g, " ").toLowerCase()}</span>
);
