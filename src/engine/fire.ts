import data from '../data/fireProtection.json'
import conveyorData from '../data/conveyors.json'
import { frictionFactor } from './pumpSystem'
import { CalcResult, G, InputError, Step, requireNonNegative, requirePositive } from './types'

export const FIRE_PIPE_MATERIALS = data.pipeMaterials
export const FIRE_PIPE_SIZES = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600]
export const SPRINKLER_HAZARDS = data.sprinkler.hazards
export const BATTERY_DEVICES = data.battery.devices
const HEAD_PER_BAR = data.waterHeadPerBar

export type FireMaterial = 'giB' | 'giC' | 'mscl'
export type FittingKey = 'elbow' | 'tee' | 'gate' | 'check' | 'globe' | 'y45' | 'angle'

/** Internal diameter (mm) from the GI (BS 1387) or MSCL (JKR) pipe tables. */
export function fireInternalDiameter(material: FireMaterial, dn: number): number {
  if (material === 'mscl') {
    const row = data.msclPipes.find((p) => p.dn === dn)
    if (!row) throw new InputError(`MSCL pipe is listed from DN100 to DN600; DN${dn} is not in the table`)
    return row.idMm
  }
  const row = data.giPipes.find((p) => p.dn === dn)
  if (!row) throw new InputError(`GI pipe is listed from DN15 to DN150; DN${dn} is not in the table`)
  return material === 'giC' ? row.classCidMm : row.classBidMm
}

/** Equivalent length (m) of one fitting; DN80 uses the 3" (75) row of the table. */
export function fittingEquivalentLength(dn: number, fitting: FittingKey): number {
  const lookup = dn === 80 ? 75 : dn
  const row = data.equivalentLengthM.find((r) => r.dn === lookup)
  if (!row) throw new InputError(`No fitting equivalent length for DN${dn}`)
  return row[fitting]
}

const nextMotor = (kw: number) => conveyorData.motorKw.find((m) => m >= kw) ?? Number.NaN

export interface FireWaterStorageInput {
  hydrantFlowLpm: number
  durationMin: number
  hydrantsSimultaneous: number
  hoseReels: number
  /** Index into SPRINKLER_HAZARDS, or -1 for no sprinkler system. */
  sprinklerHazard: number
  sprinklerHeightM: number
  tankHm?: number
  tankWm?: number
  tankDm?: number
  suctionPipeM?: number
  lowLevelM?: number
  headroomM?: number
}

/** Height class used by the sprinkler tables: 15, 30 or 45 m. */
function heightClass(h: number): number {
  if (h <= 15) return 15
  if (h <= 30) return 30
  if (h <= 45) return 45
  throw new InputError('The sprinkler table covers a height difference up to 45 m')
}

function sprinklerLookup(table: Record<string, Record<string, number>>, hazard: string, cls: number, what: string): number {
  const v = table[hazard]?.[String(cls)]
  if (v === undefined) throw new InputError(`No ${what} listed for ${hazard} at ${cls} m height class`)
  return v
}

