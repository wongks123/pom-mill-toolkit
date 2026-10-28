import { describe, expect, it } from 'vitest'
import { sterilisationCycle } from '../sterilisation'
import { specificVolumeAtGauge, steamPipe } from '../steam'
import { thresherCapacity } from '../thresher'
import { fruitElevator } from '../elevator'
import { depericarperFan, destoner, separatingColumn } from '../pneumatic'
import { clarificationTanksFromDco } from '../clarification'
import { motorAmps, pfCorrection, pfMultiplier } from '../electrical'
import { pumpPowerImperial } from '../pumping'
import { massBalance, oerFromBunch, oilLoss } from '../process'
import { convert, convertTemperature } from '../units'
import { conveyorSizing, loadFromMill, sprocketPcd } from '../conveyor'
import { buildBackup, parseBackup } from '../../backup/backup'
import { frictionFactor, pumpAffinity, pumpSystem } from '../pumpSystem'
import { co2DeepSeated, fireAlarmBattery, fireInternalDiameter, firePumpHead, fireWaterStorage, fittingEquivalentLength, sprinklerPipeLoss, sprinklerRequirement } from '../fire'
import { InputError } from '../types'

/** Asserts |actual − expected| ≤ 0.5% of expected (docs/test-cases.md tolerance). */
function near(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(Math.abs(expected) * 0.005)
}

describe('T1 Sterilisation', () => {
  it('n=3, C=27 t, Q=45 t/h, blow-off 2 min', () => {
    const r = sterilisationCycle({ n: 3, capacityT: 27, throughputTph: 45, blowOffMin: 2 }).values
    near(r.cycleMin, 108)
    near(r.intervalMin, 36)
    near(r.steriliserMin, 72)
    near(r.cookingMin, 70)
  })
})

describe('T2 Steam pipe', () => {
  it('60 t/h, 272.5 kg/t, V=0.4785, v=50', () => {
    const r = steamPipe({ capacityTph: 60, demandKgPerT: 272.5, v1: 0.461, v2: 0.496, velocity: 50 }).values
    near(r.meanV, 0.4785)
    near(r.massFlowKgph, 16350)
    near(r.dM, 0.235)
  })
})

describe('T3 Thresher', () => {
  it('d 2.6, k 0.05, b 0.32, 22 rpm, 0.5 m', () => {
    const r = thresherCapacity({ drumDiameterM: 2.6, loadingFactor: 0.05, bulkDensity: 0.32, rpm: 22, travelPerRevM: 0.5 }).values
    near(r.travelMph, 660)
    near(r.capacityTph, 56.1)
  })
})

describe('T4 Fruit elevator (corrected: divide by LF)', () => {
  it('30 t/h, 0.6, b 0.65, 0.3 m/s, P 0.4, LF 0.85, h 14', () => {
    const r = fruitElevator({ capacityTph: 30, fruitRatio: 0.6, bulkDensity: 0.65, chainSpeed: 0.3, pitchM: 0.4, heightM: 14, loadFactor: 0.85, efficiency: 0.75, serviceFactor: 3 }).values
    near(r.bucketM3, 0.01207)
    near(r.bucketL, 12.07)
    near(r.powerKw, 1.83)
    near(r.designKw, 5.49)
  })
})

describe('T5 De-pericarper fan', () => {
  it('45 t/h, 0.19, 4:1, 1.1777', () => {
    const r = depericarperFan({ capacityTph: 45, fibreRatio: 0.19, airRatio: 4, airDensity: 1.1777, leakagePct: 25 }).values
    near(r.solidsKgph, 8550)
    near(r.airKgph, 34200)
    near(r.airM3ph, 29040)
    near(r.fanM3ph, 36300)
  })
})

describe('T6 Separating column (corrected area 0.667 m²)', () => {
  it('Q 24,000, 10 m/s, 25 m/s', () => {
    const r = separatingColumn({ fanM3ph: 24000, sepVelocity: 10, trunkVelocity: 25, pressureLoss: 0.3, serviceFactor: 1.3, fanEfficiency: 0.7 }).values
    near(r.columnAreaM2, 0.667)
    near(r.columnSideMm, 816)
    near(r.trunkAreaM2, 0.267)
    near(r.trunkRadiusMm, 291)
    near(r.powerKw, 43.0)
  })
})

