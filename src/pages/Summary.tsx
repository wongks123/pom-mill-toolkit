import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CALCULATORS, initialValues } from '../calculators/registry'
import type { CalcOutput } from '../calculators/types'
import { DEFAULT_PROJECT, useProject } from '../project/ProjectContext'
import { fmt } from '../components/format'

export default function Summary() {
  const { project, report } = useProject()
  const p = project ?? DEFAULT_PROJECT
  const [busy, setBusy] = useState(false)
  const rows = CALCULATORS.filter((c) => c.sizing).map((def) => {
    const values = initialValues(def, p as unknown as Record<string, unknown>)
    let out: CalcOutput | undefined
    let error: string | undefined
    try {
      out = def.compute(values)
    } catch (e) {
      error = (e as Error).message
    }
    return { def, values, out, error }
  })

  const downloadPdf = async () => {
    setBusy(true)
    try {
      const { downloadSummaryPdf } = await import('../report/pdf')
      await downloadSummaryPdf(
        p,
        [['Project', p.name], ['Mill capacity', `${p.capacityTph} t FFB/h`], ['Fruit / FFB', String(p.fruitRatio)], ['Fibre / FFB', String(p.fibreRatio)], ['Nut / FFB', String(p.nutRatio)], ['DCO / FFB', String(p.dcoRatio)], ['Steam demand', `${p.steamDemand} kg/t FFB`]],
        rows.map(({ def, out, error }) => ({
          title: def.title,
          source: def.source,
          error,
          primary: out ? `${out.primary.label}: ${fmt(out.primary.value, out.primary.digits)} ${out.primary.unit}` : undefined,
          outputs: out ? out.outputs.map((o) => `${o.label}: ${fmt(o.value, o.digits)} ${o.unit}`) : [],
          warnings: out?.warnings ?? [],
        })),
        report,
      )
    } catch (e) {
      alert(`PDF failed: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center justify-between gap-2">
        <Link to="/project" className="text-sm text-palm-700">← Project</Link>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="rounded-lg border border-palm-700 px-4 py-2 font-medium text-palm-800">Print</button>
          <button disabled={busy} onClick={downloadPdf} className="rounded-lg bg-palm-700 px-4 py-2 font-medium text-white disabled:opacity-40">{busy ? 'Preparing…' : 'Download PDF'}</button>
        </div>
      </div>
      <header className="rounded-xl bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-bold text-palm-900">Mill Design Summary</h1>
        <p className="text-stone-600">{p.name} · {p.capacityTph} t FFB/h · {new Date().toLocaleDateString()}</p>
        {!project && <p className="no-print mt-2 text-sm text-amber-700">No project is active, so default values are shown. <Link to="/project" className="underline">Set up a project</Link>.</p>}
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
          <div><dt className="inline text-stone-500">Fruit/FFB </dt><dd className="inline">{p.fruitRatio}</dd></div>
          <div><dt className="inline text-stone-500">Fibre/FFB </dt><dd className="inline">{p.fibreRatio}</dd></div>
          <div><dt className="inline text-stone-500">Nut/FFB </dt><dd className="inline">{p.nutRatio}</dd></div>
          <div><dt className="inline text-stone-500">DCO/FFB </dt><dd className="inline">{p.dcoRatio}</dd></div>
          <div><dt className="inline text-stone-500">Steam </dt><dd className="inline">{p.steamDemand} kg/t</dd></div>
        </dl>
        <p className="mt-2 text-xs text-stone-500">Other inputs use pocketbook defaults. Open each calculator to adjust and save it to the report.</p>
      </header>

      {rows.map(({ def, out, error }) => (
        <section key={def.id} className="print-break rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <h2 className="font-semibold">{def.title}</h2>
            <Link to={`/calc/${def.id}`} className="no-print shrink-0 text-xs text-palm-700 underline">Open</Link>
          </div>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : out ? (
            <>
              <div className="num text-xl font-bold text-palm-800">{out.primary.label}: {fmt(out.primary.value, out.primary.digits)} {out.primary.unit}</div>
              <ul className="mt-1 grid grid-cols-1 text-sm sm:grid-cols-2">
                {out.outputs.map((o, k) => <li key={k} className="num"><span className="text-stone-500">{o.label}:</span> {fmt(o.value, o.digits)} {o.unit}</li>)}
              </ul>
              {out.warnings.map((w, k) => <p key={k} className="mt-1 text-xs text-amber-700">⚠ {w}</p>)}
            </>
          ) : null}
          <p className="mt-1 text-xs text-stone-400">{def.source}</p>
        </section>
      ))}

      {report.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-palm-900">Saved calculator results</h2>
          {report.map((r) => (
            <div key={r.id} className="print-break rounded-xl bg-white p-4 text-sm shadow-sm">
              <h3 className="font-semibold">{r.title}</h3>
              <ul className="mt-1 text-stone-700">{r.lines.map((l, k) => <li key={k}>{l}</li>)}</ul>
            </div>
          ))}
        </section>
      )}
      <p className="text-xs text-stone-500">Generated by iTake Academy. Calculations follow the MPOB Palm Oil Mill Pocketbook with known errata corrected. Check all results before use in design.</p>
    </div>
  )
}
