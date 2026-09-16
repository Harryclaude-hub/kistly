import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, DoorOpen, User } from 'lucide-react'
import { CodeChip, StatusPill } from './ui'
import { MarkIcon } from './Mark'
import { useT } from '../lib/i18n'
import { markFlaeche } from '../lib/marken'
import type { Item, Tag } from '../lib/types'
import { contrastOn, cx } from '../lib/util'

/* Eine Zeile in jeder Liste von Kisten und Moebeln.
 *
 * Sie steht hier und nicht dreimal in den Seiten, weil sonst genau das
 * passiert, was wir vermeiden wollen: eine Liste wird geaendert, die
 * anderen nicht, und ab da sieht dieselbe Kiste an zwei Stellen anders
 * aus. Kistenliste, Zimmerseite, Personenseite und Moebelbereich rendern
 * dieselbe Zeile.
 *
 * Eine eigene Markierung wird als --mark gesetzt, nicht als fertige
 * Hintergrundfarbe. Den Zebrastreifen legt index.css darueber, damit eine
 * Zeile heller und die naechste dunkler bleibt, auch wenn beide dieselbe
 * eigene Farbe tragen.
 */

/** Wohin fuehrt der Eintrag? Moebel haben ihre eigene Seite. */
export function zielFuerItem(projectId: string, item: Item): string {
  return item.kind === 'furniture'
    ? `/app/p/${projectId}/moebel/${item.id}`
    : `/app/p/${projectId}/kisten/${item.id}`
}

/** Zimmer und Person als farbige Kachel mit vollem Namen. Ein Kuerzel in
 *  Kleinstschrift sagt beim Tragen niemandem, wem die Kiste gehoert. */
export function TagTile({ tag, icon }: { tag: Tag; icon: ReactNode }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1 rounded-lg px-2 py-0.5 text-[0.9375rem] font-bold leading-6"
      style={{ background: tag.color, color: contrastOn(tag.color) }}
    >
      <span className="shrink-0 opacity-80">{icon}</span>
      <span className="min-w-0 truncate">{tag.name}</span>
    </span>
  )
}

export interface Auswahl {
  /** Ist der Auswahlmodus ueberhaupt an? */
  an: boolean
  gewaehlt: boolean
  umschalten: (id: string) => void
}

export function ItemRow({
  item,
  projectId,
  tagById,
  canEdit,
  onStatus,
  auswahl,
  zeigeZimmer = true,
  zeigePerson = true,
}: {
  item: Item
  projectId: string
  tagById: (id: string | null | undefined) => Tag | undefined
  canEdit: boolean
  /** Antippen des Statuspunkts. Ohne Funktion ist er nur Anzeige. */
  onStatus?: (item: Item) => void
  /** Auswaehlen wie in einer Tabelle. Ohne dieses Feld gibt es keinen
   *  Auswahlmodus, und die Zeile fuehrt wie immer auf ihre Seite. */
  auswahl?: Auswahl
  /** Auf der Zimmerseite steht das Zimmer schon oben, dann ist die Kachel
   *  in jeder Zeile nur Wiederholung. */
  zeigeZimmer?: boolean
  zeigePerson?: boolean
}) {
  const t = useT()
  const room = tagById(item.room_id)
  const person = tagById(item.person_id)
  const streifen = item.mark_color ?? room?.color ?? person?.color ?? '#94a3b8'
  const zimmer = zeigeZimmer ? room : undefined
  const perso = zeigePerson ? person : undefined
  const waehlen = auswahl?.an === true

  // Die eigene Farbe kommt als Variable, den Wechsel hell/dunkel legt
  // index.css darueber. Beides zusammen, nie das eine statt des anderen.
  const stil = { '--mark': markFlaeche(item.mark_color) } as CSSProperties

  const inhalt = (
    <>
      <span className="flex flex-wrap items-center gap-2">
        <CodeChip code={item.code} size="md" />
        {item.mark_symbol ? (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg border-2"
            style={{
              borderColor: item.mark_color ?? 'var(--line)',
              color: item.mark_color ?? 'var(--ink)',
            }}
            title={t(`marken.symbol_${item.mark_symbol}`)}
          >
            <MarkIcon symbol={item.mark_symbol} size={16} />
          </span>
        ) : null}
        {item.kind === 'furniture' ? (
          <span className="rounded-lg border-2 border-line bg-raised px-2 py-0.5 text-sm font-black text-muted">
            {t('art.furniture')}
          </span>
        ) : null}
        {item.fragile ? (
          <span className="rounded-lg border-2 border-warn/40 bg-warn/10 px-2 py-0.5 text-sm font-black text-warn">
            {t('begriff.zerbrechlich')}
          </span>
        ) : null}
      </span>
      <span className="t-name block truncate">{item.title || t(`art.${item.kind}`)}</span>
      {zimmer || perso || item.target_room ? (
        <span className="flex flex-wrap items-center gap-1.5">
          {zimmer ? <TagTile tag={zimmer} icon={<DoorOpen size={14} />} /> : null}
          {perso ? <TagTile tag={perso} icon={<User size={14} />} /> : null}
          {item.target_room ? (
            <span className="t-sub min-w-0 truncate">
              {t('kisten.nach_ziel', { ziel: item.target_room })}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  )

  const felder = 'flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-3.5 text-start transition hover:bg-raised'

  return (
    <div className="flex items-stretch" style={stil}>
      <span aria-hidden="true" className="w-2 shrink-0" style={{ background: streifen }} />

      {waehlen ? (
        <>
          <span className="flex shrink-0 items-center ps-2">
            <span
              aria-hidden="true"
              className={cx(
                'flex h-7 w-7 items-center justify-center rounded-lg border-2 transition',
                auswahl.gewaehlt ? 'border-ink bg-ink text-paper' : 'border-line bg-surface',
              )}
            >
              {auswahl.gewaehlt ? <Check size={17} /> : null}
            </span>
          </span>
          <button
            type="button"
            role="checkbox"
            aria-checked={auswahl.gewaehlt}
            aria-label={t('auswahl.zeile_waehlen')}
            onClick={() => auswahl.umschalten(item.id)}
            className={felder}
          >
            {inhalt}
          </button>
        </>
      ) : (
        <Link to={zielFuerItem(projectId, item)} className={felder}>
          {inhalt}
        </Link>
      )}

      <span className="flex shrink-0 items-center py-3 pe-3">
        <StatusPill
          status={item.status}
          onClick={canEdit && onStatus && !waehlen ? () => onStatus(item) : undefined}
        />
      </span>
    </div>
  )
}
