// Display helpers shared by server and client components.
import { CATEGORIES, type Pattern } from "./catalog";

export type TailorCard = {
  id: string;
  slug: string;
  name: string;
  suburb: string;
  km: number | null;
  rating: number | null;
  reviews: number;
  fromCents: number | null;
  replyMins: number | null;
  categories: string[];
  abnChecked: boolean;
  comesToCustomer: boolean;
  sameDay: boolean;
  bio: string;
  pat: Pattern;
};

export const patternFor = (categories: string[]): Pattern =>
  ([...(CATEGORIES.find((c) => c.id === categories[0])?.pat ?? CATEGORIES[0].pat)] as Pattern);

export function replyLabel(mins: number | null) {
  if (mins == null) return null;
  if (mins < 60) return `~${Math.max(5, Math.round(mins / 5) * 5)} min`;
  return `~${Math.round(mins / 60)} hr`;
}