/** Fire water tank: pressurised hydrants + hose reels + optional sprinklers, and the tank's effective volume. */
export function fireWaterStorage(i: FireWaterStorageInput): CalcResult<{ hydrantM3: number; hoseReelM3: number; sprinklerM3: number; totalM3: number; effectiveM3?: number }> {
  requirePositive({ 'Hydrant flow': i.hydrantFlowLpm, 'Duration': i.durationMin, 'Hydrants operating': i.hydrantsSimultaneous })
  requireNonNegative({ 'Hose reels': i.hoseReels, 'Sprinkler height difference': i.sprinklerHeightM })
  const steps: Step[] = []
  const warnings: string[] = []
  const perHydrantL = i.hydrantFlowLpm * i.durationMin
  const perHydrantM3 = Math.round(perHydrantL / 1000)
  const hydrantM3 = perHydrantM3 * i.hydrantsSimultaneous
  steps.push(
    { label: 'One hydrant', formula: `${i.hydrantFlowLpm} L/min × ${i.durationMin} min, rounded`, value: perHydrantM3, unit: 'm³' },
    { label: 'Hydrant storage', formula: `${perHydrantM3} × ${i.hydrantsSimultaneous} hydrants operating`, value: hydrantM3, unit: 'm³' },
  )
  const hr = data.hoseReel
  let hoseReelL = 0
  if (i.hoseReels > 0) {
    const extra = Math.min(hr.additionalReelL * (i.hoseReels - 1), hr.additionalCapL)
    hoseReelL = hr.firstReelL + extra
    steps.push({ label: 'Hose reel storage', formula: `${hr.firstReelL} + min(${hr.additionalReelL} × (${i.hoseReels} − 1), ${hr.additionalCapL}) L`, value: hoseReelL / 1000, unit: 'm³' })
  }
  let sprinklerM3 = 0
  if (i.sprinklerHazard >= 0) {
    const hazard = SPRINKLER_HAZARDS[i.sprinklerHazard]
    const cls = heightClass(i.sprinklerHeightM)
    sprinklerM3 = sprinklerLookup(data.sprinkler.storageM3, hazard, cls, 'storage')
    steps.push({ label: `Sprinkler storage (${hazard}, ${cls} m class)`, formula: 'Guide to Fire Protection in Malaysia table', value: sprinklerM3, unit: 'm³' })
  }
  const totalM3 = hydrantM3 + hoseReelL / 1000 + sprinklerM3
  steps.push({ label: 'Total storage required', formula: 'hydrant + hose reel + sprinkler', value: totalM3, unit: 'm³' })

  let effectiveM3: number | undefined
  if (i.tankHm && i.tankWm && i.tankDm) {
    const lost = (i.suctionPipeM ?? 0) + (i.lowLevelM ?? 0) + (i.headroomM ?? 0)
    const effH = i.tankHm - lost
    if (effH <= 0) throw new InputError('Tank height is less than the suction, low level and headroom allowances')
    effectiveM3 = effH * i.tankWm * i.tankDm
    steps.push(
      { label: 'Effective water depth', formula: `H − suction pipe − low level − headroom = ${i.tankHm} − ${lost.toFixed(2)}`, value: effH, unit: 'm' },
      { label: 'Effective tank volume', formula: `${effH.toFixed(2)} × ${i.tankWm} × ${i.tankDm}`, value: effectiveM3, unit: 'm³' },
    )
    if (effectiveM3 < totalM3) warnings.push(`Effective tank volume ${effectiveM3.toFixed(1)} m³ is less than the ${totalM3.toFixed(1)} m³ required. Enlarge the tank.`)
  }
  return { values: { hydrantM3, hoseReelM3: hoseReelL / 1000, sprinklerM3, totalM3, effectiveM3 }, steps, warnings }
}

export interface FirePumpInput {
  flowLpm: number
  residualBar: number
  staticM: number
  pipeLengthM: number
  fittingsEqM: number
  idMm: number
  method: 'hazen' | 'darcy'
  hazenC: number
  roughnessMm: number
  extraLossM?: number
  safetyPct: number
  pumpEffPct: number
  motorEffPct: number
}

export interface FirePumpOutput {
  flowLps: number
  velocity: number
  frictionPerM: number
  frictionM: number
  residualM: number
  headM: number
  designHeadM: number
  shaftKw: number
  motorKw: number
}

