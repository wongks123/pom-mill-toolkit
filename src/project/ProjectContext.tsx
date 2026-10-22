import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import type { CalcSnapshot, HistoryEntry } from '../report/snapshot'

export interface Project {
  name: string
  capacityTph: number
  fruitRatio: number
  fibreRatio: number
  nutRatio: number
  dcoRatio: number
  steamDemand: number
}

export type ProjectKey = Exclude<keyof Project, 'name'>

export const DEFAULT_PROJECT: Project = {
  name: 'My mill',
  capacityTph: 45,
  fruitRatio: 0.6,
  fibreRatio: 0.19,
  nutRatio: 0.12,
  dcoRatio: 0.65,
  steamDemand: 272.5,
}

export interface ReportItem {
  id: string
  calcId: string
  title: string
  primary: string
  lines: string[]
  addedAt: string
}

interface ProjectState {
  project: Project | null
  setProject: (p: Project | null) => void
  report: ReportItem[]
  addToReport: (item: Omit<ReportItem, 'id' | 'addedAt'>) => void
  removeFromReport: (id: string) => void
  clearReport: () => void
  history: HistoryEntry[]
  addHistory: (s: CalcSnapshot, note?: string) => HistoryEntry
  removeHistory: (id: string) => void
  /** Replaces project and report, and merges history by id (backup restore). */
  restore: (d: { project: Project | null; report: ReportItem[]; history: HistoryEntry[] }) => number
}

const Ctx = createContext<ProjectState | null>(null)

function load<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable (private mode); state still works for this session
  }
}

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<Project | null>(() => load('pepc.project', null))
  const [report, setReport] = useState<ReportItem[]>(() => load('pepc.report', []))
  const [history, setHistory] = useState<HistoryEntry[]>(() => load('pepc.history', []))

  useEffect(() => save('pepc.project', project), [project])
  useEffect(() => save('pepc.report', report), [report])
  useEffect(() => save('pepc.history', history), [history])

  const value: ProjectState = {
    project,
    setProject,
    report,
    addToReport: (item) =>
      setReport((r) => [...r, { ...item, id: Math.random().toString(36).slice(2), addedAt: new Date().toISOString() }]),
    removeFromReport: (id) => setReport((r) => r.filter((x) => x.id !== id)),
    clearReport: () => setReport([]),
    history,
    addHistory: (snap, note) => {
      const entry: HistoryEntry = { ...snap, id: Math.random().toString(36).slice(2), note: note?.trim() || undefined }
      setHistory((h) => [entry, ...h])
      return entry
    },
    removeHistory: (id) => setHistory((h) => h.filter((x) => x.id !== id)),
    restore: (d) => {
      setProject(d.project)
      setReport(d.report)
      const known = new Set(history.map((x) => x.id))
      const added = d.history.filter((x) => !known.has(x.id))
      setHistory([...history, ...added].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
      return added.length
    },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useProject() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useProject outside ProjectProvider')
  return c
}
