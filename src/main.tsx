import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

/* Theme so frueh wie moeglich setzen, damit nichts weiss aufblitzt. */
try {
  const stored = localStorage.getItem('kistly.theme')
  const mode = stored ? (JSON.parse(stored) as string) : 'system'
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
} catch {
  /* kein Zugriff auf localStorage, dann eben helles Theme */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL || '/'
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .catch((err) => console.warn('[sw] Registrierung fehlgeschlagen:', err))
  })
}
