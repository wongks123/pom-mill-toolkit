import { createContext, ReactNode, useContext, useEffect, useState } from 'react'

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

  useEffect(() => save('pepc.project', project), [project])
  useEffect(() => save('pepc.report', report), [report])

  const value: ProjectState = {
    project,
    setProject,
    report,
    addToReport: (item) =>
      setReport((r) => [...r, { ...item, id: Math.random().toString(36).slice(2), addedAt: new Date().toISOString() }]),
    removeFromReport: (id) => setReport((r) => r.filter((x) => x.id !== id)),
    clearReport: () => setReport([]),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useProject() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useProject outside ProjectProvider')
  return c
}
