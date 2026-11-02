import { NextResponse } from "next/server";
import { startSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";

// Logs in without leaving the page, so a half-finished job form keeps its answers and photos.
export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  const user =
    typeof email === "string" && typeof password === "string"
      ? await db.user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { tailor: { select: { id: true } } } })
      : null;
  if (!user || !(await verifyPassword(password, user.passwordHash)))
    return NextResponse.json({ error: "That email and password don’t match." }, { status: 401 });
  if (user.tailor)
    return NextResponse.json({ error: "That’s a tailor account. Use a customer account to post a job." }, { status: 403 });
  await startSession(user.id);
  return NextResponse.json({ firstName: user.firstName, email: user.email });
}