describe('T7 De-stoner (corrected air density 1.1777)', () => {
  it('30 t/h, 0.12, 5:1, 1.1777, 16 m/s', () => {
    const r = destoner({ capacityTph: 30, nutRatio: 0.12, airRatio: 5, airDensity: 1.1777, leakagePct: 25, sepVelocity: 16, conveyVelocity: 25, pressureLoss: 0.3, serviceFactor: 1.3, fanEfficiency: 0.7 }).values
    near(r.airM3ph, 15284)
    near(r.fanM3ph, 19105)
    near(r.columnAreaM2, 0.332)
    near(r.columnSideMm, 576)
    near(r.trunkRadiusMm, 260)
    near(r.powerKw, 34.2)
  })
})

describe('T8 Clarification (corrected sludge basis)', () => {
  it('DCO 20 t/h, ρ 0.8607, 3 h, SF 1.3', () => {
    const r = clarificationTanksFromDco({ dcoTph: 20, densityTm3: 0.8607, retentionH: 3, serviceFactor: 1.3, pureOilFraction: 0.4, sludgeFraction: 0.5, bufferRetentionH: 1 }).values
    near(r.clarifierM3, 90.6)
    near(r.pureOilM3, 9.29)
    near(r.sludgeM3, 11.62)
  })
})

describe('T9 Motor amps 3-phase', () => {
  it('10 BHP, 415 V, 90%, PF 0.85', () => {
    near(motorAmps({ bhp: 10, volts: 415, effPct: 90, pf: 0.85, phase: 3 }).values.amps, 13.6)
  })
})

describe('T10 PF correction', () => {
  it('100 kW, 0.70 → 0.90', () => {
    const r = pfCorrection({ kw: 100, pf1: 0.7, pf2: 0.9 }).values
    near(r.multiplier, 0.536)
    near(r.kvar, 53.6)
  })
})

describe('T11 PF correction (corrected table value)', () => {
  it('0.55 → 0.95 multiplier is 1.190, not 1.490', () => {
    near(pfMultiplier(0.55, 0.95), 1.19)
  })
})

describe('T12 Pump (imperial)', () => {
  it('100 GPM, 50 ft, E 70%', () => {
    const r = pumpPowerImperial({ gpm: 100, headFt: 50, effPct: 70, gallon: 'imperial' }).values
    near(r.whp, 1.52)
    near(r.bhp, 2.16)
  })
  it('US gallons use 3,960', () => {
    near(pumpPowerImperial({ gpm: 100, headFt: 50, effPct: 70, gallon: 'us' }).values.whp, 100 * 50 / 3960)
  })
})

describe('T13 OER', () => {
  it('oil/bunch 24.07%', () => {
    near(oerFromBunch({ oilToBunchPct: 24.07, factor: 0.855 }).values.oerPct, 20.58)
  })
})

const drive = { lengthM: 20, inclineDeg: 0, densityOverride: 0, motorRpm: 1450, powerMargin: 1.2, gearServiceFactor: 1.5 }

describe('T14 Scraper bar conveyor', () => {
  it('FFB 60 t/h, W 1000, h 300, φ 0.6, L 20, PCD 400, chain 40 kg/m, μc 0.3', () => {
    const r = conveyorSizing({ ...drive, type: 'scraper', materialId: 'ffb', capacityTph: 60, troughWidthMm: 1000, flightHeightMm: 300, fill: 0.6, sprocketPcdMm: 400, chainKgPerM: 40, chainMu: 0.3 }).values
    near(r.speedMs, 0.1543)
    near(r.shaftKw, 2.525)
    near(r.requiredKw, 3.788)
    near(r.shaftRpm, 7.368)
    expect(r.motorKw).toBe(4)
    expect(r.ratioSelected).toBe(200)
    near(r.designTorqueNm, 7903)
  })
})

