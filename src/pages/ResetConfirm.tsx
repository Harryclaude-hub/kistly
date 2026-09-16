import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, Field, PasswordInput } from '../components/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function ResetConfirm() {
  const { updatePassword } = useAuth()
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    // Supabase tauscht den Code in der URL gegen eine Sitzung. Erst danach
    // darf das Passwort gesetzt werden.
    const timer = setTimeout(async () => {
      const { data } = await supabase.auth.getSession()
      setHasSession(Boolean(data.session))
    }, 400)
    return () => clearTimeout(timer)
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Mindestens 8 Zeichen.')
      return
    }
    if (password !== repeat) {
      setError('Die beiden Passwoerter sind nicht gleich.')
      return
    }
    setBusy(true)
    try {
      await updatePassword(password)
      setOk(true)
      setTimeout(() => nav('/app', { replace: true }), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Neues Passwort"
      subtitle="Setze jetzt dein neues Passwort."
      footer={
        <Link to="/login" className="font-semibold text-ink underline">
          Zurueck zur Anmeldung
        </Link>
      }
    >
      {hasSession === false ? (
        <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
          <p className="font-semibold">Kein gueltiger Link</p>
          <p className="mt-1 text-ink/80">
            Der Link ist abgelaufen oder wurde schon benutzt. Fordere unter
            Passwort vergessen einen neuen an.
          </p>
        </div>
      ) : ok ? (
        <div className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm font-semibold">
          Passwort geaendert. Weiter geht es.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Neues Passwort" hint="Mindestens 8 Zeichen.">
            <PasswordInput
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Nochmal">
            <PasswordInput
              autoComplete="new-password"
              required
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </Field>
          {error ? (
            <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" full size="lg" loading={busy}>
            Passwort speichern
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
