import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/AuthForms";
import { getUser, safeNext } from "@/lib/auth";

export const metadata = { title: "Create an account" };

export default async function SignUp({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const { next, as } = await searchParams;
  if (await getUser()) redirect(safeNext(next));
  return (
    <div className="wrap page narrow">
      <div className="page-head"><h1>Create your account</h1></div>
      <SignUpForm next={next} initialKind={as === "tailor" ? "tailor" : "customer"} />
    </div>
  );
}
