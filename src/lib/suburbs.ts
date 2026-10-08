// Sydney suburbs with approximate centroids, for distance matching.
// Good enough for a pilot in a handful of suburbs; swap for a geocoder later.

export const SUBURBS: Record<string, { postcode: string; lat: number; lng: number }> = {
  "Sydney": { postcode: "2000", lat: -33.8688, lng: 151.2093 },
  "Surry Hills": { postcode: "2010", lat: -33.8861, lng: 151.2111 },
  "Darlinghurst": { postcode: "2010", lat: -33.8790, lng: 151.2190 },
  "Paddington": { postcode: "2021", lat: -33.8840, lng: 151.2310 },
  "Woollahra": { postcode: "2025", lat: -33.8880, lng: 151.2440 },
  "Edgecliff": { postcode: "2027", lat: -33.8790, lng: 151.2360 },
  "Double Bay": { postcode: "2028", lat: -33.8770, lng: 151.2430 },
  "Bondi Junction": { postcode: "2022", lat: -33.8920, lng: 151.2480 },
  "Bondi": { postcode: "2026", lat: -33.8915, lng: 151.2767 },
  "Randwick": { postcode: "2031", lat: -33.9140, lng: 151.2410 },
  "Coogee": { postcode: "2034", lat: -33.9200, lng: 151.2550 },
  "Kensington": { postcode: "2033", lat: -33.9050, lng: 151.2240 },
  "Redfern": { postcode: "2016", lat: -33.8930, lng: 151.2040 },
  "Waterloo": { postcode: "2017", lat: -33.9000, lng: 151.2070 },
  "Alexandria": { postcode: "2015", lat: -33.9080, lng: 151.1940 },
  "Glebe": { postcode: "2037", lat: -33.8790, lng: 151.1860 },
  "Pyrmont": { postcode: "2009", lat: -33.8700, lng: 151.1940 },
  "Newtown": { postcode: "2042", lat: -33.8970, lng: 151.1790 },
  "Enmore": { postcode: "2042", lat: -33.9000, lng: 151.1730 },
  "Erskineville": { postcode: "2043", lat: -33.9020, lng: 151.1860 },
  "Marrickville": { postcode: "2204", lat: -33.9110, lng: 151.1550 },
  "Dulwich Hill": { postcode: "2203", lat: -33.9050, lng: 151.1390 },
  "Petersham": { postcode: "2049", lat: -33.8940, lng: 151.1550 },
  "Stanmore": { postcode: "2048", lat: -33.8940, lng: 151.1650 },
  "Annandale": { postcode: "2038", lat: -33.8820, lng: 151.1700 },
  "Leichhardt": { postcode: "2040", lat: -33.8840, lng: 151.1570 },
  "Balmain": { postcode: "2041", lat: -33.8580, lng: 151.1790 },
  "Rozelle": { postcode: "2039", lat: -33.8620, lng: 151.1710 },
  "Ashfield": { postcode: "2131", lat: -33.8880, lng: 151.1250 },
  "Summer Hill": { postcode: "2130", lat: -33.8910, lng: 151.1380 },
  "Five Dock": { postcode: "2046", lat: -33.8670, lng: 151.1290 },
  "Burwood": { postcode: "2134", lat: -33.8770, lng: 151.1040 },
  "Strathfield": { postcode: "2135", lat: -33.8730, lng: 151.0940 },
  "Concord": { postcode: "2137", lat: -33.8590, lng: 151.1030 },
  "Rhodes": { postcode: "2138", lat: -33.8300, lng: 151.0870 },
  "Parramatta": { postcode: "2150", lat: -33.8150, lng: 151.0010 },
  "Westmead": { postcode: "2145", lat: -33.8070, lng: 150.9870 },
  "Blacktown": { postcode: "2148", lat: -33.7710, lng: 150.9060 },
  "Auburn": { postcode: "2144", lat: -33.8490, lng: 151.0330 },
  "Bankstown": { postcode: "2200", lat: -33.9170, lng: 151.0350 },
  "Campsie": { postcode: "2194", lat: -33.9120, lng: 151.1030 },
  "Hurstville": { postcode: "2220", lat: -33.9670, lng: 151.1020 },
  "Kogarah": { postcode: "2217", lat: -33.9630, lng: 151.1330 },
  "Rockdale": { postcode: "2216", lat: -33.9520, lng: 151.1370 },
  "Mascot": { postcode: "2020", lat: -33.9270, lng: 151.1930 },
  "Maroubra": { postcode: "2035", lat: -33.9500, lng: 151.2430 },
  "Cronulla": { postcode: "2230", lat: -34.0550, lng: 151.1540 },
  "Miranda": { postcode: "2228", lat: -34.0340, lng: 151.1010 },
  "Liverpool": { postcode: "2170", lat: -33.9200, lng: 150.9230 },
  "Penrith": { postcode: "2750", lat: -33.7510, lng: 150.6940 },
  "North Sydney": { postcode: "2060", lat: -33.8390, lng: 151.2070 },
  "Neutral Bay": { postcode: "2089", lat: -33.8330, lng: 151.2180 },
  "Mosman": { postcode: "2088", lat: -33.8290, lng: 151.2440 },
  "Crows Nest": { postcode: "2065", lat: -33.8260, lng: 151.2040 },
  "St Leonards": { postcode: "2065", lat: -33.8230, lng: 151.1950 },
  "Chatswood": { postcode: "2067", lat: -33.7970, lng: 151.1830 },
  "Lane Cove": { postcode: "2066", lat: -33.8150, lng: 151.1680 },
  "Ryde": { postcode: "2112", lat: -33.8150, lng: 151.1050 },
  "Macquarie Park": { postcode: "2113", lat: -33.7770, lng: 151.1240 },
  "Epping": { postcode: "2121", lat: -33.7730, lng: 151.0820 },
  "Hornsby": { postcode: "2077", lat: -33.7040, lng: 151.0990 },
  "Castle Hill": { postcode: "2154", lat: -33.7300, lng: 151.0040 },
  "Manly": { postcode: "2095", lat: -33.7970, lng: 151.2880 },
  "Dee Why": { postcode: "2099", lat: -33.7510, lng: 151.2860 },
};

export const SUBURB_NAMES = Object.keys(SUBURBS).sort();

/** Case-insensitive lookup; accepts "Paddington, NSW 2021" style input. */
export function findSuburb(input: string | null | undefined): string | null {
  if (!input) return null;
  const head = input.split(",")[0].trim().toLowerCase();
  return SUBURB_NAMES.find((s) => s.toLowerCase() === head) ?? null;
}

/** Great-circle distance in km, rounded to 0.1. Null if either suburb is unknown. */
export function distanceKm(a: string | null | undefined, b: string | null | undefined): number | null {
  const sa = findSuburb(a), sb = findSuburb(b);
  if (!sa || !sb) return null;
  const p = SUBURBS[sa], q = SUBURBS[sb];
  const R = 6371, rad = Math.PI / 180;
  const dLat = (q.lat - p.lat) * rad, dLng = (q.lng - p.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(p.lat * rad) * Math.cos(q.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

export const suburbLabel = (s: string) => {
  const name = findSuburb(s);
  return name ? `${name}, NSW ${SUBURBS[name].postcode}` : s;
};
