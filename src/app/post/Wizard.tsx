"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Disclaimer } from "@/components/ui";
import { ACKNOWLEDGEMENT, FITTING, FREE_FOR_CUSTOMERS, GARMENTS, INTRO, MAX_PHOTOS, TIMING, WORK, estimate } from "@/lib/catalog";
import { contactRefusal, findContactDetails } from "@/lib/contact-filter";
import { SUBURB_NAMES, findSuburb } from "@/lib/suburbs";

const DRAFT_KEY = "tailorme:job-draft";
const DRAFT_MAX_AGE_MS = 14 * 864e5;
type Draft = {
  context: string;
  savedAt: number;
  step: number;
  garment: string | null;
  work: string | null;
  description: string;
  fitting: string | null;
  timing: string | null;
  wantsPickup: boolean;
  suburb: string;
  firstName: string;
  email: string;
  photos: number;
};

const STEPS = ["Garment", "The work", "Details", "Timing", "Your details", "Review"];

type Props = {
  user: { firstName: string; email: string } | null;
  defaultSuburb: string;
  tailor: { slug: string; name: string } | null;
  /** Rebooking a tailor the customer has booked before: sent only to them, flat repeat fee. */
  rebook: boolean;
  /** Date of the latest entry in the customer's fit record, if any. */
  fitSavedOn?: string | null;
};