/** Pump head = residual pressure head + static lift + friction × (pipe + fitting equivalent length) [+ nozzle loss], plus safety factor. */
export function firePumpHead(i: FirePumpInput): CalcResult<FirePumpOutput> {
  requirePositive({ 'Flow': i.flowLpm, 'Pipe internal diameter': i.idMm, 'Pump efficiency': i.pumpEffPct, 'Motor efficiency': i.motorEffPct })
  requireNonNegative({ 'Residual pressure': i.residualBar, 'Static head': i.staticM, 'Pipe length': i.pipeLengthM, 'Fitting length': i.fittingsEqM, 'Safety factor': i.safetyPct, 'Nozzle loss': i.extraLossM ?? 0 })
  const steps: Step[] = []
  const warnings: string[] = []
  const q = i.flowLpm / 60000
  const d = i.idMm / 1000
  const velocity = q / ((Math.PI * d * d) / 4)
  let frictionPerM: number
  if (i.method === 'hazen') {
    requirePositive({ 'Hazen-Williams C': i.hazenC })
    frictionPerM = (10.67 * q ** 1.852) / (i.hazenC ** 1.852 * d ** 4.87)
    steps.push({ label: 'Friction per metre (Hazen-Williams)', formula: `10.67·Q^1.852 / (C^1.852·d^4.87), C = ${i.hazenC}, d = ${i.idMm} mm`, value: frictionPerM, unit: 'm/m' })
  } else {
    const re = (1000 * velocity * d) / data.waterViscosityPaS
    const f = frictionFactor(re, i.roughnessMm / 1000 / d)
    frictionPerM = (f * velocity * velocity) / (d * 2 * G)
    steps.push(
      { label: 'Reynolds number', formula: `ρ·v·D/μ = 1000 × ${velocity.toFixed(3)} × ${d} / ${data.waterViscosityPaS}`, value: re, unit: '' },
      { label: 'Friction factor', formula: re < 2300 ? '64/Re' : `Swamee–Jain, ε = ${i.roughnessMm} mm`, value: f, unit: '' },
      { label: 'Friction per metre (Darcy-Weisbach)', formula: 'f·v²/(2g·D)', value: frictionPerM, unit: 'm/m' },
    )
  }
  const totalLength = i.pipeLengthM + i.fittingsEqM
  const frictionM = frictionPerM * totalLength
  const residualM = i.residualBar * HEAD_PER_BAR
  const extra = i.extraLossM ?? 0
  const headM = residualM + i.staticM + frictionM + extra
  const designHeadM = headM * (1 + i.safetyPct / 100)
  const shaftKw = (1000 * G * q * designHeadM) / 1000 / (i.pumpEffPct / 100)
  const motorKw = nextMotor(shaftKw / (i.motorEffPct / 100))
  steps.unshift(
    { label: 'Pump flow', formula: `${i.flowLpm} L/min ÷ 60`, value: q * 1000, unit: 'L/s' },
    { label: 'Velocity', formula: `Q / (π·d²/4), d = ${i.idMm} mm`, value: velocity, unit: 'm/s' },
  )
  steps.push(
    { label: 'Total equivalent length', formula: `pipe ${i.pipeLengthM} + fittings ${i.fittingsEqM.toFixed(2)}`, value: totalLength, unit: 'm' },
    { label: 'Friction head', formula: `${frictionPerM.toFixed(5)} × ${totalLength.toFixed(2)}`, value: frictionM, unit: 'm' },
    { label: 'Residual pressure head', formula: `${i.residualBar} bar × ${HEAD_PER_BAR}`, value: residualM, unit: 'm' },
    { label: 'Static head', formula: 'highest outlet − pump', value: i.staticM, unit: 'm' },
    ...(extra > 0 ? [{ label: 'Nozzle / hose loss', formula: 'entered', value: extra, unit: 'm' }] : []),
    { label: 'Total head', formula: `residual + static + friction${extra > 0 ? ' + nozzle' : ''}`, value: headM, unit: 'm' },
    { label: 'Design head', formula: `× (1 + ${i.safetyPct}%)`, value: designHeadM, unit: 'm' },
    { label: 'Pump shaft power', formula: `ρ·g·Q·H / ηp = 9810 × ${q.toFixed(5)} × ${designHeadM.toFixed(1)} / ${i.pumpEffPct / 100} / 1000`, value: shaftKw, unit: 'kW' },
    { label: 'Motor rating', formula: `next IEC size ≥ shaft / ηm (${i.motorEffPct}%)`, value: motorKw, unit: 'kW' },
  )
  if (velocity > 3) warnings.push(`Velocity ${velocity.toFixed(2)} m/s is high (above 3 m/s). Consider the next pipe size up.`)
  return { values: { flowLps: q * 1000, velocity, frictionPerM, frictionM, residualM, headM, designHeadM, shaftKw, motorKw }, steps, warnings }
}

/** Sprinkler flow, pressure and storage by hazard class and height (pre-calculated installations). */
export function sprinklerRequirement(hazardIndex: number, heightM: number): CalcResult<{ heightClass: number; flowLpm: number; pressureBar: number; storageM3: number }> {
  requireNonNegative({ 'Height difference': heightM })
  const hazard = SPRINKLER_HAZARDS[hazardIndex]
  if (!hazard) throw new InputError('Unknown hazard class')
  const cls = heightClass(heightM)
  const s = data.sprinkler
  const flowLpm = sprinklerLookup(s.flowLpm, hazard, cls, 'flow')
  const pressureBar = sprinklerLookup(s.pressureBar, hazard, cls, 'pressure')
  const storageM3 = sprinklerLookup(s.storageM3, hazard, cls, 'storage')
  return {
    values: { heightClass: cls, flowLpm, pressureBar, storageM3 },
    steps: [
      { label: 'Height class', formula: `${heightM} m → next class of 15 / 30 / 45 m`, value: cls, unit: 'm' },
      { label: `Pump flow (${hazard})`, formula: 'table', value: flowLpm, unit: 'L/min' },
      { label: 'Pressure at the installation valve', formula: 'table', value: pressureBar, unit: 'bar' },
      { label: 'Water storage', formula: 'table', value: storageM3, unit: 'm³' },
    ],
    warnings: [],
  }
}

