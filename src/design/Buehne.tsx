import { useEffect } from 'react'
import './buehne.css'

/* Der Hintergrund der Startseite.
 *
 * Reine Optik. Loescht man diese Datei und die eine Zeile <Buehne /> in
 * Landing.tsx, sieht die Seite schlicht aus und funktioniert unveraendert.
 *
 * Der Eindruck "der Hintergrund bleibt stehen, nur der Vordergrund wandert"
 * entsteht nicht durch Rechnerei, sondern weil die Schicht fest im Fenster
 * verankert ist (position: fixed in buehne.css). Die Scrollhoehe wird
 * zusaetzlich als Variable --sy gesetzt, damit einzelne Ebenen
 * unterschiedlich weit mitgehen und Tiefe entsteht. Faellt das aus, steht
 * alles still und es sieht trotzdem ordentlich aus.
 */
export function Buehne() {
  useEffect(() => {
    const el = document.documentElement
    // Bei "ruhig" wird gar nicht erst gemessen, damit kein Rechenaufwand
    // entsteht, den niemand sieht.
    if (el.dataset.motion === 'ruhig') {
      el.style.setProperty('--sy', '0')
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--sy', '0')
      return
    }

    let ticking = false
    const schreiben = () => {
      el.style.setProperty('--sy', String(window.scrollY))
      ticking = false
    }
    const beimScrollen = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(schreiben)
    }

    schreiben()
    window.addEventListener('scroll', beimScrollen, { passive: true })
    return () => {
      window.removeEventListener('scroll', beimScrollen)
      el.style.removeProperty('--sy')
    }
  }, [])

  return (
    <div className="buehne" aria-hidden="true">
      <div className="buehne-raster" />
      <div className="buehne-licht buehne-licht-1" />
      <div className="buehne-licht buehne-licht-2" />
      <div className="buehne-licht buehne-licht-3" />
      <div className="buehne-kiste buehne-kiste-1" />
      <div className="buehne-kiste buehne-kiste-2" />
      <div className="buehne-kiste buehne-kiste-3" />
    </div>
  )
}
