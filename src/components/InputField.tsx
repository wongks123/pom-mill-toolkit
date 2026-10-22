import type { InputDef } from '../calculators/types'

export function validateInput(def: InputDef, raw: string): { error?: string; warning?: string } {
  if (def.options) return {}
  if (raw.trim() === '') return { error: 'Required' }
  const v = Number(raw)
  if (!Number.isFinite(v)) return { error: 'Not a number' }
  if (v < 0) return { error: 'Cannot be negative' }
  if (v === 0 && !def.allowZero) return { error: 'Must be greater than zero' }
  if (def.max !== undefined && v > def.max) return { error: `Maximum is ${def.max}` }
  if (def.typical && (v < def.typical[0] || v > def.typical[1])) {
    return { warning: `Outside typical range ${def.typical[0]}–${def.typical[1]}${def.unit ? ' ' + def.unit : ''}` }
  }
  return {}
}

interface Props {
  def: InputDef
  raw: string
  onChange: (raw: string) => void
  fromProject?: boolean
}

export function InputField({ def, raw, onChange, fromProject }: Props) {
  const { error, warning } = validateInput(def, raw)
  const id = `in-${def.key}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-stone-700">
          {def.label}
          {fromProject && <span className="ml-1 rounded bg-palm-100 px-1 text-[10px] text-palm-800" title="Prefilled from Project mode">project</span>}
        </span>
        {def.hint && <span className="text-right text-xs text-stone-400" title={def.hint}>ⓘ {def.hint}</span>}
      </label>
      <div className="flex">
        {def.options ? (
          <select id={id} value={raw} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base focus:border-palm-600 focus:outline-none">
            {def.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <>
            <input
              id={id}
              type="number"
              inputMode="decimal"
              step={def.step ?? 'any'}
              value={raw}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full min-w-0 border bg-white px-3 py-2.5 text-base focus:outline-none ${def.unit ? 'rounded-l-lg' : 'rounded-lg'} ${error ? 'border-red-500' : warning ? 'border-amber-400' : 'border-stone-300 focus:border-palm-600'}`}
            />
            {def.unit && <span className="flex shrink-0 items-center rounded-r-lg border border-l-0 border-stone-300 bg-stone-100 px-2.5 text-sm text-stone-600">{def.unit}</span>}
          </>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && warning && <p className="mt-1 text-xs text-amber-700">⚠ {warning}</p>}
    </div>
  )
}
