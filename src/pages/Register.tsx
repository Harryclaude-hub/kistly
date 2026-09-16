import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { Button, ErrorBox, Field, Input, PasswordInput } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'

export default function Register() {
  const { signUp, session, ready } = useAuth()
  const nav = useNavigate()
  const t = useT()

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
      setError(t('konto.passwort_kurz'))
      return
    }
    setBusy(true)
    try {
      const { needsConfirm } = await signUp(email, password, name)
      if (needsConfirm) {
        // Nicht so tun als waere alles fertig. Der Hinweis muss sichtbar sein.
        setInfo(t('konto.bestaetigung_noetig'))
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
      title={t('konto.konto_anlegen')}
      subtitle={t('konto.konto_anlegen_unter')}
      footer={
        <>
          <p>{t('konto.schon_konto')}</p>
          <Link to="/login" className="mt-3 inline-block">
            <Button type="button" variant="outline" size="lg">
              {t('konto.anmelden')}
            </Button>
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <Field label={t('begriff.name')} hint={t('konto.name_hinweis')}>
          <Input
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('konto.name_platzhalter')}
          />
        </Field>
        <Field label={t('konto.email')} required>
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
        <Field
          label={t('konto.passwort')}
          required
          error={weak ? t('konto.passwort_min') : null}
          hint={t('konto.passwort_hinweis')}
        >
          <PasswordInput
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('konto.neues_passwort_platzhalter')}
          />
        </Field>

        {error ? <ErrorBox error={error} /> : null}
        {info ? (
          <div className="rounded-2xl border border-warn/40 bg-warn/10 p-4">
            <p className="font-bold">{t('konto.fast_fertig')}</p>
            <p className="mt-1 text-base text-ink/80">{info}</p>
          </div>
        ) : null}

        <Button type="submit" full size="lg" loading={busy}>
          {t('konto.konto_anlegen')}
        </Button>
      </form>

      {info ? (
        <div className="mt-3">
          <Link to="/login" className="block">
            <Button type="button" variant="outline" size="lg" full>
              {t('konto.zur_anmeldung')}
            </Button>
          </Link>
        </div>
      ) : null}
    </AuthShell>
  )
}
