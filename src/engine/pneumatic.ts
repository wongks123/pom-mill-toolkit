import { CalcResult, Step, requireNonNegative, requirePositive } from './types'

export interface AirFlowInput {
  capacityTph: number
  solidsRatio: number
  airRatio: number
  airDensity: number
  leakagePct: number
}

export interface AirFlowOutput {
  solidsKgph: number
  airKgph: number
  airM3ph: number
  fanM3ph: number
}

function airFlow(i: AirFlowInput, solidsName: string): CalcResult<AirFlowOutput> {
  requirePositive({ 'Mill capacity': i.capacityTph, [`${solidsName}/FFB ratio`]: i.solidsRatio, 'Air ratio': i.airRatio, 'Air density': i.airDensity })
  requireNonNegative({ 'Leakage allowance': i.leakagePct })
  const solidsKgph = i.capacityTph * i.solidsRatio * 1000
  const airKgph = solidsKgph * i.airRatio
  const airM3ph = airKgph / i.airDensity
  const fanM3ph = airM3ph * (1 + i.leakagePct / 100)
  const warnings: string[] = []
  if (Math.abs(i.airDensity - 1.777) < 0.01) warnings.push('1.777 kg/m³ is a pocketbook misprint. Air at 27 °C is 1.1777 kg/m³.')
  else if (i.airDensity < 1.0 || i.airDensity > 1.3) warnings.push('Air density at mill conditions is normally 1.1–1.2 kg/m³.')
  return {
    values: { solidsKgph, airKgph, airM3ph, fanM3ph },
    steps: [
      { label: `${solidsName} flow`, formula: `${i.capacityTph} t/h × ${i.solidsRatio} × 1000`, value: solidsKgph, unit: 'kg/h' },
      { label: 'Air mass', formula: `${solidsName.toLowerCase()} × air ratio ${i.airRatio}`, value: airKgph, unit: 'kg/h' },
      { label: 'Air volume', formula: `mass / ρ = ${airKgph.toFixed(0)} / ${i.airDensity}`, value: airM3ph, unit: 'm³/h' },
      { label: 'Fan capacity', formula: `volume × (1 + ${i.leakagePct}%)`, value: fanM3ph, unit: 'm³/h' },
    ],
    warnings,
  }
}

/** De-pericarper (fibre separation) fan (MPOB Pocketbook p.23). */
export function depericarperFan(i: Omit<AirFlowInput, 'solidsRatio'> & { fibreRatio: number }) {
  return airFlow({ ...i, solidsRatio: i.fibreRatio }, 'Fibre')
}

export interface ColumnInput {
  fanM3ph: number
  sepVelocity: number
  trunkVelocity: number
  pressureLoss: number
  serviceFactor: number
  fanEfficiency: number
}

export interface ColumnOutput {
  columnAreaM2: number
  columnSideMm: number
  trunkAreaM2: number
  trunkRadiusMm: number
  powerKw: number
}

/** Separating column and trunk sizing. Corrected from p.24: 24,000 / 36,000 = 0.667 m². */
export function separatingColumn(i: ColumnInput, trunkName = 'Trunk'): CalcResult<ColumnOutput> {
  requirePositive({ 'Fan capacity': i.fanM3ph, 'Separating velocity': i.sepVelocity, [`${trunkName} velocity`]: i.trunkVelocity, 'Pressure loss': i.pressureLoss, 'Service factor': i.serviceFactor, 'Fan efficiency': i.fanEfficiency })
  const columnAreaM2 = i.fanM3ph / (i.sepVelocity * 3600)
  const columnSideMm = Math.sqrt(columnAreaM2) * 1000
  const trunkAreaM2 = i.fanM3ph / (i.trunkVelocity * 3600)
  const trunkRadiusMm = Math.sqrt(trunkAreaM2 / Math.PI) * 1000
  const powerKw = (i.fanM3ph * i.pressureLoss * i.serviceFactor) / (311 * i.fanEfficiency)
  const warnings: string[] = []
  if (i.fanEfficiency > 1) warnings.push('Fan efficiency should be a fraction (e.g. 0.7).')
  const steps: Step[] = [
    { label: 'Column area', formula: `Q / (v_sep × 3600) = ${i.fanM3ph.toFixed(0)} / (${i.sepVelocity} × 3600)`, value: columnAreaM2, unit: 'm²' },
    { label: 'Column side L', formula: '√area × 1000', value: columnSideMm, unit: 'mm' },
    { label: `${trunkName} area`, formula: `Q / (v × 3600) = ${i.fanM3ph.toFixed(0)} / (${i.trunkVelocity} × 3600)`, value: trunkAreaM2, unit: 'm²' },
    { label: `${trunkName} radius r`, formula: '√(area / π) × 1000', value: trunkRadiusMm, unit: 'mm' },
    { label: 'Fan power', formula: `Q × ΔP × SF / (311 × η) = ${i.fanM3ph.toFixed(0)} × ${i.pressureLoss} × ${i.serviceFactor} / (311 × ${i.fanEfficiency})`, value: powerKw, unit: 'kW' },
  ]
  return { values: { columnAreaM2, columnSideMm, trunkAreaM2, trunkRadiusMm, powerKw }, steps, warnings }
}

export interface DestonerInput {
  capacityTph: number
  nutRatio: number
  airRatio: number
  airDensity: number
  leakagePct: number
  sepVelocity: number
  conveyVelocity: number
  pressureLoss: number
  serviceFactor: number
  fanEfficiency: number
}

/** De-stoner (nut pneumatic conveying). Corrected from p.25: air density 1.1777 kg/m³. Reuses the fan and column functions. */
export function destoner(i: DestonerInput): CalcResult<AirFlowOutput & ColumnOutput> {
  const air = airFlow({ capacityTph: i.capacityTph, solidsRatio: i.nutRatio, airRatio: i.airRatio, airDensity: i.airDensity, leakagePct: i.leakagePct }, 'Nut')
  const col = separatingColumn({ fanM3ph: air.values.fanM3ph, sepVelocity: i.sepVelocity, trunkVelocity: i.conveyVelocity, pressureLoss: i.pressureLoss, serviceFactor: i.serviceFactor, fanEfficiency: i.fanEfficiency }, 'Duct')
  return {
    values: { ...air.values, ...col.values },
    steps: [...air.steps, ...col.steps],
    warnings: [...air.warnings, ...col.warnings],
  }
}
