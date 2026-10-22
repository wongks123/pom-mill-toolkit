import { CalcResult, requirePositive } from './types'

export interface ThresherInput {
  drumDiameterM: number
  loadingFactor: number
  bulkDensity: number
  rpm: number
  travelPerRevM: number
}

/** Rotary drum thresher capacity (MPOB Pocketbook p.21). */
export function thresherCapacity(i: ThresherInput): CalcResult<{ travelMph: number; areaM2: number; capacityTph: number }> {
  requirePositive({ 'Drum diameter': i.drumDiameterM, 'Loading factor': i.loadingFactor, 'Bulk density': i.bulkDensity, 'Drum speed': i.rpm, 'Travel per revolution': i.travelPerRevM })
  const travelMph = i.rpm * i.travelPerRevM * 60
  const areaM2 = Math.PI * (i.drumDiameterM / 2) ** 2 * i.loadingFactor
  const capacityTph = areaM2 * i.bulkDensity * travelMph
  const warnings: string[] = []
  if (i.rpm < 20 || i.rpm > 26) warnings.push('Drum thresher speed is typically 22–24 rpm. Faster speeds bruise fruit; slower speeds leave unstripped bunches.')
  return {
    values: { travelMph, areaM2, capacityTph },
    steps: [
      { label: 'Forward travel V', formula: `rpm × travel × 60 = ${i.rpm} × ${i.travelPerRevM} × 60`, value: travelMph, unit: 'm/h' },
      { label: 'Loaded cross-section a', formula: `π(d/2)² × k = π × (${i.drumDiameterM}/2)² × ${i.loadingFactor}`, value: areaM2, unit: 'm²' },
      { label: 'Thresher capacity T', formula: `a × b × V = ${areaM2.toFixed(4)} × ${i.bulkDensity} × ${travelMph.toFixed(0)}`, value: capacityTph, unit: 't/h' },
    ],
    warnings,
  }
}
