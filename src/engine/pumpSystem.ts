import data from '../data/pumpSystem.json'
import conveyorData from '../data/conveyors.json'
import { CalcResult, G, InputError, Step, requireNonNegative, requirePositive } from './types'

export const PUMP_FLUIDS = data.fluids
export const PIPE_MATERIALS = data.pipeMaterials
export const STRAINERS = data.fittingK.strainers

/** Darcy friction factor: 64/Re when laminar, Swamee–Jain when turbulent, linear blend in between. */
export function frictionFactor(re: number, relRoughness: number): number {
  if (re <= 0) return 0
  const laminar = (r: number) => 64 / r
  const turbulent = (r: number) => 0.25 / Math.log10(relRoughness / 3.7 + 5.74 / r ** 0.9) ** 2
  if (re < 2300) return laminar(re)
  if (re >= 4000) return turbulent(re)
  return laminar(2300) + ((turbulent(4000) - laminar(2300)) * (re - 2300)) / 1700
}

export interface PipeRun {
  idMm: number
  lengthM: number
  /** Sum of fitting loss coefficients for this run. */
  sumK: number
}

export interface PumpSystemInput {
  flowM3h: number
  density: number
  /** Dynamic viscosity, mPa·s (= cP). */
  viscosity: number
  vapourKPa: number
  /** Gauge pressure on the suction liquid surface (0 = open tank), bar g. */
  suctionBarg: number
  dischargeBarg: number
  /** Liquid surface levels and pump centreline, m above a common datum. */
  suctionLevelM: number
  dischargeLevelM: number
  pumpLevelM: number
  /** 'pipes' calculates losses from the pipe runs; 'given' uses lossM. */
  lossMode: 'pipes' | 'given'
  lossM?: number
  suction?: PipeRun
  discharge?: PipeRun
  roughnessMm?: number
  pumpEffPct: number
  motorEffPct: number
  motorMargin: number
}

export interface PumpSystemOutput {
  pressureHeadM: number
  staticHeadM: number
  suctionLossM: number
  dischargeLossM: number
  lossM: number
  headM: number
  hydraulicKw: number
  shaftKw: number
  motorInputKw: number
  motorKw: number
  npshaM: number
  suctionVelocity?: number
  dischargeVelocity?: number
  suctionRe?: number
  dischargeRe?: number
}

function runLoss(run: PipeRun, q: number, rho: number, mu: number, roughMm: number) {
  const d = run.idMm / 1000
  const v = q / ((Math.PI * d * d) / 4)
  const re = (rho * v * d) / mu
  const f = frictionFactor(re, roughMm / 1000 / d)
  const vh = (v * v) / (2 * G)
  return { v, re, f, loss: (f * (run.lengthM / d) + run.sumK) * vh }
}

/**
 * Pump duty point between two liquid surfaces (tank to tank), so the velocity-head term is zero;
 * entrance and exit losses belong in the fitting K values.
 * H = (Pd − Ps)/(ρg) + (zd − zs) + hL;  P = ρgQH.
 */
