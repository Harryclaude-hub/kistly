import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Boxes, CheckSquare, Download, Filter, Plus, Search, X } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { ItemRow } from '../components/ItemRow'
import { Auswahlleiste } from '../components/Auswahlleiste'
import {
  Button,
  Card,
  Chip,
  Empty,
  ErrorBox,
  Field,
  IconButton,
  Input,
  Loading,
  Modal,
  Select,
  Spinner,
  Switch,
  Textarea,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { createItem, listItems, setItemStatus, listAllItems } from '../lib/api'
import { useSprache, useT } from '../lib/i18n'
import { notifyItemStatus } from '../lib/push'
import { supabase } from '../lib/supabase'
import {
  type Item,
  type ItemKind,
  type ItemStatus,
  type TagKind,
} from '../lib/types'
import { download, toCsv, useDebounced } from '../lib/util'

const NEXT_STATUS: Record<ItemStatus, ItemStatus> = {
  open: 'transit',
  transit: 'arrived',
  arrived: 'open',
}

/* Die Kistenarten in fester Reihenfolge. Die Woerter dazu stehen im
 * Woerterbuch unter art.box und so weiter, nicht mehr in types.ts. */
export const ARTEN: ItemKind[] = ['box', 'furniture', 'bag', 'other']

export function SizePicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const t = useT()
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={t('kisten.groesse_knopf', { n, wort: t(`groesse.${n}`) })}
            aria-pressed={value === n}
            className={`h-12 w-full min-w-0 rounded-xl border-2 font-mono text-lg font-black transition active:scale-95 ${
              value === n
                ? 'border-danger bg-danger text-white'
                : 'border-line bg-surface text-ink hover:border-ink/35 hover:bg-raised'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="t-sub mt-2.5">
        {t('groesse.von_zehn', { n: value, wort: t(`groesse.${value}`) })}.{' '}
        {t('kisten.groesse_hinweis')}
      </p>
    </div>
  )
}

interface Draft {
  kind: ItemKind
  title: string
  room_id: string
  person_id: string
  code_source: TagKind
  size: number
  note: string
  fragile: boolean
  target_room: string
  count: number
}

export default function Items() {
  const { project, rooms, people, tagById, canEdit } = useProject()
  const { t, tn } = useSprache()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const debounced = useDebounced(search, 300)
  const status = (params.get('status') ?? 'all') as ItemStatus | 'all'
  const roomId = params.get('room') ?? 'all'
  const personId = params.get('person') ?? 'all'
  const sort = (params.get('sort') ?? 'code') as 'code' | 'newest' | 'size'

  const [rows, setRows] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [showFilter, setShowFilter] = useState(false)
  const [exporting, setExporting] = useState(false)
  /* Auswaehlen wie in einer Tabelle. Die Auswahl haelt nur Kennungen, nie
   * ganze Zeilen. Sonst haette man nach dem Nachladen zwei Fassungen
   * derselben Kiste im Kopf. */
  const [waehlen, setWaehlen] = useState(false)
  const [gewaehlt, setGewaehlt] = useState<Set<string>>(new Set())
  const PAGE = 60

  /* Moebel haben einen eigenen Bereich. Sie stehen in derselben Tabelle,
   * darum werden sie hier ausdruecklich ausgeschlossen, sonst taucht
   * dasselbe Stueck in zwei Listen auf. */
  const filter = useMemo(
    () => ({ search: debounced, status, roomId, personId, sort, kindNot: 'furniture' as const }),
    [debounced, status, roomId, personId, sort],
  )

  const load = useCallback(
    async (nextPage: number, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const res = await listItems(project.id, {
          ...filter,
          limit: PAGE,
          offset: nextPage * PAGE,
        })
        setRows((prev) => (append ? [...prev, ...res.rows] : res.rows))
        setTotal(res.total)
        setPage(nextPage)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    },
    [project.id, filter],
  )

  useEffect(() => {
    void load(0, false)
  }, [load])

  // Aendert jemand anders etwas, soll die Liste das sofort zeigen, statt
  // einen veralteten Stand anzuzeigen bis jemand neu laedt.
  useEffect(() => {
    const ch = supabase
      .channel(`items-${project.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'items', filter: `project_id=eq.${project.id}` },
        (payload) => {
          const next = payload.new as Item
          setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)))
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(ch)
    }
  }, [project.id])

  /* -------------------------------------------------------- neue Kiste */
  const [open, setOpen] = useState(params.get('neu') === '1')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>({
    kind: 'box',
    title: '',
    room_id: roomId !== 'all' ? roomId : (rooms[0]?.id ?? ''),
    person_id: personId !== 'all' ? personId : '',
    code_source: 'room',
    size: 5,
    note: '',
    fragile: false,
    target_room: '',
    count: 1,
  })

  const previewPrefix =
    draft.code_source === 'person'
      ? (tagById(draft.person_id)?.short ?? tagById(draft.room_id)?.short ?? '??')
      : (tagById(draft.room_id)?.short ?? tagById(draft.person_id)?.short ?? '??')

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!draft.room_id && !draft.person_id) {
      setFormError(t('kisten.fehler_kein_tag'))
      return
    }
    setBusy(true)
    const created: Item[] = []
    let abbruch: string | null = null
    try {
      for (let i = 0; i < Math.min(Math.max(draft.count, 1), 50); i++) {
        created.push(
          await createItem({
            project_id: project.id,
            kind: draft.kind,
            title: draft.title.trim() || null,
            room_id: draft.room_id || null,
            person_id: draft.person_id || null,
            code_source: draft.code_source,
            size: draft.size,
            note: draft.note.trim() || null,
            fragile: draft.fragile,
            target_room: draft.target_room.trim() || null,
          }),
        )
      }
    } catch (err) {
      abbruch = err instanceof Error ? err.message : String(err)
    }
    setBusy(false)

    /* Was schon in der Datenbank steht, wird gemeldet und geladen, auch
     * wenn die Reihe abgebrochen ist. Sonst waeren die bereits angelegten
     * Kisten unsichtbar, und der naechste Versuch legte sie ein zweites
     * Mal an. */
    if (created.length > 0) {
      toast(
        created.length === 1
          ? t('kisten.angelegt', { code: created[0].code })
          : t('kisten.mehrere_angelegt', {
              n: created.length,
              von: created[0].code,
              bis: created[created.length - 1].code,
            }),
        'ok',
      )
      await load(0, false)
    }

    if (abbruch) {
      setFormError(
        created.length > 0
          ? t('kisten.reihe_abgebrochen', { n: created.length, grund: abbruch })
          : abbruch,
      )
      // Die Anzahl sinkt um das, was schon steht, damit ein zweiter
      // Versuch den Rest anlegt und nicht alles noch einmal.
      setDraft((d) => ({ ...d, count: Math.max(1, d.count - created.length) }))
      return
    }

    setOpen(false)
    setDraft((d) => ({ ...d, title: '', note: '', count: 1 }))
    params.delete('neu')
    setParams(params, { replace: true })
  }

  async function cycleStatus(item: Item) {
    if (!canEdit) return
    const next = NEXT_STATUS[item.status]
    setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: next } : r)))
    try {
      await setItemStatus(item.id, next)
      if (next === 'arrived') {
        void notifyItemStatus(
          project.id,
          project.name,
          t('kisten.ist_angekommen', { code: item.code }),
        )
      }
    } catch (err) {
      setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: item.status } : r)))
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  async function exportCsv() {
    if (exporting) return
    setExporting(true)
    try {
      const all = await listAllItems(project.id)
      const csv = toCsv(
        all.map((i) => ({
          [t('kisten.csv_code')]: i.code,
          [t('kisten.art')]: t(`art.${i.kind}`),
          [t('begriff.titel')]: i.title ?? '',
          [t('begriff.zimmer')]: tagById(i.room_id)?.name ?? '',
          [t('begriff.person')]: tagById(i.person_id)?.name ?? '',
          [t('begriff.groesse')]: i.size,
          [t('begriff.status')]: t(`status.${i.status}`),
          [t('begriff.ziel')]: i.target_room ?? '',
          [t('begriff.zerbrechlich')]: i.fragile ? t('kisten.ja') : t('kisten.nein'),
          [t('begriff.notiz')]: i.note ?? '',
        })),
      )
      if (!csv) {
        toast(t('kisten.nichts_zu_exportieren'), 'info')
        return
      }
      download(`kistly-${project.name.replace(/\W+/g, '-').toLowerCase()}.csv`, csv)
      toast(t('kisten.exportiert', { n: all.length }), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setExporting(false)
    }
  }

  function setParam(key: string, value: string) {
    if (value === 'all' || !value) params.delete(key)
    else params.set(key, value)
    setParams(params, { replace: true })
  }

  function resetFilters() {
    for (const k of ['status', 'room', 'person']) params.delete(k)
    setParams(params, { replace: true })
  }

  const activeFilters =
    (status !== 'all' ? 1 : 0) + (roomId !== 'all' ? 1 : 0) + (personId !== 'all' ? 1 : 0)

  return (
    <>
      <AppHeader
        title={t('nav.kisten')}
        subtitle={tn('begriff.eintraege', total)}
        back={`/app/p/${project.id}`}
        actions={
          <>
            <IconButton
              label={t('aktion.exportieren')}
              size="sm"
              disabled={exporting}
              onClick={() => void exportCsv()}
            >
              {exporting ? <Spinner /> : <Download size={19} />}
            </IconButton>
            {canEdit ? (
              <IconButton
                label={waehlen ? t('auswahl.modus_aus') : t('auswahl.modus_an')}
                size="sm"
                onClick={() => {
                  setWaehlen((v) => !v)
                  setGewaehlt(new Set())
                }}
              >
                <CheckSquare size={19} />
              </IconButton>
            ) : null}
            {canEdit ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus size={16} /> {t('aktion.neu')}
              </Button>
            ) : null}
          </>
        }
      />

      <Page>
        {/* Suche */}
        <div className="mb-3 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={19} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('kisten.suche_platzhalter')}
              className={search ? 'ps-10 pe-14' : 'ps-10'}
            />
            {search ? (
              <IconButton
                label={t('kisten.suche_leeren')}
                size="sm"
                className="absolute end-1.5 top-1/2 -translate-y-1/2"
                onClick={() => setSearch('')}
              >
                <X size={17} />
              </IconButton>
            ) : null}
          </div>
          <IconButton
            label={
              activeFilters > 0
                ? t('kisten.filter_gesetzt', { n: activeFilters })
                : showFilter
                  ? t('kisten.filter_schliessen')
                  : t('kisten.filter_oeffnen')
            }
            className="relative"
            onClick={() => setShowFilter((v) => !v)}
          >
            <Filter size={19} />
            {activeFilters > 0 ? (
              <span className="absolute -end-2 -top-2 min-w-[1.5rem] rounded-full bg-danger px-1 text-sm font-black leading-6 text-white">
                {activeFilters}
              </span>
            ) : null}
          </IconButton>
        </div>

        {/* Statusleiste. Sie darf waagerecht rollen, die Seite nicht. */}
        <div className="-mx-3 mb-3 flex flex-nowrap gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          <Chip active={status === 'all'} onClick={() => setParam('status', 'all')}>
            {t('aktion.alle')}
          </Chip>
          {(['open', 'transit', 'arrived'] as ItemStatus[]).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setParam('status', s)}>
              {t(`status.${s}`)}
            </Chip>
          ))}
        </div>

        {showFilter ? (
          <Card className="animate-in mb-3 space-y-4 p-4">
            <Field label={t('begriff.zimmer')}>
              <Select value={roomId} onChange={(e) => setParam('room', e.target.value)}>
                <option value="all">{t('kisten.alle_zimmer')}</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.short} . {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('begriff.person')}>
              <Select value={personId} onChange={(e) => setParam('person', e.target.value)}>
                <option value="all">{t('kisten.alle_personen')}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short} . {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('kisten.sortierung')}>
              <Select value={sort} onChange={(e) => setParam('sort', e.target.value)}>
                <option value="code">{t('kisten.sort_code')}</option>
                <option value="newest">{t('kisten.sort_neueste')}</option>
                <option value="size">{t('kisten.sort_groesste')}</option>
              </Select>
            </Field>
            {activeFilters > 0 ? (
              <Button variant="soft" full onClick={resetFilters}>
                <X size={16} /> {t('kisten.filter_zuruecksetzen')}
              </Button>
            ) : null}
          </Card>
        ) : null}

        {/* Liste */}
        {error && rows.length === 0 ? (
          <ErrorBox error={error} onRetry={() => void load(0, false)} />
        ) : loading && rows.length === 0 ? (
          <Loading label={t('kisten.laedt')} />
        ) : rows.length === 0 ? (
          <Empty
            icon={<Boxes size={28} />}
            title={
              activeFilters || debounced ? t('zustand.nichts_gefunden') : t('kisten.leer_titel')
            }
            hint={
              activeFilters
                ? t('kisten.leer_filter')
                : debounced
                  ? t('kisten.leer_suche')
                  : t('kisten.leer_hinweis')
            }
            action={
              activeFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  <X size={16} /> {t('kisten.filter_zuruecksetzen')}
                </Button>
              ) : debounced ? (
                <Button variant="outline" onClick={() => setSearch('')}>
                  <X size={16} /> {t('kisten.suche_leeren')}
                </Button>
              ) : canEdit ? (
                <Button onClick={() => setOpen(true)}>
                  <Plus size={16} /> {t('kisten.erste')}
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            {/* Scheitert das Nachladen, bleibt die bereits geladene Liste
                stehen. Der Fehler steht darueber, damit niemand denkt, es
                gebe einfach nichts mehr. */}
            {error ? (
              <div className="mb-3">
                <ErrorBox error={error} onRetry={() => void load(page + 1, true)} />
              </div>
            ) : null}
            <Card className="zebra divide-y divide-line overflow-hidden">
              {rows.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  projectId={project.id}
                  tagById={tagById}
                  canEdit={canEdit}
                  onStatus={(i) => void cycleStatus(i)}
                  auswahl={{
                    an: waehlen,
                    gewaehlt: gewaehlt.has(item.id),
                    umschalten: (id) =>
                      setGewaehlt((v) => {
                        const next = new Set(v)
                        if (next.has(id)) next.delete(id)
                        else next.add(id)
                        return next
                      }),
                  }}
                />
              ))}
            </Card>

            {rows.length < total ? (
              <div className="mt-5 flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  loading={loading}
                  onClick={() => void load(page + 1, true)}
                >
                  {t('aktion.mehr_laden')}
                </Button>
                <p className="t-sub">{t('kisten.geladen_von', { a: rows.length, b: total })}</p>
              </div>
            ) : (
              <p className="t-sub mt-5 text-center">{t('kisten.alle_geladen', { n: total })}</p>
            )}
          </>
        )}
        {waehlen ? (
          <Auswahlleiste
            ids={[...gewaehlt]}
            gesamt={rows.length}
            rooms={rooms}
            people={people}
            onAlle={() => setGewaehlt(new Set(rows.map((r) => r.id)))}
            onKeine={() => setGewaehlt(new Set())}
            onEnde={() => {
              setWaehlen(false)
              setGewaehlt(new Set())
            }}
            onFertig={() => {
              setGewaehlt(new Set())
              void load(0, false)
            }}
          />
        ) : null}

        <div className="h-6" />
      </Page>

      {/* Neue Kiste */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('kisten.neu')}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('aktion.abbrechen')}
            </Button>
            <Button form="item-form" type="submit" loading={busy}>
              {draft.count > 1
                ? t('kisten.anzahl_anlegen', { n: draft.count })
                : t('aktion.anlegen')}
            </Button>
          </>
        }
      >
        <form id="item-form" onSubmit={onCreate} className="space-y-5">
          <div className="rounded-2xl border-2 border-line bg-raised px-3 py-4 text-center">
            <p className="text-sm font-black uppercase tracking-wide text-muted">
              {t('kisten.nummer_wird')}
            </p>
            <p className="t-serial mt-2 text-4xl leading-none sm:text-5xl">
              {previewPrefix}
              <span className="opacity-40">-</span>
              <span className="text-danger">{draft.size}</span>
              <span className="opacity-40">-</span>
              <span className="opacity-60">###</span>
            </p>
            <p className="t-sub mt-2">{t('kisten.nummer_hinweis')}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('begriff.zimmer')}>
              <Select
                value={draft.room_id}
                onChange={(e) => setDraft((d) => ({ ...d, room_id: e.target.value }))}
              >
                <option value="">{t('kisten.kein_zimmer')}</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.short} . {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('begriff.person')}>
              <Select
                value={draft.person_id}
                onChange={(e) => setDraft((d) => ({ ...d, person_id: e.target.value }))}
              >
                <option value="">{t('kisten.keine_person')}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short} . {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {draft.room_id && draft.person_id ? (
            <Field label={t('kisten.kuerzel_frage')} hint={t('kisten.kuerzel_hinweis')}>
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={draft.code_source === 'room'}
                  onClick={() => setDraft((d) => ({ ...d, code_source: 'room' }))}
                  color={tagById(draft.room_id)?.color}
                >
                  {t('kisten.kuerzel_zimmer', { kuerzel: tagById(draft.room_id)?.short ?? '' })}
                </Chip>
                <Chip
                  active={draft.code_source === 'person'}
                  onClick={() => setDraft((d) => ({ ...d, code_source: 'person' }))}
                  color={tagById(draft.person_id)?.color}
                >
                  {t('kisten.kuerzel_person', { kuerzel: tagById(draft.person_id)?.short ?? '' })}
                </Chip>
              </div>
            </Field>
          ) : null}

          <Field label={t('begriff.groesse')} required>
            <SizePicker value={draft.size} onChange={(size) => setDraft((d) => ({ ...d, size }))} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('kisten.art')}>
              <Select
                value={draft.kind}
                onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as ItemKind }))}
              >
                {ARTEN.map((k) => (
                  <option key={k} value={k}>
                    {t(`art.${k}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('begriff.titel')} hint={t('kisten.titel_hinweis')}>
              <Input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t('kisten.ziel')} hint={t('begriff.optional')}>
              <Input
                value={draft.target_room}
                onChange={(e) => setDraft((d) => ({ ...d, target_room: e.target.value }))}
                placeholder={t('kisten.ziel_platzhalter')}
              />
            </Field>
            <Field label={t('kisten.anzahl')} hint={t('kisten.anzahl_hinweis')}>
              <Input
                type="number"
                min={1}
                max={50}
                value={draft.count}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    count: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                  }))
                }
              />
            </Field>
          </div>

          <Field label={t('begriff.notiz')}>
            <Textarea
              rows={2}
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </Field>

          <Switch
            checked={draft.fragile}
            onChange={(fragile) => setDraft((d) => ({ ...d, fragile }))}
            label={t('begriff.zerbrechlich')}
            hint={t('kisten.zerbrechlich_hinweis')}
          />

          {formError ? (
            <p className="rounded-xl border-2 border-danger/30 bg-danger/5 px-3 py-2.5 text-base font-bold text-danger">
              {formError}
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  )
}
