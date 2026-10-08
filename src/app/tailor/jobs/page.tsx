import Link from "next/link";
import { Status } from "@/components/ui";
import { requireTailor } from "@/lib/auth";
import { CATEGORIES, MAX_QUOTES_PER_JOB, catName, isCategory } from "@/lib/catalog";
import { db } from "@/lib/db";
import { isClubMember } from "@/lib/rules";
import { distanceKm } from "@/lib/suburbs";
import { TailorTabs } from "../TailorTabs";

export const metadata = { title: "Find jobs" };

const RADIUS_KM = 15;

export default async function JobFeed({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { tailor } = await requireTailor("/tailor/jobs");
  const { all } = await searchParams;
  const member = isClubMember(tailor);
  const cats = all || !tailor.categories.length ? CATEGORIES.map((c) => c.id) : tailor.categories.filter(isCategory);

  const jobs = await db.job.findMany({
    where: {
      status: "OPEN",
      customerId: { not: tailor.userId },
      OR: [{ category: { in: cats } }, { requestedTailorId: tailor.id }],
    },
    include: {
      photos: { take: 1 },
      quotes: { where: { status: { in: ["PENDING", "ACCEPTED"] } }, select: { tailorId: true } },
      customer: { select: { firstName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const visible = jobs
    .map((j) => ({ ...j, km: distanceKm(tailor.suburb, j.suburb) }))
    .filter((j) => j.requestedTailorId === tailor.id || all || j.km == null || j.km <= RADIUS_KM)
    .filter((j) => j.quotes.length < MAX_QUOTES_PER_JOB || j.quotes.some((q) => q.tailorId === tailor.id));

  return (
    <div className="wrap page">
      <TailorTabs current="/tailor/jobs" />
      <div className="page-head">
        <div><div className="eyebrow">Within {RADIUS_KM} km of {tailor.suburb}{all ? " · all categories, all distances" : ""}</div><h1 style={{ marginTop: 6 }}>Open jobs</h1></div>
        <Link className="btn btn-ghost btn-sm" href={all ? "/tailor/jobs" : "/tailor/jobs?all=1"}>{all ? "Just my services nearby" : "Show everything"}</Link>
      </div>
      {!member && (
        <p className="notice bad" style={{ marginBottom: 16 }}>
          You can see that jobs exist, but photos and quoting are for Club members. <Link className="link" href="/tailor">Join the Club</Link>.
        </p>
      )}
      {visible.length === 0 ? (
        <div className="empty">No open jobs right now. You’ll get an email when one comes in.</div>
      ) : (
        <div className="joblist">
          {visible.map((j) => {
            const quoted = j.quotes.some((q) => q.tailorId === tailor.id);
            return (
              <Link key={j.id} className="jobrow" href={`/tailor/jobs/${j.id}`}>
                {member && j.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/photos/${j.photos[0].id}`} alt="" />
                ) : <div className="ph" />}
                <div>
                  <div className="eyebrow">{j.customer.firstName} · {j.suburb}{j.km != null && ` · ${j.km} km`} · {j.timing}</div>
                  <h3>{j.work} · {j.garment}</h3>
                  <div className="small muted">
                    {catName(j.category)} · {j.quotes.length}/{MAX_QUOTES_PER_JOB} quotes
                    {j.requestedTailorId === tailor.id && " · asked for you"}
                  </div>
                </div>
                {quoted ? <Status s="PENDING" label="quoted" /> : <span className="btn btn-ink btn-sm">Quote</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