export function pumpSystem(i: PumpSystemInput): CalcResult<PumpSystemOutput> {
  requireNonNegative({ 'Flow rate': i.flowM3h })
  requirePositive({ 'Density': i.density, 'Viscosity': i.viscosity, 'Pump efficiency': i.pumpEffPct, 'Motor efficiency': i.motorEffPct, 'Power margin': i.motorMargin })
  requireNonNegative({ 'Vapour pressure': i.vapourKPa })
  if (i.pumpEffPct > 100 || i.motorEffPct > 100) throw new InputError('Efficiency cannot exceed 100%')
  if (i.suctionBarg < -1.01325 || i.dischargeBarg < -1.01325) throw new InputError('Gauge pressure cannot be below full vacuum (−1.013 bar g)')

  const steps: Step[] = []
  const warnings: string[] = []
  const q = i.flowM3h / 3600
  const rhoG = i.density * G
  const pressureHeadM = ((i.dischargeBarg - i.suctionBarg) * 1e5) / rhoG
  const staticHeadM = i.dischargeLevelM - i.suctionLevelM
  steps.push(
    { label: 'Flow Q', formula: `${i.flowM3h} / 3600`, value: q, unit: 'm³/s' },
    { label: 'Pressure head', formula: `(Pd − Ps)·10⁵ / (ρg) = (${i.dischargeBarg} − ${i.suctionBarg}) × 10⁵ / (${i.density} × ${G})`, value: pressureHeadM, unit: 'm' },
    { label: 'Static head', formula: `zd − zs = ${i.dischargeLevelM} − ${i.suctionLevelM}`, value: staticHeadM, unit: 'm' },
  )

  let suctionLossM = 0
  let dischargeLossM = 0
  const out: Partial<PumpSystemOutput> = {}
  if (i.lossMode === 'pipes') {
    if (!i.suction || !i.discharge || i.roughnessMm === undefined) throw new InputError('Pipe details are required')
    requirePositive({ 'Suction pipe ID': i.suction.idMm, 'Discharge pipe ID': i.discharge.idMm })
    requireNonNegative({ 'Suction length': i.suction.lengthM, 'Discharge length': i.discharge.lengthM, 'Roughness': i.roughnessMm })
    const mu = i.viscosity / 1000
    const s = runLoss(i.suction, q, i.density, mu, i.roughnessMm)
    const d = runLoss(i.discharge, q, i.density, mu, i.roughnessMm)
    suctionLossM = s.loss
    dischargeLossM = d.loss
    Object.assign(out, { suctionVelocity: s.v, dischargeVelocity: d.v, suctionRe: s.re, dischargeRe: d.re })
    for (const [name, r, run] of [['Suction', s, i.suction], ['Discharge', d, i.discharge]] as const) {
      steps.push(
        { label: `${name} velocity`, formula: `Q / (π·D²/4), D = ${run.idMm} mm`, value: r.v, unit: 'm/s' },
        { label: `${name} Reynolds number`, formula: `ρ·v·D / μ = ${i.density} × ${r.v.toFixed(3)} × ${run.idMm / 1000} / ${mu}`, value: r.re, unit: '' },
        { label: `${name} friction factor f`, formula: r.re < 2300 ? '64 / Re (laminar)' : `Swamee–Jain, ε = ${i.roughnessMm} mm`, value: r.f, unit: '' },
        { label: `${name} loss`, formula: `(f·L/D + ΣK)·v²/2g = (${r.f.toFixed(4)} × ${run.lengthM} / ${run.idMm / 1000} + ${run.sumK.toFixed(2)}) × ${((r.v * r.v) / (2 * G)).toFixed(4)}`, value: r.loss, unit: 'm' },
      )
    }
    const lim = data.velocityLimits
    if (s.v > lim.suctionMax) warnings.push(`Suction velocity ${s.v.toFixed(2)} m/s is above ${lim.suctionMax} m/s. Use a bigger suction pipe to protect NPSH.`)
    if (d.v > lim.dischargeMax) warnings.push(`Discharge velocity ${d.v.toFixed(2)} m/s is above ${lim.dischargeMax} m/s. Expect high friction and erosion; use a bigger pipe.`)
    if (i.flowM3h > 0 && d.v < 0.5 && i.density > 980) warnings.push('Discharge velocity under 0.5 m/s: solids in sludge or POME may settle.')
  } else {
    requireNonNegative({ 'Total head loss': i.lossM ?? -1 })
    dischargeLossM = i.lossM ?? 0
    steps.push({ label: 'Total head loss (given)', formula: 'entered', value: dischargeLossM, unit: 'm' })
  }
  const lossM = suctionLossM + dischargeLossM
  const headM = pressureHeadM + staticHeadM + lossM
  const hydraulicKw = (rhoG * q * headM) / 1000
  const shaftKw = hydraulicKw / (i.pumpEffPct / 100)
  const motorInputKw = shaftKw / (i.motorEffPct / 100)
  const need = shaftKw * i.motorMargin
  const motorKw = conveyorData.motorKw.find((m) => m >= need) ?? Number.NaN
  const patm = data.atmosphericKPa
  const npshaM = ((i.suctionBarg * 100 + patm - i.vapourKPa) * 1000) / rhoG + (i.suctionLevelM - i.pumpLevelM) - suctionLossM

  steps.push(
    { label: 'Total head loss hL', formula: `suction ${suctionLossM.toFixed(3)} + discharge ${dischargeLossM.toFixed(3)}`, value: lossM, unit: 'm' },
    { label: 'Total dynamic head H', formula: `${pressureHeadM.toFixed(3)} + ${staticHeadM.toFixed(3)} + ${lossM.toFixed(3)}`, value: headM, unit: 'm' },
    { label: 'Hydraulic power', formula: `ρ·g·Q·H / 1000 = ${i.density} × ${G} × ${q.toFixed(5)} × ${headM.toFixed(3)} / 1000`, value: hydraulicKw, unit: 'kW' },
    { label: 'Pump shaft power', formula: `hydraulic / ηp = ${hydraulicKw.toFixed(3)} / ${i.pumpEffPct / 100}`, value: shaftKw, unit: 'kW' },
    { label: 'Motor input power', formula: `shaft / ηm = ${shaftKw.toFixed(3)} / ${i.motorEffPct / 100}`, value: motorInputKw, unit: 'kW' },
    { label: 'Selected motor', formula: `next IEC size ≥ shaft × margin = ${shaftKw.toFixed(2)} × ${i.motorMargin}`, value: motorKw, unit: 'kW' },
    { label: 'NPSH available', formula: `(Ps + Patm − Pv)/(ρg) + (zs − zpump) − hL,suction = (${(i.suctionBarg * 100).toFixed(1)} + ${patm} − ${i.vapourKPa}) kPa/(ρg) + (${i.suctionLevelM} − ${i.pumpLevelM}) − ${suctionLossM.toFixed(3)}`, value: npshaM, unit: 'm' },
  )

  if (headM <= 0) warnings.push('Total head is zero or negative: the liquid would flow without a pump at this duty.')
  if (!Number.isFinite(motorKw)) warnings.push('Power is above the largest motor in the table.')
  if (npshaM < 0) warnings.push(`NPSH available is negative (${npshaM.toFixed(2)} m): the liquid will flash in the suction. Raise the tank, cool the liquid, or pressurise the suction.`)
  else if (npshaM < 3) warnings.push(`NPSH available is only ${npshaM.toFixed(2)} m. Most centrifugal pumps need 2–5 m; check the pump's NPSHr plus ${data.npshMarginM} m margin.`)
  if (i.lossMode === 'given') warnings.push('With a given total loss, NPSH ignores suction pipe losses. Use "calculate from pipes" for a true NPSH check.')
  if (i.pumpEffPct < 40) warnings.push('Pump efficiency under 40% is poor; small pumps on viscous oil or sludge are often 40–60%.')

  return {
    values: { pressureHeadM, staticHeadM, suctionLossM, dischargeLossM, lossM, headM, hydraulicKw, shaftKw, motorInputKw, motorKw, npshaM, ...out },
    steps,
    warnings,
  }
}