describe('T15 Screw conveyor', () => {
  it('Kernel 10 t/h, D 400, pitch 1D, L 20', () => {
    const r = conveyorSizing({ ...drive, type: 'screw', materialId: 'kernel', capacityTph: 10, screwDiameterMm: 400, pitchRatio: 1 }).values
    near(r.shaftRpm, 12.70)
    near(r.shaftKw, 1.490)
    expect(r.motorKw).toBe(2.2)
    expect(r.ratioSelected).toBe(125)
  })
})

describe('T16 Belt conveyor', () => {
  it('FFB 60 t/h, B 800, 20° trough, 10° incline, L 20', () => {
    const r = conveyorSizing({ ...drive, type: 'belt', materialId: 'ffb', capacityTph: 60, inclineDeg: 10, beltWidthMm: 800, troughDeg: 20, pulleyMm: 500, beltKgPerM: 10, idlerKgPerM: 15 }).values
    near(r.speedMs, 0.5292)
    near(r.shaftRpm, 20.21)
    expect(r.motorKw).toBe(1.5)
  })
})

describe('T17 Chain (bucket) elevator', () => {
  it('Nut 10 t/h, 10 L buckets, pitch 0.4, φ 0.75, H 14', () => {
    const r = conveyorSizing({ ...drive, type: 'elevator', materialId: 'nut', capacityTph: 10, inclineDeg: 90, bucketL: 10, bucketPitchM: 0.4, fill: 0.75, liftM: 14, sprocketPcdMm: 400 }).values
    near(r.speedMs, 0.2279)
    near(r.shaftKw, 0.763)
    expect(r.motorKw).toBe(1.5)
  })
  it('rejects missing size inputs', () => {
    expect(() => conveyorSizing({ ...drive, type: 'screw', materialId: 'kernel', capacityTph: 10 })).toThrow(InputError)
  })
})

describe('T18 Screw conveyor from standard size (TBS/MIS3)', () => {
  const size500 = { screwDiameterMm: 485, screwPitchMm: 380, pipeMm: 75, shaftDiaMm: 65 }
  it('Ø500: kernel 10 t/h, L 20 – solve RPM', () => {
    const r = conveyorSizing({ ...drive, type: 'screw', materialId: 'kernel', capacityTph: 10, ...size500 }).values
    near(r.shaftRpm, 9.319)
    near(r.shaftKw, 1.575)
  })
  it('Ø500 at a given 30 rpm – capacity and loading', () => {
    const r = conveyorSizing({ ...drive, type: 'screw', materialId: 'kernel', capacityTph: 10, ...size500, fixedRpm: 30 })
    near(r.values.shaftRpm, 30)
    near(r.values.maxCapacityTph ?? 0, 32.19)
    near(r.values.loadingPct ?? 0, 13.98)
    expect(r.warnings.some((w) => w.includes('overfill'))).toBe(false)
  })
  it('warns when the given RPM is too slow for the capacity', () => {
    const r = conveyorSizing({ ...drive, type: 'screw', materialId: 'kernel', capacityTph: 40, ...size500, fixedRpm: 30 })
    expect(r.warnings.some((w) => w.includes('overfill'))).toBe(true)
  })
})

describe('T19 Scraper conveyor from drawing design (TBS/FR4 FFB conveyor)', () => {
  const ffb = { ...drive, type: 'scraper' as const, materialId: 'ffb', capacityTph: 60, troughWidthMm: 1090, flightHeightMm: 160, fill: 0.6, sprocketPcdMm: sprocketPcd(152.4, 21), chainKgPerM: 40, chainMu: 0.3, shaftDiaMm: 125 }
  it('21T × 152.4 sprocket PCD', () => near(sprocketPcd(152.4, 21), 1022.6))
  it('conveyor load from mill capacity', () => {
    near(loadFromMill(60, 'ffb').tph, 60)
    near(loadFromMill(60, 'efb').tph, 13.2)
  })
  it('60 t/h FFB – solve speed', () => {
    const r = conveyorSizing(ffb).values
    near(r.speedMs, 0.2655)
    near(r.shaftRpm, 4.958)
    near(r.shaftKw, 3.049)
  })
  it('at a given 6 rpm – capacity and fill', () => {
    const r = conveyorSizing({ ...ffb, fixedRpm: 6 }).values
    near(r.speedMs, 0.3213)
    near(r.maxCapacityTph ?? 0, 72.61)
    near(r.loadingPct ?? 0, 49.58)
  })
})

