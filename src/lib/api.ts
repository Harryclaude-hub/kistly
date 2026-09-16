/* Alle Datenbankzugriffe von Kistly.
 * Die Seiten rufen nur diese Funktionen auf. So gibt es genau eine Stelle,
 * an der eine Abfrage steht, und keine zweite Fassung, die spaeter
 * auseinanderlaeuft.
 */
import { supabase, errText } from './supabase'
import { tg } from './i18n'
import type {
  Call,
  CallParticipant,
  Item,
  ItemContent,
  ItemEvent,
  ItemPhoto,
  ItemStatus,
  Message,
  MessageLink,
  MessageReaction,
  NotificationPrefs,
  Profile,
  Project,
  ProjectInvite,
  ProjectMember,
  ProjectStats,
  Tag,
} from './types'
import { inviteCode } from './util'

/** Wirft mit lesbarer Meldung, statt still null zurueckzugeben.
 *  Der Schluessel zeigt auf einen Satz der Form 'Kisten laden: {grund}'. */
function unwrap<T>(res: { data: T | null; error: unknown }, key: string): T {
  if (res.error) throw new Error(tg(key, { grund: errText(res.error) }))
  if (res.data === null) throw new Error(tg(key, { grund: tg('fehler.keine_daten') }))
  return res.data
}

/* ============================================================= Projekte */

export interface ProjectWithStats {
  project: Project
  stats: ProjectStats
  role: ProjectMember['role']
  members: number
}

const EMPTY_STATS = (id: string): ProjectStats => ({
  project_id: id,
  items_total: 0,
  items_arrived: 0,
  items_transit: 0,
  items_open: 0,
})

export async function listProjects(): Promise<ProjectWithStats[]> {
  const projects = unwrap(
    await supabase.from('projects').select('*').order('created_at', { ascending: false }),
    'fehler.umzuege_laden',
  ) as Project[]
  if (projects.length === 0) return []

  const ids = projects.map((p) => p.id)
  const [statsRes, memberRes] = await Promise.all([
    supabase.from('project_stats').select('*').in('project_id', ids),
    supabase.from('project_members').select('project_id, user_id, role').in('project_id', ids),
  ])
  if (statsRes.error)
    throw new Error(tg('fehler.zaehlwerte_laden', { grund: errText(statsRes.error) }))
  if (memberRes.error)
    throw new Error(tg('fehler.mitglieder_laden', { grund: errText(memberRes.error) }))

  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  const statsById = new Map((statsRes.data as ProjectStats[]).map((s) => [s.project_id, s]))
  const rows = (memberRes.data ?? []) as Array<Pick<ProjectMember, 'project_id' | 'user_id' | 'role'>>

  return projects.map((p) => ({
    project: p,
    stats: statsById.get(p.id) ?? EMPTY_STATS(p.id),
    role: rows.find((m) => m.project_id === p.id && m.user_id === uid)?.role ?? 'viewer',
    members: rows.filter((m) => m.project_id === p.id).length,
  }))
}

export async function getProject(id: string): Promise<Project> {
  const res = await supabase.from('projects').select('*').eq('id', id).maybeSingle()
  if (res.error) throw new Error(tg('fehler.umzug_laden', { grund: errText(res.error) }))
  if (!res.data) throw new Error(tg('fehler.umzug_fehlt'))
  return res.data as Project
}

export async function getStats(projectId: string): Promise<ProjectStats> {
  const res = await supabase
    .from('project_stats')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()
  if (res.error) throw new Error(tg('fehler.zaehlwerte_laden', { grund: errText(res.error) }))
  return (res.data as ProjectStats) ?? EMPTY_STATS(projectId)
}

