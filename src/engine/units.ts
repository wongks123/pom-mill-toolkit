import unitsData from '../data/units.json'

export type UnitCategory = (typeof unitsData.categories)[number]

/** Converts between two units of a linear category (factor = size of one unit in the base unit). */
export function convert(categoryId: string, value: number, fromId: string, toId: string): number {
  const cat = unitsData.categories.find((c) => c.id === categoryId)
  if (!cat) throw new Error(`Unknown category ${categoryId}`)
  const from = cat.units.find((u) => u.id === fromId)
  const to = cat.units.find((u) => u.id === toId)
  if (!from || !to) throw new Error('Unknown unit')
  return (value * from.factor) / to.factor
}

export type TempUnit = 'C' | 'F' | 'K'

export function convertTemperature(value: number, from: TempUnit, to: TempUnit): number {
  const c = from === 'C' ? value : from === 'F' ? ((value - 32) * 5) / 9 : value - 273.15
  return to === 'C' ? c : to === 'F' ? (c * 9) / 5 + 32 : c + 273.15
}

/** Gauge ↔ absolute pressure in bar. */
export const barGaugeToAbs = (bar: number) => bar + 1.01325
