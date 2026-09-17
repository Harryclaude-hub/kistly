/* Prueft die Kernlogik gegen das echte Supabase-Projekt.
 *
 * Legt einen Testnutzer an, baut einen Umzug mit Zimmern und Kisten,
 * kontrolliert die Codevergabe, aendert Groesse und Zimmer, prueft die
 * Code-Historie und raeumt am Ende alles wieder weg.
 *
 * Aufruf:  node scripts/smoketest.mjs
 * Liest .env.local. Schreibt nur in ein Projekt, das es selbst anlegt.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function loadEnv() {
  const file = path.join(ROOT, '.env.local')
  if (!fs.existsSync(file)) {
    console.error('.env.local fehlt. Lege sie nach dem Muster von .env.example an.')
    process.exit(1)
  }
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) env[m[1]] = m[2]
  }
  return env
}

const env = loadEnv()
const URL_BASE = env.VITE_SUPABASE_URL
const KEY = env.VITE_SUPABASE_ANON_KEY
if (!URL_BASE || !KEY) {
  console.error('VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt in .env.local')
  process.exit(1)
}

let token = null
let passed = 0
let failed = 0

function check(name, ok, detail = '') {
  if (ok) {
    passed++
    console.log(`  ok    ${name}`)
  } else {
    failed++
    console.log(`  FEHLT ${name}${detail ? '  ->  ' + detail : ''}`)
  }
}

async function api(pathname, { method = 'GET', body, headers = {}, prefer } = {}) {
  const res = await fetch(`${URL_BASE}${pathname}`, {
    method,
    headers: {
      apikey: KEY,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { ok: res.ok, status: res.status, data }
}

const rest = (p, opts) => api(`/rest/v1${p}`, opts)
const rpc = (fn, args) => api(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args })

async function main() {
  console.log('Kistly Smoketest gegen', URL_BASE)
  const stamp = Date.now()
  // Fester Testzugang. Er wird einmal per SQL angelegt (siehe README) und
  // hier nur benutzt. So laeuft der Test auch dann, wenn das Projekt noch
  // eine E-Mail-Bestaetigung verlangt.
  const email = process.env.SMOKE_EMAIL ?? 'smoketest@kistly.app'
  const password = process.env.SMOKE_PASSWORD ?? 'Smoketest-2026-kistly'

  // ------------------------------------------------------------ Anmeldung
  console.log('\n1. Anmelden als', email)
  const login = await api('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  })
  check('Anmeldung angenommen', login.ok, JSON.stringify(login.data).slice(0, 220))
  if (!login.ok) {
    console.log(
      '\n  Der Testzugang fehlt. Lege ihn einmalig im SQL-Editor an:\n' +
        "  insert into auth.users (instance_id, id, aud, role, email, encrypted_password,\n" +
        "    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)\n" +
        "  values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(),\n" +
        "    'authenticated', 'authenticated', 'smoketest@kistly.app',\n" +
        "    crypt('Smoketest-2026-kistly', gen_salt('bf')), now(), now(), now(),\n" +
        "    '{\"provider\":\"email\",\"providers\":[\"email\"]}'::jsonb, '{}'::jsonb);",
    )
    return
  }

  token = login.data?.access_token ?? null
  check('Sitzung vorhanden', Boolean(token))
  if (!token) return

  const userId = login.data?.user?.id
  const profile = await rest(`/profiles?id=eq.${userId}&select=*`)
  check('Profil ist vorhanden', Array.isArray(profile.data) && profile.data.length === 1)

  // -------------------------------------------------------------- Projekt
  console.log('\n2. Umzug anlegen')
  const created = await rpc('create_project', {
    p_name: `Smoketest ${stamp}`,
    p_note: 'wird gleich wieder geloescht',
    p_with_defaults: true,
  })
  check('create_project lief durch', created.ok, JSON.stringify(created.data).slice(0, 200))
  if (!created.ok) return
  const project = created.data
  const pid = project.id

  const tags = await rest(`/tags?project_id=eq.${pid}&select=*&order=sort`)
  check('Standardzimmer angelegt', (tags.data ?? []).length === 7, `${(tags.data ?? []).length} statt 7`)
  const wohn = (tags.data ?? []).find((t) => t.short === 'W')
  const kinder = (tags.data ?? []).find((t) => t.short === 'KZ')
  check('Wohnzimmer hat Kuerzel W', Boolean(wohn))

  const members = await rest(`/project_members?project_id=eq.${pid}&select=*`)
  check(
    'Ersteller ist Besitzer',
    (members.data ?? []).length === 1 && members.data[0].role === 'owner',
  )

  // --------------------------------------------------------------- Person
  console.log('\n3. Person anlegen')
  const person = await rest('/tags', {
    method: 'POST',
    prefer: 'return=representation',
    body: { project_id: pid, kind: 'person', name: 'Sara', short: 'S', color: '#EC4899' },
  })
  check('Person angelegt', person.ok, JSON.stringify(person.data).slice(0, 200))
  const personId = person.data?.[0]?.id

  const clash = await rest('/tags', {
    method: 'POST',
    prefer: 'return=representation',
    body: { project_id: pid, kind: 'room', name: 'Zweites W', short: 'W', color: '#000000' },
  })
  check('Doppeltes Kuerzel wird abgelehnt', !clash.ok, `Status ${clash.status}`)

  // --------------------------------------------------------------- Kisten
  console.log('\n4. Kisten und Codevergabe')
  const mk = (body) =>
    rest('/items', { method: 'POST', prefer: 'return=representation', body }).then((r) => r.data?.[0])

  const i1 = await mk({ project_id: pid, room_id: wohn.id, size: 3 })
  const i2 = await mk({ project_id: pid, room_id: wohn.id, size: 3 })
  const i3 = await mk({ project_id: pid, room_id: wohn.id, size: 7 })
  const i4 = await mk({ project_id: pid, room_id: kinder.id, size: 5 })
  const i5 = await mk({ project_id: pid, person_id: personId, code_source: 'person', size: 1 })

  check('erste Kiste ist W-3-001', i1?.code === 'W-3-001', i1?.code)
  check('zweite Kiste ist W-3-002', i2?.code === 'W-3-002', i2?.code)
  check('dritte Kiste ist W-7-003', i3?.code === 'W-7-003', i3?.code)
  check('Kinderzimmer faengt bei KZ-5-001 an', i4?.code === 'KZ-5-001', i4?.code)
  check('Person bekommt S-1-001', i5?.code === 'S-1-001', i5?.code)
  check('Laufnummer je Kuerzel getrennt', i4?.seq === 1 && i3?.seq === 3)

  const ohne = await rest('/items', {
    method: 'POST',
    prefer: 'return=representation',
    body: { project_id: pid, size: 5 },
  })
  check('Kiste ohne Zimmer und Person wird abgelehnt', !ohne.ok, `Status ${ohne.status}`)

  // Kiste mit Zimmer UND Person, Kuerzel der Person voran
  const beides = await mk({
    project_id: pid,
    room_id: wohn.id,
    person_id: personId,
    code_source: 'person',
    size: 4,
  })
  check('Zimmer und Person zusammen moeglich', Boolean(beides), JSON.stringify(beides).slice(0, 120))
  check('Kuerzel der Person steht vorne', beides?.code === 'S-4-002', beides?.code)

  // ------------------------------------------------------ Code neu vergeben
  console.log('\n5. Groesse aendern, Code wandert mit')
  const upd = await rest(`/items?id=eq.${i1.id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { size: 9 },
  })
  const i1b = upd.data?.[0]
  check('neue Groesse ergibt neuen Code', i1b?.code === 'W-9-001', i1b?.code)
  check('Laufnummer bleibt gleich', i1b?.seq === 1)

  const hist = await rest(`/item_code_history?item_id=eq.${i1.id}&select=*`)
  check('alter Code wurde aufgehoben', (hist.data ?? []).some((h) => h.code === 'W-3-001'))

  const alt = await rpc('resolve_code', { p_project: pid, p_code: 'W-3-001' })
  check(
    'alter Code wird noch gefunden',
    (alt.data ?? []).some((r) => r.item_id === i1.id && r.is_old === true),
    JSON.stringify(alt.data).slice(0, 160),
  )
  const neu = await rpc('resolve_code', { p_project: pid, p_code: 'w-9-001' })
  check(
    'neuer Code wird gefunden, Gross und Klein egal',
    (neu.data ?? []).some((r) => r.item_id === i1.id && r.is_old === false),
  )

  console.log('\n6. Zimmerwechsel')
  const moved = await rest(`/items?id=eq.${i2.id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { room_id: kinder.id },
  })
  check('Zimmerwechsel ergibt neue Reihe', moved.data?.[0]?.code === 'KZ-3-002', moved.data?.[0]?.code)

  // ---------------------------------------------------------------- Status
  console.log('\n7. Status und Verlauf')
  const arrived = await rest(`/items?id=eq.${i4.id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { status: 'arrived' },
  })
  check('Status angekommen gesetzt', arrived.data?.[0]?.status === 'arrived')
  check('Ankunftszeit gesetzt', Boolean(arrived.data?.[0]?.arrived_at))

  const events = await rest(`/item_events?item_id=eq.${i4.id}&select=*&order=created_at`)
  check(
    'Verlauf enthaelt Anlegen und Statuswechsel',
    (events.data ?? []).some((e) => e.type === 'created') &&
      (events.data ?? []).some((e) => e.type === 'status'),
  )

  const stats = await rest(`/project_stats?project_id=eq.${pid}&select=*`)
  const st = stats.data?.[0]
  check('Zaehlwerte stimmen', st?.items_total === 6 && st?.items_arrived === 1, JSON.stringify(st))

  const tagStats = await rpc('tag_stats', { p_project: pid })
  const wohnStat = (tagStats.data ?? []).find((r) => r.tag_id === wohn.id)
  // Drei Kisten haengen am Wohnzimmer: zwei reine, plus die mit Zimmer und Person.
  check('Zaehlwerte je Bereich stimmen', Number(wohnStat?.total) === 3, JSON.stringify(wohnStat))

  // ----------------------------------------------------------- Inhalt, Chat
  console.log('\n8. Inhalt, Einladung, Chat')
  const content = await rest('/item_contents', {
    method: 'POST',
    prefer: 'return=representation',
    body: { item_id: i1.id, project_id: pid, text: 'Buecher', qty: 3 },
  })
  check('Inhalt angelegt', content.ok, JSON.stringify(content.data).slice(0, 160))
  check('project_id kommt vom Trigger', content.data?.[0]?.project_id === pid)

  const invite = await rest('/project_invites', {
    method: 'POST',
    prefer: 'return=representation',
    body: { project_id: pid, code: `T${stamp.toString(36).toUpperCase()}`, role: 'editor' },
  })
  check('Einladung angelegt', invite.ok, JSON.stringify(invite.data).slice(0, 160))

  const msg = await rest('/messages', {
    method: 'POST',
    prefer: 'return=representation',
    body: { project_id: pid, sender_id: userId, kind: 'text', body: 'Hallo aus dem Smoketest' },
  })
  check('Nachricht gesendet', msg.ok, JSON.stringify(msg.data).slice(0, 160))

  const reaction = await rest('/message_reactions', {
    method: 'POST',
    prefer: 'return=representation',
    body: { message_id: msg.data?.[0]?.id, user_id: userId, emoji: '👍', project_id: pid },
  })
  check('Reaktion gesetzt', reaction.ok, JSON.stringify(reaction.data).slice(0, 160))

  // ------------------------------------------------------------ Abschottung
  console.log('\n9. Abschottung')
  /* Nicht auf genau ein Projekt pruefen. Der Testzugang kann noch andere
   * eigene Umzuege haben. Entscheidend ist, dass zu jedem sichtbaren Umzug
   * auch eine eigene Mitgliedschaft existiert, und dass kein fremder
   * durchrutscht. */
  const sichtbar = await rest('/projects?select=id')
  const meine = await rest(`/project_members?user_id=eq.${userId}&select=project_id`)
  const meineIds = new Set((meine.data ?? []).map((m) => m.project_id))
  check(
    'sieht nur Umzuege, in denen man Mitglied ist',
    Array.isArray(sichtbar.data) &&
      sichtbar.data.length > 0 &&
      sichtbar.data.every((p) => meineIds.has(p.id)),
    `${(sichtbar.data ?? []).length} sichtbar, ${meineIds.size} Mitgliedschaften`,
  )

  const savedToken = token
  token = null
  const anonym = await rest('/items?select=*')
  check(
    'ohne Anmeldung keine Kisten',
    !anonym.ok || (Array.isArray(anonym.data) && anonym.data.length === 0),
    `Status ${anonym.status}`,
  )
  const anonRpc = await rpc('create_project', { p_name: 'Einbruch' })
  check('ohne Anmeldung kein Projekt anlegen', !anonRpc.ok, `Status ${anonRpc.status}`)
  token = savedToken

  const fremdCounter = await rpc('next_seq', {
    p_project: '00000000-0000-0000-0000-000000000000',
    p_prefix: 'X',
  })
  check('fremder Zaehler ist gesperrt', !fremdCounter.ok, `Status ${fremdCounter.status}`)

  // ------------------------------------------------- Moebel und Markieren
  console.log('\n10. Moebel, Markierungen und Zusammenfuehren')

  const moebel = await mk({
    project_id: pid,
    room_id: wohn.id,
    kind: 'furniture',
    size: 9,
    title: 'Esstisch',
    hersteller: 'IKEA',
    modell: 'NORDEN',
    masse: '180 x 90 x 75 cm',
    zerlegt: true,
  })
  check('Moebel angelegt', Boolean(moebel), JSON.stringify(moebel).slice(0, 140))
  check('Moebel ist ein Eintrag mit kind furniture', moebel?.kind === 'furniture')
  check('Moebel bekommt denselben Codeaufbau', /^W-9-\d{3}$/.test(moebel?.code ?? ''), moebel?.code)
  check('Herstellerangaben gespeichert', moebel?.hersteller === 'IKEA' && moebel?.modell === 'NORDEN')
  check('Masse und zerlegt gespeichert', moebel?.masse === '180 x 90 x 75 cm' && moebel?.zerlegt === true)

  // Teilekatalog zum Nachzaehlen ist die vorhandene Inhaltsliste
  const teile = await rest('/item_contents', {
    method: 'POST',
    prefer: 'return=representation',
    body: [
      { item_id: moebel.id, project_id: pid, text: 'Tischbein', qty: 4 },
      { item_id: moebel.id, project_id: pid, text: 'Schraube M6', qty: 16 },
    ],
  })
  check('Teilekatalog angelegt', teile.ok && (teile.data ?? []).length === 2,
    JSON.stringify(teile.data).slice(0, 140))

  // Aufbauanleitung als eigener Eintrag, getrennt von den Fotos
  const anleitung = await rest('/item_photos', {
    method: 'POST',
    prefer: 'return=representation',
    body: { item_id: moebel.id, project_id: pid, path: `${pid}/${moebel.id}/anleitung.pdf`, art: 'anleitung' },
  })
  check('Anleitung als eigener Eintrag', anleitung.ok && anleitung.data?.[0]?.art === 'anleitung',
    JSON.stringify(anleitung.data).slice(0, 140))

  const foto = await rest('/item_photos', {
    method: 'POST',
    prefer: 'return=representation',
    body: { item_id: moebel.id, project_id: pid, path: `${pid}/${moebel.id}/vorne.jpg`, seite: 'vorne' },
  })
  check('Foto mit Seitenangabe, art faellt auf foto zurueck',
    foto.data?.[0]?.seite === 'vorne' && foto.data?.[0]?.art === 'foto',
    JSON.stringify(foto.data).slice(0, 140))

  const falscheArt = await rest('/item_photos', {
    method: 'POST',
    body: { item_id: moebel.id, project_id: pid, path: 'x.jpg', art: 'unfug' },
  })
  check('Unbekannte Fotoart wird abgelehnt', !falscheArt.ok, `Status ${falscheArt.status}`)

  const nurAnleitung = await rest(`/item_photos?item_id=eq.${moebel.id}&art=eq.anleitung&select=id`)
  check('Anleitungen getrennt abrufbar', (nurAnleitung.data ?? []).length === 1)

  // ----------------------------------------------------------- Deckbild
  const fotoId = foto.data?.[0]?.id
  const deck = await rest(`/items?id=eq.${moebel.id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { cover_photo_id: fotoId },
  })
  check('Deckbild gesetzt', deck.data?.[0]?.cover_photo_id === fotoId,
    JSON.stringify(deck.data).slice(0, 140))

  // Ein Deckbild, das zu einer anderen Kiste gehoert, muss die Datenbank
  // ablehnen. Sonst zeigt eine Kiste beim Scannen das Bild einer anderen.
  const fremdesDeck = await rest(`/items?id=eq.${i3.id}`, {
    method: 'PATCH',
    body: { cover_photo_id: fotoId },
  })
  check('Fremdes Deckbild wird abgelehnt', !fremdesDeck.ok, `Status ${fremdesDeck.status}`)

  const totesDeck = await rest(`/items?id=eq.${moebel.id}`, {
    method: 'PATCH',
    body: { cover_photo_id: '00000000-0000-0000-0000-000000000000' },
  })
  check('Deckbild ohne Foto wird abgelehnt', !totesDeck.ok, `Status ${totesDeck.status}`)

  // Wird das Foto geloescht, darf kein Verweis ins Leere zurueckbleiben.
  await rest(`/item_photos?id=eq.${fotoId}`, { method: 'DELETE' })
  const nachLoeschen = await rest(`/items?id=eq.${moebel.id}&select=cover_photo_id`)
  check('Geloeschtes Foto nimmt das Deckbild mit',
    nachLoeschen.data?.[0]?.cover_photo_id === null,
    JSON.stringify(nachLoeschen.data).slice(0, 140))

  // Markieren wie in Excel. Die Markierung gehoert der Zeile, nicht dem Zimmer.
  const markiert = await rest(`/items?id=eq.${moebel.id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { mark_color: '#F59E0B', mark_symbol: 'stern' },
  })
  check('Markierung gespeichert',
    markiert.data?.[0]?.mark_color === '#F59E0B' && markiert.data?.[0]?.mark_symbol === 'stern',
    JSON.stringify(markiert.data).slice(0, 140))
  const farbeDanach = await rest(`/tags?id=eq.${wohn.id}&select=color`)
  check('Zimmerfarbe bleibt unberuehrt', farbeDanach.data?.[0]?.color === wohn.color)

  const tagSymbol = await rest(`/tags?id=eq.${wohn.id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { symbol: 'stern' },
  })
  check('Symbol am Bereich gespeichert', tagSymbol.data?.[0]?.symbol === 'stern')

  // Unbekannte Werte muessen abgelehnt werden. Sonst stuende spaeter
  // woertlich marken.symbol_sofa auf dem Bildschirm, oder das Zeichen
  // verschwaende spurlos, je nachdem welche Stelle es anzeigt.
  const falschesSymbol = await rest(`/tags?id=eq.${wohn.id}`, {
    method: 'PATCH',
    body: { symbol: 'sofa' },
  })
  check('Unbekanntes Bereichssymbol wird abgelehnt', !falschesSymbol.ok,
    `Status ${falschesSymbol.status}`)

  const falschesMarkSymbol = await rest(`/items?id=eq.${moebel.id}`, {
    method: 'PATCH',
    body: { mark_symbol: 'sofa' },
  })
  check('Unbekanntes Markierungszeichen wird abgelehnt', !falschesMarkSymbol.ok,
    `Status ${falschesMarkSymbol.status}`)

  const falscheFarbe = await rest(`/items?id=eq.${moebel.id}`, {
    method: 'PATCH',
    body: { mark_color: 'rot' },
  })
  check('Unbrauchbare Markierungsfarbe wird abgelehnt', !falscheFarbe.ok,
    `Status ${falscheFarbe.status}`)

  // Moebel und Kisten sauber auseinanderhalten
  const nurKisten = await rest(`/items?project_id=eq.${pid}&kind=neq.furniture&select=id`)
  const nurMoebel = await rest(`/items?project_id=eq.${pid}&kind=eq.furniture&select=id`)
  check('Kisten und Moebel getrennt abrufbar',
    (nurMoebel.data ?? []).length === 1 && (nurKisten.data ?? []).length === 6,
    `${(nurKisten.data ?? []).length} Kisten, ${(nurMoebel.data ?? []).length} Moebel`)

  // ------------------------------------------------- Zimmer zusammenfuehren
  const vorher = await rest(`/items?project_id=eq.${pid}&room_id=eq.${kinder.id}&select=id`)
  const anzahlKinder = (vorher.data ?? []).length
  const wohnVorher = (await rest(`/items?project_id=eq.${pid}&room_id=eq.${wohn.id}&select=id`)).data ?? []
  check('Vorher stehen zwei Kisten im Kinderzimmer', anzahlKinder === 2, String(anzahlKinder))

  const selbst = await rpc('merge_tags', { p_von: wohn.id, p_nach: wohn.id })
  check('Bereich mit sich selbst zusammenfuehren wird abgelehnt', !selbst.ok, `Status ${selbst.status}`)
  const gemischt = await rpc('merge_tags', { p_von: personId, p_nach: wohn.id })
  check('Person und Zimmer lassen sich nicht mischen', !gemischt.ok, `Status ${gemischt.status}`)

  // Eine fremde oder erfundene Kennung darf keine Auskunft geben. Die
  // Antwort muss dieselbe sein wie bei fehlender Berechtigung.
  const erfunden = await rpc('merge_tags', {
    p_von: '00000000-0000-0000-0000-000000000000',
    p_nach: wohn.id,
  })
  check('Unbekannter Bereich verraet nichts', !erfunden.ok &&
    JSON.stringify(erfunden.data).includes('Berechtigung'),
    JSON.stringify(erfunden.data).slice(0, 160))

  const verschmolzen = await rpc('merge_tags', { p_von: kinder.id, p_nach: wohn.id })
  check('merge_tags lief durch', verschmolzen.ok, JSON.stringify(verschmolzen.data).slice(0, 160))
  check('Anzahl umgehaengter Eintraege stimmt', Number(verschmolzen.data) === anzahlKinder,
    `${verschmolzen.data} statt ${anzahlKinder}`)

  const wegGeraeumt = await rest(`/tags?id=eq.${kinder.id}&select=id`)
  check('Zusammengefuehrter Bereich ist weg', (wegGeraeumt.data ?? []).length === 0)

  const wohnNachher =
    (await rest(`/items?project_id=eq.${pid}&room_id=eq.${wohn.id}&select=id,code,code_source`)).data ?? []
  check('Nichts ist verloren gegangen',
    wohnNachher.length === wohnVorher.length + anzahlKinder,
    `${wohnNachher.length} statt ${wohnVorher.length + anzahlKinder}`)
  check('Codes tragen jetzt das Kuerzel des Zielzimmers',
    wohnNachher.filter((i) => i.code_source === 'room').every((i) => i.code.startsWith('W-')),
    wohnNachher.map((i) => i.code).join(' '))

  const altFindbar = await rpc('resolve_code', { p_project: pid, p_code: 'KZ-5-001' })
  check('Etikett aus dem alten Zimmer bleibt scannbar',
    (altFindbar.data ?? []).some((r) => r.is_old === true),
    JSON.stringify(altFindbar.data).slice(0, 160))

  // ------------------------------------------- Inhalt in eine andere Kiste
  const inhalte = await rest(`/item_contents?item_id=eq.${moebel.id}&text=eq.Tischbein&select=id`)
  const umgehaengt = await rest(`/item_contents?id=eq.${inhalte.data?.[0]?.id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: { item_id: i3.id, project_id: pid },
  })
  check('Inhalt in andere Kiste umgehaengt', umgehaengt.data?.[0]?.item_id === i3.id,
    JSON.stringify(umgehaengt.data).slice(0, 140))
  const restKatalog = await rest(`/item_contents?item_id=eq.${moebel.id}&select=id`)
  check('Im Katalog bleibt genau ein Teil zurueck', (restKatalog.data ?? []).length === 1)

  // --------------------------------------------- Fotos am Zimmer und Quelle
  const zimmerFoto = await rest('/item_photos', {
    method: 'POST',
    prefer: 'return=representation',
    body: { tag_id: wohn.id, path: `${pid}/zimmer/${wohn.id}.jpg` },
  })
  check('Foto am Zimmer moeglich', zimmerFoto.ok && zimmerFoto.data?.[0]?.tag_id === wohn.id,
    JSON.stringify(zimmerFoto.data).slice(0, 140))
  check('Umzug am Zimmerfoto kommt aus dem Bereich',
    zimmerFoto.data?.[0]?.project_id === pid)

  // Ein Foto muss zu genau einem Ziel gehoeren, nicht zu beiden und nicht
  // zu keinem. Sonst haengt es irgendwo und taucht nirgends auf.
  const beidesFoto = await rest('/item_photos', {
    method: 'POST',
    body: { item_id: i3.id, tag_id: wohn.id, path: 'x.jpg' },
  })
  check('Foto an Kiste UND Zimmer wird abgelehnt', !beidesFoto.ok, `Status ${beidesFoto.status}`)

  const keinZiel = await rest('/item_photos', { method: 'POST', body: { path: 'y.jpg' } })
  check('Foto ohne Ziel wird abgelehnt', !keinZiel.ok, `Status ${keinZiel.status}`)

  // Ein mitgeschicktes project_id darf nie zaehlen, die RLS haengt daran.
  const gefaelscht = await rest('/item_photos', {
    method: 'POST',
    prefer: 'return=representation',
    body: { item_id: i3.id, path: 'z.jpg', project_id: '00000000-0000-0000-0000-000000000000' },
  })
  check('Mitgeschickter Umzug wird ueberschrieben',
    gefaelscht.ok && gefaelscht.data?.[0]?.project_id === pid,
    JSON.stringify(gefaelscht.data).slice(0, 140))

  const quelle = await rest('/item_contents', {
    method: 'POST',
    prefer: 'return=representation',
    body: { item_id: i3.id, project_id: pid, text: 'Aus dem Bild', quelle: 'bild' },
  })
  check('Inhalt kann aus einem Bild stammen', quelle.data?.[0]?.quelle === 'bild')

  const falscheQuelle = await rest('/item_contents', {
    method: 'POST',
    body: { item_id: i3.id, project_id: pid, text: 'Unfug', quelle: 'zauberei' },
  })
  check('Unbekannte Quelle wird abgelehnt', !falscheQuelle.ok, `Status ${falscheQuelle.status}`)

  const restZahl = await rpc('bild_lesen_rest', { p_project: pid, p_user: userId })
  const frei = Array.isArray(restZahl.data) ? restZahl.data[0] : restZahl.data
  check('Restguthaben abfragbar', restZahl.ok && Number(frei?.rest_projekt) > 0,
    JSON.stringify(restZahl.data).slice(0, 140))

  // ------------------------------------------------------------- Aufraeumen
  console.log('\n11. Aufraeumen')
  const del = await rest(`/projects?id=eq.${pid}`, { method: 'DELETE' })
  check('Umzug geloescht', del.ok, `Status ${del.status}`)
  const rest_items = await rest(`/items?project_id=eq.${pid}&select=id`)
  check('Kisten sind mitgeloescht', (rest_items.data ?? []).length === 0)

}

/** Ergebnis melden. Steht ausserhalb von main(), damit es auch nach einem
 *  fruehen return laeuft. Vorher konnte der Test mit Code 0 enden, obwohl
 *  die Anmeldung fehlgeschlagen war und nichts geprueft wurde. Ein
 *  gruener Lauf, der nichts geprueft hat, ist der teuerste Fehlertyp. */
function auswerten() {
  console.log(`\nErgebnis: ${passed} ok, ${failed} fehlgeschlagen`)
  if (passed === 0) console.error('Kein einziger Test ist gelaufen.')
  if (failed > 0 || passed === 0) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error('\nAbbruch:', err)
    process.exitCode = 1
  })
  .finally(auswerten)