export async function createProject(
  name: string,
  note?: string,
  withDefaults = true,
): Promise<Project> {
  const res = await supabase.rpc('create_project', {
    p_name: name,
    p_note: note ?? null,
    p_with_defaults: withDefaults,
  })
  return unwrap(res, 'fehler.umzug_anlegen') as Project
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const res = await supabase.from('projects').update(patch).eq('id', id).select('*').single()
  return unwrap(res, 'fehler.umzug_speichern') as Project
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(tg('fehler.umzug_loeschen', { grund: errText(error) }))
}

export async function joinProject(code: string): Promise<Project> {
  const res = await supabase.rpc('join_project', { p_code: code })
  return unwrap(res, 'fehler.beitreten') as Project
}

/* ============================================================ Mitglieder */

/* Die Profile kommen in einer zweiten Abfrage, nicht als eingebettete
 * Beziehung. project_members.user_id zeigt auf auth.users, nicht auf
 * public.profiles. PostgREST kann daraus keine Verknuepfung ableiten und
 * meldete "Could not find a relationship between project_members and
 * profiles". Zwei Abfragen sind hier der ehrlichere Weg als ein
 * zusaetzlicher Fremdschluessel nur fuer die Anzeige. */
export async function listMembers(projectId: string): Promise<ProjectMember[]> {
  const res = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at')
  const rows = unwrap(res, 'fehler.mitglieder_laden') as ProjectMember[]
  if (rows.length === 0) return rows

  const profiles = await listProfiles(rows.map((r) => r.user_id))
  return rows.map((r) => ({ ...r, profile: profiles.get(r.user_id) ?? null }))
}

export async function setMemberRole(
  projectId: string,
  userId: string,
  role: ProjectMember['role'],
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw new Error(tg('fehler.rolle_aendern', { grund: errText(error) }))
}

export async function removeMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) throw new Error(tg('fehler.mitglied_entfernen', { grund: errText(error) }))
}

export async function markRead(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ last_read_at: new Date().toISOString() })
    .eq('project_id', projectId)
    .eq('user_id', userId)
  if (error) console.warn('[chat] Lesestand nicht gespeichert:', errText(error))
}

/* =========================================================== Einladungen */

export async function listInvites(projectId: string): Promise<ProjectInvite[]> {
  const res = await supabase
    .from('project_invites')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  return unwrap(res, 'fehler.einladungen_laden') as ProjectInvite[]
}

export async function createInvite(
  projectId: string,
  role: ProjectMember['role'] = 'editor',
): Promise<ProjectInvite> {
  const { data: auth } = await supabase.auth.getUser()
  const res = await supabase
    .from('project_invites')
    .insert({
      project_id: projectId,
      code: inviteCode(),
      role,
      created_by: auth.user?.id ?? null,
    })
    .select('*')
    .single()
  return unwrap(res, 'fehler.einladung_anlegen') as ProjectInvite
}

export async function setInviteActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('project_invites').update({ active }).eq('id', id)
  if (error) throw new Error(tg('fehler.einladung_aendern', { grund: errText(error) }))
}

/* ============================================================== Bereiche */

export async function listTags(projectId: string): Promise<Tag[]> {
  const res = await supabase
    .from('tags')
    .select('*')
    .eq('project_id', projectId)
    .order('kind')
    .order('sort')
    .order('name')
  return unwrap(res, 'fehler.bereiche_laden') as Tag[]
}

export async function createTag(input: {
  project_id: string
  kind: Tag['kind']
  name: string
  short: string
  color: string
  note?: string | null
}): Promise<Tag> {
  const res = await supabase
    .from('tags')
    .insert({ ...input, short: input.short.toUpperCase() })
    .select('*')
    .single()
  return unwrap(res, 'fehler.bereich_anlegen') as Tag
}

export async function updateTag(id: string, patch: Partial<Tag>): Promise<Tag> {
  const clean = { ...patch }
  if (clean.short) clean.short = clean.short.toUpperCase()
  const res = await supabase.from('tags').update(clean).eq('id', id).select('*').single()
  return unwrap(res, 'fehler.bereich_speichern') as Tag
}

