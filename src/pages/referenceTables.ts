import type { Table } from '../components/DataTable'
import bulkDensities from '../data/bulkDensities.json'
import cpoProperties from '../data/cpoProperties.json'
import fattyAcids from '../data/fattyAcids.json'
import pome from '../data/pomeCharacteristics.json'
import doe from '../data/doeLimits.json'
import misc from '../data/referenceMisc.json'
import oilLosses from '../data/oilLosses.json'
import pressCake from '../data/pressCakeTargets.json'
import steamTable from '../data/steamTable.json'
import pipeSizes from '../data/pipeSizes.json'
import startingMethods from '../data/startingMethods.json'
import cost from '../data/productionCost.json'
import conveyors from '../data/conveyors.json'
import pumpData from '../data/pumpSystem.json'

export const TABLES: Table[] = [
  { id: 'bulkDensities', ...bulkDensities },
  {
    id: 'pumpFluids', title: 'Mill fluids for pump sizing', source: pumpData.source, review: pumpData.review,
    columns: ['Fluid', 'Density (kg/m³)', 'Viscosity (mPa·s)', 'Vapour pressure (kPa abs)'],
    rows: pumpData.fluids.map((f) => [f.name, f.density, f.viscosity, f.vapourKPa]),
  },
  {
    id: 'fittingK', title: 'Pipe fitting loss coefficients (K)', source: pumpData.source, review: pumpData.review,
    columns: ['Fitting', 'K'],
    rows: [
      ['Tank entrance (suction)', pumpData.fittingK.entrance], ['Exit into tank (discharge)', pumpData.fittingK.exit], ['90° elbow', pumpData.fittingK.elbow90],
      ['Gate / ball valve (open)', pumpData.fittingK.gateValve], ['Check (non-return) valve', pumpData.fittingK.checkValve], ['Globe / control valve', pumpData.fittingK.globeValve],
      ...pumpData.fittingK.strainers.filter((x) => x.k > 0).map((x) => [x.name, x.k]),
      ...pumpData.pipeMaterials.map((m) => [`Roughness ε: ${m.name}`, `${m.roughnessMm} mm`]),
    ],
  },
  {
    id: 'scraperDesigns', title: 'Scraper bar conveyor designs', source: `${conveyors.scraperDesigns.source} ${conveyors.scraperDesigns.reviewNote}`, review: conveyors.scraperDesigns.review,
    columns: ['Common use', 'Inside width (mm)', 'Flight W × H (mm)', 'Standard drive sprocket (152.4 pitch)', 'Shaft Ø (mm)', 'Flights', 'Chain + flight mass (kg/m)'],
    rows: conveyors.scraperDesigns.designs.map((z) => [z.usage, z.insideMm, `${z.flightWidthMm} × ${z.flightHeightMm}`, `${z.sprocketTeeth}T (PCD ${(152.4 / Math.sin(Math.PI / z.sprocketTeeth)).toFixed(0)})`, z.shaftMm, z.flight, z.movingKgPerM]),
  },
  {
    id: 'screwSizes', title: 'Standard screw conveyor sizes', source: conveyors.screwSizes.source,
    columns: ['Ø conveyor (mm)', 'Pitch (mm)', 'Flight Ø D (mm)', 'Black pipe Ø N (mm)', 'Shaft Ø J/K (mm)', 'Trough width A (mm)'],
    rows: conveyors.screwSizes.sizes.map((z) => [z.size, z.pitchMm, z.flightMm, z.pipeMm, z.shaftMm, z.troughMm]),
  },
  {
    id: 'conveyorMaterials', title: conveyors.title, source: `${conveyors.source} ${conveyors.ffbRatioNote}`, review: conveyors.review,
    columns: ['Material', 'Share of FFB', 'Bulk density (t/m³)', 'Scraper μ', 'Screw λ', 'Screw fill φ', 'Belt surcharge (°)', 'Max belt incline (°)', 'Usual conveyors'],
    rows: conveyors.materials.map((m) => [m.name, m.ffbRatio, m.density, m.scraperMu, m.screwLambda, m.screwFill, m.surcharge, m.maxBeltIncline, m.suits.map((t) => conveyors.types.find((x) => x.id === t)?.name ?? t).join(', ')]),
  },
  { id: 'cpoProperties', ...cpoProperties },
  { id: 'fattyAcids', ...fattyAcids },
  ...misc.tables,
  { id: 'pome', ...pome },
  { id: 'doe', title: doe.title, source: doe.source, review: doe.review, columns: doe.columns, rows: doe.rows },
  {
    id: 'oilLosses', title: oilLosses.title, source: oilLosses.source, review: oilLosses.review,
    columns: ['Stream', 'Oil in product (%)', 'Product to FFB (%)', 'Benchmark loss (% FFB)'],
    rows: oilLosses.streams.map((s) => [s.name, s.oilInProductPct, s.productToFfbPct, s.benchmarkLossPct]),
  },
  {
    id: 'pressCake', title: pressCake.title, source: pressCake.source, review: pressCake.review,
    columns: ['Parameter', 'Target'],
    rows: pressCake.targets.map((t) => [t.name, `${t.min}–${t.max}${t.unit}`]),
  },
  {
    id: 'steam', title: steamTable.title, source: steamTable.source, review: steamTable.review,
    columns: ['Pressure (bar abs)', 'Temperature (°C)', 'Specific volume (m³/kg)'],
    rows: steamTable.rows.map((r) => [r.pAbsBar, r.tempC, r.vg]),
  },
  {
    id: 'pipes', title: pipeSizes.title, source: pipeSizes.source, review: pipeSizes.review,
    columns: ['NPS', 'DN', 'Internal diameter (mm)'],
    rows: pipeSizes.rows.map((r) => [r.nps, r.dn, r.idMm]),
  },
  {
    id: 'starting', title: startingMethods.title, source: startingMethods.source, review: startingMethods.review,
    columns: ['Method', 'Starting current (× FLC)', 'Starting torque'],
    rows: startingMethods.rows.map((r) => [r.method, r.multipleOfFlc, r.torque]),
  },
  {
    id: 'motorSpeed', title: 'Induction motor synchronous speed', source: 'N = 120 f / p (MPOB Pocketbook p.18)', review: false,
    columns: ['Poles', '50 Hz (rpm)', '60 Hz (rpm)', '4-pole 50 Hz full load (typ.)'],
    rows: [2, 4, 6, 8, 10, 12].map((p) => [p, 6000 / p, 7200 / p, p === 4 ? '1,440–1,480' : '']),
  },
  {
    id: 'cost', title: cost.title, source: cost.source, review: cost.review,
    columns: ['Category', ...cost.capacities.map((c) => `${c} t/h`)],
    rows: cost.categories.map((c) => [c.name, ...c.values]),
  },
]
