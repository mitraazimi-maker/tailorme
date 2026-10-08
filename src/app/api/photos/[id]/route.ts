import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canTailorSeeJob } from "@/lib/rules";
import { readPhoto } from "@/lib/storage";

// Job photos are private: the customer, the tailors who can quote on the job,
// the booked tailor, and admins.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return new Response("Not found", { status: 404 });
  const photo = await db.jobPhoto.findUnique({ where: { id: (await params).id }, include: { job: { include: { booking: true } } } });
  if (!photo) return new Response("Not found", { status: 404 });
  const { job } = photo;
  const allowed =
    job.customerId === user.id ||
    user.role === "ADMIN" ||
    (user.tailor && canTailorSeeJob(user.tailor, job, job.booking?.status === "CONFIRMED" || job.booking?.status === "COMPLETED" ? job.booking.tailorId : null).ok);
  if (!allowed) return new Response("Not found", { status: 404 });
  const body = await readPhoto(photo.storageKey);
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
