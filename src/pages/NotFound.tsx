import { Link } from 'react-router-dom'
import { Button, Wordmark } from '../components/ui'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <Wordmark size={34} />
      <p className="font-mono text-6xl font-black">404</p>
      <p className="max-w-sm text-muted">
        Diese Seite gibt es nicht. Vielleicht wurde der Umzug geloescht oder der Link ist alt.
      </p>
      <Link to="/app">
        <Button>Zur Uebersicht</Button>
      </Link>
    </div>
  )
}
