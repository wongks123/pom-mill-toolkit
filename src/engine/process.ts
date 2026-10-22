import oilLosses from '../data/oilLosses.json'
import pressCakeTargets from '../data/pressCakeTargets.json'
import massBalanceData from '../data/massBalance.json'
import { CalcResult, Step, requireNonNegative, requirePositive } from './types'

/** OER from oil-to-bunch (lab bunch analysis) × 0.855 extraction factor. */
export function oerFromBunch(i: { oilToBunchPct: number; factor: number }): CalcResult<{ oerPct: number }> {
  requirePositive({ 'Oil to bunch': i.oilToBunchPct, Factor: i.factor })
  const oerPct = i.oilToBunchPct * i.factor
  const warnings: string[] = []
  if (oerPct < 18 || oerPct > 24) warnings.push('Malaysian mill OER is usually 19–22%.')
  return {
    values: { oerPct },
    steps: [{ label: 'OER', formula: `oil/bunch × ${i.factor} = ${i.oilToBunchPct} × ${i.factor}`, value: oerPct, unit: '%' }],
    warnings,
  }
}

export function oerKerFromProduction(i: { ffbT: number; cpoT: number; kernelT: number }): CalcResult<{ oerPct: number; kerPct: number }> {
  requirePositive({ 'FFB processed': i.ffbT })
  requireNonNegative({ CPO: i.cpoT, Kernel: i.kernelT })
  const oerPct = (i.cpoT / i.ffbT) * 100
  const kerPct = (i.kernelT / i.ffbT) * 100
  const warnings: string[] = []
  if (oerPct < 18 || oerPct > 24) warnings.push('OER outside 18–24%. Check crop quality, stock readings or losses.')
  if (kerPct < 4 || kerPct > 7) warnings.push('KER outside 4–7%. Check kernel losses or crop mix.')
  return {
    values: { oerPct, kerPct },
    steps: [
      { label: 'OER', formula: `CPO / FFB × 100 = ${i.cpoT} / ${i.ffbT} × 100`, value: oerPct, unit: '%' },
      { label: 'KER', formula: `kernel / FFB × 100 = ${i.kernelT} / ${i.ffbT} × 100`, value: kerPct, unit: '%' },
    ],
    warnings,
  }
}

export interface StreamInput {
  id: string
  oilInProductPct: number
  productToFfbPct: number
}

export type TrafficLight = 'green' | 'amber' | 'red'

export interface OilLossOutput {
  streams: { id: string; name: string; lossPct: number; benchmarkPct: number; light: TrafficLight }[]
  totalPct: number
  benchmarkPct: number
  light: TrafficLight
}

function light(value: number, benchmark: number): TrafficLight {
  const r = value / benchmark
  if (r <= oilLosses.trafficLight.greenMaxRatio) return 'green'
  if (r <= oilLosses.trafficLight.amberMaxRatio) return 'amber'
  return 'red'
}

/** Oil loss to FFB per stream = oil in product × product to FFB, compared with the p.6 benchmarks. */
export function oilLoss(streams: StreamInput[]): CalcResult<OilLossOutput> {
  const steps: Step[] = []
  const out: OilLossOutput['streams'] = []
  for (const s of streams) {
    const ref = oilLosses.streams.find((r) => r.id === s.id)
    if (!ref) continue
    requireNonNegative({ [`Oil in ${ref.name}`]: s.oilInProductPct, [`${ref.name} to FFB`]: s.productToFfbPct })
    const lossPct = (s.oilInProductPct * s.productToFfbPct) / 100
    out.push({ id: s.id, name: ref.name, lossPct, benchmarkPct: ref.benchmarkLossPct, light: light(lossPct, ref.benchmarkLossPct) })
    steps.push({ label: ref.name, formula: `${s.oilInProductPct}% × ${s.productToFfbPct}% / 100`, value: lossPct, unit: '% FFB' })
  }
  const totalPct = out.reduce((a, s) => a + s.lossPct, 0)
  const benchmarkPct = out.reduce((a, s) => a + s.benchmarkPct, 0)
  steps.push({ label: 'Total oil loss', formula: 'sum of streams', value: totalPct, unit: '% FFB' })
  const warnings = out.filter((s) => s.light === 'red').map((s) => `${s.name} loss ${s.lossPct.toFixed(2)}% is well above the ${s.benchmarkPct}% benchmark.`)
  return { values: { streams: out, totalPct, benchmarkPct, light: light(totalPct, benchmarkPct) }, steps, warnings }
}

export type PressCakeInput = Record<string, number>

export function pressCakeCheck(i: PressCakeInput): CalcResult<{ checks: { name: string; value: number; min: number; max: number; ok: boolean }[]; passed: number }> {
  requireNonNegative(i)
  const checks = pressCakeTargets.targets
    .filter((t) => i[t.key] !== undefined)
    .map((t) => ({ name: t.name, value: i[t.key], min: t.min, max: t.max, ok: i[t.key] >= t.min && i[t.key] <= t.max }))
  return {
    values: { checks, passed: checks.filter((c) => c.ok).length },
    steps: checks.map((c) => ({ label: c.name, formula: `target ${c.min}–${c.max}% → ${c.ok ? 'OK' : 'OUT OF RANGE'}`, value: c.value, unit: '%' })),
    warnings: checks.filter((c) => !c.ok).map((c) => `${c.name} ${c.value}% is outside the ${c.min}–${c.max}% target.`),
  }
}

export interface MassFlow {
  from: string
  to: string
  kg: number
}

/** Scales the p.4 mass balance (1,000 kg FFB basis) to any FFB input. */
export function massBalance(i: { ffbKg: number }): CalcResult<{ links: MassFlow[]; products: { id: string; name: string; kg: number; pct: number }[] }> {
  requirePositive({ FFB: i.ffbKg })
  const k = i.ffbKg / massBalanceData.basisKg
  const links = massBalanceData.links.map((l) => ({ ...l, kg: l.kg * k }))
  const products = massBalanceData.nodes
    .filter((n) => n.product)
    .map((n) => {
      const kg = links.filter((l) => l.to === n.id).reduce((a, l) => a + l.kg, 0)
      return { id: n.id, name: n.name, kg, pct: (kg / i.ffbKg) * 100 }
    })
  return {
    values: { links, products },
    steps: [
      { label: 'Scale factor', formula: `${i.ffbKg} / ${massBalanceData.basisKg}`, value: k, unit: '×' },
      ...products.map((p) => ({ label: p.name, formula: `${(p.kg / k).toFixed(0)} kg × ${k.toFixed(3)}`, value: p.kg, unit: 'kg' })),
    ],
    warnings: [],
  }
}
