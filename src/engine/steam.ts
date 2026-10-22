import steamTable from '../data/steamTable.json'
import pipeSizes from '../data/pipeSizes.json'
import { CalcResult, InputError, requirePositive } from './types'

/** Saturated-steam specific volume (m³/kg) at a gauge pressure (bar g), by log-linear interpolation. */
export function specificVolumeAtGauge(pGaugeBar: number): number {
  const pAbs = pGaugeBar + steamTable.atmosphericBar
  const rows = steamTable.rows
  if (pAbs < rows[0].pAbsBar || pAbs > rows[rows.length - 1].pAbsBar) {
    throw new InputError(`Pressure ${pGaugeBar} bar g is outside the steam table range`)
  }
  for (let k = 0; k < rows.length - 1; k++) {
    const a = rows[k]
    const b = rows[k + 1]
    if (pAbs >= a.pAbsBar && pAbs <= b.pAbsBar) {
      const f = (Math.log(pAbs) - Math.log(a.pAbsBar)) / (Math.log(b.pAbsBar) - Math.log(a.pAbsBar))
      return Math.exp(Math.log(a.vg) + f * (Math.log(b.vg) - Math.log(a.vg)))
    }
  }
  return rows[rows.length - 1].vg
}

export interface SteamPipeInput {
  capacityTph: number
  demandKgPerT: number
  v1: number
  v2: number
  velocity: number
}

export interface SteamPipeOutput {
  massFlowKgph: number
  meanV: number
  dM: number
  dMm: number
  dIn: number
  nextPipe: string
  nextPipeIdMm: number
  actualVelocity: number
}

/** Steam distribution pipe sizing (Corrected from p.20: mean V = 0.4785 m³/kg, demand in kg/t FFB). */
export function steamPipe(i: SteamPipeInput): CalcResult<SteamPipeOutput> {
  requirePositive({ 'Mill capacity': i.capacityTph, 'Steam demand': i.demandKgPerT, 'Specific volume 1': i.v1, 'Specific volume 2': i.v2, 'Steam velocity': i.velocity })
  const massFlowKgph = i.capacityTph * i.demandKgPerT
  const meanV = (i.v1 + i.v2) / 2
  const dM = Math.sqrt((4 * massFlowKgph * meanV) / (3600 * Math.PI * i.velocity))
  const dMm = dM * 1000
  const pipe = pipeSizes.rows.find((r) => r.idMm >= dMm) ?? pipeSizes.rows[pipeSizes.rows.length - 1]
  const actualVelocity = (massFlowKgph * meanV) / 3600 / (Math.PI * (pipe.idMm / 1000) ** 2 / 4)

  const warnings: string[] = []
  if (i.velocity < 25 || i.velocity > 50) warnings.push('Steam velocity is usually 25–50 m/s for saturated steam mains.')
  if (pipe.idMm < dMm) warnings.push('Required bore is larger than the largest pipe in the table. Use parallel pipes.')

  return {
    values: { massFlowKgph, meanV, dM, dMm, dIn: dMm / 25.4, nextPipe: pipe.nps, nextPipeIdMm: pipe.idMm, actualVelocity },
    steps: [
      { label: 'Steam flow ṁ', formula: `capacity × demand = ${i.capacityTph} t/h × ${i.demandKgPerT} kg/t`, value: massFlowKgph, unit: 'kg/h' },
      { label: 'Mean specific volume V', formula: `(${i.v1} + ${i.v2}) / 2`, value: meanV, unit: 'm³/kg' },
      { label: 'Pipe bore d', formula: `√(4ṁV / (3600·π·v)) = √(4 × ${massFlowKgph.toFixed(0)} × ${meanV.toFixed(4)} / (3600 × π × ${i.velocity}))`, value: dM, unit: 'm' },
      { label: 'Bore in mm', formula: 'd × 1000', value: dMm, unit: 'mm' },
      { label: 'Bore in inches', formula: 'd(mm) / 25.4', value: dMm / 25.4, unit: 'in' },
      { label: `Next standard pipe ${pipe.nps} (ID ${pipe.idMm} mm), actual velocity`, formula: 'ṁV / 3600 / (π·ID²/4)', value: actualVelocity, unit: 'm/s' },
    ],
    warnings,
  }
}

export interface SteamDemandInput {
  capacityTph: number
  demandKgPerT: number
  marginPct: number
}

/** Process steam demand and boiler capacity with a design margin. */
export function steamDemand(i: SteamDemandInput): CalcResult<{ demandKgph: number; boilerKgph: number }> {
  requirePositive({ 'Mill capacity': i.capacityTph, 'Steam demand': i.demandKgPerT })
  if (i.marginPct < 0) throw new InputError('Margin cannot be negative')
  const demandKgph = i.capacityTph * i.demandKgPerT
  const boilerKgph = demandKgph * (1 + i.marginPct / 100)
  const warnings: string[] = []
  if (i.demandKgPerT < 400 || i.demandKgPerT > 700) {
    warnings.push('Total mill steam demand (process + turbine) is commonly 450–650 kg/t FFB. 272.5 kg/t (p.20) is the steriliser/process share only. [REVIEW]')
  }
  return {
    values: { demandKgph, boilerKgph },
    steps: [
      { label: 'Steam demand', formula: `${i.capacityTph} t/h × ${i.demandKgPerT} kg/t`, value: demandKgph, unit: 'kg/h' },
      { label: 'Boiler capacity', formula: `demand × (1 + ${i.marginPct}/100)`, value: boilerKgph, unit: 'kg/h' },
    ],
    warnings,
  }
}
