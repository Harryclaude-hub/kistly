import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cx } from '../lib/util'

export function AppHeader({
  title,
  subtitle,
  back,
  actions,
  sticky = true,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: string | true
  actions?: ReactNode
  sticky?: boolean
}) {
  const nav = useNavigate()
  return (
    <header
      className={cx(
        'no-print safe-top z-30 border-b border-line bg-paper/90 backdrop-blur',
        sticky && 'sticky top-0',
      )}
    >
      <div className="mx-auto flex min-h-14 max-w-5xl items-center gap-2 px-3 py-2 sm:px-5">
        {back ? (
          <button
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            aria-label="Zurueck"
            className="-ml-1 rounded-xl p-2 text-ink hover:bg-raised"
          >
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold leading-tight">{title}</div>
          {subtitle ? (
            <div className="truncate text-xs text-muted">{subtitle}</div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </div>
    </header>
  )
}

export function Page({
  children,
  className,
  wide,
}: {
  children: ReactNode
  className?: string
  wide?: boolean
}) {
  return (
    <main
      className={cx(
        'mx-auto w-full px-3 py-4 sm:px-5 sm:py-6',
        wide ? 'max-w-6xl' : 'max-w-5xl',
        className,
      )}
    >
      {children}
    </main>
  )
}

export function NavTab({
  to,
  icon,
  label,
  active,
  badge,
}: {
  to: string
  icon: ReactNode
  label: string
  active: boolean
  badge?: number
}) {
  return (
    <Link
      to={to}
      className={cx(
        'relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-bold transition',
        active ? 'text-ink' : 'text-muted hover:text-ink',
      )}
    >
      <span className={cx('rounded-lg px-3 py-1', active && 'bg-raised')}>{icon}</span>
      {label}
      {badge && badge > 0 ? (
        <span className="absolute right-[18%] top-0.5 min-w-4 rounded-full bg-danger px-1 text-[9px] leading-4 text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

export function BottomNav({ children }: { children: ReactNode }) {
  return (
    <nav className="no-print safe-bottom sticky bottom-0 z-30 border-t border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-stretch px-2 pt-1">{children}</div>
    </nav>
  )
}
