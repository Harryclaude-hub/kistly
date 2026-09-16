import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DoorOpen, User } from 'lucide-react'
import { CodeChip, StatusPill } from './ui'
import { useT } from '../lib/i18n'
import type { Item, Tag } from '../lib/types'
import { contrastOn } from '../lib/util'

/* Eine Zeile in jeder Liste von Kisten und Moebeln.
 *
 * Sie steht hier und nicht dreimal in den Seiten, weil sonst genau das
 * passiert, was wir vermeiden wollen: eine Liste wird geaendert, die
 * anderen nicht, und ab da sieht dieselbe Kiste an zwei Stellen anders
 * aus. Kistenliste, Zimmerseite, Personenseite und Moebelbereich rendern
 * dieselbe Zeile.
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

export function ItemRow({
  item,
  projectId,
  tagById,
  canEdit,
  onStatus,
  zeigeZimmer = true,
  zeigePerson = true,
}: {
  item: Item
  projectId: string
  tagById: (id: string | null | undefined) => Tag | undefined
  canEdit: boolean
  /** Antippen des Statuspunkts. Ohne Funktion ist er nur Anzeige. */
  onStatus?: (item: Item) => void
  /** Auf der Zimmerseite steht das Zimmer schon oben, dann ist die Kachel
   *  in jeder Zeile nur Wiederholung. */
  zeigeZimmer?: boolean
  zeigePerson?: boolean
}) {
  const t = useT()
  const room = tagById(item.room_id)
  const person = tagById(item.person_id)
  const streifen = room?.color ?? person?.color ?? '#94a3b8'
  const zimmer = zeigeZimmer ? room : undefined
  const perso = zeigePerson ? person : undefined

  return (
    <div className="flex items-stretch">
      <span aria-hidden="true" className="w-2 shrink-0" style={{ background: streifen }} />
      <Link
        to={zielFuerItem(projectId, item)}
        className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-3.5 transition hover:bg-raised"
      >
        <span className="flex flex-wrap items-center gap-2">
          <CodeChip code={item.code} size="md" />
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
      </Link>
      <span className="flex shrink-0 items-center py-3 pe-3">
        <StatusPill
          status={item.status}
          onClick={canEdit && onStatus ? () => onStatus(item) : undefined}
        />
      </span>
    </div>
  )
}