describe('T20 Pump head & power (system)', () => {
  const base = { density: 1000, viscosity: 1, vapourKPa: 4.25, pumpLevelM: 0, pumpEffPct: 75, motorEffPct: 90, motorMargin: 1.15 }
  it('reference case: 100 m³/h, 0.5 → 3.5 bar g, 10 m lift, 12 m loss', () => {
    const r = pumpSystem({ ...base, flowM3h: 100, suctionBarg: 0.5, dischargeBarg: 3.5, suctionLevelM: 0, dischargeLevelM: 10, lossMode: 'given', lossM: 12 }).values
    near(r.headM, 52.581)
    near(r.hydraulicKw, 14.328)
    near(r.shaftKw, 19.104)
    near(r.motorInputKw, 21.227)
    expect(r.motorKw).toBe(22)
  })
  it('water 30 m³/h through 4" suction and 3" discharge (Darcy–Weisbach)', () => {
    const r = pumpSystem({
      ...base, density: 996, viscosity: 0.8, pumpEffPct: 70, flowM3h: 30, suctionBarg: 0, dischargeBarg: 0, suctionLevelM: 2, dischargeLevelM: 15,
      lossMode: 'pipes', roughnessMm: 0.045,
      suction: { idMm: 102.3, lengthM: 5, sumK: 0.5 + 0.75 + 0.15 + 2 },
      discharge: { idMm: 77.9, lengthM: 50, sumK: 1 + 6 * 0.75 + 0.15 + 2 },
    }).values
    near(r.dischargeVelocity ?? 0, 1.7485)
    near(r.suctionLossM, 0.2281)
    near(r.dischargeLossM, 3.1534)
    near(r.headM, 16.381)
    near(r.shaftKw, 1.9055)
    near(r.npshaM, 11.707)
  })
  it('laminar friction factor and zero-flow loss', () => {
    near(frictionFactor(1000, 0.0001), 0.064)
    const r = pumpSystem({ ...base, flowM3h: 0, suctionBarg: 0, dischargeBarg: 0, suctionLevelM: 0, dischargeLevelM: 5, lossMode: 'pipes', roughnessMm: 0.045, suction: { idMm: 100, lengthM: 5, sumK: 1 }, discharge: { idMm: 80, lengthM: 20, sumK: 3 } }).values
    expect(r.lossM).toBe(0)
  })
  it('hot water near boiling warns about NPSH', () => {
    const r = pumpSystem({ ...base, density: 965, viscosity: 0.32, vapourKPa: 70.1, flowM3h: 20, suctionBarg: 0, dischargeBarg: 0, suctionLevelM: 0, dischargeLevelM: 10, pumpLevelM: 1, lossMode: 'given', lossM: 3 })
    expect(r.values.npshaM).toBeLessThan(3)
    expect(r.warnings.some((w) => w.includes('NPSH'))).toBe(true)
  })
})

describe('T21 Pump affinity laws', () => {
  it('1450 → 1200 rpm', () => {
    const r = pumpAffinity({ flowM3h: 30, headM: 30, powerKw: 5, n1: 1450, n2: 1200 }).values
    near(r.flowM3h, 24.828)
    near(r.headM, 20.547)
    near(r.powerKw, 2.834)
  })
})

