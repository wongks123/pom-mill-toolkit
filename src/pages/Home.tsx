import { Link } from 'react-router-dom'
import { CALCULATORS } from '../calculators/registry'

const CARDS = [
  { to: '/learn', icon: '📘', title: 'Learn', text: 'How a palm oil mill works, station by station, with quizzes.' },
  { to: '/calc', icon: '🧮', title: 'Calculate', text: `${CALCULATORS.length} sizing and process calculators with step-by-step working.` },
  { to: '/reference', icon: '📋', title: 'Reference tables', text: 'Densities, fatty acids, POME, limits and more. Searchable.' },
  { to: '/convert', icon: '⇄', title: 'Unit converter', text: 'mm↔inch, t/h↔kg/s, bar↔psi, °C↔°F and more.' },
  { to: '/project', icon: '📐', title: 'Project mode', text: 'Enter your mill capacity once; all calculators prefill. Print a design summary.' },
  { to: '/history', icon: '🕘', title: 'History & backup', text: 'Saved calculations, PDF reports on the iTake letterhead, and Google Drive backup.' },
  { to: '/learn/mass-balance', icon: '🔀', title: 'Mass balance', text: 'Where 1,000 kg of FFB ends up, as an interactive diagram.' },
]

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-palm-800 to-palm-900 p-6 text-white">
        <div className="mb-4 inline-block rounded-xl bg-white p-3">
          <img src="./itake-logo.png" alt="iTake – Provide innovative solutions, optimize beyond imagination" className="h-20 w-auto sm:h-24" />
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">Palm Oil Mill Toolkit</h1>
        <p className="mt-2 max-w-prose text-palm-100">
          Learn the process from FFB to CPO, and size mill equipment with calculators based on the MPOB Palm Oil Mill Pocketbook, with the known errata corrected.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/learn" className="rounded-lg bg-white px-4 py-2 font-semibold text-palm-900">Start learning</Link>
          <Link to="/calc" className="rounded-lg border border-white/50 px-4 py-2 font-semibold">Open calculators</Link>
        </div>
      </section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md">
            <div className="text-2xl">{c.icon}</div>
            <div className="mt-1 font-semibold">{c.title}</div>
            <p className="text-sm text-stone-600">{c.text}</p>
          </Link>
        ))}
      </div>
      <p className="text-center text-xs text-stone-500">Works offline once loaded. Add it to your home screen for use on the mill floor.</p>
    </div>
  )
}
