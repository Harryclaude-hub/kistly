import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, LogOut, ShieldCheck } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { InstallCard } from '../components/InstallCard'
import { useTheme } from '../components/ThemeToggle'
import {
  Avatar,
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  Loading,
  PasswordInput,
  Switch,
  useToast,
} from '../components/ui'
import { displayNameOf, useAuth } from '../lib/auth'
import { getPrefs, setPrefs } from '../lib/api'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'
import type { NotificationPrefs } from '../lib/types'

const PUSH_TEXT: Record<PushState, string> = {
  unsupported: 'Dieser Browser kann keine Push-Benachrichtigungen. Auf dem iPhone geht es erst, wenn Kistly auf dem Startbildschirm liegt.',
  'no-key': 'Auf dem Server ist kein VAPID-Schluessel hinterlegt. Ohne den kann nichts verschickt werden.',
  denied: 'Benachrichtigungen sind im Browser blockiert. Das musst du in den Seiteneinstellungen wieder erlauben.',
  default: 'Noch nicht erlaubt.',
  'granted-off': 'Erlaubt, aber dieses Geraet ist nicht angemeldet.',
  'granted-on': 'Dieses Geraet bekommt Benachrichtigungen.',
}

/* Eigene Abschnittsueberschrift, weil die Einstellungen die einzige Seite
 * sind, auf der man sich durch lauter kleine Schalter liest. Da darf die
 * Ueberschrift nicht kleiner sein als das, was darunter steht. */
