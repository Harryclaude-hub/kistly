/* Bilderkennung fuer Kistly.
 *
 * Nimmt Fotos, die schon im Speicher liegen, und laesst ein Bildmodell
 * sagen, was darauf zu sehen ist. Das Ergebnis kommt als Liste zurueck
 * und wird in photo_analyses abgelegt, damit dasselbe Bild nicht zweimal
 * Geld kostet.
 *
 * Warum hier und nicht im Browser:
 *  - Der Schluessel bleibt auf dem Server. Im Browser waere er fuer jeden
 *    lesbar, der die Seite oeffnet.
 *  - Die Mitgliedschaft wird geprueft, bevor irgendetwas gelesen wird.
 *
 * Was hier NICHT passiert: es wird nichts in die Inhaltsliste
 * geschrieben. Die Funktion liefert Vorschlaege, uebernommen wird im
 * Browser, Zeile fuer Zeile, von Hand.
 *
 * Kosten: jede Auswertung kostet Geld, und zwar den Besitzer des
 * Schluessels. Darum die Bremse ueber bild_lesen_rest und das Protokoll
 * in bild_lesen_log. Ohne die beiden darf diese Funktion nicht laufen.
 *
 * Aufruf:
 *   POST { project_id, photo_ids: string[], sprache: 'de'|'ar', was }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

/** Mehr Bilder auf einmal kosten mehr und dauern laenger, ohne dass es
 *  jemandem hilft. Wer zwanzig Bilder hat, drueckt eben mehrmals. */
const MAX_BILDER = 4
/** Groesser nimmt die Schnittstelle ohnehin nicht an. Die App verkleinert
 *  schon vor dem Hochladen, das hier ist die Rueckfallgrenze. */
const MAX_BYTES = 5 * 1024 * 1024
/** Ueberschreibbar ueber ANTHROPIC_MODELL, damit ein Modellwechsel kein
 *  neues Ausliefern braucht. */
const MODELL_STANDARD = 'claude-sonnet-5'

/* Wer darf diese Funktion von einer Seite aus aufrufen. Ein Stern waere
 * bequem und falsch: die Funktion gibt Daten zurueck und kostet Geld pro
 * Aufruf. Ueberschreibbar ueber das Geheimnis APP_ORIGINS. */
const HERKUNFT_STANDARD = [
  'https://harryclaude-hub.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function corsFuer(req: Request): Record<string, string> {
  const erlaubt = (Deno.env.get('APP_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const liste = erlaubt.length > 0 ? erlaubt : HERKUNFT_STANDARD
  const herkunft = req.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': liste.includes(herkunft) ? herkunft : liste[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

type Sprache = 'de' | 'ar'
type Was = 'kiste' | 'moebel' | 'zimmer'

interface Body {
  project_id?: string
  photo_ids?: string[]
  sprache?: Sprache
  was?: Was
}

interface Ding {
  text: string
  menge: number
  sicherheit: number
  hinweis?: string | null
}

/* ------------------------------------------------------------ Anweisung */

const SPRACHNAME: Record<Sprache, string> = { de: 'Deutsch', ar: 'Arabisch' }

function anweisung(was: Was, sprache: Sprache): string {
  const ziel = SPRACHNAME[sprache]
  const gemeinsam =
    `Antworte ausschließlich auf ${ziel}. Auch jeder einzelne Gegenstandsname ist auf ${ziel}. ` +
    `EINE Ausnahme: Text, der im Bild selbst steht, also Aufdrucke, Marken, Modellnamen und Etiketten, ` +
    `übernimmst du Zeichen für Zeichen so, wie er dasteht. Übersetze ihn nicht und schreibe ihn nicht um. ` +
    `Aus IKEA Kallax wird nie etwas anderes, aus Bosch keine Umschrift. ` +
    `Benutze sonst alltägliche Wörter, so wie jemand sie auf einen Zettel schreiben würde, keine Fachsprache. ` +
    `Fasse zusammen, was zusammengehört: zehn Bücher sind ein Eintrag mit Menge 10, nicht zehn Einträge. ` +
    `Zähle nur, was du wirklich siehst. Rate nicht, was unter anderen Dingen liegen könnte. ` +
    `Bist du dir bei etwas unsicher, nimm es trotzdem auf und gib eine niedrige Sicherheit an. ` +
    `Weglassen wäre schlimmer: was fehlt, sucht später jemand vergeblich. ` +
    `Notiere bei hinweis nur, was beim Tragen zählt, etwa zerbrechlich oder schwer. Sonst lass es weg.`

  if (was === 'moebel') {
    return (
      `Auf dem Bild ist ein Möbelstück, das für einen Umzug erfasst wird. ` +
      `Nenne das Stück selbst und die einzelnen Teile, die zu sehen sind ` +
      `(Bretter, Beine, Schrauben, Schlüssel, Beschläge), damit man sie beim Aufbauen nachzählen kann. ` +
      gemeinsam
    )
  }
  if (was === 'zimmer') {
    return (
      `Auf dem Bild ist ein Zimmer, das umgezogen werden soll. ` +
      `Nenne die Möbel und die größeren Gegenstände darin, also das, was eingepackt oder getragen werden muss. ` +
      `Kleinkram wie einzelne Stifte gehört nicht dazu. ` +
      gemeinsam
    )
  }
  return (
    `Auf dem Bild ist der Inhalt einer Umzugskiste, oder eine offene Kiste von oben. ` +
    `Nenne, was darin liegt. ` +
    gemeinsam
  )
}

const WERKZEUG = {
  name: 'dinge_melden',
  description: 'Meldet, was auf dem Bild zu sehen ist.',
  input_schema: {
    type: 'object',
    properties: {
      dinge: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Name des Gegenstands, in der verlangten Sprache' },
            menge: { type: 'integer', minimum: 1, description: 'Wie viele davon zu sehen sind' },
            sicherheit: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Wie sicher du bist, 0 bis 1',
            },
            hinweis: {
              type: 'string',
              description: 'Nur wenn es beim Tragen zählt, sonst weglassen',
            },
          },
          required: ['text', 'menge', 'sicherheit'],
        },
      },
    },
    required: ['dinge'],
  },
}

