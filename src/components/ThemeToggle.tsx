import { useEffect } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useLocalState } from '../lib/util'

type Mode = 'system' | 'light' | 'dark'
const ORDER: Mode[] = ['system', 'light', 'dark']
const ICON = { system: Monitor, light: Sun, dark: Moon }
const LABEL = { system: 'System', light: 'Hell', dark: 'Dunkel' }

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
  const Icon = ICON[mode]
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length]
  return (
    <button
      type="button"
      onClick={() => setMode(next)}
      title={`Darstellung: ${LABEL[mode]}`}
      aria-label={`Darstellung umschalten, aktuell ${LABEL[mode]}`}
      className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-raised"
    >
      <Icon size={18} />
      {withLabel ? LABEL[mode] : null}
    </button>
  )
}
