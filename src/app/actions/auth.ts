"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, hashPassword, roleForNewUser, safeNext, startSession, verifyPassword } from "@/lib/auth";
import { findSuburb } from "@/lib/suburbs";
import { slugFor } from "@/lib/tailors";

export type FormState = { error?: string } | undefined;

const SignUp = z.object({
  kind: z.enum(["customer", "tailor"]),
  firstName: z.string().trim().min(1, "Enter your first name.").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(200),
  businessName: z.string().trim().max(80).optional(),
  suburb: z.string().trim().max(80).optional(),
});

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = SignUp.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (await db.user.findUnique({ where: { email: d.email } })) return { error: "There’s already an account with that email. Log in instead." };

  let tailor: { businessName: string; suburb: string } | null = null;
  if (d.kind === "tailor") {
    const suburb = findSuburb(d.suburb);
    if (!d.businessName) return { error: "Enter your business name." };
    if (!suburb) return { error: "Choose a Sydney suburb from the list." };
    tailor = { businessName: d.businessName, suburb };
  }

  const user = await db.user.create({
    data: {
      email: d.email,
      firstName: d.firstName,
      passwordHash: await hashPassword(d.password),
      role: roleForNewUser(d.email, d.kind === "tailor" ? "TAILOR" : "CUSTOMER"),
      ...(tailor && { tailor: { create: { ...tailor, slug: await slugFor(tailor.businessName), languages: ["English"], categories: [] } } }),
    },
  });
  await startSession(user.id);
  redirect(tailor ? "/tailor/profile?welcome=1" : safeNext(form.get("next"), "/jobs"));
}

export async function logIn(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email }, include: { tailor: { select: { id: true } } } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "That email and password don’t match." };
  await startSession(user.id);
  redirect(safeNext(form.get("next"), user.tailor ? "/tailor" : "/jobs"));
}

export async function logout() {
  await endSession();
  redirect("/");
}
