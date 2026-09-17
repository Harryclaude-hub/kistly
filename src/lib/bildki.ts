import { supabase, errText } from './supabase'
import { tg } from './i18n'
import type { ErkanntesDing, ItemPhoto, PhotoAnalyse } from './types'

/* Bilderkennung.
 *
 * Der ganze Weg zur Erkennung laeuft ueber diese Datei. Der Schluessel
 * liegt auf dem Server, hier gibt es nur den Aufruf.
 *
 * Wichtig: was zurueckkommt, sind VORSCHLAEGE. Es wird nichts
 * eingetragen. Uebernommen wird Zeile fuer Zeile von Hand, denn ein
 * Vorschlag, der ungefragt in der Liste landet, ist spaeter nicht mehr
 * von einer Angabe zu unterscheiden, die ein Mensch gemacht hat.
 */

export type Erkennungsart = 'kiste' | 'moebel' | 'zimmer'

export interface BildErgebnis {
  photo_id: string
  status: 'fertig' | 'fehler'
  /** true heisst: kam aus dem Speicher und hat nichts gekostet. */
  aus_speicher: boolean
  dinge: ErkanntesDing[]
  fehler?: string
}

export interface ErkennungsAntwort {
  ergebnisse: BildErgebnis[]
  /** Bilder, die es nicht gibt oder die zu einem anderen Umzug gehoeren. */
  uebergangen: string[]
  /** Wie viele wegen der Tagesgrenze liegen geblieben sind. */
  uebersprungen_wegen_grenze: number
  rest_projekt: number
  rest_nutzer: number
  modell: string
  sprache: 'de' | 'ar'
}

/** Ein Fehler, der einen eigenen Text in der Oberflaeche verdient.
 *  Der Code kommt von der Edge Function. */
export class BildFehler extends Error {
  code: string
  constructor(code: string, nachricht: string) {
    super(nachricht)
    this.code = code
    this.name = 'BildFehler'
  }
}

/** Hoechstens so viele Bilder gehen in einem Aufruf. Dieselbe Zahl steht
 *  in der Edge Function. Sie steht hier noch einmal, damit die
 *  Oberflaeche gar nicht erst mehr anbietet, und der Kommentar sagt, wo
 *  die andere Haelfte liegt. */
export const MAX_BILDER_JE_LAUF = 4

/**
 * Fotos auswerten lassen.
 * @param sprache Die Sprache, in der die Erkennung antworten soll. Was
 *   sie liefert, ist danach Nutzerinhalt und wird nie mehr uebersetzt.
 */
export async function bilderLesen(
  projectId: string,
  photoIds: string[],
  was: Erkennungsart,
  sprache: 'de' | 'ar',
): Promise<ErkennungsAntwort> {
  if (photoIds.length === 0) {
    throw new BildFehler('leer', tg('bildki.keine_bilder'))
  }
  const { data, error } = await supabase.functions.invoke('bild-analyse', {
    body: {
      project_id: projectId,
      photo_ids: photoIds.slice(0, MAX_BILDER_JE_LAUF),
      was,
      sprache,
    },
  })

  if (error) {
    /* Die Edge Function schickt bei einem Fehler einen eigenen Text und
     * einen Code mit. supabase-js packt beides in die Antwort, darum wird
     * sie hier ausgelesen statt nur "non-2xx" zu melden. Sonst stuende
     * beim fehlenden Schluessel nur "Edge Function returned a non-2xx
     * status code" auf dem Schirm, und niemand wuesste, was zu tun ist. */
    let code = 'unbekannt'
    let text = errText(error)
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        const koerper = (await ctx.json()) as { error?: string; code?: string }
        if (koerper?.error) text = koerper.error
        if (koerper?.code) code = koerper.code
      }
    } catch {
      /* Dann bleibt es bei der allgemeinen Meldung. */
    }
    throw new BildFehler(code, text)
  }

  return data as ErkennungsAntwort
}

/** Was schon einmal erkannt wurde, ohne neu zu fragen. Fuer die Anzeige,
 *  bevor jemand auf den Knopf drueckt. */
export async function vorhandeneErkennungen(
  photoIds: string[],
  sprache: 'de' | 'ar',
): Promise<Map<string, PhotoAnalyse>> {
  const out = new Map<string, PhotoAnalyse>()
  if (photoIds.length === 0) return out
  const step = 200
  for (let i = 0; i < photoIds.length; i += step) {
    const res = await supabase
      .from('photo_analyses')
      .select('*')
      .in('photo_id', photoIds.slice(i, i + step))
      .eq('sprache', sprache)
    if (res.error) throw new Error(tg('fehler.erkennung_laden', { grund: errText(res.error) }))
    for (const row of (res.data ?? []) as PhotoAnalyse[]) out.set(row.photo_id, row)
  }
  return out
}

/** Eine Erkennung wegwerfen, damit dasselbe Bild neu gelesen wird. Kostet
 *  beim naechsten Lauf wieder Geld, darum fragt die Oberflaeche vorher. */
export async function erkennungVerwerfen(photoId: string, sprache: 'de' | 'ar'): Promise<void> {
  const { error } = await supabase
    .from('photo_analyses')
    .delete()
    .eq('photo_id', photoId)
    .eq('sprache', sprache)
  if (error) throw new Error(tg('fehler.erkennung_verwerfen', { grund: errText(error) }))
}

/** Wie viele Auswertungen heute noch frei sind. */
export async function restGuthaben(
  projectId: string,
  userId: string,
): Promise<{ projekt: number; nutzer: number }> {
  const { data, error } = await supabase.rpc('bild_lesen_rest', {
    p_project: projectId,
    p_user: userId,
  })
  if (error) throw new Error(tg('fehler.rest_laden', { grund: errText(error) }))
  const zeile = Array.isArray(data) ? data[0] : data
  return { projekt: Number(zeile?.rest_projekt ?? 0), nutzer: Number(zeile?.rest_nutzer ?? 0) }
}

/* ------------------------------------------------------------ Anzeigen */

/** Drei grobe Stufen statt einer Prozentzahl.
 *
 *  Die Sicherheit ist eine Selbsteinschaetzung des Modells, keine
 *  Messung. "87 Prozent" liest sich wie ein Messwert und ist keiner.
 *  Drei Stufen sagen dasselbe, ohne mehr zu behaupten, als da ist. */
export type Stufe = 'sicher' | 'wahrscheinlich' | 'unsicher'

export function stufeVon(sicherheit: number): Stufe {
  if (sicherheit >= 0.8) return 'sicher'
  if (sicherheit >= 0.5) return 'wahrscheinlich'
  return 'unsicher'
}

/** Steht dieser Vorschlag schon in der Liste? Verglichen wird ohne
 *  Gross- und Kleinschreibung und ohne Rand, aber NICHT unscharf: zwei
 *  aehnliche Woerter sind zwei Dinge, und etwas stillschweigend
 *  zusammenzuwerfen waere schlimmer als eine Zeile doppelt. */
export function schonVorhanden(vorschlag: string, vorhanden: string[]): boolean {
  const a = vorschlag.trim().toLowerCase()
  return vorhanden.some((v) => v.trim().toLowerCase() === a)
}

/** Alle Fotos, die zu dieser Art gehoeren. Anleitungen bleiben draussen:
 *  auf einem Blatt Papier steht kein Kisteninhalt. */
export function lesbareFotos(fotos: ItemPhoto[]): ItemPhoto[] {
  return fotos.filter((f) => f.art === 'foto')
}
