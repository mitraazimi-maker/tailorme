import type { ClubTier } from "@prisma/client";
import { PLANS, TIERS, planJobsLabel, planPriceLabel, resetLabel, type Credits } from "@/lib/plans";

/** "3 of 5 jobs left this month". */
export function CreditsMeter({ credits }: { credits: Credits }) {
  if (credits.unlimited) return <p className="small muted">Unlimited jobs. Win as many as you like.</p>;
  const total = credits.allowance + credits.carried;
  const pct = total ? Math.round((credits.left / total) * 100) : 0;
  return (
    <div className="credits">
      <div className="row-wrap" style={{ justifyContent: "space-between" }}>
        <b className="num">{credits.left} of {total} jobs left</b>
        <span className="small muted">Resets {resetLabel()}</span>
      </div>
      <div className="credits-bar" role="meter" aria-valuemin={0} aria-valuemax={total} aria-valuenow={credits.left} aria-label="Jobs left this month">
        <span style={{ width: `${pct}%` }} />
      </div>
      <p className="small muted">
        {credits.allowance} this month{credits.carried > 0 && ` + ${credits.carried} unused from last month`}. A job is used only when a customer books you. Rebooks from your own customers are free.
      </p>
    </div>
  );
}

/** The three tiers, each with its own button. `action` joins or switches. */
export function PlanCards({ current, action, verb }: { current: ClubTier | null; action: (f: FormData) => void | Promise<void>; verb: "join" | "switch" }) {
  return (
    <div className="plans">
      {TIERS.map((t) => {
        const p = PLANS[t];
        const isCurrent = current === t;
        return (
          <div key={t} className={`plan${isCurrent ? " current" : ""}`}>
            <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <b>{p.name}</b>
              <span className="num">{planPriceLabel(t)}</span>
            </div>
            <div className="small">{planJobsLabel(t)} won</div>
            {p.perks.length > 0 && <ul className="small muted">{p.perks.map((x) => <li key={x}>{x}</li>)}</ul>}
            {isCurrent ? (
              <span className="small muted">Your plan</span>
            ) : (
              <form action={action}>
                <input type="hidden" name="tier" value={t} />
                <button className={`btn btn-sm ${t === "PRO" ? "btn-primary" : "btn-ghost"}`} style={{ width: "100%" }}>
                  {verb === "join" ? `Join on ${p.name}` : `Switch to ${p.name}`}
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
