import { sterilisationCycle } from '../engine/sterilisation'
import { specificVolumeAtGauge, steamDemand, steamPipe } from '../engine/steam'
import { thresherCapacity } from '../engine/thresher'
import { fruitElevator } from '../engine/elevator'
import { depericarperFan, destoner, separatingColumn } from '../engine/pneumatic'
import { clarificationTanks } from '../engine/clarification'
import { motorAmps, motorSpeed, pfCorrection, startingCurrent } from '../engine/electrical'
import { GallonType, pipeVelocity, pumpEfficiency, pumpPowerImperial, pumpPowerSI } from '../engine/pumping'
import { massBalance, oerFromBunch, oerKerFromProduction, oilLoss, pressCakeCheck } from '../engine/process'
import { productionCost } from '../engine/cost'
import { PIPE_MATERIALS, PUMP_FLUIDS, STRAINERS, pumpAffinity, pumpSystem, type PumpSystemInput } from '../engine/pumpSystem'
import pipeData from '../data/pipeSizes.json'
import fittingData from '../data/pumpSystem.json'
import { CHAIN_PITCH_MM, CONVEYOR_MATERIALS, CONVEYOR_TYPES, SCRAPER_DESIGNS, SCREW_SIZES, SPROCKET_TEETH, conveyorSizing, loadFromMill, sprocketPcd } from '../engine/conveyor'
import oilLossData from '../data/oilLosses.json'
import pressCakeData from '../data/pressCakeTargets.json'
import startingMethods from '../data/startingMethods.json'
import type { CalcDef, InputDef } from './types'
import { ConveyorExtra, PumpSystemExtra, CostExtra, OilLossExtra, PfTableExtra, SterilisationExtra } from './extras'

const CUSTOM = 99
const PIPES = pipeData.rows

/** Maps the pump-system form values to the engine input (also used by the system-curve chart). */
function pumpInput(v: Record<string, number>): PumpSystemInput {
  const fluid = v.fluid === CUSTOM ? { density: v.rho, viscosity: v.mu, vapourKPa: v.pv } : PUMP_FLUIDS[v.fluid]
  const k = fittingData.fittingK
  const pipes = v.lossMode !== 1
  return {
    flowM3h: v.Q, density: fluid.density, viscosity: fluid.viscosity, vapourKPa: fluid.vapourKPa,
    suctionBarg: v.ps, dischargeBarg: v.pd, suctionLevelM: v.zs, dischargeLevelM: v.zd, pumpLevelM: v.zp,
    lossMode: pipes ? 'pipes' : 'given', lossM: v.loss,
    roughnessMm: PIPE_MATERIALS[v.mat]?.roughnessMm,
    suction: pipes ? { idMm: PIPES[v.sPipe].idMm, lengthM: v.sLen, sumK: k.entrance + v.sElbow * k.elbow90 + v.sValve * k.gateValve + STRAINERS[v.strainer].k } : undefined,
    discharge: pipes ? { idMm: PIPES[v.dPipe].idMm, lengthM: v.dLen, sumK: k.exit + v.dElbow * k.elbow90 + v.dGate * k.gateValve + v.dCheck * k.checkValve + v.dGlobe * k.globeValve } : undefined,
    pumpEffPct: v.effP, motorEffPct: v.effM, motorMargin: v.margin,
  }
}
const capacity: InputDef = { key: 'capacityTph', label: 'Mill capacity', unit: 't FFB/h', default: 45, typical: [10, 120], project: 'capacityTph' }
const gallonOpt: InputDef = { key: 'gallon', label: 'Gallon type', default: 0, options: [{ value: 0, label: 'Imperial (constant 3,300)' }, { value: 1, label: 'US (constant 3,960)' }] }
const gallon = (v: number): GallonType => (v === 1 ? 'us' : 'imperial')

