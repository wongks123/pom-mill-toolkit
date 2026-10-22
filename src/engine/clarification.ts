import { CalcResult, requireFraction, requirePositive } from './types'

export interface ClarificationInput {
  dcoTph: number
  densityTm3: number
  retentionH: number
  serviceFactor: number
  pureOilFraction: number
  sludgeFraction: number
  bufferRetentionH: number
}

export interface ClarificationOutput {
  clarifierM3: number
  pureOilM3: number
  sludgeM3: number
}

/** Clarification tank volumes from diluted crude oil flow. Corrected from p.26: sludge tank is 50% of crude oil, not FFB. */
export function clarificationTanksFromDco(i: ClarificationInput): CalcResult<ClarificationOutput> {
  requirePositive({ 'Diluted crude oil': i.dcoTph, 'Oil density': i.densityTm3, 'Clarifier retention': i.retentionH, 'Service factor': i.serviceFactor, 'Buffer retention': i.bufferRetentionH })
  requireFraction({ 'Pure oil fraction': i.pureOilFraction, 'Sludge fraction': i.sludgeFraction })
  const clarifierM3 = (i.dcoTph * i.retentionH * i.serviceFactor) / i.densityTm3
  const pureOilM3 = (i.dcoTph * i.pureOilFraction * i.bufferRetentionH) / i.densityTm3
  const sludgeM3 = (i.dcoTph * i.sludgeFraction * i.bufferRetentionH) / i.densityTm3
  const warnings: string[] = []
  if (i.retentionH < 2 || i.retentionH > 5) warnings.push('Continuous clarifier retention is typically 3–4 h. [REVIEW]')
  if (i.pureOilFraction + i.sludgeFraction > 1) warnings.push('Pure oil + sludge fractions exceed 100% of the crude oil.')
  return {
    values: { clarifierM3, pureOilM3, sludgeM3 },
    steps: [
      { label: 'Clarifier volume', formula: `DCO × t × SF / ρ = ${i.dcoTph.toFixed(2)} × ${i.retentionH} × ${i.serviceFactor} / ${i.densityTm3}`, value: clarifierM3, unit: 'm³' },
      { label: 'Pure oil tank', formula: `DCO × ${i.pureOilFraction} × ${i.bufferRetentionH} / ρ`, value: pureOilM3, unit: 'm³' },
      { label: 'Sludge tank (50% of crude oil)', formula: `DCO × ${i.sludgeFraction} × ${i.bufferRetentionH} / ρ`, value: sludgeM3, unit: 'm³' },
    ],
    warnings,
  }
}

/** Same as clarificationTanksFromDco, starting from mill capacity and the DCO/FFB ratio. */
export function clarificationTanks(i: Omit<ClarificationInput, 'dcoTph'> & { capacityTph: number; dcoRatio: number }): CalcResult<ClarificationOutput & { dcoTph: number }> {
  requirePositive({ 'Mill capacity': i.capacityTph, 'DCO/FFB ratio': i.dcoRatio })
  const dcoTph = i.capacityTph * i.dcoRatio
  const r = clarificationTanksFromDco({ ...i, dcoTph })
  return {
    values: { ...r.values, dcoTph },
    steps: [{ label: 'Diluted crude oil (DCO)', formula: `capacity × ratio = ${i.capacityTph} × ${i.dcoRatio}`, value: dcoTph, unit: 't/h' }, ...r.steps],
    warnings: r.warnings,
  }
}