/** Pump affinity laws for a speed (or impeller diameter) change: Q ∝ N, H ∝ N², P ∝ N³. */
export function pumpAffinity(i: { flowM3h: number; headM: number; powerKw: number; n1: number; n2: number }): CalcResult<{ ratio: number; flowM3h: number; headM: number; powerKw: number }> {
  requirePositive({ 'Flow': i.flowM3h, 'Head': i.headM, 'Power': i.powerKw, 'Speed 1': i.n1, 'Speed 2': i.n2 })
  const r = i.n2 / i.n1
  const values = { ratio: r, flowM3h: i.flowM3h * r, headM: i.headM * r * r, powerKw: i.powerKw * r ** 3 }
  const warnings: string[] = []
  if (r > 1.1) warnings.push('Running more than 10% above rated speed can overload the motor and exceed the pump’s design limits.')
  if (r < 0.5) warnings.push('Below about 50% speed the affinity laws become inaccurate when static head is high; the pump may not deliver at all.')
  return {
    values,
    steps: [
      { label: 'Speed ratio', formula: `N₂ / N₁ = ${i.n2} / ${i.n1}`, value: r, unit: '' },
      { label: 'New flow', formula: `Q₁ × (N₂/N₁) = ${i.flowM3h} × ${r.toFixed(4)}`, value: values.flowM3h, unit: 'm³/h' },
      { label: 'New head', formula: `H₁ × (N₂/N₁)² = ${i.headM} × ${r.toFixed(4)}²`, value: values.headM, unit: 'm' },
      { label: 'New power', formula: `P₁ × (N₂/N₁)³ = ${i.powerKw} × ${r.toFixed(4)}³`, value: values.powerKw, unit: 'kW' },
    ],
    warnings,
  }
}
