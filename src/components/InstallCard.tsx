import { useEffect, useState } from 'react'
import { Share, Smartphone, X } from 'lucide-react'
import { Button, Card, IconButton } from './ui'
import { useLocalState } from '../lib/util'
import { useT } from '../lib/i18n'

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
  const t = useT()
  const ios = typeof navigator !== 'undefined' && isIos()

  if (installed) return null
  if (compact && hidden) return null
  if (!canPrompt && !ios) return null

  return (
    <Card className="relative overflow-hidden p-4">
      {compact ? (
        <IconButton
          size="sm"
          label={t('einstellungen.install_ausblenden')}
          onClick={() => setHidden(true)}
          className="absolute end-2 top-2"
        >
          <X size={16} />
        </IconButton>
      ) : null}
      <div className="flex items-start gap-3">
        <Smartphone size={22} className="mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">{t('einstellungen.install_titel')}</p>
          {ios && !canPrompt ? (
            <p className="mt-1 text-sm text-muted">
              {t('einstellungen.install_ios_1')} <Share size={13} className="inline" />{' '}
              {t('einstellungen.install_ios_2')}
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted">{t('einstellungen.install_text')}</p>
              <Button size="sm" className="mt-3" onClick={() => void install()}>
                {t('einstellungen.install_knopf')}
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
