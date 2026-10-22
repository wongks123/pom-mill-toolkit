import startingMethods from '../data/startingMethods.json'
import { CalcResult, InputError, requirePositive } from './types'

export interface MotorAmpsInput {
  bhp: number
  volts: number
  effPct: number
  pf: number
  phase: 1 | 3
}

/** Motor full-load current (MPOB Pocketbook p.10). */
export function motorAmps(i: MotorAmpsInput): CalcResult<{ amps: number; kw: number }> {
  requirePositive({ BHP: i.bhp, Voltage: i.volts, Efficiency: i.effPct, 'Power factor': i.pf })
  if (i.pf > 1) throw new InputError('Power factor cannot exceed 1')
  if (i.effPct > 100) throw new InputError('Efficiency cannot exceed 100%')
  const single = (i.bhp * 746 * 100) / (i.volts * i.effPct * i.pf)
  const amps = i.phase === 3 ? single / 1.73 : single
  const warnings: string[] = []
  if (i.pf < 0.75) warnings.push('Power factor below 0.75 is low for an induction motor at full load.')
  return {
    values: { amps, kw: i.bhp * 0.746 },
    steps: [
      { label: 'Single-phase current', formula: `BHP·746·100 / (V·Eff%·PF) = ${i.bhp} × 746 × 100 / (${i.volts} × ${i.effPct} × ${i.pf})`, value: single, unit: 'A' },
      ...(i.phase === 3 ? [{ label: 'Three-phase current', formula: `single / 1.73 = ${single.toFixed(2)} / 1.73`, value: amps, unit: 'A' }] : []),
    ],
    warnings,
  }
}

/** Capacitor multiplier tan(acos PF1) − tan(acos PF2). Replaces the p.11 table (which misprints 0.55→0.95 as 1.490). */
export function pfMultiplier(pf1: number, pf2: number): number {
  return Math.tan(Math.acos(pf1)) - Math.tan(Math.acos(pf2))
}

export function pfCorrection(i: { kw: number; pf1: number; pf2: number }): CalcResult<{ multiplier: number; kvar: number }> {
  requirePositive({ 'Load kW': i.kw, 'Existing PF': i.pf1, 'Target PF': i.pf2 })
  if (i.pf1 > 1 || i.pf2 > 1) throw new InputError('Power factor cannot exceed 1')
  if (i.pf2 <= i.pf1) throw new InputError('Target PF must be higher than the existing PF')
  const t1 = Math.tan(Math.acos(i.pf1))
  const t2 = Math.tan(Math.acos(i.pf2))
  const multiplier = t1 - t2
  const kvar = i.kw * multiplier
  const warnings: string[] = []
  if (i.pf2 > 0.98) warnings.push('Correcting above 0.98 risks leading PF at light load.')
  return {
    values: { multiplier, kvar },
    steps: [
      { label: 'tan(acos PF1)', formula: `tan(acos ${i.pf1})`, value: t1, unit: '' },
      { label: 'tan(acos PF2)', formula: `tan(acos ${i.pf2})`, value: t2, unit: '' },
      { label: 'Multiplier', formula: `${t1.toFixed(4)} − ${t2.toFixed(4)}`, value: multiplier, unit: '' },
      { label: 'Capacitor rating', formula: `kW × multiplier = ${i.kw} × ${multiplier.toFixed(4)}`, value: kvar, unit: 'kVAR' },
    ],
    warnings,
  }
}

/** Synchronous and full-load speed of an induction motor (p.18). */
export function motorSpeed(i: { poles: number; freqHz: number; slipPct: number }): CalcResult<{ syncRpm: number; fullLoadRpm: number }> {
  requirePositive({ Poles: i.poles, Frequency: i.freqHz })
  if (i.poles % 2 !== 0) throw new InputError('Number of poles must be even')
  if (i.slipPct < 0 || i.slipPct >= 100) throw new InputError('Slip must be 0–100%')
  const syncRpm = (120 * i.freqHz) / i.poles
  const fullLoadRpm = syncRpm * (1 - i.slipPct / 100)
  return {
    values: { syncRpm, fullLoadRpm },
    steps: [
      { label: 'Synchronous speed', formula: `120 × f / poles = 120 × ${i.freqHz} / ${i.poles}`, value: syncRpm, unit: 'rpm' },
      { label: 'Full-load speed', formula: `sync × (1 − ${i.slipPct}%)`, value: fullLoadRpm, unit: 'rpm' },
    ],
    warnings: i.slipPct > 6 ? ['Full-load slip above 6% is high for a standard motor.'] : [],
  }
}

export function startingCurrent(i: { flcA: number; method: number }): CalcResult<{ startA: number; multiple: number }> {
  requirePositive({ 'Full-load current': i.flcA })
  const m = startingMethods.rows.find((r) => r.id === i.method)
  if (!m) throw new InputError('Unknown starting method')
  const startA = i.flcA * m.multipleOfFlc
  return {
    values: { startA, multiple: m.multipleOfFlc },
    steps: [{ label: `Starting current (${m.method})`, formula: `FLC × ${m.multipleOfFlc} = ${i.flcA} × ${m.multipleOfFlc}`, value: startA, unit: 'A' }],
    warnings: [],
  }
}
