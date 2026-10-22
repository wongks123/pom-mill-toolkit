import { Link } from 'react-router-dom'
import doe from '../data/doeLimits.json'
import pome from '../data/pomeCharacteristics.json'
import { DataTable } from '../components/DataTable'

export default function Environment() {
  return (
    <div className="space-y-4">
      <Link to="/learn" className="text-sm text-palm-700">← Learn</Link>
      <h1 className="text-2xl font-bold text-palm-900">Environment: DOE limits and biogas</h1>
      <p className="text-stone-600">A mill makes about 0.6–0.7 m³ of POME per tonne of FFB. Raw POME is around 250 times stronger (BOD) than the discharge limit, so treatment is a major part of the mill.</p>
      <DataTable table={{ id: 'pome', ...pome }} />
      <DataTable table={{ id: 'doe', title: doe.title, source: doe.source, review: doe.review, columns: doe.columns, rows: doe.rows }} />
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Biogas rules and practice</h2>
        <ul className="list-disc space-y-1 pl-5 text-stone-700">
          {doe.biogas.map((b, k) => <li key={k}>{b}</li>)}
        </ul>
      </section>
      <Link to="/learn/station/effluent" className="inline-block text-sm text-palm-700 underline">Effluent treatment station →</Link>
    </div>
  )
}
