import {
  AlertTriangle,
  Check,
  Circle,
  Flag,
  Heart,
  Lock,
  Star,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useT } from '../lib/i18n'
import { MARK_FARBEN, MARK_SYMBOLE, istMarkSymbol, type MarkSymbol } from '../lib/marken'
import { cx } from '../lib/util'

/* Anzeige und Auswahl einer Markierung.
 *
 * Welches Bild zu welchem Namen gehoert, steht nur hier. Die Namen selbst
 * stehen in lib/marken.ts, weil sie auch ausserhalb der Oberflaeche
 * gebraucht werden, etwa beim Drucken.
 */
const BILD: Record<MarkSymbol, LucideIcon> = {
  stern: Star,
  haken: Check,
  achtung: AlertTriangle,
  herz: Heart,
  flagge: Flag,
  kreis: Circle,
  blitz: Zap,
  schloss: Lock,
}

export function MarkIcon({
  symbol,
  size = 16,
  className,
}: {
  symbol: string | null | undefined
  size?: number
  className?: string
}) {
  if (!istMarkSymbol(symbol)) return null
  const Bild = BILD[symbol]
  return <Bild size={size} className={className} aria-hidden="true" />
}

/** Farbe und Zeichen waehlen. Beides laesst sich einzeln wieder abwaehlen,
 *  damit man eine Markierung auch nur halb zuruecknehmen kann. */
export function MarkPicker({
  farbe,
  symbol,
  onFarbe,
  onSymbol,
}: {
  farbe: string | null
  symbol: string | null
  onFarbe: (c: string | null) => void
  onSymbol: (s: string | null) => void
}) {
  const t = useT()
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[0.9375rem] font-bold">{t('marken.farbe')}</p>
        <div className="flex flex-wrap gap-2">
          {MARK_FARBEN.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onFarbe(farbe === c ? null : c)}
              aria-label={t('marken.farbe_waehlen', { farbe: c })}
              aria-pressed={farbe === c}
              className="h-11 w-11 rounded-xl border-4 transition active:scale-95"
              style={{ background: c, borderColor: farbe === c ? 'var(--ink)' : 'transparent' }}
            />
          ))}
          <button
            type="button"
            onClick={() => onFarbe(null)}
            aria-pressed={farbe === null}
            className={cx(
              'flex h-11 items-center rounded-xl border-2 px-3 text-[0.9375rem] font-bold transition active:scale-95',
              farbe === null ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink',
            )}
          >
            {t('marken.ohne_farbe')}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[0.9375rem] font-bold">{t('marken.symbol')}</p>
        <div className="flex flex-wrap gap-2">
          {MARK_SYMBOLE.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSymbol(symbol === s ? null : s)}
              aria-label={t(`marken.symbol_${s}`)}
              title={t(`marken.symbol_${s}`)}
              aria-pressed={symbol === s}
              className={cx(
                'flex h-11 w-11 items-center justify-center rounded-xl border-2 transition active:scale-95',
                symbol === s
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-surface text-ink hover:border-ink/35 hover:bg-raised',
              )}
            >
              <MarkIcon symbol={s} size={20} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onSymbol(null)}
            aria-pressed={symbol === null}
            className={cx(
              'flex h-11 items-center rounded-xl border-2 px-3 text-[0.9375rem] font-bold transition active:scale-95',
              symbol === null ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink',
            )}
          >
            {t('marken.ohne_symbol')}
          </button>
        </div>
      </div>

      <p className="t-sub">{t('marken.zebra_hinweis')}</p>
    </div>
  )
}
