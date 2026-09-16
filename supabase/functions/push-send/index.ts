/* Kistly push-send
 *
 * Verschickt Web-Push-Nachrichten an die Mitglieder eines Umzugs.
 * Aufruf nur mit gueltigem Nutzer-Token. Wer nicht Mitglied des Projekts
 * ist, bekommt 403 und es wird nichts verschickt.
 *
 * Die Verschluesselung (RFC 8291, aes128gcm) und der VAPID-Kopf (RFC 8292)
 * sind hier direkt umgesetzt, damit keine Fremdbibliothek dazwischenhaengt.
 *
 * Schluessel kommen aus den Function Secrets oder aus private.config.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2'

const enc = new TextEncoder()

/* ----------------------------------------------------------- base64url */
function b64uToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const bin = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToB64u(b: Uint8Array | ArrayBuffer): string {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b)
  let s = ''
  for (const byte of bytes) s += String.fromCharCode(byte)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(len)
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

/* --------------------------------------------------------------- HKDF */
async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm)
  const okm = await hmac(prk, concat(info, new Uint8Array([1])))
  return okm.slice(0, length)
}

/* --------------------------------------------------------------- VAPID */
async function vapidHeaders(
  endpoint: string,
  publicKey: string,
  privateKey: string,
  subject: string,
): Promise<Record<string, string>> {
  const aud = new URL(endpoint).origin
  const header = bytesToB64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = bytesToB64u(
    enc.encode(
      JSON.stringify({
        aud,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: subject,
      }),
    ),
  )
  const unsigned = `${header}.${payload}`

  const pub = b64uToBytes(publicKey)
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToB64u(pub.slice(1, 33)),
    y: bytesToB64u(pub.slice(33, 65)),
    d: privateKey,
    ext: true,
  }
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    enc.encode(unsigned),
  )
  return {
    Authorization: `vapid t=${unsigned}.${bytesToB64u(sig)}, k=${publicKey}`,
  }
}

/* ------------------------------------------------- Nutzlast verschluesseln */
async function encryptPayload(
  plaintext: Uint8Array,
  uaPublicB64: string,
  authSecretB64: string,
): Promise<Uint8Array> {
  const uaPublic = b64uToBytes(uaPublicB64)
  const authSecret = b64uToBytes(authSecretB64)

  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  )
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ephemeral.publicKey))

  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, ephemeral.privateKey, 256),
  )

  // IKM nach RFC 8291
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic)
  const ikm = await hkdf(authSecret, shared, keyInfo, 32)

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12)

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  // 0x02 schliesst den einzigen Datensatz ab.
  const record = concat(plaintext, new Uint8Array([2]))
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, record),
  )

  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext)
}

/* ---------------------------------------------------------------- Server */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Erst die Umgebung, dann die Tabelle. Fehlt beides, wird das gemeldet. */
async function loadConfig(
  admin: ReturnType<typeof createClient>,
): Promise<Record<string, string | undefined>> {
  const out: Record<string, string | undefined> = {
    VAPID_PUBLIC_KEY: Deno.env.get('VAPID_PUBLIC_KEY') ?? undefined,
    VAPID_PRIVATE_KEY: Deno.env.get('VAPID_PRIVATE_KEY') ?? undefined,
    VAPID_SUBJECT: Deno.env.get('VAPID_SUBJECT') ?? undefined,
  }
  if (out.VAPID_PUBLIC_KEY && out.VAPID_PRIVATE_KEY) return out

  const { data, error } = await admin.rpc('app_config')
  if (error) {
    console.warn('[push-send] app_config nicht lesbar:', error.message)
    return out
  }
  for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
    out[row.key] = out[row.key] ?? row.value
  }
  return out
}

interface Body {
  project_id: string
  user_ids?: string[]
  payload: {
    title: string
    body?: string
    url?: string
    tag?: string
    type?: 'chat' | 'call' | 'call-cancel' | 'item'
    data?: Record<string, unknown>
    callId?: string
    callUrl?: string
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    // Schluessel kommen aus den Function Secrets, sonst aus private.config.
    // Das Schema private haengt nicht an der REST-Schnittstelle, nur der
    // Dienstschluessel kommt dort hin.
    const conf = await loadConfig(admin)
    const VAPID_PUBLIC = conf.VAPID_PUBLIC_KEY
    const VAPID_PRIVATE = conf.VAPID_PRIVATE_KEY
    const VAPID_SUBJECT = conf.VAPID_SUBJECT ?? 'mailto:kistly@users.noreply.github.com'

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      // Klare Meldung statt stiller Nichtzustellung.
      return json(
        {
          error:
            'VAPID_PUBLIC_KEY oder VAPID_PRIVATE_KEY fehlt. Entweder als Function Secret setzen oder in private.config eintragen.',
        },
        500,
      )
    }

