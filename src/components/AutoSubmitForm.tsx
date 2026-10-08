"use client";
import { useRouter } from "next/navigation";

/** GET form that applies filters as soon as they change. Works without JS too (submit button). */
export default function AutoSubmitForm({ action, children, className, id }: { action: string; children: React.ReactNode; className?: string; id?: string }) {
  const router = useRouter();
  return (
    <form
      id={id}
      action={action}
      className={className}
      onChange={(e) => {
        const params = new URLSearchParams();
        for (const [k, v] of new FormData(e.currentTarget)) if (v !== "") params.append(k, String(v));
        router.replace(`${action}?${params}`, { scroll: false });
      }}
    >
      {children}
    </form>
  );
}
