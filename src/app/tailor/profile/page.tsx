import { saveProfile, saveServices } from "@/app/actions/tailor";
import { requireTailor } from "@/lib/auth";
import { formatAbn } from "@/lib/abn";
import { CATEGORIES } from "@/lib/catalog";
import { db } from "@/lib/db";
import { SUBURB_NAMES } from "@/lib/suburbs";
import { TailorTabs } from "../TailorTabs";

export const metadata = { title: "Profile & prices" };

const ABN_LABEL = { UNCHECKED: "Waiting to be checked", CHECKED: "ABN checked", FAILED: "Not active on ABN Lookup" } as const;

export default async function TailorProfileEdit({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; welcome?: string }> }) {
  const { user, tailor } = await requireTailor("/tailor/profile");
  const sp = await searchParams;
  const services = await db.service.findMany({ where: { tailorId: tailor.id }, orderBy: { sortOrder: "asc" } });
  const rows = [...services, ...Array.from({ length: Math.max(3, 10 - services.length) }, () => null)].slice(0, Math.max(10, services.length + 3));

  return (
    <div className="wrap page">
      <TailorTabs current="/tailor/profile" />
      <div className="page-head"><h1>Profile &amp; prices</h1></div>
      {sp.welcome && <p className="notice ok" style={{ marginBottom: 16 }}>Welcome, {user.firstName}. Fill in your profile and prices, then join the Club to start quoting.</p>}
      {sp.saved && <p className="notice ok" style={{ marginBottom: 16 }}>Saved.</p>}
      {sp.error && <p className="notice bad" role="alert" style={{ marginBottom: 16 }}>{sp.error}</p>}

      <form className="panel stack" action={saveProfile}>
        <h2>About your business</h2>
        <div className="two">
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="businessName">Business name</label><input className="inp" id="businessName" name="businessName" defaultValue={tailor.businessName} required /></div>
          <div className="field" style={{ marginTop: 0 }}>
            <label htmlFor="suburb">Suburb</label>
            <input className="inp" id="suburb" name="suburb" list="tp-suburbs" defaultValue={tailor.suburb} required />
            <datalist id="tp-suburbs">{SUBURB_NAMES.map((s) => <option key={s} value={s} />)}</datalist>
          </div>
        </div>
        <div className="field" style={{ marginTop: 0 }}>
          <label htmlFor="bio">Short intro</label>
          <textarea className="inp" id="bio" name="bio" defaultValue={tailor.bio} maxLength={800} placeholder="What you’re good at, how long jobs usually take, anything that makes you easy to deal with." />
        </div>
        <div>
          <label style={{ fontWeight: 600 }}>Services you offer</label>
          <div className="checks" style={{ marginTop: 6 }}>
            {CATEGORIES.map((c) => (
              <label key={c.id} className="check"><input type="checkbox" name="categories" value={c.id} defaultChecked={tailor.categories.includes(c.id)} />{c.name}</label>
            ))}
          </div>
          <span className="hint small muted">You’re sent jobs in these categories within about 15 km.</span>
        </div>
        <div className="checks">
          <label className="check"><input type="checkbox" name="comesToCustomer" defaultChecked={tailor.comesToCustomer} />I can come to customers for fittings</label>
          <label className="check"><input type="checkbox" name="sameDay" defaultChecked={tailor.sameDay} />I offer same-day rush jobs</label>
        </div>
        <div className="two">
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="yearsExperience">Years of experience</label><input className="inp" id="yearsExperience" name="yearsExperience" type="number" min={0} max={80} defaultValue={tailor.yearsExperience ?? ""} /></div>
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="languages">Languages</label><input className="inp" id="languages" name="languages" defaultValue={tailor.languages.join(", ")} placeholder="English, Vietnamese" /></div>
        </div>
        <div className="two">
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="openingHours">Opening hours</label><input className="inp" id="openingHours" name="openingHours" defaultValue={tailor.openingHours ?? ""} placeholder="Mon–Sat 9–5" /></div>
          <div className="field" style={{ marginTop: 0 }}><label htmlFor="phone">Phone</label><input className="inp" id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} /></div>
        </div>
        <div className="field" style={{ marginTop: 0 }}>
          <label htmlFor="shopAddress">Shop or studio address</label>
          <input className="inp" id="shopAddress" name="shopAddress" defaultValue={tailor.shopAddress ?? ""} />
          <span className="hint">Shown to customers only after they book you.</span>
        </div>
        <div className="field" style={{ marginTop: 0 }}>
          <label htmlFor="abn">ABN</label>
          <input className="inp" id="abn" name="abn" inputMode="numeric" defaultValue={tailor.abn ? formatAbn(tailor.abn) : ""} placeholder="11 digits" />
          {tailor.abn && <span className="hint">{ABN_LABEL[tailor.abnStatus]}{tailor.abnEntityName ? ` · ${tailor.abnEntityName}` : ""}</span>}
          <span className="hint">We check it on ABN Lookup. Your profile shows “ABN checked” once it’s confirmed.</span>
        </div>
        <button className="btn btn-primary">Save profile</button>
      </form>

      <form className="panel stack" action={saveServices} id="services">
        <h2>Prices</h2>
        <p className="small muted">Your typical prices. Leave a row blank to remove it. Use a number like 24, or text like “+30%”.</p>
        {rows.map((s, i) => (
          <div className="svc-edit" key={s?.id ?? `new-${i}`}>
            <input className="inp" name="name" defaultValue={s?.name ?? ""} placeholder="e.g. Jeans hem, original kept" aria-label={`Service ${i + 1}`} />
            <input className="inp" name="note" defaultValue={s?.note ?? ""} placeholder="Note (optional)" aria-label={`Note ${i + 1}`} />
            <input className="inp" name="price" defaultValue={s ? (s.priceCents != null ? String(s.priceCents / 100) : s.priceText ?? "") : ""} placeholder="$" aria-label={`Price ${i + 1}`} />
          </div>
        ))}
        <button className="btn btn-primary">Save prices</button>
      </form>
    </div>
  );
}
