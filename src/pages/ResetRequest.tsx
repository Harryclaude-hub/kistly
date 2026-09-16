import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorBox, Field, Input } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'

export default function ResetRequest() {
  const { sendReset } = useAuth()
  const t = useT()
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
      title={t('konto.reset_titel')}
      subtitle={t('konto.reset_unter')}
      footer={
        <Link to="/login" className="inline-block">
          <Button type="button" variant="outline" size="lg">
            {t('konto.zurueck_anmeldung')}
          </Button>
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-2xl border border-ok/30 bg-ok/10 p-4">
          <p className="t-name">{t('konto.link_verschickt')}</p>
          <p className="mt-1.5 text-base text-ink/80">{t('konto.link_verschickt_text')}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label={t('konto.email')}>
            {/* Die Adresse bleibt in jeder Sprache von links nach rechts. */}
            <Input
              type="email"
              dir="ltr"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('konto.email_platzhalter')}
            />
          </Field>
          {error ? <ErrorBox error={error} /> : null}
          <Button type="submit" full size="lg" loading={busy}>
            {t('konto.link_schicken')}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
