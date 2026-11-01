// Pickup & delivery is a tailor's own service, at their own price, paid to them
// directly. These rules only decide where it's offered. Pure and unit tested.
import { distanceKm } from "./suburbs";

type PickupTailor = { offersPickup: boolean; pickupFeeCents: number | null; pickupRadiusKm: number; suburb: string };

/** Whether the tailor collects from this suburb. Unknown distances are treated as out of range. */
export function picksUpFrom(t: PickupTailor, suburb: string | null | undefined): boolean {
  if (!t.offersPickup) return false;
  const km = distanceKm(t.suburb, suburb);
  return km != null && km <= t.pickupRadiusKm;
}

/** "Free" for $0, otherwise "$15". */
export const pickupPriceLabel = (cents: number | null | undefined) =>
  !cents ? "free" : `$${(cents / 100).toLocaleString("en-AU", { maximumFractionDigits: 2 })}`;

export const PICKUP_RADII_KM = [3, 5, 8, 12, 20];

/** Every tailor who offers pickup includes this (decided 1 Nov 2026). */
export const HOME_FITTING = "Free fitting at home: pinned on you when it’s collected, and the fit checked when it comes back.";
export const PICKUP_NAME = "Pickup, delivery & home fitting";
