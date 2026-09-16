import { useCallback, useEffect, useRef, useState } from 'react'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/* ----------------------------------------------------------------- Codes */

export interface ParsedCode {
  prefix: string
  size: string
  seq: string
  ok: boolean
}

/** Zerlegt KUERZEL-GROESSE-NUMMER, z.B. W-3-007. */
export function parseCode(code: string | null | undefined): ParsedCode {
  const m = /^([A-Za-z0-9]{1,4})-(\d{1,2})-(\d+)$/.exec((code ?? '').trim())
  if (!m) return { prefix: code ?? '', size: '', seq: '', ok: false }
  return { prefix: m[1].toUpperCase(), size: m[2], seq: m[3], ok: true }
}

export function normalizeCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

/* ----------------------------------------------------------------- Farben */

/** Schwarz oder weiss, je nachdem was auf der Farbe lesbar ist. */
export function contrastOn(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return '#ffffff'
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const l = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return l > 0.45 ? '#0a0a0a' : '#ffffff'
}

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  if (h.length !== 6) return hex
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* ------------------------------------------------------------------ Zeit */

const dtf = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
const df = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' })
const tf = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

export function fmtDateTime(v: string | null | undefined): string {
  return v ? dtf.format(new Date(v)) : ''
}
export function fmtDate(v: string | null | undefined): string {
  return v ? df.format(new Date(v)) : ''
}
export function fmtTime(v: string | null | undefined): string {
  return v ? tf.format(new Date(v)) : ''
}

export function relTime(v: string | null | undefined): string {
  if (!v) return ''
  const diff = Date.now() - new Date(v).getTime()
  const s = Math.round(diff / 1000)
  if (s < 45) return 'gerade eben'
  const m = Math.round(s / 60)
  if (m < 60) return `vor ${m} Min.`
  const h = Math.round(m / 60)
  if (h < 24) return `vor ${h} Std.`
  const d = Math.round(h / 24)
  if (d === 1) return 'gestern'
  if (d < 7) return `vor ${d} Tagen`
  return fmtDate(v)
}

export function chatDayLabel(v: string): string {
  const d = new Date(v)
  const today = new Date()
  const yest = new Date()
  yest.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (same(d, today)) return 'Heute'
  if (same(d, yest)) return 'Gestern'
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }).format(d)
}

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${String(r).padStart(2, '0')}`
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/* ------------------------------------------------------------------ Text */

export function initials(name: string | null | undefined, fallback = '?'): string {
  const n = (name ?? '').trim()
  if (!n) return fallback
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback
}

export function suggestShort(name: string, taken: string[]): string {
  const clean = name.trim().replace(/[^A-Za-zAeOeUeaeoeuess0-9\s]/g, '')
  if (!clean) return ''
  const used = new Set(taken.map((t) => t.toUpperCase()))
  const words = clean.split(/\s+/).filter(Boolean)
  const cands: string[] = []
  if (words.length > 1) cands.push(words.map((w) => w[0]).join('').slice(0, 3).toUpperCase())
  cands.push(clean[0].toUpperCase())
  cands.push(clean.slice(0, 2).toUpperCase())
  cands.push(clean.slice(0, 3).toUpperCase())
  for (const c of cands) if (c && !used.has(c)) return c
  for (let i = 2; i < 100; i++) {
    const c = `${clean[0].toUpperCase()}${i}`
    if (!used.has(c)) return c
  }
  return ''
}

export function uid(): string {
  return crypto.randomUUID()
}

export function inviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  const buf = new Uint8Array(8)
  crypto.getRandomValues(buf)
  for (let i = 0; i < 8; i++) out += alphabet[buf[i] % alphabet.length]
  return `${out.slice(0, 4)}-${out.slice(4)}`
}

/* ----------------------------------------------------------------- Hooks */

export interface AsyncState<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
  setData: (updater: T | ((prev: T | null) => T | null)) => void
}

/** Drei unterscheidbare Zustaende: laedt, Fehler, Daten. Leer ist kein Fehler. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [nonce, setNonce] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fnRef
      .current()
      .then((res) => {
        if (!alive) return
        setData(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!alive) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  const update = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setData((prev) => (typeof updater === 'function' ? (updater as (p: T | null) => T | null)(prev) : updater))
  }, [])

  return { data, error, loading, reload, setData: update }
}

export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  const set = useCallback(
    (next: T) => {
      setV(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* Speicher voll oder gesperrt, die Ansicht laeuft trotzdem weiter */
      }
    },
    [key],
  )
  return [v, set]
}

/* ----------------------------------------------------------------- Sonstiges */

export function download(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return ''
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n')
}
