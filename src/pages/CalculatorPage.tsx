import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getCalculator } from '../calculators/registry'
import { CalculatorShell } from '../components/CalculatorShell'
import NotFound from './NotFound'
import { useProject } from '../project/ProjectContext'

export default function CalculatorPage() {
  const { id = '' } = useParams()
  const def = getCalculator(id)
  const [params] = useSearchParams()
  const { history } = useProject()
  const from = params.get('from')
  const entry = from ? history.find((h) => h.id === from && h.calcId === id) : undefined
  if (!def) return <NotFound />
  return (
    <div className="space-y-3">
      <Link to="/calc" className="text-sm text-palm-700">← All calculators</Link>
      {entry && <p className="rounded-lg bg-palm-50 p-2 text-sm text-palm-800">Reopened from history: {new Date(entry.createdAt).toLocaleString()}{entry.note ? ` – ${entry.note}` : ''}</p>}
      <CalculatorShell key={`${def.id}-${entry?.id ?? ''}`} def={def} initial={entry ? { inputs: entry.inputs, note: entry.note } : undefined} />
    </div>
  )
}
