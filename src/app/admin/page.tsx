import Link from "next/link";
import { setAbnStatus } from "@/app/actions/admin";
import { Status } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { formatAbn } from "@/lib/abn";
import { db } from "@/lib/db";

export const metadata = { title: "Admin" };

export default async function Admin() {
  await requireAdmin();
  const [tailors, jobs, bookings, members] = await Promise.all([
    db.tailorProfile.findMany({ orderBy: [{ abnStatus: "asc" }, { createdAt: "desc" }], include: { user: { select: { email: true } } } }),
    db.job.count(),
    db.booking.count({ where: { paidAt: { not: null } } }),
    db.tailorProfile.count({ where: { clubStatus: "ACTIVE" } }),
  ]);
  return (
    <div className="wrap page">
      <div className="page-head"><h1>Admin</h1></div>
      <div className="row-wrap" style={{ marginBottom: 20 }}>
        <span className="pill">{members} Club members</span>
        <span className="pill">{jobs} jobs</span>
        <span className="pill">{bookings} paid bookings</span>
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
                <td><Status s={t.clubStatus} /></td>
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
