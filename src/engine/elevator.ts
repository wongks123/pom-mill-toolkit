import { CalcResult, G, requireFraction, requirePositive } from './types'

export interface ElevatorInput {
  capacityTph: number
  fruitRatio: number
  bulkDensity: number
  chainSpeed: number
  pitchM: number
  heightM: number
  loadFactor: number
  efficiency: number
  serviceFactor: number
}

export interface ElevatorOutput {
  fruitTph: number
  bucketM3: number
  bucketL: number
  powerKw: number
  designKw: number
}

/** Fruit (bucket) elevator sizing. Corrected from p.22: c = T·P / (b·v·LF), dividing by the load factor. */
export function fruitElevator(i: ElevatorInput): CalcResult<ElevatorOutput> {
  requirePositive({ 'Mill capacity': i.capacityTph, 'Bulk density': i.bulkDensity, 'Chain speed': i.chainSpeed, 'Bucket pitch': i.pitchM, 'Height': i.heightM, 'Service factor': i.serviceFactor })
  requireFraction({ 'Fruit ratio': i.fruitRatio, 'Load factor': i.loadFactor, 'Drive efficiency': i.efficiency })

  const fruitTph = i.capacityTph * i.fruitRatio
  const fruitTps = fruitTph / 3600
  const bucketM3 = (fruitTps * i.pitchM) / (i.bulkDensity * i.chainSpeed * i.loadFactor)
  // t/s × m/s² × m = kN·m/s = kW
  const powerKw = (2 * fruitTps * G * i.heightM) / i.efficiency
  const designKw = powerKw * i.serviceFactor

  const warnings: string[] = []
  if (i.chainSpeed > 0.5) warnings.push('Bucket elevator chain speed above 0.5 m/s increases fruit damage and wear.')

  return {
    values: { fruitTph, bucketM3, bucketL: bucketM3 * 1000, powerKw, designKw },
    steps: [
      { label: 'Fruit throughput T', formula: `capacity × fruit ratio = ${i.capacityTph} × ${i.fruitRatio}`, value: fruitTph, unit: 't/h' },
      { label: 'T in t/s', formula: `${fruitTph.toFixed(2)} / 3600`, value: fruitTps, unit: 't/s' },
      { label: 'Bucket volume c', formula: `T·P / (b·v·LF) = ${fruitTps.toFixed(5)} × ${i.pitchM} / (${i.bulkDensity} × ${i.chainSpeed} × ${i.loadFactor})`, value: bucketM3, unit: 'm³' },
      { label: 'Bucket volume', formula: 'c × 1000', value: bucketM3 * 1000, unit: 'L' },
      { label: 'Absorbed power', formula: `2·T·g·h / η = 2 × ${fruitTps.toFixed(5)} × ${G} × ${i.heightM} / ${i.efficiency}`, value: powerKw, unit: 'kW' },
      { label: 'Design power', formula: `power × SF = ${powerKw.toFixed(3)} × ${i.serviceFactor}`, value: designKw, unit: 'kW' },
    ],
    warnings,
  }
}
