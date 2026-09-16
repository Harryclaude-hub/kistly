import { useEffect, useState } from 'react'
import { Share, Smartphone, X } from 'lucide-react'
import { Button, Card } from './ui'
import { useLocalState } from '../lib/util'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS meldet das ueber ein eigenes Feld
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function useInstall() {
  const [, force] = useState(0)
  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }, [])

  return {
    canPrompt: Boolean(deferred),
    installed: typeof window !== 'undefined' && isStandalone(),
    async install(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
      if (!deferred) return 'unavailable'
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      if (outcome === 'accepted') deferred = null
      listeners.forEach((l) => l())
      return outcome
    },
  }
}

export function InstallCard({ compact = false }: { compact?: boolean }) {
  const { canPrompt, installed, install } = useInstall()
  const [hidden, setHidden] = useLocalState('kistly.hideInstall', false)
  const ios = typeof navigator !== 'undefined' && isIos()

  if (installed) return null
  if (compact && hidden) return null
  if (!canPrompt && !ios) return null

  return (
    <Card className="relative overflow-hidden p-4">
      {compact ? (
        <button
          onClick={() => setHidden(true)}
          aria-label="Hinweis ausblenden"
          className="absolute right-2 top-2 rounded-lg p-1.5 text-muted hover:bg-raised"
        >
          <X size={16} />
        </button>
      ) : null}
      <div className="flex items-start gap-3">
        <Smartphone size={22} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">Kistly auf den Startbildschirm</p>
          {ios && !canPrompt ? (
            <p className="mt-1 text-sm text-muted">
              In Safari unten auf <Share size={13} className="inline" /> Teilen tippen, dann
              auf Zum Home-Bildschirm. Danach startet Kistly wie eine normale App, mit Logo.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">
                Ein Tipp, und Kistly liegt mit Logo auf deinem Startbildschirm. Ohne
                Browserleiste, mit Benachrichtigungen.
              </p>
              <Button size="sm" className="mt-3" onClick={() => void install()}>
                Jetzt installieren
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
