import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, Field, Input } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function ResetRequest() {
  const { sendReset } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await sendReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title="Passwort zuruecksetzen"
      subtitle="Wir schicken dir einen Link, mit dem du ein neues Passwort setzt."
      footer={
        <Link to="/login" className="font-semibold text-ink underline">
          Zurueck zur Anmeldung
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm">
          <p className="font-semibold">Link verschickt</p>
          <p className="mt-1 text-ink/80">
            Falls es zu dieser Adresse ein Konto gibt, liegt gleich eine Mail im Postfach.
            Der Link fuehrt direkt auf die Seite fuer das neue Passwort.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="E-Mail">
            <Input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="du@beispiel.de"
            />
          </Field>
          {error ? (
            <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" full size="lg" loading={busy}>
            Link schicken
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
