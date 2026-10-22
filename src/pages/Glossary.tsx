import { useState } from 'react'
import { Link } from 'react-router-dom'
import data from '../data/glossary.json'

export default function Glossary() {
  const [q, setQ] = useState('')
  const n = q.trim().toLowerCase()
  const terms = data.terms
    .filter((t) => !n || `${t.term} ${t.full} ${t.def}`.toLowerCase().includes(n))
    .sort((a, b) => a.term.localeCompare(b.term))
  return (
    <div className="space-y-4">
      <Link to="/learn" className="text-sm text-palm-700">← Learn</Link>
      <h1 className="text-2xl font-bold text-palm-900">Glossary</h1>
      <input type="search" placeholder="Search terms" value={q} onChange={(e) => setQ(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5" />
      <dl className="divide-y divide-stone-200 rounded-xl bg-white shadow-sm">
        {terms.map((t) => (
          <div key={t.term} className="p-3">
            <dt className="font-semibold text-palm-900">{t.term}{t.full && <span className="font-normal text-stone-500"> · {t.full}</span>}</dt>
            <dd className="text-sm text-stone-700">{t.def}</dd>
          </div>
        ))}
        {terms.length === 0 && <p className="p-3 text-stone-500">No matching terms.</p>}
      </dl>
    </div>
  )
}
