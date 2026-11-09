// The job form: photo rule, sign up inside the form, existing customers, saved drafts, pickup.
import { BASE, SHOTS, book, browser, check, done, login, phone, sendQuote, shows } from "./lib.mjs";

const PHOTO = new URL("./fixtures/garment.png", import.meta.url).pathname;
const fresh = async () => {
  const p = await (await browser.newContext({ viewport: phone })).newPage();
  p.on("pageerror", (e) => console.error("✗ page error", e.message.slice(0, 100)));
  return p;
};
const err = async (p) => ((await p.locator(".err").first().textContent()) ?? "").trim();

/** Steps 0–3 (garment, work, photo + description, timing + suburb). Lands on the account step. */
async function fillJob(p, { photo = true, pickup = false, description = "Work trousers, 3 cm off, wool blend." } = {}) {
  await p.goto(BASE + "/post");
  const again = p.getByRole("button", { name: "Start again" });
  if (await again.waitFor({ timeout: 1500 }).then(() => true, () => false)) await again.click();
  await p.getByRole("button", { name: /Trousers \/ jeans/ }).click();
  await p.getByRole("button", { name: /Shorten \/ hem/ }).click();
  if (photo) await p.setInputFiles("#wPhotos", PHOTO);
  await p.fill("#wDetails", description);
  await p.getByRole("button", { name: "Continue" }).click();
  if (!photo) return;
  await p.getByRole("button", { name: /Within 2 weeks/ }).click();
  await p.fill("#wWhere", "Newtown");
  if (pickup) await p.check("#wPickup");
  await p.getByRole("button", { name: "Continue" }).click();
}
async function finish(p) {
  await p.check("#wAck");
  await p.getByRole("button", { name: /post this job/ }).click();
}

// --- Rule 1: no photo, no job ---
const a = await fresh();
await fillJob(a, { photo: false });
check((await err(a)).toLowerCase().includes("photo"), "can't continue without a photo", "posted past the photo step");

// --- New customer signs up inside the form; no log-in prompt, free to book ---
const n = await fresh();
await fillJob(n);
check((await n.locator("text=Already have an account").count()) === 0, "no log-in prompt in the form", "log-in prompt still in the form");
await n.fill("#wName", "Sam");
await n.fill("#wEmail", `sam${Date.now()}@example.com`);
await n.fill("#wPass", "password123");
await n.getByRole("button", { name: "Continue" }).click();
check(await shows(n, "Free to post and free to book"), "review step says it's free", "no free note on review");
await finish(n);
await n.waitForURL(/posted=1/);
check(true, "new customer posted a job in one go");

// --- Existing customer who types their password: logged in and posted ---
const e = await fresh();
await fillJob(e);
await e.fill("#wName", "Alex");
await e.fill("#wEmail", "customer@example.com");
await e.fill("#wPass", "password123");
await e.getByRole("button", { name: "Continue" }).click();
await finish(e);
await e.waitForURL(/posted=1/);
check(true, "existing customer with the right password posted without a prompt");

// --- Wrong password: log in right there, nothing lost ---
const w = await fresh();
await fillJob(w, { description: "Jeans, take up 2 cm, keep the original hem." });
await w.fill("#wName", "Alex");
await w.fill("#wEmail", "customer@example.com");
await w.fill("#wPass", "wrongpassword");
await w.getByRole("button", { name: "Continue" }).click();
await finish(w);
check(await shows(w, "There’s already an account for"), "asked to log in inside the form", "no inline login");
await w.fill("#wLoginPass", "password123");
await w.getByRole("button", { name: "Log in and post my job" }).click();
await w.waitForURL(/posted=1/);
check(await shows(w, "keep the original hem"), "job posted with everything entered", "answers lost on login");

// --- Draft: answers survive a reload (not photos) ---
const d = await fresh();
await fillJob(d, { description: "Silk dress, shorten 6 cm, hand finish." });
await d.reload();
check(await shows(d, "We’ve kept your answers"), "draft restored after reload", "draft lost");
check(await shows(d, "Photos can’t be saved"), "told to add photos again", "no photo note");
check((await d.inputValue("#wDetails")) === "Silk dress, shorten 6 cm, hand finish.", "description kept", "description lost");
await d.getByRole("button", { name: "Start again" }).click();
check((await d.locator("text=We’ve kept your answers").count()) === 0, "Start again clears it", "draft not cleared");

// --- Pickup: the tailor's price shows on the quote, paid to the tailor; booking still free ---
const c = await login("customer@example.com", phone);
await fillJob(c, { pickup: true, description: "Suit trousers, please come and pin them." });
await c.getByRole("button", { name: "Continue" }).click();
await finish(c);
await c.waitForURL(/posted=1/);
const job = c.url().split("?")[0].split("/").pop();
const mariam = await login("mariams@example.com");
await mariam.goto(`${BASE}/tailor/jobs/${job}`);
check((await mariam.inputValue("#pickupFee")) === "15", "Mariam's usual pickup price prefilled", "pickup price not prefilled");
await sendQuote(mariam, job, 35);
await c.goto(`${BASE}/jobs/${job}`);
check(await shows(c, "+ $15 for tailor me at home"), "customer sees the pickup price", "pickup price missing");
await book(c, job);
check(await shows(c, "tailor me at home"), "booked with pickup", "pickup not on booking");
await c.screenshot({ path: SHOTS + "post-pickup-booked-400.png", fullPage: true });

await done();
