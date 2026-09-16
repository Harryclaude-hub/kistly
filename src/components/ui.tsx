import QRCode from 'qrcode'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Eye, EyeOff, Loader2, X } from 'lucide-react'
import { contrastOn, cx, initials, parseCode } from '../lib/util'
import { STATUS_COLOR, STATUS_LABEL, type ItemStatus } from '../lib/types'

/* ------------------------------------------------------------------ Logo */

export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Kistly"
    >
      <rect width="512" height="512" rx="116" className="fill-ink" />
      <g
        fill="none"
        className="stroke-paper"
        strokeWidth="30"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <rect x="118" y="148" width="276" height="244" rx="22" />
        <path d="M118 226 H394" />
        <path d="M256 148 V226" />
      </g>
      <circle cx="378" cy="378" r="76" className="fill-ink" />
      <circle cx="378" cy="378" r="54" fill="#EF4444" />
    </svg>
  )
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Logo size={size} />
      <span className="text-[1.35rem] font-black tracking-tight">Kistly</span>
    </span>
  )
}

/* --------------------------------------------------------------- Buttons */

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'soft'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  full?: boolean
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper hover:opacity-90 active:opacity-80',
  soft: 'bg-raised text-ink hover:bg-line',
  ghost: 'text-ink hover:bg-raised',
  outline: 'border border-line text-ink hover:bg-raised',
  danger: 'bg-danger text-white hover:opacity-90',
}

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  icon: 'h-10 w-10 justify-center',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  full,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center rounded-xl font-semibold transition select-none',
        'disabled:opacity-45 disabled:cursor-not-allowed',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        VARIANT[variant],
        SIZES[size],
        full && 'w-full justify-center',
        className,
      )}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : null}
      {children}
    </button>
  )
}

/* ---------------------------------------------------------------- Felder */

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label?: string
  hint?: string
  error?: string | null
  children: ReactNode
  required?: boolean
}) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-1.5 block text-sm font-semibold">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </span>
      ) : null}
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  )
}

const FIELD_BASE =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink ' +
  'placeholder:text-muted/70 outline-none transition focus:border-ink/40 ' +
  'focus:ring-2 focus:ring-ink/10 disabled:opacity-50'

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(FIELD_BASE, className)} />
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(FIELD_BASE, 'min-h-[92px] resize-y', className)} />
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx(FIELD_BASE, 'appearance-none pr-9', className)}>
      {children}
    </select>
  )
}

export function PasswordInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        {...rest}
        type={show ? 'text' : 'password'}
        className={cx(FIELD_BASE, 'pr-11', className)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Passwort verbergen' : 'Passwort anzeigen'}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted hover:bg-raised hover:text-ink"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
        <span className="block text-sm font-semibold">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </label>
      <button
        id={id}
        role="switch"
        type="button"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-40',
          checked ? 'bg-ok' : 'bg-line',
        )}
      >
        <span
          className={cx(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  )
}

/* ---------------------------------------------------------------- Kacheln */

export function Card({
  children,
  className,
  as: As = 'div',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <As
      {...rest}
      className={cx('rounded-2xl border border-line bg-surface', className)}
    >
      {children}
    </As>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 size={18} className={cx('animate-spin text-muted', className)} />
}

export function Loading({ label = 'Laedt' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted">
      <Spinner />
      {label}
    </div>
  )
}

export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4 text-sm">
      <p className="font-semibold text-danger">Das hat nicht geklappt</p>
      <p className="mt-1 text-ink/80">{error}</p>
      {onRetry ? (
        <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
          Nochmal versuchen
        </Button>
      ) : null}
    </div>
  )
}

