// Keeps contact details out of anything shown before a booking is paid
// (quotes, job descriptions, public profiles), so nobody can be reached
// around the booking fee. Contact details are shared automatically once a
// booking is paid. Pure and unit tested.

const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/i, "an email address"],
  [/\b(at|@)\s*(gmail|hotmail|outlook|yahoo|icloud|bigpond|live|me)\s*(dot|\.)\s*(com|net)/i, "an email address"],
  // Eight or more digits, allowing spaces, dashes, dots or brackets between them: phone numbers.
  [/(?:\+?\d[\s\-.()]*){8,}/, "a phone number"],
  [/\b(https?:\/\/|www\.)\S+/i, "a website link"],
  [/\b[\w-]+\.(com\.au|net\.au|org\.au|com|net|au|io|co|shop|store)\b/i, "a website address"],
  [/\b(whats\s?app|insta(gram)?|facebook|fb\.com|messenger|we\s?chat|telegram|signal|tiktok|snapchat|viber|line\s?id)\b/i, "a social or messaging handle"],
  [/(^|\s)@[A-Za-z0-9_.]{3,}/, "a social handle"],
  [/\b(dm|pm)\s+me\b/i, "a request to message off tailor me"],
];

/** Returns why the text is refused, or null if it's fine. */
export function findContactDetails(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const [re, what] of PATTERNS) if (re.test(text)) return what;
  return null;
}

/** A customer-facing explanation for a refusal. */
export const contactRefusal = (field: string, what: string) =>
  `Please take ${what} out of the ${field}. Contact details are shared automatically once a booking is confirmed, so everyone stays covered by tailor me.`;
