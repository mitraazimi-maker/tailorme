// Shared helpers for the browser checks. Run against a server on :3000 with fresh
// sample data: `npm run db:seed && node e2e/<file>.mjs`. Prints ALL PASSED or FAILED.
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

// Use the project's Playwright if installed, otherwise the machine's global one.
const { chromium } = await import("playwright").catch(() => createRequire(execSync("npm root -g").toString().trim() + "/")("playwright"));

export const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
export const SHOTS = new URL("./shots/", import.meta.url).pathname;
const PHOTO = new URL("./fixtures/garment.png", import.meta.url).pathname;
const exe = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
export const browser = await chromium.launch(await import("node:fs").then((fs) => (fs.existsSync(exe) ? { executablePath: exe } : {})));

export const log = (...a) => console.log("✓", ...a);
export const fail = (m) => { console.error("✗", m); process.exitCode = 1; };
export const check = (cond, ok, bad) => (cond ? log(ok) : fail(bad));
export const shows = (page, text) => page.locator(`text=${text}`).first().waitFor({ timeout: 5000 }).then(() => true, () => false);
export const phone = { width: 400, height: 860 };

export async function login(email, viewport = { width: 1280, height: 900 }) {
  const p = await (await browser.newContext({ viewport })).newPage();
  p.on("pageerror", (e) => fail("page error on " + p.url() + ": " + e.message.slice(0, 100)));
  await p.goto(BASE + "/login");
  await p.fill("#email", email);
  await p.fill("#password", "password123");
  await p.getByRole("button", { name: "Log in" }).click();
  await p.waitForLoadState("networkidle");
  return p;
}

/** Posts a job through the wizard. Returns the job id, or null if posting was refused (the form stays open). */
export async function postJob(p, { garment = "Trousers / jeans", work = "Shorten / hem", description = "Work trousers, 3 cm off, wool blend.", suburb = "Newtown", url = "/post" } = {}) {
  await p.goto(BASE + url);
  const again = p.getByRole("button", { name: "Start again" });
  if (await again.waitFor({ timeout: 1500 }).then(() => true, () => false)) await again.click();
  const esc = (s) => new RegExp(s.replace(/[/]/g, "\\/"));
  await p.getByRole("button", { name: esc(garment) }).click();
  await p.getByRole("button", { name: esc(work) }).click();
  await p.setInputFiles("#wPhotos", PHOTO);
  await p.fill("#wDetails", description);
  await p.getByRole("button", { name: "Continue" }).click();
  await p.waitForTimeout(250);
  if (((await p.locator(".err").first().textContent()) ?? "").trim()) return null;
  await p.getByRole("button", { name: /Within 2 weeks/ }).click();
  await p.fill("#wWhere", suburb);
  await p.getByRole("button", { name: "Continue" }).click();
  await p.getByRole("button", { name: "Continue" }).click();
  await p.check("#wAck");
  await p.getByRole("button", { name: /post this job/ }).click();
  await p.waitForURL(/\/jobs\/\w+\?posted=1/);
  return p.url().split("?")[0].split("/").pop();
}

export async function sendQuote(t, jobId, price, message = "") {
  await t.goto(`${BASE}/tailor/jobs/${jobId}`);
  await t.fill("#price", String(price));
  await t.fill("#readyBy", new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10));
  if (message) await t.fill("#message", message);
  await t.getByRole("button", { name: "Send quote" }).click();
  await t.waitForURL(/quoted=1|error=/);
  return t.url().includes("quoted=1");
}

/** Customer books the (first) pending quote on a job. Booking is free: no checkout. */
export async function book(c, jobId) {
  await c.goto(`${BASE}/jobs/${jobId}`);
  await c.getByRole("button", { name: /^Book / }).first().click();
  await c.waitForURL(/booked=1/);
}

export async function done() {
  await browser.close();
  console.log(process.exitCode ? "FAILED" : "ALL PASSED");
}