export async function deleteTag(id: string): Promise<void> {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw new Error(tg('fehler.bereich_loeschen', { grund: errText(error) }))
}

export interface TagStat {
  total: number
  arrived: number
}

/** Zaehlwerte fuer alle Bereiche eines Projekts in einer Abfrage. */
export async function listTagStats(projectId: string): Promise<Map<string, TagStat>> {
  const res = await supabase.rpc('tag_stats', { p_project: projectId })
  if (res.error) throw new Error(tg('fehler.zaehlwerte_bereich', { grund: errText(res.error) }))
  const map = new Map<string, TagStat>()
  for (const row of (res.data ?? []) as Array<{ tag_id: string; total: number; arrived: number }>) {
    map.set(row.tag_id, { total: Number(row.total), arrived: Number(row.arrived) })
  }
  return map
}

/** Zwei Bereiche zusammenfuehren. Alles vom ersten haengt danach am
 *  zweiten, der erste ist weg. Die Codes vergibt die Datenbank neu, die
 *  alten bleiben ueber item_code_history scannbar.
 *  Gibt zurueck, wie viele Eintraege umgehaengt wurden. */
export async function mergeTags(von: string, nach: string): Promise<number> {
  const res = await supabase.rpc('merge_tags', { p_von: von, p_nach: nach })
  if (res.error) throw new Error(tg('fehler.bereiche_zusammenfuehren', { grund: errText(res.error) }))
  return Number(res.data ?? 0)
}

/* ================================================================ Kisten */

export interface ItemFilter {
  search?: string
  status?: ItemStatus | 'all'
  roomId?: string | 'all'
  personId?: string | 'all'
  /** Kisten oder Moebel. Moebel sind Eintraege mit kind 'furniture'. */
  kind?: Item['kind'] | 'all'
  /** Moebel aus der Kistenliste heraushalten und umgekehrt. */
  kindNot?: Item['kind']
  limit?: number
  offset?: number
  sort?: 'code' | 'newest' | 'size'
}

export interface ItemPage {
  rows: Item[]
  total: number
}

/** Immer begrenzt laden. Grosse Antworten laufen sonst in einen Fehler. */
export async function listItems(projectId: string, f: ItemFilter = {}): Promise<ItemPage> {
  const limit = f.limit ?? 100
  const offset = f.offset ?? 0
  let q = supabase
    .from('items')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .range(offset, offset + limit - 1)

  if (f.status && f.status !== 'all') q = q.eq('status', f.status)
  if (f.kind && f.kind !== 'all') q = q.eq('kind', f.kind)
  if (f.kindNot) q = q.neq('kind', f.kindNot)
  if (f.roomId && f.roomId !== 'all') q = q.eq('room_id', f.roomId)
  if (f.personId && f.personId !== 'all') q = q.eq('person_id', f.personId)
  if (f.search?.trim()) {
    const s = f.search.trim().replace(/[%,]/g, '')
    q = q.or(`code.ilike.%${s}%,title.ilike.%${s}%,note.ilike.%${s}%,target_room.ilike.%${s}%`)
  }

  if (f.sort === 'newest') q = q.order('created_at', { ascending: false })
  else if (f.sort === 'size') q = q.order('size', { ascending: false }).order('code')
  else q = q.order('prefix').order('seq')

  const { data, error, count } = await q
  if (error) throw new Error(tg('fehler.kisten_laden', { grund: errText(error) }))
  return { rows: (data ?? []) as Item[], total: count ?? 0 }
}

export async function listAllItems(projectId: string): Promise<Item[]> {
  // Fuer Etikettenbogen und Export. Seitenweise, damit auch 2000 Kisten
  // durchlaufen statt in einen Fehler zu kippen.
  const out: Item[] = []
  const step = 500
  for (let offset = 0; ; offset += step) {
    const { rows, total } = await listItems(projectId, { limit: step, offset })
    out.push(...rows)
    if (out.length >= total || rows.length === 0) break
  }
  return out
}

