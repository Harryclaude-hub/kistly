import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button, Wordmark } from './ui'
import { ThemeToggle } from './ThemeToggle'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="safe-top flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
        {/* Steht allein im Kopf, darum mit Rand und Flaeche. Ein ghost-Knopf
         *  sieht hier ohne Nachbarn wie blosser Text aus. */}
        <Link to="/">
          <Button variant="soft" size="md">
            <ArrowLeft size={18} />
            Startseite
          </Button>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-20 pt-4 sm:items-center sm:px-6 sm:pt-0">
        <div className="w-full max-w-md">
          <div className="mb-10 flex justify-center">
            <Wordmark size={40} />
          </div>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-3 text-lg leading-snug text-muted">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 text-center text-base text-muted">{footer}</div> : null}
        </div>
      </main>
    </div>
  )
}
