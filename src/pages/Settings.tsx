import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff, LogOut, ShieldCheck } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { InstallCard } from '../components/InstallCard'
import { useTheme } from '../components/ThemeToggle'
import {
  Avatar,
  Button,
  Card,
  Field,
  Input,
  PasswordInput,
  SectionTitle,
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

export default function Settings() {
  const { user, profile, updateProfile, updatePassword, signOut } = useAuth()
  const { mode, setMode } = useTheme()
  const toast = useToast()
  const nav = useNavigate()

  const [name, setName] = useState(profile?.display_name ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [push, setPush] = useState<PushState>('default')
  const [prefs, setPrefsState] = useState<NotificationPrefs | null>(null)

  useEffect(() => {
    setName(profile?.display_name ?? '')
  }, [profile?.display_name])

  useEffect(() => {
    void pushState().then(setPush)
    if (user) {
      void getPrefs(user.id)
        .then(setPrefsState)
        .catch((err) => console.warn('[settings] Einstellungen:', err))
    }
  }, [user])

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
        <SectionTitle>Profil</SectionTitle>
        <Card className="mb-6 p-4">
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={displayNameOf(profile, user?.email ?? '?')} size={52} />
            <div className="min-w-0">
              <p className="truncate font-bold">{displayNameOf(profile, 'Ohne Namen')}</p>
              <p className="truncate text-sm text-muted">{user?.email}</p>
            </div>
          </div>

          <Field label="Anzeigename" hint="So sehen dich die anderen in Umzuegen und im Chat.">
            <div className="flex gap-2">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
              <Button
                loading={busy}
                disabled={name.trim() === (profile?.display_name ?? '')}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await updateProfile({ display_name: name.trim() || null })
                    toast('Name gespeichert', 'ok')
                  } catch (err) {
                    toast(err instanceof Error ? err.message : String(err), 'error')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Speichern
              </Button>
            </div>
          </Field>
        </Card>

        {/* Sicherheit */}
        <SectionTitle>Passwort</SectionTitle>
        <Card className="mb-6 p-4">
          <Field label="Neues Passwort" hint="Mindestens 8 Zeichen. Mit dem Auge kannst du es anzeigen.">
            <div className="flex gap-2">
              <PasswordInput
                value={password}
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Neues Passwort"
              />
              <Button
                disabled={password.length < 8}
                loading={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await updatePassword(password)
                    setPassword('')
                    toast('Passwort geaendert', 'ok')
                  } catch (err) {
                    toast(err instanceof Error ? err.message : String(err), 'error')
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Aendern
              </Button>
            </div>
          </Field>
          <p className="mt-3 flex items-start gap-2 text-xs text-muted">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            Die Verbindung laeuft verschluesselt, Passwoerter liegen nur als Hash beim
            Anbieter. Deine Daten sieht nur, wer im jeweiligen Umzug eingetragen ist.
          </p>
        </Card>

        {/* Benachrichtigungen */}
        <SectionTitle>Benachrichtigungen</SectionTitle>
        <Card className="mb-6 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">Auf diesem Geraet</p>
              <p className="mt-0.5 text-sm text-muted">{PUSH_TEXT[push]}</p>
            </div>
            {push === 'granted-on' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    setPush(await disablePush())
                    toast('Auf diesem Geraet aus', 'ok')
                  } catch (err) {
                    toast(err instanceof Error ? err.message : String(err), 'error')
                  }
                }}
              >
                <BellOff size={15} /> Aus
              </Button>
            ) : (
              <Button
                size="sm"
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
                <Bell size={15} /> An
              </Button>
            )}
          </div>

          {prefs ? (
            <div className="border-t border-line pt-1">
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
            </div>
          ) : null}
        </Card>

        {/* Darstellung */}
        <SectionTitle>Darstellung</SectionTitle>
        <Card className="mb-6 p-4">
          <div className="flex gap-2">
            {(['system', 'light', 'dark'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                  mode === m ? 'border-ink bg-ink text-paper' : 'border-line hover:bg-raised'
                }`}
              >
                {m === 'system' ? 'System' : m === 'light' ? 'Hell' : 'Dunkel'}
              </button>
            ))}
          </div>
        </Card>

        {/* App */}
        <SectionTitle>App</SectionTitle>
        <div className="mb-6">
          <InstallCard />
        </div>

        <Button
          variant="outline"
          onClick={async () => {
            await signOut()
            nav('/')
          }}
        >
          <LogOut size={16} /> Abmelden
        </Button>

        <p className="mt-8 text-center text-xs text-muted">
          Kistly . gebaut fuer den eigenen Umzug
        </p>
        <div className="h-6" />
      </Page>
    </div>
  )
}