export async function getItem(id: string): Promise<Item> {
  const res = await supabase.from('items').select('*').eq('id', id).maybeSingle()
  if (res.error) throw new Error(tg('fehler.kiste_laden', { grund: errText(res.error) }))
  if (!res.data) throw new Error(tg('fehler.kiste_fehlt'))
  return res.data as Item
}

export async function createItem(input: {
  project_id: string
  kind?: Item['kind']
  title?: string | null
  room_id?: string | null
  person_id?: string | null
  code_source?: Item['code_source']
  size?: number
  note?: string | null
  fragile?: boolean
  target_room?: string | null
  status?: ItemStatus
}): Promise<Item> {
  const res = await supabase.from('items').insert(input).select('*').single()
  return unwrap(res, 'fehler.kiste_anlegen') as Item
}

export async function updateItem(id: string, patch: Partial<Item>): Promise<Item> {
  const res = await supabase.from('items').update(patch).eq('id', id).select('*').single()
  return unwrap(res, 'fehler.kiste_speichern') as Item
}

export async function setItemStatus(id: string, status: ItemStatus): Promise<Item> {
  return updateItem(id, { status })
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw new Error(tg('fehler.kiste_loeschen', { grund: errText(error) }))
}

export async function getItemsByIds(ids: string[]): Promise<Map<string, Item>> {
  const map = new Map<string, Item>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return map
  const res = await supabase.from('items').select('*').in('id', unique)
  if (res.error) {
    console.warn('[items] Vorschau nicht geladen:', res.error.message)
    return map
  }
  for (const i of (res.data ?? []) as Item[]) map.set(i.id, i)
  return map
}

export async function resolveCode(
  projectId: string,
  code: string,
): Promise<Array<{ item_id: string; code: string; is_old: boolean }>> {
  const res = await supabase.rpc('resolve_code', { p_project: projectId, p_code: code })
  if (res.error) throw new Error(tg('fehler.code_suchen', { grund: errText(res.error) }))
  return (res.data ?? []) as Array<{ item_id: string; code: string; is_old: boolean }>
}

/* ------------------------------------------------------------- Inhalte */

export async function listContents(itemId: string): Promise<ItemContent[]> {
  const res = await supabase
    .from('item_contents')
    .select('*')
    .eq('item_id', itemId)
    .order('sort')
    .order('created_at')
  return unwrap(res, 'fehler.inhalt_laden') as ItemContent[]
}

export async function listContentsForItems(itemIds: string[]): Promise<Map<string, ItemContent[]>> {
  const map = new Map<string, ItemContent[]>()
  if (itemIds.length === 0) return map
  const step = 200
  for (let i = 0; i < itemIds.length; i += step) {
    const slice = itemIds.slice(i, i + step)
    const res = await supabase
      .from('item_contents')
      .select('*')
      .in('item_id', slice)
      .order('sort')
    if (res.error) throw new Error(tg('fehler.inhalte_laden', { grund: errText(res.error) }))
    for (const row of (res.data ?? []) as ItemContent[]) {
      const list = map.get(row.item_id) ?? []
      list.push(row)
      map.set(row.item_id, list)
    }
  }
  return map
}

/* project_id wird vom Trigger aus der Kiste gesetzt. Wir schicken es
 * trotzdem mit, damit die Zeile schon vor dem Trigger stimmig ist. */
export async function addContent(
  projectId: string,
  itemId: string,
  text: string,
  qty = 1,
): Promise<ItemContent> {
  const res = await supabase
    .from('item_contents')
    .insert({ item_id: itemId, project_id: projectId, text: text.trim(), qty })
    .select('*')
    .single()
  return unwrap(res, 'fehler.eintrag_anlegen') as ItemContent
}

/** Einen Inhalt in eine andere Kiste umhaengen. Das project_id setzt der
 *  Trigger nicht bei einem Update, darum wird es hier mitgeschickt, damit
 *  die Zeile stimmig bleibt. Beide Kisten muessen im selben Umzug liegen,
 *  sonst laesst die RLS das Schreiben ohnehin nicht zu. */
