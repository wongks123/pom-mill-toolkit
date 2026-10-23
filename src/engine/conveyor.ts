import data from '../data/conveyors.json'
import { CalcResult, G, InputError, Step, requireFraction, requireNonNegative, requirePositive } from './types'

export type ConveyorType = 'scraper' | 'screw' | 'belt' | 'elevator'

export const CONVEYOR_TYPES = data.types as { id: ConveyorType; name: string; efficiency: number; speed?: number[]; rpm?: number[] }[]
export const CONVEYOR_MATERIALS = data.materials
export const SCREW_SIZES = data.screwSizes.sizes
export const SCRAPER_DESIGNS = data.scraperDesigns.designs
export const CHAIN_PITCH_MM = data.scraperDesigns.chainPitchMm
export const SPROCKET_TEETH = data.scraperDesigns.sprocketOptions

/** Conveyor load from mill capacity, using the material's typical share of FFB. */
export function loadFromMill(millTph: number, materialId: string): { tph: number; ratio: number } {
  const mat = CONVEYOR_MATERIALS.find((m) => m.id === materialId)
  if (!mat) throw new InputError('Unknown material')
  requirePositive({ 'Mill capacity': millTph })
  return { tph: millTph * mat.ffbRatio, ratio: mat.ffbRatio }
}

/** Pitch circle diameter of a chain sprocket: p / sin(180°/z). */
export function sprocketPcd(pitchMm: number, teeth: number): number {
  return pitchMm / Math.sin(Math.PI / teeth)
}

export interface ConveyorInput {
  type: ConveyorType
  materialId: string
  capacityTph: number
  /** Length along the conveyor (m). Not used by the elevator. */
  lengthM: number
  inclineDeg: number
  /** t/m³; omit or 0 to use the material table. */
  densityOverride?: number
  motorRpm: number
  powerMargin: number
  gearServiceFactor: number
  // Scraper bar conveyor
  troughWidthMm?: number
  flightHeightMm?: number
  /** Fixed drive shaft speed (rpm) for scraper or screw. When given, capacity is checked instead of solving for speed. */
  fixedRpm?: number
  /** Drive shaft diameter (mm), for the torsion check (scraper and screw). */
  shaftDiaMm?: number
  // Scraper and elevator
  fill?: number
  sprocketPcdMm?: number
  /** Moving chain + flight mass per metre of conveyor (both strands), one run. */
  chainKgPerM?: number
  /** Chain sliding friction; defaults to the data table value. */
  chainMu?: number
  // Screw conveyor: flight diameter, pitch (mm, or pitch ratio × D), centre pipe OD
  screwDiameterMm?: number
  screwPitchMm?: number
  pitchRatio?: number
  pipeMm?: number
  // Belt conveyor
  beltWidthMm?: number
  troughDeg?: number
  pulleyMm?: number
  beltKgPerM?: number
  idlerKgPerM?: number
  // Chain (bucket) elevator
  bucketL?: number
  bucketPitchM?: number
  liftM?: number
}

export interface ConveyorOutput {
  densityTm3: number
  speedMs: number
  shaftRpm: number
  shaftKw: number
  requiredKw: number
  motorKw: number
  /** Scraper and screw with a given RPM: capacity at that speed, and trough loading actually reached. */
  maxCapacityTph?: number
  loadingPct?: number
  ratioRequired: number
  ratioSelected: number
  extraReduction: number
  outputRpm: number
  torqueNm: number
  designTorqueNm: number
  gearbox: string
}

const deg = (d: number) => (d * Math.PI) / 180

/** Linear interpolation in a sorted [x, y] table, clamped at both ends. */
export function interpolate(points: number[][], x: number): number {
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]
    if (x <= x1) {
      const [x0, y0] = points[i - 1]
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
    }
  }
  return points[points.length - 1][1]
}

function need(v: number | undefined, name: string): number {
  if (v === undefined) throw new InputError(`${name} is required`)
  return v
}

