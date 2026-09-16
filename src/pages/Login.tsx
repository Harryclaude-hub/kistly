import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorBox, Field, Input, PasswordInput } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { getLastProject } from '../lib/lastProject'

/* Wohin nach dem Anmelden. Wichtig ist, dass man sofort wieder im Chat des
 * zuletzt geoeffneten Umzugs landet. Ein Ziel aus dem Router-State kommt
 * daher, dass man vorher auf einer geschuetzten Seite war, das hat Vorrang. */
function zielNachAnmeldung(from: string | null): string {
  if (from) return from
  const last = getLastProject()
  return last ? `/app/p/${last}/chat` : '/app'
}

export default function Login() {
  const { signIn, session, ready } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const t = useT()
  const from = (loc.state as { from?: string } | null)?.from ?? null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (ready && session) return <Navigate to={zielNachAnmeldung(from)} replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email, password)
      nav(zielNachAnmeldung(from), { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell
      title={t('konto.anmelden')}
      subtitle={t('konto.anmelden_unter')}
      footer={
        <>
          <p>{t('konto.noch_kein_konto')}</p>
          <Link to="/registrieren" className="mt-3 inline-block">
            <Button type="button" variant="outline" size="lg">
              {t('konto.jetzt_anlegen')}
            </Button>
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label={t('konto.email')}>
          {/* Die Adresse bleibt in jeder Sprache von links nach rechts. */}
          <Input
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('konto.email_platzhalter')}
          />
        </Field>
        <Field label={t('konto.passwort')}>
          <PasswordInput
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('konto.passwort_platzhalter')}
          />
        </Field>

        {error ? <ErrorBox error={error} /> : null}

        <Button type="submit" full size="lg" loading={busy}>
          {t('konto.anmelden')}
        </Button>
      </form>

      <div className="mt-3">
        <Link to="/passwort-vergessen" className="block">
          <Button type="button" variant="soft" size="lg" full>
            {t('konto.passwort_vergessen')}
          </Button>
        </Link>
      </div>
    </AuthShell>
  )
}
