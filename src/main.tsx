import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { ProjectProvider } from './project/ProjectContext'
import './index.css'

registerSW({
  immediate: true,
  // Look for a new version whenever the app comes back to the foreground, and hourly while open,
  // so a home-screen install does not keep serving an old offline copy.
  onRegisteredSW(_url, reg) {
    if (!reg) return
    const check = () => reg.update().catch(() => undefined)
    setInterval(check, 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ProjectProvider>
        <App />
      </ProjectProvider>
    </HashRouter>
  </StrictMode>,
)
