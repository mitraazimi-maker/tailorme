// Contact-detail blocking, the Featured head start, exclusive rebooks, reports and suspension.
import { BASE, book, check, done, login, phone, postJob, sendQuote, shows } from "./lib.mjs";

const c = await login("customer@example.com", phone);
check((await postJob(c, { description: "Hem please, call me on 0412 345 678" })) === null, "job refused", "leaky job posted");
check(((await c.locator(".err").textContent()) ?? "").includes("phone number"), "phone number blocked in job description", "description leak not blocked");

// Head start skipped when no Featured tailor matches (no sample Featured tailor does uniforms).
const uniformJob = await postJob(c, { garment: "School / work uniform", description: "Two school dresses to take up 5 cm each." });
const kog = await login("kogarah@example.com");
await kog.goto(BASE + "/tailor/jobs");
check(await kog.locator(`a[href="/tailor/jobs/${uniformJob}"]`).count(), "no Featured match: Starter tailor sees the job at once", "Starter tailor held back with no Featured match");

const hemJob = await postJob(c);
const ricci = await login("ricci@example.com");
await ricci.goto(BASE + "/tailor/jobs");
check((await ricci.locator(`a[href="/tailor/jobs/${hemJob}"]`).count()) === 0, "Featured match: head start applies to Pro", "head start missing when Featured matches");
check(await shows(ricci, "Featured head start"), "held jobs explained", "no head start note");

const linh = await login("linhs@example.com");
check(!(await sendQuote(linh, hemJob, 60, "Text me on 0412 345 678 to sort it out")), "quote refused", "leaky quote sent");
check(await shows(linh, "take a phone number out of the quote message"), "phone number blocked in quote message", "quote leak not blocked");

await linh.goto(BASE + "/tailor/profile");
await linh.fill("#bio", "Find us on Instagram @linhsews");
await linh.getByRole("button", { name: "Save profile" }).click();
await linh.waitForURL(/error=/);
check(await shows(linh, "out of the intro"), "social handle blocked in profile intro", "bio leak not blocked");

check(await sendQuote(linh, hemJob, 60, "Happy to keep it neat."), "clean quote sent", "clean quote refused");
await book(c, hemJob);
check(await c.getByRole("link", { name: "Rebook" }).count(), "booked panel offers Rebook", "no Rebook after booking");

await c.goto(BASE + "/tailors/linhs-alteration-studio");
check(await c.locator("text=/Booked \\d+ times? through tailor me/").count(), "profile shows booking count", "no booking count");
await c.locator("aside.book").getByRole("link", { name: "Rebook" }).click();
await c.waitForURL(/rebook=1/);
check(await c.locator("text=Only they’ll see this job").count(), "wizard in rebook mode", "wizard not in rebook mode");
const rebookJob = await postJob(c, { garment: "Jacket / coat", work: "Replace zip", description: "Same jacket again, the other pocket zip has gone.", url: "/post?tailor=linhs-alteration-studio&rebook=1" });

const mariam = await login("mariams@example.com");
await mariam.goto(BASE + "/tailor/jobs?all=1");
check((await mariam.locator(`a[href="/tailor/jobs/${rebookJob}"]`).count()) === 0, "rebook hidden from other tailors (even Featured)", "rebook visible to other tailors");
await mariam.goto(`${BASE}/tailor/jobs/${rebookJob}`);
check(await mariam.locator("text=sent this job to their own tailor").count(), "other tailor's job page is gated", "rebook job page not gated");
await linh.goto(BASE + "/tailor/jobs");
check(await linh.locator("text=rebook from your customer").count(), "their tailor sees it labelled as a rebook", "rebook not labelled for tailor");
await sendQuote(linh, rebookJob, 120);
await book(c, rebookJob);

await c.goto(`${BASE}/jobs/${rebookJob}`);
await c.locator("summary", { hasText: "Report a problem" }).click();
await c.fill('textarea[name="details"]', "She said next time just text her directly and skip the app.");
await c.getByRole("button", { name: "Send report" }).click();
await c.waitForURL(/reported=1/);
check(await shows(c, "We’ll look into it"), "customer report filed", "report not filed");

const openJob = await postJob(c, { description: "One more pair, 2 cm off." });
await sendQuote(linh, openJob, 20);

const admin = await login("admin@example.com");
await admin.goto(BASE + "/admin#reports");
check(await shows(admin, "skip the app"), "admin sees the report", "report missing on admin page");
await admin.getByRole("button", { name: /Suspend 6 months/ }).click();
await admin.waitForLoadState("networkidle");
check(await shows(admin, "Write the reason"), "suspension needs a written reason", "suspended without a reason");
await admin.fill('textarea[name="note"]', "A customer told us you asked them to book outside tailor me.");
await admin.getByRole("button", { name: /Suspend 6 months/ }).click();
check(await shows(admin, "Suspended until"), "admin suspended the tailor", "suspension not applied");

await linh.goto(BASE + "/tailor");
check(await shows(linh, "Your Club membership is suspended until"), "tailor sees suspension and reason", "tailor not told");
await c.goto(BASE + "/tailors?suburb=Newtown");
check((await c.locator('a[href="/tailors/linhs-alteration-studio"]').count()) === 0, "suspended tailor hidden from search", "suspended tailor still listed");
await c.goto(`${BASE}/jobs/${openJob}`);
check((await c.getByRole("button", { name: /^Book / }).count()) === 0, "suspended tailor's pending quote withdrawn", "quote still bookable");

await done();