export async function moveContent(
  contentId: string,
  zielItemId: string,
  projectId: string,
): Promise<void> {
  const { error } = await supabase
    .from('item_contents')
    .update({ item_id: zielItemId, project_id: projectId })
    .eq('id', contentId)
  if (error) throw new Error(tg('fehler.inhalt_verschieben', { grund: errText(error) }))
}

/** Mehrere Kisten auf einmal in ein anderes Zimmer oder zu einer anderen
 *  Person haengen. Einzeln, damit der Trigger je Zeile einen sauberen
 *  neuen Code vergeben kann. Fehlschlaege werden gesammelt gemeldet,
 *  nicht verschluckt. */
export async function moveItems(
  ids: string[],
  patch: { room_id?: string | null; person_id?: string | null; code_source?: Item['code_source'] },
): Promise<{ ok: number; fehler: string[] }> {
  let okZahl = 0
  const fehler: string[] = []
  for (const id of ids) {
    try {
      await updateItem(id, patch)
      okZahl++
    } catch (err) {
      fehler.push(err instanceof Error ? err.message : String(err))
    }
  }
  return { ok: okZahl, fehler }
}

export async function updateContent(id: string, patch: Partial<ItemContent>): Promise<void> {
  const { error } = await supabase.from('item_contents').update(patch).eq('id', id)
  if (error) throw new Error(tg('fehler.eintrag_speichern', { grund: errText(error) }))
}

export async function deleteContent(id: string): Promise<void> {
  const { error } = await supabase.from('item_contents').delete().eq('id', id)
  if (error) throw new Error(tg('fehler.eintrag_loeschen', { grund: errText(error) }))
}

/* --------------------------------------------------------------- Fotos */

export async function listPhotos(itemId: string): Promise<ItemPhoto[]> {
  const res = await supabase
    .from('item_photos')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at')
  return unwrap(res, 'fehler.fotos_laden') as ItemPhoto[]
}

export async function addPhotoRecord(
  projectId: string,
  itemId: string,
  path: string,
  caption?: string,
  art: ItemPhoto['art'] = 'foto',
  seite?: string,
): Promise<ItemPhoto> {
  const { data: auth } = await supabase.auth.getUser()
  const res = await supabase
    .from('item_photos')
    .insert({
      item_id: itemId,
      project_id: projectId,
      path,
      art,
      seite: seite ?? null,
      caption: caption ?? null,
      created_by: auth.user?.id ?? null,
    })
    .select('*')
    .single()
  return unwrap(res, 'fehler.foto_speichern') as ItemPhoto
}

export async function deletePhoto(photo: ItemPhoto): Promise<void> {
  const { error } = await supabase.from('item_photos').delete().eq('id', photo.id)
  if (error) throw new Error(tg('fehler.foto_loeschen', { grund: errText(error) }))
  const rm = await supabase.storage.from('item-photos').remove([photo.path])
  if (rm.error) console.warn('[storage] Datei blieb liegen:', rm.error.message)
}

/* ------------------------------------------------------------- Verlauf */

export async function listItemEvents(itemId: string, limit = 50): Promise<ItemEvent[]> {
  const res = await supabase
    .from('item_events')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return unwrap(res, 'fehler.verlauf_laden') as ItemEvent[]
}

export async function listProjectEvents(projectId: string, limit = 40): Promise<ItemEvent[]> {
  const res = await supabase
    .from('item_events')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return unwrap(res, 'fehler.verlauf_laden') as ItemEvent[]
}

export async function logScan(projectId: string, itemId: string, note?: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const { error } = await supabase.from('item_events').insert({
    project_id: projectId,
    item_id: itemId,
    user_id: auth.user?.id ?? null,
    type: 'scan',
    data: note ? { note } : {},
  })
  if (error) console.warn('[scan] Verlauf nicht geschrieben:', errText(error))
}

