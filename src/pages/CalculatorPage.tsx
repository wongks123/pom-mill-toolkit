import { Link, useParams } from 'react-router-dom'
import { getCalculator } from '../calculators/registry'
import { CalculatorShell } from '../components/CalculatorShell'
import NotFound from './NotFound'

export default function CalculatorPage() {
  const { id = '' } = useParams()
  const def = getCalculator(id)
  if (!def) return <NotFound />
  return (
    <div className="space-y-3">
      <Link to="/calc" className="text-sm text-palm-700">← All calculators</Link>
      <CalculatorShell key={def.id} def={def} />
    </div>
  )
}
