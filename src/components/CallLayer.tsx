import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth, displayNameOf } from '../lib/auth'
import type { Call, ProjectMember } from '../lib/types'
import {
  createCall,
  getCall,
  sendMessage,
  setCallStatus,
  setParticipantState,
} from '../lib/api'
import { notifyProject } from '../lib/push'
import { CallSession, type PeerInfo } from '../lib/webrtc'
import { Avatar, Button, useToast } from './ui'
import { fmtDuration } from '../lib/util'

interface CallCtxValue {
  start: (video: boolean) => Promise<void>
  busy: boolean
  inCall: boolean
}
const Ctx = createContext<CallCtxValue | null>(null)

export function useCalls(): CallCtxValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCalls ausserhalb von CallProvider')
  return v
}

/* Klingelton ohne Datei: kurzer Zweiklang im Sekundentakt. */
function useRingtone(active: boolean) {
  const ref = useRef<{ ctx: AudioContext; timer: number } | null>(null)
  useEffect(() => {
    if (!active) return
    let stopped = false
    try {
      const ctx = new AudioContext()
      const beep = () => {
        if (stopped || ctx.state === 'closed') return
        ;[0, 0.28].forEach((offset, i) => {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.frequency.value = i === 0 ? 660 : 520
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset)
          gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + offset + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.24)
          osc.connect(gain).connect(ctx.destination)
          osc.start(ctx.currentTime + offset)
          osc.stop(ctx.currentTime + offset + 0.26)
        })
        navigator.vibrate?.([300, 200, 300])
      }
      beep()
      const timer = window.setInterval(beep, 2200)
      ref.current = { ctx, timer }
    } catch (err) {
      console.warn('[call] Klingelton nicht moeglich:', err)
    }
    return () => {
      stopped = true
      if (ref.current) {
        clearInterval(ref.current.timer)
        void ref.current.ctx.close()
        ref.current = null
      }
      navigator.vibrate?.(0)
    }
  }, [active])
}

function PeerTile({
  name,
  stream,
  state,
  muted,
}: {
  name: string
  stream: MediaStream | null
  state: string
  muted?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream
  }, [stream])
  const hasVideo = Boolean(stream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live'))
  return (
    <div className="relative flex aspect-square min-h-24 items-center justify-center overflow-hidden rounded-2xl bg-raised">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={hasVideo ? 'h-full w-full object-cover' : 'hidden'}
      />
      {!hasVideo ? (
        <div className="flex flex-col items-center gap-2">
          <Avatar name={name} size={56} />
          <span className="text-xs font-semibold">{name}</span>
        </div>
      ) : null}
      <span className="absolute bottom-1.5 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {state === 'connected' ? name : state === 'failed' ? 'Verbindung fehlgeschlagen' : 'verbindet'}
      </span>
    </div>
  )
}

