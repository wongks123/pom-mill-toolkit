import type { CalcDef, CalcOutput } from '../calculators/types'
import { fmt } from '../components/format'

/** A frozen copy of one calculator run: enough to reload it and to print it, even if the calculator changes later. */
export interface CalcSnapshot {
  calcId: string
  title: string
  source: string
  corrected?: boolean
  formula: string[]
  /** Raw numeric inputs, used to reopen the run in the calculator. */
  inputs: Record<string, number>
  inputLines: [string, string][]
  primary: [string, string]
  outputs: [string, string][]
  steps: { label: string; formula: string; value: string }[]
  warnings: string[]
  /** Free-text lines such as the drive selection of the conveyor calculator. */
  notes?: [string, string][]
  projectName?: string
  createdAt: string
}

export interface HistoryEntry extends CalcSnapshot {
  id: string
  note?: string
}

const withUnit = (v: string, unit?: string) => (unit ? `${v} ${unit}` : v)

export function makeSnapshot(def: CalcDef, values: Record<string, number>, out: CalcOutput, projectName?: string): CalcSnapshot {
  const visible = def.inputs.filter((i) => !i.showIf || i.showIf(values))
  const data = out.data as { values?: { gearbox?: string } } | undefined
  return {
    calcId: def.id,
    title: def.title,
    source: def.source,
    corrected: def.corrected,
    formula: def.formula,
    inputs: Object.fromEntries(def.inputs.map((i) => [i.key, values[i.key]])),
    inputLines: visible.map((i) => [i.label, i.options ? (i.options.find((o) => o.value === values[i.key])?.label ?? String(values[i.key])) : withUnit(String(values[i.key]), i.unit)]),
    primary: [out.primary.label, withUnit(fmt(out.primary.value, out.primary.digits), out.primary.unit)],
    outputs: out.outputs.map((o) => [o.label, withUnit(fmt(o.value, o.digits), o.unit)]),
    steps: out.steps.map((s) => ({ label: s.label, formula: s.formula, value: withUnit(fmt(s.value), s.unit) })),
    warnings: out.warnings,
    notes: data?.values?.gearbox ? [['Gearbox size / model', data.values.gearbox]] : undefined,
    projectName,
    createdAt: new Date().toISOString(),
  }
}