/* --------------------------------------------------------------- Modell */

async function erkennen(
  schluessel: string,
  modell: string,
  bild: Uint8Array,
  typ: string,
  was: Was,
  sprache: Sprache,
): Promise<Ding[]> {
  // btoa auf sehr grossen Zeichenketten sprengt den Stapel, darum in
  // Haeppchen umwandeln.
  let roh = ''
  const schritt = 0x8000
  for (let i = 0; i < bild.length; i += schritt) {
    roh += String.fromCharCode(...bild.subarray(i, i + schritt))
  }
  const b64 = btoa(roh)

  const antwort = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': schluessel,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: modell,
      max_tokens: 2000,
      tools: [WERKZEUG],
      tool_choice: { type: 'tool', name: 'dinge_melden' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: typ, data: b64 } },
            { type: 'text', text: anweisung(was, sprache) },
          ],
        },
      ],
    }),
  })

  if (!antwort.ok) {
    const text = await antwort.text()
    throw new Error(`Bildmodell antwortete mit ${antwort.status}: ${text.slice(0, 300)}`)
  }

  const daten = (await antwort.json()) as {
    content?: Array<{ type: string; name?: string; input?: { dinge?: Ding[] } }>
  }
  const werkzeug = (daten.content ?? []).find(
    (c) => c.type === 'tool_use' && c.name === 'dinge_melden',
  )
  if (!werkzeug?.input?.dinge) {
    throw new Error('Das Bildmodell hat keine verwertbare Liste geliefert.')
  }

  // Aufraeumen, aber nichts wegwerfen. Was unsicher erkannt wurde, bleibt
  // drin und wird in der Oberflaeche als unsicher gezeigt.
  return werkzeug.input.dinge
    .filter((d) => typeof d?.text === 'string' && d.text.trim().length > 0)
    .map((d) => ({
      text: String(d.text).trim().slice(0, 200),
      menge: Number.isFinite(d.menge) ? Math.max(1, Math.min(999, Math.round(d.menge))) : 1,
      sicherheit: Number.isFinite(d.sicherheit) ? Math.max(0, Math.min(1, d.sicherheit)) : 0.5,
      hinweis: d.hinweis ? String(d.hinweis).trim().slice(0, 200) : null,
    }))
    .slice(0, 60)
}

/* ------------------------------------------------------------ Schluessel */

/** Immer BEIDE Quellen lesen, die Umgebung gewinnt je Schluessel. Das
 *  vorhandene push-send bricht ab, sobald zwei Werte in der Umgebung
 *  stehen, und liest die Tabelle dann gar nicht mehr. Genau daraus wird
 *  ein Fehler, den niemand findet. */
