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