export default function Wizard({ user: initialUser, defaultSuburb, tailor, rebook, fitSavedOn }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [garment, setGarment] = useState<string | null>(null);
  const [work, setWork] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [fitting, setFitting] = useState<string | null>(null);
  const [timing, setTiming] = useState<string | null>(null);
  const [wantsPickup, setWantsPickup] = useState(false);
  const [suburb, setSuburb] = useState(defaultSuburb);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Logging in happens inside the form (no page change), so nothing typed or uploaded is lost.
  const [user, setUser] = useState(initialUser);
  const [authMode, setAuthMode] = useState<"signup" | "login">("signup");
  const [postAfterLogin, setPostAfterLogin] = useState(false);
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Draft saving: answers are kept in this browser (not photos or the password) so leaving
  // the page or refreshing doesn't lose them. Cleared once the job is posted.
  const draftContext = `${tailor?.slug ?? ""}|${rebook ? "rebook" : ""}`;
  const [restored, setRestored] = useState<{ photos: number } | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const d = raw ? (JSON.parse(raw) as Draft) : null;
      if (d && d.context === draftContext && Date.now() - d.savedAt < DRAFT_MAX_AGE_MS) {
        setGarment(d.garment);
        setWork(d.work);
        setDescription(d.description);
        setFitting(d.fitting);
        setTiming(d.timing);
        setWantsPickup(d.wantsPickup);
        if (d.suburb) setSuburb(d.suburb);
        setFirstName(d.firstName);
        setEmail(d.email);
        // Photos can't be saved, so anyone past the photo step goes back to re-add them.
        setStep(d.photos > 0 ? Math.min(d.step, 2) : d.step);
        if (d.step > 0) setRestored({ photos: d.photos });
      }
    } catch {
      /* storage unavailable: start fresh */
    }
    setDraftLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!draftLoaded) return;
    const d: Draft = { context: draftContext, savedAt: Date.now(), step, garment, work, description, fitting, timing, wantsPickup, suburb, firstName, email, photos: photos.length };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* storage full or blocked: carry on without a draft */
    }
  }, [draftLoaded, draftContext, step, garment, work, description, fitting, timing, wantsPickup, suburb, firstName, email, photos.length]);
  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }
  function startAgain() {
    clearDraft();
    setGarment(null); setWork(null); setDescription(""); setFitting(null); setTiming(null); setWantsPickup(false);
    setSuburb(defaultSuburb); setFirstName(""); setEmail(""); setPassword(""); setAck(false);
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setRestored(null);
    go(0);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const imgs = [...list].filter((f) => f.type.startsWith("image/")).slice(0, MAX_PHOTOS - photos.length);
    setPhotos((p) => [...p, ...imgs.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    setErr("");
  }
  function removePhoto(i: number) {
    setPhotos((p) => {
      URL.revokeObjectURL(p[i].url);
      return p.filter((_, j) => j !== i);
    });
  }

  const leak = findContactDetails(description);
  const checks: Record<number, [boolean, string]> = {
    0: [!!garment, "Pick a garment to continue."],
    1: [!!work, "Pick the work you need."],
    2: [
      photos.length > 0 && description.trim().length >= 10 && !leak,
      !photos.length
        ? "Add at least one photo of the garment. Tailors can’t quote without one."
        : leak
          ? contactRefusal("job description", leak)
          : "Describe the job in a sentence or two (fabric and measurement help).",
    ],
    3: [!!timing && !!findSuburb(suburb), !timing ? "Choose a timeframe." : "Choose your suburb from the list."],
    4: user
      ? [true, ""]
      : authMode === "login"
        ? [false, "Log in to continue, or create a new account instead."]
        : [!!firstName.trim() && /^\S+@\S+\.\S+$/.test(email) && password.length >= 8, "Enter your first name, a valid email and a password of at least 8 characters."],
    5: [ack, "Tick the box to confirm you understand how quotes and bookings work."],
  };

  function go(n: number) {
    setErr("");
    setRestored(null);
    setStep(n);
    top.current?.scrollIntoView({ block: "start" });
  }
  async function next() {
    const [ok, msg] = checks[step];
    if (!ok) return setErr(msg);
    if (step < 5) return go(step + 1);
    await post(user);
  }

  async function logIn() {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body.error ?? "Couldn’t log you in. Please try again.");
        setBusy(false);
        return;
      }
      const account = { firstName: body.firstName as string, email: body.email as string };
      setUser(account);
      setPassword("");
      router.refresh(); // header shows you as logged in
      if (postAfterLogin) {
        setPostAfterLogin(false);
        await post(account);
      } else {
        setBusy(false);
        go(5);
      }
    } catch {
      setErr("Couldn’t reach tailor me. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function post(account: { firstName: string; email: string } | null) {
    setBusy(true);
    const fd = new FormData();
    fd.set("garment", garment!);
    fd.set("work", work!);
    fd.set("description", description);
    fd.set("fitting", fitting ?? "");
    fd.set("timing", timing!);
    fd.set("suburb", suburb);
    if (wantsPickup) fd.set("wantsPickup", "1");
    fd.set("ack", "on");
    if (tailor) fd.set("tailor", tailor.slug);
    if (rebook) fd.set("rebook", "1");
    if (!account) {
      fd.set("firstName", firstName);
      fd.set("email", email);
      fd.set("password", password);
    }
    photos.forEach((p) => fd.append("photos", p.file));
    try {
      const res = await fetch("/api/jobs", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409 && !account) {
        // The email already has an account. Try the password they typed; if it's theirs, log in and post.
        const login = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const who = await login.json().catch(() => ({}));
        if (login.ok) {
          const acct = { firstName: who.firstName as string, email: who.email as string };
          setUser(acct);
          router.refresh();
          return post(acct);
        }
        if (login.status === 403) {
          setErr(who.error ?? "That account can’t post jobs.");
          setBusy(false);
          return;
        }
        // Otherwise ask for the password right here; everything entered is kept.
        setAuthMode("login");
        setPassword("");
        setPostAfterLogin(true);
        setBusy(false);
        go(4);
        return;
      }
      if (!res.ok) {
        setErr(body.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      clearDraft();
      router.push(`/jobs/${body.id}?posted=1`);
      router.refresh();
    } catch {
      setErr("Couldn’t reach tailor me. Check your connection and try again.");
      setBusy(false);
    }
  }
  function pick<T>(set: (v: T) => void, v: T, advance: boolean) {
    set(v);
    setErr("");
    if (advance) setTimeout(() => go(step + 1), 160);
  }

  const pct = Math.max(Math.round((step / STEPS.length) * 100), 4);
  const [lo, hi] = garment && work && timing ? estimate(garment, work, timing) : [0, 0];

  return (
    <div className="view wrap wiz" ref={top}>
      <div className="wiz-progress">
        <div className="lbl"><span>{STEPS[step]}</span><span className="num">{step + 1} / {STEPS.length}</span></div>
        <div className="wtape"><div className="fill" style={{ width: `${pct}%` }} /></div>
      </div>
      {restored && (
        <div className="notice" style={{ marginBottom: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ flex: "1 1 240px" }}>
            We’ve kept your answers from last time.{restored.photos > 0 && " Photos can’t be saved, so please add them again."}
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={startAgain}>Start again</button>
        </div>
      )}
      {tailor && rebook && <p className="notice ok" style={{ marginBottom: 18 }}>Rebooking <b>{tailor.name}</b>. Only they’ll see this job. You can open it to other tailors later.</p>}
      {tailor && !rebook && <p className="notice" style={{ marginBottom: 18 }}>Requesting a quote from <b>{tailor.name}</b>. Other matching tailors nearby can quote too.</p>}
      {fitSavedOn && <p className="notice small" style={{ marginBottom: 18 }}>{rebook && tailor ? <><b>{tailor.name}</b> will see</> : "The tailor you book will see"} your saved fit record (last measured {fitSavedOn}), so they start from your measurements.</p>}

      {step === 0 && (
        <>
          <h1>What are we working on?</h1>
          <p className="sub">Pick the closest match.</p>
          <div className="opts">
            {GARMENTS.map(([g, d]) => (
              <button key={g} type="button" className="opt" aria-pressed={garment === g} onClick={() => pick(setGarment, g, true)}><b>{g}</b><small>{d}</small></button>
            ))}
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h1>What needs doing?</h1>
          <p className="sub">{garment}</p>
          <div className="opts">
            {WORK.map(([g, d]) => (
              <button key={g} type="button" className="opt" aria-pressed={work === g} onClick={() => pick(setWork, g, true)}><b>{g}</b>{d && <small>{d}</small>}</button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1>Show the tailor the job</h1>
          <p className="sub">Every job needs at least one photo. Tailors can’t quote without seeing the garment.</p>
          <div className="field">
            <label htmlFor="wPhotos">Photos <span className="req">Required</span></label>
            <label
              className={`drop${over ? " over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); addFiles(e.dataTransfer.files); }}
            >
              Drop photos here or <u>browse</u>
              <br />
              <small>Show the whole garment, plus a close-up of the area that needs work. Up to {MAX_PHOTOS}.</small>
              <input type="file" id="wPhotos" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
            <div className="thumbs">
              {photos.map((p, i) => (
                <div className="th" key={p.url}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`Garment photo ${i + 1}`} />
                  <button type="button" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}>×</button>
                </div>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="wDetails">Describe the job <span className="req">Required</span></label>
            <textarea className="inp" id="wDetails" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Work trousers, wool blend. Need to come up about 4 cm for flat shoes." />
            <span className="hint">Mention the fabric and the measurement if you know it.</span>
          </div>
          <div style={{ marginTop: 18 }}><Disclaimer /></div>
          <div className="field">
            <label>Fitting</label>
            <div className="opts" style={{ marginTop: 0 }}>
              {FITTING.map(([g, d]) => (
                <button key={g} type="button" className="opt" aria-pressed={fitting === g} onClick={() => pick(setFitting, g, false)} style={{ minHeight: 0 }}><b>{g}</b><small>{d}</small></button>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <h1>When do you need it?</h1>
          <div className="opts" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
            {TIMING.map(([g, d]) => (
              <button key={g} type="button" className="opt" aria-pressed={timing === g} onClick={() => pick(setTiming, g, false)}><b>{g}</b><small>{d}</small></button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="wWhere">Your suburb</label>
            <input className="inp" id="wWhere" list="wiz-suburbs" value={suburb} onChange={(e) => setSuburb(e.target.value)} autoComplete="address-level2" />
            <datalist id="wiz-suburbs">{SUBURB_NAMES.map((s) => <option key={s} value={s} />)}</datalist>
            <span className="hint">Tailors see your first name and suburb only, until you book.</span>
          </div>
          <label className="ack" htmlFor="wPickup">
            <input type="checkbox" id="wPickup" checked={wantsPickup} onChange={(e) => setWantsPickup(e.target.checked)} />
            <span>
              <b>tailor me at home:</b> have the tailor come to me, fit it at home and bring it back. The fitting is free when they collect: they pin it on you before taking it away.
              <span className="hint" style={{ display: "block" }}>Tailors who visit include it in their quote.</span>
            </span>
          </label>
        </>
      )}

      {step === 4 && (
        <>
          <h1>Where should quotes go?</h1>
          {user ? (
            <p className="sub">Posting as <b>{user.firstName}</b> ({user.email}). We’ll email you when quotes arrive.</p>
          ) : authMode === "login" ? (
            <>
              {postAfterLogin && (
                <p className="notice" style={{ marginTop: 12 }}>
                  There’s already an account for <b>{email}</b>. Enter your password and we’ll post your job. Nothing you’ve entered is lost.
                </p>
              )}
              <p className="sub">Log in to post this job. Everything you’ve entered stays here. New to tailor me? <button type="button" className="link" style={{ background: "none", border: 0, padding: 0 }} onClick={() => { setAuthMode("signup"); setPostAfterLogin(false); setErr(""); }}>Create an account</button></p>
              <div className="field"><label htmlFor="wLoginEmail">Email</label><input className="inp" id="wLoginEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
              <div className="field"><label htmlFor="wLoginPass">Password</label><input className="inp" id="wLoginPass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); logIn(); } }} /></div>
              <button type="button" className="btn btn-ink" style={{ marginTop: 18 }} onClick={logIn} disabled={busy}>{busy ? "Logging in…" : postAfterLogin ? "Log in and post my job" : "Log in and continue"}</button>
            </>
          ) : (
            <>
              <p className="sub">We’ll send your quotes here. Tailors see your first name and suburb only.</p>
              <div className="two">
                <div className="field"><label htmlFor="wName">First name</label><input className="inp" id="wName" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" /></div>
                <div className="field"><label htmlFor="wEmail">Email</label><input className="inp" id="wEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
              </div>
              <div className="field"><label htmlFor="wPass">Password</label><input className="inp" id="wPass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" minLength={8} /><span className="hint">At least 8 characters.</span></div>
            </>
          )}
        </>
      )}

      {step === 5 && (
        <>
          <h1>Check and post</h1>
          <div className="summary">
            {[
              ["Garment", garment],
              ["Work", work],
              ["Fitting", fitting ?? "Tailor to advise"],
              ["Timing", timing],
              ["Pickup", wantsPickup ? "tailor me at home: fitting at home, then delivered" : "I’ll drop it off"],
              ["Location", findSuburb(suburb) ?? suburb],
              ["Photos", `${photos.length} attached`],
              ["Contact", user ? `${user.firstName} · ${user.email}` : `${firstName} · ${email}`],
            ].map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}
          </div>
          <div className="thumbs" style={{ marginTop: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photos.map((p, i) => <img key={p.url} src={p.url} alt={`Garment photo ${i + 1}`} />)}
          </div>
          <div className="est">Guide price for this job in Sydney: <b style={{ marginLeft: "auto" }}>${lo} – ${hi}</b></div>
          <div className="est" style={{ marginTop: 8 }}>{FREE_FOR_CUSTOMERS}</div>
          <div style={{ marginTop: 12 }}><Disclaimer /></div>
          <p className="intro-note">{INTRO}</p>
          <label className="ack" htmlFor="wAck">
            <input type="checkbox" id="wAck" checked={ack} onChange={(e) => { setAck(e.target.checked); setErr(""); }} />
            <span>{ACKNOWLEDGEMENT}</span>
          </label>
        </>
      )}

      <div className="err" role="alert">{err}</div>
      <div className="wiz-nav">
        {step === 0 ? (
          <Link className="btn btn-ghost" href={tailor ? `/tailors/${tailor.slug}` : "/"}>Cancel</Link>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => go(step - 1)} disabled={busy}>Back</button>
        )}
        {/* While logging in on step 4, the login button is the way forward. */}
        {!(step === 4 && !user && authMode === "login") && (
          <button type="button" className={`btn ${step === 5 ? "btn-primary btn-brand" : "btn-ink"}`} onClick={next} disabled={busy} aria-label={step === 5 ? "Tailor me: post this job" : undefined}>
            {step === 5 ? (busy ? "Posting…" : <>tailor <i>me</i></>) : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}
