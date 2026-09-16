/* Scannen ueber alle Umzuege hinweg.
 * Der globale Scan-Bereich kennt kein Projekt, darum suchen diese Abfragen
 * ohne Projektfilter. Row Level Security laesst nur Zeilen durch, in deren
 * Umzug der angemeldete Nutzer Mitglied ist, es wird also nichts sichtbar,
 * was nicht sichtbar sein darf.
 *
 * Diese Abfragen stehen hier und nicht in api.ts, weil api.ts in diesem
 * Arbeitsgang nicht veraendert werden durfte. Wandern sie spaeter dorthin,
 * faellt diese Datei ersatzlos weg.
 */
import { logScan } from './api'
import { errText, supabase } from './supabase'
import { tg } from './i18n'
import type { Item, ItemContent, Project, Tag } from './types'
import { normalizeCodeInput } from './util'

export interface ScanResult {
  item: Item
  project: Project
  room: Tag | null
  person: Tag | null
  contents: ItemContent[]
  photoPaths: string[]
  /** Das geklebte Etikett traegt einen Code, der schon ersetzt wurde. */
  isOldCode: boolean
  /** Codes sind nur je Umzug eindeutig. Ueber mehrere Umzuege hinweg kann
   *  derselbe Code mehrfach vorkommen, das muss der Nutzer sehen. */
  moreMatches: number
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LINK_RE = /\/s\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i

export interface ScanInput {
  itemId: string | null
  code: string | null
}

/** Zerlegt, was die Kamera oder die Tastatur geliefert hat: eine Adresse
 *  der Form <origin>/s/<uuid>, eine nackte UUID oder ein Code wie W-3-007. */
export function parseScanInput(text: string): ScanInput {
  const raw = text.trim()
  if (!raw) return { itemId: null, code: null }
  const link = LINK_RE.exec(raw)
  if (link) return { itemId: link[1], code: null }
  if (UUID_RE.test(raw)) return { itemId: raw, code: null }
  return { itemId: null, code: normalizeCodeInput(raw) }
}

async function itemById(id: string): Promise<Item | null> {
  const res = await supabase.from('items').select('*').eq('id', id).maybeSingle()
  if (res.error) throw new Error(tg('fehler.kiste_suchen', { grund: errText(res.error) }))
  return (res.data as Item | null) ?? null
}

/* Genauer Vergleich statt ilike. In einem ilike-Muster sind %, _ und bei
 * PostgREST auch * Platzhalter, ein getipptes * wuerde also irgendeine
 * fremde Kiste treffen. Noetig ist das Muster ohnehin nicht: die Datenbank
 * legt jeden Code mit upper() an und normalizeCodeInput macht dasselbe
 * mit der Eingabe, beide Seiten stehen also in Grossbuchstaben. */
async function itemsByCode(code: string): Promise<Item[]> {
  const res = await supabase
    .from('items')
    .select('*')
    .eq('code', code)
    .order('updated_at', { ascending: false })
    .limit(5)
  if (res.error) throw new Error(tg('fehler.code_suchen', { grund: errText(res.error) }))
  return (res.data ?? []) as Item[]
}

/** Alte, schon ersetzte Codes. Ein laengst geklebtes Etikett bleibt so
 *  auffindbar, statt ins Leere zu laufen. */
async function itemIdByOldCode(code: string): Promise<string | null> {
  const res = await supabase
    .from('item_code_history')
    .select('item_id, replaced_at')
    .eq('code', code)
    .order('replaced_at', { ascending: false })
    .limit(1)
  if (res.error) throw new Error(tg('fehler.alter_code_suchen', { grund: errText(res.error) }))
  const row = (res.data ?? [])[0] as { item_id: string } | undefined
  return row?.item_id ?? null
}

async function projectOf(id: string): Promise<Project> {
  const res = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
  if (res.error) throw new Error(tg('fehler.umzug_laden', { grund: errText(res.error) }))
  if (!res.data) throw new Error(tg('fehler.umzug_unsichtbar'))
  return res.data as Project
}

async function tagsOf(ids: Array<string | null>): Promise<Map<string, Tag>> {
  const map = new Map<string, Tag>()
  const wanted = [...new Set(ids.filter((v): v is string => Boolean(v)))]
  if (wanted.length === 0) return map
  const res = await supabase.from('tags').select('*').in('id', wanted)
  if (res.error) throw new Error(tg('fehler.zimmer_person_laden', { grund: errText(res.error) }))
  for (const t of (res.data ?? []) as Tag[]) map.set(t.id, t)
  return map
}

async function contentsOf(itemId: string): Promise<ItemContent[]> {
  const res = await supabase
    .from('item_contents')
    .select('*')
    .eq('item_id', itemId)
    .order('sort')
    .order('created_at')
  if (res.error) throw new Error(tg('fehler.inhalt_laden', { grund: errText(res.error) }))
  return (res.data ?? []) as ItemContent[]
}

async function photoPathsOf(itemId: string): Promise<string[]> {
  const res = await supabase
    .from('item_photos')
    .select('path')
    .eq('item_id', itemId)
    .order('created_at')
  if (res.error) throw new Error(tg('fehler.fotos_laden', { grund: errText(res.error) }))
  return ((res.data ?? []) as Array<{ path: string }>).map((r) => r.path)
}

/**
 * Sucht eine Kiste ueber alle Umzuege, in denen der Nutzer Mitglied ist.
 * Gibt null zurueck, wenn es zu der Eingabe nichts gibt. Das ist absichtlich
 * etwas anderes als ein Fehler: Fehler werden geworfen und gehoeren vor
 * die Augen des Nutzers.
 */
export async function resolveScan(text: string): Promise<ScanResult | null> {
  const { itemId, code } = parseScanInput(text)
  if (!itemId && !code) return null

  let item: Item | null = null
  let oldCode: string | null = null
  let moreMatches = 0

  if (itemId) {
    item = await itemById(itemId)
  } else if (code) {
    const rows = await itemsByCode(code)
    if (rows.length > 0) {
      item = rows[0]
      moreMatches = rows.length - 1
    } else {
      const previous = await itemIdByOldCode(code)
      if (previous) {
        item = await itemById(previous)
        if (item) oldCode = code
      }
    }
  }

  if (!item) return null

  const found = item
  const [project, tags, contents, photoPaths] = await Promise.all([
    projectOf(found.project_id),
    tagsOf([found.room_id, found.person_id]),
    contentsOf(found.id),
    photoPathsOf(found.id),
  ])

  /* Jeder Scan landet im Verlauf, damit spaeter nachvollziehbar ist, wer
   * wann welche Kiste in der Hand hatte. Der Verlauf ist dabei Beiwerk:
   * der Nutzer hat die Kiste gefunden, und daran darf ein misslungener
   * Eintrag nichts aendern. Ohne dieses Abfangen wuerde ein Aussetzer beim
   * Schreiben den fertigen Treffer in eine Fehlermeldung verwandeln. */
  try {
    await logScan(found.project_id, found.id, oldCode ? `alter Code ${oldCode}` : undefined)
  } catch (err) {
    console.warn('[scan] Verlauf nicht geschrieben:', err)
  }

  return {
    item: found,
    project,
    room: found.room_id ? (tags.get(found.room_id) ?? null) : null,
    person: found.person_id ? (tags.get(found.person_id) ?? null) : null,
    contents,
    photoPaths,
    isOldCode: oldCode !== null,
    moreMatches,
  }
}
