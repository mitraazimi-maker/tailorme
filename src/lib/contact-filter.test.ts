import { describe, expect, it } from "vitest";
import { findContactDetails } from "./contact-filter";

describe("findContactDetails", () => {
  it.each([
    ["Call me on 0412 345 678", "a phone number"],
    ["ph (02) 9550-1234", "a phone number"],
    ["+61 412 345 678", "a phone number"],
    ["email linh@gmail.com", "an email address"],
    ["linh at gmail dot com", "an email address"],
    ["see www.linhalterations.com.au", "a website link"],
    ["linhalterations.com.au", "a website address"],
    ["find us on Instagram", "a social or messaging handle"],
    ["WhatsApp me", "a social or messaging handle"],
    ["follow @linh_sews", "a social handle"],
    ["DM me for a better price", "a request to message off tailor me"],
  ])("blocks %s", (text, what) => expect(findContactDetails(text)).toBe(what));

  it.each([
    "Navy work trousers, wool blend. Need 4 cm off for flat shoes.",
    "Inseam 78 cm, waist 82 cm, sleeve 61 cm",
    "Happy to keep the original hem. Drop off any weekday before 11.",
    "Ready by 12/10. $24 for both pairs.",
    "Message me through tailor me if the fit is off.",
    "Mon–Sat 9–5, Sun 10–4",
  ])("allows %s", (text) => expect(findContactDetails(text)).toBeNull());
});
