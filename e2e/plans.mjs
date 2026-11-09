// Tailor-only pricing (9 Nov 2026): free booking for customers, Club plans with monthly
// jobs won, free rebooks, out of jobs blocks new quotes, extra jobs and upgrading unblock,
// the Featured add-on and its per-suburb cap.
import { PrismaClient } from "@prisma/client";
import { BASE, SHOTS, book, check, done, login, phone, postJob, sendQuote, shows } from "./lib.mjs";

const db = new PrismaClient();
const jobsLeft = async (t) => {
  await t.goto(BASE + "/tailor");
  const txt = await t.locator(".credits b").first().textContent();
  return Number(txt.match(/^(\d+) of/)[1]);
};
const uniform = { garment: "School / work uniform", work: "Shorten / hem", description: "Two school dresses to take up 5 cm each." };

// --- Customers see that booking is free; no fee anywhere ---
const c = await login("customer@example.com", phone);
await c.goto(BASE + "/");
check(await shows(c, "Booking is free"), "home page says booking is free", "no free message on home");
const job1 = await postJob(c, uniform);
check(!(await c.locator("text=/booking fee/i").count()), "no booking fee on the job page", "booking fee still shown");

// --- Kogarah (Starter) quotes; winning the job uses one of their jobs ---
const k = await login("kogarah@example.com", phone);
const before = await jobsLeft(k);
check(await shows(k, "Starter"), "dashboard shows the Starter plan", "plan name missing");
await k.goto(`${BASE}/tailor/jobs/${job1}`);
check(await shows(k, "If they book you, this uses 1 of your"), "quote form says a booking uses a job", "no credit hint on quote form");
await k.screenshot({ path: SHOTS + "plans-quote-400.png", fullPage: true });
check(await sendQuote(k, job1, 45), "Starter tailor can quote", "quote refused");
check((await jobsLeft(k)) === before, "sending a quote uses nothing", "quote used a job");
await c.goto(`${BASE}/jobs/${job1}`);
check(await shows(c, "Booking is free"), "quotes say booking is free", "no free note under quotes");
await book(c, job1);
check(await shows(c, "You’re booked with Kogarah"), "booked instantly, no checkout", "booking not confirmed");
check(await shows(c, "@example.com"), "tailor's contact details shared on booking", "contact not shared");
check((await jobsLeft(k)) === before - 1, `winning the booking used one job (${before} → ${before - 1})`, "booking didn't use a job");
await k.screenshot({ path: SHOTS + "plans-dashboard-400.png", fullPage: true });

// --- A rebook is free for the tailor too ---
await c.goto(BASE + "/tailors/kogarah-uniforms-alterations");
await c.locator("aside.book").getByRole("link", { name: "Rebook" }).click();
await c.waitForURL(/rebook=1/);
const rebook = await postJob(c, { ...uniform, description: "Same again for the younger one, 4 cm.", url: "/post?tailor=kogarah-uniforms-alterations&rebook=1" });
await k.goto(`${BASE}/tailor/jobs/${rebook}`);
check(await shows(k, "it won’t use one of your jobs"), "tailor told a rebook is free", "no rebook hint");
await sendQuote(k, rebook, 40);
await book(c, rebook);
check((await jobsLeft(k)) === before - 1, "rebook booked without using a job", "rebook used a job");

// --- Out of jobs: can't send new quotes; quotes already sent still bookable ---
const kog = await db.tailorProfile.findUniqueOrThrow({ where: { slug: "kogarah-uniforms-alterations" } });
const someone = await db.user.findFirstOrThrow({ where: { email: "ana@example.com" } }).catch(() => db.user.findFirstOrThrow({ where: { role: "CUSTOMER", email: { not: "customer@example.com" }, isSample: true } }));
for (let i = 0; i < before - 1; i++) {
  const j = await db.job.create({ data: { ref: `TM-E2E${i}${Date.now() % 1000}`, customerId: someone.id, garment: "Trousers / jeans", work: "Shorten / hem", category: "hems", description: "Filler job for the e2e run.", timing: "Within 2 weeks", suburb: "Kogarah", status: "BOOKED", acknowledgedAt: new Date(), isSample: true } });
  const q = await db.quote.create({ data: { jobId: j.id, tailorId: kog.id, priceCents: 2000, readyBy: new Date(Date.now() + 864e5), status: "ACCEPTED" } });
  await db.booking.create({ data: { jobId: j.id, quoteId: q.id, customerId: someone.id, tailorId: kog.id, status: "CONFIRMED" } });
}
check((await jobsLeft(k)) === 0, "used up all this month's jobs", "jobs not used up");
check(await shows(k, "You’ve used this month’s jobs"), "dashboard says they're out of jobs", "no out-of-jobs notice");
const job2 = await postJob(c, { ...uniform, description: "A work shirt, sleeves up 2 cm." });
await k.goto(`${BASE}/tailor/jobs/${job2}`);
check(await shows(k, "Buy extra jobs or upgrade your plan"), "can't quote with no jobs left", "quoted with no jobs left");
check((await k.locator("#price").count()) === 0, "quote form hidden", "quote form still shown");

