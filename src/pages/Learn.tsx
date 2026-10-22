import { Link, useNavigate } from 'react-router-dom'
import stationsData from '../data/stations.json'

const stations = [...stationsData.stations].sort((a, b) => a.order - b.order)

// Snake layout: row 0 left→right, row 1 right→left, row 2 left→right
const BOX_W = 100
const BOX_H = 64
const pos = (k: number) => {
  const row = Math.floor(k / 3)
  const colInRow = k % 3
  const col = row % 2 === 0 ? colInRow : 2 - colInRow
  return { x: 10 + col * 115, y: 10 + row * 100 }
}

const OUTPUTS: Record<string, string> = {
  reception: 'FFB in',
  threshing: '→ EFB',
  clarification: '→ CPO',
  nutfibre: '→ fibre fuel',
  kernel: '→ kernel',
  boiler: 'steam + power',
  effluent: '→ biogas, water',
}

function MillFlow() {
  const nav = useNavigate()
  return (
    <svg viewBox="0 0 345 290" className="w-full max-w-xl" role="img" aria-label="Palm oil mill process flow. Tap a station.">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#78716c" />
        </marker>
      </defs>
      {stations.slice(0, -1).map((s, k) => {
        const a = pos(k)
        const b = pos(k + 1)
        const sameRow = a.y === b.y
        const x1 = sameRow ? (b.x > a.x ? a.x + BOX_W : a.x) : a.x + BOX_W / 2
        const y1 = sameRow ? a.y + BOX_H / 2 : a.y + BOX_H
        const x2 = sameRow ? (b.x > a.x ? b.x : b.x + BOX_W) : b.x + BOX_W / 2
        const y2 = sameRow ? b.y + BOX_H / 2 : b.y
        return <line key={s.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#78716c" strokeWidth={1.5} markerEnd="url(#arr)" />
      })}
      {stations.map((s, k) => {
        const p = pos(k)
        return (
          <g
            key={s.id}
            role="link"
            tabIndex={0}
            aria-label={s.name}
            onClick={() => nav(`/learn/station/${s.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && nav(`/learn/station/${s.id}`)}
            className="cursor-pointer [&:hover>rect]:fill-palm-100 [&:focus>rect]:stroke-fruit-500"
          >
            <rect x={p.x} y={p.y} width={BOX_W} height={BOX_H} rx={10} fill="#fff" stroke="#15803d" strokeWidth={1.5} />
            <circle cx={p.x + 14} cy={p.y + 14} r={9} fill="#15803d" />
            <text x={p.x + 14} y={p.y + 17.5} fontSize={10} textAnchor="middle" fill="#fff" fontWeight="bold">{s.order}</text>
            <foreignObject x={p.x + 4} y={p.y + 24} width={BOX_W - 8} height={BOX_H - 26}>
              <div style={{ fontSize: 10.5, fontWeight: 600, lineHeight: 1.15, textAlign: 'center', color: '#14532d' }}>{s.name}</div>
              {OUTPUTS[s.id] && <div style={{ fontSize: 8.5, textAlign: 'center', color: '#c2410c' }}>{OUTPUTS[s.id]}</div>}
            </foreignObject>
          </g>
        )
      })}
    </svg>
  )
}

const TOPICS = [
  { to: '/learn/mass-balance', title: 'Mass balance', text: 'Where 1,000 kg FFB goes' },
  { to: '/learn/oil-losses', title: 'Oil losses', text: 'Where and how much' },
  { to: '/learn/quality', title: 'Quality', text: 'CPO standards, FFA, DOBI' },
  { to: '/learn/environment', title: 'Environment', text: 'DOE limits, biogas' },
  { to: '/learn/glossary', title: 'Glossary', text: 'CPO, EFB, NOS, OER…' },
]

export default function Learn() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-palm-900">How a palm oil mill works</h1>
        <p className="text-stone-600">Tap a station to learn what it does, what to measure, what goes wrong, and to test yourself.</p>
      </header>
      <section className="flex justify-center rounded-xl bg-white p-3 shadow-sm">
        <MillFlow />
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Stations</h2>
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {stations.map((s) => (
            <li key={s.id}>
              <Link to={`/learn/station/${s.id}`} className="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm hover:bg-palm-50">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-palm-700 text-sm font-bold text-white">{s.order}</span>
                <span className="font-medium">{s.name}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2 className="mb-2 font-semibold">Topics</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {TOPICS.map((t) => (
            <Link key={t.to} to={t.to} className="rounded-lg bg-white p-3 shadow-sm hover:bg-palm-50">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-stone-500">{t.text}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
