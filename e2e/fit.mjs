// Fit record: the tailor records at the fitting, the customer owns it, every booked tailor sees it.
import { BASE, SHOTS, book, check, done, login, phone, postJob, sendQuote, shows } from "./lib.mjs";

const c = await login("customer@example.com", phone);
await c.goto(BASE + "/jobs/profile");
check(await shows(c, "Nothing yet. Your tailor adds"), "empty fit record explained", "no empty state");

const job1 = await postJob(c);
const linh = await login("linhs@example.com", phone);
await linh.goto(`${BASE}/tailor/jobs/${job1}`);
check((await linh.locator("#fit").count()) === 0, "no fit record before booking", "fit record shown before booking");
await sendQuote(linh, job1, 60);
await book(c, job1);
await linh.goto(`${BASE}/tailor/jobs/${job1}`);
check(await shows(linh, "No fit recorded for this job yet"), "tailor prompted to record the fit", "no prompt");
check((await linh.locator("#m_inseam").count()) && !(await linh.locator("#m_sleeve").count()), "trouser measurements offered (not sleeve)", "wrong fields");
await linh.fill("#m_inseam", "78.3");
await linh.fill("#m_waist", "82");
await linh.fill("#fitNotesIn", "Call me 0412 345 678");
await linh.getByRole("button", { name: "Save fit" }).click();
await linh.waitForURL(/error=/);
check(await shows(linh, "out of the fit notes"), "contact details blocked in fit notes", "leak not blocked");
await linh.fill("#m_inseam", "78.3");
await linh.fill("#m_waist", "82");
await linh.fill("#fitNotesIn", "Wears 5 cm heels with these.");
await linh.getByRole("button", { name: "Save fit" }).click();
await linh.waitForURL(/fit=1/);
check(await shows(linh, "Fit saved to Alex’s record"), "tailor saved the fit", "fit not saved");
check((await linh.inputValue("#m_inseam")) === "78.5", "rounded to half a cm and prefilled for correction", "not prefilled/rounded");
check((await linh.locator("text=No fit recorded for this job yet").count()) === 0, "prompt gone once recorded", "prompt still there");
await linh.screenshot({ path: SHOTS + "fit-tailor-400.png", fullPage: true });

await c.goto(BASE + "/jobs/profile");
check(await shows(c, "Measured by Linh"), "customer sees who measured", "customer can't see record");
check(await shows(c, "78.5 cm"), "customer sees the numbers", "numbers missing");

await c.goto(BASE + "/post?tailor=linhs-alteration-studio&rebook=1");
const again = c.getByRole("button", { name: "Start again" });
if (await again.waitFor({ timeout: 1500 }).then(() => true, () => false)) await again.click();
check(await shows(c, "your saved fit record (last measured"), "rebook form says the tailor will see the fit", "no fit notice on rebook");
await c.goto(BASE + "/tailors/linhs-alteration-studio");
check(await shows(c, "Your fit is saved on tailor me"), "tailor profile shows fit is saved", "no profile fit line");

const job2 = await postJob(c);
const mariam = await login("mariams@example.com");
await mariam.goto(`${BASE}/tailor/jobs/${job2}`);
check((await mariam.locator("text=Measured by").count()) === 0, "other tailor can't see the record before booking", "record leaked pre-booking");
await sendQuote(mariam, job2, 30);
await book(c, job2);
await mariam.goto(`${BASE}/tailor/jobs/${job2}`);
check(await shows(mariam, "Measured by Linh"), "new tailor starts from Linh's measurements", "record not portable");
check(await shows(mariam, "Wears 5 cm heels"), "notes carried over", "notes missing");

await c.goto(BASE + "/jobs/profile");
await c.getByRole("button", { name: /Remove the Trousers/ }).first().click();
await c.waitForURL(/removed=1/);
check(await shows(c, "Removed from your fit record"), "customer removed the entry", "remove failed");
await mariam.reload();
check((await mariam.locator("text=Measured by Linh").count()) === 0, "removed entry gone for tailors", "removed entry still visible");

await done();