// --- Extra jobs: $9 each, this month only ---
await k.goto(BASE + "/tailor");
await k.getByRole("button", { name: /Buy 1 extra job for \$9/ }).click();
await k.waitForURL(/dev\/checkout\?extras=/);
check(await shows(k, "$9"), "checkout charges $9 for one extra job", "wrong extra job price");
await k.getByRole("button", { name: /Pay \$9/ }).click();
await k.waitForURL(/extras=1/);
check(await shows(k, "Extra jobs added"), "extra job confirmed", "extra job not confirmed");
check((await jobsLeft(k)) === 1, "one job left after buying one extra", "extra job not counted");
check(await sendQuote(k, job2, 30), "can quote again with an extra job", "still blocked after buying extras");

// --- Upgrade to Pro: takes effect at once ---
await k.goto(BASE + "/tailor");
await k.getByRole("button", { name: "Switch to Pro" }).click();
await k.waitForURL(/tier=/);
check(await shows(k, "You’re on Pro"), "switched to Pro", "tier not switched");
check((await jobsLeft(k)) > 1, "Pro allowance applies straight away", "Pro allowance missing");

// --- Featured add-on: max 3 per suburb ---
const others = await db.tailorProfile.findMany({ where: { slug: { in: ["ricci-alterations", "sew-mended", "bondi-quick-stitch"] } } });
await db.tailorProfile.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { suburb: "Kogarah", featuredStatus: "ACTIVE" } });
await k.goto(BASE + "/tailor");
check(await shows(k, "All 3 spots in Kogarah are taken"), "Featured full in Kogarah: no spot offered", "cap not shown");
check((await k.getByRole("button", { name: "Add Featured" }).count()) === 0, "no Add Featured button when full", "could add Featured past the cap");
await db.tailorProfile.update({ where: { id: others.at(0).id }, data: { featuredStatus: "CANCELED" } });
await k.reload();
check(await shows(k, "1 of 3 spots left in Kogarah"), "a spot opens when one stops", "spot count wrong");
await k.getByRole("button", { name: "Add Featured" }).click();
await k.waitForURL(/dev\/checkout\?featured=1/);
await k.getByRole("button", { name: "Subscribe" }).click();
await k.waitForURL(/featured=1/);
check(await shows(k, "You’re Featured"), "Featured added", "Featured not added");
await k.screenshot({ path: SHOTS + "plans-featured-400.png", fullPage: true });
await c.goto(BASE + "/tailors?suburb=Kogarah");
const card = c.locator('a[href="/tailors/kogarah-uniforms-alterations"]').first();
check((await card.locator("text=Featured").count()) > 0, "shown with the Featured label in search", "no Featured label");
await k.goto(BASE + "/tailor");
await k.getByRole("button", { name: "Stop Featured" }).click();
await k.waitForURL(/featured=stopped/);
check(await shows(k, "Featured is off"), "Featured stopped", "couldn't stop Featured");

// --- Tailor-facing pricing ---
const anon = await (await (await import("./lib.mjs")).browser.newContext({ viewport: phone })).newPage();
await anon.goto(BASE + "/for-tailors");
for (const t of ["$39", "$79", "$169", "$309", "$9", "$99", "Pay only for work you win"]) check(await shows(anon, t), `for-tailors shows ${t}`, `for-tailors missing ${t}`);
await anon.screenshot({ path: SHOTS + "plans-for-tailors-400.png", fullPage: true });

const admin = await login("admin@example.com");
await admin.goto(BASE + "/admin");
check(await shows(admin, "a month in memberships"), "admin shows monthly membership revenue", "no MRR on admin");

await db.$disconnect();
await done();
