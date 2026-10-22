import { NavLink, Outlet, Link } from 'react-router-dom'
import { useProject } from '../project/ProjectContext'

const TABS = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/learn', label: 'Learn', icon: '📘' },
  { to: '/calc', label: 'Calculate', icon: '🧮' },
  { to: '/reference', label: 'Reference', icon: '📋' },
  { to: '/convert', label: 'Convert', icon: '⇄' },
]

export function Layout() {
  const { project } = useProject()
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="no-print sticky top-0 z-40 bg-palm-900 text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <img src="./icon.svg" alt="" className="h-7 w-7" />
            <span>PEPC Mill Toolkit</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `rounded px-3 py-1.5 text-sm ${isActive ? 'bg-palm-700' : 'hover:bg-palm-800'}`}>
                {t.label}
              </NavLink>
            ))}
          </nav>
          <Link to="/project" className="shrink-0 rounded-full bg-palm-700 px-3 py-1 text-xs">
            {project ? `📐 ${project.name} · ${project.capacityTph} t/h` : 'Project mode'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>

      <footer className="no-print mx-auto max-w-5xl px-4 pb-6 text-center text-xs text-stone-500">
        Based on the MPOB Palm Oil Mill Pocketbook, with known errata corrected. <Link to="/about" className="underline">About & errata</Link>
      </footer>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-stone-200 bg-white md:hidden">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `flex flex-col items-center py-2 text-[11px] ${isActive ? 'text-palm-700 font-semibold' : 'text-stone-500'}`}>
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
