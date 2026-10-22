import type { FC } from 'react'
import type { Step } from '../engine/types'
import type { ProjectKey } from '../project/ProjectContext'

export interface InputDef {
  key: string
  label: string
  unit?: string
  default: number
  hint?: string
  /** Typical mill range; values outside it give a warning, not an error. */
  typical?: [number, number]
  allowZero?: boolean
  max?: number
  step?: number
  options?: { value: number; label: string }[]
  /** Prefilled from Project mode when a project is active. */
  project?: ProjectKey
  /** Shown (and validated) only when this returns true for the current values. */
  showIf?: (v: Record<string, number>) => boolean
}

export interface OutputDef {
  label: string
  value: number
  unit: string
  digits?: number
}

export interface CalcOutput {
  primary: OutputDef
  outputs: OutputDef[]
  steps: Step[]
  warnings: string[]
  data?: unknown
}

export type Category = 'process' | 'steam' | 'mechanical' | 'electrical' | 'pumping' | 'cost'

export interface CalcDef {
  id: string
  category: Category
  title: string
  purpose: string
  source: string
  corrected?: boolean
  formula: string[]
  inputs: InputDef[]
  compute: (v: Record<string, number>) => CalcOutput
  Extra?: FC<{ values: Record<string, number>; out: CalcOutput }>
  /** Included in the Mill Design Summary. */
  sizing?: boolean
}

export const CATEGORIES: { id: Category; name: string; icon: string }[] = [
  { id: 'process', name: 'Process', icon: '⚗️' },
  { id: 'steam', name: 'Steam', icon: '♨️' },
  { id: 'mechanical', name: 'Mechanical', icon: '⚙️' },
  { id: 'electrical', name: 'Electrical', icon: '⚡' },
  { id: 'pumping', name: 'Pumping', icon: '💧' },
  { id: 'cost', name: 'Cost', icon: 'RM' },
]
