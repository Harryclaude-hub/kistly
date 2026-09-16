import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { WOERTER } from './woerter'

/* Sprachen.
 *
 * Uebersetzt wird nur, was zum Programm gehoert: Knoepfe, Beschriftungen,
 * Hinweise, Fehlermeldungen. Was der Nutzer selbst eingetippt hat, also
 * Zimmernamen, Kistentitel, Notizen und Nachrichten, bleibt unveraendert
 * stehen. Seriennummern bleiben ebenfalls immer gleich und immer von links
 * nach rechts, auch im arabischen Satz.
 *
 * Fehlt ein Schluessel, wird der deutsche Text genommen und einmal in der
 * Konsole gemeldet. Es erscheint nie ein nackter Schluessel und nie eine
 * leere Stelle.
 */

export type Lang = 'de' | 'ar'
export const SPRACHEN: Lang[] = ['de', 'ar']
export const SPRACH_NAME: Record<Lang, string> = { de: 'Deutsch', ar: 'العربية' }
export const SPRACH_KUERZEL: Record<Lang, string> = { de: 'DE', ar: 'ع' }

const KEY = 'kistly.lang'
const gemeldet = new Set<string>()

export function richtungVon(lang: Lang): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr'
}

function lesen(): Lang {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'de' || v === 'ar') return v
    // Ohne gespeicherte Wahl entscheidet die Sprache des Geraets.
    return navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'de'
  } catch {
    return 'de'
  }
}

/* Die aktuelle Sprache auch ausserhalb von React verfuegbar halten.
 * Datenzugriff und Hilfsmodule sind keine Komponenten und koennen darum
 * keinen Hook benutzen, ihre Meldungen landen aber vor den Augen des
 * Nutzers. Geschrieben wird dieser Wert an genau einer Stelle. */
let aktuelleSprache: Lang = 'de'

/** Setzt Sprache und Leserichtung am html-Element. Wird auch frueh in
 *  main.tsx aufgerufen, damit beim Start nichts springt. */
export function spracheAnwenden(lang: Lang): void {
  aktuelleSprache = lang
  const el = document.documentElement
  el.lang = lang
  el.dir = richtungVon(lang)
}

/** Uebersetzt ausserhalb von React, etwa in api.ts. In Komponenten immer
 *  useT benutzen, nur das rendert bei einem Sprachwechsel neu. */
export function tg(key: string, vars?: Vars): string {
  return uebersetzen(aktuelleSprache, key, vars)
}

export type Vars = Record<string, string | number>

function einsetzen(text: string, vars?: Vars): string {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (ganz, name: string) =>
    name in vars ? String(vars[name]) : ganz,
  )
}

export function uebersetzen(lang: Lang, key: string, vars?: Vars): string {
  const eintrag = WOERTER[key]
  if (!eintrag) {
    if (!gemeldet.has(key)) {
      gemeldet.add(key)
      console.warn(`[sprache] Schluessel fehlt: ${key}`)
    }
    return einsetzen(key, vars)
  }
  const text = eintrag[lang] ?? eintrag.de
  if (!eintrag[lang] && !gemeldet.has(`${lang}:${key}`)) {
    gemeldet.add(`${lang}:${key}`)
    console.warn(`[sprache] ${lang} fehlt fuer: ${key}, nehme Deutsch`)
  }
  return einsetzen(text, vars)
}

interface SprachWert {
  lang: Lang
  setLang: (l: Lang) => void
  dir: 'ltr' | 'rtl'
  rtl: boolean
  t: (key: string, vars?: Vars) => string
  /** Einzahl und Mehrzahl ueber die Endungen .eins und .viele. */
  tn: (key: string, n: number, vars?: Vars) => string
}

const Ctx = createContext<SprachWert | null>(null)

export function SpracheProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>(() => lesen())

  useEffect(() => {
    spracheAnwenden(lang)
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setState(l)
    try {
      localStorage.setItem(KEY, l)
    } catch {
      /* privater Modus, dann gilt die Wahl nur fuer diesen Besuch */
    }
  }, [])

  const wert = useMemo<SprachWert>(() => {
    const t = (key: string, vars?: Vars) => uebersetzen(lang, key, vars)
    return {
      lang,
      setLang,
      dir: richtungVon(lang),
      rtl: lang === 'ar',
      t,
      tn: (key, n, vars) =>
        t(`${key}.${n === 1 ? 'eins' : 'viele'}`, { n, ...(vars ?? {}) }),
    }
  }, [lang, setLang])

  return <Ctx.Provider value={wert}>{children}</Ctx.Provider>
}

export function useSprache(): SprachWert {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSprache ausserhalb von SpracheProvider')
  return v
}

/** Kurzform fuer Seiten, die nur uebersetzen wollen. */
export function useT(): (key: string, vars?: Vars) => string {
  return useSprache().t
}
