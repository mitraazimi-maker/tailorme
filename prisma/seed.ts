// Development seed: the made-up tailors from the prototype, flagged isSample.
// Never run against production. Real reviews only come from real bookings (rule 6).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed sample data in production.");
  process.exit(1);
}

const db = new PrismaClient();
const PASSWORD = "password123";

type S = [name: string, note: string, price: number | string];
const TAILORS: {
  slug: string; name: string; first: string; suburb: string; years: number; cats: string[]; mobile: boolean; express: boolean;
  langs: string[]; bio: string; svc: S[];
}[] = [
  { slug: "linhs-alteration-studio", name: "Linh’s Alteration Studio", first: "Linh", suburb: "Marrickville", years: 12, cats: ["hems", "denim", "zips", "express"], mobile: false, express: true, langs: ["English", "Vietnamese"],
    bio: "Fast, fair, no fuss. Jeans hemmed with the original hem kept, zips swapped while you wait, and same-day turnaround on most jobs before 11am.",
    svc: [["Jeans hem, original hem kept", "", 24], ["Zip replacement (trousers)", "", 28], ["Zip replacement (jacket)", "", 45], ["Same-day rush", "Drop off before 11am", "+30%"]] },
  { slug: "mariams-sewing-room", name: "Mariam’s Sewing Room", first: "Mariam", suburb: "Paddington", years: 22, cats: ["hems", "fit", "repair"], mobile: true, express: false, langs: ["English", "Arabic"],
    bio: "Home-based seamstress around the corner from Oxford Street. Dress and skirt hems, taking in, and small repairs. Will pick up from nearby streets.",
    svc: [["Dress or skirt hem", "", 30], ["Take in at side seams", "", 40], ["Shorten sleeves", "", 28], ["Repair split seam", "", 16]] },
  { slug: "ricci-alterations", name: "Ricci Alterations", first: "Paolo", suburb: "Leichhardt", years: 31, cats: ["hems", "fit", "zips"], mobile: false, express: true, langs: ["English", "Italian"],
    bio: "Work trousers and suit pants hemmed properly, waists taken in, jacket sleeves shortened. Most jobs ready in two days.",
    svc: [["Trouser hem (plain or cuffed)", "", 18], ["Trouser waist take-in", "", 30], ["Jacket sleeves shortened", "", 50], ["Replace trouser zip", "", 26]] },
  { slug: "sew-mended", name: "Sew Mended", first: "Jess", suburb: "Newtown", years: 7, cats: ["repair", "zips", "home"], mobile: false, express: false, langs: ["English"],
    bio: "Darning, patching and mending for clothes you want to keep wearing. Knitwear holes, torn pockets, and cushion covers.",
    svc: [["Darn a hole (knitwear)", "Per hole", 15], ["Patch a tear", "", 22], ["Replace pocket lining", "", 25], ["Button set replaced", "Up to 6", 12]] },
  { slug: "bondi-quick-stitch", name: "Bondi Quick Stitch", first: "Ana", suburb: "Bondi Junction", years: 9, cats: ["hems", "denim", "repair", "express"], mobile: false, express: true, langs: ["English", "Portuguese"],
    bio: "Hems, jeans and activewear in the Westfield precinct. Drop off on your way in, pick up on your way out.",
    svc: [["Jeans hem", "", 20], ["Activewear repair", "Seams and small tears", 18], ["Shorten dress", "", 32], ["Same-day rush", "", "+30%"]] },
  { slug: "kogarah-uniforms-alterations", name: "Kogarah Uniforms & Alterations", first: "Eleni", suburb: "Kogarah", years: 15, cats: ["uniform", "hems", "zips"], mobile: false, express: false, langs: ["English", "Greek"],
    bio: "School uniforms hemmed in bulk before term starts, plus work shirts and hi-vis repairs for local businesses.",
    svc: [["School uniform hem", "Per item", 12], ["School uniform bundle", "5 items", 50], ["Sew on patches or badges", "Per item", 8], ["Work shirt repair", "", 15]] },
  { slug: "parramatta-mend-hem", name: "Parramatta Mend & Hem", first: "Priya", suburb: "Parramatta", years: 11, cats: ["hems", "fit", "home"], mobile: true, express: false, langs: ["English", "Hindi", "Tamil"],
    bio: "Everyday alterations and curtain hemming across Western Sydney. Blouse and kurta adjustments too.",
    svc: [["Curtain hem", "Per panel", 28], ["Blouse take-in", "", 30], ["Trouser hem", "", 16], ["Cushion cover made", "", 25]] },
  { slug: "chen-express-alterations", name: "Chen Express Alterations", first: "Wei", suburb: "Chatswood", years: 16, cats: ["hems", "fit", "zips", "express", "uniform"], mobile: false, express: true, langs: ["English", "Mandarin", "Cantonese"],
    bio: "Open 7 days in the shopping centre. Hems in an hour, suit pants next day, uniforms in bulk for schools and businesses.",
    svc: [["Trouser hem, 1 hour", "", 18], ["Dress shorten", "", 35], ["School uniform bundle", "5 items", 60], ["Suit trousers taper", "", 40]] },
];