export interface SprinklerSegment { dn: number; lengthM: number; turns: number; lossMbarPerM: number }

/** Pre-calculated pipe loss to one design point: (length + turns × 3 m) × loss rate, summed over pipe sizes. */
export function sprinklerPipeLoss(segments: SprinklerSegment[], eqPerTurnM: number): CalcResult<{ totalMbar: number; totalBar: number }> {
  requireNonNegative({ 'Equivalent length per turn': eqPerTurnM })
  const steps: Step[] = []
  let totalMbar = 0
  for (const s of segments) {
    requireNonNegative({ [`DN${s.dn} length`]: s.lengthM, [`DN${s.dn} turns`]: s.turns, [`DN${s.dn} loss rate`]: s.lossMbarPerM })
    if (s.lengthM === 0 && s.turns === 0) continue
    const eq = s.lengthM + s.turns * eqPerTurnM
    const loss = eq * s.lossMbarPerM
    totalMbar += loss
    steps.push({ label: `DN${s.dn}`, formula: `(${s.lengthM} m + ${s.turns} × ${eqPerTurnM} m) × ${s.lossMbarPerM} mbar/m`, value: loss, unit: 'mbar' })
  }
  steps.push({ label: 'Total pressure loss', formula: 'sum of pipe sizes', value: totalMbar, unit: 'mbar' })
  return { values: { totalMbar, totalBar: totalMbar / 1000 }, steps, warnings: [] }
}

/** Fire alarm battery: standby load × standby hours + alarm load × alarm hours, plus safety factor; next 12 V size. */
export function fireAlarmBattery(qty: Record<string, number>, standbyH: number, alarmH: number, safetyPct: number): CalcResult<{ standbyA: number; alarmA: number; minimumAh: number; requiredAh: number; selectedAh: number }> {
  requirePositive({ 'Standby duration': standbyH, 'Alarm duration': alarmH })
  requireNonNegative({ 'Safety factor': safetyPct })
  let standbyA = 0
  let alarmA = 0
  const steps: Step[] = []
  for (const dev of BATTERY_DEVICES) {
    const n = qty[dev.id] ?? 0
    requireNonNegative({ [dev.name]: n })
    if (!n) continue
    standbyA += n * dev.standbyA
    alarmA += n * dev.alarmA
    steps.push({ label: `${dev.name} × ${n}`, formula: `standby ${dev.standbyA} A, alarm ${dev.alarmA} A each`, value: n * dev.alarmA, unit: 'A alarm' })
  }
  const minimumAh = standbyA * standbyH + alarmA * alarmH
  const requiredAh = minimumAh * (1 + safetyPct / 100)
  const selectedAh = data.battery.sizesAh.find((s) => s >= requiredAh) ?? Number.NaN
  steps.push(
    { label: 'Total standby load', formula: 'sum of standby currents', value: standbyA, unit: 'A' },
    { label: 'Total alarm load', formula: 'sum of alarm currents', value: alarmA, unit: 'A' },
    { label: 'Minimum capacity', formula: `${standbyA.toFixed(4)} × ${standbyH} h + ${alarmA.toFixed(3)} × ${alarmH} h`, value: minimumAh, unit: 'Ah' },
    { label: 'With safety factor', formula: `× (1 + ${safetyPct}%)`, value: requiredAh, unit: 'Ah' },
    { label: 'Selected battery', formula: 'next 12 V size (2 in series for 24 V)', value: selectedAh, unit: 'Ah' },
  )
  const warnings = Number.isFinite(selectedAh) ? [] : ['Required capacity is above 120 Ah; split the load or use a larger battery bank.']
  return { values: { standbyA, alarmA, minimumAh, requiredAh, selectedAh }, steps, warnings }
}

export interface Co2Input {
  lengthM: number
  widthM: number
  heightM: number
  /** 0 = automatic by volume. */
  factorOverride: number
  safetyPct: number
  cylinderKg: number
  nozzles: number
  /** Cylinder-to-nozzle distance class: 50, 75 or 100 m. */
  distanceM: 50 | 75 | 100
}

export interface Co2Output {
  volumeM3: number
  factor: number
  minimumKg: number
  requiredKg: number
  cylinders: number
  providedKg: number
  flowKgMin: number
  perNozzleKgMin: number
  branches: number
  pipes: { name: string; flowKgMin: number; dnMm: number }[]
}

function co2PipeSize(flow: number, distance: 50 | 75 | 100): number {
  const rows = data.co2.pipeSizes
  let row = rows[0]
  for (const r of rows) if (r.fromKgMin <= flow) row = r
  return distance === 50 ? row.a50 : distance === 75 ? row.b75 : row.c100
}

