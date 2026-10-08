import "server-only";
import type { Prisma } from "@prisma/client";
import { catName } from "./catalog";
import { patternFor, type TailorCard } from "./tailor-display";

export { patternFor, replyLabel, type TailorCard } from "./tailor-display";
import { db } from "./db";
import { distanceKm } from "./suburbs";

/** Only Club members are listed publicly. */
const listed: Prisma.TailorProfileWhereInput = { clubStatus: "ACTIVE" };

async function decorate(rows: Prisma.TailorProfileGetPayload<{ include: { services: true } }>[], near: string | null): Promise<TailorCard[]> {
  const ids = rows.map((r) => r.id);
  const [ratings, quotes] = await Promise.all([
    db.review.groupBy({ by: ["tailorId"], where: { tailorId: { in: ids } }, _avg: { rating: true }, _count: true }),
    db.quote.findMany({
      where: { tailorId: { in: ids } },
      select: { tailorId: true, createdAt: true, job: { select: { createdAt: true } } },
      orderBy: { createdAt: "desc" },
      take: 50 * Math.max(ids.length, 1),
    }),
  ]);
  const replyBy = new Map<string, number[]>();
  for (const q of quotes) {
    const list = replyBy.get(q.tailorId) ?? [];
    if (list.length < 20) list.push((q.createdAt.getTime() - q.job.createdAt.getTime()) / 60000);
    replyBy.set(q.tailorId, list);
  }
  return rows.map((t) => {
    const r = ratings.find((x) => x.tailorId === t.id);
    const mins = replyBy.get(t.id) ?? [];
    const prices = t.services.map((s) => s.priceCents).filter((p): p is number => p != null);
    return {
      id: t.id,
      slug: t.slug,
      name: t.businessName,
      suburb: t.suburb,
      km: distanceKm(near, t.suburb),
      rating: r?._avg.rating ?? null,
      reviews: r?._count ?? 0,
      fromCents: prices.length ? Math.min(...prices) : null,
      // Median reply time, only once there's enough history to mean something.
      replyMins: mins.length >= 3 ? mins.sort((a, b) => a - b)[Math.floor(mins.length / 2)] : null,
      categories: t.categories,
      abnChecked: t.abnStatus === "CHECKED",
      comesToCustomer: t.comesToCustomer,
      sameDay: t.sameDay,
      bio: t.bio,
      pat: patternFor(t.categories),
    };
  });
}

export type Search = {
  q?: string;
  suburb?: string;
  cats?: string[];
  mobile?: boolean;
  express?: boolean;
  maxKm?: number;
  minRating?: number;
  sort?: "match" | "near" | "rating" | "price";
};

export async function searchTailors(s: Search): Promise<TailorCard[]> {
  const rows = await db.tailorProfile.findMany({
    where: {
      ...listed,
      ...(s.cats?.length ? { categories: { hasSome: s.cats } } : {}),
      ...(s.mobile ? { comesToCustomer: true } : {}),
      ...(s.express ? { sameDay: true } : {}),
    },
    include: { services: true },
  });
  let cards = await decorate(rows, s.suburb ?? null);

  const q = (s.q ?? "").toLowerCase().trim();
  if (q) {
    const words = q.split(/\s+/).filter((w) => w.length > 2).map((w) => w.replace(/s$/, ""));
    const hay = new Map(rows.map((t) => [t.id, [t.businessName, t.bio, ...t.services.map((x) => x.name), ...t.categories.map(catName)].join(" ").toLowerCase()]));
    if (words.length) cards = cards.filter((c) => words.some((w) => hay.get(c.id)!.includes(w)));
  }
  if (s.maxKm != null) cards = cards.filter((c) => c.km == null || c.km <= s.maxKm!);
  if (s.minRating) cards = cards.filter((c) => (c.rating ?? 0) >= s.minRating!);

  const score = (c: TailorCard) => (c.rating ?? 4) * Math.log(c.reviews + 2) - (c.km ?? 10) * 0.05;
  const sorts = {
    match: (a: TailorCard, b: TailorCard) => score(b) - score(a),
    near: (a: TailorCard, b: TailorCard) => (a.km ?? 999) - (b.km ?? 999),
    rating: (a: TailorCard, b: TailorCard) => (b.rating ?? 0) - (a.rating ?? 0),
    price: (a: TailorCard, b: TailorCard) => (a.fromCents ?? 1e9) - (b.fromCents ?? 1e9),
  };
  return cards.sort(sorts[s.sort ?? "match"]);
}

export async function getTailorBySlug(slug: string, near: string | null) {
  const t = await db.tailorProfile.findUnique({
    where: { slug },
    include: {
      services: { orderBy: { sortOrder: "asc" } },
      reviews: { orderBy: { createdAt: "desc" }, take: 20, include: { customer: { select: { firstName: true } }, booking: { select: { job: { select: { work: true, garment: true } } } } } },
    },
  });
  if (!t) return null;
  const [card] = await decorate([t], near);
  const agg = await db.review.aggregate({ where: { tailorId: t.id }, _avg: { fitFinish: true, onTime: true, quoteAccuracy: true } });
  return { profile: t, card, sub: agg._avg };
}

export async function slugFor(name: string) {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 48) || "tailor";
  for (let i = 0; ; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    if (!(await db.tailorProfile.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
}
