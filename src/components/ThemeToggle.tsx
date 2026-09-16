import { useEffect } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useLocalState } from '../lib/util'
import { useT } from '../lib/i18n'

type Mode = 'system' | 'light' | 'dark'
const ORDER: Mode[] = ['system', 'light', 'dark']
const ICON = { system: Monitor, light: Sun, dark: Moon }

/* Nicht der fertige Name, sondern der Schluessel dazu. Den Namen holt sich
 * jede Stelle selbst, damit er beim Sprachwechsel neu gerendert wird. */
export const MODE_KEY: Record<Mode, string> = {
  system: 'einstellungen.theme_system',
  light: 'einstellungen.theme_hell',
  dark: 'einstellungen.theme_dunkel',
}

export function applyTheme(mode: Mode) {
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0b0b0c' : '#ffffff')
}

export function useTheme() {
  const [mode, setMode] = useLocalState<Mode>('kistly.theme', 'system')
  useEffect(() => {
    applyTheme(mode)
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [mode])
  return { mode, setMode }
}

export function ThemeToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { mode, setMode } = useTheme()
  const t = useT()
  const Icon = ICON[mode]
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
  const name = t(MODE_KEY[mode])
  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      title={t('einstellungen.theme_titel', { wert: name })}
      aria-label={t('kopf.darstellung', { wert: name })}
      className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-raised"
    >
      <Icon size={18} />
      {withLabel ? name : null}
    </button>
  )
}