/** CO2 total flooding for deep-seated fires: quantity, cylinders, discharge rate and pipe sizes. */
export function co2DeepSeated(i: Co2Input): CalcResult<Co2Output> {
  requirePositive({ 'Room length': i.lengthM, 'Room width': i.widthM, 'Room height': i.heightM, 'Cylinder size': i.cylinderKg, 'Number of nozzles': i.nozzles })
  requireNonNegative({ 'Safety factor': i.safetyPct, 'Flooding factor': i.factorOverride })
  const c = data.co2
  const steps: Step[] = []
  const warnings: string[] = []
  const volumeM3 = i.lengthM * i.widthM * i.heightM
  const auto = volumeM3 < c.volumeLimitM3 ? c.factorSmall : c.factorLarge
  const factor = i.factorOverride > 0 ? i.factorOverride : auto
  const minimumKg = factor * volumeM3
  const requiredKg = minimumKg * (1 + i.safetyPct / 100)
  const cylinders = Math.ceil(requiredKg / i.cylinderKg - 1e-9)
  const providedKg = cylinders * i.cylinderKg
  const flow7 = providedKg / c.dischargeMin
  const flow30 = ((c.concentrationPct / c.designConcentrationPct) * providedKg) / c.concentrationMin
  const flowKgMin = Math.max(flow7, flow30)
  const perNozzleKgMin = flowKgMin / i.nozzles
  let branches = 1
  for (const [n, b] of c.branchesByNozzles) if (i.nozzles >= n) branches = b
  const pipes: Co2Output['pipes'] = [{ name: 'Main pipe', flowKgMin, dnMm: co2PipeSize(flowKgMin, i.distanceM) }]
  let f = flowKgMin
  for (let k = 1; k < branches && k <= 4; k++) {
    f /= 2
    pipes.push({ name: `Distribution ${k}`, flowKgMin: f, dnMm: co2PipeSize(f, i.distanceM) })
  }
  steps.push(
    { label: 'Room volume', formula: `${i.lengthM} × ${i.widthM} × ${i.heightM}`, value: volumeM3, unit: 'm³' },
    { label: 'Flooding factor', formula: i.factorOverride > 0 ? 'entered' : `${volumeM3 < c.volumeLimitM3 ? 'below' : 'above'} ${c.volumeLimitM3} m³ → ${auto}`, value: factor, unit: 'kg/m³' },
    { label: 'Minimum CO₂', formula: `${factor} × ${volumeM3.toFixed(2)}`, value: minimumKg, unit: 'kg' },
    { label: 'CO₂ required', formula: `× (1 + ${i.safetyPct}%)`, value: requiredKg, unit: 'kg' },
    { label: 'Cylinders', formula: `⌈${requiredKg.toFixed(1)} / ${i.cylinderKg}⌉`, value: cylinders, unit: 'nos' },
    { label: 'CO₂ provided', formula: `${cylinders} × ${i.cylinderKg}`, value: providedKg, unit: 'kg' },
    { label: 'Flow – full discharge in 7 min', formula: `${providedKg} / ${c.dischargeMin}`, value: flow7, unit: 'kg/min' },
    { label: '30% concentration in 2 min', formula: `(30/50 × ${providedKg}) / 2`, value: flow30, unit: 'kg/min' },
    { label: 'Design flow', formula: 'larger of the two', value: flowKgMin, unit: 'kg/min' },
    { label: 'Per nozzle', formula: `${flowKgMin.toFixed(1)} / ${i.nozzles}`, value: perNozzleKgMin, unit: 'kg/min' },
    ...pipes.map((p) => ({ label: `${p.name} size`, formula: `${p.flowKgMin.toFixed(1)} kg/min, within ${i.distanceM} m`, value: p.dnMm, unit: 'mm' })),
  )
  if (perNozzleKgMin > c.maxPerNozzleKgMin) warnings.push(`Discharge per nozzle ${perNozzleKgMin.toFixed(1)} kg/min is above ${c.maxPerNozzleKgMin} kg/min. Add nozzles.`)
  if (i.factorOverride > 0 && i.factorOverride !== auto) warnings.push(`Flooding factor ${i.factorOverride} entered; the volume rule would give ${auto} kg/m³.`)
  return { values: { volumeM3, factor, minimumKg, requiredKg, cylinders, providedKg, flowKgMin, perNozzleKgMin, branches, pipes }, steps, warnings }
}
