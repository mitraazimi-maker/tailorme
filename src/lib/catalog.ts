// Static catalogue: categories, wizard options, copy that must appear verbatim.

export const DISCLAIMER =
  "Quotes are a guide only. The tailor must inspect the garment and how it is made before confirming the final price.";

export const INTRO =
  "tailor me introduces you to independent tailors. Any agreement, the work and payment are between you and the tailor. tailor me is not a party to that agreement.";

export const ACKNOWLEDGEMENT =
  "I understand quotes are a guide only and the final price is confirmed after the tailor inspects my garment. I understand the work and payment are arranged directly with the tailor, not with tailor me.";

export const BOOKING_FEE_CENTS = 500;
export const CLUB_PRICE_LABEL = "$10/month";
export const MAX_QUOTES_PER_JOB = 3;
export const MAX_PHOTOS = 6;

export type Pattern = [name: string, a: string, b: string];

export const CATEGORIES = [
  { id: "hems", name: "Hems & shortening", range: "$14 – $40", desc: "Trousers, dresses, skirts, sleeves", pat: ["linen", "#E7E2D6", "#CFC8B6"] },
  { id: "fit", name: "Take in / let out", range: "$25 – $70", desc: "Waists, side seams, shirts", pat: ["pinstripe", "#2B3245", "#8A93A8"] },
  { id: "zips", name: "Zips & buttons", range: "$10 – $45", desc: "Broken zips, missing buttons", pat: ["houndstooth", "#1E2230", "#E9E5DA"] },
  { id: "repair", name: "Repairs & mending", range: "$12 – $50", desc: "Tears, holes, split seams", pat: ["herringbone", "#5B4636", "#7A604B"] },
  { id: "denim", name: "Jeans & denim", range: "$18 – $38", desc: "Original hems, crotch repairs", pat: ["denim", "#2D4A7A", "#4E6EA3"] },
  { id: "uniform", name: "School & work uniforms", range: "$12 – $30", desc: "Hems, name tags, patches", pat: ["tartan", "#1F4D3A", "#E2B33A"] },
  { id: "home", name: "Curtains & homewares", range: "$25 – $90", desc: "Curtain hems, cushion covers", pat: ["check", "#DCE5F2", "#6E8BBE"] },
  { id: "express", name: "Same-day express", range: "+30% rush", desc: "Need it by tonight", pat: ["check", "#E9DCC6", "#B08A52"] },
] as const satisfies readonly { id: string; name: string; range: string; desc: string; pat: Pattern }[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as CategoryId[];
export const catName = (id: string) => CATEGORIES.find((c) => c.id === id)?.name ?? id;
export const isCategory = (id: string): id is CategoryId => (CATEGORY_IDS as string[]).includes(id);

export const QUICK_JOBS: [label: string, cat: CategoryId][] = [
  ["Hem trousers", "hems"],
  ["Take in a dress", "fit"],
  ["Replace a zip", "zips"],
  ["Fix a tear", "repair"],
  ["Shorten jeans", "denim"],
  ["School uniform", "uniform"],
  ["Curtain hems", "home"],
];

export const GARMENTS: [string, string][] = [
  ["Trousers / jeans", "Hems, waist, zip"],
  ["Dress / skirt", "Shorten, take in"],
  ["Shirt / top", "Sleeves, taper"],
  ["Jacket / coat", "Sleeves, zip, buttons"],
  ["Knitwear / activewear", "Holes, seams"],
  ["School / work uniform", "Hems, patches"],
  ["Curtains / homewares", "Hems, covers"],
  ["Bag / accessory", "Straps, zips"],
  ["Other", "Tell us below"],
];

export const WORK: [string, string][] = [
  ["Shorten / hem", ""],
  ["Take in", ""],
  ["Let out", ""],
  ["Replace zip", ""],
  ["Repair a tear", ""],
  ["Buttons / small fix", ""],
  ["Patch or darn", ""],
  ["Not sure", "Ask a tailor"],
];

export const TIMING: [string, string][] = [
  ["This week", "Rush fees may apply"],
  ["Within 2 weeks", "Most common"],
  ["For a date", "Wedding, event"],
  ["Flexible", "Best prices"],
];

export const FITTING: [string, string][] = [
  ["At the studio", "I’ll drop it off"],
  ["Come to me", "Home fitting"],
  ["No fitting needed", "Measurement is enough"],
];

export const PRICE_GUIDE: [job: string, median: number, lo: number, hi: number][] = [
  ["Trouser hem", 20, 14, 35],
  ["Jeans hem, original kept", 24, 18, 38],
  ["Dress or skirt hem", 32, 22, 48],
  ["Take in at side seams", 40, 25, 70],
  ["Zip replacement", 28, 10, 45],
  ["Patch or darn a hole", 18, 12, 35],
  ["School uniform hem", 12, 10, 20],
  ["Curtain hem (per panel)", 30, 25, 60],
];

/** Which category a posted job is routed to. */
export function categoryFor(garment: string, work: string): CategoryId {
  if (garment === "School / work uniform") return "uniform";
  if (garment === "Curtains / homewares") return "home";
  if (garment === "Trousers / jeans" && work === "Shorten / hem") return "hems";
  switch (work) {
    case "Shorten / hem":
      return "hems";
    case "Take in":
    case "Let out":
      return "fit";
    case "Replace zip":
    case "Buttons / small fix":
      return "zips";
    default:
      return "repair";
  }
}

const BASE: Record<string, [number, number]> = {
  "Shorten / hem": [14, 40],
  "Take in": [25, 70],
  "Let out": [25, 60],
  "Replace zip": [18, 45],
  "Repair a tear": [12, 40],
  "Buttons / small fix": [8, 20],
  "Patch or darn": [12, 35],
  "Not sure": [15, 60],
};

/** Guide price range in whole dollars, rounded to $5. */
export function estimate(garment: string, work: string, timing: string): [number, number] {
  const base = BASE[work] ?? [15, 60];
  let m = garment === "Jacket / coat" ? 1.4 : garment === "Curtains / homewares" ? 1.5 : 1;
  if (timing === "This week") m *= 1.25;
  const r = (v: number) => Math.round((v * m) / 5) * 5;
  return [r(base[0]), r(base[1])];
}
