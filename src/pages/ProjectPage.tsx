import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DEFAULT_PROJECT, Project, ProjectKey, useProject } from '../project/ProjectContext'

const FIELDS: { key: ProjectKey; label: string; unit?: string; max?: number }[] = [
  { key: 'capacityTph', label: 'Mill capacity', unit: 't FFB/h' },
  { key: 'fruitRatio', label: 'Fruit / FFB', max: 1 },
  { key: 'fibreRatio', label: 'Fibre / FFB', max: 1 },
  { key: 'nutRatio', label: 'Nut / FFB', max: 1 },
  { key: 'dcoRatio', label: 'Diluted crude oil / FFB' },
  { key: 'steamDemand', label: 'Steam demand', unit: 'kg/t FFB' },
]

export default function ProjectPage() {
  const { project, setProject, report, removeFromReport, clearReport } = useProject()
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(project ?? DEFAULT_PROJECT).map(([k, v]) => [k, String(v)])),
  )
  const errors = FIELDS.map((f) => {
    const v = Number(draft[f.key])
    if (draft[f.key]?.trim() === '' || !Number.isFinite(v) || v <= 0) return `${f.label} must be greater than zero`
    if (f.max && v > f.max) return `${f.label} must be at most ${f.max}`
    return null
  }).filter(Boolean)

  const save = () => {
    if (errors.length) return
    const p = { name: draft.name || 'My mill', ...Object.fromEntries(FIELDS.map((f) => [f.key, Number(draft[f.key])])) } as Project
    setProject(p)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ project, report }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(project?.name ?? 'project').replace(/\W+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importJson = (file: File) => {
    file.text().then((t) => {
      try {
        const d = JSON.parse(t)
        if (d.project) {
          setProject(d.project)
          setDraft(Object.fromEntries(Object.entries(d.project).map(([k, v]) => [k, String(v)])))
        }
      } catch {
        alert('Not a valid project file')
      }
    })
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-palm-900">Project mode</h1>
      <p className="text-stone-600">Enter your mill's capacity and key ratios once. Every calculator prefills with them (marked "project"), and the Mill Design Summary sizes everything in one go.</p>
      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium">Project name
          <input value={draft.name ?? ''} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="block text-sm font-medium">{f.label}{f.unit && <span className="text-stone-400"> ({f.unit})</span>}
              <input type="number" inputMode="decimal" value={draft[f.key] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5" />
            </label>
          ))}
        </div>
        {errors.length > 0 && <ul className="text-sm text-red-600">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        <div className="flex flex-wrap gap-2">
          <button onClick={save} disabled={errors.length > 0} className="rounded-lg bg-palm-700 px-4 py-2.5 font-medium text-white disabled:opacity-40">{project ? 'Update project' : 'Start project'}</button>
          {project && <button onClick={() => setProject(null)} className="rounded-lg border border-stone-300 px-4 py-2.5">Turn off project mode</button>}
        </div>
        {project && <p className="text-sm text-palm-800">✓ Active: {project.name}, {project.capacityTph} t/h</p>}
      </section>

      <Link to="/project/summary" className="block rounded-xl bg-palm-900 p-4 text-center font-semibold text-white">Open Mill Design Summary →</Link>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Saved calculator results ({report.length})</h2>
          {report.length > 0 && <button onClick={clearReport} className="text-sm text-red-600 underline">Clear all</button>}
        </div>
        {report.length === 0 ? (
          <p className="text-sm text-stone-500">Use "Add to project report" on any calculator to save a result here.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {report.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span><b>{r.title}</b> · {r.primary}</span>
                <button onClick={() => removeFromReport(r.id)} className="text-stone-400" aria-label="Remove">✕</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-wrap gap-2 text-sm">
        <button onClick={exportJson} disabled={!project} className="rounded-lg border border-stone-300 bg-white px-3 py-2 disabled:opacity-40">Export project (JSON)</button>
        <label className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2">Import project
          <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </label>
      </section>
      <p className="text-xs text-stone-500">Projects are saved in this browser only.</p>
    </div>
  )
}
