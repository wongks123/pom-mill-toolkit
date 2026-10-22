import { Link } from 'react-router-dom'
import { CALCULATORS } from '../calculators/registry'
import { CATEGORIES } from '../calculators/types'

export default function Calculators() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-palm-900">Calculators</h1>
      {CATEGORIES.map((cat) => (
        <section key={cat.id}>
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><span>{cat.icon}</span>{cat.name}</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CALCULATORS.filter((c) => c.category === cat.id).map((c) => (
              <Link key={c.id} to={`/calc/${c.id}`} className="rounded-lg bg-white p-3 shadow-sm hover:bg-palm-50">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{c.title}</span>
                  {c.corrected && <span className="shrink-0 rounded bg-fruit-100 px-1.5 text-[10px] font-semibold text-orange-800">CORRECTED</span>}
                </div>
                <p className="text-xs text-stone-500">{c.purpose}</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
