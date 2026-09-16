import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorBox, Field, Loading, PasswordInput } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { supabase } from '../lib/supabase'

export default function ResetConfirm() {
  const { updatePassword } = useAuth()
  const nav = useNavigate()
  const t = useT()
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
      setError(t('konto.passwort_min'))
      return
    }
    if (password !== repeat) {
      setError(t('konto.passwoerter_ungleich'))
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
      title={t('konto.neues_passwort')}
      subtitle={t('konto.neues_passwort_unter')}
      footer={
        <Link to="/login" className="inline-block">
          <Button type="button" variant="outline" size="lg">
            {t('konto.zurueck_anmeldung')}
          </Button>
        </Link>
      }
    >
      {checkError ? (
        <div className="space-y-4">
          <ErrorBox error={checkError} />
          <Link to="/passwort-vergessen" className="block">
            <Button variant="outline" size="lg" full>
              {t('konto.neuen_link')}
            </Button>
          </Link>
        </div>
      ) : hasSession === null ? (
        <Loading label={t('konto.link_wird_geprueft')} />
      ) : hasSession === false ? (
        <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4">
          <p className="t-name">{t('konto.link_ungueltig')}</p>
          <p className="mt-1.5 text-base text-ink/80">{t('konto.link_ungueltig_text')}</p>
          <Link to="/passwort-vergessen" className="mt-4 block">
            <Button variant="outline" size="lg" full>
              {t('konto.neuen_link')}
            </Button>
          </Link>
        </div>
      ) : ok ? (
        <div className="rounded-2xl border border-ok/30 bg-ok/10 p-4">
          <p className="t-name">{t('konto.passwort_geaendert')}</p>
          <p className="mt-1.5 text-base text-ink/80">{t('konto.weiter_geht_es')}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Field label={t('konto.neues_passwort')} hint={t('konto.passwort_min')}>
            <PasswordInput
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label={t('konto.passwort_nochmal')}>
            <PasswordInput
              autoComplete="new-password"
              required
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </Field>
          {error ? <ErrorBox error={error} /> : null}
          <Button type="submit" full size="lg" loading={busy}>
            {t('konto.passwort_speichern')}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
