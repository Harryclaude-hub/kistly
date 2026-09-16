import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Armchair, Boxes, CheckSquare, DoorOpen, Merge, Pencil, Printer, User } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { ItemRow } from '../components/ItemRow'
import { Auswahlleiste } from '../components/Auswahlleiste'
import { MarkIcon } from '../components/Mark'
import {
  Badge,
  Button,
  Card,
  IconButton,
  ConfirmDialog,
  Empty,
  ErrorBox,
  Field,
  Loading,
  Modal,
  SectionTitle,
  Select,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { listItems, mergeTags, setItemStatus } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { notifyItemStatus } from '../lib/push'
import { useWischen } from '../lib/wischen'
import type { ItemFilter } from '../lib/api'
import type { Item, ItemStatus, Tag, TagKind } from '../lib/types'
import { contrastOn, useAsync } from '../lib/util'

/* Die eigene Seite eines Zimmers oder einer Person.
 *
 * Eine Datei fuer beide Faelle. Zimmer und Person sind in der Datenbank
 * dieselbe Tabelle (tags, unterschieden durch kind), und sie sollen sich
 * auch gleich bedienen lassen. Zwei fast gleiche Dateien waeren genau der
 * Ort, an dem eine geaendert wird und die andere nicht.
 */

const NAECHSTER_STATUS: Record<ItemStatus, ItemStatus> = {
  open: 'transit',
  transit: 'arrived',
  arrived: 'open',
}

function Zahl({ wert, wort, farbe }: { wert: number; wort: string; farbe: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2.5 text-center">
      <div className="t-serial text-2xl font-black" style={{ color: farbe }}>
        {wert}
      </div>
      <div className="t-sub mt-0.5">{wort}</div>
    </div>
  )
}

export default function AreaDetail({ kind }: { kind: TagKind }) {
  const { tagId = '' } = useParams()
  const nav = useNavigate()
  const { project, tags, tagById, canEdit, reloadTags } = useProject()
  const { t, tn } = useSprache()
  const toast = useToast()
  const [zusammen, setZusammen] = useState(false)
  const [waehlen, setWaehlen] = useState(false)
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set())
  useWischen()

  const tag = tags.find((x) => x.id === tagId && x.kind === kind)
  /** Zimmer und Person unterscheiden sich nur in diesem einen Feld. */
  const nurHier: ItemFilter = kind === 'room' ? { roomId: tagId } : { personId: tagId }
  /** Der Name im Adressfeld, damit Links und Filter dasselbe Wort nutzen. */
  const param = kind === 'room' ? 'room' : 'person'

  // Alles, was an diesem Bereich haengt, in einem Zug. Begrenzt geladen,
  // damit ein Zimmer mit sehr vielen Kisten die Antwort nicht sprengt.
  const alles = useAsync<Item[]>(async () => {
    if (!tag) return []
    const seite = await listItems(project.id, { ...nurHier, limit: 300, sort: 'code' })
    return seite.rows
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, tagId, kind])

  const rows = alles.data ?? []
  const kisten = rows.filter((i) => i.kind !== 'furniture')
  const moebel = rows.filter((i) => i.kind === 'furniture')

  const angekommen = rows.filter((i) => i.status === 'arrived').length
  const unterwegs = rows.filter((i) => i.status === 'transit').length
  const offen = rows.filter((i) => i.status === 'open').length

  /* Die Gegenseite: in einem Zimmer stehen Kisten verschiedener Personen,
   * eine Person hat Kisten in verschiedenen Zimmern. Beides wird aus den
   * schon geladenen Zeilen abgeleitet, nicht noch einmal abgefragt. */
  const gegenseite = ((): Array<{ tag: Tag | null; n: number }> => {
    const zaehler = new Map<string, number>()
    let ohne = 0
    for (const i of rows) {
      const id = kind === 'room' ? i.person_id : i.room_id
      if (!id) ohne++
      else zaehler.set(id, (zaehler.get(id) ?? 0) + 1)
    }
    const liste = [...zaehler.entries()]
      .map(([id, n]) => ({ tag: tagById(id) ?? null, n }))
      .filter((x) => x.tag !== null)
      .sort((a, b) => b.n - a.n)
    if (ohne > 0) liste.push({ tag: null, n: ohne })
    return liste
  })()

  function umschalten(id: string) {
    setGewaehlt((v) => {
      const next = new Set(v)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function statusWeiter(item: Item) {
    const ziel = NAECHSTER_STATUS[item.status]
    try {
      const neu = await setItemStatus(item.id, ziel)
      alles.setData((prev) => (prev ?? []).map((x) => (x.id === neu.id ? neu : x)))
      if (ziel === 'arrived') {
        void notifyItemStatus(project.id, project.name, t('kisten.ist_angekommen', { code: neu.code }))
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  if (!tag) {
    return (
      <>
        <AppHeader title={t('begriff.bereich')} back={`/app/p/${project.id}/bereiche`} />
        <Page>
          <ErrorBox error={t('bereichsseite.nicht_gefunden')} />
          <Link to={`/app/p/${project.id}/bereiche`} className="mt-4 inline-block">
            <Button variant="outline">{t('bereichsseite.zurueck')}</Button>
          </Link>
        </Page>
      </>
    )
  }

  const listenZiel = `/app/p/${project.id}/kisten?${param}=${tag.id}`

  return (
    <>
      <AppHeader
        title={tag.name}
        subtitle={t(kind === 'room' ? 'begriff.zimmer' : 'begriff.person')}
        back={`/app/p/${project.id}/bereiche`}
        actions={
          canEdit ? (
            <>
              <IconButton
                label={waehlen ? t('auswahl.modus_aus') : t('auswahl.modus_an')}
                size="sm"
                onClick={() => {
                  setWaehlen((v) => !v)
                  setGewaehlt(new Set())
                }}
              >
                <CheckSquare size={17} />
              </IconButton>
              <Link to={`/app/p/${project.id}/bereiche?bearbeiten=${tag.id}`}>
                <Button variant="outline" size="sm">
                  <Pencil size={16} />
                  {t('aktion.bearbeiten')}
                </Button>
              </Link>
            </>
          ) : null
        }
      />
      <Page>
        {/* Kopf: das Kuerzel so gross wie moeglich. Es ist die Verbindung
            zur Nummer auf jedem Etikett und bleibt immer von links nach
            rechts, auch im arabischen Satz. */}
        <Card className="mb-5 overflow-hidden">
          <div className="flex items-center gap-4 p-4">
            <span
              dir="ltr"
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl font-mono font-black ${
                tag.short.length > 2 ? 'text-2xl' : 'text-4xl'
              }`}
              style={{ background: tag.color, color: contrastOn(tag.color) }}
            >
              {tag.short}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="t-name-lg break-words">{tag.name}</h1>
              <p className="t-sub mt-1 flex flex-wrap items-center gap-2">
                {kind === 'room' ? <DoorOpen size={15} /> : <User size={15} />}
                {alles.loading ? t('bereichsseite.zahlen_laden') : tn('begriff.kisten_anzahl', rows.length)}
                {tag.symbol ? (
                  <Badge>
                    <MarkIcon symbol={tag.symbol} size={14} />
                    {t(`marken.symbol_${tag.symbol}`)}
                  </Badge>
                ) : null}
              </p>
            </div>
          </div>
          {tag.note ? (
            <p className="border-t border-line px-4 py-3 text-base break-words">{tag.note}</p>
          ) : null}
        </Card>

        {/* Drei Zahlen, dieselbe Aufteilung wie auf der Umzugsseite. Erst
            wenn die Antwort da ist. Eine Null waehrend des Ladens liest sich
            wie ein leeres Zimmer, und das waere falsch. */}
        {alles.loading ? (
          <p className="t-sub mb-5 text-center">{t('bereichsseite.zahlen_laden')}</p>
        ) : alles.error ? null : (
          <>
            <div className="mb-5 grid grid-cols-3 gap-2">
              <Zahl wert={offen} wort={t('status.open')} farbe="var(--danger)" />
              <Zahl wert={unterwegs} wort={t('status.transit')} farbe="var(--warn)" />
              <Zahl wert={angekommen} wort={t('status.arrived')} farbe="var(--ok)" />
            </div>
            <p className="t-sub mb-5 text-center">
              {t('bereichsseite.fortschritt', { a: angekommen, b: rows.length })}
            </p>
          </>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          <Link to={listenZiel}>
            <Button variant="outline" size="sm">
              <Boxes size={16} />
              {t('bereichsseite.alle_zeigen')}
            </Button>
          </Link>
          <Link to={`/app/p/${project.id}/etiketten?${param}=${tag.id}`}>
            <Button variant="outline" size="sm">
              <Printer size={16} />
              {t('bereichsseite.etiketten')}
            </Button>
          </Link>
          {canEdit ? (
            <Button variant="outline" size="sm" onClick={() => setZusammen(true)}>
              <Merge size={16} />
              {t('zusammen.knopf')}
            </Button>
          ) : null}
        </div>

        {alles.loading ? (
          <Loading label={t('kisten.laedt')} />
        ) : alles.error ? (
          <ErrorBox error={alles.error} onRetry={alles.reload} />
        ) : (
          <>
            {/* Wer sonst noch mit drinsteckt */}
            {gegenseite.length > 0 ? (
              <>
                <SectionTitle>
                  {t(kind === 'room' ? 'bereichsseite.personen_hier' : 'bereichsseite.zimmer_dieser_person')}
                </SectionTitle>
                <div className="mb-6 flex flex-wrap gap-2">
                  {gegenseite.map((g) =>
                    g.tag ? (
                      <Link
                        key={g.tag.id}
                        to={`/app/p/${project.id}/${g.tag.kind === 'room' ? 'zimmer' : 'person'}/${g.tag.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-base font-bold transition active:scale-95"
                        style={{ background: g.tag.color, color: contrastOn(g.tag.color) }}
                      >
                        {g.tag.kind === 'room' ? <DoorOpen size={15} /> : <User size={15} />}
                        <span className="truncate">{g.tag.name}</span>
                        <span className="t-serial opacity-75">{g.n}</span>
                      </Link>
                    ) : (
                      <span
                        key="ohne"
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-line px-2.5 py-1.5 text-base font-bold text-muted"
                      >
                        {t(kind === 'room' ? 'bereichsseite.ohne_person' : 'bereichsseite.ohne_zimmer')}
                        <span className="t-serial">{g.n}</span>
                      </span>
                    ),
                  )}
                </div>
              </>
            ) : null}

            <SectionTitle
              action={
                canEdit ? (
                  <Link to={`/app/p/${project.id}/kisten?neu=1&${param}=${tag.id}`}>
                    <Button size="sm" variant="outline">
                      {t('bereichsseite.kiste_anlegen')}
                    </Button>
                  </Link>
                ) : null
              }
            >
              {t('bereichsseite.kisten')}
            </SectionTitle>
            {kisten.length === 0 ? (
              <Empty
                icon={<Boxes size={30} />}
                title={t('bereichsseite.keine_kisten')}
                hint={t('bereichsseite.keine_kisten_hinweis')}
              />
            ) : (
              <Card className="zebra divide-y divide-line overflow-hidden">
                {kisten.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    projectId={project.id}
                    tagById={tagById}
                    canEdit={canEdit}
                    onStatus={statusWeiter}
                    auswahl={{
                      an: waehlen,
                      gewaehlt: gewaehlt.has(item.id),
                      umschalten: umschalten,
                    }}
                    zeigeZimmer={kind !== 'room'}
                    zeigePerson={kind !== 'person'}
                  />
                ))}
              </Card>
            )}

            <div className="h-6" />

            <SectionTitle
              action={
                canEdit ? (
                  <Link
                    to={`/app/p/${project.id}/moebel?neu=1${kind === 'room' ? `&room=${tag.id}` : ''}`}
                  >
                    <Button size="sm" variant="outline">
                      {t('bereichsseite.moebel_anlegen')}
                    </Button>
                  </Link>
                ) : null
              }
            >
              {t('bereichsseite.moebel')}
            </SectionTitle>
            {moebel.length === 0 ? (
              <Empty icon={<Armchair size={30} />} title={t('bereichsseite.keine_moebel')} />
            ) : (
              <Card className="zebra divide-y divide-line overflow-hidden">
                {moebel.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    projectId={project.id}
                    tagById={tagById}
                    canEdit={canEdit}
                    onStatus={statusWeiter}
                    auswahl={{
                      an: waehlen,
                      gewaehlt: gewaehlt.has(item.id),
                      umschalten: umschalten,
                    }}
                    zeigeZimmer={kind !== 'room'}
                    zeigePerson={kind !== 'person'}
                  />
                ))}
              </Card>
            )}
          </>
        )}
        {waehlen ? (
          <Auswahlleiste
            ids={[...gewaehlt]}
            gesamt={rows.length}
            rooms={tags.filter((x) => x.kind === 'room')}
            people={tags.filter((x) => x.kind === 'person')}
            onAlle={() => setGewaehlt(new Set(rows.map((r) => r.id)))}
            onKeine={() => setGewaehlt(new Set())}
            onEnde={() => {
              setWaehlen(false)
              setGewaehlt(new Set())
            }}
            onFertig={() => {
              setGewaehlt(new Set())
              alles.reload()
            }}
          />
        ) : null}

        <div className="h-6" />
      </Page>

      <ZusammenDialog
        offen={zusammen}
        quelle={tag}
        ziele={tags.filter((x) => x.kind === kind && x.id !== tag.id)}
        onClose={() => setZusammen(false)}
        onFertig={async (n) => {
          setZusammen(false)
          toast(tn('zusammen.erledigt', n), 'ok')
          await reloadTags()
          nav(`/app/p/${project.id}/bereiche`)
        }}
      />
    </>
  )
}

