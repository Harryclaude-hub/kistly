import { useCallback, useEffect, useState } from 'react'
import { Gauge, Sparkles, Waves } from 'lucide-react'

/* Bewegungsstufe.
 * Reine Designschicht: setzt ein Attribut auf dem html-Element, sonst
 * nichts. Das Stylesheet buehne.css entscheidet, was bei welcher Stufe
 * passiert. Nimmt man diese Datei weg, faellt nur der Schalter weg, die
 * Seite bleibt auf der Standardstufe stehen und laeuft weiter.
 */

export type Stufe = 'ruhig' | 'normal' | 'voll'

const KEY = 'kistly.motion'
export const STUFEN: Stufe[] = ['ruhig', 'normal', 'voll']

export const STUFE_TEXT: Record<Stufe, { name: string; hinweis: string }> = {
  ruhig: { name: 'Ruhig', hinweis: 'Nichts bewegt sich. Schont den Akku.' },
  normal: {
    name: 'Normal',
    hinweis: 'Der Hintergrund steht fest, der Vordergrund scrollt darüber.',
  },
  voll: { name: 'Voll', hinweis: 'Dazu driftende Kisten und atmende Lichter.' },
}

export const STUFE_SYMBOL = { ruhig: Gauge, normal: Waves, voll: Sparkles }

function lesen(): Stufe {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'ruhig' || v === 'normal' || v === 'voll' ? v : 'normal'
  } catch {
    return 'normal'
  }
}

/** Setzt das Attribut. Wird auch frueh in main.tsx aufgerufen, damit beim
 *  Start nichts kurz in der falschen Stufe aufblitzt. */
export function stufeAnwenden(s: Stufe): void {
  document.documentElement.dataset.motion = s
}

export function useMotion(): { stufe: Stufe; setStufe: (s: Stufe) => void } {
  const [stufe, setState] = useState<Stufe>(() => lesen())

  useEffect(() => {
    stufeAnwenden(stufe)
  }, [stufe])

  const setStufe = useCallback((s: Stufe) => {
    setState(s)
    try {
      localStorage.setItem(KEY, s)
    } catch {
      /* privater Modus, dann gilt die Stufe eben nur fuer diesen Besuch */
    }
  }, [])

  return { stufe, setStufe }
}

/** Kleiner Schalter fuer die Kopfzeile der Startseite. */
export function MotionToggle() {
  const { stufe, setStufe } = useMotion()
  const Symbol = STUFE_SYMBOL[stufe]
  const naechste = STUFEN[(STUFEN.indexOf(stufe) + 1) % STUFEN.length]
  return (
    <button
      type="button"
      onClick={() => setStufe(naechste)}
      title={`Bewegung: ${STUFE_TEXT[stufe].name}. ${STUFE_TEXT[stufe].hinweis}`}
      aria-label={`Bewegung umschalten, aktuell ${STUFE_TEXT[stufe].name}`}
      className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-transparent px-3 text-[0.9375rem] font-bold text-ink transition hover:border-line hover:bg-raised active:scale-95"
    >
      <Symbol size={19} />
      <span className="hidden sm:inline">{STUFE_TEXT[stufe].name}</span>
    </button>
  )
}
