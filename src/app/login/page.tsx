import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { getUser, safeNext } from "@/lib/auth";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getUser()) redirect(safeNext(next));
  return (
    <div className="wrap page narrow">
      <div className="page-head"><h1>Welcome back</h1></div>
      <LoginForm next={next} />
    </div>
  );
}
