import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { useSignedUrl } from '../lib/media'
import { fmtDuration } from '../lib/util'

/* Balken, die sich aus der Dateilaenge ergeben. Kein echtes Wellenbild,
 * aber ein ruhiges, gleichmaessiges Muster statt eines nackten Reglers. */
function bars(seed: string, count = 26): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return Array.from({ length: count }, (_, i) => {
    h = (h * 1103515245 + 12345 + i) >>> 0
    return 0.25 + ((h >>> 16) % 100) / 133
  })
}

export function VoiceBubble({
  path,
  seconds,
  own,
}: {
  path: string
  seconds: number
  own: boolean
}) {
  const url = useSignedUrl('chat-media', path)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const shape = bars(path)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onTime = () => setPos(a.currentTime)
    const onEnd = () => {
      setPlaying(false)
      setPos(0)
    }
    a.addEventListener('timeupdate', onTime)
    a.addEventListener('ended', onEnd)
    return () => {
      a.removeEventListener('timeupdate', onTime)
      a.removeEventListener('ended', onEnd)
    }
  }, [url])

  const total = seconds || audioRef.current?.duration || 0
  const progress = total > 0 ? pos / total : 0

  return (
    <div className="flex min-w-[190px] items-center gap-3">
      <button
        onClick={() => {
          const a = audioRef.current
          if (!a) return
          if (playing) {
            a.pause()
            setPlaying(false)
          } else {
            void a.play()
            setPlaying(true)
          }
        }}
        disabled={!url}
        aria-label={playing ? 'Pause' : 'Abspielen'}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          own ? 'bg-paper/20 text-paper' : 'bg-ink text-paper'
        } disabled:opacity-40`}
      >
        {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
      </button>

      <div className="flex-1">
        <div className="flex h-7 items-center gap-[2px]">
          {shape.map((v, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full transition-opacity"
              style={{
                height: `${Math.round(v * 26)}px`,
                background: 'currentColor',
                opacity: i / shape.length <= progress ? 1 : 0.35,
              }}
            />
          ))}
        </div>
        <div className="mt-0.5 font-mono text-[10px] opacity-70">
          {fmtDuration(playing || pos > 0 ? pos : total)}
        </div>
      </div>

      {url ? <audio ref={audioRef} src={url} preload="metadata" /> : null}
    </div>
  )
}
