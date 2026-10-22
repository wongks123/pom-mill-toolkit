import { Link } from 'react-router-dom'
import data from '../data/oilLosses.json'
import { ReviewBadge } from '../components/ReviewBadge'

export default function OilLosses() {
  const max = Math.max(...data.streams.map((s) => s.benchmarkLossPct))
  const total = data.streams.reduce((a, s) => a + s.benchmarkLossPct, 0)
  return (
    <div className="space-y-4">
      <Link to="/learn" className="text-sm text-palm-700">← Learn</Link>
      <h1 className="text-2xl font-bold text-palm-900">Oil losses: where and how much</h1>
      <p className="text-stone-600">
        Every tonne of FFB carries more oil than the mill recovers. The rest leaves with the by-products. A loss is worked out as
        <b> oil in the product × product to FFB</b>. For example, EFB with 2.7% oil that is 22% of FFB loses about 0.59% of FFB as oil.
      </p>
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><ReviewBadge /> {data.source}</p>
      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        {data.streams.map((s) => (
          <div key={s.id}>
            <div className="flex justify-between text-sm"><span className="font-medium">{s.name}</span><span className="num">{s.benchmarkLossPct}% FFB</span></div>
            <div className="mt-1 h-3 rounded bg-stone-100"><div className="h-3 rounded bg-fruit-500" style={{ width: `${(s.benchmarkLossPct / max) * 100}%` }} /></div>
            <div className="text-xs text-stone-500">{s.oilInProductPct}% oil in product × {s.productToFfbPct}% of FFB</div>
          </div>
        ))}
        <div className="border-t border-stone-200 pt-2 text-right font-semibold">Benchmark total ≈ {total.toFixed(2)}% FFB</div>
      </section>
      <section className="rounded-xl bg-white p-4 text-sm shadow-sm">
        <h2 className="mb-1 font-semibold">Why it matters</h2>
        <p>At 45 t/h and 6,000 h a year, each 0.1% FFB of extra oil loss is 270 t of CPO a year.</p>
      </section>
      <Link to="/calc/oilloss" className="inline-block rounded-lg bg-palm-700 px-4 py-2 text-white">Check your mill's losses</Link>
    </div>
  )
}
