import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { tg } from './i18n'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/* Fehlt die Konfiguration, wird das sichtbar gemeldet statt als leere
 * weisse Seite zu enden. Stiller Fehlschlag ist hier verboten.
 *
 * Dieser eine Satz bleibt deutsch. Er wird beim Laden des Moduls berechnet,
 * also bevor die Sprachwahl feststeht, und er richtet sich ohnehin an den,
 * der die Datei .env.local anlegt, nicht an den Nutzer. */
export const configError: string | null =
  !url || !key
    ? 'VITE_SUPABASE_URL oder VITE_SUPABASE_ANON_KEY fehlt. Lege .env.local nach dem Muster von .env.example an.'
    : null

export const supabase: SupabaseClient = createClient(
  url ?? 'https://placeholder.supabase.co',
  key ?? 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    realtime: { params: { eventsPerSecond: 20 } },
  },
)

export const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? ''
export const SUPABASE_URL = url ?? ''

/** Supabase-Fehler in einen Satz uebersetzen, den man lesen kann.
 *
 *  Laeuft ausserhalb von React, darum tg und nicht useT. Die englischen
 *  Originalmeldungen bleiben als Erkennungsmerkmal stehen, uebersetzt wird
 *  nur, was danach herauskommt. */
export function errText(err: unknown): string {
  if (!err) return tg('zustand.unbekannter_fehler')
  if (typeof err === 'string') return err
  const e = err as {
    message?: string
    error_description?: string
    details?: string
    code?: string
    error_code?: string
  }
  const raw = e.error_description || e.message || e.details || ''
  const code = e.error_code || e.code || ''

  /* Supabase verschickt beim Registrieren eine Bestaetigungsmail, solange in
   * der Projektverwaltung "Confirm email" aktiv ist. Der eingebaute
   * Mailversand ist dabei auf wenige Mails pro Stunde begrenzt. Die
   * englische Originalmeldung sagt niemandem, was zu tun ist. */
  if (code === 'over_email_send_rate_limit' || raw.toLowerCase().includes('email rate limit')) {
    return tg('fehler.mail_limit')
  }
  if (code === 'over_request_rate_limit' || raw.includes('For security purposes')) {
    return tg('fehler.zu_viele_versuche')
  }
  if (code === 'signup_disabled' || raw.includes('Signups not allowed')) {
    return tg('fehler.registrierung_aus')
  }

  /* Die Tabelle bildet die englische Meldung auf einen Schluessel ab. Der
   * Satz selbst steht im Woerterbuch, hier steht nur, welcher es ist. */
  const map: Record<string, string> = {
    'Invalid login credentials': 'fehler.login_falsch',
    'User already registered': 'fehler.mail_vergeben',
    'Email not confirmed': 'fehler.mail_unbestaetigt',
    'Password should be at least 6 characters': 'fehler.passwort_kurz',
    'New password should be different from the old password': 'fehler.passwort_gleich',
    'Auth session missing!': 'fehler.sitzung_weg',
  }
  if (map[raw]) return tg(map[raw])
  if (raw.includes('duplicate key') && raw.includes('tags_project_short_key'))
    return tg('fehler.kuerzel_vergeben')
  if (raw.includes('duplicate key')) return tg('fehler.eintrag_doppelt')
  if (raw.includes('row-level security')) return tg('fehler.keine_berechtigung')
  if (raw.includes('Failed to fetch')) return tg('fehler.keine_verbindung')
  return raw || tg('zustand.unbekannter_fehler')
}
