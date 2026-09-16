import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorBox, Field, Loading, PasswordInput } from '../components/ui'
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
  const [checkError, setCheckError] = useState<string | null>(null)

  useEffect(() => {
    // Supabase tauscht den Code in der URL gegen eine Sitzung. Erst danach
    // darf das Passwort gesetzt werden. Geht die Pruefung schief, darf die
    // Seite nicht ewig laden, sondern muss den Grund zeigen.
    const timer = setTimeout(async () => {
      try {
        const { data, error: err } = await supabase.auth.getSession()
        if (err) throw err
        setHasSession(Boolean(data.session))
      } catch (err) {
        setCheckError(err instanceof Error ? err.message : String(err))
        setHasSession(false)
      }
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
        <Link to="/login" className="inline-block">
          <Button type="button" variant="outline" size="lg">
            Zurueck zur Anmeldung
          </Button>
        </Link>
      }
    >
      {checkError ? (
        <div className="space-y-4">
          <ErrorBox error={checkError} />
          <Link to="/passwort-vergessen" className="block">
            <Button variant="outline" size="lg" full>
              Neuen Link anfordern
            </Button>
          </Link>
        </div>
      ) : hasSession === null ? (
        <Loading label="Link wird geprueft" />
      ) : hasSession === false ? (
        <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4">
          <p className="t-name">Kein gueltiger Link</p>
          <p className="mt-1.5 text-base text-ink/80">
            Der Link ist abgelaufen oder wurde schon benutzt. Fordere unter Passwort
            vergessen einen neuen an.
          </p>
          <Link to="/passwort-vergessen" className="mt-4 block">
            <Button variant="outline" size="lg" full>
              Neuen Link anfordern
            </Button>
          </Link>
        </div>
      ) : ok ? (
        <div className="rounded-2xl border border-ok/30 bg-ok/10 p-4">
          <p className="t-name">Passwort geaendert</p>
          <p className="mt-1.5 text-base text-ink/80">Weiter geht es.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
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
          {error ? <ErrorBox error={error} /> : null}
          <Button type="submit" full size="lg" loading={busy}>
            Passwort speichern
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