export const CALCULATORS: CalcDef[] = [
  // ---------- Process ----------
  {
    id: 'sterilisation',
    category: 'process',
    title: 'Sterilisation cycle',
    purpose: 'Cycle, interval and cooking times for a battery of horizontal sterilisers.',
    source: 'MPOB Pocketbook p.5',
    formula: ['Cycle (h) = n × C / Q', 'Interval = cycle / n', 'Steriliser time = cycle − interval', 'Cooking = steriliser time − final blow-off'],
    inputs: [
      { key: 'n', label: 'Number of sterilisers', default: 3, step: 1, typical: [2, 8] },
      { key: 'capacityT', label: 'Steriliser capacity', unit: 't FFB', default: 27, typical: [10, 40] },
      { key: 'throughputTph', label: 'Mill throughput', unit: 't/h', default: 45, typical: [10, 120], project: 'capacityTph' },
      { key: 'blowOffMin', label: 'Final blow-off time', unit: 'min', default: 2, allowZero: true, typical: [1, 10] },
    ],
    compute: (v) => {
      const r = sterilisationCycle({ n: v.n, capacityT: v.capacityT, throughputTph: v.throughputTph, blowOffMin: v.blowOffMin })
      return {
        primary: { label: 'Cooking time', value: r.values.cookingMin, unit: 'min', digits: 1 },
        outputs: [
          { label: 'Cycle time', value: r.values.cycleMin, unit: 'min', digits: 1 },
          { label: 'Interval time', value: r.values.intervalMin, unit: 'min', digits: 1 },
          { label: 'Steriliser time', value: r.values.steriliserMin, unit: 'min', digits: 1 },
          { label: 'Cooking time', value: r.values.cookingMin, unit: 'min', digits: 1 },
        ],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
    Extra: SterilisationExtra,
    sizing: true,
  },
  {
    id: 'oer',
    category: 'process',
    title: 'OER from bunch analysis',
    purpose: 'Estimate oil extraction rate from laboratory oil-to-bunch.',
    source: 'MPOB Pocketbook (OER factor 0.855)',
    formula: ['OER (%) = oil-to-bunch (%) × 0.855'],
    inputs: [
      { key: 'oilToBunchPct', label: 'Oil to bunch', unit: '%', default: 24.07, typical: [20, 28] },
      { key: 'factor', label: 'Extraction factor', default: 0.855, typical: [0.8, 0.9], max: 1 },
    ],
    compute: (v) => {
      const r = oerFromBunch({ oilToBunchPct: v.oilToBunchPct, factor: v.factor })
      return { primary: { label: 'OER', value: r.values.oerPct, unit: '%', digits: 2 }, outputs: [], steps: r.steps, warnings: r.warnings }
    },
  },
  {
    id: 'ker',
    category: 'process',
    title: 'OER / KER from production',
    purpose: 'Daily or monthly extraction rates from production figures.',
    source: 'Standard definition',
    formula: ['OER (%) = CPO / FFB × 100', 'KER (%) = kernel / FFB × 100'],
    inputs: [
      { key: 'ffbT', label: 'FFB processed', unit: 't', default: 900 },
      { key: 'cpoT', label: 'CPO produced', unit: 't', default: 185, allowZero: true },
      { key: 'kernelT', label: 'Kernel produced', unit: 't', default: 47, allowZero: true },
    ],
    compute: (v) => {
      const r = oerKerFromProduction({ ffbT: v.ffbT, cpoT: v.cpoT, kernelT: v.kernelT })
      return {
        primary: { label: 'OER', value: r.values.oerPct, unit: '%', digits: 2 },
        outputs: [{ label: 'OER', value: r.values.oerPct, unit: '%', digits: 2 }, { label: 'KER', value: r.values.kerPct, unit: '%', digits: 2 }],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
  },
  {
    id: 'oilloss',
    category: 'process',
    title: 'Oil losses to FFB',
    purpose: 'Oil lost in each stream as % of FFB, against benchmarks.',
    source: `MPOB Pocketbook p.6 ${oilLossData.review ? '[REVIEW: benchmarks drafted]' : ''}`,
    formula: ['Loss (% FFB) = oil in product (%) × product to FFB (%) / 100', 'Total = Σ streams'],
    inputs: oilLossData.streams.flatMap((s) => [
      { key: `${s.id}_oil`, label: `Oil in ${s.name}`, unit: '%', default: s.oilInProductPct, allowZero: true },
      { key: `${s.id}_ratio`, label: `${s.name} to FFB`, unit: '%', default: s.productToFfbPct, allowZero: true },
    ]),
    compute: (v) => {
      const r = oilLoss(oilLossData.streams.map((s) => ({ id: s.id, oilInProductPct: v[`${s.id}_oil`], productToFfbPct: v[`${s.id}_ratio`] })))
      return {
        primary: { label: 'Total oil loss', value: r.values.totalPct, unit: '% FFB', digits: 2 },
        outputs: r.values.streams.map((s) => ({ label: s.name, value: s.lossPct, unit: '% FFB', digits: 3 })),
        steps: r.steps,
        warnings: r.warnings,
        data: r.values,
      }
    },
    Extra: OilLossExtra,
  },
  {
    id: 'presscake',
    category: 'process',
    title: 'Press cake check',
    purpose: 'Compare press cake analysis with targets.',
    source: `MPOB Pocketbook p.7 ${pressCakeData.review ? '[REVIEW: targets drafted]' : ''}`,
    formula: pressCakeData.targets.map((t) => `${t.name}: ${t.min}–${t.max}${t.unit}`),
    inputs: pressCakeData.targets.map((t) => ({ key: t.key, label: t.name, unit: t.unit, default: (t.min + t.max) / 2, allowZero: true })),
    compute: (v) => {
      const r = pressCakeCheck(v)
      return {
        primary: { label: 'Checks passed', value: r.values.passed, unit: `of ${r.values.checks.length}`, digits: 0 },
        outputs: r.values.checks.map((c) => ({ label: `${c.name} ${c.ok ? '✓' : '✗'}`, value: c.value, unit: '%' })),
        steps: r.steps,
        warnings: r.warnings,
      }
    },
  },
  {
    id: 'massbalance',
    category: 'process',
    title: 'Mass balance',
    purpose: 'Scale the mill mass balance to any FFB input.',
    source: 'MPOB Pocketbook p.4 [REVIEW: split values drafted]',
    formula: ['Product = (product per 1,000 kg FFB) × FFB / 1,000'],
    inputs: [{ key: 'ffbT', label: 'FFB input', unit: 't', default: 45, project: 'capacityTph' }],
    compute: (v) => {
      const r = massBalance({ ffbKg: v.ffbT * 1000 })
      const cpo = r.values.products.find((p) => p.id === 'cpo')!
      return {
        primary: { label: 'CPO', value: cpo.kg / 1000, unit: 't', digits: 2 },
        outputs: r.values.products.map((p) => ({ label: `${p.name} (${p.pct.toFixed(1)}%)`, value: p.kg / 1000, unit: 't', digits: 3 })),
        steps: r.steps.map((s) => (s.unit === 'kg' ? { ...s, value: s.value / 1000, unit: 't' } : s)),
        warnings: [],
      }
    },
  },
  // ---------- Steam ----------
  {
    id: 'steampipe',
    category: 'steam',
    title: 'Steam distribution pipe',
    purpose: 'Bore of the steam main from the back pressure vessel to the sterilisers.',
    source: 'Corrected from MPOB Pocketbook p.20',
    corrected: true,
    formula: ['ṁ = capacity × steam demand (kg/h)', 'V = mean specific volume at the two pressures', 'd = √(4ṁV / (3600·π·v))'],
    inputs: [
      capacity,
      { key: 'demand', label: 'Steam demand', unit: 'kg/t FFB', default: 272.5, typical: [200, 650], project: 'steamDemand' },
      { key: 'mode', label: 'Specific volume source', default: 0, options: [{ value: 0, label: 'Enter values (pocketbook)' }, { value: 1, label: 'Steam table from pressures' }] },
      { key: 'p1', label: 'Back pressure', unit: 'bar g', default: 3.06, typical: [2, 4] },
      { key: 'p2', label: 'Steriliser pressure', unit: 'bar g', default: 2.72, typical: [2, 3.5] },
      { key: 'v1', label: 'Specific volume at back pressure', unit: 'm³/kg', default: 0.461, hint: 'Used when source = Enter values' },
      { key: 'v2', label: 'Specific volume at steriliser pressure', unit: 'm³/kg', default: 0.496, hint: 'Used when source = Enter values' },
      { key: 'velocity', label: 'Steam velocity', unit: 'm/s', default: 50, typical: [25, 50] },
    ],
    compute: (v) => {
      const v1 = v.mode === 1 ? specificVolumeAtGauge(v.p1) : v.v1
      const v2 = v.mode === 1 ? specificVolumeAtGauge(v.p2) : v.v2
      const r = steamPipe({ capacityTph: v.capacityTph, demandKgPerT: v.demand, v1, v2, velocity: v.velocity })
      return {
        primary: { label: 'Pipe bore', value: r.values.dMm, unit: 'mm', digits: 0 },
        outputs: [
          { label: 'Steam flow', value: r.values.massFlowKgph, unit: 'kg/h' },
          { label: 'Mean specific volume', value: r.values.meanV, unit: 'm³/kg', digits: 4 },
          { label: 'Bore', value: r.values.dM, unit: 'm', digits: 3 },
          { label: 'Bore', value: r.values.dIn, unit: 'in', digits: 2 },
          { label: `Next standard pipe ${r.values.nextPipe}, ID`, value: r.values.nextPipeIdMm, unit: 'mm', digits: 1 },
          { label: 'Velocity in that pipe', value: r.values.actualVelocity, unit: 'm/s', digits: 1 },
        ],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
    sizing: true,
  },
  {
    id: 'steamdemand',
    category: 'steam',
    title: 'Steam demand',
    purpose: 'Hourly steam demand and boiler capacity.',
    source: 'MPOB Pocketbook p.20 (demand in kg/t FFB)',
    formula: ['Demand (kg/h) = capacity × kg/t FFB', 'Boiler = demand × (1 + margin)'],
    inputs: [
      capacity,
      { key: 'demand', label: 'Steam demand', unit: 'kg/t FFB', default: 272.5, typical: [200, 700], project: 'steamDemand' },
      { key: 'margin', label: 'Design margin', unit: '%', default: 20, allowZero: true, typical: [10, 30] },
    ],
    compute: (v) => {
      const r = steamDemand({ capacityTph: v.capacityTph, demandKgPerT: v.demand, marginPct: v.margin })
      return {
        primary: { label: 'Boiler capacity', value: r.values.boilerKgph / 1000, unit: 't steam/h', digits: 2 },
        outputs: [{ label: 'Steam demand', value: r.values.demandKgph, unit: 'kg/h' }, { label: 'Boiler capacity', value: r.values.boilerKgph, unit: 'kg/h' }],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
    sizing: true,
  },
  // ---------- Mechanical ----------
  {
    id: 'thresher',
    category: 'mechanical',
    title: 'Thresher capacity',
    purpose: 'Throughput of a rotary drum thresher.',
    source: 'MPOB Pocketbook p.21',
    formula: ['V = rpm × travel × 60 (m/h)', 'a = π(d/2)² × k', 'T = a × b × V (t/h)'],
    inputs: [
      { key: 'd', label: 'Drum diameter', unit: 'm', default: 2.6, typical: [1.5, 3] },
      { key: 'k', label: 'Loading factor', default: 0.05, typical: [0.03, 0.08] },
      { key: 'b', label: 'Bulk density', unit: 't/m³', default: 0.32, typical: [0.25, 0.45] },
      { key: 'rpm', label: 'Drum speed', unit: 'rpm', default: 22, typical: [20, 26] },
      { key: 'travel', label: 'Forward travel per revolution', unit: 'm', default: 0.5, typical: [0.3, 0.8] },
    ],
    compute: (v) => {
      const r = thresherCapacity({ drumDiameterM: v.d, loadingFactor: v.k, bulkDensity: v.b, rpm: v.rpm, travelPerRevM: v.travel })
      return {
        primary: { label: 'Thresher capacity', value: r.values.capacityTph, unit: 't/h', digits: 1 },
        outputs: [{ label: 'Forward travel V', value: r.values.travelMph, unit: 'm/h' }, { label: 'Loaded area a', value: r.values.areaM2, unit: 'm²', digits: 4 }],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
    sizing: true,
  },
  {
    id: 'elevator',
    category: 'mechanical',
    title: 'Fruit elevator',
    purpose: 'Bucket volume and drive power for the fruit elevator.',
    source: 'Corrected from MPOB Pocketbook p.22 (divide by load factor)',
    corrected: true,
    formula: ['T = capacity × fruit ratio', 'c = T·P / (b·v·LF)', 'Power (kW) = 2·T(t/s)·g·h / η', 'Design = power × service factor'],
    inputs: [
      { ...capacity, default: 30 },
      { key: 'fruitRatio', label: 'Fruit / FFB', default: 0.6, typical: [0.55, 0.7], max: 1, project: 'fruitRatio' },
      { key: 'b', label: 'Fruit bulk density', unit: 't/m³', default: 0.65, typical: [0.55, 0.75] },
      { key: 'v', label: 'Chain speed', unit: 'm/s', default: 0.3, typical: [0.2, 0.5] },
      { key: 'P', label: 'Bucket pitch', unit: 'm', default: 0.4, typical: [0.2, 0.6] },
      { key: 'h', label: 'Lift height', unit: 'm', default: 14, typical: [5, 25] },
      { key: 'LF', label: 'Load factor', default: 0.85, typical: [0.6, 0.9], max: 1 },
      { key: 'eff', label: 'Drive efficiency', default: 0.75, typical: [0.6, 0.9], max: 1 },
      { key: 'SF', label: 'Service factor', default: 3, typical: [1.5, 3.5] },
    ],
    compute: (v) => {
      const r = fruitElevator({ capacityTph: v.capacityTph, fruitRatio: v.fruitRatio, bulkDensity: v.b, chainSpeed: v.v, pitchM: v.P, heightM: v.h, loadFactor: v.LF, efficiency: v.eff, serviceFactor: v.SF })
      return {
        primary: { label: 'Bucket volume', value: r.values.bucketL, unit: 'L', digits: 1 },
        outputs: [
          { label: 'Fruit throughput', value: r.values.fruitTph, unit: 't/h', digits: 1 },
          { label: 'Bucket volume', value: r.values.bucketM3, unit: 'm³', digits: 5 },
          { label: 'Absorbed power', value: r.values.powerKw, unit: 'kW', digits: 2 },
          { label: 'Design motor power', value: r.values.designKw, unit: 'kW', digits: 2 },
        ],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
    sizing: true,
  },
  {
    id: 'conveyor',
    category: 'mechanical',
    title: 'Conveyor sizing',
    purpose: 'Speed, motor power, gear ratio and gearbox size for scraper, screw, belt and chain conveyors handling mill materials.',
    source: 'iTake conveyor sizing sheet; CEMA, DIN 15262 (screw) and ISO 5048 (belt) methods. Not in the MPOB Pocketbook. [REVIEW] material constants.',
    formula: [
      'Qv = Q / ρ',
      'Scraper: v = Qv / (3600·W·h·φ·k);  F = g·[m·L·(μ·cos θ + sin θ) + 2·qc·L·μc·cos θ]',
      'Screw: N = Qv / (60·π/4·D²·S·φ·k);  P = Q·(λ·L·cos θ + H)/367 + D·L/20',
      'Belt: v = Qv / (3600·A·k);  F = C·f·L·g·[qRO + (2qB + qG)·cos θ] + qG·H·g',
      'Elevator: v = Qv·p / (3600·V·φ);  P = 2·Q(t/s)·g·H',
      'Shaft rpm = 60·v / (π·D);  Motor ≥ P / η × margin',
      'Ratio = motor rpm / shaft rpm;  Torque = 9550·kW / n × SF',
    ],
    inputs: [
      { key: 'type', label: 'Conveyor type', default: 0, options: CONVEYOR_TYPES.map((t, i) => ({ value: i, label: t.name })) },
      { key: 'material', label: 'Material handled', default: 0, options: CONVEYOR_MATERIALS.map((m, i) => ({ value: i, label: `${m.name} (${m.density} t/m³)` })) },
      {
        key: 'capBasis', label: 'Capacity based on', default: 0,
        options: [{ value: 0, label: 'Mill capacity (t FFB/h)' }, { value: 1, label: 'This conveyor’s load (t/h)' }],
      },
      { key: 'mill', label: 'Mill capacity', unit: 't FFB/h', default: 60, typical: [10, 120], project: 'capacityTph', hint: 'Load = mill × material share of FFB', showIf: (v) => v.capBasis !== 1 },
      { key: 'Q', label: 'Conveyor load', unit: 't/h', default: 60, typical: [0.5, 150], hint: 'Material actually carried', showIf: (v) => v.capBasis === 1 },
      { key: 'L', label: 'Conveyor length', unit: 'm', default: 20, typical: [2, 80], showIf: (v) => v.type !== 3 },
      { key: 'incline', label: 'Incline angle', unit: '°', default: 0, allowZero: true, max: 90, typical: [0, 60], showIf: (v) => v.type !== 3 },
      { key: 'liftM', label: 'Lift height', unit: 'm', default: 14, typical: [3, 30], showIf: (v) => v.type === 3 },
      // Scraper bar conveyor
      {
        key: 'scraperDesign', label: 'Scraper conveyor size', default: 0, hint: 'Width · flight W×H (mm)', showIf: (v) => v.type === 0,
        options: [
          ...SCRAPER_DESIGNS.map((z, k) => ({ value: k, label: `${z.insideMm} · ${z.flightWidthMm}×${z.flightHeightMm} (${z.usage})` })),
          { value: CUSTOM, label: 'Custom size (enter below)' },
        ],
      },
      { key: 'troughW', label: 'Flight width', unit: 'mm', default: 1090, typical: [300, 1500], showIf: (v) => v.type === 0 && v.scraperDesign === CUSTOM },
      { key: 'flightH', label: 'Flight height', unit: 'mm', default: 160, typical: [75, 400], showIf: (v) => v.type === 0 && v.scraperDesign === CUSTOM },
      { key: 'chainKg', label: 'Chain + flight mass (both chains)', unit: 'kg/m', default: 32, typical: [10, 80], hint: 'Two 152.4 chains ≈ 24 kg/m + flights', showIf: (v) => v.type === 0 && v.scraperDesign === CUSTOM },
      {
        key: 'sprocket', label: 'Drive sprocket (152.4 pitch chain)', default: 0, showIf: (v) => v.type === 0,
        options: [
          { value: 0, label: 'Standard for this size' },
          ...SPROCKET_TEETH.map((t) => ({ value: t, label: `${t} teeth (PCD ${sprocketPcd(CHAIN_PITCH_MM, t).toFixed(0)} mm)` })),
        ],
      },
      // Screw conveyor
      {
        key: 'screwSize', label: 'Screw conveyor size', default: 2, showIf: (v) => v.type === 1,
        options: [
          ...SCREW_SIZES.map((z, k) => ({ value: k, label: `Ø${z.size} – pitch ${z.pitchMm}` })),
          { value: CUSTOM, label: 'Custom size (enter below)' },
        ],
      },
      { key: 'screwD', label: 'Flight diameter', unit: 'mm', default: 485, typical: [150, 1000], showIf: (v) => v.type === 1 && v.screwSize === CUSTOM },
      { key: 'screwPitch', label: 'Pitch', unit: 'mm', default: 380, typical: [100, 800], showIf: (v) => v.type === 1 && v.screwSize === CUSTOM },
      { key: 'pipeD', label: 'Centre pipe OD', unit: 'mm', default: 75, allowZero: true, typical: [0, 200], showIf: (v) => v.type === 1 && v.screwSize === CUSTOM },
      { key: 'shaftD', label: 'Drive shaft diameter', unit: 'mm', default: 65, typical: [30, 150], showIf: (v) => (v.type === 1 && v.screwSize === CUSTOM) || (v.type === 0 && v.scraperDesign === CUSTOM) },
      { key: 'rpmMode', label: 'Drive speed', default: 0, options: [{ value: 0, label: 'Calculate the RPM needed' }, { value: 1, label: 'I will enter the RPM' }], showIf: (v) => v.type === 0 || v.type === 1 },
      { key: 'screwRpm', label: 'Screw RPM', unit: 'rpm', default: 40, typical: [10, 120], showIf: (v) => v.type === 1 && v.rpmMode === 1 },
      { key: 'scraperRpm', label: 'Drive sprocket RPM', unit: 'rpm', default: 6, typical: [1, 30], showIf: (v) => v.type === 0 && v.rpmMode === 1 },
      // Belt conveyor
      { key: 'beltW', label: 'Belt width', unit: 'mm', default: 800, typical: [400, 1400], showIf: (v) => v.type === 2 },
      { key: 'trough', label: 'Troughing angle', default: 20, options: [0, 20, 30, 35, 45].map((a) => ({ value: a, label: a === 0 ? 'Flat belt' : `${a}° three-roll` })), showIf: (v) => v.type === 2 },
      { key: 'pulleyD', label: 'Drive pulley diameter', unit: 'mm', default: 500, typical: [250, 1000], showIf: (v) => v.type === 2 },
      { key: 'beltKg', label: 'Belt mass', unit: 'kg/m', default: 10, typical: [4, 30], showIf: (v) => v.type === 2 },
      { key: 'idlerKg', label: 'Idler rotating mass (carry + return)', unit: 'kg/m', default: 15, typical: [5, 40], showIf: (v) => v.type === 2 },
      // Chain (bucket) elevator
      { key: 'bucketL', label: 'Bucket / flight volume', unit: 'L', default: 50, typical: [2, 200], showIf: (v) => v.type === 3 },
      { key: 'bucketP', label: 'Bucket pitch', unit: 'm', default: 0.6, typical: [0.2, 1], showIf: (v) => v.type === 3 },
      // Scraper and elevator
      { key: 'fill', label: 'Fill factor', default: 0.6, max: 1, typical: [0.4, 0.85], hint: 'How full the flights run; 0.6 is typical', showIf: (v) => v.type === 0 || v.type === 3 },
      { key: 'pcd', label: 'Head sprocket PCD', unit: 'mm', default: 400, typical: [150, 800], showIf: (v) => v.type === 3 },
      // Drive
      {
        key: 'motorRpm', label: 'Motor type (50 Hz)', default: 1450,
        options: [
          { value: 1450, label: '4-pole, 1450 rpm (most common)' },
          { value: 2900, label: '2-pole, 2900 rpm' },
          { value: 960, label: '6-pole, 960 rpm' },
          { value: 720, label: '8-pole, 720 rpm' },
        ],
      },
      {
        key: 'margin', label: 'Motor power margin', default: 1.2, hint: 'Extra for start-up, surges, wear',
        options: [
          { value: 1.1, label: '+10% – steady load' },
          { value: 1.2, label: '+20% – normal' },
          { value: 1.3, label: '+30% – uneven feed (FFB, SFB)' },
          { value: 1.5, label: '+50% – frequent jams' },
        ],
      },
      {
        key: 'gearSF', label: 'Gearbox duty', default: 1.5,
        options: [
          { value: 1.25, label: 'Light: uniform load, ≤ 10 h/day (SF 1.25)' },
          { value: 1.5, label: 'Normal mill conveyor, 24 h (SF 1.5)' },
          { value: 1.75, label: 'Heavy shock, 24 h (SF 1.75)' },
          { value: 2, label: 'Severe shock / frequent starts (SF 2.0)' },
        ],
      },
    ],
    compute: (v) => {
      const type = CONVEYOR_TYPES[v.type]
      const material = CONVEYOR_MATERIALS[v.material]
      const size = v.screwSize === CUSTOM ? undefined : SCREW_SIZES[v.screwSize]
      const design = v.scraperDesign === CUSTOM ? undefined : SCRAPER_DESIGNS[v.scraperDesign]
      const teeth = v.sprocket > 0 ? v.sprocket : (design?.sprocketTeeth ?? 12)
      const load = v.capBasis === 1 ? { tph: v.Q, ratio: undefined } : loadFromMill(v.mill, material.id)
      const r = conveyorSizing({
        type: type.id, materialId: material.id, capacityTph: load.tph, lengthM: v.L, inclineDeg: v.type === 3 ? 90 : v.incline,
        motorRpm: v.motorRpm, powerMargin: v.margin, gearServiceFactor: v.gearSF,
        troughWidthMm: design?.flightWidthMm ?? v.troughW, flightHeightMm: design?.flightHeightMm ?? v.flightH, fill: v.fill,
        sprocketPcdMm: v.type === 0 ? sprocketPcd(CHAIN_PITCH_MM, teeth) : v.pcd, chainKgPerM: design?.movingKgPerM ?? v.chainKg,
        screwDiameterMm: size?.flightMm ?? v.screwD, screwPitchMm: size?.pitchMm ?? v.screwPitch, pipeMm: size?.pipeMm ?? v.pipeD, shaftDiaMm: v.type === 0 ? (design?.shaftMm ?? v.shaftD) : (size?.shaftMm ?? v.shaftD),
        fixedRpm: v.rpmMode === 1 && (v.type === 0 || v.type === 1) ? (v.type === 0 ? v.scraperRpm : v.screwRpm) : undefined,
        beltWidthMm: v.beltW, troughDeg: v.trough, pulleyMm: v.pulleyD, beltKgPerM: v.beltKg, idlerKgPerM: v.idlerKg,
        bucketL: v.bucketL, bucketPitchM: v.bucketP, liftM: v.liftM,
      })
      const x = r.values
      if (v.type === 0) {
        const pcd = sprocketPcd(CHAIN_PITCH_MM, teeth)
        r.steps.unshift(
          { label: 'Conveyor geometry', formula: `${design ? `${design.insideMm} wide (${design.usage}): ` : ''}flight ${design?.flightWidthMm ?? v.troughW} × ${design?.flightHeightMm ?? v.flightH} mm, ${teeth}T × ${CHAIN_PITCH_MM} sprocket, PCD = p / sin(180°/z)`, value: pcd, unit: 'mm' },
          { label: 'Chain + flight mass qc', formula: design ? `two chains + ${design.flight}` : 'entered', value: design?.movingKgPerM ?? v.chainKg, unit: 'kg/m' },
        )
      }
      if (load.ratio !== undefined) r.steps.unshift({ label: `Conveyor load (${material.name})`, formula: `mill capacity × share of FFB = ${v.mill} × ${load.ratio}`, value: load.tph, unit: 't/h' })
      return {
        primary: { label: 'Required motor power', value: x.requiredKw, unit: 'kW', digits: 2 },
        outputs: [
          { label: 'Conveyor load', value: load.tph, unit: 't/h', digits: 1 },
          { label: v.type === 1 ? 'Screw speed' : 'Conveyor speed', value: v.type === 1 ? x.shaftRpm : x.speedMs, unit: v.type === 1 ? 'rpm' : 'm/s', digits: 2 },
          { label: 'Required conveyor RPM', value: x.shaftRpm, unit: 'rpm', digits: 1 },
          ...(x.maxCapacityTph !== undefined ? [
            { label: 'Capacity at this RPM', value: x.maxCapacityTph, unit: 't/h', digits: 1 },
            { label: 'Actual fill', value: x.loadingPct ?? 0, unit: '%', digits: 0 },
          ] : []),
          { label: 'Shaft power', value: x.shaftKw, unit: 'kW', digits: 2 },
          { label: 'Selected motor', value: x.motorKw, unit: 'kW', digits: 2 },
          { label: 'Selected gearbox ratio', value: x.ratioSelected, unit: ': 1', digits: 1 },
          { label: 'Gearbox design torque', value: x.designTorqueNm, unit: 'N·m', digits: 0 },
        ],
        steps: r.steps,
        warnings: r.warnings,
        data: { values: x, material, typeId: type.id },
      }
    },
    Extra: ConveyorExtra,
  },
  {
    id: 'depericarper',
    category: 'mechanical',
    title: 'De-pericarper fan',
    purpose: 'Air volume for fibre separation from press cake.',
    source: 'MPOB Pocketbook p.23',
    formula: ['Fibre = capacity × fibre/FFB', 'Air mass = fibre × air:fibre', 'Air volume = mass / ρ', 'Fan = volume × (1 + leakage)'],
    inputs: [
      capacity,
      { key: 'fibreRatio', label: 'Fibre / FFB', default: 0.19, typical: [0.11, 0.2], max: 1, project: 'fibreRatio', hint: 'Pocketbook example 0.19' },
      { key: 'airRatio', label: 'Air : fibre (mass)', default: 4, typical: [3, 5] },
      { key: 'rho', label: 'Air density', unit: 'kg/m³', default: 1.1777, typical: [1.1, 1.25] },
      { key: 'leak', label: 'Leakage allowance', unit: '%', default: 25, allowZero: true, typical: [10, 30] },
    ],
    compute: (v) => {
      const r = depericarperFan({ capacityTph: v.capacityTph, fibreRatio: v.fibreRatio, airRatio: v.airRatio, airDensity: v.rho, leakagePct: v.leak })
      return {
        primary: { label: 'Fan capacity', value: r.values.fanM3ph, unit: 'm³/h' },
        outputs: [
          { label: 'Fibre', value: r.values.solidsKgph, unit: 'kg/h' },
          { label: 'Air mass', value: r.values.airKgph, unit: 'kg/h' },
          { label: 'Air volume', value: r.values.airM3ph, unit: 'm³/h' },
        ],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
    sizing: true,
  },
  {
    id: 'column',
    category: 'mechanical',
    title: 'Separating column',
    purpose: 'Column cross-section, trunk size and fan power for a pneumatic separator.',
    source: 'Corrected from MPOB Pocketbook p.24 (area 0.667 m²)',
    corrected: true,
    formula: ['Column area = Q / (v_sep × 3600); L = √area', 'Trunk area = Q / (v_trunk × 3600); r = √(area/π)', 'Power (kW) = Q × ΔP × SF / (311 × η)'],
    inputs: [
      { key: 'Q', label: 'Fan capacity', unit: 'm³/h', default: 24000, typical: [5000, 80000] },
      { key: 'vs', label: 'Separating velocity', unit: 'm/s', default: 10, typical: [6, 18] },
      { key: 'vt', label: 'Trunk velocity', unit: 'm/s', default: 25, typical: [18, 30] },
      { key: 'dp', label: 'Pressure loss', default: 0.3, hint: 'As used with the 311 constant in the pocketbook' },
      { key: 'SF', label: 'Service factor', default: 1.3, typical: [1.1, 1.5] },
      { key: 'eta', label: 'Fan efficiency', default: 0.7, typical: [0.5, 0.85], max: 1 },
    ],
    compute: (v) => {
      const r = separatingColumn({ fanM3ph: v.Q, sepVelocity: v.vs, trunkVelocity: v.vt, pressureLoss: v.dp, serviceFactor: v.SF, fanEfficiency: v.eta })
      return {
        primary: { label: 'Column side L', value: r.values.columnSideMm, unit: 'mm', digits: 0 },
        outputs: [
          { label: 'Column area', value: r.values.columnAreaM2, unit: 'm²', digits: 3 },
          { label: 'Trunk area', value: r.values.trunkAreaM2, unit: 'm²', digits: 3 },
          { label: 'Trunk radius r', value: r.values.trunkRadiusMm, unit: 'mm', digits: 0 },
          { label: 'Fan power', value: r.values.powerKw, unit: 'kW', digits: 1 },
        ],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
  },
  {
    id: 'destoner',
    category: 'mechanical',
    title: 'De-stoner',
    purpose: 'Air flow, column and duct size and fan power for the nut de-stoner.',
    source: 'Corrected from MPOB Pocketbook p.25 (air density 1.1777)',
    corrected: true,
    formula: ['Nut = capacity × nut/FFB; air = nut × air:nut; volume = air / ρ; fan = volume × (1 + leakage)', 'Column area = fan / (v_sep × 3600); duct r = √(fan / (v_conv × 3600) / π)', 'Power = Q × ΔP × SF / (311 × η)'],
    inputs: [
      { ...capacity, default: 30 },
      { key: 'nutRatio', label: 'Nut / FFB', default: 0.12, typical: [0.1, 0.15], max: 1, project: 'nutRatio' },
      { key: 'airRatio', label: 'Air : nut (mass)', default: 5, typical: [4, 6] },
      { key: 'rho', label: 'Air density', unit: 'kg/m³', default: 1.1777, typical: [1.1, 1.25], hint: '1.777 in the pocketbook is a misprint' },
      { key: 'leak', label: 'Leakage allowance', unit: '%', default: 25, allowZero: true },
      { key: 'vs', label: 'Separating velocity', unit: 'm/s', default: 16, typical: [14, 18] },
      { key: 'vc', label: 'Conveying velocity', unit: 'm/s', default: 25, typical: [20, 30] },
      { key: 'dp', label: 'Pressure loss', default: 0.3 },
      { key: 'SF', label: 'Service factor', default: 1.3 },
      { key: 'eta', label: 'Fan efficiency', default: 0.7, max: 1 },
    ],
    compute: (v) => {
      const r = destoner({ capacityTph: v.capacityTph, nutRatio: v.nutRatio, airRatio: v.airRatio, airDensity: v.rho, leakagePct: v.leak, sepVelocity: v.vs, conveyVelocity: v.vc, pressureLoss: v.dp, serviceFactor: v.SF, fanEfficiency: v.eta })
      return {
        primary: { label: 'Fan capacity', value: r.values.fanM3ph, unit: 'm³/h' },
        outputs: [
          { label: 'Air volume', value: r.values.airM3ph, unit: 'm³/h' },
          { label: 'Column area', value: r.values.columnAreaM2, unit: 'm²', digits: 3 },
          { label: 'Column side L', value: r.values.columnSideMm, unit: 'mm', digits: 0 },
          { label: 'Duct radius r', value: r.values.trunkRadiusMm, unit: 'mm', digits: 0 },
          { label: 'Fan power', value: r.values.powerKw, unit: 'kW', digits: 1 },
        ],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
    sizing: true,
  },
  {
    id: 'clarification',
    category: 'mechanical',
    title: 'Clarification tanks',
    purpose: 'Volumes of the clarifier, pure oil tank and sludge tank.',
    source: 'Corrected from MPOB Pocketbook p.26 (sludge = 50% of crude oil)',
    corrected: true,
    formula: ['DCO = capacity × DCO/FFB', 'Clarifier = DCO × t × SF / ρ', 'Pure oil tank = DCO × 0.40 × 1 h / ρ', 'Sludge tank = DCO × 0.50 × 1 h / ρ'],
    inputs: [
      capacity,
      { key: 'dcoRatio', label: 'Diluted crude oil / FFB', default: 0.65, typical: [0.5, 0.9], project: 'dcoRatio' },
      { key: 'rho', label: 'Oil density', unit: 't/m³', default: 0.8607, typical: [0.85, 0.9] },
      { key: 't', label: 'Clarifier retention', unit: 'h', default: 3, typical: [2, 5] },
      { key: 'SF', label: 'Service factor', default: 1.3, typical: [1.1, 1.5] },
      { key: 'po', label: 'Pure oil fraction', default: 0.4, max: 1 },
      { key: 'sl', label: 'Sludge fraction', default: 0.5, max: 1 },
      { key: 'tb', label: 'Buffer tank retention', unit: 'h', default: 1 },
    ],
    compute: (v) => {
      const r = clarificationTanks({ capacityTph: v.capacityTph, dcoRatio: v.dcoRatio, densityTm3: v.rho, retentionH: v.t, serviceFactor: v.SF, pureOilFraction: v.po, sludgeFraction: v.sl, bufferRetentionH: v.tb })
      return {
        primary: { label: 'Clarifier volume', value: r.values.clarifierM3, unit: 'm³', digits: 1 },
        outputs: [
          { label: 'Diluted crude oil', value: r.values.dcoTph, unit: 't/h', digits: 2 },
          { label: 'Pure oil tank', value: r.values.pureOilM3, unit: 'm³', digits: 2 },
          { label: 'Sludge tank', value: r.values.sludgeM3, unit: 'm³', digits: 2 },
        ],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
    sizing: true,
  },
  // ---------- Electrical ----------
  {
    id: 'motoramps',
    category: 'electrical',
    title: 'Motor full-load current',
    purpose: 'Line current of an induction motor.',
    source: 'MPOB Pocketbook p.10',
    formula: ['Single phase I = BHP·746·100 / (V·Eff%·PF)', 'Three phase I = single-phase formula / 1.73'],
    inputs: [
      { key: 'phase', label: 'Supply', default: 3, options: [{ value: 3, label: 'Three phase' }, { value: 1, label: 'Single phase' }] },
      { key: 'bhp', label: 'Motor output', unit: 'BHP', default: 10 },
      { key: 'volts', label: 'Voltage', unit: 'V', default: 415, typical: [220, 690] },
      { key: 'eff', label: 'Efficiency', unit: '%', default: 90, typical: [75, 97], max: 100 },
      { key: 'pf', label: 'Power factor', default: 0.85, typical: [0.75, 0.95], max: 1 },
    ],
    compute: (v) => {
      const r = motorAmps({ bhp: v.bhp, volts: v.volts, effPct: v.eff, pf: v.pf, phase: v.phase === 1 ? 1 : 3 })
      return { primary: { label: 'Full-load current', value: r.values.amps, unit: 'A', digits: 1 }, outputs: [{ label: 'Output power', value: r.values.kw, unit: 'kW', digits: 2 }], steps: r.steps, warnings: r.warnings }
    },
  },
  {
    id: 'pfcorrection',
    category: 'electrical',
    title: 'Power factor correction',
    purpose: 'Capacitor kVAR needed to raise the power factor.',
    source: 'Corrected from MPOB Pocketbook p.11 (computed, not table)',
    corrected: true,
    formula: ['Multiplier = tan(acos PF1) − tan(acos PF2)', 'kVAR = kW × multiplier'],
    inputs: [
      { key: 'kw', label: 'Load', unit: 'kW', default: 100 },
      { key: 'pf1', label: 'Existing PF', default: 0.7, typical: [0.5, 0.95], max: 1, step: 0.05 },
      { key: 'pf2', label: 'Target PF', default: 0.9, typical: [0.85, 0.98], max: 1, step: 0.05 },
    ],
    compute: (v) => {
      const r = pfCorrection({ kw: v.kw, pf1: v.pf1, pf2: v.pf2 })
      return { primary: { label: 'Capacitor rating', value: r.values.kvar, unit: 'kVAR', digits: 1 }, outputs: [{ label: 'Multiplier', value: r.values.multiplier, unit: '', digits: 3 }], steps: r.steps, warnings: r.warnings }
    },
    Extra: PfTableExtra,
  },
  {
    id: 'motorspeed',
    category: 'electrical',
    title: 'Motor speed',
    purpose: 'Synchronous and full-load speed of an induction motor.',
    source: 'MPOB Pocketbook p.18',
    formula: ['N_sync = 120 × f / poles', 'N_FL = N_sync × (1 − slip)'],
    inputs: [
      { key: 'poles', label: 'Poles', default: 4, options: [2, 4, 6, 8, 10, 12].map((p) => ({ value: p, label: `${p}-pole` })) },
      { key: 'f', label: 'Frequency', unit: 'Hz', default: 50, options: [{ value: 50, label: '50 Hz' }, { value: 60, label: '60 Hz' }] },
      { key: 'slip', label: 'Full-load slip', unit: '%', default: 3, allowZero: true, typical: [1, 6] },
    ],
    compute: (v) => {
      const r = motorSpeed({ poles: v.poles, freqHz: v.f, slipPct: v.slip })
      return { primary: { label: 'Full-load speed', value: r.values.fullLoadRpm, unit: 'rpm', digits: 0 }, outputs: [{ label: 'Synchronous speed', value: r.values.syncRpm, unit: 'rpm', digits: 0 }], steps: r.steps, warnings: r.warnings }
    },
  },
  {
    id: 'startingcurrent',
    category: 'electrical',
    title: 'Starting current',
    purpose: 'Typical starting current for each starting method.',
    source: 'MPOB Pocketbook p.19 [REVIEW: multiples drafted]',
    formula: ['I_start = FLC × multiple for the starting method'],
    inputs: [
      { key: 'flc', label: 'Full-load current', unit: 'A', default: 13.6 },
      { key: 'method', label: 'Starting method', default: 1, options: startingMethods.rows.map((r) => ({ value: r.id, label: r.method })) },
    ],
    compute: (v) => {
      const r = startingCurrent({ flcA: v.flc, method: v.method })
      return { primary: { label: 'Starting current', value: r.values.startA, unit: 'A', digits: 1 }, outputs: [{ label: 'Multiple of FLC', value: r.values.multiple, unit: '×', digits: 1 }], steps: r.steps, warnings: r.warnings }
    },
  },
  // ---------- Pumping ----------
  {
    id: 'pumpsystem',
    category: 'pumping',
    title: 'Pump head & power (system)',
    purpose: 'Total head, power and motor size for a pump moving a mill fluid from one tank to another, with pipe friction, fittings and an NPSH check.',
    source: 'Steady-flow energy balance with Darcy–Weisbach friction (Swamee–Jain). Not in the MPOB Pocketbook. [REVIEW] fluid properties and fitting K values.',
    formula: [
      'H = (Pd − Ps)/(ρg) + (zd − zs) + hL   (tank surface to tank surface)',
      'hL = Σ (f·L/D + ΣK)·v²/2g;  f = 64/Re or Swamee–Jain',
      'Hydraulic P = ρ·g·Q·H;  Shaft = P/ηp;  Motor input = Shaft/ηm',
      'NPSHa = (Ps + Patm − Pv)/(ρg) + (zs − zpump) − hL,suction',
    ],
    inputs: [
      { key: 'fluid', label: 'Fluid', default: 0, options: [...PUMP_FLUIDS.map((f, k) => ({ value: k, label: f.name })), { value: CUSTOM, label: 'Custom fluid (enter below)' }] },
      { key: 'rho', label: 'Density', unit: 'kg/m³', default: 1000, typical: [700, 1300], showIf: (v) => v.fluid === CUSTOM },
      { key: 'mu', label: 'Viscosity', unit: 'mPa·s (cP)', default: 1, typical: [0.2, 500], showIf: (v) => v.fluid === CUSTOM },
      { key: 'pv', label: 'Vapour pressure', unit: 'kPa abs', default: 4.25, allowZero: true, typical: [0, 150], showIf: (v) => v.fluid === CUSTOM },
      { key: 'Q', label: 'Flow rate', unit: 'm³/h', default: 30, typical: [1, 500] },
      { key: 'ps', label: 'Suction tank pressure', unit: 'bar g', default: 0, allowZero: true, typical: [0, 10], hint: '0 = open tank' },
      { key: 'zs', label: 'Suction liquid level', unit: 'm', default: 2, allowZero: true, typical: [0, 30], hint: 'Height above floor / lowest point' },
      { key: 'zp', label: 'Pump centreline', unit: 'm', default: 0, allowZero: true, typical: [0, 30] },
      { key: 'pd', label: 'Discharge tank pressure', unit: 'bar g', default: 0, allowZero: true, typical: [0, 20], hint: '0 = open tank' },
      { key: 'zd', label: 'Discharge level / outlet', unit: 'm', default: 15, allowZero: true, typical: [0, 60] },
      { key: 'lossMode', label: 'Pipe losses', default: 0, options: [{ value: 0, label: 'Calculate from pipes and fittings' }, { value: 1, label: 'I know the total loss (m)' }] },
      { key: 'loss', label: 'Total head loss', unit: 'm', default: 5, allowZero: true, typical: [0, 50], showIf: (v) => v.lossMode === 1 },
      { key: 'mat', label: 'Pipe material', default: 0, options: PIPE_MATERIALS.map((m, k) => ({ value: k, label: `${m.name} (ε ${m.roughnessMm} mm)` })), showIf: (v) => v.lossMode !== 1 },
      { key: 'sPipe', label: 'Suction pipe size', default: 5, options: PIPES.map((p, k) => ({ value: k, label: `${p.nps} (DN${p.dn}, ID ${p.idMm})` })), showIf: (v) => v.lossMode !== 1 },
      { key: 'sLen', label: 'Suction pipe length', unit: 'm', default: 5, allowZero: true, typical: [0, 50], showIf: (v) => v.lossMode !== 1 },
      { key: 'sElbow', label: 'Suction 90° elbows', default: 1, step: 1, allowZero: true, typical: [0, 10], showIf: (v) => v.lossMode !== 1 },
      { key: 'sValve', label: 'Suction isolating valves', default: 1, step: 1, allowZero: true, typical: [0, 5], showIf: (v) => v.lossMode !== 1 },
      { key: 'strainer', label: 'Suction strainer', default: 1, options: STRAINERS.map((x, k) => ({ value: k, label: x.name })), showIf: (v) => v.lossMode !== 1 },
      { key: 'dPipe', label: 'Discharge pipe size', default: 4, options: PIPES.map((p, k) => ({ value: k, label: `${p.nps} (DN${p.dn}, ID ${p.idMm})` })), showIf: (v) => v.lossMode !== 1 },
      { key: 'dLen', label: 'Discharge pipe length', unit: 'm', default: 50, allowZero: true, typical: [0, 500], showIf: (v) => v.lossMode !== 1 },
      { key: 'dElbow', label: 'Discharge 90° elbows', default: 6, step: 1, allowZero: true, typical: [0, 30], showIf: (v) => v.lossMode !== 1 },
      { key: 'dGate', label: 'Discharge gate / ball valves', default: 1, step: 1, allowZero: true, typical: [0, 10], showIf: (v) => v.lossMode !== 1 },
      { key: 'dCheck', label: 'Check (non-return) valves', default: 1, step: 1, allowZero: true, typical: [0, 3], showIf: (v) => v.lossMode !== 1 },
      { key: 'dGlobe', label: 'Globe / control valves', default: 0, step: 1, allowZero: true, typical: [0, 3], showIf: (v) => v.lossMode !== 1 },
      { key: 'effP', label: 'Pump efficiency', unit: '%', default: 70, max: 100, typical: [40, 85], hint: 'From pump curve; 60–75% typical' },
      { key: 'effM', label: 'Motor efficiency', unit: '%', default: 90, max: 100, typical: [80, 96] },
      {
        key: 'margin', label: 'Motor power margin', default: 1.15, hint: 'Motor ≥ shaft power × margin',
        options: [{ value: 1.1, label: '+10% – large pumps (> 22 kW)' }, { value: 1.15, label: '+15% – normal' }, { value: 1.25, label: '+25% – small pumps, viscous oil, sludge' }],
      },
    ],
    compute: (v) => {
      const input = pumpInput(v)
      const r = pumpSystem(input)
      const x = r.values
      return {
        primary: { label: 'Total dynamic head', value: x.headM, unit: 'm', digits: 2 },
        outputs: [
          { label: 'Hydraulic power', value: x.hydraulicKw, unit: 'kW', digits: 2 },
          { label: 'Pump shaft power', value: x.shaftKw, unit: 'kW', digits: 2 },
          { label: 'Motor input power', value: x.motorInputKw, unit: 'kW', digits: 2 },
          { label: 'Selected motor', value: x.motorKw, unit: 'kW', digits: 2 },
          { label: 'NPSH available', value: x.npshaM, unit: 'm', digits: 2 },
          { label: 'Total pipe losses', value: x.lossM, unit: 'm', digits: 2 },
          ...(x.suctionVelocity !== undefined ? [
            { label: 'Suction velocity', value: x.suctionVelocity, unit: 'm/s', digits: 2 },
            { label: 'Discharge velocity', value: x.dischargeVelocity ?? 0, unit: 'm/s', digits: 2 },
          ] : []),
        ],
        steps: r.steps,
        warnings: r.warnings,
        data: { input, values: x },
      }
    },
    Extra: PumpSystemExtra,
  },
  {
    id: 'pumpaffinity',
    category: 'pumping',
    title: 'Pump speed change (affinity laws)',
    purpose: 'New flow, head and power when a pump runs at a different speed (VSD or pulley change) or with a trimmed impeller.',
    source: 'Pump affinity laws. Not in the MPOB Pocketbook.',
    formula: ['Q₂ = Q₁ × (N₂/N₁)', 'H₂ = H₁ × (N₂/N₁)²', 'P₂ = P₁ × (N₂/N₁)³', 'For impeller trim use diameters D₂/D₁ in place of speeds (approximate).'],
    inputs: [
      { key: 'Q', label: 'Present flow', unit: 'm³/h', default: 30, typical: [1, 500] },
      { key: 'H', label: 'Present head', unit: 'm', default: 30, typical: [2, 150] },
      { key: 'P', label: 'Present shaft power', unit: 'kW', default: 5, typical: [0.2, 200] },
      { key: 'n1', label: 'Present speed (or impeller Ø)', unit: 'rpm', default: 1450, typical: [100, 3600] },
      { key: 'n2', label: 'New speed (or impeller Ø)', unit: 'rpm', default: 1200, typical: [100, 3600] },
    ],
    compute: (v) => {
      const r = pumpAffinity({ flowM3h: v.Q, headM: v.H, powerKw: v.P, n1: v.n1, n2: v.n2 })
      const x = r.values
      return {
        primary: { label: 'New shaft power', value: x.powerKw, unit: 'kW', digits: 2 },
        outputs: [
          { label: 'Speed ratio', value: x.ratio, unit: '', digits: 3 },
          { label: 'New flow', value: x.flowM3h, unit: 'm³/h', digits: 1 },
          { label: 'New head', value: x.headM, unit: 'm', digits: 1 },
          { label: 'Power saved', value: (1 - x.ratio ** 3) * 100, unit: '%', digits: 0 },
        ],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
  },
  {
    id: 'pipevelocity',
    category: 'pumping',
    title: 'Water velocity in pipe',
    purpose: 'Velocity from flow and pipe bore, imperial approximation and SI.',
    source: 'MPOB Pocketbook p.12',
    formula: ['v (ft/s) ≈ GPM / (2·D²)  (imperial gal, D in inches)', 'v (m/s) = Q / (π·D²/4)'],
    inputs: [
      { key: 'gpm', label: 'Flow', unit: 'imp gal/min', default: 100 },
      { key: 'd', label: 'Pipe bore', unit: 'in', default: 3, typical: [0.5, 24] },
    ],
    compute: (v) => {
      const r = pipeVelocity({ gpm: v.gpm, diameterIn: v.d })
      return { primary: { label: 'Velocity', value: r.values.mps, unit: 'm/s', digits: 2 }, outputs: [{ label: 'Velocity (imperial approx.)', value: r.values.ftps, unit: 'ft/s', digits: 2 }], steps: r.steps, warnings: r.warnings }
    },
  },
  {
    id: 'pumppower',
    category: 'pumping',
    title: 'Pump power (WHP / BHP)',
    purpose: 'Water and brake horsepower for a pump duty.',
    source: 'MPOB Pocketbook p.12–13 (imperial gallons; US option added)',
    corrected: true,
    formula: ['WHP = G·H / constant  (3,300 imperial, 3,960 US)', 'BHP = WHP × 100 / E'],
    inputs: [
      gallonOpt,
      { key: 'gpm', label: 'Flow', unit: 'gal/min', default: 100 },
      { key: 'head', label: 'Total head', unit: 'ft', default: 50 },
      { key: 'eff', label: 'Pump efficiency', unit: '%', default: 70, typical: [40, 85], max: 100 },
      { key: 'sg', label: 'Specific gravity', default: 1, typical: [0.8, 1.1] },
    ],
    compute: (v) => {
      const r = pumpPowerImperial({ gpm: v.gpm, headFt: v.head, effPct: v.eff, gallon: gallon(v.gallon), specificGravity: v.sg })
      return {
        primary: { label: 'Brake horsepower', value: r.values.bhp, unit: 'hp', digits: 2 },
        outputs: [{ label: 'Water horsepower', value: r.values.whp, unit: 'hp', digits: 2 }, { label: 'Shaft power', value: r.values.kw, unit: 'kW', digits: 2 }],
        steps: r.steps,
        warnings: r.warnings,
      }
    },
  },
  {
    id: 'pumppowersi',
    category: 'pumping',
    title: 'Pump power (SI)',
    purpose: 'Hydraulic and shaft power in kW.',
    source: 'Standard formula (SI mode)',
    formula: ['P_hyd = ρ·g·Q·H', 'P_shaft = P_hyd / η'],
    inputs: [
      { key: 'q', label: 'Flow', unit: 'm³/h', default: 27.3 },
      { key: 'h', label: 'Total head', unit: 'm', default: 15.2 },
      { key: 'rho', label: 'Fluid density', unit: 'kg/m³', default: 1000, typical: [850, 1100] },
      { key: 'eff', label: 'Pump efficiency', unit: '%', default: 70, max: 100, typical: [40, 85] },
    ],
    compute: (v) => {
      const r = pumpPowerSI({ flowM3h: v.q, headM: v.h, density: v.rho, effPct: v.eff })
      return { primary: { label: 'Shaft power', value: r.values.shaftKw, unit: 'kW', digits: 2 }, outputs: [{ label: 'Hydraulic power', value: r.values.hydraulicKw, unit: 'kW', digits: 2 }], steps: r.steps, warnings: r.warnings }
    },
  },
  {
    id: 'pumpeff',
    category: 'pumping',
    title: 'Pump efficiency',
    purpose: 'Efficiency from measured flow, head and brake horsepower.',
    source: 'MPOB Pocketbook p.13',
    formula: ['E (%) = WHP / BHP × 100'],
    inputs: [
      gallonOpt,
      { key: 'gpm', label: 'Flow', unit: 'gal/min', default: 100 },
      { key: 'head', label: 'Total head', unit: 'ft', default: 50 },
      { key: 'bhp', label: 'Measured BHP', unit: 'hp', default: 2.16 },
    ],
    compute: (v) => {
      const r = pumpEfficiency({ gpm: v.gpm, headFt: v.head, bhp: v.bhp, gallon: gallon(v.gallon) })
      return { primary: { label: 'Pump efficiency', value: r.values.effPct, unit: '%', digits: 1 }, outputs: [{ label: 'Water horsepower', value: r.values.whp, unit: 'hp', digits: 2 }], steps: r.steps, warnings: r.warnings }
    },
  },
  // ---------- Cost ----------
  {
    id: 'cost',
    category: 'cost',
    title: 'Production cost',
    purpose: 'Processing cost per tonne FFB and per year, by mill capacity.',
    source: 'MPOB Pocketbook p.40 [REVIEW: PLACEHOLDER figures]',
    formula: ['RM/t at capacity = linear interpolation between 20, 30, 45, 60 t/h', 'Annual cost = RM/t × capacity × hours/year'],
    inputs: [capacity, { key: 'hours', label: 'Operating hours per year', unit: 'h', default: 6000, typical: [3000, 8000] }],
    compute: (v) => {
      const r = productionCost({ capacityTph: v.capacityTph, hoursPerYear: v.hours })
      return {
        primary: { label: 'Cost per tonne FFB', value: r.values.totalRmPerT, unit: 'RM/t', digits: 2 },
        outputs: [{ label: 'Annual FFB', value: r.values.annualFfbT, unit: 't' }, { label: 'Annual cost', value: r.values.annualCostRm, unit: 'RM' }],
        steps: r.steps,
        warnings: r.warnings,
        data: r.values,
      }
    },
    Extra: CostExtra,
  },
]

export const getCalculator = (id: string) => CALCULATORS.find((c) => c.id === id)

/** Default input values, with Project mode values applied where an input is linked to the project. */
export function initialValues(def: CalcDef, project: Record<string, unknown> | null): Record<string, number> {
  const v: Record<string, number> = {}
  for (const i of def.inputs) {
    const p = i.project && project ? (project[i.project] as number | undefined) : undefined
    v[i.key] = typeof p === 'number' && Number.isFinite(p) ? p : i.default
  }
  return v
}
