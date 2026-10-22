import { useMemo, useState } from 'react'
import type { CalcDef, CalcOutput } from '../calculators/types'
import { initialValues } from '../calculators/registry'
import { InputError } from '../engine/types'
import { useProject } from '../project/ProjectContext'
import { InputField, validateInput } from './InputField'
import { ResultCard } from './ResultCard'
import { FormulaBlock } from './FormulaBlock'
import { StepWorking } from './StepWorking'
import { fmt } from './format'
import { makeSnapshot } from '../report/snapshot'

const toRaw = (v: Record<string, number>) => Object.fromEntries(Object.entries(v).map(([k, n]) => [k, String(n)]))

export function CalculatorShell({ def, initial }: { def: CalcDef; initial?: { inputs: Record<string, number>; note?: string } }) {
  const { project, addToReport, addHistory } = useProject()
  const [raw, setRaw] = useState<Record<string, string>>(() => toRaw({ ...initialValues(def, project as unknown as Record<string, unknown>), ...(initial?.inputs ?? {}) }))
  const [note, setNote] = useState(initial?.note ?? '')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [trainer, setTrainer] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const { out, error, values } = useMemo(() => {
    const values: Record<string, number> = {}
    for (const i of def.inputs) values[i.key] = Number(raw[i.key])
    for (const i of def.inputs) {
      if (i.showIf && !i.showIf(values)) {
        if (!Number.isFinite(values[i.key])) values[i.key] = i.default
        continue
      }
      const e = validateInput(i, raw[i.key] ?? '').error
      if (e) return { out: undefined, error: `${i.label}: ${e}`, values }
    }
    try {
      return { out: def.compute(values) as CalcOutput, error: undefined, values }
    } catch (e) {
      return { out: undefined, error: e instanceof InputError ? e.message : `Calculation error: ${(e as Error).message}`, values }
    }
  }, [raw, def])

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 1800)
  }

  const summaryLines = () =>
    out
      ? [
          ...def.inputs.filter((i) => !i.showIf || i.showIf(values)).map((i) => `${i.label}: ${i.options ? i.options.find((o) => o.value === values[i.key])?.label : values[i.key]} ${i.unit ?? ''}`.trim()),
          `→ ${out.primary.label}: ${fmt(out.primary.value, out.primary.digits)} ${out.primary.unit}`,
          ...out.outputs.map((o) => `→ ${o.label}: ${fmt(o.value, o.digits)} ${o.unit}`),
        ]
      : []

  const copy = async () => {
    const text = [def.title, ...summaryLines(), `Source: ${def.source}`].join('\n')
    try {
      await navigator.clipboard.writeText(text)
      flash('Copied')
    } catch {
      flash('Copy not available')
    }
  }

  const hidden = trainer && !revealed

  const snapshot = () => (out ? makeSnapshot(def, values, out, project?.name) : null)

  const downloadPdf = async () => {
    const s = snapshot()
    if (!s) return
    setPdfBusy(true)
    try {
      const { downloadCalcPdf } = await import('../report/pdf')
      await downloadCalcPdf(s, note.trim() || undefined)
    } catch (e) {
      flash(`PDF failed: ${(e as Error).message}`)
    } finally {
      setPdfBusy(false)
    }
  }

  const saveHistory = () => {
    const s = snapshot()
    if (!s) return
    addHistory(s, note)
    flash('Saved to history')
  }

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-palm-900">{def.title}</h1>
        <p className="text-stone-600">{def.purpose}</p>
      </header>

      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Inputs</h2>
          <label className="flex items-center gap-1.5 text-xs text-stone-500">
            <input type="checkbox" checked={trainer} onChange={(e) => { setTrainer(e.target.checked); setRevealed(false) }} />
            Trainer mode
          </label>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {def.inputs.filter((i) => !i.showIf || i.showIf(values)).map((i) => (
            <InputField
              key={i.key}
              def={i}
              raw={raw[i.key] ?? ''}
              onChange={(r) => { setRaw((s) => ({ ...s, [i.key]: r })); setRevealed(false) }}
              fromProject={!!(i.project && project && raw[i.key] === String(project[i.project]))}
            />
          ))}
        </div>
        <button onClick={() => setRaw(toRaw(Object.fromEntries(def.inputs.map((i) => [i.key, i.default]))))} className="text-sm font-medium text-palm-700 underline">
          Reset to pocketbook defaults
        </button>
      </section>

      {hidden ? (
        <button onClick={() => setRevealed(true)} className="w-full rounded-xl border-2 border-dashed border-palm-600 p-6 font-semibold text-palm-800">
          Work it out first, then tap to reveal the result
        </button>
      ) : (
        <>
          <ResultCard primary={out?.primary} outputs={out?.outputs ?? []} warnings={out?.warnings ?? []} error={error} />
          {out && def.Extra && (
            <section className="rounded-xl bg-white p-4 shadow-sm">
              <def.Extra values={values} out={out} />
            </section>
          )}
        </>
      )}

      <FormulaBlock lines={def.formula} />
      {out && !hidden && <StepWorking steps={out.steps} />}

      <p className={`rounded-lg p-3 text-sm ${def.corrected ? 'bg-fruit-100 text-orange-900' : 'bg-stone-100 text-stone-600'}`}>
        <b>Source:</b> {def.source}
      </p>

      <section className="no-print space-y-2 rounded-xl bg-white p-4 shadow-sm">
        <label htmlFor="calc-note" className="text-sm font-medium text-stone-700">Note for history / report <span className="font-normal text-stone-400">(optional)</span></label>
        <input id="calc-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Mill A – kernel screw #2" className="w-full rounded-lg border border-stone-300 px-3 py-2.5" />
        <div className="flex gap-2">
          <button disabled={!out || pdfBusy} onClick={downloadPdf} className="flex-1 rounded-lg bg-palm-900 px-4 py-2.5 font-medium text-white disabled:opacity-40">{pdfBusy ? 'Preparing…' : 'Download PDF'}</button>
          <button disabled={!out} onClick={saveHistory} className="flex-1 rounded-lg border border-palm-700 px-4 py-2.5 font-medium text-palm-800 disabled:opacity-40">Save to history</button>
        </div>
      </section>

      <div className="flex gap-2">
        <button disabled={!out} onClick={copy} className="flex-1 rounded-lg border border-palm-700 px-4 py-2.5 font-medium text-palm-800 disabled:opacity-40">Copy</button>
        <button
          disabled={!out}
          onClick={() => {
            if (!out) return
            addToReport({ calcId: def.id, title: def.title, primary: `${out.primary.label}: ${fmt(out.primary.value, out.primary.digits)} ${out.primary.unit}`, lines: summaryLines() })
            flash('Added to project report')
          }}
          className="flex-1 rounded-lg bg-palm-700 px-4 py-2.5 font-medium text-white disabled:opacity-40"
        >
          Add to project report
        </button>
      </div>
      {toast && <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2 text-sm text-white">{toast}</div>}
    </div>
  )
}
