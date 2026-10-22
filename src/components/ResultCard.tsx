import type { OutputDef } from '../calculators/types'
import { fmt } from './format'

export function ResultCard({ primary, outputs, warnings, error }: { primary?: OutputDef; outputs: OutputDef[]; warnings: string[]; error?: string }) {
  return (
    <section className="rounded-xl bg-palm-900 p-4 text-white" aria-live="polite">
      {error ? (
        <p className="text-red-200">⛔ {error}</p>
      ) : primary ? (
        <>
          <div className="text-sm text-palm-200">{primary.label}</div>
          <div className="num text-4xl font-bold">
            {fmt(primary.value, primary.digits)} <span className="text-xl font-normal text-palm-200">{primary.unit}</span>
          </div>
          {outputs.length > 0 && (
            <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1 border-t border-palm-700 pt-3 text-sm sm:grid-cols-2">
              {outputs.map((o, k) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-palm-200">{o.label}</dt>
                  <dd className="num font-semibold">{fmt(o.value, o.digits)} {o.unit}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      ) : null}
      {warnings.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-lg bg-amber-100 p-2 text-sm text-amber-900">
          {warnings.map((w, k) => <li key={k}>⚠ {w}</li>)}
        </ul>
      )}
    </section>
  )
}
