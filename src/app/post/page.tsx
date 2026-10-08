import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import Wizard from "./Wizard";

export const metadata = { title: "Post a job" };

export default async function Post({ searchParams }: { searchParams: Promise<{ tailor?: string }> }) {
  const { tailor: slug } = await searchParams;
  const user = await getUser();
  if (user?.tailor) redirect("/tailor");
  const tailor = slug ? await db.tailorProfile.findUnique({ where: { slug }, select: { slug: true, businessName: true, clubStatus: true } }) : null;
  return (
    <Wizard
      user={user && { firstName: user.firstName, email: user.email }}
      defaultSuburb={user?.suburb ?? ""}
      tailor={tailor?.clubStatus === "ACTIVE" ? { slug: tailor.slug, name: tailor.businessName } : null}
    />
  );
}