/* ================================================================= Chat */

export interface ChatMessage extends Message {
  reactions: MessageReaction[]
  links: MessageLink[]
}

export async function listMessages(
  projectId: string,
  before?: string,
  limit = 40,
): Promise<ChatMessage[]> {
  let q = supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (before) q = q.lt('created_at', before)
  const { data, error } = await q
  if (error) throw new Error(tg('fehler.nachrichten_laden', { grund: errText(error) }))

  const msgs = ((data ?? []) as Message[]).reverse()
  if (msgs.length === 0) return []
  const ids = msgs.map((m) => m.id)
  const [reacts, links] = await Promise.all([
    supabase.from('message_reactions').select('*').in('message_id', ids),
    supabase.from('message_links').select('*').in('message_id', ids),
  ])
  if (reacts.error) console.warn('[chat] Reaktionen:', reacts.error.message)
  if (links.error) console.warn('[chat] Verweise:', links.error.message)

  return msgs.map((m) => ({
    ...m,
    reactions: ((reacts.data ?? []) as MessageReaction[]).filter((r) => r.message_id === m.id),
    links: ((links.data ?? []) as MessageLink[]).filter((l) => l.message_id === m.id),
  }))
}

export async function loadMessageExtras(
  ids: string[],
): Promise<{ reactions: MessageReaction[]; links: MessageLink[] }> {
  if (ids.length === 0) return { reactions: [], links: [] }
  const [reacts, links] = await Promise.all([
    supabase.from('message_reactions').select('*').in('message_id', ids),
    supabase.from('message_links').select('*').in('message_id', ids),
  ])
  return {
    reactions: (reacts.data ?? []) as MessageReaction[],
    links: (links.data ?? []) as MessageLink[],
  }
}

export async function sendMessage(input: {
  project_id: string
  body?: string | null
  kind?: Message['kind']
  attachment_path?: string | null
  attachment_meta?: Record<string, unknown>
  reply_to?: string | null
  call_id?: string | null
  links?: Array<{ target_type: 'item' | 'tag'; target_id: string; label?: string }>
}): Promise<Message> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error(tg('fehler.nicht_angemeldet'))
  const { links, ...rest } = input
  const res = await supabase
    .from('messages')
    .insert({ ...rest, sender_id: auth.user.id })
    .select('*')
    .single()
  const msg = unwrap(res, 'fehler.nachricht_senden') as Message

  if (links?.length) {
    const { error } = await supabase.from('message_links').insert(
      links.map((l) => ({
        message_id: msg.id,
        project_id: input.project_id,
        target_type: l.target_type,
        target_id: l.target_id,
        label: l.label ?? null,
      })),
    )
    if (error) console.warn('[chat] Verweise nicht gespeichert:', errText(error))
  }
  return msg
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString(), body: null })
    .eq('id', id)
  if (error) throw new Error(tg('fehler.nachricht_loeschen', { grund: errText(error) }))
}

export async function editMessage(id: string, body: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ body, edited_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(tg('fehler.nachricht_aendern', { grund: errText(error) }))
}

export async function toggleReaction(
  projectId: string,
  messageId: string,
  emoji: string,
  on: boolean,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error(tg('fehler.nicht_angemeldet'))
  if (on) {
    const { error } = await supabase
      .from('message_reactions')
      .insert({ message_id: messageId, user_id: auth.user.id, emoji, project_id: projectId })
    if (error && !String(error.message).includes('duplicate'))
      throw new Error(tg('fehler.reaktion_setzen', { grund: errText(error) }))
  } else {
    const { error } = await supabase
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', auth.user.id)
      .eq('emoji', emoji)
    if (error) throw new Error(tg('fehler.reaktion_entfernen', { grund: errText(error) }))
  }
}

export async function countUnread(projectId: string, since: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gt('created_at', since)
  if (error) {
    console.warn('[chat] Ungelesene nicht gezaehlt:', errText(error))
    return 0
  }
  return count ?? 0
}