export function Empty({
  title,
  hint,
  action,
  icon,
}: {
  title: string
  hint?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-muted">{icon}</div> : null}
      <p className="font-semibold">{title}</p>
      {hint ? <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Badge({
  children,
  color,
  className,
}: {
  children: ReactNode
  color?: string
  className?: string
}) {
  const style = color ? { background: color, color: contrastOn(color) } : undefined
  return (
    <span
      style={style}
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold leading-5',
        !color && 'bg-raised text-ink',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Avatar({
  name,
  size = 36,
  src,
  color,
}: {
  name: string | null | undefined
  size?: number
  src?: string | null
  color?: string
}) {
  const bg = color ?? '#0a0a0a'
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: bg,
        color: contrastOn(bg),
        fontSize: size * 0.38,
      }}
    >
      {initials(name)}
    </span>
  )
}

/* ------------------------------------------------------------- Code-Chip */

/** Zeigt W-3-007. Die Groessenziffer steht immer rot, wie abgesprochen. */
export function CodeChip({
  code,
  size = 'md',
  className,
}: {
  code: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}) {
  const p = parseCode(code)
  const cls = {
    sm: 'text-[11px] px-1.5 py-0.5',
    md: 'text-[13px] px-2 py-0.5',
    lg: 'text-lg px-2.5 py-1',
    xl: 'text-3xl px-3 py-1.5',
  }[size]
  if (!p.ok) {
    return (
      <span className={cx('rounded-lg bg-raised font-mono font-bold', cls, className)}>{code}</span>
    )
  }
  return (
    <span
      className={cx(
        'inline-flex items-baseline rounded-lg bg-raised font-mono font-bold tracking-tight tabular-nums',
        cls,
        className,
      )}
    >
      <span>{p.prefix}</span>
      <span className="opacity-40">-</span>
      <span className="text-danger">{p.size}</span>
      <span className="opacity-40">-</span>
      <span>{p.seq}</span>
    </span>
  )
}

export function StatusPill({
  status,
  size = 'md',
  onClick,
}: {
  status: ItemStatus
  size?: 'sm' | 'md'
  onClick?: () => void
}) {
  const color = STATUS_COLOR[status]
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag
      onClick={onClick}
      type={onClick ? 'button' : undefined}
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full font-bold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        onClick && 'transition hover:opacity-80',
      )}
      style={{ background: `${color}1a`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {STATUS_LABEL[status]}
    </Tag>
  )
}

/* ------------------------------------------------------------------- QR */

export function QrCode({
  value,
  size = 160,
  className,
  margin = 1,
}: {
  value: string
  size?: number
  className?: string
  margin?: number
}) {
  const path = useMemo(() => {
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
      const n = qr.modules.size
      const d = qr.modules.data
      let out = ''
      for (let y = 0; y < n; y++) {
        for (let x = 0; x < n; x++) {
          if (d[y * n + x]) out += `M${x + margin} ${y + margin}h1v1h-1z`
        }
      }
      return { d: out, n: n + margin * 2 }
    } catch (err) {
      console.warn('[qr] konnte nicht erzeugt werden', err)
      return null
    }
  }, [value, margin])

  if (!path) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-raised text-[10px] text-muted"
        style={{ width: size, height: size }}
      >
        QR-Fehler
      </div>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${path.n} ${path.n}`}
      width={size}
      height={size}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR-Code ${value}`}
    >
      <rect width={path.n} height={path.n} fill="#ffffff" />
      <path d={path.d} fill="#000000" />
    </svg>
  )
}

/* ---------------------------------------------------------------- Dialog */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'animate-in relative flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Schliessen"
            className="rounded-lg p-1.5 text-muted hover:bg-raised hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="safe-bottom flex justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Loeschen',
  onConfirm,
  onClose,
  danger = true,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  onConfirm: () => void | Promise<void>
  onClose: () => void
  danger?: boolean
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={busy}
            onClick={async () => {
              setBusy(true)
              try {
                await onConfirm()
                onClose()
              } finally {
                setBusy(false)
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-ink/80">{body}</p>
    </Modal>
  )
}

/* --------------------------------------------------------------- Hinweise */

type ToastKind = 'ok' | 'error' | 'info'
interface Toast {
  id: string
  kind: ToastKind
  text: string
}
const ToastCtx = createContext<{
  push: (text: string, kind?: ToastKind) => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const timers = useRef<Record<string, number>>({})

  const push = useCallback((text: string, kind: ToastKind = 'info') => {
    const id = crypto.randomUUID()
    setItems((list) => [...list.slice(-3), { id, kind, text }])
    timers.current[id] = window.setTimeout(() => {
      setItems((list) => list.filter((t) => t.id !== id))
      delete timers.current[id]
    }, kind === 'error' ? 6000 : 3200)
  }, [])

  useEffect(
    () => () => {
      Object.values(timers.current).forEach(clearTimeout)
    },
    [],
  )

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {items.map((t) => (
          <div
            key={t.id}
            className={cx(
              'animate-in pointer-events-auto max-w-sm rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg',
              t.kind === 'ok' && 'bg-ok text-white',
              t.kind === 'error' && 'bg-danger text-white',
              t.kind === 'info' && 'bg-ink text-paper',
            )}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast ausserhalb von ToastProvider')
  return ctx.push
}

/* ------------------------------------------------------------- Tabs, Chips */

export function Chip({
  active,
  onClick,
  children,
  color,
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition',
        active ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink hover:bg-raised',
      )}
    >
      {color ? (
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      ) : null}
      {children}
    </button>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  )
}
