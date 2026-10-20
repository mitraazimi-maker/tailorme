import { alertAfterHeadStart } from "@/lib/alerts";

// Call every 5 minutes (Vercel Cron, GitHub Actions, or any scheduler) with
// "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const jobs = await alertAfterHeadStart();
  return Response.json({ jobs });
}