export function CallProvider({
  projectId,
  projectName,
  members,
  children,
}: {
  projectId: string
  projectName: string
  members: ProjectMember[]
  children: ReactNode
}) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const uid = user?.id ?? ''

  const [incoming, setIncoming] = useState<Call | null>(null)
  const [active, setActive] = useState<Call | null>(null)
  const [session, setSession] = useState<CallSession | null>(null)
  const [peers, setPeers] = useState<PeerInfo[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [busy, setBusy] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const ringTimer = useRef<number | null>(null)

  useRingtone(Boolean(incoming))

  const nameOf = useCallback(
    (id: string) => {
      const m = members.find((x) => x.user_id === id)
      return displayNameOf(m?.profile, 'Jemand')
    },
    [members],
  )

  /* -------------------------------------------------- eingehende Anrufe */
  useEffect(() => {
    if (!uid) return
    const ch = supabase
      .channel(`calls-for-${uid}-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_participants',
          filter: `user_id=eq.${uid}`,
        },
        async (payload) => {
          const row = payload.new as { call_id: string; state: string }
          if (row.state !== 'invited') return
          try {
            const { call } = await getCall(row.call_id)
            if (call.project_id !== projectId) return
            if (call.status !== 'ringing') return
            if (Date.now() - new Date(call.created_at).getTime() > 60_000) return
            setIncoming(call)
          } catch (err) {
            console.warn('[call] eingehender Anruf konnte nicht geladen werden:', err)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'calls', filter: `project_id=eq.${projectId}` },
        (payload) => {
          const call = payload.new as Call
          if (call.status !== 'ringing') {
            setIncoming((cur) => (cur && cur.id === call.id ? null : cur))
          }
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [uid, projectId])

  /* ----------------------------------------------------------- Laufzeit */
  useEffect(() => {
    if (!active) {
      setSeconds(0)
      return
    }
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [active])

  const teardown = useCallback(
    async (call: Call | null, reason: 'ended' | 'declined' | 'missed') => {
      if (ringTimer.current) {
        clearInterval(ringTimer.current)
        ringTimer.current = null
      }
      session?.hangup()
      setSession(null)
      setPeers([])
      setLocalStream(null)
      setActive(null)
      setMuted(false)
      setCamOff(false)
      if (!call) return
      try {
        await setCallStatus(call.id, reason)
        if (call.created_by === uid) {
          await notifyProject(projectId, {
            title: 'Anruf beendet',
            type: 'call-cancel',
            tag: `call-${call.id}`,
          })
          await sendMessage({
            project_id: projectId,
            kind: 'call',
            call_id: call.id,
            body:
              reason === 'ended'
                ? `Anruf beendet, ${fmtDuration(seconds)}`
                : reason === 'declined'
                  ? 'Anruf abgelehnt'
                  : 'Anruf nicht angenommen',
          })
        }
      } catch (err) {
        console.warn('[call] Aufraeumen unvollstaendig:', err)
      }
    },
    [session, uid, projectId, seconds],
  )

  const attach = useCallback((s: CallSession) => {
    s.on('peers', setPeers)
      .on('localStream', setLocalStream)
      .on('error', (m) => toast(m, 'error'))
    setSession(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ------------------------------------------------------ Anruf starten */
  const start = useCallback(
    async (video: boolean) => {
      if (!uid) return
      setBusy(true)
      try {
        const others = members.map((m) => m.user_id).filter((id) => id !== uid)
        if (others.length === 0) {
          toast('In diesem Umzug ist sonst niemand, den man anrufen koennte.', 'error')
          return
        }
        const call = await createCall(projectId, video, others)
        const s = new CallSession(call.id, uid, video)
        attach(s)
        await s.start()
        setActive(call)

        // So lange es klingelt, regelmaessig erinnern. Genau das war der
        // Wunsch: bei Anrufen wiederholte Benachrichtigungen.
        const ring = async () => {
          await notifyProject(
            projectId,
            {
              title: `${displayNameOf(profile, 'Jemand')} ruft an`,
              body: `${projectName}${video ? ', Videoanruf' : ''}`,
              type: 'call',
              tag: `call-${call.id}`,
              callId: call.id,
              url: `/app/p/${projectId}/chat`,
              callUrl: `/app/p/${projectId}/chat?call=${call.id}`,
            },
            others,
          )
        }
        void ring()
        let ticks = 0
        ringTimer.current = window.setInterval(async () => {
          ticks += 1
          const fresh = await getCall(call.id).catch(() => null)
          const answered = fresh?.parts.some((p) => p.user_id !== uid && p.state === 'joined')
          if (answered || !fresh || fresh.call.status !== 'ringing') {
            if (ringTimer.current) clearInterval(ringTimer.current)
            ringTimer.current = null
            if (answered) await setCallStatus(call.id, 'active')
            return
          }
          if (ticks > 8) {
            if (ringTimer.current) clearInterval(ringTimer.current)
            ringTimer.current = null
            toast('Niemand ist rangegangen.', 'info')
            await teardown(call, 'missed')
            return
          }
          void ring()
        }, 5000)
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), 'error')
        session?.hangup()
        setSession(null)
        setActive(null)
      } finally {
        setBusy(false)
      }
    },
    [uid, members, projectId, projectName, profile, attach, toast, teardown, session],
  )

  const accept = useCallback(async () => {
    if (!incoming || !uid) return
    const call = incoming
    setIncoming(null)
    setBusy(true)
    try {
      await setParticipantState(call.id, uid, 'joined')
      await setCallStatus(call.id, 'active')
      const s = new CallSession(call.id, uid, call.video)
      attach(s)
      await s.start()
      setActive(call)
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
      setActive(null)
    } finally {
      setBusy(false)
    }
  }, [incoming, uid, attach, toast])

  const decline = useCallback(async () => {
    if (!incoming || !uid) return
    const call = incoming
    setIncoming(null)
    try {
      await setParticipantState(call.id, uid, 'declined')
    } catch (err) {
      console.warn('[call] Ablehnen nicht gespeichert:', err)
    }
  }, [incoming, uid])

  useEffect(
    () => () => {
      session?.hangup()
      if (ringTimer.current) clearInterval(ringTimer.current)
    },
    [session],
  )

  const value = useMemo<CallCtxValue>(
    () => ({ start, busy, inCall: Boolean(active) }),
    [start, busy, active],
  )

  return (
    <Ctx.Provider value={value}>
      {children}

      {/* Eingehender Anruf */}
      {incoming ? (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black/80 p-6 text-white backdrop-blur">
          <Avatar name={nameOf(incoming.created_by ?? '')} size={92} />
          <p className="mt-5 text-xl font-bold">{nameOf(incoming.created_by ?? '')}</p>
          <p className="animate-pulse-soft mt-1 text-sm text-white/70">
            {incoming.video ? 'Videoanruf' : 'Anruf'} in {projectName}
          </p>
          <div className="mt-10 flex gap-6">
            <button
              onClick={() => void decline()}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-danger text-white"
              aria-label="Ablehnen"
            >
              <PhoneOff size={26} />
            </button>
            <button
              onClick={() => void accept()}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-ok text-white"
              aria-label="Annehmen"
            >
              <Phone size={26} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Laufender Anruf */}
      {active ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-line bg-surface shadow-2xl">
          <div className="mx-auto max-w-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">
                  {active.video ? 'Videoanruf' : 'Anruf'} laeuft
                </p>
                <p className="font-mono text-xs text-muted">{fmtDuration(seconds)}</p>
              </div>
              <span className="text-xs text-muted">
                {peers.filter((p) => p.state === 'connected').length + 1} verbunden
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <PeerTile
                name={displayNameOf(profile, 'Du')}
                stream={localStream}
                state="connected"
                muted
              />
              {peers.map((p) => (
                <PeerTile key={p.userId} name={nameOf(p.userId)} stream={p.stream} state={p.state} />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                variant={muted ? 'danger' : 'soft'}
                size="icon"
                onClick={() => {
                  const next = !muted
                  setMuted(next)
                  session?.setMuted(next)
                }}
                aria-label={muted ? 'Mikrofon an' : 'Mikrofon aus'}
              >
                {muted ? <MicOff size={18} /> : <Mic size={18} />}
              </Button>
              {active.video ? (
                <Button
                  variant={camOff ? 'danger' : 'soft'}
                  size="icon"
                  onClick={() => {
                    const next = !camOff
                    setCamOff(next)
                    session?.setCameraOff(next)
                  }}
                  aria-label={camOff ? 'Kamera an' : 'Kamera aus'}
                >
                  {camOff ? <VideoOff size={18} /> : <Video size={18} />}
                </Button>
              ) : null}
              <Button variant="danger" onClick={() => void teardown(active, 'ended')}>
                <PhoneOff size={18} /> Auflegen
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Ctx.Provider>
  )
}
