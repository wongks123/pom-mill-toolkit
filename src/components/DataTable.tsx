import { ReviewBadge } from './ReviewBadge'

export interface Table {
  id: string
  title: string
  source: string
  review?: boolean
  columns: string[]
  rows: (string | number)[][]
}

export function DataTable({ table, highlight }: { table: Table; highlight?: string }) {
  const q = highlight?.toLowerCase()
  return (
    <section className="print-break rounded-xl bg-white p-4 shadow-sm">
      <h3 className="flex flex-wrap items-center gap-2 font-semibold">
        {table.title} {table.review && <ReviewBadge />}
      </h3>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-left">
            <tr>{table.columns.map((c) => <th key={c} className="p-2 font-medium">{c}</th>)}</tr>
          </thead>
          <tbody>
            {table.rows.map((r, k) => {
              const hit = q && r.some((c) => String(c).toLowerCase().includes(q))
              return (
                <tr key={k} className={`border-t border-stone-200 ${hit ? 'bg-palm-100' : ''}`}>
                  {r.map((c, j) => <td key={j} className="num p-2">{typeof c === 'number' ? c.toLocaleString('en-US') : c}</td>)}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone-500">{table.source}</p>
    </section>
  )
}
