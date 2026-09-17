/* Woerterbuch.
 *
 * Aufbau: ein Schluessel, darunter jede Sprache. Beide Fassungen stehen
 * nebeneinander, damit man beim Aendern nie eine davon vergisst.
 *
 * Die Teile liegen in bausteine/ und sind nach Seiten getrennt. Neue Texte
 * kommen in den Baustein der jeweiligen Seite, nicht hierher.
 *
 * Platzhalter in geschweiften Klammern werden beim Uebersetzen ersetzt:
 *   'items.angelegt': { de: '{code} angelegt', ar: 'تم إنشاء {code}' }
 */
import { gemeinsam } from './bausteine/gemeinsam'
import { start } from './bausteine/start'
import { konto } from './bausteine/konto'
import { umzuege } from './bausteine/umzuege'
import { bereiche } from './bausteine/bereiche'
import { bereichsseite } from './bausteine/bereichsseite'
import { kisten } from './bausteine/kisten'
import { moebel } from './bausteine/moebel'
import { marken } from './bausteine/marken'
import { etiketten } from './bausteine/etiketten'
import { ausgabe } from './bausteine/ausgabe'
import { scannen } from './bausteine/scannen'
import { schnell } from './bausteine/schnell'
import { chat } from './bausteine/chat'
import { team } from './bausteine/team'
import { einstellungen } from './bausteine/einstellungen'
import { fehler } from './bausteine/fehler'

export type Eintrag = { de: string; ar?: string }
export type Woerterbuch = Record<string, Eintrag>

/* Doppelte Schluessel wuerden sich still ueberschreiben. Darum wird beim
 * Zusammenlegen geprueft und gemeldet, statt einfach zu gewinnen. */
function zusammenlegen(...teile: Woerterbuch[]): Woerterbuch {
  const alle: Woerterbuch = {}
  for (const teil of teile) {
    for (const [key, wert] of Object.entries(teil)) {
      if (key in alle) {
        console.warn(`[sprache] Schluessel doppelt vergeben: ${key}`)
      }
      alle[key] = wert
    }
  }
  return alle
}

export const WOERTER: Woerterbuch = zusammenlegen(
  gemeinsam,
  start,
  konto,
  umzuege,
  bereiche,
  bereichsseite,
  kisten,
  moebel,
  marken,
  etiketten,
  ausgabe,
  scannen,
  schnell,
  chat,
  team,
  einstellungen,
  fehler,
)
