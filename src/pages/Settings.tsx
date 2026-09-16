import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, LogOut, ShieldCheck } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { InstallCard } from '../components/InstallCard'
import { MODE_KEY, useTheme } from '../components/ThemeToggle'
import { SpracheWahl } from '../components/SpracheToggle'
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
import { STUFEN, STUFE_SYMBOL, useMotion, type Stufe } from '../design/motion'
import { displayNameOf, useAuth } from '../lib/auth'
import { getPrefs, setPrefs } from '../lib/api'
import { useT } from '../lib/i18n'
import { disablePush, enablePush, pushState, type PushState } from '../lib/push'
import type { NotificationPrefs } from '../lib/types'

/* Nicht der fertige Satz, sondern der Schluessel dazu. So steht der Text
 * im Woerterbuch und wechselt mit der Sprache mit. */
const PUSH_KEY: Record<PushState, string> = {
  unsupported: 'einstellungen.push_unsupported',
  'no-key': 'einstellungen.push_no_key',
  denied: 'einstellungen.push_denied',
  default: 'einstellungen.push_default',
  'granted-off': 'einstellungen.push_granted_off',
  'granted-on': 'einstellungen.push_granted_on',
}

/* Die Namen der Bewegungsstufen stehen hier und nicht in motion.tsx, damit
 * die Designschicht ohne Woerterbuch auskommt und loeschbar bleibt. */