/** Sizes a scraper, screw, belt or chain conveyor and selects motor, gear ratio and gearbox size. */
export function conveyorSizing(i: ConveyorInput): CalcResult<ConveyorOutput> {
  const type = CONVEYOR_TYPES.find((t) => t.id === i.type)
  const mat = CONVEYOR_MATERIALS.find((m) => m.id === i.materialId)
  if (!type) throw new InputError('Unknown conveyor type')
  if (!mat) throw new InputError('Unknown material')
  requirePositive({ 'Capacity': i.capacityTph, 'Motor speed': i.motorRpm, 'Power margin': i.powerMargin, 'Gearbox service factor': i.gearServiceFactor })
  const override = i.densityOverride ?? 0
  requireNonNegative({ 'Incline angle': i.inclineDeg, 'Bulk density override': override })
  if (i.inclineDeg > 90) throw new InputError('Incline angle cannot exceed 90°')

  const steps: Step[] = []
  const warnings: string[] = []
  const rho = override > 0 ? override : mat.density
  steps.push({ label: `Bulk density ρ (${mat.name})`, formula: override > 0 ? 'user override' : 'material table', value: rho, unit: 't/m³' })
  const qv = i.capacityTph / rho
  steps.push({ label: 'Volume flow Qv', formula: `Q / ρ = ${i.capacityTph} / ${rho}`, value: qv, unit: 'm³/h' })

  if (!mat.suits.includes(i.type)) warnings.push(`${mat.name} is not normally handled by a ${type.name.toLowerCase()} in palm oil mills.`)

  const theta = deg(i.inclineDeg)
  let speed = 0
  let shaftRpm = 0
  let shaftKw = 0
  const extra: { maxCapacityTph?: number; loadingPct?: number } = {}

  if (i.type === 'scraper') {
    const W = need(i.troughWidthMm, 'Flight width') / 1000
    const h = need(i.flightHeightMm, 'Flight height') / 1000
    const phi = need(i.fill, 'Fill factor')
    const pcd = need(i.sprocketPcdMm, 'Sprocket PCD') / 1000
    const qc = need(i.chainKgPerM, 'Chain mass')
    const muC = i.chainMu ?? data.scraperChainMu
    requirePositive({ 'Flight width': W, 'Flight height': h, 'Sprocket PCD': pcd, 'Length': i.lengthM, 'Chain mass': qc, 'Chain friction': muC })
    requireFraction({ 'Fill factor': phi })
    const k = interpolate(data.inclineFactor.scraper, i.inclineDeg)
    const area = W * h * phi * k
    steps.push(
      { label: 'Incline capacity factor k', formula: `table at ${i.inclineDeg}°`, value: k, unit: '' },
      { label: 'Effective flow area', formula: `W·h·φ·k = ${W} × ${h} × ${phi} × ${k.toFixed(2)}`, value: area, unit: 'm²' },
    )
    if (i.fixedRpm !== undefined) {
      requirePositive({ 'Sprocket speed': i.fixedRpm })
      shaftRpm = i.fixedRpm
      speed = (Math.PI * pcd * shaftRpm) / 60
      const cap = 3600 * area * speed * rho
      extra.maxCapacityTph = cap
      extra.loadingPct = (phi * 100 * i.capacityTph) / cap
      steps.push(
        { label: 'Sprocket speed N (given)', formula: 'entered', value: shaftRpm, unit: 'rpm' },
        { label: 'Chain speed v', formula: `π·PCD·N / 60 = π × ${pcd.toFixed(4)} × ${shaftRpm} / 60`, value: speed, unit: 'm/s' },
        { label: 'Capacity at this speed', formula: `3600·A·v·ρ = 3600 × ${area.toFixed(4)} × ${speed.toFixed(3)} × ${rho}`, value: cap, unit: 't/h' },
        { label: 'Actual fill', formula: `φ × Q / capacity = ${phi} × ${i.capacityTph} / ${cap.toFixed(2)}`, value: extra.loadingPct, unit: '%' },
      )
      if (i.capacityTph > cap * 1.001) warnings.push(`At ${shaftRpm} rpm this conveyor carries only ${cap.toFixed(1)} t/h at ${(phi * 100).toFixed(0)}% fill; ${i.capacityTph} t/h would overfill it to ${extra.loadingPct.toFixed(0)}%. Increase the speed or use a bigger conveyor.`)
    } else {
      speed = qv / (3600 * area)
      shaftRpm = (60 * speed) / (Math.PI * pcd)
      steps.push(
        { label: 'Required chain speed v', formula: `Qv / (3600·A) = ${qv.toFixed(2)} / (3600 × ${area.toFixed(4)})`, value: speed, unit: 'm/s' },
        { label: 'Sprocket speed', formula: `60·v / (π·PCD) = 60 × ${speed.toFixed(3)} / (π × ${pcd.toFixed(4)})`, value: shaftRpm, unit: 'rpm' },
      )
    }
    const mPerM = i.capacityTph / (3.6 * speed)
    const H = i.lengthM * Math.sin(theta)
    const force = G * (mPerM * i.lengthM * (mat.scraperMu * Math.cos(theta) + Math.sin(theta)) + 2 * qc * i.lengthM * muC * Math.cos(theta))
    shaftKw = (force * speed) / 1000
    steps.push(
      { label: 'Material load per metre', formula: `Q / (3.6·v) = ${i.capacityTph} / (3.6 × ${speed.toFixed(3)})`, value: mPerM, unit: 'kg/m' },
      { label: 'Lift H', formula: `L·sin θ = ${i.lengthM} × sin ${i.inclineDeg}°`, value: H, unit: 'm' },
      { label: 'Pull F', formula: `g·[m·L·(μm·cos θ + sin θ) + 2·qc·L·μc·cos θ], μm = ${mat.scraperMu}`, value: force, unit: 'N' },
      { label: 'Shaft power', formula: `F·v / 1000 = ${force.toFixed(0)} × ${speed.toFixed(3)} / 1000`, value: shaftKw, unit: 'kW' },
    )
  } else if (i.type === 'screw') {
    const D = need(i.screwDiameterMm, 'Screw diameter') / 1000
    requirePositive({ 'Screw diameter': D, 'Length': i.lengthM })
    steps.push({ label: 'Screw geometry', formula: `flight Ø${i.screwDiameterMm}, pitch ${i.screwPitchMm ?? '—'}, pipe Ø${i.pipeMm ?? 0}, shaft Ø${i.shaftDiaMm ?? '—'} mm`, value: i.screwDiameterMm!, unit: 'mm' })
    const S = i.screwPitchMm !== undefined ? i.screwPitchMm / 1000 : D * need(i.pitchRatio, 'Pitch ratio')
    const d = (i.pipeMm ?? 0) / 1000
    requirePositive({ 'Pitch': S })
    requireNonNegative({ 'Pipe diameter': d })
    if (d >= D) throw new InputError('Pipe diameter must be smaller than the screw diameter')
    const phi = mat.screwFill
    const k = interpolate(data.inclineFactor.screw, i.inclineDeg)
    const perRpm = 60 * (Math.PI / 4) * (D * D - d * d) * S * phi * k
    steps.push(
      { label: 'Pitch S', formula: i.screwPitchMm !== undefined ? 'from size table / input' : `D × pitch ratio = ${D} × ${i.pitchRatio}`, value: S, unit: 'm' },
      { label: 'Trough loading φ (material)', formula: 'material table', value: phi, unit: '' },
      { label: 'Incline capacity factor k', formula: `table at ${i.inclineDeg}°`, value: k, unit: '' },
      { label: 'Volume per rpm', formula: `60·(π/4)·(D² − d²)·S·φ·k, D = ${D}, d = ${d}`, value: perRpm, unit: 'm³/h per rpm' },
    )
    let maxCapacityTph: number | undefined
    let loadingPct: number | undefined
    if (i.fixedRpm !== undefined) {
      requirePositive({ 'Screw speed': i.fixedRpm })
      shaftRpm = i.fixedRpm
      maxCapacityTph = perRpm * shaftRpm * rho
      loadingPct = (phi * 100 * i.capacityTph) / maxCapacityTph
      steps.push(
        { label: 'Screw speed N (given)', formula: 'entered', value: shaftRpm, unit: 'rpm' },
        { label: 'Capacity at this speed', formula: `volume per rpm × N × ρ = ${perRpm.toFixed(3)} × ${shaftRpm} × ${rho}`, value: maxCapacityTph, unit: 't/h' },
        { label: 'Actual trough loading', formula: `φ × Q / capacity = ${phi} × ${i.capacityTph} / ${maxCapacityTph.toFixed(2)}`, value: loadingPct, unit: '%' },
      )
      if (i.capacityTph > maxCapacityTph * 1.001) warnings.push(`At ${shaftRpm} rpm this screw carries only ${maxCapacityTph.toFixed(1)} t/h at ${(phi * 100).toFixed(0)}% loading; ${i.capacityTph} t/h would overfill it to ${loadingPct.toFixed(0)}%. Increase the speed or the size.`)
    } else {
      shaftRpm = qv / perRpm
      steps.push({ label: 'Required screw speed N', formula: `Qv / volume per rpm = ${qv.toFixed(2)} / ${perRpm.toFixed(3)}`, value: shaftRpm, unit: 'rpm' })
    }
    extra.maxCapacityTph = maxCapacityTph
    extra.loadingPct = loadingPct
    speed = (S * shaftRpm) / 60
    const Lh = i.lengthM * Math.cos(theta)
    const H = i.lengthM * Math.sin(theta)
    const pH = (i.capacityTph * mat.screwLambda * Lh) / 367
    const pSt = (i.capacityTph * H) / 367
    const pN = (D * i.lengthM) / 20
    shaftKw = pH + pSt + pN
    steps.push(
      { label: 'Progress power PH', formula: `Q·λ·L·cos θ / 367, λ = ${mat.screwLambda}`, value: pH, unit: 'kW' },
      { label: 'Lift power PSt', formula: `Q·H / 367 = ${i.capacityTph} × ${H.toFixed(2)} / 367`, value: pSt, unit: 'kW' },
      { label: 'No-load power PN', formula: `D·L / 20 = ${D} × ${i.lengthM} / 20`, value: pN, unit: 'kW' },
      { label: 'Shaft power', formula: 'PH + PSt + PN', value: shaftKw, unit: 'kW' },
    )
    if (i.inclineDeg > 30) warnings.push('Screws steeper than 30° need a special inclined or vertical screw design; capacity factor is extrapolated.')
  } else if (i.type === 'belt') {
    const B = need(i.beltWidthMm, 'Belt width') / 1000
    const lambda = deg(need(i.troughDeg, 'Troughing angle'))
    const Dp = need(i.pulleyMm, 'Drive pulley diameter') / 1000
    const qB = need(i.beltKgPerM, 'Belt mass')
    const qRO = need(i.idlerKgPerM, 'Idler rotating mass')
    requirePositive({ 'Belt width': B, 'Drive pulley diameter': Dp, 'Length': i.lengthM, 'Belt mass': qB, 'Idler rotating mass': qRO })
    const b = 0.9 * B - 0.05
    if (b <= 0) throw new InputError('Belt width is too small (minimum about 300 mm)')
    const l3 = 0.38 * B
    const beta = deg(mat.surcharge)
    const a1 = (l3 + (b - l3) * Math.cos(lambda)) ** 2 * Math.tan(beta) / 6
    const a2 = (l3 + ((b - l3) / 2) * Math.cos(lambda)) * (((b - l3) / 2) * Math.sin(lambda))
    const area = a1 + a2
    const k = interpolate(data.inclineFactor.belt, i.inclineDeg)
    speed = qv / (3600 * area * k)
    const qG = i.capacityTph / (3.6 * speed)
    const H = i.lengthM * Math.sin(theta)
    const C = interpolate(data.beltLengthCoefficientC.points, i.lengthM)
    const f = data.beltFriction
    const force = C * f * i.lengthM * G * (qRO + (2 * qB + qG) * Math.cos(theta)) + qG * H * G
    shaftKw = (force * speed) / 1000
    shaftRpm = (60 * speed) / (Math.PI * Dp)
    steps.push(
      { label: 'Usable width b', formula: `0.9·B − 0.05 = 0.9 × ${B} − 0.05`, value: b, unit: 'm' },
      { label: 'Load cross-section A', formula: `ISO 5048, trough ${i.troughDeg}°, surcharge ${mat.surcharge}°, centre roll 0.38·B`, value: area, unit: 'm²' },
      { label: 'Incline capacity factor k', formula: `table at ${i.inclineDeg}°`, value: k, unit: '' },
      { label: 'Required belt speed v', formula: `Qv / (3600·A·k) = ${qv.toFixed(2)} / (3600 × ${area.toFixed(4)} × ${k.toFixed(2)})`, value: speed, unit: 'm/s' },
      { label: 'Material load qG', formula: `Q / (3.6·v)`, value: qG, unit: 'kg/m' },
      { label: 'Length coefficient C', formula: `ISO 5048 table at L = ${i.lengthM} m`, value: C, unit: '' },
      { label: 'Effective pull F', formula: `C·f·L·g·[qRO + (2qB + qG)·cos δ] + qG·H·g, f = ${f}`, value: force, unit: 'N' },
      { label: 'Shaft power', formula: `F·v / 1000`, value: shaftKw, unit: 'kW' },
      { label: 'Drive pulley speed', formula: `60·v / (π·D) = 60 × ${speed.toFixed(3)} / (π × ${Dp})`, value: shaftRpm, unit: 'rpm' },
    )
    if (i.inclineDeg > mat.maxBeltIncline) warnings.push(`Incline ${i.inclineDeg}° is above the usual maximum of ${mat.maxBeltIncline}° for ${mat.name} on a plain belt; material may roll back. Use a cleated belt or scraper conveyor.`)
  } else {
    const V = need(i.bucketL, 'Bucket volume') / 1000
    const p = need(i.bucketPitchM, 'Bucket pitch')
    const phi = need(i.fill, 'Fill factor')
    const H = need(i.liftM, 'Lift height')
    const pcd = need(i.sprocketPcdMm, 'Sprocket PCD') / 1000
    requirePositive({ 'Bucket volume': V, 'Bucket pitch': p, 'Lift height': H, 'Sprocket PCD': pcd })
    requireFraction({ 'Fill factor': phi })
    speed = (qv * p) / (3600 * V * phi)
    const tps = i.capacityTph / 3600
    shaftKw = 2 * tps * G * H
    shaftRpm = (60 * speed) / (Math.PI * pcd)
    steps.push(
      { label: 'Required chain speed v', formula: `Qv·p / (3600·V·φ) = ${qv.toFixed(2)} × ${p} / (3600 × ${V} × ${phi})`, value: speed, unit: 'm/s' },
      { label: 'Shaft power', formula: `2·Q(t/s)·g·H = 2 × ${tps.toFixed(5)} × ${G} × ${H} (as pocketbook p.22)`, value: shaftKw, unit: 'kW' },
      { label: 'Head sprocket speed', formula: `60·v / (π·PCD) = 60 × ${speed.toFixed(3)} / (π × ${pcd})`, value: shaftRpm, unit: 'rpm' },
    )
  }

  if ((i.type === 'scraper' || i.type === 'screw') && i.shaftDiaMm) {
    const ds = i.shaftDiaMm / 1000
    const tau = data.shaftAllowableShearMPa.value
    const allowNm = (tau * 1e6 * Math.PI * ds ** 3) / 16
    const shaftTorque = (9550 * shaftKw * i.powerMargin) / shaftRpm
    steps.push(
      { label: 'Drive shaft torque', formula: `9550 × shaft kW × margin / N = 9550 × ${shaftKw.toFixed(2)} × ${i.powerMargin} / ${shaftRpm.toFixed(1)}`, value: shaftTorque, unit: 'N·m' },
      { label: `Shaft Ø${i.shaftDiaMm} torque limit`, formula: `τ·π·d³/16, τ = ${tau} MPa`, value: allowNm, unit: 'N·m' },
    )
    if (shaftTorque > allowNm) warnings.push(`Shaft torque ${shaftTorque.toFixed(0)} N·m exceeds the Ø${i.shaftDiaMm} mm shaft limit of about ${allowNm.toFixed(0)} N·m. Run faster, shorten the conveyor, or use a bigger size.`)
  }
  if (type.speed && (speed < type.speed[0] || speed > type.speed[1])) warnings.push(`Speed ${speed.toFixed(2)} m/s is outside the typical ${type.speed[0]}–${type.speed[1]} m/s for a ${type.name.toLowerCase()}. Change the size to bring it into range.`)
  if (type.rpm && (shaftRpm < type.rpm[0] || shaftRpm > type.rpm[1])) warnings.push(`Screw speed ${shaftRpm.toFixed(0)} rpm is outside the typical ${type.rpm[0]}–${type.rpm[1]} rpm. Choose ${shaftRpm > type.rpm[1] ? 'a bigger' : 'a smaller'} size to bring it into range.`)

  // Drive selection
  const eta = type.efficiency
  const requiredKw = (shaftKw / eta) * i.powerMargin
  const motorKw = data.motorKw.find((m) => m >= requiredKw)
  if (motorKw === undefined) throw new InputError(`Required power ${requiredKw.toFixed(0)} kW is above the largest motor in the table; split the conveyor.`)
  const ratioRequired = i.motorRpm / shaftRpm
  const ratios = data.gearRatios
  const maxRatio = ratios[ratios.length - 1]
  let ratioSelected: number
  let extraReduction = 1
  if (ratioRequired > maxRatio) {
    ratioSelected = maxRatio
    extraReduction = ratioRequired / maxRatio
    warnings.push(`Ratio ${ratioRequired.toFixed(0)}:1 is above a single gearbox; add a chain/sprocket reduction of about ${extraReduction.toFixed(2)}:1.`)
  } else {
    ratioSelected = ratios.reduce((best, r) => (Math.abs(Math.log(r / ratioRequired)) < Math.abs(Math.log(best / ratioRequired)) ? r : best))
  }
  const outputRpm = i.motorRpm / ratioSelected
  const torqueNm = (9550 * motorKw) / outputRpm
  const designTorqueNm = torqueNm * i.gearServiceFactor
  const size = data.gearboxSizes.find((g) => g.torqueNm >= designTorqueNm)
  const gearbox = size ? `${size.size} (≥ ${size.torqueNm.toLocaleString()} N·m, e.g. ${size.example})` : 'Above table – consult supplier'
  if (!size) warnings.push('Design torque is above the largest gearbox in the table.')
  const actualShaftRpm = outputRpm / extraReduction
  if (Math.abs(actualShaftRpm / shaftRpm - 1) > 0.1) warnings.push(`Nearest standard ratio gives ${actualShaftRpm.toFixed(1)} rpm, ${((actualShaftRpm / shaftRpm - 1) * 100).toFixed(0)}% off the required speed; use an extra chain reduction or VSD to trim.`)

  steps.push(
    { label: 'Drive efficiency η', formula: `${type.name} constant`, value: eta, unit: '' },
    { label: 'Required motor power', formula: `shaft / η × margin = ${shaftKw.toFixed(2)} / ${eta} × ${i.powerMargin}`, value: requiredKw, unit: 'kW' },
    { label: 'Selected motor', formula: 'next IEC standard size', value: motorKw, unit: 'kW' },
    { label: 'Required ratio', formula: `motor rpm / shaft rpm = ${i.motorRpm} / ${shaftRpm.toFixed(2)}`, value: ratioRequired, unit: ':1' },
    { label: 'Selected gearbox ratio', formula: extraReduction > 1 ? 'largest standard ratio' : 'nearest standard ratio', value: ratioSelected, unit: ':1' },
    { label: 'Gearbox output torque', formula: `9550·P / n = 9550 × ${motorKw} / ${outputRpm.toFixed(2)}`, value: torqueNm, unit: 'N·m' },
    { label: 'Design torque', formula: `torque × SF = ${torqueNm.toFixed(0)} × ${i.gearServiceFactor}`, value: designTorqueNm, unit: 'N·m' },
  )

  return {
    values: { densityTm3: rho, speedMs: speed, shaftRpm, shaftKw, ...extra, requiredKw, motorKw, ratioRequired, ratioSelected, extraReduction, outputRpm, torqueNm, designTorqueNm, gearbox },
    steps,
    warnings,
  }
}
