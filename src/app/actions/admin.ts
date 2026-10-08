"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

/** Records the result of checking a tailor's ABN on ABN Lookup by hand. */
export async function setAbnStatus(form: FormData) {
  await requireAdmin();
  const status = String(form.get("status"));
  if (status !== "CHECKED" && status !== "FAILED" && status !== "UNCHECKED") return;
  await db.tailorProfile.update({
    where: { id: String(form.get("tailorId")) },
    data: { abnStatus: status, abnCheckedAt: status === "UNCHECKED" ? null : new Date() },
  });
  revalidatePath("/admin");
}
