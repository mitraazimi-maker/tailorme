"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Disclaimer } from "@/components/ui";
import { ACKNOWLEDGEMENT, FITTING, GARMENTS, INTRO, MAX_PHOTOS, TIMING, WORK, estimate } from "@/lib/catalog";
import { SUBURB_NAMES, findSuburb } from "@/lib/suburbs";

const STEPS = ["Garment", "The work", "Details", "Timing", "Your details", "Review"];

type Props = {
  user: { firstName: string; email: string } | null;
  defaultSuburb: string;
  tailor: { slug: string; name: string } | null;
};

export default function Wizard({ user, defaultSuburb, tailor }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [garment, setGarment] = useState<string | null>(null);
  const [work, setWork] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [fitting, setFitting] = useState<string | null>(null);
  const [timing, setTiming] = useState<string | null>(null);
  const [suburb, setSuburb] = useState(defaultSuburb);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const checks: Record<number, [boolean, string]> = {
    0: [!!garment, "Pick a garment to continue."],
    1: [!!work, "Pick the work you need."],
    2: [photos.length > 0 && description.trim().length >= 10, !photos.length ? "Add at least one photo of the garment. Tailors can’t quote without one." : "Describe the job in a sentence or two (fabric and measurement help)."],
    3: [!!timing && !!findSuburb(suburb), !timing ? "Choose a timeframe." : "Choose your suburb from the list."],
    4: [!!user || (!!firstName.trim() && /^\S+@\S+\.\S+$/.test(email) && password.length >= 8), "Enter your first name, a valid email and a password of at least 8 characters."],
    5: [ack, "Tick the box to confirm you understand how quotes and bookings work."],
  };

  function go(n: number) {
    setErr("");
    setStep(n);
    top.current?.scrollIntoView({ block: "start" });
  }
  async function next() {
    const [ok, msg] = checks[step];
    if (!ok) return setErr(msg);
    if (step < 5) return go(step + 1);
    setBusy(true);
    const fd = new FormData();
    fd.set("garment", garment!);
    fd.set("work", work!);
    fd.set("description", description);
    fd.set("fitting", fitting ?? "");
    fd.set("timing", timing!);
    fd.set("suburb", suburb);
    fd.set("ack", "on");
    if (tailor) fd.set("tailor", tailor.slug);
    if (!user) {
      fd.set("firstName", firstName);
      fd.set("email", email);
      fd.set("password", password);
    }
    photos.forEach((p) => fd.append("photos", p.file));
    try {
      const res = await fetch("/api/jobs", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(body.error ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
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
      {tailor && <p className="notice" style={{ marginBottom: 18 }}>Requesting a quote from <b>{tailor.name}</b>. Other matching tailors nearby can quote too.</p>}

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
        </>
      )}

      {step === 4 && (
        <>
          <h1>Where should quotes go?</h1>
          {user ? (
            <p className="sub">Posting as <b>{user.firstName}</b> ({user.email}). We’ll email you when quotes arrive.</p>
          ) : (
            <>
              <p className="sub">Create an account to see and compare your quotes. Tailors see your first name and suburb only. Already have one? <Link className="link" href="/login?next=/post">Log in</Link></p>
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
          <div className="est" style={{ marginTop: 8 }}>tailor me booking fee, charged only when you accept a quote: <b style={{ marginLeft: "auto" }}>$5.00</b></div>
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
        <button type="button" className={`btn ${step === 5 ? "btn-primary btn-brand" : "btn-ink"}`} onClick={next} disabled={busy} aria-label={step === 5 ? "Tailor me: post this job" : undefined}>
          {step === 5 ? (busy ? "Posting…" : <>tailor <i>me</i></>) : "Continue"}
        </button>
      </div>
    </div>
  );
}
