// Pilot tailors: an admin picks up to 15; their plan is free for the first 2 months.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BASE, SHOTS, check, done, login, phone, shows } from "./lib.mjs";

const db = new PrismaClient();
const mrr = async (page) => {
  await page.goto(BASE + "/admin");
  return (await page.locator("text=/a month in memberships/").first().textContent()).trim();
};

// A new tailor who hasn't joined the Club yet.
const email = `pilot${Date.now()}@example.com`;
await db.user.create({
  data: {
    email, firstName: "Nina", role: "TAILOR", isSample: true, passwordHash: await bcrypt.hash("password123", 10),
    tailor: { create: { slug: `pilot-test-${Date.now()}`, businessName: "Pilot Test Alterations", suburb: "Newtown", languages: ["English"], categories: ["hems"], isSample: true } },
  },
});

const admin = await login("admin@example.com");
await admin.goto(BASE + "/admin");
check(await shows(admin, "Pilot (0/15)"), "admin sees pilot count 0/15", "no pilot column");
await admin.getByRole("button", { name: "Make Pilot Test Alterations a pilot tailor" }).click();
await admin.waitForLoadState("networkidle");
check(await shows(admin, "Free 2 months from joining"), "new tailor marked as pilot; free period starts when they join", "pilot not marked");
check(await shows(admin, "Pilot (1/15)"), "count goes up", "count not updated");
const before = await mrr(admin);

const t = await login(email, phone);
await t.goto(BASE + "/tailor");
check(await shows(t, "You’re a tailor me pilot tailor"), "tailor told they're a pilot", "no pilot notice");
await t.getByRole("button", { name: "Join on Pro · 2 months free" }).click();
await t.waitForURL(/dev\/checkout\?club=pro/);
check(await shows(t, "$0 today"), "checkout charges nothing today", "pilot charged at checkout");
check(await shows(t, "then $59/month"), "checkout says what it costs after", "price after trial missing");
await t.getByRole("button", { name: "Subscribe" }).click();
await t.waitForURL(/club=1/);
check(await shows(t, "as a pilot tailor, then $59/month"), "dashboard shows the free period and the price after", "free period not shown");
await t.screenshot({ path: SHOTS + "pilot-dashboard-400.png", fullPage: true });
check((await mrr(admin)) === before, "free plans don't count towards monthly revenue", "free plan counted as revenue");

// An existing paying member picked for the pilot: free from now.
await admin.goto(BASE + "/admin");
await admin.getByRole("button", { name: "Make Ricci Alterations a pilot tailor" }).click();
await admin.waitForLoadState("networkidle");
const ricci = await login("ricci@example.com");
await ricci.goto(BASE + "/tailor");
check(await shows(ricci, "as a pilot tailor, then $59/month"), "existing member's next 2 months are free", "existing member not made free");

// The cap: 15 pilots, then no more buttons.
for (let i = 0; i < 10; i++)
  await db.user.create({
    data: {
      email: `filler${i}-${Date.now()}@example.com`, firstName: "Filler", role: "TAILOR", isSample: true, passwordHash: "x",
      tailor: { create: { slug: `filler-${i}-${Date.now()}`, businessName: `Filler ${i}`, suburb: "Newtown", languages: ["English"], categories: [], isSample: true } },
    },
  });
const rest = await db.tailorProfile.findMany({ where: { pilot: false }, select: { id: true } });
const need = 15 - (await db.tailorProfile.count({ where: { pilot: true } }));
await db.tailorProfile.updateMany({ where: { id: { in: rest.slice(0, need).map((r) => r.id) } }, data: { pilot: true } });
await admin.goto(BASE + "/admin");
check(await shows(admin, "Pilot (15/15)"), "pilot full at 15", "count wrong at the cap");
check((await db.tailorProfile.count({ where: { pilot: false } })) > 0, "there are still tailors not in the pilot", "test setup wrong");
check((await admin.getByRole("button", { name: /a pilot tailor$/ }).count()) === 0, "no \"Make pilot\" buttons once the pilot is full", "could add a 16th pilot");

await db.$disconnect();
await done();
