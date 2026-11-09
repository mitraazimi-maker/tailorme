import type { ClubTier } from "@prisma/client";
import {
  EXTRA_JOB_CENTS,
  EXTRA_JOB_PACKS,
  FEATURED,
  PLANS,
  TIERS,
  extraJobsCents,
  money0,
  planJobsLabel,
  planPriceLabel,
  resetLabel,
  type Credits,
} from "@/lib/plans";

type Action = (f: FormData) => void | Promise<void>;

/** "3 of 10 jobs left this month". */
export function CreditsMeter({ credits }: { credits: Credits }) {
  const total = credits.allowance + credits.carried + credits.extras;
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
        {credits.allowance} this month
        {credits.carried > 0 && ` + ${credits.carried} unused from last month`}
        {credits.extras > 0 && ` + ${credits.extras} extra`}. A job is used only when a customer books you. Rebooks from your own customers are free.
      </p>
    </div>
  );
}

/** Extra jobs for this month, so a tailor never has to stop quoting. */
export function ExtraJobsForm({ action }: { action: Action }) {
  return (
    <form action={action} className="extras">
      <div className="small"><b>Need more this month?</b> Extra jobs are {money0(EXTRA_JOB_CENTS)} each, valid until {resetLabel()}.</div>
      <div className="row-wrap">
        {EXTRA_JOB_PACKS.map((n) => (
          <button key={n} className="btn btn-ghost btn-sm" name="jobs" value={n} aria-label={`Buy ${n} extra job${n === 1 ? "" : "s"} for ${money0(extraJobsCents(n))}`}>
            +{n} · {money0(extraJobsCents(n))}
          </button>
        ))}
      </div>
    </form>
  );
}

/** The four plans, each with its own button. `action` joins or switches. */
export function PlanCards({ current, action, verb }: { current: ClubTier | null; action: Action; verb: "join" | "switch" }) {
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
            <div className="small">{planJobsLabel(t)} won · ${(p.priceCents / p.jobs / 100).toFixed(2)} a job</div>
            {isCurrent ? (
              <span className="small muted">Your plan</span>
            ) : (
              <form action={action}>
                <input type="hidden" name="tier" value={t} />
                <button className={`btn btn-sm ${t === "PRO" && !current ? "btn-primary" : "btn-ghost"}`} style={{ width: "100%" }}>
                  {verb === "join" ? `Join on ${p.name}` : `Switch to ${p.name}`}
                </button>
              </form>
            )}
          </div>
        );
      })}
      <p className="small muted">Past your plan’s jobs, buy extra jobs at {money0(EXTRA_JOB_CENTS)} each, or move up a plan.</p>
    </div>
  );
}

/** The Featured add-on card: on any plan, capped per suburb. */
export function FeaturedCard({
  active,
  renewsAt,
  spotsLeft,
  suburb,
  join,
  stop,
  canJoin,
}: {
  active: boolean;
  renewsAt: Date | null;
  spotsLeft: number;
  suburb: string;
  join: Action;
  stop: Action;
  canJoin: boolean;
}) {
  return (
    <div className={`plan${active ? " current" : ""}`}>
      <div className="row-wrap" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <b>Featured add-on</b>
        <span className="num">{money0(FEATURED.priceCents)}/month</span>
      </div>
      <ul className="small muted">{FEATURED.perks.map((x) => <li key={x}>{x}</li>)}</ul>
      {active ? (
        <>
          <span className="small">You’re Featured{renewsAt && ` · renews ${renewsAt.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`}.</span>
          <form action={stop}><button className="btn btn-ghost btn-sm">Stop Featured</button></form>
        </>
      ) : (
        <>
          <span className="small">
            {spotsLeft > 0
              ? `${spotsLeft} of ${FEATURED.perSuburb} spots left in ${suburb}.`
              : `All ${FEATURED.perSuburb} spots in ${suburb} are taken.`}
          </span>
          {canJoin && spotsLeft > 0 && <form action={join}><button className="btn btn-primary btn-sm" style={{ width: "100%" }}>Add Featured</button></form>}
        </>
      )}
    </div>
  );
}