async function konfig(
  admin: ReturnType<typeof createClient>,
): Promise<Record<string, string | undefined>> {
  const out: Record<string, string | undefined> = {
    ANTHROPIC_API_KEY: Deno.env.get('ANTHROPIC_API_KEY') ?? undefined,
    ANTHROPIC_MODELL: Deno.env.get('ANTHROPIC_MODELL') ?? undefined,
  }
  const { data, error } = await admin.rpc('app_config')
  if (error) {
    console.warn('[bild-analyse] app_config nicht lesbar:', error.message)
    return out
  }
  for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
    out[row.key] = out[row.key] ?? row.value
  }
  return out
}

/* ------------------------------------------------------------------ Lauf */

Deno.serve(async (req: Request) => {
  const cors = corsFuer(req)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    const auth = req.headers.get('Authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return json({ error: 'Nicht angemeldet' }, 401)

    const body = (await req.json()) as Body
    const sprache: Sprache = body.sprache === 'ar' ? 'ar' : 'de'
    const was: Was = body.was === 'moebel' || body.was === 'zimmer' ? body.was : 'kiste'
    if (!body.project_id || !Array.isArray(body.photo_ids) || body.photo_ids.length === 0) {
      return json({ error: 'project_id und photo_ids sind Pflicht' }, 400)
    }
    if (body.photo_ids.length > MAX_BILDER) {
      return json({ error: `Höchstens ${MAX_BILDER} Bilder auf einmal`, code: 'zu_viele' }, 400)
    }

    /* Erst pruefen, wer fragt, dann erst lesen. Mit dem Token des
     * Aufrufers, damit die Zeilen-Sicherheit greift. */
    const asUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false },
    })
    const { data: me } = await asUser.auth.getUser()
    if (!me?.user) return json({ error: 'Nicht angemeldet' }, 401)

    const { data: mitglied, error: mitgliedFehler } = await asUser
      .from('project_members')
      .select('role')
      .eq('project_id', body.project_id)
      .eq('user_id', me.user.id)
      .maybeSingle()
    if (mitgliedFehler) return json({ error: mitgliedFehler.message }, 400)
    if (!mitglied) return json({ error: 'Kein Mitglied dieses Umzugs', code: 'kein_mitglied' }, 403)
    if (mitglied.role !== 'owner' && mitglied.role !== 'editor') {
      return json({ error: 'Nur Bearbeiter dürfen Bilder auswerten lassen', code: 'nur_lesen' }, 403)
    }

    // Die Fotos ueber den Nutzer lesen, damit auch hier die
    // Zeilen-Sicherheit greift und nicht nur unser eigener Vergleich.
    const { data: fotos, error: fotoFehler } = await asUser
      .from('item_photos')
      .select('id, path, project_id')
      .in('id', body.photo_ids)
      .eq('project_id', body.project_id)
    if (fotoFehler) return json({ error: fotoFehler.message }, 400)
    const meine = fotos ?? []
    if (meine.length === 0) {
      return json({ error: 'Keine passenden Bilder gefunden', code: 'foto_weg' }, 404)
    }

    const conf = await konfig(admin)
    const schluessel = conf.ANTHROPIC_API_KEY
    const modell = conf.ANTHROPIC_MODELL ?? MODELL_STANDARD
    if (!schluessel) {
      // Klare Ansage statt stillem Nichtstun.
      return json(
        {
          error:
            'ANTHROPIC_API_KEY fehlt. Entweder als Function Secret setzen oder in private.config eintragen. ' +
            'Ohne Schlüssel kann kein Bild ausgewertet werden.',
          code: 'kein_schluessel',
        },
        503,
      )
    }

    const ergebnisse: Array<{
      photo_id: string
      status: 'fertig' | 'fehler'
      aus_speicher: boolean
      dinge: Ding[]
      fehler?: string
    }> = []
    let uebersprungen_wegen_grenze = 0

    for (const foto of meine) {
      // Schon ausgewertet? Dann nicht noch einmal bezahlen.
      const { data: schon } = await admin
        .from('photo_analyses')
        .select('status, ergebnis')
        .eq('photo_id', foto.id)
        .eq('sprache', sprache)
        .maybeSingle()
      if (schon && schon.status === 'fertig') {
        ergebnisse.push({
          photo_id: foto.id,
          status: 'fertig',
          aus_speicher: true,
          dinge: (schon.ergebnis ?? []) as Ding[],
        })
        await admin.from('bild_lesen_log').insert({
          project_id: body.project_id,
          user_id: me.user.id,
          photo_id: foto.id,
          modell,
          bezahlt: false,
        })
        continue
      }

      /* Die Bremse wird VOR jedem bezahlten Bild neu gefragt, nicht
       * einmal am Anfang. Sonst laesst ein Aufruf mit vier Bildern die
       * Grenze um drei ueberlaufen. */
      const { data: rest } = await admin.rpc('bild_lesen_rest', {
        p_project: body.project_id,
        p_user: me.user.id,
      })
      const frei = Array.isArray(rest) ? rest[0] : rest
      const restProjekt = Number(frei?.rest_projekt ?? 0)
      const restNutzer = Number(frei?.rest_nutzer ?? 0)
      if (restProjekt <= 0 || restNutzer <= 0) {
        uebersprungen_wegen_grenze++
        continue
      }

      try {
        const { data: datei, error: ladeFehler } = await admin.storage
          .from('item-photos')
          .download(foto.path)
        if (ladeFehler || !datei) {
          throw new Error(ladeFehler?.message ?? 'Bild nicht im Speicher gefunden')
        }
        const bytes = new Uint8Array(await datei.arrayBuffer())
        if (bytes.length > MAX_BYTES) {
          throw new Error('Das Bild ist zu groß für die Auswertung.')
        }
        const typ = datei.type && datei.type.startsWith('image/') ? datei.type : 'image/jpeg'

        const dinge = await erkennen(schluessel, modell, bytes, typ, was, sprache)

        await admin.from('photo_analyses').upsert(
          {
            project_id: body.project_id,
            photo_id: foto.id,
            sprache,
            status: 'fertig',
            modell,
            ergebnis: dinge,
            fehler: null,
            created_by: me.user.id,
          },
          { onConflict: 'photo_id,sprache' },
        )
        await admin.from('bild_lesen_log').insert({
          project_id: body.project_id,
          user_id: me.user.id,
          photo_id: foto.id,
          modell,
          bezahlt: true,
        })
        ergebnisse.push({ photo_id: foto.id, status: 'fertig', aus_speicher: false, dinge })
      } catch (err) {
        const grund = err instanceof Error ? err.message : String(err)
        /* Der Fehlschlag wird festgehalten, nicht verschwiegen. Beim
         * naechsten Versuch wird es erneut probiert, weil nur ein
         * fertiger Stand aus dem Speicher genommen wird. Gezaehlt wird
         * er trotzdem als bezahlt: gefragt wurde, und das kostet. */
        await admin.from('photo_analyses').upsert(
          {
            project_id: body.project_id,
            photo_id: foto.id,
            sprache,
            status: 'fehler',
            modell,
            ergebnis: [],
            fehler: grund.slice(0, 500),
            created_by: me.user.id,
          },
          { onConflict: 'photo_id,sprache' },
        )
        await admin.from('bild_lesen_log').insert({
          project_id: body.project_id,
          user_id: me.user.id,
          photo_id: foto.id,
          modell,
          bezahlt: true,
        })
        ergebnisse.push({
          photo_id: foto.id,
          status: 'fehler',
          aus_speicher: false,
          dinge: [],
          fehler: grund,
        })
      }
    }

    // Bilder, die es gar nicht gibt oder die zu einem anderen Umzug
    // gehoeren, werden gemeldet statt still uebergangen.
    const uebergangen = body.photo_ids.filter((id) => !meine.some((f) => f.id === id))

    const { data: restNachher } = await admin.rpc('bild_lesen_rest', {
      p_project: body.project_id,
      p_user: me.user.id,
    })
    const restEnde = Array.isArray(restNachher) ? restNachher[0] : restNachher

    return json({
      ergebnisse,
      uebergangen,
      uebersprungen_wegen_grenze,
      rest_projekt: Number(restEnde?.rest_projekt ?? 0),
      rest_nutzer: Number(restEnde?.rest_nutzer ?? 0),
      modell,
      sprache,
    })
  } catch (err) {
    console.error('[bild-analyse]', err)
    return json({ error: err instanceof Error ? err.message : String(err) }, 500)
  }
})
