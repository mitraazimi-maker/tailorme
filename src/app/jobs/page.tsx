import Link from "next/link";
import { redirect } from "next/navigation";
import { Status } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { pointsBalance } from "@/lib/bookings";
import { db } from "@/lib/db";
import { POINTS_PER_BOOKING, POINTS_PER_REBOOK, VOUCHER_POINTS, progressLabel } from "@/lib/rewards";

export const metadata = { title: "My jobs" };

export default async function MyJobs() {
  const user = await requireUser("/jobs");
  if (user.tailor) redirect("/tailor");
  const balance = await pointsBalance(user.id);
  const jobs = await db.job.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { photos: { take: 1 }, _count: { select: { quotes: true } }, booking: { include: { tailor: { select: { businessName: true } } } } },
  });
  return (
    <div className="wrap page">
      <div className="tabs"><Link href="/jobs" aria-current="page">My jobs</Link><Link href="/jobs/profile">Fit profile &amp; my tailors</Link></div>
      <div className="notice" style={{ marginBottom: 20, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px" }}>
          <b style={{ color: "var(--ink)" }}>tailor me rewards · {balance} point{balance === 1 ? "" : "s"}</b>
          <div>{progressLabel(balance)} Earn {POINTS_PER_BOOKING} points for every booking, {POINTS_PER_REBOOK} when you rebook your tailor.</div>
        </div>
        <div className="bar" style={{ flex: "0 0 160px", background: "var(--line)" }} aria-hidden="true">
          <i style={{ left: 0, width: `${Math.min(100, (balance / VOUCHER_POINTS) * 100)}%`, background: "var(--tape)" }} />
        </div>
      </div>
      <div className="page-head">
        <h1>My jobs</h1>
        <Link className="btn btn-primary btn-brand" href="/post" aria-label="Tailor me: post a new job">tailor <i>me</i></Link>
      </div>
      {jobs.length === 0 ? (
        <div className="empty">No jobs yet. Post one and local tailors will send guide quotes.</div>
      ) : (
        <div className="joblist">
          {jobs.map((j) => {
            const booked = j.booking && j.booking.status !== "PENDING_PAYMENT";
            return (
              <Link key={j.id} className="jobrow" href={`/jobs/${j.id}`}>
                {j.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/photos/${j.photos[0].id}`} alt="" />
                ) : <div className="ph" />}
                <div>
                  <div className="eyebrow">Job {j.ref} · {j.createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</div>
                  <h3>{j.work} · {j.garment}</h3>
                  <div className="small muted">{booked ? `Booked with ${j.booking!.tailor.businessName}` : `${j._count.quotes} quote${j._count.quotes === 1 ? "" : "s"}`}</div>
                </div>
                <Status s={j.status} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