describe('T22 Fire water storage (iTake WT Storage sheet)', () => {
  it('3 hydrants × 1362 L/min × 60 min, 9 hose reels, Light Hazard sprinklers at 20 m', () => {
    const r = fireWaterStorage({ hydrantFlowLpm: 1362, durationMin: 60, hydrantsSimultaneous: 3, hoseReels: 9, sprinklerHazard: 0, sprinklerHeightM: 20 }).values
    expect(r.hydrantM3).toBe(246)
    near(r.hoseReelM3, 9.1)
    expect(r.sprinklerM3).toBe(10)
    near(r.totalM3, 265.1)
  })
  it('hose reel tank 2.44 m cube effective volume', () => {
    const r = fireWaterStorage({ hydrantFlowLpm: 1362, durationMin: 60, hydrantsSimultaneous: 1, hoseReels: 5, sprinklerHazard: -1, sprinklerHeightM: 0, tankHm: 2.44, tankWm: 2.44, tankDm: 2.44, suctionPipeM: 0.1, lowLevelM: 0.1, headroomM: 0.2 }).values
    near(r.effectiveM3 ?? 0, 12.145)
    near(r.hoseReelM3, 6.825)
  })
})

describe('T23 Hose reel pump (iTake hose reel sheet)', () => {
  it('120 L/min, ID 50.8, C 120, 215 m + 58.28 m fittings, 8.5 m, 2 bar, +10%', () => {
    const r = firePumpHead({ flowLpm: 120, residualBar: 2, staticM: 8.5, pipeLengthM: 215, fittingsEqM: 58.28, idMm: 50.8, method: 'hazen', hazenC: 120, roughnessMm: 0.15, safetyPct: 10, pumpEffPct: 65, motorEffPct: 85 }).values
    near(r.velocity, 0.9867)
    near(r.frictionPerM, 0.03031)
    near(r.designHeadM, 40.90)
    expect(r.motorKw).toBe(1.5)
  })
  it('pipe and fitting tables', () => {
    expect(fireInternalDiameter('giB', 50)).toBe(52.5)
    expect(fireInternalDiameter('mscl', 150)).toBe(149.1)
    expect(fittingEquivalentLength(50, 'y45')).toBe(7.41)
    expect(fittingEquivalentLength(80, 'elbow')).toBe(2.29)
  })
})

describe('T24 Pressurised hydrant pump (corrected method)', () => {
  it('3 × 1362 L/min, MSCL DN150, C 140, 100 m + fittings 173.31 m, 3 m static, 4 bar, +20%', () => {
    const r = firePumpHead({ flowLpm: 4086, residualBar: 4, staticM: 3, pipeLengthM: 100, fittingsEqM: 173.31, idMm: 149.1, method: 'hazen', hazenC: 140, roughnessMm: 0.3, safetyPct: 20, pumpEffPct: 65, motorEffPct: 85 }).values
    near(r.velocity, 3.9003)
    near(r.frictionPerM, 0.082735)
    near(r.headM, 66.400)
    near(r.designHeadM, 79.680)
    expect(r.motorKw).toBe(110)
  })
})

describe('T25 Sprinkler (Guide to Fire Protection in Malaysia table; MS 1910 pre-calc)', () => {
  it('OH Group I at 20 m height', () => {
    const r = sprinklerRequirement(1, 20).values
    expect(r.heightClass).toBe(30)
    expect(r.flowLpm).toBe(1150)
    expect(r.pressureBar).toBe(1.9)
    expect(r.storageM3).toBe(70)
  })
  it('design point A loss 451.4 mbar', () => {
    const r = sprinklerPipeLoss([
      { dn: 65, lengthM: 4, turns: 0, lossMbarPerM: 35 }, { dn: 80, lengthM: 8, turns: 0, lossMbarPerM: 16 },
      { dn: 100, lengthM: 8, turns: 0, lossMbarPerM: 4.4 }, { dn: 150, lengthM: 189, turns: 13, lossMbarPerM: 0.65 },
    ], 3).values
    near(r.totalMbar, 451.4)
  })
})

