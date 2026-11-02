import { Fragment, type ReactNode } from "react";
import { describeFit } from "@/lib/fit";
import type { FitEntry } from "@/lib/fit-records";

const day = (d: Date) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" });
export const fitDay = day;

/** One card per fitting: date, who measured, the numbers and notes. */
export function FitHistory({ entries, action }: { entries: FitEntry[]; action?: (e: FitEntry) => ReactNode }) {
  return (
    <ul className="fit-list">
      {entries.map((e) => (
        <li key={e.id}>
          <div className="fit-head">
            <span><b>{e.garment}</b> · {day(e.date)}</span>
            <span className="small muted">Measured by {e.tailorName}</span>
          </div>
          {describeFit(e.measurements).length > 0 && (
            <dl className="kv fit-kv">
              {describeFit(e.measurements).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd className="num">{v}</dd></Fragment>)}
            </dl>
          )}
          {e.notes && <p className="small" style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{e.notes}</p>}
          {action?.(e)}
        </li>
      ))}
    </ul>
  );
}
