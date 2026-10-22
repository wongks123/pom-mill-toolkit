import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProject } from '../project/ProjectContext'
import { backupFilename, buildBackup, downloadBlob, parseBackup } from '../backup/backup'
import { DRIVE_FOLDER, GOOGLE_CLIENT_ID, listDriveBackups, readDriveFile, uploadToDrive, type DriveFile } from '../backup/drive'

const LAST_BACKUP = 'pepc.lastBackup'

function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_BACKUP)
  } catch {
    return null
  }
}

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export default function HistoryPage() {
  const { project, report, history, removeHistory, restore } = useProject()
  const [q, setQ] = useState('')
  const [calc, setCalc] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [driveFiles, setDriveFiles] = useState<DriveFile[] | null>(null)
  const [lastBackup, setLastBackup] = useState(readLast)

  const calcs = useMemo(() => [...new Map(history.map((h) => [h.calcId, h.title])).entries()], [history])
  const shown = history.filter((h) => {
    if (calc && h.calcId !== calc) return false
    const s = q.trim().toLowerCase()
    return !s || [h.title, h.note, h.projectName, h.primary.join(' ')].some((x) => x?.toLowerCase().includes(s))
  })

  const run = async (label: string, f: () => Promise<string | void>) => {
    setBusy(label)
    setMsg(null)
    try {
      const text = await f()
      if (text) setMsg({ ok: true, text })
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message })
    } finally {
      setBusy('')
    }
  }

  const pdf = (entries = shown) => run('pdf', async () => {
    const { downloadHistoryPdf, downloadCalcPdf } = await import('../report/pdf')
    if (entries.length === 1) await downloadCalcPdf(entries[0], entries[0].note)
    else await downloadHistoryPdf(entries)
  })

  const backupBlob = () => new Blob([JSON.stringify(buildBackup(project, report, history), null, 2)], { type: 'application/json' })

  const markBackedUp = () => {
    const now = new Date().toISOString()
    try {
      localStorage.setItem(LAST_BACKUP, now)
    } catch {
      // storage unavailable
    }
    setLastBackup(now)
  }

  const doRestore = (text: string, from: string) => {
    const b = parseBackup(text)
    if (!confirm(`Restore from ${from}?\n\nThe project and report will be replaced by the backup from ${when(b.exportedAt)}. History entries are merged; nothing in your current history is deleted.`)) return ''
    const added = restore(b)
    return `Restored. ${added} history entr${added === 1 ? 'y' : 'ies'} added.`
  }

  const btn = 'rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium disabled:opacity-40'
  const primaryBtn = 'rounded-lg bg-palm-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-40'

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-palm-900">History & backup</h1>
        <p className="text-stone-600">Calculations you save with "Save to history" are kept on this device. Download them as PDF reports on the iTake letterhead, and back them up to Google Drive.</p>
      </header>

      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Saved calculations ({history.length})</h2>
          <button disabled={!shown.length || !!busy} onClick={() => pdf()} className={primaryBtn}>
            {busy === 'pdf' ? 'Preparing PDF…' : `Download ${shown.length === history.length ? 'all' : shown.length} as PDF`}
          </button>
        </div>
        {history.length > 0 && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search note, project, result…" className="rounded-lg border border-stone-300 px-3 py-2" />
            <select value={calc} onChange={(e) => setCalc(e.target.value)} className="rounded-lg border border-stone-300 bg-white px-3 py-2">
              <option value="">All calculators</option>
              {calcs.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
            </select>
          </div>
        )}
        {history.length === 0 && (
          <p className="text-sm text-stone-500">Nothing saved yet. Open a <Link to="/calc" className="text-palm-700 underline">calculator</Link> and tap "Save to history".</p>
        )}
        <ul className="divide-y divide-stone-100">
          {shown.map((h) => (
            <li key={h.id} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="font-semibold">{h.title}</span>
                <span className="text-xs text-stone-500">{when(h.createdAt)}</span>
              </div>
              {(h.note || h.projectName) && <p className="text-sm text-stone-600">{[h.projectName, h.note].filter(Boolean).join(' – ')}</p>}
              <p className="num text-sm text-palm-800">{h.primary[0]}: <b>{h.primary[1]}</b></p>
              <div className="mt-1 flex gap-3 text-sm">
                <Link to={`/calc/${h.calcId}?from=${h.id}`} className="text-palm-700 underline">Open</Link>
                <button onClick={() => pdf([h])} disabled={!!busy} className="text-palm-700 underline disabled:opacity-40">PDF</button>
                <button onClick={() => confirm('Delete this saved calculation?') && removeHistory(h.id)} className="text-red-600 underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Google Drive backup</h2>
        <p className="text-sm text-stone-600">
          Saves your project, project report and history as a file in the <b>{DRIVE_FOLDER}</b> folder of your Google Drive. The app can only see files it created there.
          {lastBackup ? <> Last backup: <b>{when(lastBackup)}</b>.</> : <> Not backed up yet.</>}
        </p>
        {!GOOGLE_CLIENT_ID && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Google Drive backup is not switched on for this site yet: it needs a Google OAuth client ID. Until then, use "Download backup file" and keep the file in Drive yourself.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!GOOGLE_CLIENT_ID || !!busy}
            onClick={() => run('up', async () => {
              const f = await uploadToDrive(backupFilename(), backupBlob())
              markBackedUp()
              return `Backed up to Google Drive as ${f.name}.`
            })}
            className={primaryBtn}
          >
            {busy === 'up' ? 'Backing up…' : 'Back up to Google Drive'}
          </button>
          <button disabled={!GOOGLE_CLIENT_ID || !!busy} onClick={() => run('list', async () => { setDriveFiles(await listDriveBackups()) })} className={btn}>
            {busy === 'list' ? 'Loading…' : 'Restore from Google Drive'}
          </button>
        </div>
        {driveFiles && (
          <div className="rounded-lg border border-stone-200 p-2">
            {driveFiles.length === 0 ? <p className="text-sm text-stone-500">No backups found in Google Drive.</p> : (
              <ul className="divide-y divide-stone-100 text-sm">
                {driveFiles.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="min-w-0 truncate">{f.name}<span className="block text-xs text-stone-500">{when(f.createdTime)}</span></span>
                    <button disabled={!!busy} onClick={() => run('restore', async () => doRestore(await readDriveFile(f.id), f.name))} className={btn}>Restore</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <h3 className="pt-2 text-sm font-semibold">Backup file</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { downloadBlob(backupBlob(), backupFilename()); markBackedUp() }} className={btn}>Download backup file</button>
          <label className={`${btn} cursor-pointer`}>
            Restore from file
            <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) run('file', async () => doRestore(await f.text(), f.name))
            }} />
          </label>
        </div>
        {msg && <p className={`rounded-lg p-3 text-sm ${msg.ok ? 'bg-palm-50 text-palm-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}
      </section>
    </div>
  )
}
