import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorBox, Field, Input, PasswordInput } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function Register() {
  const { signUp, session, ready } = useAuth()
  const nav = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Wer neu ist, hat noch keinen Umzug. Darum geht es hier immer zur Uebersicht.
  if (ready && session) return <Navigate to="/app" replace />

  const weak = password.length > 0 && password.length < 8

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    if (password.length < 8) {
      setError('Nimm mindestens 8 Zeichen.')
      return
    }
    setBusy(true)
    try {
      const { needsConfirm } = await signUp(email, password, name)
      if (needsConfirm) {
        // Nicht so tun als waere alles fertig. Der Hinweis muss sichtbar sein.
        setInfo(
          'Konto angelegt. Dieses Supabase-Projekt verlangt noch eine Bestaetigung per E-Mail. Schau in dein Postfach, dann kannst du dich anmelden.',
        )
      } else {
        nav('/app', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Konto anlegen"
      subtitle="Name ist freiwillig. E-Mail und Passwort brauchst du."
      footer={
        <>
          <p>Schon ein Konto?</p>
          <Link to="/login" className="mt-3 inline-block">
            <Button type="button" variant="outline" size="lg">
              Anmelden
            </Button>
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label="Name" hint="Optional. So sehen dich die anderen im Umzug.">
          <Input
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Karam"
          />
        </Field>
        <Field label="E-Mail" required>
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="du@beispiel.de"
          />
        </Field>
        <Field
          label="Passwort"
          required
          error={weak ? 'Mindestens 8 Zeichen.' : null}
          hint="Mindestens 8 Zeichen. Mit dem Auge rechts kannst du es anzeigen."
        >
          <PasswordInput
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Neues Passwort"
          />
        </Field>

        {error ? <ErrorBox error={error} /> : null}
        {info ? (
          <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4">
            <p className="font-bold">Fast fertig</p>
            <p className="mt-1 text-base text-ink/80">{info}</p>
          </div>
        ) : null}

        <Button type="submit" full size="lg" loading={busy}>
          Konto anlegen
        </Button>
      </form>

      {info ? (
        <div className="mt-3">
          <Link to="/login" className="block">
            <Button type="button" variant="outline" size="lg" full>
              Zur Anmeldung
            </Button>
          </Link>
        </div>
      ) : null}
    </AuthShell>
  )
}
