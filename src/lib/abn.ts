// ABN checks. The badge says "ABN checked" and nothing stronger (rule 5).

const WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

export const normaliseAbn = (abn: string) => abn.replace(/\s+/g, "");

/** ATO checksum: subtract 1 from the first digit, weight, sum, divisible by 89. */
export function isValidAbn(input: string): boolean {
  const abn = normaliseAbn(input);
  if (!/^\d{11}$/.test(abn)) return false;
  const digits = abn.split("").map(Number);
  digits[0] -= 1;
  return digits.reduce((sum, d, i) => sum + d * WEIGHTS[i], 0) % 89 === 0;
}

export const formatAbn = (abn: string) => normaliseAbn(abn).replace(/^(\d{2})(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3 $4");

export type AbnLookup = { active: boolean; entityName: string | null } | null;

/**
 * Looks the ABN up on the ABR JSON web service. Returns null when no GUID is
 * configured or the service can't be reached, so an admin checks it by hand.
 */
export async function lookupAbn(abn: string): Promise<AbnLookup> {
  const guid = process.env.ABN_LOOKUP_GUID;
  if (!guid) return null;
  try {
    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${normaliseAbn(abn)}&guid=${encodeURIComponent(guid)}&callback=cb`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    // Response is JSONP: cb({...})
    const json = JSON.parse(text.replace(/^cb\(/, "").replace(/\);?\s*$/, ""));
    if (json.Message) return { active: false, entityName: null };
    return { active: json.AbnStatus === "Active", entityName: json.EntityName || null };
  } catch {
    return null;
  }
}
