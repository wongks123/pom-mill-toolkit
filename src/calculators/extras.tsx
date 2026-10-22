import { triplePeakProfile } from '../engine/sterilisation'
import { pfMultiplier } from '../engine/electrical'
import type { OilLossOutput } from '../engine/process'
import type { CostOutput } from '../engine/cost'
import profile from '../data/sterilisationProfile.json'
import costData from '../data/productionCost.json'
import { fmt } from '../components/format'
import { ReviewBadge } from '../components/ReviewBadge'
import type { CalcDef } from './types'

type ExtraProps = Parameters<NonNullable<CalcDef['Extra']>>[0]

export function SterilisationExtra({ values, out }: ExtraProps) {
  const cooking = out.outputs.find((o) => o.label === 'Cooking time')?.value ?? 0
  const steps = triplePeakProfile(cooking, values.blowOffMin)
  const total = steps[steps.length - 1].endMin || 1
  const W = 320
  const H = 140
  const pMax = 3.5
  const x = (t: number) => 30 + (t / total) * (W - 40)
  const y = (p: number) => H - 20 - (p / pMax) * (H - 35)
  const pts = steps.flatMap((s) => [`${x(s.startMin)},${y(s.pStart)}`, `${x(s.endMin)},${y(s.pEnd)}`]).join(' ')
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Triple-peak cycle</h3>
        {profile.review && <ReviewBadge />}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-white" role="img" aria-label="Steriliser pressure against time">
        {[0, 1, 2, 3].map((p) => (
          <g key={p}>
            <line x1={30} x2={W - 10} y1={y(p)} y2={y(p)} stroke="#e7e5e4" />
            <text x={4} y={y(p) + 3} fontSize={9} fill="#78716c">{p} bar</text>
          </g>
        ))}
        <polyline points={pts} fill="none" stroke="#15803d" strokeWidth={2} />
        {steps.map((s) => (
          <text key={s.id} x={x((s.startMin + s.endMin) / 2)} y={H - 6} fontSize={8} textAnchor="middle" fill="#57534e">{s.id}</text>
        ))}
        <text x={W - 10} y={12} fontSize={9} textAnchor="end" fill="#78716c">{fmt(total, 0)} min</text>
      </svg>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-stone-100 text-left">
            <tr><th className="p-1.5">Step</th><th className="p-1.5">Time (min)</th><th className="p-1.5">bar g</th><th className="p-1.5">Inlet</th><th className="p-1.5">Exhaust</th><th className="p-1.5">Cond.</th></tr>
          </thead>
          <tbody>
            {steps.map((s) => (
              <tr key={s.id} className="border-t border-stone-200" title={s.purpose}>
                <td className="p-1.5"><b>{s.id}</b> {s.name}</td>
                <td className="p-1.5 num">{fmt(s.startMin, 1)}–{fmt(s.endMin, 1)}</td>
                <td className="p-1.5 num">{s.pStart}→{s.pEnd}</td>
                <td className="p-1.5">{s.inlet}</td>
                <td className="p-1.5">{s.exhaust}</td>
                <td className="p-1.5">{s.condensate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-500">{profile.source}</p>
    </div>
  )
}

const PF_FROM = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85]
const PF_TO = [0.85, 0.9, 0.95, 1.0]

export function PfTableExtra({ values }: ExtraProps) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Multiplier table (computed)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs num">
          <thead className="bg-stone-100">
            <tr><th className="p-1.5 text-left">PF1 → PF2</th>{PF_TO.map((t) => <th key={t} className="p-1.5">{t.toFixed(2)}</th>)}</tr>
          </thead>
          <tbody>
            {PF_FROM.map((f) => (
              <tr key={f} className="border-t border-stone-200">
                <td className="p-1.5 font-semibold">{f.toFixed(2)}</td>
                {PF_TO.map((t) => {
                  const hit = Math.abs(f - values.pf1) < 1e-6 && Math.abs(t - values.pf2) < 1e-6
                  const corrected = f === 0.55 && t === 0.95
                  return (
                    <td key={t} className={`p-1.5 text-center ${hit ? 'bg-palm-200 font-bold' : ''} ${corrected ? 'underline decoration-fruit-500 decoration-2' : ''}`}>
                      {t > f ? pfMultiplier(f, t).toFixed(3) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-500">Underlined: 0.55 → 0.95 is 1.190. The pocketbook p.11 table prints 1.490.</p>
    </div>
  )
}

const LIGHT = { green: 'bg-green-500', amber: 'bg-amber-400', red: 'bg-red-500' }

export function OilLossExtra({ out }: ExtraProps) {
  const d = out.data as OilLossOutput
  const max = Math.max(...d.streams.map((s) => Math.max(s.lossPct, s.benchmarkPct)), 0.01)
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-lg bg-white p-3">
        <span className={`h-8 w-8 shrink-0 rounded-full ${LIGHT[d.light]}`} aria-hidden />
        <div>
          <div className="font-semibold">Total {fmt(d.totalPct, 2)}% FFB vs benchmark {fmt(d.benchmarkPct, 2)}%</div>
          <div className="text-xs text-stone-500">Green ≤ benchmark · amber ≤ 120% · red above</div>
        </div>
      </div>
      {d.streams.map((s) => (
        <div key={s.id} className="text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full ${LIGHT[s.light]}`} />{s.name}</span>
            <span className="num">{fmt(s.lossPct, 3)}% <span className="text-stone-400">/ {s.benchmarkPct}%</span></span>
          </div>
          <div className="relative mt-1 h-2 rounded bg-stone-200">
            <div className="absolute h-2 rounded bg-palm-700" style={{ width: `${(s.lossPct / max) * 100}%` }} />
            <div className="absolute -top-1 h-4 w-0.5 bg-stone-700" style={{ left: `${(s.benchmarkPct / max) * 100}%` }} title="benchmark" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CostExtra({ out }: ExtraProps) {
  const d = out.data as CostOutput
  const max = Math.max(...d.breakdown.map((b) => b.rmPerT))
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Cost breakdown (RM/t FFB)</h3>
        {costData.placeholder && <ReviewBadge label="PLACEHOLDER" />}
      </div>
      {d.breakdown.map((b) => (
        <div key={b.name} className="text-sm">
          <div className="flex justify-between"><span>{b.name}</span><span className="num">{fmt(b.rmPerT, 2)}</span></div>
          <div className="mt-1 h-2 rounded bg-stone-200"><div className="h-2 rounded bg-fruit-500" style={{ width: `${(b.rmPerT / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  )
}
