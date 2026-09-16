import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Loading, Wordmark } from '../components/ui'
import { getItem, logScan } from '../lib/api'

/* Ziel eines gescannten QR-Codes. Loest die Kiste auf und leitet weiter.
 * Wer nicht im Umzug ist, bekommt einen klaren Hinweis statt einer
 * leeren Seite. */
export default function ScanResolve() {
  const { itemId = '' } = useParams()
  const nav = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const item = await getItem(itemId)
        await logScan(item.project_id, item.id, 'QR-Code')
        if (alive) nav(`/app/p/${item.project_id}/kisten/${item.id}`, { replace: true })
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err))
      }
    })()
    return () => {
      alive = false
    }
  }, [itemId, nav])

  if (!error) return <Loading label="Kiste wird gesucht" />

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md p-6 text-center">
        <div className="mb-4 flex justify-center">
          <Wordmark size={30} />
        </div>
        <p className="font-bold">Diese Kiste ist fuer dich nicht sichtbar</p>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <p className="mt-2 text-sm text-muted">
          Wahrscheinlich gehoert der Code zu einem Umzug, in dem du nicht bist. Lass dir
          einen Einladungscode geben.
        </p>
        <Link to="/app" className="mt-5 inline-block">
          <Button>Zu meinen Umzuegen</Button>
        </Link>
      </Card>
    </div>
  )
}
