import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import stationsData from '../data/stations.json'
import { getCalculator } from '../calculators/registry'
import { ReviewBadge } from '../components/ReviewBadge'
import NotFound from './NotFound'

type Station = (typeof stationsData.stations)[number]
const sorted = [...stationsData.stations].sort((a, b) => a.order - b.order)

function Quiz({ station }: { station: Station }) {
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const done = Object.keys(answers).length === station.quiz.length
  const score = station.quiz.filter((q, k) => answers[k] === q.answer).length
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-3 font-semibold">Quiz</h2>
      <ol className="space-y-4">
        {station.quiz.map((q, k) => {
          const picked = answers[k]
          return (
            <li key={k}>
              <p className="mb-2 font-medium">{k + 1}. {q.q}</p>
              <div className="grid gap-1.5">
                {q.options.map((o, j) => {
                  const state = picked === undefined ? '' : j === q.answer ? 'border-green-600 bg-green-50' : j === picked ? 'border-red-500 bg-red-50' : 'opacity-60'
                  return (
                    <button key={j} disabled={picked !== undefined} onClick={() => setAnswers((a) => ({ ...a, [k]: j }))} className={`rounded-lg border border-stone-300 px-3 py-2 text-left text-sm ${state}`}>
                      {o}
                    </button>
                  )
                })}
              </div>
              {picked !== undefined && <p className="mt-1.5 text-sm text-stone-600">{picked === q.answer ? '✅ Correct. ' : '❌ Not quite. '}{q.explain}</p>}
            </li>
          )
        })}
      </ol>
      {done && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-palm-100 p-3">
          <span className="font-semibold">Score: {score} / {station.quiz.length}</span>
          <button onClick={() => setAnswers({})} className="text-sm text-palm-800 underline">Try again</button>
        </div>
      )}
    </section>
  )
}

export default function StationPage() {
  const { id } = useParams()
  const idx = sorted.findIndex((s) => s.id === id)
  if (idx < 0) return <NotFound />
  const s = sorted[idx]
  const prev = sorted[idx - 1]
  const next = sorted[idx + 1]
  return (
    <div className="space-y-4" key={s.id}>
      <Link to="/learn" className="text-sm text-palm-700">← Mill overview</Link>
      <header>
        <div className="text-sm text-stone-500">Station {s.order} of {sorted.length}</div>
        <h1 className="text-2xl font-bold text-palm-900">{s.name}</h1>
      </header>
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><ReviewBadge /> {stationsData.reviewNote}</p>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-1 font-semibold">Purpose</h2>
        <p className="text-stone-700">{s.purpose}</p>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">How it works</h2>
        <ol className="list-decimal space-y-1 pl-5 text-stone-700">
          {s.howItWorks.map((h, k) => <li key={k}>{h}</li>)}
        </ol>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Key equipment</h2>
          <ul className="space-y-1.5 text-sm">
            {s.keyEquipment.map((e, k) => (
              <li key={k} className="flex justify-between gap-2 border-b border-stone-100 pb-1">
                <span>{e.name}</span>
                <span className="text-right text-stone-500">{'rpm' in e && e.rpm ? `${e.rpm} rpm` : ''}{'rpm' in e && e.rpm && e.size ? ' · ' : ''}{e.size}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-semibold">Key parameters</h2>
          <ul className="space-y-1.5 text-sm">
            {s.keyParameters.map((p, k) => (
              <li key={k} className="flex justify-between gap-2 border-b border-stone-100 pb-1">
                <span>{p.name}</span>
                <span className="text-right font-medium text-palm-800">{p.target}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Common problems</h2>
        <div className="space-y-2">
          {s.commonProblems.map((p, k) => (
            <div key={k} className="rounded-lg border border-stone-200 p-3 text-sm">
              <div className="font-semibold text-red-700">Symptom: {p.symptom}</div>
              <div><span className="text-stone-500">Likely cause:</span> {p.cause}</div>
              <div><span className="text-stone-500">Action:</span> {p.action}</div>
            </div>
          ))}
        </div>
      </section>

      {s.relatedCalculators.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Related calculators</h2>
          <div className="flex flex-wrap gap-2">
            {s.relatedCalculators.map((c) => {
              const def = getCalculator(c)
              return def ? <Link key={c} to={`/calc/${c}`} className="rounded-full bg-palm-700 px-3 py-1.5 text-sm text-white">{def.title}</Link> : null
            })}
          </div>
        </section>
      )}

      <Quiz station={s} />

      <nav className="flex justify-between gap-2 text-sm">
        {prev ? <Link to={`/learn/station/${prev.id}`} className="rounded-lg bg-white px-3 py-2 shadow-sm">← {prev.name}</Link> : <span />}
        {next ? <Link to={`/learn/station/${next.id}`} className="rounded-lg bg-white px-3 py-2 shadow-sm">{next.name} →</Link> : <span />}
      </nav>
    </div>
  )
}
