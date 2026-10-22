import { useState } from 'react'
import { DataTable } from '../components/DataTable'
import { TABLES } from './referenceTables'

export default function Reference() {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? TABLES.filter((t) => t.title.toLowerCase().includes(needle) || t.columns.some((c) => c.toLowerCase().includes(needle)) || t.rows.some((r) => r.some((c) => String(c).toLowerCase().includes(needle))))
    : TABLES
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-palm-900">Reference tables</h1>
      <input
        type="search"
        placeholder="Search tables, e.g. kernel, BOD, density, C20"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5"
      />
      {!needle && (
        <nav className="flex flex-wrap gap-1.5 text-xs">
          {TABLES.map((t) => <a key={t.id} href={`#/reference`} onClick={(e) => { e.preventDefault(); document.getElementById(`t-${t.id}`)?.scrollIntoView({ behavior: 'smooth' }) }} className="rounded-full bg-white px-2.5 py-1 shadow-sm">{t.title}</a>)}
        </nav>
      )}
      <p className="text-sm text-stone-500">{shown.length} of {TABLES.length} tables. Tables marked [REVIEW] are drafts not yet checked against the pocketbook.</p>
      {shown.map((t) => <div id={`t-${t.id}`} key={t.id} className="scroll-mt-20"><DataTable table={t} highlight={needle} /></div>)}
    </div>
  )
}
