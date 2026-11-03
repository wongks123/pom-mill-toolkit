import type { ReactNode } from 'react'
import type { CalcDef } from './types'
import type { Co2Output, FirePumpOutput } from '../engine/fire'
import { fmt } from '../components/format'

type ExtraProps = Parameters<NonNullable<CalcDef['Extra']>>[0]

// Head-breakdown colours (validated categorical slots 1–4; every segment also carries a text label).
const SERIES = { residual: '#2a78d6', static: '#eb6834', friction: '#1baf7a', nozzle: '#eda100' }
const INK = '#44403c'
const MUTED = '#78716c'
const STEEL = '#a8a29e'
const STEEL_DARK = '#57534e'
const WATER = '#93c5fd'
const WATER_DARK = '#3b82f6'
const RED = '#dc2626'

const Panel = ({ title, children, note }: { title: string; children: ReactNode; note?: string }) => (
  <div>
    <h3 className="font-semibold">{title}</h3>
    <div className="mt-2 overflow-hidden rounded-lg border border-stone-200 bg-gradient-to-b from-white to-palm-50">{children}</div>
    {note && <p className="mt-1 text-xs text-stone-500">{note}</p>}
  </div>
)

const T = ({ x, y, children, anchor = 'middle', size = 9, fill = INK, weight }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; size?: number; fill?: string; weight?: 'bold' }) => (
  <text x={x} y={y} fontSize={size} textAnchor={anchor} fill={fill} fontWeight={weight}>{children}</text>
)

/** Pipe with water moving through it. */
const Pipe = ({ d, width = 6, dur = '1s' }: { d: string; width?: number; dur?: string }) => (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={STEEL} strokeWidth={width} />
    <path d={d} stroke={WATER_DARK} strokeWidth={Math.max(1.5, width / 2.6)} strokeDasharray="3 7">
      <animate attributeName="stroke-dashoffset" from="20" to="0" dur={dur} repeatCount="indefinite" />
    </path>
  </g>
)

const Pump = ({ cx, cy, r = 13 }: { cx: number; cy: number; r?: number }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />
    <g>
      <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="0.8s" repeatCount="indefinite" />
      {[0, 1, 2, 3].map((k) => <line key={k} x1={cx} y1={cy} x2={cx + (r - 4) * Math.cos((k * Math.PI) / 2)} y2={cy + (r - 4) * Math.sin((k * Math.PI) / 2)} stroke="#fff" strokeWidth="2" strokeLinecap="round" />)}
    </g>
  </g>
)

