// Customer rewards: points on bookings made through tailor me, spent as vouchers
// off the booking fee (never off the tailor's price, which is paid to them directly).
// Pure and unit tested.

export const POINTS_PER_BOOKING = 10;
/** Rebooking your own tailor through the app earns double: it's the booking most likely to go direct. */
export const POINTS_PER_REBOOK = 20;
export const VOUCHER_POINTS = 50;
export const VOUCHER_CENTS = 500;
/** Stripe's minimum charge in AUD. A smaller remainder is waived rather than charged. */
const STRIPE_MIN_CENTS = 50;

export const pointsEarned = (isRepeat: boolean) => (isRepeat ? POINTS_PER_REBOOK : POINTS_PER_BOOKING);

/**
 * The voucher applied to a booking fee, given the points the customer can spend.
 * Applied automatically when they have enough. If what's left would be under
 * Stripe's minimum charge, the voucher covers the whole fee.
 */
export function voucherFor(spendablePoints: number, feeCents: number): number {
  if (spendablePoints < VOUCHER_POINTS) return 0;
  const left = feeCents - VOUCHER_CENTS;
  return left < STRIPE_MIN_CENTS ? feeCents : VOUCHER_CENTS;
}

/** Progress text, e.g. "30 of 50 points to a $5 voucher". */
export function progressLabel(balance: number) {
  if (balance >= VOUCHER_POINTS) return `You have a $${VOUCHER_CENTS / 100} voucher ready for your next booking fee.`;
  return `${balance} of ${VOUCHER_POINTS} points to a $${VOUCHER_CENTS / 100} voucher.`;
}
