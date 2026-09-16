/* Push-Benachrichtigungen.
 * Der Browser abonniert beim Push-Dienst, das Abo liegt in der Datenbank,
 * verschickt wird ueber die Edge Function push-send.
 */
import { supabase, VAPID_PUBLIC_KEY, errText } from './supabase'

export type PushState =
  | 'unsupported'
  | 'no-key'
  | 'denied'
  | 'default'
  | 'granted-off'
  | 'granted-on'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg) return reg
  const base = import.meta.env.BASE_URL || '/'
  return navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (!VAPID_PUBLIC_KEY) return 'no-key'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'default'
  const reg = await registration()
  const sub = await reg.pushManager.getSubscription()
  return sub ? 'granted-on' : 'granted-off'
}

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) throw new Error('Dieser Browser kann keine Push-Benachrichtigungen.')
  if (!VAPID_PUBLIC_KEY)
    throw new Error(
      'Es ist kein VAPID-Schluessel hinterlegt. Ohne den kann der Server nichts schicken.',
    )

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') {
    throw new Error(
      perm === 'denied'
        ? 'Benachrichtigungen wurden im Browser blockiert. Das musst du in den Seiteneinstellungen wieder erlauben.'
        : 'Ohne Erlaubnis gibt es keine Benachrichtigungen.',
    )
  }

  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    })
  }

  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('Nicht angemeldet')
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth)
    throw new Error('Das Abo des Browsers war unvollstaendig.')

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: auth.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent.slice(0, 200),
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(`Abo speichern: ${errText(error)}`)
  return 'granted-on'
}

export async function disablePush(): Promise<PushState> {
  const reg = await registration()
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    if (error) console.warn('[push] Abo blieb in der Datenbank:', errText(error))
  }
  return 'granted-off'
}

export interface PushPayload {
  title: string
  body?: string
  url?: string
  tag?: string
  type?: 'chat' | 'call' | 'call-cancel' | 'item'
  data?: Record<string, unknown>
  callId?: string
  callUrl?: string
}

/** Schickt eine Benachrichtigung an alle anderen Mitglieder des Projekts.
 *  Fehler werden gemeldet, nicht verschluckt. */
export async function notifyProject(
  projectId: string,
  payload: PushPayload,
  onlyUserIds?: string[],
): Promise<{ sent: number; failed: number } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('push-send', {
      body: { project_id: projectId, user_ids: onlyUserIds, payload },
    })
    if (error) {
      console.warn('[push] Versand fehlgeschlagen:', error.message)
      return null
    }
    return data as { sent: number; failed: number }
  } catch (err) {
    console.warn('[push] Versand nicht moeglich:', err)
    return null
  }
}

/* Statusmeldungen zu Kisten. Beim Ausladen werden viele Kisten kurz
 * hintereinander gescannt. Darum hoechstens alle 20 Sekunden eine Meldung,
 * und immer mit demselben Kennzeichen, damit sie die vorige ersetzt statt
 * sich zu stapeln. */
let lastItemPush = 0

export async function notifyItemStatus(
  projectId: string,
  projectName: string,
  text: string,
): Promise<void> {
  if (Date.now() - lastItemPush < 20_000) return
  lastItemPush = Date.now()
  await notifyProject(projectId, {
    title: projectName,
    body: text,
    type: 'item',
    tag: `items-${projectId}`,
    url: `/app/p/${projectId}/kisten`,
  })
}
