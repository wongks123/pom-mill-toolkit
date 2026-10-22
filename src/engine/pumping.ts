import { CalcResult, G, InputError, requirePositive } from './types'

/** WHP constant: 3,300 for imperial gallons (pocketbook p.12–13), 3,960 for US gallons. */
export const GALLON_CONSTANT = { imperial: 3300, us: 3960 } as const
export type GallonType = keyof typeof GALLON_CONSTANT

/** Water velocity in a pipe. Imperial approximation (p.12) and the exact SI formula. */
export function pipeVelocity(i: { gpm: number; diameterIn: number }): CalcResult<{ ftps: number; mps: number }> {
  requirePositive({ Flow: i.gpm, 'Pipe diameter': i.diameterIn })
  const ftps = i.gpm / (2 * i.diameterIn ** 2)
  const q = i.gpm * 0.00454609 / 60
  const d = i.diameterIn * 0.0254
  const mps = q / (Math.PI * d * d / 4)
  const warnings: string[] = []
  if (mps > 3) warnings.push('Water velocity above 3 m/s causes high friction loss and erosion. Typical: 1–2.5 m/s.')
  return {
    values: { ftps, mps },
    steps: [
      { label: 'Velocity (imperial approx.)', formula: `GPM / (2·D²) = ${i.gpm} / (2 × ${i.diameterIn}²)`, value: ftps, unit: 'ft/s' },
      { label: 'Flow in SI', formula: `${i.gpm} imp gal/min × 0.004546 / 60`, value: q, unit: 'm³/s' },
      { label: 'Velocity (SI, exact)', formula: `Q / (π·D²/4), D = ${d.toFixed(4)} m`, value: mps, unit: 'm/s' },
    ],
    warnings,
  }
}

export interface PumpPowerInput {
  gpm: number
  headFt: number
  effPct: number
  gallon: GallonType
  specificGravity?: number
}

/** Water and brake horsepower (MPOB Pocketbook p.12–13). */
export function pumpPowerImperial(i: PumpPowerInput): CalcResult<{ whp: number; bhp: number; kw: number }> {
  requirePositive({ Flow: i.gpm, Head: i.headFt, Efficiency: i.effPct })
  if (i.effPct > 100) throw new InputError('Efficiency cannot exceed 100%')
  const sg = i.specificGravity ?? 1
  const k = GALLON_CONSTANT[i.gallon]
  const whp = (i.gpm * i.headFt * sg) / k
  const bhp = (whp * 100) / i.effPct
  return {
    values: { whp, bhp, kw: bhp * 0.746 },
    steps: [
      { label: 'Water horsepower', formula: `G·H${sg !== 1 ? '·SG' : ''} / ${k} = ${i.gpm} × ${i.headFt}${sg !== 1 ? ` × ${sg}` : ''} / ${k} (${i.gallon} gal)`, value: whp, unit: 'hp' },
      { label: 'Brake horsepower', formula: `WHP × 100 / E = ${whp.toFixed(3)} × 100 / ${i.effPct}`, value: bhp, unit: 'hp' },
      { label: 'Shaft power', formula: 'BHP × 0.746', value: bhp * 0.746, unit: 'kW' },
    ],
    warnings: i.effPct < 40 ? ['Pump efficiency under 40% is poor. Check impeller wear or duty point.'] : [],
  }
}

/** SI pump power P = ρ·g·Q·H / η. */
export function pumpPowerSI(i: { flowM3h: number; headM: number; density: number; effPct: number }): CalcResult<{ hydraulicKw: number; shaftKw: number }> {
  requirePositive({ Flow: i.flowM3h, Head: i.headM, Density: i.density, Efficiency: i.effPct })
  if (i.effPct > 100) throw new InputError('Efficiency cannot exceed 100%')
  const q = i.flowM3h / 3600
  const hydraulicKw = (i.density * G * q * i.headM) / 1000
  const shaftKw = hydraulicKw / (i.effPct / 100)
  return {
    values: { hydraulicKw, shaftKw },
    steps: [
      { label: 'Flow', formula: `${i.flowM3h} / 3600`, value: q, unit: 'm³/s' },
      { label: 'Hydraulic power', formula: `ρ·g·Q·H = ${i.density} × ${G} × ${q.toFixed(5)} × ${i.headM} / 1000`, value: hydraulicKw, unit: 'kW' },
      { label: 'Shaft power', formula: `hydraulic / η = ${hydraulicKw.toFixed(3)} / ${i.effPct / 100}`, value: shaftKw, unit: 'kW' },
    ],
    warnings: [],
  }
}

/** Pump efficiency from measured flow, head and brake horsepower. */
export function pumpEfficiency(i: { gpm: number; headFt: number; bhp: number; gallon: GallonType }): CalcResult<{ effPct: number; whp: number }> {
  requirePositive({ Flow: i.gpm, Head: i.headFt, BHP: i.bhp })
  const k = GALLON_CONSTANT[i.gallon]
  const whp = (i.gpm * i.headFt) / k
  const effPct = (whp / i.bhp) * 100
  const warnings: string[] = []
  if (effPct > 90) warnings.push('Efficiency above 90% is unlikely for a centrifugal pump. Check the measurements.')
  return {
    values: { effPct, whp },
    steps: [
      { label: 'Water horsepower', formula: `G·H / ${k} = ${i.gpm} × ${i.headFt} / ${k}`, value: whp, unit: 'hp' },
      { label: 'Efficiency', formula: `WHP / BHP × 100 = ${whp.toFixed(3)} / ${i.bhp} × 100`, value: effPct, unit: '%' },
    ],
    warnings,
  }
}
