import { Link } from 'react-router-dom'
import { Button, Wordmark } from '../components/ui'
import { useT } from '../lib/i18n'

export default function NotFound() {
  const t = useT()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <Wordmark size={34} />
      {/* Die Zahl ist in jeder Sprache 404 und bleibt von links nach rechts. */}
      <p className="t-serial text-6xl">404</p>
      <p className="max-w-sm text-base text-muted">{t('start.nichtgefunden.text')}</p>
      <Link to="/app">
        <Button size="lg">{t('start.nichtgefunden.zurueck')}</Button>
      </Link>
    </div>
  )
}
