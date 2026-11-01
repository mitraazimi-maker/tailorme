import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { bookedTailorIds } from "@/lib/bookings";
import { db } from "@/lib/db";
import { isClubMember } from "@/lib/rules";
import Wizard from "./Wizard";

export const metadata = { title: "Post a job" };

export default async function Post({ searchParams }: { searchParams: Promise<{ tailor?: string; rebook?: string }> }) {
  const { tailor: slug, rebook } = await searchParams;
  const user = await getUser();
  if (user?.tailor) redirect("/tailor");
  const tailor = slug ? await db.tailorProfile.findUnique({ where: { slug }, select: { id: true, slug: true, businessName: true, clubStatus: true, suspendedUntil: true } }) : null;
  // Only a tailor they have actually booked before counts as a rebook (the server checks again).
  const isRebook = !!(rebook && user && tailor && (await bookedTailorIds(user.id)).has(tailor.id));
  return (
    <Wizard
      user={user && { firstName: user.firstName, email: user.email }}
      defaultSuburb={user?.suburb ?? ""}
      tailor={tailor && isClubMember(tailor) ? { slug: tailor.slug, name: tailor.businessName } : null}
      rebook={isRebook && isClubMember(tailor)}
    />
  );
}
