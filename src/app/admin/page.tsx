import Link from "next/link";
import { liftSuspension, resolveReport, setAbnStatus } from "@/app/actions/admin";
import { Status } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatAbn } from "@/lib/abn";
import { db } from "@/lib/db";
import { SUSPENSION_MONTHS } from "@/lib/catalog";
import { activeMemberWhere, isClubMember, isSuspended } from "@/lib/rules";
import { PLANS } from "@/lib/plans";

export const metadata = { title: "Admin" };

export default async function Admin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const { error } = await searchParams;
  const [tailors, jobs, bookings, members, reports, history] = await Promise.all([
    db.tailorProfile.findMany({ orderBy: [{ abnStatus: "asc" }, { createdAt: "desc" }], include: { user: { select: { email: true } } } }),
    db.job.count(),
    db.booking.count({ where: { status: { in: ["CONFIRMED", "COMPLETED"] } } }),
    db.tailorProfile.count({ where: activeMemberWhere() }),
    db.conductReport.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "asc" },
      include: { tailor: true, customer: { select: { firstName: true, email: true } }, booking: { include: { job: true } } },
    }),
    db.conductReport.groupBy({ by: ["tailorId", "status"], where: { status: { not: "OPEN" } }, _count: true }),
  ]);
  // Monthly recurring revenue: every active member's plan price.
  const mrr = tailors.filter((t) => isClubMember(t)).reduce((sum, t) => sum + PLANS[t.clubTier].priceCents, 0);
  const past = (tailorId: string) =>
    history.filter((h) => h.tailorId === tailorId && h.status !== "DISMISSED").map((h) => `${h._count} ${h.status.toLowerCase()}`).join(", ") || "none";
  return (
    <div className="wrap page">
      <div className="page-head"><h1>Admin</h1></div>
      <div className="row-wrap" style={{ marginBottom: 20 }}>
        <span className="pill">{members} Club members</span>
        <span className="pill">{jobs} jobs</span>
        <span className="pill">{bookings} bookings</span>
        <span className="pill">${(mrr / 100).toLocaleString("en-AU")} a month in memberships</span>
        <span className={`pill ${reports.length ? "y" : ""}`}>{reports.length} open report{reports.length === 1 ? "" : "s"}</span>
      </div>
      {error && <p className="notice bad" role="alert" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="panel" id="reports" style={{ marginBottom: 16 }}>
        <h2>Reports: booking outside tailor me</h2>
        <p className="small muted" style={{ marginBottom: 12 }}>
          Only customers with a paid booking can report. Check before acting: ask the tailor for their side if it isn’t clear.
          Whatever you write as the reason is sent to the tailor, so don’t name the customer. Suspension is {SUSPENSION_MONTHS} months,
          withdraws their open quotes and cancels their Club billing.
        </p>
        {reports.length === 0 ? (
          <p className="muted">Nothing to review.</p>
        ) : (
          reports.map((r) => (
            <form key={r.id} action={resolveReport} className="stack" style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 14 }}>
              <input type="hidden" name="reportId" value={r.id} />
              <div className="row-wrap" style={{ justifyContent: "space-between" }}>
                <b><Link className="link" href={`/tailors/${r.tailor.slug}`}>{r.tailor.businessName}</Link></b>
                <span className="small muted">Previous outcomes: {past(r.tailorId)}</span>
              </div>
              <div className="small muted">
                From {r.customer.firstName} ({r.customer.email}) · {r.createdAt.toLocaleDateString("en-AU")}
                {r.booking && ` · job ${r.booking.job.ref}, ${r.booking.job.work} · ${r.booking.job.garment}`}
              </div>
              <p style={{ whiteSpace: "pre-wrap" }}>{r.details}</p>
              <textarea className="inp" name="note" placeholder="Reason the tailor will see (needed to warn or suspend)" style={{ minHeight: 70 }} />
              <div className="row-wrap">
                <button className="btn btn-ghost btn-sm" name="decision" value="DISMISSED">Dismiss</button>
                <button className="btn btn-ghost btn-sm" name="decision" value="WARNED">Warn</button>
                <button className="btn btn-primary btn-sm" name="decision" value="SUSPENDED">Suspend {SUSPENSION_MONTHS} months</button>
              </div>
            </form>
          ))
        )}
      </div>
      <div className="panel" style={{ overflowX: "auto" }}>
        <h2>Tailors</h2>
        <p className="small muted" style={{ marginBottom: 12 }}>
          Check each ABN on <a className="link" href="https://abr.business.gov.au/" target="_blank" rel="noreferrer">ABN Lookup</a>: it must be active and the name should match. Only then mark it checked. The badge reads “ABN checked”, nothing stronger.
        </p>
        <table className="table">
          <thead><tr><th>Tailor</th><th>ABN</th><th>Club</th><th>ABN check</th></tr></thead>
          <tbody>
            {tailors.map((t) => (
              <tr key={t.id}>
                <td><Link className="link" href={`/tailors/${t.slug}`}>{t.businessName}</Link><div className="muted">{t.suburb} · {t.user.email}{t.isSample && " · sample"}</div></td>
                <td className="mono">{t.abn ? formatAbn(t.abn) : "—"}{t.abnEntityName && <div className="muted">{t.abnEntityName}</div>}</td>
                <td>
                  <Status s={t.clubStatus} />
                  {t.clubStatus === "ACTIVE" && <div className="muted" style={{ marginTop: 4 }}>{t.clubTier === "UNLIMITED" ? "Unlimited" : t.clubTier === "PRO" ? "Pro" : "Starter"}</div>}
                  {isSuspended(t) && (
                    <form action={liftSuspension} style={{ marginTop: 6 }}>
                      <input type="hidden" name="tailorId" value={t.id} />
                      <div className="form-error">Suspended until {t.suspendedUntil!.toLocaleDateString("en-AU")}</div>
                      <button className="btn btn-ghost btn-sm">Lift suspension</button>
                    </form>
                  )}
                </td>
                <td>
                  <form action={setAbnStatus} className="row-wrap">
                    <input type="hidden" name="tailorId" value={t.id} />
                    <Status s={t.abnStatus === "CHECKED" ? "ACTIVE" : t.abnStatus === "FAILED" ? "PAST_DUE" : "PENDING"} label={t.abnStatus.toLowerCase()} />
                    {t.abn && t.abnStatus !== "CHECKED" && <button className="btn btn-ghost btn-sm" name="status" value="CHECKED">Mark checked</button>}
                    {t.abn && t.abnStatus !== "FAILED" && <button className="btn btn-ghost btn-sm" name="status" value="FAILED">Mark failed</button>}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
