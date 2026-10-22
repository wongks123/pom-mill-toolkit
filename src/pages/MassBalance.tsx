import { useState } from 'react'
import { Link } from 'react-router-dom'
import data from '../data/massBalance.json'
import { massBalance } from '../engine/process'
import { fmt } from '../components/format'
import { ReviewBadge } from '../components/ReviewBadge'

const W = 760
const H = 440
const NODE_W = 12
const GAP = 14
const COLOR: Record<string, string> = { cpo: '#ea580c', kernel: '#b45309', efb: '#65a30d', fibre: '#a16207', shell: '#57534e', pome: '#0284c7', cond: '#38bdf8', nutloss: '#a8a29e' }

function Sankey({ ffbKg }: { ffbKg: number }) {
  const { links } = massBalance({ ffbKg }).values
  const value = (id: string) => Math.max(links.filter((l) => l.to === id).reduce((a, l) => a + l.kg, 0), links.filter((l) => l.from === id).reduce((a, l) => a + l.kg, 0))
  const maxCol = Math.max(...data.nodes.map((n) => n.col))
  const cols = Array.from({ length: maxCol + 1 }, (_, c) => data.nodes.filter((n) => n.col === c))
  const maxGaps = Math.max(...cols.map((c) => c.length - 1))
  const scale = (H - 20 - maxGaps * GAP) / ffbKg
  const layout: Record<string, { x: number; y: number; h: number }> = {}
  cols.forEach((col, c) => {
    let y = 10
    for (const n of col) {
      const h = value(n.id) * scale
      layout[n.id] = { x: 10 + (c * (W - 150)) / maxCol, y, h }
      y += h + GAP
    }
  })
  const outOff: Record<string, number> = {}
  const inOff: Record<string, number> = {}
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" role="img" aria-label="Mass balance Sankey diagram">
      {links.map((l) => {
        const s = layout[l.from]
        const t = layout[l.to]
        const w = l.kg * scale
        const y0 = s.y + (outOff[l.from] ?? 0) + w / 2
        const y1 = t.y + (inOff[l.to] ?? 0) + w / 2
        outOff[l.from] = (outOff[l.from] ?? 0) + w
        inOff[l.to] = (inOff[l.to] ?? 0) + w
        const x0 = s.x + NODE_W
        const x1 = t.x
        const mx = (x0 + x1) / 2
        return (
          <path key={`${l.from}-${l.to}`} d={`M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}`} stroke={COLOR[l.to] ?? '#15803d'} strokeOpacity={0.35} strokeWidth={Math.max(w, 1)} fill="none">
            <title>{`${l.from} → ${l.to}: ${fmt(l.kg, 0)} kg`}</title>
          </path>
        )
      })}
      {data.nodes.map((n) => {
        const p = layout[n.id]
        return (
          <g key={n.id}>
            <rect x={p.x} y={p.y} width={NODE_W} height={Math.max(p.h, 1)} fill={COLOR[n.id] ?? '#14532d'} rx={2} />
            <text x={p.x + NODE_W + 4} y={p.y + p.h / 2} dominantBaseline="middle" fontSize={11} fill="#1c1917">
              <tspan fontWeight={600}>{n.name}</tspan>
              <tspan fill="#57534e"> {fmt(value(n.id), 0)} kg</tspan>
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default function MassBalance() {
  const [ffbT, setFfbT] = useState('1')
  const t = Number(ffbT)
  const ok = Number.isFinite(t) && t > 0
  const products = ok ? massBalance({ ffbKg: t * 1000 }).values.products : []
  return (
    <div className="space-y-4">
      <Link to="/learn" className="text-sm text-palm-700">← Learn</Link>
      <h1 className="text-2xl font-bold text-palm-900">Mass balance</h1>
      <p className="text-stone-600">Follow what happens to the FFB, from the steriliser to the final products. Hover or tap a flow for its value.</p>
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><ReviewBadge /> {data.source}</p>
      <label className="flex max-w-xs items-center gap-2">
        <span className="text-sm font-medium">FFB input</span>
        <input type="number" inputMode="decimal" value={ffbT} onChange={(e) => setFfbT(e.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2" />
        <span className="text-sm">t</span>
      </label>
      {ok ? (
        <>
          <div className="overflow-x-auto rounded-xl bg-white p-3 shadow-sm"><Sankey ffbKg={t * 1000} /></div>
          <section className="rounded-xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 font-semibold">Products and by-products</h2>
            <table className="w-full text-sm num">
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-stone-100">
                    <td className="py-1.5">{p.name}</td>
                    <td className="py-1.5 text-right">{fmt(p.kg / 1000, 3)} t</td>
                    <td className="py-1.5 text-right text-stone-500">{p.pct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <Link to="/calc/massbalance" className="inline-block text-sm text-palm-700 underline">Open the mass balance calculator</Link>
        </>
      ) : (
        <p className="text-red-600">Enter an FFB quantity greater than zero.</p>
      )}
    </div>
  )
}
