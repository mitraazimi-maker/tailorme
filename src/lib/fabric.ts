// Fabric-pattern swatches (CSS backgrounds) that stand in for photos.
import type { Pattern } from "./catalog";

const FAB: Record<string, (a: string, b: string) => string> = {
  pinstripe: (a, b) => `repeating-linear-gradient(90deg,${a} 0 14px,${b} 14px 15px)`,
  houndstooth: (a, b) => `conic-gradient(from 45deg at 50% 50%,${a} 0 25%,${b} 0 50%,${a} 0 75%,${b} 0) 0 0/16px 16px`,
  herringbone: (a, b) => `repeating-linear-gradient(45deg,${a} 0 6px,${b} 6px 8px) 0 0/16px 16px, ${a}`,
  check: (a, b) => `repeating-linear-gradient(0deg,transparent 0 18px,${b} 18px 22px),repeating-linear-gradient(90deg,${a} 0 18px,${b} 18px 22px)`,
  linen: (a, b) => `repeating-linear-gradient(0deg,${b} 0 1px,transparent 1px 3px),repeating-linear-gradient(90deg,${b} 0 1px,${a} 1px 3px)`,
  lace: (a, b) => `radial-gradient(circle at 50% 50%,${b} 0 3px,transparent 3.5px) 0 0/14px 14px,radial-gradient(circle at 50% 50%,transparent 0 5px,${b} 5.5px 6.2px,transparent 6.5px) 7px 7px/14px 14px,${a}`,
  denim: (a, b) => `repeating-linear-gradient(-60deg,${a} 0 2px,${b} 2px 3px)`,
  tartan: (a, b) => `repeating-linear-gradient(0deg,${b}88 0 6px,transparent 6px 26px),repeating-linear-gradient(90deg,${b}88 0 6px,transparent 6px 26px),${a}`,
};

export const PATTERNS = Object.keys(FAB);
export const fabric = ([p, a, b]: Pattern) => (FAB[p] ?? FAB.linen)(a, b);

export const money = (cents: number | null | undefined) =>
  cents == null ? "—" : `$${(cents / 100).toLocaleString("en-AU", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
