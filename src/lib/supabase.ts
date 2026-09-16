import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/* Fehlt die Konfiguration, wird das sichtbar gemeldet statt als leere
 * weisse Seite zu enden. Stiller Fehlschlag ist hier verboten. */
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

/** Supabase-Fehler in einen Satz uebersetzen, den man lesen kann. */
export function errText(err: unknown): string {
  if (!err) return 'Unbekannter Fehler'
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
    return (
      'Supabase wollte eine Bestaetigungsmail verschicken und hat das Stundenlimit erreicht. ' +
      'Abhilfe: in der Projektverwaltung unter Authentication, Sign In, Email die Option ' +
      '"Confirm email" ausschalten. Dann wird gar keine Mail mehr verschickt und die ' +
      'Registrierung geht sofort durch.'
    )
  }
  if (code === 'over_request_rate_limit' || raw.includes('For security purposes')) {
    return 'Zu viele Versuche kurz hintereinander. Warte einen Moment und probier es noch einmal.'
  }
  if (code === 'signup_disabled' || raw.includes('Signups not allowed')) {
    return 'Registrierung ist in diesem Projekt abgeschaltet.'
  }

  const map: Record<string, string> = {
    'Invalid login credentials': 'E-Mail oder Passwort stimmt nicht.',
    'User already registered': 'Diese E-Mail ist schon registriert.',
    'Email not confirmed':
      'Das Konto wartet noch auf eine Bestaetigung. Sag Bescheid, dann wird es freigeschaltet.',
    'Password should be at least 6 characters':
      'Das Passwort braucht mindestens 6 Zeichen.',
    'New password should be different from the old password':
      'Das neue Passwort muss sich vom alten unterscheiden.',
    'Auth session missing!': 'Die Sitzung ist abgelaufen. Bitte neu anmelden.',
  }
  if (map[raw]) return map[raw]
  if (raw.includes('duplicate key') && raw.includes('tags_project_short_key'))
    return 'Dieses Kuerzel ist in diesem Umzug schon vergeben.'
  if (raw.includes('duplicate key')) return 'Der Eintrag existiert schon.'
  if (raw.includes('row-level security'))
    return 'Dafuer fehlt dir die Berechtigung in diesem Umzug.'
  if (raw.includes('Failed to fetch'))
    return 'Keine Verbindung zum Server. Internet pruefen.'
  return raw || 'Unbekannter Fehler'
}
