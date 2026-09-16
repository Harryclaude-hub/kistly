import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser'
import { CameraOff, Flashlight, RefreshCw } from 'lucide-react'
import { Button } from './ui'

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

export function Scanner({
  onResult,
  paused = false,
}: {
  onResult: (text: string) => void
  paused?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 })
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const [error, setError] = useState<string | null>(null)
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
          setError('Dieser Browser gibt keinen Zugriff auf die Kamera.')
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
            ? 'Der Zugriff auf die Kamera wurde abgelehnt. In den Seiteneinstellungen des Browsers wieder erlauben.'
            : e.name === 'NotFoundError'
              ? 'Es wurde keine Kamera gefunden.'
              : `Kamera nicht verfuegbar: ${e.message || String(err)}`,
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
        <p className="text-sm font-semibold">Kamera laeuft nicht</p>
        <p className="max-w-xs text-sm text-muted">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError(null)
            setNonce((n) => n + 1)
          }}
        >
          <RefreshCw size={14} /> Nochmal versuchen
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
        <button
          onClick={() => void toggleTorch()}
          aria-label="Licht"
          className={`absolute bottom-3 right-3 rounded-full p-3 ${
            torchOn ? 'bg-white text-black' : 'bg-black/50 text-white'
          }`}
        >
          <Flashlight size={18} />
        </button>
      ) : null}
      <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-white/85">
        {paused ? 'Treffer' : 'QR-Code in den Rahmen halten'}
      </p>
    </div>
  )
}