function Abschnitt({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-xl font-black tracking-tight">{children}</h2>
}

export default function Settings() {
  const { user, profile, updateProfile, updatePassword, signOut } = useAuth()
  const { mode, setMode } = useTheme()
  const toast = useToast()
  const nav = useNavigate()

  const [name, setName] = useState(profile?.display_name ?? '')
  const [password, setPassword] = useState('')
  const [busyName, setBusyName] = useState(false)
  const [busyPass, setBusyPass] = useState(false)
  const [push, setPush] = useState<PushState>('default')
  const [prefs, setPrefsState] = useState<NotificationPrefs | null>(null)
  const [prefsError, setPrefsError] = useState<string | null>(null)
  const [prefsLoading, setPrefsLoading] = useState(true)

  useEffect(() => {
    setName(profile?.display_name ?? '')
  }, [profile?.display_name])

  useEffect(() => {
    // Schlaegt die Abfrage fehl, stuende hier sonst stillschweigend
    // "Noch nicht erlaubt.", obwohl gar nichts geprueft werden konnte.
    pushState()
      .then(setPush)
      .catch((err) => toast(err instanceof Error ? err.message : String(err), 'error'))
  }, [toast])

  const loadPrefs = useCallback(() => {
    if (!user) return
    setPrefsLoading(true)
    setPrefsError(null)
    getPrefs(user.id)
      .then(setPrefsState)
      .catch((err) => setPrefsError(err instanceof Error ? err.message : String(err)))
      .finally(() => setPrefsLoading(false))
  }, [user])

  useEffect(() => {
    loadPrefs()
  }, [loadPrefs])

  async function savePrefs(patch: Partial<NotificationPrefs>) {
    if (!user || !prefs) return
    const before = prefs
    setPrefsState({ ...prefs, ...patch })
    try {
      await setPrefs(user.id, patch)
    } catch (err) {
      setPrefsState(before)
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader title="Einstellungen" back="/app" />
      <Page>
        {/* Profil */}
        <Abschnitt>Profil</Abschnitt>
        <Card className="mb-8 p-4">
          <div className="mb-5 flex items-center gap-3">
            <Avatar name={displayNameOf(profile, user?.email ?? '?')} size={56} />
            <div className="min-w-0">
              <p className="t-name-lg truncate">{displayNameOf(profile, 'Ohne Namen')}</p>
              <p className="t-sub truncate">{user?.email}</p>
            </div>
          </div>

          <Field label="Anzeigename" hint="So sehen dich die anderen in Umzuegen und im Chat.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
              <Button
                size="lg"
                className="w-full justify-center sm:w-auto"
                loading={busyName}
                disabled={name.trim() === (profile?.display_name ?? '')}
                onClick={async () => {
                  setBusyName(true)
                  try {
                    await updateProfile({ display_name: name.trim() || null })
                    toast('Name gespeichert', 'ok')
                  } catch (err) {
                    toast(err instanceof Error ? err.message : String(err), 'error')
                  } finally {
                    setBusyName(false)
                  }
                }}
              >
                Speichern
              </Button>
            </div>
          </Field>
        </Card>

        {/* Sicherheit */}
        <Abschnitt>Passwort</Abschnitt>
        <Card className="mb-8 p-4">
          <Field label="Neues Passwort" hint="Mindestens 8 Zeichen. Mit dem Auge kannst du es anzeigen.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <PasswordInput
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Neues Passwort"
              />
              <Button
                size="lg"
                className="w-full justify-center sm:w-auto"
                disabled={password.length < 8}
                loading={busyPass}
                onClick={async () => {
                  setBusyPass(true)
                  try {
                    await updatePassword(password)
                    setPassword('')
                    toast('Passwort geaendert', 'ok')
                  } catch (err) {
                    toast(err instanceof Error ? err.message : String(err), 'error')
                  } finally {
                    setBusyPass(false)
                  }
                }}
              >
                Aendern
              </Button>
            </div>
          </Field>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            Die Verbindung laeuft verschluesselt, Passwoerter liegen nur als Hash beim
            Anbieter. Deine Daten sieht nur, wer im jeweiligen Umzug eingetragen ist.
          </p>
        </Card>

        {/* Benachrichtigungen */}
        <Abschnitt>Benachrichtigungen</Abschnitt>
        <Card className="mb-8 p-4">
          <div className="mb-4">
            <p className="t-name">Auf diesem Geraet</p>
            <p className="t-sub mt-1">{PUSH_TEXT[push]}</p>
            <div className="mt-3">
              {push === 'granted-on' ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-center sm:w-auto"
                  onClick={async () => {
                    try {
                      setPush(await disablePush())
                      toast('Auf diesem Geraet aus', 'ok')
                    } catch (err) {
                      toast(err instanceof Error ? err.message : String(err), 'error')
                    }
                  }}
                >
                  <BellOff size={18} /> Ausschalten
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full justify-center sm:w-auto"
                  disabled={push === 'unsupported' || push === 'no-key' || push === 'denied'}
                  onClick={async () => {
                    try {
                      setPush(await enablePush())
                      toast('Benachrichtigungen an', 'ok')
                    } catch (err) {
                      toast(err instanceof Error ? err.message : String(err), 'error')
                    }
                  }}
                >
                  <Bell size={18} /> Einschalten
                </Button>
              )}
            </div>
          </div>

          {/* Laedt, Fehler, Daten. Ein leerer Block waere hier nicht zu deuten. */}
          <div className="border-t border-line pt-1">
            {prefsLoading ? (
              <Loading label="Einstellungen werden geladen" />
            ) : prefsError ? (
              <div className="py-3">
                <ErrorBox error={prefsError} onRetry={loadPrefs} />
              </div>
            ) : prefs ? (
              <>
                <Switch
                  checked={prefs.chat}
                  onChange={(v) => void savePrefs({ chat: v })}
                  label="Chatnachrichten"
                  hint="Einmal pro Nachricht."
                />
                <Switch
                  checked={prefs.calls}
                  onChange={(v) => void savePrefs({ calls: v })}
                  label="Anrufe"
                  hint="Wiederholt sich, solange es klingelt."
                />
                <Switch
                  checked={prefs.items}
                  onChange={(v) => void savePrefs({ items: v })}
                  label="Kisten und Status"
                  hint="Wenn jemand etwas scannt oder auf angekommen setzt."
                />
              </>
            ) : null}
          </div>
        </Card>

        {/* Darstellung */}
        <Abschnitt>Darstellung</Abschnitt>
        <Card className="mb-8 p-4">
          <div className="flex gap-2">
            {(['system', 'light', 'dark'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`min-w-0 flex-1 rounded-xl border-2 px-2 py-3 text-base font-bold transition ${
                  mode === m ? 'border-ink bg-ink text-paper' : 'border-line hover:bg-raised'
                }`}
              >
                {m === 'system' ? 'System' : m === 'light' ? 'Hell' : 'Dunkel'}
              </button>
            ))}
          </div>
        </Card>

        {/* App */}
        <Abschnitt>App</Abschnitt>
        <div className="mb-8">
          <InstallCard />
        </div>

        <Button
          variant="outline"
          size="lg"
          className="w-full justify-center sm:w-auto"
          onClick={async () => {
            await signOut()
            nav('/')
          }}
        >
          <LogOut size={18} /> Abmelden
        </Button>

        <p className="mt-8 text-center text-sm text-muted">
          Kistly . gebaut fuer den eigenen Umzug
        </p>
        {/* Luft fuer die untere Navigationsleiste */}
        <div className="h-10" />
      </Page>
    </div>
  )
}
