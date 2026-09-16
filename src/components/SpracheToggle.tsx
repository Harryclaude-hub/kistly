import { Languages } from 'lucide-react'
import { SPRACHEN, SPRACH_KUERZEL, SPRACH_NAME, useSprache } from '../lib/i18n'

/** Sprachumschalter fuer die Kopfzeile. Ein Tipp wechselt zur naechsten
 *  Sprache und dreht bei Arabisch die gesamte Leserichtung um. */
export function SpracheToggle({ withLabel = false }: { withLabel?: boolean }) {
  const { lang, setLang, t } = useSprache()
  const naechste = SPRACHEN[(SPRACHEN.indexOf(lang) + 1) % SPRACHEN.length]
  return (
    <button
      type="button"
      onClick={() => setLang(naechste)}
      title={t('kopf.sprache', { wert: SPRACH_NAME[lang] })}
      aria-label={t('kopf.sprache', { wert: SPRACH_NAME[lang] })}
      className="inline-flex h-11 items-center gap-2 rounded-xl border-2 border-transparent px-3 text-[0.9375rem] font-bold text-ink transition hover:border-line hover:bg-raised active:scale-95"
    >
      <Languages size={19} />
      <span className={withLabel ? '' : 'hidden sm:inline'}>
        {withLabel ? SPRACH_NAME[lang] : SPRACH_KUERZEL[lang]}
      </span>
    </button>
  )
}

/** Vollstaendige Auswahl fuer die Einstellungen. */
export function SpracheWahl() {
  const { lang, setLang } = useSprache()
  return (
    <div className="flex gap-2">
      {SPRACHEN.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setLang(s)}
          aria-pressed={lang === s}
          lang={s}
          className={`min-w-0 flex-1 rounded-xl border-2 px-2 py-3 text-base font-bold transition ${
            lang === s ? 'border-ink bg-ink text-paper' : 'border-line hover:bg-raised'
          }`}
        >
          {SPRACH_NAME[s]}
        </button>
      ))}
    </div>
  )
}
