import costData from '../data/productionCost.json'
import { CalcResult, requirePositive } from './types'

function interpolate(xs: number[], ys: number[], x: number): number {
  if (x <= xs[0]) return ys[0]
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1]
  for (let k = 0; k < xs.length - 1; k++) {
    if (x >= xs[k] && x <= xs[k + 1]) {
      return ys[k] + ((x - xs[k]) / (xs[k + 1] - xs[k])) * (ys[k + 1] - ys[k])
    }
  }
  return ys[ys.length - 1]
}

export interface CostOutput {
  breakdown: { name: string; rmPerT: number }[]
  totalRmPerT: number
  annualFfbT: number
  annualCostRm: number
}

/** Production cost per tonne FFB, interpolated between the p.40 capacities. */
export function productionCost(i: { capacityTph: number; hoursPerYear: number }): CalcResult<CostOutput> {
  requirePositive({ 'Mill capacity': i.capacityTph, 'Operating hours': i.hoursPerYear })
  const caps = costData.capacities
  const breakdown = costData.categories.map((c) => ({ name: c.name, rmPerT: interpolate(caps, c.values, i.capacityTph) }))
  const totalRmPerT = breakdown.reduce((a, b) => a + b.rmPerT, 0)
  const annualFfbT = i.capacityTph * i.hoursPerYear
  const annualCostRm = totalRmPerT * annualFfbT
  const warnings: string[] = []
  if (costData.placeholder) warnings.push('Cost figures are PLACEHOLDERS. Replace src/data/productionCost.json with the p.40 table before use.')
  if (i.capacityTph < caps[0] || i.capacityTph > caps[caps.length - 1]) warnings.push(`Capacity is outside ${caps[0]}–${caps[caps.length - 1]} t/h; the nearest table value is used.`)
  return {
    values: { breakdown, totalRmPerT, annualFfbT, annualCostRm },
    steps: [
      ...breakdown.map((b) => ({ label: b.name, formula: `interpolated at ${i.capacityTph} t/h`, value: b.rmPerT, unit: 'RM/t' })),
      { label: 'Total cost per tonne', formula: 'sum of categories', value: totalRmPerT, unit: 'RM/t' },
      { label: 'Annual FFB', formula: `${i.capacityTph} t/h × ${i.hoursPerYear} h`, value: annualFfbT, unit: 't' },
      { label: 'Annual cost', formula: 'RM/t × annual FFB', value: annualCostRm, unit: 'RM' },
    ],
    warnings,
  }
}
