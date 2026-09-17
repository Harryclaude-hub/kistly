import type { Item } from './types'

/* Markieren wie in Excel.
 *
 * Eine Zeile bekommt eine eigene Farbe und ein Zeichen. Beides gehoert der
 * Zeile, nicht dem Zimmer. Die Zimmerfarbe bleibt unveraendert, sonst
 * wuerde eine schnelle Markierung die Ordnung des ganzen Umzugs umwerfen.
 *
 * Die Namen der Zeichen stehen hier und nur hier. In der Datenbank liegt
 * der Name als Text in items.mark_symbol, nicht das Bild. So bleibt eine
 * Markierung lesbar, auch wenn spaeter ein anderes Bild dafuer gewaehlt
 * wird, und sie laesst sich auf Papier genauso drucken wie am Schirm.
 */

export const MARK_SYMBOLE = [
  'stern',
  'haken',
  'achtung',
  'herz',
  'flagge',
  'kreis',
  'blitz',
  'schloss',
] as const

export type MarkSymbol = (typeof MARK_SYMBOLE)[number]

export function istMarkSymbol(wert: string | null | undefined): wert is MarkSymbol {
  return typeof wert === 'string' && (MARK_SYMBOLE as readonly string[]).includes(wert)
}

/* Auf Papier wird das Zeichen gezeichnet, nicht als Buchstabe gesetzt:
 * siehe markZeichenBild in lib/ausgabe.ts. Eine Buchstabentabelle stand
 * hier frueher und war ein Fehler. Merkbuchstaben wie F fuer Flagge oder
 * S fuer Schloss sind deutsche Woerter und haetten unuebersetzt auf einem
 * arabischen Blatt gestanden. */

/* Farben zum Markieren. Bewusst dieselbe Palette wie bei den Bereichen,
 * damit im ganzen Programm dieselben Farben vorkommen. */
export const MARK_FARBEN = [
  '#EF4444',
  '#F97316',
  '#F59E0B',
  '#84CC16',
  '#16A34A',
  '#14B8A6',
  '#0EA5E9',
  '#2563EB',
  '#7C3AED',
  '#EC4899',
]

/** Wie stark die Markierung als Flaeche durchkommt. Bewusst leise: die
 *  Zeile soll auffallen, nicht schreien, und der Text darauf muss bei
 *  langer Arbeit lesbar bleiben. */
const FLAECHE = 0.16

/** Die Hintergrundfarbe fuer eine markierte Zeile, oder undefined.
 *  Der Zebrastreifen wird darauf in index.css gelegt, nicht hier. */
export function markFlaeche(farbe: string | null | undefined): string | undefined {
  if (!farbe) return undefined
  const hex = farbe.trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return undefined
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${FLAECHE})`
}

/** Ist an dieser Zeile ueberhaupt etwas markiert? */
export function istMarkiert(item: Pick<Item, 'mark_color' | 'mark_symbol'>): boolean {
  return Boolean(item.mark_color || item.mark_symbol)
}