describe('T26 Fire alarm battery (iTake battery sheet)', () => {
  it('72 h standby, 1 h alarm, +10% → 24 Ah', () => {
    const r = fireAlarmBattery({ panel: 1, spka: 1, zone: 24, bell: 18, pump: 2, co2: 4, device: 8 }, 72, 1, 10).values
    near(r.standbyA, 0.2)
    near(r.alarmA, 3.68)
    near(r.minimumAh, 18.08)
    near(r.requiredAh, 19.888)
    expect(r.selectedAh).toBe(24)
  })
})

describe('T27 CO2 deep-seated (iTake CO2 sheet)', () => {
  it('Switch room 1: 3.472 × 3.73 × 3.4 m', () => {
    const r = co2DeepSeated({ lengthM: 3.472, widthM: 3.73, heightM: 3.4, factorOverride: 0, safetyPct: 10, cylinderKg: 45, nozzles: 2, distanceM: 50 }).values
    near(r.volumeM3, 44.032)
    expect(r.factor).toBe(1.6)
    near(r.requiredKg, 77.496)
    expect(r.cylinders).toBe(2)
    near(r.flowKgMin, 27)
    near(r.perNozzleKgMin, 13.5)
    expect(r.branches).toBe(2)
    expect(r.pipes.map((p) => p.dnMm)).toEqual([15, 15])
  })
  it('Utility room above 56.6 m³ uses 1.33 automatically', () => {
    const r = co2DeepSeated({ lengthM: 4.55, widthM: 3.73, heightM: 3.4, factorOverride: 0, safetyPct: 10, cylinderKg: 45, nozzles: 2, distanceM: 50 }).values
    expect(r.factor).toBe(1.33)
    expect(r.cylinders).toBe(2)
    const forced = co2DeepSeated({ lengthM: 4.55, widthM: 3.73, heightM: 3.4, factorOverride: 1.6, safetyPct: 10, cylinderKg: 45, nozzles: 2, distanceM: 50 }).values
    expect(forced.cylinders).toBe(3)
    expect(forced.pipes[0].dnMm).toBe(20)
  })
})

describe('Validation and helpers', () => {
  it('rejects zero divisors and negatives', () => {
    expect(() => sterilisationCycle({ n: 3, capacityT: 27, throughputTph: 0, blowOffMin: 2 })).toThrow(InputError)
    expect(() => thresherCapacity({ drumDiameterM: -1, loadingFactor: 0.05, bulkDensity: 0.32, rpm: 22, travelPerRevM: 0.5 })).toThrow(InputError)
  })
  it('steam table gives about 0.46 m³/kg at 3.06 bar g', () => {
    expect(specificVolumeAtGauge(3.06)).toBeGreaterThan(0.44)
    expect(specificVolumeAtGauge(3.06)).toBeLessThan(0.47)
  })
  it('mass balance closes at any basis', () => {
    const r = massBalance({ ffbKg: 45000 }).values
    near(r.products.reduce((a, p) => a + p.kg, 0), 45000)
  })
  it('oil loss sums streams', () => {
    const r = oilLoss([{ id: 'efb', oilInProductPct: 3, productToFfbPct: 20 }, { id: 'fibre', oilInProductPct: 5, productToFfbPct: 13 }]).values
    near(r.totalPct, 0.6 + 0.65)
  })
  it('unit conversions', () => {
    near(convert('length', 1, 'in', 'mm'), 25.4)
    near(convert('pressure', 1, 'bar', 'psi'), 14.5038)
    near(convert('massflow', 1, 'th', 'kgs'), 0.27778)
    near(convertTemperature(90, 'C', 'F'), 194)
  })
})

describe('Backup file', () => {
  it('round-trips and accepts old project exports', () => {
    const b = buildBackup({ name: 'Mill A', capacityTph: 60, fruitRatio: 0.6, fibreRatio: 0.13, nutRatio: 0.12, dcoRatio: 0.65, steamDemand: 272.5 }, [], [])
    expect(parseBackup(JSON.stringify(b)).project?.name).toBe('Mill A')
    expect(parseBackup(JSON.stringify({ project: null, report: [] })).history).toEqual([])
    expect(() => parseBackup('{"app":"other"}')).toThrow()
  })
})
