import type { Project, ReportItem } from '../project/ProjectContext'
import type { HistoryEntry } from '../report/snapshot'

export interface BackupFile {
  app: 'itake-academy'
  version: 1
  exportedAt: string
  project: Project | null
  report: ReportItem[]
  history: HistoryEntry[]
}

export function buildBackup(project: Project | null, report: ReportItem[], history: HistoryEntry[]): BackupFile {
  return { app: 'itake-academy', version: 1, exportedAt: new Date().toISOString(), project, report, history }
}

/** Accepts a full backup, or an older project export ({ project, report }). */
export function parseBackup(text: string): BackupFile {
  const d = JSON.parse(text)
  if (!d || typeof d !== 'object') throw new Error('Not a backup file')
  if (d.app !== undefined && d.app !== 'itake-academy') throw new Error('This file is not an iTake Academy backup')
  if (!('project' in d) && !Array.isArray(d.history)) throw new Error('Not a backup file')
  return {
    app: 'itake-academy',
    version: 1,
    exportedAt: typeof d.exportedAt === 'string' ? d.exportedAt : new Date().toISOString(),
    project: d.project ?? null,
    report: Array.isArray(d.report) ? d.report : [],
    history: Array.isArray(d.history) ? d.history.filter((h: HistoryEntry) => h && h.id && h.calcId && h.createdAt) : [],
  }
}

export function backupFilename(d = new Date()) {
  const p = (x: number) => String(x).padStart(2, '0')
  return `iTake-Academy-backup_${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.json`
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}