/** Water spray from a nozzle: droplets fanning out, staggered. */
const Spray = ({ x, y, dir = 1, reach = 28, drop = 14, n = 5 }: { x: number; y: number; dir?: number; reach?: number; drop?: number; n?: number }) => (
  <g>
    {Array.from({ length: n }, (_, k) => (
      <circle key={k} r="1.8" fill={WATER_DARK}>
        <animateMotion path={`M${x} ${y} Q${x + dir * reach * 0.6} ${y - 6 - k} ${x + dir * reach * (0.7 + k * 0.08)} ${y + drop + k * 2}`} dur="1.1s" begin={`${(-1.1 * k) / n}s`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;1;0" dur="1.1s" begin={`${(-1.1 * k) / n}s`} repeatCount="indefinite" />
      </circle>
    ))}
  </g>
)

/** Downward cone spray from a sprinkler head. */
const SprinklerSpray = ({ x, y, h = 30 }: { x: number; y: number; h?: number }) => (
  <g>
    <path d={`M${x - 3} ${y} L${x + 3} ${y} L${x} ${y + 4} Z`} fill={RED} />
    {[-1, -0.5, 0, 0.5, 1].map((s, k) => (
      <circle key={k} r="1.5" fill={WATER_DARK}>
        <animateMotion path={`M${x} ${y + 4} L${x + s * h * 0.6} ${y + h}`} dur="0.9s" begin={`${-k * 0.18}s`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0" dur="0.9s" begin={`${-k * 0.18}s`} repeatCount="indefinite" />
      </circle>
    ))}
  </g>
)

/** Stacked bar of what the pump head is made of, growing in on load, with direct labels. */
function HeadBreakdown({ parts, design }: { parts: { label: string; value: number; color: string }[]; design: number }) {
  const W = 320
  const shown = parts.filter((p) => p.value > 0)
  const total = shown.reduce((a, p) => a + p.value, 0)
  const scale = W / Math.max(design, total, 1e-9)
  let x = 20
  return (
    <svg viewBox="0 0 360 118" className="block w-full" role="img" aria-label="Pump head breakdown">
      {shown.map((p) => {
        const w = p.value * scale
        const seg = (
          <g key={p.label}>
            <title>{`${p.label}: ${fmt(p.value, 2)} m`}</title>
            <rect x={x} y={16} width={Math.max(w - 2, 0.5)} height={26} rx="4" fill={p.color}>
              <animate attributeName="width" from="0" to={Math.max(w - 2, 0.5)} dur="0.9s" fill="freeze" />
            </rect>
          </g>
        )
        x += w
        return seg
      })}
      {design > total && (
        <g>
          <title>{`Safety margin: ${fmt(design - total, 2)} m`}</title>
          <rect x={x} y={16} width={(design - total) * scale - 2} height={26} rx="4" fill="none" stroke={MUTED} strokeWidth="1.5" strokeDasharray="4 3" />
          <T x={x + ((design - total) * scale) / 2} y={33} size={8} fill={MUTED}>SF</T>
        </g>
      )}
      <line x1={20 + design * scale} y1={10} x2={20 + design * scale} y2={48} stroke={INK} strokeWidth="1.5" />
      <T x={Math.min(20 + design * scale, 340)} y={8} anchor="end" size={9} weight="bold">{`Design ${fmt(design, 1)} m`}</T>
      {shown.map((p, k) => (
        <g key={p.label} transform={`translate(${20 + (k % 2) * 165} ${62 + Math.floor(k / 2) * 18})`}>
          <rect width="10" height="10" rx="2" fill={p.color} />
          <T x={15} y={9} anchor="start">{`${p.label}: ${fmt(p.value, 2)} m (${fmt((p.value / Math.max(total, 1e-9)) * 100, 0)}%)`}</T>
        </g>
      ))}
    </svg>
  )
}

// ---------- 1. Fire water storage tank ----------
export function FireTankExtra({ out }: ExtraProps) {
  const d = out.data as { hydrantM3: number; hoseReelM3: number; sprinklerM3: number; totalM3: number; effectiveM3?: number; tank?: { h: number; w: number; d: number; suc: number; low: number; head: number } }
  const tank = d.tank
  // Drawing: tank 40..220 wide, base y=190, inside height 150 px.
  const base = 190
  const inner = 150
  const top = base - inner
  let deadPx = 0
  let headPx = 0
  let waterPx = inner * 0.75
  if (tank && d.effectiveM3) {
    const per = inner / tank.h
    deadPx = (tank.suc + tank.low) * per
    headPx = tank.head * per
    waterPx = inner - deadPx - headPx
  }
  const cap = tank && d.effectiveM3 ? d.effectiveM3 : d.totalM3
  const pxPerM3 = waterPx / Math.max(cap, d.totalM3, 1e-9)
  const layers = [
    { label: 'Sprinkler', m3: d.sprinklerM3, color: SERIES.friction },
    { label: 'Hose reel', m3: d.hoseReelM3, color: SERIES.nozzle },
    { label: 'Hydrant', m3: d.hydrantM3, color: SERIES.residual },
  ].filter((l) => l.m3 > 0)
  let y = base - deadPx
  let lastLabelY = Infinity
  const short = d.effectiveM3 !== undefined && d.effectiveM3 < d.totalM3
  return (
    <Panel title="What fills the tank" note="Layers grow to scale. Dead water below the low level and the headroom for the ball float valve are not usable.">
      <svg viewBox="0 0 360 220" className="block w-full" role="img" aria-label="Fire water tank with storage layers">
        <rect x="40" y={top} width="180" height={inner} fill="#fff" stroke={STEEL_DARK} strokeWidth="3" />
        {deadPx > 0 && <rect x="42" y={base - deadPx} width="176" height={deadPx} fill="#d6d3d1" />}
        {deadPx > 0 && <T x={130} y={base - deadPx / 2 + 3} size={8} fill={MUTED}>dead water (suction + low level)</T>}
        {headPx > 0 && <T x={130} y={top + headPx / 2 + 3} size={8} fill={MUTED}>headroom (ball float valve)</T>}
        {layers.map((l) => {
          const h = l.m3 * pxPerM3
          y -= h
          return (
            <g key={l.label}>
              <title>{`${l.label}: ${fmt(l.m3, 2)} m³`}</title>
              <rect x="42" y={y} width="176" height={h} fill={l.color} opacity="0.85">
                <animate attributeName="height" from="0" to={h} dur="1.2s" fill="freeze" />
                <animate attributeName="y" from={y + h} to={y} dur="1.2s" fill="freeze" />
              </rect>
              {(() => {
                const ly = Math.min(y + h / 2, lastLabelY - 13)
                lastLabelY = ly
                return (
                  <g>
                    <path d={`M220 ${y + h / 2} L230 ${y + h / 2} L236 ${ly}`} fill="none" stroke={MUTED} />
                    <T x={240} y={ly + 3} anchor="start">{`${l.label} ${fmt(l.m3, 1)} m³`}</T>
                  </g>
                )
              })()}
            </g>
          )
        })}
        <path d={`M42 ${y} q11 -4 22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0 t22 0`} fill="none" stroke="#fff" strokeWidth="2">
          <animateTransform attributeName="transform" type="translate" values="0 0;-11 0;0 0" dur="2.5s" repeatCount="indefinite" />
        </path>
        {short && <line x1="36" y1={base - deadPx - d.totalM3 * pxPerM3} x2="224" y2={base - deadPx - d.totalM3 * pxPerM3} stroke={RED} strokeWidth="2" strokeDasharray="5 3" />}
        <T x={130} y={top - 8} weight="bold">{`Required ${fmt(d.totalM3, 1)} m³${d.effectiveM3 !== undefined ? ` · effective ${fmt(d.effectiveM3, 1)} m³` : ''}`}</T>
        {short && <T x={240} y={top + 6} anchor="start" size={9} fill={RED} weight="bold">Tank too small</T>}
        <Pipe d={`M40 ${base - 8} L14 ${base - 8} L14 210 L60 210`} width={6} />
        <T x={64} y={213} anchor="start" size={8}>to fire pumps</T>
      </svg>
    </Panel>
  )
}

// ---------- 2. Pressurised hydrant pump ----------
export function FireHydrantExtra({ out }: ExtraProps) {
  const d = out.data as { x: FirePumpOutput; staticM: number; hydrants: number; dn: number; flowLpm: number; sfPct: number }
  const x = d.x
  const n = Math.max(1, Math.min(4, Math.round(d.hydrants)))
  const rise = Math.min(50, Math.max(0, d.staticM) * 3)
  const ground = 150
  const hy = ground - rise
  const xs = Array.from({ length: 4 }, (_, k) => 175 + k * 45)
  return (
    <div className="space-y-4">
      <Panel title="System at work" note={`${n} of the hydrants run together. Water speed in the main: ${fmt(x.velocity, 2)} m/s.`}>
        <svg viewBox="0 0 360 190" className="block w-full" role="img" aria-label="Fire tank, hydrant pump and hydrants discharging">
          <line x1="0" y1={ground} x2="150" y2={ground} stroke="#d6d3d1" strokeWidth="2" />
          <path d={`M150 ${ground} L165 ${hy} L360 ${hy}`} fill="none" stroke="#d6d3d1" strokeWidth="2" />
          {/* tank */}
          <rect x="10" y="70" width="55" height="80" fill="#fff" stroke={STEEL_DARK} strokeWidth="2.5" />
          <rect x="12" y="92" width="51" height="56" fill={WATER} />
          <T x={37} y={64}>Fire tank</T>
          <Pipe d={`M65 138 L92 138`} />
          <Pump cx={105} cy={138} />
          <T x={105} y={168}>Duty pump</T>
          <Pipe d={`M118 138 L150 138 L150 ${hy + 18} L345 ${hy + 18}`} width={7} dur={`${Math.max(0.3, 3 / Math.max(x.velocity, 0.1)).toFixed(2)}s`} />
          <T x={240} y={hy + 34} size={8}>{`DN${d.dn} main · ${fmt(d.flowLpm, 0)} L/min`}</T>
          {xs.map((hx, k) => {
            const on = k < n
            return (
              <g key={hx}>
                <rect x={hx - 5} y={hy - 24} width="10" height="42" rx="3" fill={on ? RED : '#fca5a5'} />
                <rect x={hx - 8} y={hy - 28} width="16" height="6" rx="2" fill={on ? '#991b1b' : '#fecaca'} />
                <circle cx={hx + 7} cy={hy - 12} r="3" fill={on ? '#991b1b' : '#fecaca'} />
                {on && <Spray x={hx + 9} y={hy - 12} reach={22} drop={20} />}
              </g>
            )
          })}
          <T x={242} y={hy - 36} weight="bold">{`Hydrants: ${fmt(d.flowLpm / n, 0)} L/min each`}</T>
          {rise > 0 && (
            <g>
              <line x1="350" y1={ground} x2="350" y2={hy} stroke={MUTED} strokeDasharray="3 2" />
              <T x={346} y={(ground + hy) / 2 + 3} anchor="end" size={8}>{`${fmt(d.staticM, 1)} m`}</T>
            </g>
          )}
        </svg>
      </Panel>
      <Panel title="Where the pump head goes">
        <HeadBreakdown
          design={x.designHeadM}
          parts={[
            { label: 'Residual at hydrant', value: x.residualM, color: SERIES.residual },
            { label: 'Static lift', value: d.staticM, color: SERIES.static },
            { label: 'Pipe + fitting friction', value: x.frictionM, color: SERIES.friction },
          ]}
        />
      </Panel>
    </div>
  )
}

// ---------- 3. Hose reel pump ----------
export function FireHoseReelExtra({ out }: ExtraProps) {
  const d = out.data as { x: FirePumpOutput; staticM: number; nozzleM: number; dn: number; flowLpm: number }
  const x = d.x
  const floors = Math.max(1, Math.min(4, Math.round(d.staticM / 4) + 1))
  const ground = 185
  const fh = 150 / floors
  const topY = ground - (floors - 1) * fh
  return (
    <div className="space-y-4">
      <Panel title="System at work" note="The pump must lift water to the highest drum, push it through the pipe and fittings, and still give the residual pressure at the nozzle.">
        <svg viewBox="0 0 360 200" className="block w-full" role="img" aria-label="Hose reel pump feeding the highest hose reel">
          {Array.from({ length: floors }, (_, k) => <line key={k} x1="80" y1={ground - k * fh} x2="350" y2={ground - k * fh} stroke="#d6d3d1" strokeWidth="2" />)}
          <rect x="10" y="135" width="44" height="50" fill="#fff" stroke={STEEL_DARK} strokeWidth="2" />
          <rect x="12" y="150" width="40" height="33" fill={WATER} />
          <T x={32} y={130}>HR tank</T>
          <Pipe d="M54 172 L74 172" />
          <Pump cx={86} cy={172} r={11} />
          <Pipe d={`M97 172 L120 172 L120 ${topY - 22} L262 ${topY - 22}`} width={5} />
          <T x={124} y={(ground + topY) / 2} anchor="start" size={8}>riser</T>
          {/* hose reel drum on the highest floor */}
          <g>
            <circle cx="280" cy={topY - 22} r="16" fill="#fff" stroke={RED} strokeWidth="3" />
            <g>
              <animateTransform attributeName="transform" type="rotate" from={`0 280 ${topY - 22}`} to={`360 280 ${topY - 22}`} dur="3s" repeatCount="indefinite" />
              <circle cx="280" cy={topY - 22} r="10" fill="none" stroke={RED} strokeWidth="2" strokeDasharray="5 3" />
            </g>
            <path d={`M296 ${topY - 22} q14 6 22 12`} fill="none" stroke={RED} strokeWidth="2.5" />
            <Spray x={318} y={topY - 10} reach={24} drop={10} />
          </g>
          <T x={280} y={topY - 44} weight="bold">{`Highest drum · ${fmt(d.flowLpm, 0)} L/min`}</T>
          <line x1="345" y1={ground} x2="345" y2={topY} stroke={MUTED} strokeDasharray="3 2" />
          <T x={341} y={(ground + topY) / 2 + 3} anchor="end" size={8}>{`static ${fmt(d.staticM, 1)} m`}</T>
          <T x={200} y={topY - 28} size={8}>{`DN${d.dn} · ${fmt(x.velocity, 2)} m/s`}</T>
        </svg>
      </Panel>
      <Panel title="Where the pump head goes">
        <HeadBreakdown
          design={x.designHeadM}
          parts={[
            { label: 'Residual at drum', value: x.residualM, color: SERIES.residual },
            { label: 'Static lift', value: d.staticM, color: SERIES.static },
            { label: 'Pipe + fitting friction', value: x.frictionM, color: SERIES.friction },
            { label: 'Nozzle / hose', value: d.nozzleM, color: SERIES.nozzle },
          ]}
        />
      </Panel>
    </div>
  )
}

// ---------- 4. Sprinkler pump & water supply ----------
export function FireSprinklerReqExtra({ out }: ExtraProps) {
  const d = out.data as { hazard: string; heightM: number; heightClass: number; flowLpm: number; pressureBar: number; storageM3: number }
  const hPx = 30 + Math.min(1, d.heightM / 45) * 110
  const ground = 190
  const topY = ground - hPx
  return (
    <Panel title="Sprinkler installation" note={`Height class ${d.heightClass} m: the table value covers buildings up to this height between the lowest and highest sprinkler.`}>
      <svg viewBox="0 0 360 205" className="block w-full" role="img" aria-label="Building with sprinklers discharging, fed by pump and tank">
        <line x1="0" y1={ground} x2="360" y2={ground} stroke="#d6d3d1" strokeWidth="2" />
        {/* building */}
        <rect x="150" y={topY - 14} width="190" height={hPx + 14} fill="#fafaf9" stroke={STEEL_DARK} strokeWidth="2" />
        {[topY, ground - 20].map((yy, r) => (
          <g key={r}>
            <line x1="150" y1={yy} x2="340" y2={yy} stroke={STEEL} strokeWidth="3" />
            {[175, 215, 255, 295].map((sx) => <SprinklerSpray key={sx} x={sx} y={yy} h={r ? 18 : 26} />)}
          </g>
        ))}
        <line x1="332" y1={ground - 20} x2="332" y2={topY} stroke={MUTED} strokeDasharray="3 2" />
        <T x={328} y={(ground - 20 + topY) / 2 + 3} anchor="end" size={8}>{`${fmt(d.heightM, 0)} m`}</T>
        <T x={245} y={topY - 20} weight="bold">{d.hazard}</T>
        {/* supply */}
        <rect x="8" y="118" width="52" height="72" fill="#fff" stroke={STEEL_DARK} strokeWidth="2" />
        <rect x="10" y="136" width="48" height="52" fill={WATER} />
        <T x={34} y={112}>{`${fmt(d.storageM3, 0)} m³`}</T>
        <Pipe d="M60 176 L80 176" />
        <Pump cx={92} cy={176} r={11} />
        <Pipe d={`M103 176 L130 176 L130 ${topY} L150 ${topY} M130 ${ground - 20} L150 ${ground - 20}`} width={5} />
        <rect x="122" y="150" width="16" height="12" rx="2" fill={RED} />
        <T x={92} y={150}>{`${fmt(d.flowLpm, 0)} L/min`}</T>
        <T x={92} y={140}>{`${fmt(d.pressureBar, 1)} bar`}</T>
        <T x={130} y={172} size={7} fill={MUTED}>valve</T>
      </svg>
    </Panel>
  )
}

// ---------- 5. Sprinkler pipe loss (design point) ----------
export function FireSprinklerLossExtra({ out }: ExtraProps) {
  const d = out.data as { segments: { dn: number; eqM: number; lossMbar: number }[]; totalMbar: number }
  const segs = d.segments.filter((s) => s.eqM > 0)
  const totalEq = segs.reduce((a, s) => a + s.eqM, 0) || 1
  // Short runs are widened so their labels fit; the rest share the remaining width by equivalent length.
  const MIN = 52
  const raw = segs.map((s) => (s.eqM / totalEq) * 290)
  const extra = raw.reduce((a, w) => a + Math.max(0, MIN - w), 0)
  const bigTotal = raw.filter((w) => w > MIN).reduce((a, w) => a + w, 0) || 1
  const widths = raw.map((w) => (w <= MIN ? MIN : w - (extra * w) / bigTotal))
  const x0 = 30
  const W = 290
  const thick: Record<number, number> = { 150: 12, 100: 9, 80: 7, 65: 5 }
  let x = x0
  let cum = 0
  const pts: [number, number][] = [[x0, 0]]
  const pipeY = 150
  const chartTop = 30
  const chartH = 70
  const yOf = (mbar: number) => chartTop + (mbar / Math.max(d.totalMbar, 1e-9)) * chartH
  return (
    <Panel title="Pressure lost along the pipe" note="Longer run = longer equivalent length (length + 3 m per turn); short runs are widened so labels fit. Steeper line = bigger loss per metre, as in the small pipes.">
      <svg viewBox="0 0 360 200" className="block w-full" role="img" aria-label="Pressure loss from installation valve to design point">
        <line x1={x0} y1={chartTop} x2={x0 + W} y2={chartTop} stroke="#d6d3d1" />
        <line x1={x0} y1={chartTop + chartH} x2={x0 + W} y2={chartTop + chartH} stroke="#d6d3d1" strokeDasharray="3 3" />
        <T x={x0} y={chartTop - 6} anchor="start" size={8} fill={MUTED}>Valve 0 mbar</T>
        {segs.map((s, k) => {
          const w = widths[k]
          const g = (
            <g key={s.dn}>
              <title>{`DN${s.dn}: ${fmt(s.eqM, 1)} m equivalent, ${fmt(s.lossMbar, 1)} mbar`}</title>
              <Pipe d={`M${x} ${pipeY} L${x + w} ${pipeY}`} width={thick[s.dn] ?? 6} />
              <T x={x + w / 2} y={pipeY + 22} size={8}>{`DN${s.dn}`}</T>
              <T x={x + w / 2} y={pipeY + 33} size={8} fill={MUTED}>{`${fmt(s.lossMbar, 0)} mbar`}</T>
              <line x1={x + w} y1={pipeY - 10} x2={x + w} y2={pipeY + 10} stroke={MUTED} />
            </g>
          )
          x += w
          cum += s.lossMbar
          pts.push([x, cum])
          return g
        })}
        <path d={pts.map(([px, m], k) => `${k ? 'L' : 'M'}${px.toFixed(1)} ${yOf(m).toFixed(1)}`).join(' ')} fill="none" stroke={SERIES.residual} strokeWidth="2.5" strokeDasharray="600" strokeDashoffset="600">
          <animate attributeName="stroke-dashoffset" from="600" to="0" dur="1.6s" fill="freeze" />
        </path>
        <circle r="4" fill={SERIES.residual}>
          <animateMotion path={pts.map(([px, m], k) => `${k ? 'L' : 'M'}${px.toFixed(1)} ${yOf(m).toFixed(1)}`).join(' ')} dur="3s" repeatCount="indefinite" />
        </circle>
        <T x={x0 + W} y={chartTop + chartH + 12} anchor="end" weight="bold">{`Design point −${fmt(d.totalMbar, 1)} mbar`}</T>
        <rect x={x0 - 18} y={pipeY - 9} width="16" height="18" rx="2" fill={RED} />
        <T x={x0 - 10} y={pipeY - 14} size={7} fill={MUTED}>valve</T>
        <SprinklerSpray x={x0 + W + 12} y={pipeY - 2} h={22} />
      </svg>
    </Panel>
  )
}

// ---------- 6. Fire alarm battery ----------
export function FireBatteryExtra({ out }: ExtraProps) {
  const d = out.data as { standbyA: number; alarmA: number; standbyH: number; alarmH: number; requiredAh: number; selectedAh: number; safetyPct: number }
  const standbyAh = d.standbyA * d.standbyH
  const alarmAh = d.alarmA * d.alarmH
  const sel = Number.isFinite(d.selectedAh) ? d.selectedAh : d.requiredAh
  const used = Math.min(1, d.requiredAh / Math.max(sel, 1e-9))
  const fillH = 96
  const W = 300
  const scale = W / Math.max(sel, d.requiredAh, 1e-9)
  const sw = standbyAh * scale
  const aw = alarmAh * scale
  const mw = (d.requiredAh - standbyAh - alarmAh) * scale
  return (
    <Panel title="How the battery is used" note={`On mains failure the panel runs ${d.standbyH} h on standby, then must still sound the alarm for ${d.alarmH} h.`}>
      <svg viewBox="0 0 360 210" className="block w-full" role="img" aria-label="Battery capacity used by standby and alarm load">
        {/* two 12 V batteries in series */}
        {[0, 1].map((k) => {
          const bx = 40 + k * 90
          return (
            <g key={k}>
              <rect x={bx} y="24" width="70" height="104" rx="6" fill="#fff" stroke={INK} strokeWidth="2.5" />
              <rect x={bx + 14} y="16" width="12" height="8" fill={INK} /><rect x={bx + 44} y="16" width="12" height="8" fill={INK} />
              <rect x={bx + 4} y={28} width="62" height={fillH} rx="3" fill={SERIES.friction} opacity="0.85">
                <animate attributeName="height" values={`${fillH};${fillH * (1 - used)};${fillH * (1 - used)};${fillH}`} keyTimes="0;0.6;0.9;1" dur="6s" repeatCount="indefinite" />
                <animate attributeName="y" values={`28;${28 + fillH * used};${28 + fillH * used};28`} keyTimes="0;0.6;0.9;1" dur="6s" repeatCount="indefinite" />
              </rect>
              <T x={bx + 35} y={82} weight="bold">12 V</T>
            </g>
          )
        })}
        <path d="M66 16 L66 8 L144 8 L144 16" fill="none" stroke={INK} strokeWidth="2" />
        <T x={105} y={146}>{`2 × ${fmt(sel, 0)} Ah in series = 24 V`}</T>
        <T x={285} y={50} weight="bold">{`Uses ${fmt(used * 100, 0)}% of capacity`}</T>
        <T x={285} y={64} size={8} fill={MUTED}>after standby + alarm</T>
        <T x={285} y={90}>{`Standby ${fmt(d.standbyA, 3)} A × ${d.standbyH} h`}</T>
        <T x={285} y={104}>{`Alarm ${fmt(d.alarmA, 3)} A × ${d.alarmH} h`}</T>
        {/* capacity bar */}
        <g>
          <title>{`Standby ${fmt(standbyAh, 2)} Ah, alarm ${fmt(alarmAh, 2)} Ah, safety ${fmt(d.requiredAh - standbyAh - alarmAh, 2)} Ah`}</title>
          <rect x="30" y="166" width={W} height="20" rx="4" fill="none" stroke={STEEL_DARK} strokeWidth="1.5" />
          <rect x="30" y="166" width={Math.max(sw - 1, 0.5)} height="20" rx="4" fill={SERIES.residual} />
          <rect x={30 + sw} y="166" width={Math.max(aw - 1, 0.5)} height="20" rx="4" fill={SERIES.static} />
          {mw > 1 && <rect x={30 + sw + aw} y="166" width={mw - 1} height="20" rx="4" fill="none" stroke={MUTED} strokeDasharray="4 3" />}
        </g>
        <T x={30} y={200} anchor="start" size={8}>{`Standby ${fmt(standbyAh, 1)} Ah`}</T>
        <T x={180} y={200} size={8}>{`Alarm ${fmt(alarmAh, 1)} Ah`}</T>
        <T x={330} y={200} anchor="end" size={8}>{`Battery ${fmt(sel, 0)} Ah`}</T>
        <T x={30} y={160} anchor="start" size={8} fill={MUTED}>{`+${d.safetyPct}% safety = ${fmt(d.requiredAh, 1)} Ah needed`}</T>
      </svg>
    </Panel>
  )
}

// ---------- 7. CO2 total flooding ----------
export function FireCo2Extra({ out }: ExtraProps) {
  const d = out.data as { x: Co2Output; cylinderKg: number; nozzles: number; dims: [number, number, number] }
  const x = d.x
  const cyl = Math.min(8, x.cylinders)
  const noz = Math.max(1, Math.min(8, Math.round(d.nozzles)))
  const roomX = 120
  const roomW = 225
  const roomTop = 40
  const roomH = 140
  const nx = Array.from({ length: noz }, (_, k) => roomX + ((k + 0.5) * roomW) / noz)
  const ceilY = roomTop + 14
  return (
    <Panel title="Discharge into the room" note={`Full discharge in 7 min; 30% concentration needed in 2 min. Design flow ${fmt(x.flowKgMin, 1)} kg/min, ${fmt(x.perNozzleKgMin, 1)} kg/min per nozzle.`}>
      <svg viewBox="0 0 360 215" className="block w-full" role="img" aria-label="CO2 cylinders discharging into the protected room">
        {/* room */}
        <rect x={roomX} y={roomTop} width={roomW} height={roomH} fill="#fafaf9" stroke={STEEL_DARK} strokeWidth="2.5" />
        <rect x={roomX + 2} y={roomTop + roomH - 2} width={roomW - 4} height="0" fill="#e5e7eb" opacity="0.9">
          <animate attributeName="height" values={`0;${roomH - 4};${roomH - 4};0`} keyTimes="0;0.7;0.92;1" dur="7s" repeatCount="indefinite" />
          <animate attributeName="y" values={`${roomTop + roomH - 2};${roomTop + 2};${roomTop + 2};${roomTop + roomH - 2}`} keyTimes="0;0.7;0.92;1" dur="7s" repeatCount="indefinite" />
        </rect>
        <rect x={roomX + 20} y={roomTop + roomH - 46} width="44" height="44" fill="#d6d3d1" stroke={STEEL_DARK} />
        <T x={roomX + 42} y={roomTop + roomH - 20} size={8}>MSB</T>
        <T x={roomX + roomW / 2} y={roomTop - 8} weight="bold">{`${fmt(d.dims[0], 2)} × ${fmt(d.dims[1], 2)} × ${fmt(d.dims[2], 2)} m = ${fmt(x.volumeM3, 1)} m³`}</T>
        {/* cylinders */}
        {Array.from({ length: cyl }, (_, k) => {
          const cx = 14 + (k % 4) * 22
          const cy = 100 + Math.floor(k / 4) * 58
          return (
            <g key={k}>
              <rect x={cx} y={cy} width="16" height="52" rx="7" fill={RED} stroke="#7f1d1d" />
              <rect x={cx + 5} y={cy - 6} width="6" height="6" fill={STEEL_DARK} />
            </g>
          )
        })}
        <T x={38} y={90} anchor="start">{`${x.cylinders} × ${d.cylinderKg} kg`}</T>
        <Pipe d={`M30 96 L30 ${ceilY - 18} L${roomX - 6} ${ceilY - 18} L${roomX - 6} ${ceilY} L${nx[nx.length - 1]} ${ceilY}`} width={5} dur="0.6s" />
        <T x={(30 + roomX) / 2} y={ceilY - 24} size={8}>{`main DN${x.pipes[0]?.dnMm ?? '—'}`}</T>
        {x.pipes[1] && <T x={nx[0] + 8} y={ceilY - 4} anchor="start" size={8} fill={MUTED}>{`branch DN${x.pipes[1].dnMm}`}</T>}
        {nx.map((px) => (
          <g key={px}>
            <rect x={px - 3} y={ceilY} width="6" height="6" fill={STEEL_DARK} />
            {[0, 1, 2].map((k) => (
              <circle key={k} cx={px} cy={ceilY + 10} r="4" fill="#f5f5f4" stroke="#d6d3d1">
                <animate attributeName="r" values="3;18" dur="1.6s" begin={`${-k * 0.53}s`} repeatCount="indefinite" />
                <animate attributeName="cy" values={`${ceilY + 10};${ceilY + 40}`} dur="1.6s" begin={`${-k * 0.53}s`} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0" dur="1.6s" begin={`${-k * 0.53}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        ))}
        <T x={roomX + roomW - 6} y={roomTop + roomH - 8} anchor="end" size={8} fill={MUTED}>CO₂ fills the room</T>
        <T x={roomX + roomW / 2} y={208}>{`${fmt(x.providedKg, 0)} kg CO₂ · ${noz} nozzle${noz > 1 ? 's' : ''} · ${x.branches} branch${x.branches > 1 ? 'es' : ''}`}</T>
      </svg>
    </Panel>
  )
}
