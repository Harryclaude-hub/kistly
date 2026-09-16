import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cx } from '../lib/util'
import { Avatar } from './ui'
import { displayNameOf, useAuth } from '../lib/auth'

/** Kopfzeile. Rechts steht immer das eigene Profil, so wie bei den grossen
 *  Messengern. Zusaetzliche Knoepfe kommen links daneben. */
export function AppHeader({
  title,
  subtitle,
  back,
  actions,
  sticky = true,
  showProfile = true,
}: {
  title: ReactNode
  subtitle?: ReactNode
  back?: string | true
  actions?: ReactNode
  sticky?: boolean
  showProfile?: boolean
}) {
  const nav = useNavigate()
  const { profile, user } = useAuth()
  return (
    <header
      className={cx(
        'no-print safe-top z-30 border-b border-line bg-paper/95 backdrop-blur',
        sticky && 'sticky top-0',
      )}
    >
      <div className="mx-auto flex min-h-16 max-w-5xl items-center gap-2 px-3 py-2 sm:px-5">
        {back ? (
          <button
            onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}
            aria-label="Zurueck"
            title="Zurueck"
            className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-transparent text-ink transition hover:border-line hover:bg-raised active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="t-name truncate">{title}</div>
          {subtitle ? <div className="truncate text-sm text-muted">{subtitle}</div> : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          {showProfile ? (
            <Link
              to="/app/einstellungen"
              aria-label="Profil und Einstellungen"
              title="Profil und Einstellungen"
              className="ml-0.5 rounded-full ring-2 ring-transparent transition hover:ring-line active:scale-95"
            >
              <Avatar name={displayNameOf(profile, user?.email ?? '?')} size={40} />
            </Link>
          ) : null}
        </div>
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
  raised,
}: {
  to: string
  icon: ReactNode
  label: string
  active: boolean
  badge?: number
  raised?: boolean
}) {
  if (raised) {
    return (
      <Link
        to={to}
        aria-label={label}
        className="relative flex flex-1 flex-col items-center gap-1 py-1.5 text-[0.6875rem] font-bold text-ink"
      >
        <span
          className={cx(
            'flex h-14 w-14 -translate-y-3 items-center justify-center rounded-2xl shadow-lg transition active:scale-95',
            active ? 'bg-danger text-white' : 'bg-ink text-paper',
          )}
        >
          {icon}
        </span>
        <span className="-mt-2.5">{label}</span>
      </Link>
    )
  }
  return (
    <Link
      to={to}
      className={cx(
        'relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[0.6875rem] font-bold transition',
        active ? 'text-ink' : 'text-muted hover:text-ink',
      )}
    >
      <span
        className={cx(
          'flex h-9 min-w-[3.25rem] items-center justify-center rounded-full transition',
          active && 'bg-ink text-paper',
        )}
      >
        {icon}
      </span>
      {label}
      {badge && badge > 0 ? (
        <span className="absolute right-[20%] top-0 min-w-5 rounded-full bg-danger px-1.5 text-[0.6875rem] font-black leading-5 text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

export function BottomNav({ children }: { children: ReactNode }) {
  return (
    <nav className="no-print safe-bottom sticky bottom-0 z-40 border-t-2 border-line bg-paper/98 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-end px-2 pt-2">{children}</div>
    </nav>
  )
}