const REVIEWS: [first: string, garment: string, work: string, rating: number, body: string][] = [
  ["Hannah", "Dress / skirt", "Shorten / hem", 5, "Dropped off Monday, ready Tuesday. The hem is invisible and she pressed it too."],
  ["Daniel", "Trousers / jeans", "Shorten / hem", 5, "Three pairs of work pants hemmed for $54. Should have done this years ago."],
  ["Priya", "Jacket / coat", "Replace zip", 5, "Zip replaced while I had a coffee. Cheaper than I expected."],
  ["Marco", "Trousers / jeans", "Shorten / hem", 4, "Kept the original hem so you can’t tell. Took a day longer than quoted but messaged me ahead of time."],
  ["Sophie", "Knitwear / activewear", "Patch or darn", 5, "My favourite jumper had three moth holes. You honestly can’t find them now."],
];

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 11);

  // Wipe previous sample data only.
  await db.user.deleteMany({ where: { isSample: true } });

  const customers = await Promise.all(
    REVIEWS.map(([first]) =>
      db.user.create({ data: { email: `${first.toLowerCase()}@example.com`, firstName: first, passwordHash: hash, suburb: "Paddington", isSample: true } }),
    ),
  );
  await db.user.create({ data: { email: "customer@example.com", firstName: "Alex", passwordHash: hash, suburb: "Paddington", isSample: true } });

  let n = 0;
  for (const [ti, t] of TAILORS.entries()) {
    const user = await db.user.create({
      data: {
        email: `${t.slug.split("-")[0]}@example.com`,
        firstName: t.first,
        passwordHash: hash,
        role: "TAILOR",
        isSample: true,
        tailor: {
          create: {
            slug: t.slug, businessName: t.name, suburb: t.suburb, bio: t.bio, yearsExperience: t.years, languages: t.langs, categories: t.cats,
            comesToCustomer: t.mobile, sameDay: t.express, clubStatus: "ACTIVE", abnStatus: "CHECKED", abn: "51824753556", abnCheckedAt: new Date(),
            openingHours: "Mon–Sat 9–5", isSample: true,
            services: { create: t.svc.map(([name, note, p], i) => ({ name, note: note || null, priceCents: typeof p === "number" ? p * 100 : null, priceText: typeof p === "string" ? p : null, sortOrder: i })) },
          },
        },
      },
      include: { tailor: true },
    });
    const tailor = user.tailor!;

    // Three past bookings with reviews per tailor, so profiles have something to show.
    for (let k = 0; k < 3; k++) {
      const [, garment, work, rating, body] = REVIEWS[(ti + k) % REVIEWS.length];
      const customer = customers[(ti + k) % customers.length];
      const created = new Date(Date.now() - (30 + n) * 864e5);
      const job = await db.job.create({
        data: {
          ref: `TM-${String(10000 + n++)}`, customerId: customer.id, garment, work, category: t.cats[0], description: "Sample job for development.",
          timing: "Within 2 weeks", suburb: customer.suburb!, status: "BOOKED", acknowledgedAt: created, createdAt: created, isSample: true,
        },
      });
      const quote = await db.quote.create({
        data: { jobId: job.id, tailorId: tailor.id, priceCents: (20 + k * 6) * 100, readyBy: new Date(created.getTime() + 3 * 864e5), status: "ACCEPTED", createdAt: new Date(created.getTime() + (10 + ti * 7) * 60000) },
      });
      const booking = await db.booking.create({
        data: { jobId: job.id, quoteId: quote.id, customerId: customer.id, tailorId: tailor.id, feeCents: 500, status: "COMPLETED", paidAt: created, completedAt: created },
      });
      await db.review.create({
        data: { bookingId: booking.id, tailorId: tailor.id, customerId: customer.id, rating, fitFinish: rating, onTime: Math.max(rating - (k === 1 ? 1 : 0), 1), quoteAccuracy: 5, body },
      });
    }
  }
  console.log(`Seeded ${TAILORS.length} sample tailors. Log in with any of them, or customer@example.com, password "${PASSWORD}".`);
}

main().finally(() => db.$disconnect());
