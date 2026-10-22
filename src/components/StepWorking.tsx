import type { Step } from '../engine/types'
import { fmt } from './format'

export function StepWorking({ steps }: { steps: Step[] }) {
  return (
    <details open className="rounded-xl bg-white p-4 shadow-sm">
      <summary className="cursor-pointer font-semibold">Step-by-step working</summary>
      <ol className="mt-2 space-y-2">
        {steps.map((s, k) => (
          <li key={k} className="flex gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-palm-100 text-xs font-bold text-palm-800">{k + 1}</span>
            <div className="min-w-0">
              <div className="font-medium">{s.label}</div>
              <div className="break-words font-mono text-xs text-stone-500">{s.formula}</div>
              <div className="num font-semibold text-palm-800">= {fmt(s.value)} {s.unit}</div>
            </div>
          </li>
        ))}
      </ol>
    </details>
  )
}
