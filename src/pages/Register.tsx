import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, Field, Input, PasswordInput } from '../components/ui'
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
          Schon ein Konto?{' '}
          <Link to="/login" className="font-semibold text-ink underline">
            Anmelden
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
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

        {error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="rounded-xl border border-warn/40 bg-warn/10 px-3 py-2 text-sm">{info}</p>
        ) : null}

        <Button type="submit" full size="lg" loading={busy}>
          Konto anlegen
        </Button>
      </form>
    </AuthShell>
  )
}
