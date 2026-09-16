import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSprache } from './i18n'

/* Wischen zum Blaettern.
 *
 * Nach rechts wischen geht zurueck, nach links wischen geht vorwaerts, so
 * wie man in einer Akte blaettert. Im arabischen Satz ist es gespiegelt:
 * dort fuehrt das Wischen nach links zurueck.
 *
 * Das ist Bedienung, keine Optik. Darum liegt es in lib und nicht in
 * design. Wer die Designschicht loescht, behaelt das Wischen.
 *
 * Drei Dinge halten die Geste aus dem Weg:
 *  - Sie zaehlt nur auf Geraeten mit Finger.
 *  - Sie beginnt nicht am aeussersten Rand. Dort liegt schon die eigene
 *    Zurueck-Geste des Browsers, sonst wuerde zweimal geblaettert.
 *  - Sie zaehlt nicht ueber Eingaben, Bildern zum Ziehen, Listen die
 *    selbst quer scrollen, und nicht, solange ein Dialog offen ist.
 */

/** Wie weit vom Bildschirmrand die Geste NICHT beginnen darf. Dort liegt
 *  die Zurueck-Geste des Browsers. */
const RAND_TABU = 28
/** Kuerzere Wege sind ein Tippen oder ein Verrutschen, kein Wischen. */
const WEG_MINDESTENS = 90
/** Der Weg muss eindeutig quer sein, sonst ist es Scrollen. */
const QUER_FAKTOR = 1.6
/** Langsames Ziehen ueber Sekunden ist kein Blaettern. */
const DAUER_MAX = 800

/** Gehoert die Geste einem Element auf der Seite statt dem Blaettern? */
function gehoertAnderem(ziel: EventTarget | null): boolean {
  if (!(ziel instanceof Element)) return false
  if (
    ziel.closest(
      'input, textarea, select, button, a, audio, video, canvas, [contenteditable="true"], [draggable="true"]',
    )
  ) {
    return true
  }
  let el: Element | null = ziel
  while (el && el !== document.body) {
    if (el.scrollWidth > el.clientWidth + 4) {
      const quer = getComputedStyle(el).overflowX
      if (quer === 'auto' || quer === 'scroll') return true
    }
    el = el.parentElement
  }
  return false
}

/** Ist gerade ein Dialog offen? Dann wird nicht geblaettert, sonst
 *  verschwindet die Seite unter dem offenen Fenster. */
function dialogOffen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null
}

/**
 * Wischen zum Zurueck- und Vorwaertsblaettern einschalten.
 * @param aktiv  Auf false bleibt alles aus, etwa im Chat, wo quer gewischt
 *               schon etwas anderes bedeutet.
 */
export function useWischen(aktiv = true): void {
  const nav = useNavigate()
  const { rtl } = useSprache()

  useEffect(() => {
    if (!aktiv) return
    // Nur wo wirklich ein Finger auf dem Glas liegt.
    if (!window.matchMedia('(pointer: coarse)').matches) return

    let startX = 0
    let startY = 0
    let startZeit = 0
    let zaehlt = false

    const anfang = (e: TouchEvent) => {
      zaehlt = false
      if (e.touches.length !== 1) return
      const p = e.touches[0]
      if (p.clientX < RAND_TABU || p.clientX > window.innerWidth - RAND_TABU) return
      if (dialogOffen()) return
      if (gehoertAnderem(e.target)) return
      startX = p.clientX
      startY = p.clientY
      startZeit = Date.now()
      zaehlt = true
    }

    const ende = (e: TouchEvent) => {
      if (!zaehlt) return
      zaehlt = false
      const p = e.changedTouches[0]
      if (!p) return
      if (Date.now() - startZeit > DAUER_MAX) return
      const dx = p.clientX - startX
      const dy = p.clientY - startY
      if (Math.abs(dx) < WEG_MINDESTENS) return
      if (Math.abs(dx) < Math.abs(dy) * QUER_FAKTOR) return
      if (dialogOffen()) return
      // Nach rechts wischen heisst zurueck. Auf Arabisch gespiegelt.
      const zurueck = rtl ? dx < 0 : dx > 0
      nav(zurueck ? -1 : 1)
    }

    const abbruch = () => {
      zaehlt = false
    }

    document.addEventListener('touchstart', anfang, { passive: true })
    document.addEventListener('touchend', ende, { passive: true })
    document.addEventListener('touchcancel', abbruch, { passive: true })
    return () => {
      document.removeEventListener('touchstart', anfang)
      document.removeEventListener('touchend', ende)
      document.removeEventListener('touchcancel', abbruch)
    }
  }, [aktiv, nav, rtl])
}