const BEWEGUNG_KEY: Record<Stufe, string> = {
  ruhig: 'einstellungen.bewegung_ruhig',
  normal: 'einstellungen.bewegung_normal',
  voll: 'einstellungen.bewegung_voll',
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
  const { stufe, setStufe } = useMotion()
  const toast = useToast()
  const nav = useNavigate()
  const t = useT()

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
      <AppHeader title={t('einstellungen.titel')} back="/app" />
      <Page>
        {/* Profil */}
        <Abschnitt>{t('einstellungen.profil')}</Abschnitt>
        <Card className="mb-8 p-4">
          <div className="mb-5 flex items-center gap-3">
            <Avatar name={displayNameOf(profile, user?.email ?? '?')} size={56} />
            <div className="min-w-0">
              <p className="t-name-lg truncate">
                {displayNameOf(profile, t('einstellungen.ohne_namen'))}
              </p>
              {/* Die Adresse selbst bleibt von links nach rechts, auch im
                  arabischen Satz. */}
              <p className="t-sub truncate" dir="ltr">
                {user?.email}
              </p>
            </div>
          </div>

          <Field
            label={t('einstellungen.anzeigename')}
            hint={t('einstellungen.anzeigename_hinweis')}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('einstellungen.name_platzhalter')}
              />
              <Button
                size="lg"
                className="w-full justify-center sm:w-auto"
                loading={busyName}
                disabled={name.trim() === (profile?.display_name ?? '')}
                onClick={async () => {
                  setBusyName(true)
                  try {
                    await updateProfile({ display_name: name.trim() || null })
                    toast(t('einstellungen.name_gespeichert'), 'ok')
                  } catch (err) {
                    toast(err instanceof Error ? err.message : String(err), 'error')
                  } finally {
                    setBusyName(false)
                  }
                }}
              >
                {t('aktion.speichern')}
              </Button>
            </div>
          </Field>
        </Card>

        {/* Sicherheit */}
        <Abschnitt>{t('einstellungen.passwort')}</Abschnitt>
        <Card className="mb-8 p-4">
          <Field
            label={t('einstellungen.neues_passwort')}
            hint={t('einstellungen.passwort_hinweis')}
          >
            <div className="flex flex-col gap-2 sm:flex-row">
              <PasswordInput
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('einstellungen.neues_passwort')}
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
                    toast(t('einstellungen.passwort_geaendert'), 'ok')
                  } catch (err) {
                    toast(err instanceof Error ? err.message : String(err), 'error')
                  } finally {
                    setBusyPass(false)
                  }
                }}
              >
                {t('einstellungen.aendern')}
              </Button>
            </div>
          </Field>
          <p className="mt-4 flex items-start gap-2 text-sm text-muted">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" />
            {t('einstellungen.sicherheit_hinweis')}
          </p>
        </Card>

        {/* Benachrichtigungen */}
        <Abschnitt>{t('einstellungen.benachrichtigungen')}</Abschnitt>
        <Card className="mb-8 p-4">
          <div className="mb-4">
            <p className="t-name">{t('einstellungen.dieses_geraet')}</p>
            <p className="t-sub mt-1">{t(PUSH_KEY[push])}</p>
            <div className="mt-3">
              {push === 'granted-on' ? (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full justify-center sm:w-auto"
                  onClick={async () => {
                    try {
                      setPush(await disablePush())
                      toast(t('einstellungen.push_aus'), 'ok')
                    } catch (err) {
                      toast(err instanceof Error ? err.message : String(err), 'error')
                    }
                  }}
                >
                  <BellOff size={18} /> {t('einstellungen.ausschalten')}
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="w-full justify-center sm:w-auto"
                  disabled={push === 'unsupported' || push === 'no-key' || push === 'denied'}
                  onClick={async () => {
                    try {
                      setPush(await enablePush())
                      toast(t('einstellungen.push_an'), 'ok')
                    } catch (err) {
                      toast(err instanceof Error ? err.message : String(err), 'error')
                    }
                  }}
                >
                  <Bell size={18} /> {t('einstellungen.einschalten')}
                </Button>
              )}
            </div>
          </div>

          {/* Laedt, Fehler, Daten. Ein leerer Block waere hier nicht zu deuten. */}
          <div className="border-t border-line pt-1">
            {prefsLoading ? (
              <Loading label={t('einstellungen.laedt')} />
            ) : prefsError ? (
              <div className="py-3">
                <ErrorBox error={prefsError} onRetry={loadPrefs} />
              </div>
            ) : prefs ? (
              <>
                <Switch
                  checked={prefs.chat}
                  onChange={(v) => void savePrefs({ chat: v })}
                  label={t('einstellungen.chat')}
                  hint={t('einstellungen.chat_hinweis')}
                />
                <Switch
                  checked={prefs.calls}
                  onChange={(v) => void savePrefs({ calls: v })}
                  label={t('einstellungen.anrufe')}
                  hint={t('einstellungen.anrufe_hinweis')}
                />
                <Switch
                  checked={prefs.items}
                  onChange={(v) => void savePrefs({ items: v })}
                  label={t('einstellungen.kisten')}
                  hint={t('einstellungen.kisten_hinweis')}
                />
              </>
            ) : null}
          </div>
        </Card>

        {/* Sprache. Die Wahl dreht auch die Leserichtung der ganzen App. */}
        <Abschnitt>{t('einstellungen.sprache')}</Abschnitt>
        <Card className="mb-8 p-4">
          <SpracheWahl />
        </Card>

        {/* Darstellung */}
        <Abschnitt>{t('einstellungen.darstellung')}</Abschnitt>
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
                {t(MODE_KEY[m])}
              </button>
            ))}
          </div>

          {/* Bewegung. Reine Optik, kostet aber Akku, darum abschaltbar. */}
          <div className="mt-5 border-t-2 border-line pt-4">
            <p className="t-name">{t('einstellungen.bewegung')}</p>
            <p className="t-sub mt-1">{t(`${BEWEGUNG_KEY[stufe]}_hinweis`)}</p>
            <div className="mt-3 flex gap-2">
              {STUFEN.map((s) => {
                const Symbol = STUFE_SYMBOL[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStufe(s)}
                    aria-pressed={stufe === s}
                    className={`flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 text-base font-bold transition ${
                      stufe === s ? 'border-ink bg-ink text-paper' : 'border-line hover:bg-raised'
                    }`}
                  >
                    <Symbol size={20} />
                    {t(BEWEGUNG_KEY[s])}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        {/* App */}
        <Abschnitt>{t('einstellungen.app')}</Abschnitt>
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
          <LogOut size={18} /> {t('einstellungen.abmelden')}
        </Button>

        <p className="mt-8 text-center text-sm text-muted">{t('einstellungen.fusszeile')}</p>
        {/* Luft fuer die untere Navigationsleiste */}
        <div className="h-10" />
      </Page>
    </div>
  )
}
