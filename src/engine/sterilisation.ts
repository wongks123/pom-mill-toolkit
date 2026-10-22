import profile from '../data/sterilisationProfile.json'
import { CalcResult, InputError, requireNonNegative, requirePositive } from './types'

export interface SterilisationInput {
  n: number
  capacityT: number
  throughputTph: number
  blowOffMin: number
}

export interface SterilisationOutput {
  cycleMin: number
  intervalMin: number
  steriliserMin: number
  cookingMin: number
}

/** Sterilisation cycle timing (MPOB Pocketbook p.5). */
export function sterilisationCycle(i: SterilisationInput): CalcResult<SterilisationOutput> {
  requirePositive({ 'Number of sterilisers': i.n, 'Steriliser capacity': i.capacityT, 'Mill throughput': i.throughputTph })
  requireNonNegative({ 'Blow-off time': i.blowOffMin })

  const cycleH = (i.n * i.capacityT) / i.throughputTph
  const cycleMin = cycleH * 60
  const intervalMin = cycleMin / i.n
  const steriliserMin = cycleMin - intervalMin
  const cookingMin = steriliserMin - i.blowOffMin
  if (cookingMin <= 0) throw new InputError('Blow-off time is longer than the steriliser time')

  const warnings: string[] = []
  if (cookingMin < 60) warnings.push('Cooking time under 60 min risks under-sterilised bunches (hard-to-strip fruit, higher FFA).')
  if (cookingMin > 120) warnings.push('Cooking time over 120 min wastes steam and may darken the oil (lower DOBI).')

  return {
    values: { cycleMin, intervalMin, steriliserMin, cookingMin },
    steps: [
      { label: 'Cycle time', formula: `n × C / Q = ${i.n} × ${i.capacityT} / ${i.throughputTph} = ${cycleH.toFixed(3)} h`, value: cycleMin, unit: 'min' },
      { label: 'Interval time', formula: `cycle / n = ${cycleMin.toFixed(1)} / ${i.n}`, value: intervalMin, unit: 'min' },
      { label: 'Steriliser time', formula: `cycle − interval = ${cycleMin.toFixed(1)} − ${intervalMin.toFixed(1)}`, value: steriliserMin, unit: 'min' },
      { label: 'Cooking time', formula: `steriliser − blow-off = ${steriliserMin.toFixed(1)} − ${i.blowOffMin}`, value: cookingMin, unit: 'min' },
    ],
    warnings,
  }
}

export interface ProfileStep {
  id: string
  name: string
  startMin: number
  endMin: number
  pStart: number
  pEnd: number
  inlet: string
  exhaust: string
  condensate: string
  purpose: string
}

/** Lays the triple-peak sequence (S1–S7) over the cooking time, then the blow-off. */
export function triplePeakProfile(cookingMin: number, blowOffMin: number): ProfileStep[] {
  let t = 0
  return profile.steps.map((s) => {
    const dur = s.id === 'S7' ? blowOffMin : s.fraction * cookingMin
    const step = { ...s, startMin: t, endMin: t + dur }
    t += dur
    return step
  })
}
