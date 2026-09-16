/* Sprach- und Videoanrufe.
 * Die Verbindung laeuft direkt zwischen den Geraeten (WebRTC), nur die
 * Aushandlung geht ueber einen Supabase-Realtime-Kanal.
 *
 * Grenze, die man kennen muss: ohne TURN-Server scheitert die direkte
 * Verbindung in manchen Mobilfunknetzen. Dann meldet sich hier der Zustand
 * "failed", statt still nichts zu tun. Ein TURN-Server laesst sich in
 * ICE_SERVERS nachtragen.
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { tg } from './i18n'

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
]

export type PeerState = 'new' | 'connecting' | 'connected' | 'failed' | 'closed'

export interface PeerInfo {
  userId: string
  state: PeerState
  stream: MediaStream | null
}

type Events = {
  peers: (peers: PeerInfo[]) => void
  localStream: (stream: MediaStream | null) => void
  error: (message: string) => void
  ended: () => void
}

interface Signal {
  kind: 'hello' | 'bye' | 'offer' | 'answer' | 'ice'
  from: string
  to?: string
  sdp?: RTCSessionDescriptionInit
  ice?: RTCIceCandidateInit
}

export class CallSession {
  readonly callId: string
  readonly selfId: string
  readonly video: boolean

  private channel: RealtimeChannel | null = null
  private peers = new Map<string, RTCPeerConnection>()
  private streams = new Map<string, MediaStream>()
  private states = new Map<string, PeerState>()
  private pendingIce = new Map<string, RTCIceCandidateInit[]>()
  private local: MediaStream | null = null
  private handlers: Partial<Events> = {}
  private closed = false

  constructor(callId: string, selfId: string, video: boolean) {
    this.callId = callId
    this.selfId = selfId
    this.video = video
  }

  on<K extends keyof Events>(event: K, fn: Events[K]): this {
    this.handlers[event] = fn
    return this
  }

  private emitPeers() {
    const list: PeerInfo[] = [...this.peers.keys()].map((id) => ({
      userId: id,
      state: this.states.get(id) ?? 'new',
      stream: this.streams.get(id) ?? null,
    }))
    this.handlers.peers?.(list)
  }

  get localStream(): MediaStream | null {
    return this.local
  }

  async start(): Promise<void> {
    try {
      this.local = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: this.video ? { facingMode: 'user' } : false,
      })
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? tg('fehler.mikrofon_abgelehnt')
          : tg('fehler.mikrofon_fehlt', {
              grund: err instanceof Error ? err.message : String(err),
            })
      this.handlers.error?.(msg)
      throw new Error(msg)
    }
    this.handlers.localStream?.(this.local)

    this.channel = supabase.channel(`call:${this.callId}`, {
      config: { broadcast: { self: false, ack: false } },
    })
    this.channel.on('broadcast', { event: 'signal' }, ({ payload }) => {
      void this.onSignal(payload as Signal)
    })
    await this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') this.send({ kind: 'hello', from: this.selfId })
      if (status === 'CHANNEL_ERROR') this.handlers.error?.(tg('fehler.signalkanal'))
    })
  }

  private send(sig: Signal) {
    this.channel?.send({ type: 'broadcast', event: 'signal', payload: sig })
  }

  private setState(id: string, s: PeerState) {
    this.states.set(id, s)
    this.emitPeers()
  }

  private peer(id: string): RTCPeerConnection {
    const existing = this.peers.get(id)
    if (existing) return existing

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    this.peers.set(id, pc)
    this.setState(id, 'connecting')

    this.local?.getTracks().forEach((t) => pc.addTrack(t, this.local!))

    pc.onicecandidate = (e) => {
      if (e.candidate) this.send({ kind: 'ice', from: this.selfId, to: id, ice: e.candidate.toJSON() })
    }
    pc.ontrack = (e) => {
      const stream = e.streams[0] ?? new MediaStream([e.track])
      this.streams.set(id, stream)
      this.emitPeers()
    }
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState
      if (s === 'connected') this.setState(id, 'connected')
      else if (s === 'failed') {
        this.setState(id, 'failed')
        this.handlers.error?.(tg('fehler.verbindung_direkt'))
      } else if (s === 'disconnected' || s === 'closed') this.setState(id, 'closed')
    }
    return pc
  }

  /** Wer die kleinere Kennung hat, macht das Angebot. So bietet nie
   *  jemand doppelt an. */
  private isOfferer(other: string): boolean {
    return this.selfId < other
  }

  private async onSignal(sig: Signal) {
    if (this.closed) return
    if (sig.from === this.selfId) return
    if (sig.to && sig.to !== this.selfId) return

    if (sig.kind === 'hello') {
      // Auch der Neue muss von uns erfahren.
      this.send({ kind: 'hello', from: this.selfId, to: sig.from })
      const pc = this.peer(sig.from)
      if (this.isOfferer(sig.from) && pc.signalingState === 'stable' && !pc.currentRemoteDescription) {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        this.send({ kind: 'offer', from: this.selfId, to: sig.from, sdp: offer })
      }
      return
    }

    if (sig.kind === 'bye') {
      this.dropPeer(sig.from)
      return
    }

    const pc = this.peer(sig.from)

    if (sig.kind === 'offer' && sig.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp))
      await this.flushIce(sig.from, pc)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      this.send({ kind: 'answer', from: this.selfId, to: sig.from, sdp: answer })
      return
    }

    if (sig.kind === 'answer' && sig.sdp) {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(sig.sdp))
        await this.flushIce(sig.from, pc)
      }
      return
    }

    if (sig.kind === 'ice' && sig.ice) {
      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(sig.ice)).catch((err) => {
          console.warn('[call] ICE abgelehnt:', err)
        })
      } else {
        const list = this.pendingIce.get(sig.from) ?? []
        list.push(sig.ice)
        this.pendingIce.set(sig.from, list)
      }
    }
  }

  private async flushIce(id: string, pc: RTCPeerConnection) {
    const list = this.pendingIce.get(id)
    if (!list) return
    for (const c of list) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
    }
    this.pendingIce.delete(id)
  }

  private dropPeer(id: string) {
    this.peers.get(id)?.close()
    this.peers.delete(id)
    this.streams.delete(id)
    this.states.delete(id)
    this.emitPeers()
  }

  setMuted(muted: boolean) {
    this.local?.getAudioTracks().forEach((t) => {
      t.enabled = !muted
    })
  }

  setCameraOff(off: boolean) {
    this.local?.getVideoTracks().forEach((t) => {
      t.enabled = !off
    })
  }

  hangup() {
    if (this.closed) return
    this.closed = true
    this.send({ kind: 'bye', from: this.selfId })
    this.peers.forEach((pc) => pc.close())
    this.peers.clear()
    this.streams.clear()
    this.states.clear()
    this.local?.getTracks().forEach((t) => t.stop())
    this.local = null
    this.handlers.localStream?.(null)
    if (this.channel) {
      void supabase.removeChannel(this.channel)
      this.channel = null
    }
    this.handlers.ended?.()
  }
}
