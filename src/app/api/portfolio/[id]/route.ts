import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPlus } from "@/lib/rules";
import { readPhoto } from "@/lib/storage";

// Portfolio photos are public while the tailor is on Club Plus. The tailor can always see their own.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const photo = await db.portfolioPhoto.findUnique({ where: { id: (await params).id }, include: { tailor: true } });
  if (!photo) return new Response("Not found", { status: 404 });
  if (!isPlus(photo.tailor) && (await getUser())?.id !== photo.tailor.userId) return new Response("Not found", { status: 404 });
  const body = await readPhoto(photo.storageKey);
  return new Response(new Uint8Array(body), {
    headers: { "Content-Type": photo.mime, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