    const auth = req.headers.get('Authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return json({ error: 'Nicht angemeldet' }, 401)

    const body = (await req.json()) as Body
    if (!body?.project_id || !body?.payload?.title) {
      return json({ error: 'project_id und payload.title sind Pflicht' }, 400)
    }

    // Aufrufer pruefen: mit seinem eigenen Token, damit RLS greift.
    const asUser = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth } },
    })
    const { data: me } = await asUser.auth.getUser()
    if (!me?.user) return json({ error: 'Nicht angemeldet' }, 401)

    const { data: membership, error: memberErr } = await asUser
      .from('project_members')
      .select('user_id')
      .eq('project_id', body.project_id)
      .eq('user_id', me.user.id)
      .maybeSingle()
    if (memberErr) return json({ error: memberErr.message }, 400)
    if (!membership) return json({ error: 'Kein Mitglied dieses Umzugs' }, 403)

    // Empfaenger bestimmen, mit Dienstschluessel.
    const { data: members } = await admin
      .from('project_members')
      .select('user_id')
      .eq('project_id', body.project_id)

    let targets = (members ?? []).map((m) => m.user_id as string).filter((id) => id !== me.user.id)
    if (body.user_ids?.length) targets = targets.filter((id) => body.user_ids!.includes(id))
    if (targets.length === 0) return json({ sent: 0, failed: 0, skipped: 'keine Empfaenger' })

    // Wer die Art abgeschaltet hat, bekommt nichts.
    const kind = body.payload.type ?? 'chat'
    if (kind !== 'call-cancel') {
      const column = kind === 'call' ? 'calls' : kind === 'item' ? 'items' : 'chat'
      const { data: prefs } = await admin
        .from('notification_prefs')
        .select(`user_id, ${column}`)
        .in('user_id', targets)
      const off = new Set(
        (prefs ?? [])
          .filter((p) => (p as Record<string, unknown>)[column] === false)
          .map((p) => (p as { user_id: string }).user_id),
      )
      targets = targets.filter((id) => !off.has(id))
    }

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targets)

    if (!subs || subs.length === 0) return json({ sent: 0, failed: 0, skipped: 'keine Abos' })

    const payloadBytes = enc.encode(JSON.stringify(body.payload))
    let sent = 0
    let failed = 0
    const logs: Array<Record<string, unknown>> = []

    await Promise.all(
      subs.map(async (sub) => {
        try {
          const encrypted = await encryptPayload(payloadBytes, sub.p256dh, sub.auth)
          const headers = await vapidHeaders(
            sub.endpoint,
            VAPID_PUBLIC,
            VAPID_PRIVATE,
            VAPID_SUBJECT,
          )
          const res = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              ...headers,
              'Content-Encoding': 'aes128gcm',
              'Content-Type': 'application/octet-stream',
              TTL: kind === 'call' ? '30' : '86400',
              Urgency: kind === 'call' ? 'high' : 'normal',
            },
            body: encrypted,
          })

          if (res.ok) {
            sent++
            logs.push({ user_id: sub.user_id, endpoint: sub.endpoint, ok: true, status: res.status })
          } else {
            failed++
            const detail = await res.text().catch(() => '')
            logs.push({
              user_id: sub.user_id,
              endpoint: sub.endpoint,
              ok: false,
              status: res.status,
              detail: detail.slice(0, 500),
            })
            // 404 und 410 heissen: das Abo gibt es nicht mehr.
            if (res.status === 404 || res.status === 410) {
              await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
            }
          }
        } catch (err) {
          failed++
          logs.push({
            user_id: sub.user_id,
            endpoint: sub.endpoint,
            ok: false,
            detail: String(err).slice(0, 500),
          })
        }
      }),
    )

    // Fehlschlaege bleiben sichtbar, statt zu verschwinden.
    if (logs.length) {
      const { error: logErr } = await admin
        .from('push_log')
        .insert(logs.map((l) => ({ ...l, payload: body.payload })))
      if (logErr) console.error('[push-send] Protokoll nicht geschrieben:', logErr.message)
    }

    return json({ sent, failed })
  } catch (err) {
    console.error('[push-send]', err)
    return json({ error: String(err) }, 500)
  }
})
