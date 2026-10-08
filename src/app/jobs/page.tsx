import Link from "next/link";
import { redirect } from "next/navigation";
import { Status } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "My jobs" };

export default async function MyJobs() {
  const user = await requireUser("/jobs");
  if (user.tailor) redirect("/tailor");
  const jobs = await db.job.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    include: { photos: { take: 1 }, _count: { select: { quotes: true } }, booking: { include: { tailor: { select: { businessName: true } } } } },
  });
  return (
    <div className="wrap page">
      <div className="tabs"><Link href="/jobs" aria-current="page">My jobs</Link><Link href="/jobs/profile">Fit profile &amp; my tailors</Link></div>
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
