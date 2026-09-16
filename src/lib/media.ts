import { useEffect, useState } from 'react'
import { supabase, errText } from './supabase'

export type Bucket = 'item-photos' | 'chat-media' | 'avatars'

/* ------------------------------------------------------------ Verkleinern */

/** Bild auf Kantenlaenge begrenzen und als JPEG packen. Spart Upload und
 *  Speicher, ohne dass man auf dem Etikett etwas verliert. */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob((b) => res(b), 'image/jpeg', quality),
    )
    return blob && blob.size < file.size ? blob : file
  } catch (err) {
    console.warn('[media] Verkleinern nicht moeglich, lade Original:', err)
    return file
  }
}

/* --------------------------------------------------------------- Upload */

export async function uploadTo(
  bucket: Bucket,
  path: string,
  body: Blob,
  contentType?: string,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, body, {
    contentType: contentType ?? body.type ?? 'application/octet-stream',
    upsert: false,
    cacheControl: '3600',
  })
  if (error) throw new Error(`Hochladen: ${errText(error)}`)
  return path
}

export function extOf(file: { name?: string; type?: string }, fallback = 'bin'): string {
  const fromName = file.name?.includes('.') ? file.name.split('.').pop()! : ''
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'application/pdf': 'pdf',
  }
  return map[file.type ?? ''] ?? fallback
}

/* ---------------------------------------------------------- Signierte URLs */

const cache = new Map<string, { url: string; exp: number }>()
const TTL = 60 * 60 // Sekunden

export async function signedUrl(bucket: Bucket, path: string): Promise<string | null> {
  const key = `${bucket}/${path}`
  const hit = cache.get(key)
  if (hit && hit.exp > Date.now() + 60_000) return hit.url
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, TTL)
  if (error || !data?.signedUrl) {
    console.warn('[media] signierte URL fehlgeschlagen:', error?.message)
    return null
  }
  cache.set(key, { url: data.signedUrl, exp: Date.now() + TTL * 1000 })
  return data.signedUrl
}

export async function signedUrls(bucket: Bucket, paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const missing: string[] = []
  for (const p of paths) {
    const hit = cache.get(`${bucket}/${p}`)
    if (hit && hit.exp > Date.now() + 60_000) out.set(p, hit.url)
    else missing.push(p)
  }
  if (missing.length) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrls(missing, TTL)
    if (error) console.warn('[media] signierte URLs fehlgeschlagen:', error.message)
    for (const row of data ?? []) {
      if (row.signedUrl && row.path) {
        out.set(row.path, row.signedUrl)
        cache.set(`${bucket}/${row.path}`, { url: row.signedUrl, exp: Date.now() + TTL * 1000 })
      }
    }
  }
  return out
}

export function useSignedUrl(bucket: Bucket, path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (!path) {
      setUrl(null)
      return
    }
    signedUrl(bucket, path).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [bucket, path])
  return url
}

/* --------------------------------------------------------- Sprachaufnahme */

export interface Recording {
  blob: Blob
  seconds: number
  mimeType: string
}

export class VoiceRecorder {
  private rec: MediaRecorder | null = null
  private chunks: Blob[] = []
  private stream: MediaStream | null = null
  private startedAt = 0

  static supported(): boolean {
    return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  }

  private static pickMime(): string {
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    for (const c of candidates) {
      if (MediaRecorder.isTypeSupported?.(c)) return c
    }
    return ''
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = VoiceRecorder.pickMime()
    this.rec = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    this.chunks = []
    this.rec.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.startedAt = Date.now()
    this.rec.start(250)
  }

  get seconds(): number {
    return this.startedAt ? (Date.now() - this.startedAt) / 1000 : 0
  }

  async stop(): Promise<Recording> {
    const rec = this.rec
    if (!rec) throw new Error('Es laeuft keine Aufnahme')
    const seconds = this.seconds
    const done = new Promise<void>((resolve) => {
      rec.onstop = () => resolve()
    })
    rec.stop()
    await done
    this.stream?.getTracks().forEach((t) => t.stop())
    const mimeType = rec.mimeType || 'audio/webm'
    const blob = new Blob(this.chunks, { type: mimeType })
    this.rec = null
    this.stream = null
    this.chunks = []
    if (blob.size === 0) throw new Error('Die Aufnahme ist leer geblieben')
    return { blob, seconds, mimeType }
  }

  cancel(): void {
    try {
      this.rec?.stop()
    } catch {
      /* war schon gestoppt */
    }
    this.stream?.getTracks().forEach((t) => t.stop())
    this.rec = null
    this.stream = null
    this.chunks = []
  }
}
