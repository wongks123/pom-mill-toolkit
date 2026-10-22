import { useState } from 'react'
import units from '../data/units.json'
import { convert, convertTemperature, TempUnit } from '../engine/units'
import { fmt } from '../components/format'

const QUICK = [
  { cat: 'length', from: 'mm', to: 'in', label: 'mm ↔ inch' },
  { cat: 'massflow', from: 'th', to: 'kgs', label: 't/h ↔ kg/s' },
  { cat: 'pressure', from: 'bar', to: 'psi', label: 'bar ↔ psi' },
  { cat: 'temp', from: 'C', to: 'F', label: '°C ↔ °F' },
]

const TEMP_UNITS = [{ id: 'C', name: '°C' }, { id: 'F', name: '°F' }, { id: 'K', name: 'K' }]

export default function Converter() {
  const [cat, setCat] = useState('length')
  const [from, setFrom] = useState('mm')
  const [to, setTo] = useState('in')
  const [val, setVal] = useState('100')

  const isTemp = cat === 'temp'
  const list = isTemp ? TEMP_UNITS : units.categories.find((c) => c.id === cat)!.units
  const v = Number(val)
  const ok = val.trim() !== '' && Number.isFinite(v)
  const result = ok ? (isTemp ? convertTemperature(v, from as TempUnit, to as TempUnit) : convert(cat, v, from, to)) : NaN

  const pickCat = (c: string) => {
    setCat(c)
    const l = c === 'temp' ? TEMP_UNITS : units.categories.find((x) => x.id === c)!.units
    setFrom(l[0].id)
    setTo(l[1].id)
  }

  const sel = 'w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5'
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-palm-900">Unit converter</h1>
      <div className="flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button key={q.label} onClick={() => { setCat(q.cat); setFrom(q.from); setTo(q.to) }} className="rounded-full bg-palm-700 px-3 py-1.5 text-sm text-white">{q.label}</button>
        ))}
      </div>
      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium">Quantity
          <select value={cat} onChange={(e) => pickCat(e.target.value)} className={sel}>
            {units.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="temp">Temperature</option>
          </select>
        </label>
        <label className="block text-sm font-medium">Value
          <input type="number" inputMode="decimal" value={val} onChange={(e) => setVal(e.target.value)} className={sel} />
        </label>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
          <label className="block text-sm font-medium">From
            <select value={from} onChange={(e) => setFrom(e.target.value)} className={sel}>{list.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          </label>
          <button onClick={() => { setFrom(to); setTo(from) }} className="mb-1 rounded-full bg-stone-100 px-3 py-2" aria-label="Swap units">⇄</button>
          <label className="block text-sm font-medium">To
            <select value={to} onChange={(e) => setTo(e.target.value)} className={sel}>{list.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>
          </label>
        </div>
      </section>
      <section className="rounded-xl bg-palm-900 p-4 text-white">
        <div className="text-sm text-palm-200">Result</div>
        <div className="num break-all text-3xl font-bold">{ok ? fmt(result, 6) : '—'} <span className="text-lg font-normal text-palm-200">{list.find((u) => u.id === to)?.name}</span></div>
      </section>
      <p className="text-xs text-stone-500">{units.source}</p>
    </div>
  )
}
