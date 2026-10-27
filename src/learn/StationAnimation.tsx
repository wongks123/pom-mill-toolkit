import { useEffect, useRef, useState } from 'react'
import { ILLUSTRATIONS } from './illustrations'

const STEP_MS = 5000

function prefersReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/** Animated station drawing tied to the "How it works" steps: numbered markers, highlight and caption. */
export function StationAnimation({ stationId, steps }: { stationId: string; steps: string[] }) {
  const ill = ILLUSTRATIONS[stationId]
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(() => !prefersReducedMotion())
  const svgRef = useRef<SVGSVGElement>(null)
  const n = Math.min(steps.length, ill?.areas.length ?? 0)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    if (playing) svg.unpauseAnimations()
    else svg.pauseAnimations()
  }, [playing])

  useEffect(() => {
    if (!playing || n === 0) return
    const t = setTimeout(() => setStep((s) => (s + 1) % n), STEP_MS)
    return () => clearTimeout(t)
  }, [playing, step, n])

  if (!ill) {
    return (
      <ol className="list-decimal space-y-1 pl-5 text-stone-700">
        {steps.map((h, k) => <li key={k}>{h}</li>)}
      </ol>
    )
  }

  const [ax, ay, aw, ah] = ill.areas[step]
  const go = (k: number) => setStep(((k % n) + n) % n)

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-stone-200 bg-gradient-to-b from-white to-palm-50">
        <svg ref={svgRef} viewBox={`0 0 360 ${ill.height ?? 220}`} className="block w-full" role="img" aria-label={`Animated drawing. Step ${step + 1}: ${steps[step]}`}>
          <ill.Art />
          <rect key={step} x={ax} y={ay} width={aw} height={ah} rx="10" fill="#ea580c" fillOpacity="0.08" stroke="#ea580c" strokeWidth="2" strokeDasharray="6 4">
            <animate attributeName="stroke-dashoffset" from="20" to="0" dur="1s" repeatCount="indefinite" />
          </rect>
          {ill.areas.slice(0, n).map(([x, y], k) => {
            const [bx, by] = ill.badges?.[k] ?? [x + 9, y + 9]
            return (
              <g key={k} role="button" tabIndex={0} aria-label={`Step ${k + 1}`} onClick={() => go(k)} onKeyDown={(e) => e.key === 'Enter' && go(k)} className="cursor-pointer">
                <circle cx={bx} cy={by} r={k === step ? 9 : 7.5} fill={k === step ? '#ea580c' : '#15803d'} stroke="#fff" strokeWidth="1.5" />
                <text x={bx} y={by + 3.5} fontSize="10" fontWeight="bold" textAnchor="middle" fill="#fff">{k + 1}</text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => go(step - 1)} aria-label="Previous step" className="h-9 w-9 shrink-0 rounded-full border border-stone-300 bg-white text-stone-700">‹</button>
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} className="h-9 w-9 shrink-0 rounded-full bg-palm-700 text-white">{playing ? '❚❚' : '▶'}</button>
        <button onClick={() => go(step + 1)} aria-label="Next step" className="h-9 w-9 shrink-0 rounded-full border border-stone-300 bg-white text-stone-700">›</button>
        <div className="flex flex-1 justify-end gap-1.5">
          {Array.from({ length: n }, (_, k) => (
            <button key={k} onClick={() => go(k)} aria-label={`Go to step ${k + 1}`} className={`h-2.5 rounded-full transition-all ${k === step ? 'w-6 bg-fruit-500' : 'w-2.5 bg-stone-300'}`} />
          ))}
        </div>
      </div>

      <ol className="space-y-1.5">
        {steps.map((h, k) => (
          <li key={k}>
            <button onClick={() => go(k)} className={`flex w-full gap-2 rounded-lg p-2 text-left text-sm transition-colors ${k === step ? 'bg-fruit-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}>
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${k === step ? 'bg-fruit-500' : 'bg-palm-700'}`}>{k + 1}</span>
              <span>{h}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}
