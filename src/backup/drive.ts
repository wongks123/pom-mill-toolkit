// Google Drive backup from the browser, using Google Identity Services.
// Scope drive.file only lets the app see files it created itself.

export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
export const DRIVE_FOLDER = 'iTake Academy Backups'
const SCOPE = 'https://www.googleapis.com/auth/drive.file'
const API = 'https://www.googleapis.com/drive/v3'

interface TokenResponse { access_token?: string; expires_in?: number; error?: string; error_description?: string }
interface TokenClient { requestAccessToken: (o?: { prompt?: string }) => void; callback: (r: TokenResponse) => void }
declare global {
  interface Window {
    google?: { accounts: { oauth2: { initTokenClient: (c: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { message?: string }) => void }) => TokenClient } } }
  }
}

export interface DriveFile { id: string; name: string; createdTime: string; size?: string }

let gis: Promise<void> | null = null
let token: { value: string; expires: number } | null = null

function loadGis(): Promise<void> {
  gis ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      gis = null
      reject(new Error('Could not reach Google. Check your internet connection.'))
    }
    document.head.appendChild(s)
  })
  return gis
}

async function getToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) throw new Error('Google Drive backup is not set up yet (no Google OAuth client ID).')
  if (token && token.expires > Date.now() + 60_000) return token.value
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPE,
      callback: (r) => {
        if (r.error || !r.access_token) return reject(new Error(r.error_description || r.error || 'Google sign-in failed'))
        token = { value: r.access_token, expires: Date.now() + (r.expires_in ?? 3600) * 1000 }
        resolve(r.access_token)
      },
      error_callback: (e) => reject(new Error(e.message === 'popup_closed' ? 'Google sign-in was closed' : `Google sign-in failed: ${e.message ?? 'unknown error'}`)),
    })
    client.requestAccessToken({ prompt: token ? '' : 'consent' })
  })
}

async function call<T>(url: string, init: RequestInit = {}): Promise<T> {
  const t = await getToken()
  const res = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${t}` } })
  if (res.status === 401) token = null
  if (!res.ok) throw new Error(`Google Drive error ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json() as Promise<T>
}

async function folderId(): Promise<string> {
  const q = encodeURIComponent(`name='${DRIVE_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const found = await call<{ files: { id: string }[] }>(`${API}/files?q=${q}&fields=files(id)&spaces=drive`)
  if (found.files.length) return found.files[0].id
  const created = await call<{ id: string }>(`${API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
  })
  return created.id
}

/** Uploads a file into the backup folder; returns the new file. */
export async function uploadToDrive(name: string, blob: Blob): Promise<DriveFile> {
  const parent = await folderId()
  const body = new FormData()
  body.append('metadata', new Blob([JSON.stringify({ name, parents: [parent] })], { type: 'application/json' }))
  body.append('file', blob)
  return call<DriveFile>('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,size', { method: 'POST', body })
}

export async function listDriveBackups(): Promise<DriveFile[]> {
  const parent = await folderId()
  const q = encodeURIComponent(`'${parent}' in parents and trashed=false and name contains '.json'`)
  const r = await call<{ files: DriveFile[] }>(`${API}/files?q=${q}&orderBy=createdTime desc&pageSize=50&fields=files(id,name,createdTime,size)`)
  return r.files
}

export async function readDriveFile(id: string): Promise<string> {
  const t = await getToken()
  const res = await fetch(`${API}/files/${id}?alt=media`, { headers: { Authorization: `Bearer ${t}` } })
  if (!res.ok) throw new Error(`Google Drive error ${res.status}`)
  return res.text()
}
