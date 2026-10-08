"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { logIn, signUp } from "@/app/actions/auth";
import { SUBURB_NAMES } from "@/lib/suburbs";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(logIn, undefined);
  return (
    <form action={action} className="panel stack">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="email">Email</label>
        <input className="inp" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="password">Password</label>
        <input className="inp" id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Logging in…" : "Log in"}</button>
      <p className="small muted">New here? <Link className="link" href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link></p>
    </form>
  );
}

export function SignUpForm({ next, initialKind = "customer" }: { next?: string; initialKind?: "customer" | "tailor" }) {
  const [state, action, pending] = useActionState(signUp, undefined);
  const [kind, setKind] = useState(initialKind);
  return (
    <form action={action} className="panel stack">
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="kind" value={kind} />
      <div className="opts" style={{ marginTop: 0, gridTemplateColumns: "1fr 1fr" }}>
        <button type="button" className="opt" aria-pressed={kind === "customer"} onClick={() => setKind("customer")} style={{ minHeight: 0 }}>
          <b>I need a tailor</b><small>Post jobs, compare quotes</small>
        </button>
        <button type="button" className="opt" aria-pressed={kind === "tailor"} onClick={() => setKind("tailor")} style={{ minHeight: 0 }}>
          <b>I’m a tailor</b><small>Join the tailor me Club</small>
        </button>
      </div>
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="firstName">First name</label>
        <input className="inp" id="firstName" name="firstName" autoComplete="given-name" required />
      </div>
      {kind === "tailor" && (
        <div className="two">
          <div className="field" style={{ marginTop: 0 }}>
            <label htmlFor="businessName">Business name</label>
            <input className="inp" id="businessName" name="businessName" autoComplete="organization" required />
          </div>
          <div className="field" style={{ marginTop: 0 }}>
            <label htmlFor="suburb">Suburb</label>
            <input className="inp" id="suburb" name="suburb" list="suburbs" required />
            <datalist id="suburbs">{SUBURB_NAMES.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
        </div>
      )}
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="email">Email</label>
        <input className="inp" id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field" style={{ marginTop: 0 }}>
        <label htmlFor="password">Password</label>
        <input className="inp" id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <span className="hint">At least 8 characters.</span>
      </div>
      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Creating account…" : "Create account"}</button>
      <p className="small muted">Already have an account? <Link className="link" href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link></p>
    </form>
  );
}
