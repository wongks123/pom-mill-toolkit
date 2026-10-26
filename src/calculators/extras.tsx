import { triplePeakProfile } from '../engine/sterilisation'
import { pfMultiplier } from '../engine/electrical'
import type { OilLossOutput } from '../engine/process'
import type { CostOutput } from '../engine/cost'
import profile from '../data/sterilisationProfile.json'
import costData from '../data/productionCost.json'
import conveyorData from '../data/conveyors.json'
import { CONVEYOR_MATERIALS, type ConveyorOutput, type ConveyorType } from '../engine/conveyor'
import { pumpSystem, type PumpSystemInput, type PumpSystemOutput } from '../engine/pumpSystem'
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

export function ConveyorExtra({ out }: ExtraProps) {
  const d = out.data as { values: ConveyorOutput; material: (typeof CONVEYOR_MATERIALS)[number]; typeId: ConveyorType }
  const v = d.values
  const suited = CONVEYOR_MATERIALS.filter((m) => m.suits.includes(d.typeId))
  const rows: [string, string][] = [
    ['Motor', `${v.motorKw} kW`],
    ['Gearbox ratio', `${v.ratioSelected} : 1${v.extraReduction > 1 ? ` + chain ${fmt(v.extraReduction, 2)} : 1` : ''}`],
    ['Gearbox size / model', v.gearbox],
    ['Gearbox output', `${fmt(v.outputRpm, 1)} rpm · ${fmt(v.torqueNm, 0)} N·m (design ${fmt(v.designTorqueNm, 0)} N·m)`],
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Drive selection</h3>
        {conveyorData.review && <ReviewBadge />}
      </div>
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
        {rows.map(([k, val]) => (
          <div key={k} className="contents">
            <dt className="text-stone-500">{k}</dt>
            <dd className="font-medium">{val}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-stone-500">
        {d.material.name}: ρ {d.material.density} t/m³, scraper μ {d.material.scraperMu}, screw λ {d.material.screwLambda}, screw fill {d.material.screwFill}, belt surcharge {d.material.surcharge}°.
        Gearbox sizes are generic torque classes for helical-bevel units; confirm with your supplier.
      </p>
      <p className="text-xs text-stone-500">Usual materials for this conveyor: {suited.map((m) => m.name).join(', ')}.</p>
    </div>
  )
}

export function PumpSystemExtra({ out }: ExtraProps) {
  const d = out.data as { input: PumpSystemInput; values: PumpSystemOutput }
  const v = d.values
  const inp = d.input
  // Schematic: liquid levels and pump drawn to a shared vertical scale.
  const levels = [inp.suctionLevelM, inp.dischargeLevelM, inp.pumpLevelM]
  const lo = Math.min(...levels)
  const hi = Math.max(...levels, lo + 1)
  const yOf = (z: number) => 200 - ((z - lo) / (hi - lo)) * 140
  const ys = yOf(inp.suctionLevelM)
  const yd = yOf(inp.dischargeLevelM)
  const yp = yOf(inp.pumpLevelM)
  const pipe = `M 70 ${ys + 18} V ${yp} H 150 M 190 ${yp} H 260 V ${yd - 22} H 300`
  const dur = Math.max(0.6, 6 / Math.max(0.2, (v.dischargeVelocity ?? 1.5)))

  // Head breakdown (single series, horizontal bars).
  const parts: [string, number][] = [
    ['Pressure', v.pressureHeadM],
    ['Static lift', v.staticHeadM],
    ['Suction loss', v.suctionLossM],
    ['Discharge loss', v.dischargeLossM],
  ]
  const maxAbs = Math.max(1, ...parts.map(([, x]) => Math.abs(x)))
  const powers: [string, number][] = [['Hydraulic', v.hydraulicKw], ['Pump shaft', v.shaftKw], ['Motor input', v.motorInputKw]]
  const maxPower = Math.max(0.001, ...powers.map(([, x]) => x))

  // System curve H(Q) from 0 to 2 × duty flow.
  const qMax = Math.max(1, inp.flowM3h * 2)
  const pts = Array.from({ length: 41 }, (_, k) => {
    const q = (qMax * k) / 40
    try {
      return [q, pumpSystem({ ...inp, flowM3h: q }).values.headM] as const
    } catch {
      return [q, Number.NaN] as const
    }
  }).filter(([, h]) => Number.isFinite(h))
  const hMin = Math.min(0, ...pts.map(([, h]) => h))
  const hMax = Math.max(1, ...pts.map(([, h]) => h))
  const X = (q: number) => 44 + (q / qMax) * 266
  const Y = (h: number) => 170 - ((h - hMin) / (hMax - hMin)) * 140
  const curve = pts.map(([q, h], k) => `${k ? 'L' : 'M'}${X(q).toFixed(1)} ${Y(h).toFixed(1)}`).join(' ')
  const ink = 'currentColor'

  return (
    <div className="space-y-5 text-stone-700">
      <div>
        <h3 className="font-semibold">System overview</h3>
        <svg viewBox="0 0 360 240" className="mt-2 w-full rounded-lg bg-palm-50" role="img" aria-label="Suction tank, pump and discharge tank at their elevations">
          <rect x="30" y={ys - 10} width="80" height="60" rx="3" fill="#fff" stroke={ink} strokeWidth="2" />
          <rect x="32" y={ys} width="76" height="48" fill="#a7d8f0" />
          <rect x="280" y={yd - 40} width="60" height="50" rx="3" fill="#fff" stroke={ink} strokeWidth="2" />
          <rect x="282" y={yd - 30} width="56" height="38" fill="#a7d8f0" />
          <path d={pipe} fill="none" stroke="#78716c" strokeWidth="7" strokeLinejoin="round" />
          <path d={pipe} fill="none" stroke="#e0f2fe" strokeWidth="2.5" strokeDasharray="4 10" strokeLinejoin="round">
            {inp.flowM3h > 0 && <animate attributeName="stroke-dashoffset" from="28" to="0" dur={`${dur.toFixed(2)}s`} repeatCount="indefinite" />}
          </path>
          <circle cx="170" cy={yp} r="20" fill="#15803d" stroke="#14532d" strokeWidth="3" />
          <path d={`M170 ${yp - 11} L180 ${yp + 8} H160 Z`} fill="#dcfce7" />
          <g fontSize="11" fill={ink}>
            <text x="30" y={ys - 16}>Suction {inp.suctionBarg} bar g · {inp.suctionLevelM} m</text>
            <text x="350" y={yd - 46} textAnchor="end">Discharge {inp.dischargeBarg} bar g · {inp.dischargeLevelM} m</text>
            <text x="170" y={yp + 36} textAnchor="middle">Pump · {inp.pumpLevelM} m</text>
            <text x="215" y={yp - 8}>{inp.flowM3h} m³/h</text>
          </g>
        </svg>
        <p className="mt-1 text-xs text-stone-500">Not to scale horizontally; heights follow the levels you entered.</p>
      </div>

      <div>
        <h3 className="font-semibold">Where the head goes</h3>
        <svg viewBox="0 0 360 140" className="mt-2 w-full" role="img" aria-label="Head breakdown in metres">
          <line x1="100" y1="6" x2="100" y2="134" stroke="#d6d3d1" />
          {parts.map(([label, x], k) => {
            const w = (Math.abs(x) / maxAbs) * 190
            const y = 10 + k * 32
            return (
              <g key={label}>
                <title>{`${label}: ${fmt(x, 2)} m`}</title>
                <text x="94" y={y + 15} textAnchor="end" fontSize="11" fill={ink}>{label}</text>
                <rect x="100" y={y} width={Math.max(w, 0.5)} height="22" rx="4" fill={x < 0 ? '#a8a29e' : '#15803d'} />
                <text x={104 + w} y={y + 15} fontSize="11" fill={ink}>{fmt(x, 2)} m</text>
              </g>
            )
          })}
        </svg>
      </div>

      <div>
        <h3 className="font-semibold">Power conversion</h3>
        <svg viewBox="0 0 360 110" className="mt-2 w-full" role="img" aria-label="Hydraulic, pump shaft and motor input power in kW">
          <line x1="100" y1="6" x2="100" y2="104" stroke="#d6d3d1" />
          {powers.map(([label, x], k) => {
            const w = (x / maxPower) * 190
            const y = 10 + k * 32
            return (
              <g key={label}>
                <title>{`${label}: ${fmt(x, 2)} kW`}</title>
                <text x="94" y={y + 15} textAnchor="end" fontSize="11" fill={ink}>{label}</text>
                <rect x="100" y={y} width={Math.max(w, 0.5)} height="22" rx="4" fill="#15803d" />
                <text x={104 + w} y={y + 15} fontSize="11" fill={ink}>{fmt(x, 2)} kW</text>
              </g>
            )
          })}
        </svg>
        <p className="mt-1 text-xs text-stone-500">Hydraulic = power given to the liquid. Shaft = after pump losses. Motor input = drawn from the supply.</p>
      </div>

      <div>
        <h3 className="font-semibold">System curve</h3>
        <svg viewBox="0 0 330 200" className="mt-2 w-full" role="img" aria-label="Required head against flow rate, with the duty point">
          <line x1="44" y1="30" x2="44" y2="170" stroke="#d6d3d1" />
          <line x1="44" y1="170" x2="310" y2="170" stroke="#d6d3d1" />
          {[0, 0.5, 1].map((t) => (
            <g key={t} fontSize="10" fill="#78716c">
              <text x={X(t * qMax)} y="184" textAnchor="middle">{fmt(t * qMax, 0)}</text>
              <text x="38" y={Y(hMin + (hMax - hMin) * t) + 3} textAnchor="end">{fmt(hMin + (hMax - hMin) * t, 0)}</text>
            </g>
          ))}
          <path d={curve} fill="none" stroke="#15803d" strokeWidth="2" />
          <g>
            <title>{`Duty: ${inp.flowM3h} m³/h at ${fmt(v.headM, 2)} m`}</title>
            <circle cx={X(inp.flowM3h)} cy={Y(v.headM)} r="10" fill="transparent" />
            <circle cx={X(inp.flowM3h)} cy={Y(v.headM)} r="5" fill="#14532d" stroke="#fff" strokeWidth="2" />
          </g>
          <text x={X(inp.flowM3h) + 8} y={Y(v.headM) - 8} fontSize="11" fill={ink}>{fmt(v.headM, 1)} m</text>
          <text x="177" y="198" textAnchor="middle" fontSize="10" fill="#78716c">Flow (m³/h)</text>
          <text x="10" y="24" fontSize="10" fill="#78716c">Head (m)</text>
        </svg>
        <p className="mt-1 text-xs text-stone-500">Head your pump must give at each flow. Choose a pump whose curve crosses this line at your duty point.</p>
      </div>
    </div>
  )
}