/* ------------------------------------------------- Bereiche zusammenfuehren */

/** Zwei Bereiche zu einem machen. Die Datenbank haengt alles um und
 *  vergibt die Nummern neu, die alten Etiketten bleiben ueber die
 *  Codehistorie scannbar. Zurueck geht das nicht, darum wird zweimal
 *  gefragt. */
function ZusammenDialog({
  offen,
  quelle,
  ziele,
  onClose,
  onFertig,
}: {
  offen: boolean
  quelle: Tag
  ziele: Tag[]
  onClose: () => void
  onFertig: (umgehaengt: number) => Promise<void>
}) {
  const { t } = useSprache()
  const toast = useToast()
  const [zielId, setZielId] = useState('')
  const [nachfrage, setNachfrage] = useState(false)
  const [busy, setBusy] = useState(false)
  const ziel = ziele.find((z) => z.id === zielId)

  return (
    <>
      <Modal
        open={offen && !nachfrage}
        onClose={onClose}
        title={t('zusammen.titel')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('aktion.abbrechen')}
            </Button>
            <Button disabled={!ziel} onClick={() => setNachfrage(true)}>
              {t('zusammen.knopf')}
            </Button>
          </>
        }
      >
        {ziele.length === 0 ? (
          <p className="text-base text-muted">{t('zusammen.kein_ziel')}</p>
        ) : (
          <div className="space-y-4">
            <Field label={t('zusammen.ziel')} hint={t('zusammen.ziel_waehlen')}>
              <Select value={zielId} onChange={(e) => setZielId(e.target.value)}>
                <option value="">{t('zusammen.ziel_waehlen')}</option>
                {ziele.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.short} - {z.name}
                  </option>
                ))}
              </Select>
            </Field>
            {ziel ? (
              <p className="t-sub">
                {t('zusammen.warnung', { von: quelle.name, nach: ziel.name })}
              </p>
            ) : null}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={nachfrage}
        title={t('zusammen.titel')}
        body={t('zusammen.warnung', { von: quelle.name, nach: ziel?.name ?? '' })}
        confirmLabel={t('zusammen.knopf')}
        onClose={() => setNachfrage(false)}
        onConfirm={() => {
          if (!ziel || busy) return
          setBusy(true)
          void mergeTags(quelle.id, ziel.id)
            .then((n) => onFertig(n))
            .catch((err: unknown) => {
              toast(err instanceof Error ? err.message : String(err), 'error')
            })
            .finally(() => {
              setBusy(false)
              setNachfrage(false)
            })
        }}
      />
    </>
  )
}