/* ================================================================ Anrufe */

export async function createCall(projectId: string, video: boolean, invitees: string[]): Promise<Call> {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error(tg('fehler.nicht_angemeldet'))
  const res = await supabase
    .from('calls')
    .insert({ project_id: projectId, video, created_by: auth.user.id })
    .select('*')
    .single()
  const call = unwrap(res, 'fehler.anruf_starten') as Call

  const rows = [
    { call_id: call.id, user_id: auth.user.id, state: 'joined', joined_at: new Date().toISOString() },
    ...invitees
      .filter((u) => u !== auth.user!.id)
      .map((u) => ({ call_id: call.id, user_id: u, state: 'invited' })),
  ]
  const { error } = await supabase.from('call_participants').insert(rows)
  if (error) throw new Error(tg('fehler.teilnehmer_eintragen', { grund: errText(error) }))
  return call
}

export async function setCallStatus(callId: string, status: Call['status']): Promise<void> {
  const patch: Partial<Call> = { status }
  if (status === 'active') patch.started_at = new Date().toISOString()
  if (status === 'ended' || status === 'declined' || status === 'missed')
    patch.ended_at = new Date().toISOString()
  const { error } = await supabase.from('calls').update(patch).eq('id', callId)
  if (error) throw new Error(tg('fehler.anruf_aendern', { grund: errText(error) }))
}

export async function setParticipantState(
  callId: string,
  userId: string,
  state: CallParticipant['state'],
): Promise<void> {
  const patch: Partial<CallParticipant> = { state }
  if (state === 'joined') patch.joined_at = new Date().toISOString()
  if (state === 'left' || state === 'declined') patch.left_at = new Date().toISOString()
  const { error } = await supabase
    .from('call_participants')
    .update(patch)
    .eq('call_id', callId)
    .eq('user_id', userId)
  if (error) throw new Error(tg('fehler.teilnehmer_aendern', { grund: errText(error) }))
}

export async function getCall(callId: string): Promise<{ call: Call; parts: CallParticipant[] }> {
  const [c, p] = await Promise.all([
    supabase.from('calls').select('*').eq('id', callId).maybeSingle(),
    supabase.from('call_participants').select('*').eq('call_id', callId),
  ])
  if (c.error) throw new Error(tg('fehler.anruf_laden', { grund: errText(c.error) }))
  if (!c.data) throw new Error(tg('fehler.anruf_fehlt'))
  return { call: c.data as Call, parts: (p.data ?? []) as CallParticipant[] }
}

/* ================================================================= Push */

export async function getPrefs(userId: string): Promise<NotificationPrefs> {
  const res = await supabase
    .from('notification_prefs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (res.error) throw new Error(tg('fehler.prefs_laden', { grund: errText(res.error) }))
  if (res.data) return res.data as NotificationPrefs
  const created = await supabase
    .from('notification_prefs')
    .insert({ user_id: userId })
    .select('*')
    .single()
  return unwrap(created, 'fehler.prefs_anlegen') as NotificationPrefs
}

export async function setPrefs(
  userId: string,
  patch: Partial<NotificationPrefs>,
): Promise<void> {
  const { error } = await supabase.from('notification_prefs').update(patch).eq('user_id', userId)
  if (error) throw new Error(tg('fehler.prefs_speichern', { grund: errText(error) }))
}

/* ============================================================== Profile */

export async function listProfiles(ids: string[]): Promise<Map<string, Profile>> {
  const map = new Map<string, Profile>()
  const unique = [...new Set(ids.filter(Boolean))]
  if (unique.length === 0) return map
  const res = await supabase.from('profiles').select('*').in('id', unique)
  if (res.error) {
    console.warn('[profiles] konnten nicht geladen werden:', res.error.message)
    return map
  }
  for (const p of (res.data ?? []) as Profile[]) map.set(p.id, p)
  return map
}
