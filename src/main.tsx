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

/* Bewegungsstufe genauso frueh setzen wie das Theme, sonst blitzt beim
   Start kurz die falsche Stufe auf.
   Die Stufen und der Schluessel stehen in src/design/motion.tsx. Hier steht
   absichtlich nur das Setzen des Attributs, damit der ganze Ordner
   src/design geloescht werden kann, ohne dass diese Datei bricht. */
try {
  const m = localStorage.getItem('kistly.motion')
  document.documentElement.dataset.motion = m === 'ruhig' || m === 'voll' ? m : 'normal'
} catch {
  document.documentElement.dataset.motion = 'normal'
}

/* Sprache und Leserichtung genauso frueh setzen wie Theme und Bewegung.
   Die Werte stehen in src/lib/i18n. Hier absichtlich nur das Setzen der
   Attribute, damit diese Datei nicht am Woerterbuch haengt. */
try {
  const gespeichert = localStorage.getItem('kistly.lang')
  const l =
    gespeichert === 'ar' || gespeichert === 'de'
      ? gespeichert
      : navigator.language?.toLowerCase().startsWith('ar')
        ? 'ar'
        : 'de'
  document.documentElement.lang = l
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
} catch {
  document.documentElement.lang = 'de'
  document.documentElement.dir = 'ltr'
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
