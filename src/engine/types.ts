/** One line of the step-by-step working shown to trainees. */
export interface Step {
  label: string
  formula: string
  value: number
  unit: string
}

export interface CalcResult<T> {
  values: T
  steps: Step[]
  warnings: string[]
}

export class InputError extends Error {}

/** Rejects zero, negative and non-finite values. */
export function requirePositive(inputs: Record<string, number>): void {
  for (const [name, v] of Object.entries(inputs)) {
    if (!Number.isFinite(v)) throw new InputError(`${name} must be a number`)
    if (v <= 0) throw new InputError(`${name} must be greater than zero`)
  }
}

/** Rejects negative and non-finite values; zero is allowed. */
export function requireNonNegative(inputs: Record<string, number>): void {
  for (const [name, v] of Object.entries(inputs)) {
    if (!Number.isFinite(v)) throw new InputError(`${name} must be a number`)
    if (v < 0) throw new InputError(`${name} cannot be negative`)
  }
}

export function requireFraction(inputs: Record<string, number>): void {
  for (const [name, v] of Object.entries(inputs)) {
    if (!(v > 0 && v <= 1)) throw new InputError(`${name} must be between 0 and 1`)
  }
}

export const G = 9.81
