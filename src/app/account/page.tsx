import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function Account() {
  const user = await requireUser();
  redirect(user.tailor ? "/tailor" : "/jobs");
}
