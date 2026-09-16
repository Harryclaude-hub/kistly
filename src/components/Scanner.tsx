import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { CameraOff, Flashlight, RefreshCw } from 'lucide-react'
import { useT } from '../lib/i18n'
import { Button, IconButton } from './ui'

/** Kurzer Bestaetigungston. Ohne Datei, damit nichts nachgeladen wird. */
function beep(ok = true) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = ok ? 980 : 320
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.18)
    setTimeout(() => void ctx.close(), 400)
  } catch {
    /* Ton ist Zugabe, kein Muss */
  }
}

/* Gemerkt wird der Schluessel, nicht der fertige Satz. Sonst bliebe eine
 * Meldung, die beim Starten der Kamera entstanden ist, in der Sprache von
 * damals stehen, auch wenn der Nutzer danach umschaltet. Ausserdem haengt
 * der Kamera-Start so nicht an der Uebersetzungsfunktion und startet bei
 * einem Sprachwechsel nicht neu. */
interface KameraFehler {
  key: string
  grund?: string
}

export function Scanner({
  onResult,
  paused = false,
}: {
  onResult: (text: string) => void
  paused?: boolean
}) {
  const t = useT()
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 })
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const [error, setError] = useState<KameraFehler | null>(null)
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 180,
      delayBetweenScanSuccess: 900,
    })

    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError({ key: 'scannen.kamera_kein_zugriff' })
          return
        }
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current!,
          (result) => {
            if (!result || pausedRef.current) return
            const text = result.getText()
            const now = Date.now()
            // Derselbe Code hintereinander wird nur einmal gemeldet.
            if (lastRef.current.text === text && now - lastRef.current.at < 2500) return
            lastRef.current = { text, at: now }
            beep(true)
            navigator.vibrate?.(60)
            onResult(text)
          },
        )
        if (cancelled) {
          controls.stop()
          return
        }
        controlsRef.current = controls

        const stream = videoRef.current?.srcObject as MediaStream | null
        const track = stream?.getVideoTracks()[0]
        const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined
        setHasTorch(Boolean(caps?.torch))
      } catch (err) {
        const e = err as DOMException
        setError(
          e.name === 'NotAllowedError'
            ? { key: 'scannen.kamera_abgelehnt' }
            : e.name === 'NotFoundError'
              ? { key: 'scannen.kamera_nicht_gefunden' }
              : { key: 'scannen.kamera_fehler', grund: e.message || String(err) },
        )
      }
    })()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [onResult, nonce])

  async function toggleTorch() {
    const stream = videoRef.current?.srcObject as MediaStream | null
    const track = stream?.getVideoTracks()[0]
    if (!track) return
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torchOn } as unknown as MediaTrackConstraintSet],
      })
      setTorchOn((v) => !v)
    } catch {
      setHasTorch(false)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-raised p-8 text-center">
        <CameraOff size={28} className="text-muted" />
        <p className="t-name">{t('scannen.kamera_laeuft_nicht')}</p>
        <p className="t-sub max-w-xs">
          {t(error.key, error.grund ? { grund: error.grund } : undefined)}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null)
            setNonce((n) => n + 1)
          }}
        >
          <RefreshCw size={18} /> {t('aktion.nochmal')}
        </Button>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="aspect-[3/4] w-full object-cover sm:aspect-video"
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={`h-48 w-48 rounded-2xl border-2 transition ${
            paused ? 'border-ok' : 'border-white/80'
          }`}
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }}
        />
      </div>
      {hasTorch ? (
        <IconButton
          label={t(torchOn ? 'scannen.licht_aus' : 'scannen.licht_an')}
          onClick={() => void toggleTorch()}
          className="absolute bottom-3 end-3"
        >
          {/* Die eigene Farbe am Symbol schlaegt die geerbte des Knopfes,
              so sieht man im Dunkeln, dass das Licht gerade an ist. */}
          <Flashlight size={20} className={torchOn ? 'text-warn' : undefined} />
        </IconButton>
      ) : null}
      <p className="absolute inset-x-0 bottom-3 text-center text-sm font-bold text-white/90">
        {paused ? t('scannen.treffer') : t('scannen.rahmen_hinweis')}
      </p>
    </div>
  )
}
