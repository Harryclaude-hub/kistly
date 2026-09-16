import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Boxes, DoorOpen, Download, Filter, Plus, Search, User, X } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import {
  Button,
  Card,
  Chip,
  CodeChip,
  Empty,
  ErrorBox,
  Field,
  IconButton,
  Input,
  Loading,
  Modal,
  Select,
  Spinner,
  StatusPill,
  Switch,
  Textarea,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { createItem, listItems, setItemStatus, listAllItems } from '../lib/api'
import { notifyItemStatus } from '../lib/push'
import { supabase } from '../lib/supabase'
import {
  KIND_LABEL,
  SIZE_LABEL,
  STATUS_LABEL,
  type Item,
  type ItemKind,
  type ItemStatus,
  type Tag,
  type TagKind,
} from '../lib/types'
import { contrastOn, download, toCsv, useDebounced } from '../lib/util'

const NEXT_STATUS: Record<ItemStatus, ItemStatus> = {
  open: 'transit',
  transit: 'arrived',
  arrived: 'open',
}

export function SizePicker({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Groesse ${n}, ${SIZE_LABEL[n]}`}
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
        Groesse {value} von 10, also {SIZE_LABEL[value]}. Die Ziffer steht rot mitten in der Nummer.
      </p>
    </div>
  )
}

/** Zimmer und Person als farbige Kachel mit vollem Namen. Ein Kuerzel in
 *  Kleinstschrift sagt beim Tragen niemandem, wem die Kiste gehoert. */
function TagTile({ tag, icon }: { tag: Tag; icon: ReactNode }) {
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
  const PAGE = 60

  const filter = useMemo(
    () => ({ search: debounced, status, roomId, personId, sort }),
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
      setFormError('Waehle mindestens ein Zimmer oder eine Person.')
      return
    }
    setBusy(true)
    try {
      const created: Item[] = []
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
      toast(
        created.length === 1
          ? `${created[0].code} angelegt`
          : `${created.length} Kisten angelegt, ${created[0].code} bis ${created[created.length - 1].code}`,
        'ok',
      )
      setOpen(false)
      setDraft((d) => ({ ...d, title: '', note: '', count: 1 }))
      params.delete('neu')
      setParams(params, { replace: true })
      await load(0, false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function cycleStatus(item: Item) {
    if (!canEdit) return
    const next = NEXT_STATUS[item.status]
    setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: next } : r)))
    try {
      await setItemStatus(item.id, next)
      if (next === 'arrived') {
        void notifyItemStatus(project.id, project.name, `${item.code} ist angekommen`)
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
          Code: i.code,
          Art: KIND_LABEL[i.kind],
          Titel: i.title ?? '',
          Zimmer: tagById(i.room_id)?.name ?? '',
          Person: tagById(i.person_id)?.name ?? '',
          Groesse: i.size,
          Status: STATUS_LABEL[i.status],
          Ziel: i.target_room ?? '',
          Zerbrechlich: i.fragile ? 'ja' : 'nein',
          Notiz: i.note ?? '',
        })),
      )
      if (!csv) {
        toast('Es gibt noch nichts zu exportieren.', 'info')
        return
      }
      download(`kistly-${project.name.replace(/\W+/g, '-').toLowerCase()}.csv`, csv)
      toast(`${all.length} Kisten exportiert`, 'ok')
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
        title="Kisten"
        subtitle={`${total} Eintraege`}
        back={`/app/p/${project.id}`}
        actions={
          <>
            <IconButton
              label="Als CSV exportieren"
              size="sm"
              disabled={exporting}
              onClick={() => void exportCsv()}
            >
              {exporting ? <Spinner /> : <Download size={19} />}
            </IconButton>
            {canEdit ? (
              <Button size="sm" onClick={() => setOpen(true)}>
                <Plus size={16} /> Neu
              </Button>
            ) : null}
          </>
        }
      />

      <Page>
        {/* Suche */}
        <div className="mb-3 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={19} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Code, Titel oder Notiz"
              className={search ? 'pl-10 pr-14' : 'pl-10'}
            />
            {search ? (
              <IconButton
                label="Suche leeren"
                size="sm"
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
                onClick={() => setSearch('')}
              >
                <X size={17} />
              </IconButton>
            ) : null}
          </div>
          <IconButton
            label={
              activeFilters > 0
                ? `Filter, ${activeFilters} gesetzt`
                : showFilter
                  ? 'Filter schliessen'
                  : 'Filter oeffnen'
            }
            className="relative"
            onClick={() => setShowFilter((v) => !v)}
          >
            <Filter size={19} />
            {activeFilters > 0 ? (
              <span className="absolute -right-2 -top-2 min-w-[1.5rem] rounded-full bg-danger px-1 text-sm font-black leading-6 text-white">
                {activeFilters}
              </span>
            ) : null}
          </IconButton>
        </div>

        {/* Statusleiste. Sie darf waagerecht rollen, die Seite nicht. */}
        <div className="-mx-3 mb-3 flex flex-nowrap gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          <Chip active={status === 'all'} onClick={() => setParam('status', 'all')}>
            Alle
          </Chip>
          {(['open', 'transit', 'arrived'] as ItemStatus[]).map((s) => (
            <Chip key={s} active={status === s} onClick={() => setParam('status', s)}>
              {STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>

        {showFilter ? (
          <Card className="animate-in mb-3 space-y-4 p-4">
            <Field label="Zimmer">
              <Select value={roomId} onChange={(e) => setParam('room', e.target.value)}>
                <option value="all">Alle Zimmer</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.short} . {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Person">
              <Select value={personId} onChange={(e) => setParam('person', e.target.value)}>
                <option value="all">Alle Personen</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short} . {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sortierung">
              <Select value={sort} onChange={(e) => setParam('sort', e.target.value)}>
                <option value="code">Nach Nummer</option>
                <option value="newest">Neueste zuerst</option>
                <option value="size">Groesste zuerst</option>
              </Select>
            </Field>
            {activeFilters > 0 ? (
              <Button variant="soft" full onClick={resetFilters}>
                <X size={16} /> Filter zuruecksetzen
              </Button>
            ) : null}
          </Card>
        ) : null}

        {/* Liste */}
        {error && rows.length === 0 ? (
          <ErrorBox error={error} onRetry={() => void load(0, false)} />
        ) : loading && rows.length === 0 ? (
          <Loading label="Kisten werden geladen" />
        ) : rows.length === 0 ? (
          <Empty
            icon={<Boxes size={28} />}
            title={activeFilters || debounced ? 'Nichts gefunden' : 'Noch keine Kiste'}
            hint={
              activeFilters
                ? 'Zu diesem Filter passt gerade nichts. Setz den Filter zurueck.'
                : debounced
                  ? 'Zu dieser Suche passt gerade keine Kiste. Leere die Suche.'
                  : 'Lege die erste Kiste an. Die Nummer vergibt Kistly selbst.'
            }
            action={
              activeFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  <X size={16} /> Filter zuruecksetzen
                </Button>
              ) : debounced ? (
                <Button variant="outline" onClick={() => setSearch('')}>
                  <X size={16} /> Suche leeren
                </Button>
              ) : canEdit ? (
                <Button onClick={() => setOpen(true)}>
                  <Plus size={16} /> Erste Kiste
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
              {rows.map((item) => {
                const room = tagById(item.room_id)
                const person = tagById(item.person_id)
                const color = room?.color ?? person?.color ?? '#94a3b8'
                return (
                  <div key={item.id} className="flex items-stretch">
                    <span
                      aria-hidden="true"
                      className="w-2 shrink-0"
                      style={{ background: color }}
                    />
                    <Link
                      to={`/app/p/${project.id}/kisten/${item.id}`}
                      className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-3.5 transition hover:bg-raised"
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <CodeChip code={item.code} size="md" />
                        {item.fragile ? (
                          <span className="rounded-lg border-2 border-warn/40 bg-warn/10 px-2 py-0.5 text-sm font-black text-warn">
                            zerbrechlich
                          </span>
                        ) : null}
                      </span>
                      <span className="t-name block truncate">
                        {item.title || KIND_LABEL[item.kind]}
                      </span>
                      {room || person || item.target_room ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          {room ? <TagTile tag={room} icon={<DoorOpen size={14} />} /> : null}
                          {person ? <TagTile tag={person} icon={<User size={14} />} /> : null}
                          {item.target_room ? (
                            <span className="t-sub min-w-0 truncate">nach {item.target_room}</span>
                          ) : null}
                        </span>
                      ) : null}
                    </Link>
                    <span className="flex shrink-0 items-center py-3 pr-3">
                      <StatusPill
                        status={item.status}
                        onClick={canEdit ? () => void cycleStatus(item) : undefined}
                      />
                    </span>
                  </div>
                )
              })}
            </Card>

            {rows.length < total ? (
              <div className="mt-5 flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  loading={loading}
                  onClick={() => void load(page + 1, true)}
                >
                  Weitere laden
                </Button>
                <p className="t-sub">
                  {rows.length} von {total} geladen
                </p>
              </div>
            ) : (
              <p className="t-sub mt-5 text-center">Alle {total} Kisten geladen</p>
            )}
          </>
        )}
        <div className="h-6" />
      </Page>

      {/* Neue Kiste */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Neue Kiste"
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button form="item-form" type="submit" loading={busy}>
              {draft.count > 1 ? `${draft.count} anlegen` : 'Anlegen'}
            </Button>
          </>
        }
      >
        <form id="item-form" onSubmit={onCreate} className="space-y-5">
          <div className="rounded-2xl border-2 border-line bg-raised px-3 py-4 text-center">
            <p className="text-sm font-black uppercase tracking-wide text-muted">Die Nummer wird</p>
            <p className="t-serial mt-2 text-4xl leading-none sm:text-5xl">
              {previewPrefix}
              <span className="opacity-40">-</span>
              <span className="text-danger">{draft.size}</span>
              <span className="opacity-40">-</span>
              <span className="opacity-60">###</span>
            </p>
            <p className="t-sub mt-2">Die letzten drei Ziffern vergibt Kistly selbst.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Zimmer">
              <Select
                value={draft.room_id}
                onChange={(e) => setDraft((d) => ({ ...d, room_id: e.target.value }))}
              >
                <option value="">kein Zimmer</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.short} . {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Person">
              <Select
                value={draft.person_id}
                onChange={(e) => setDraft((d) => ({ ...d, person_id: e.target.value }))}
              >
                <option value="">keine Person</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short} . {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {draft.room_id && draft.person_id ? (
            <Field
              label="Welches Kuerzel steht vorne?"
              hint="Eine Kiste kann zu einem Zimmer und einer Person gehoeren. Die Nummer beginnt aber mit genau einem Kuerzel."
            >
              <div className="flex flex-wrap gap-2">
                <Chip
                  active={draft.code_source === 'room'}
                  onClick={() => setDraft((d) => ({ ...d, code_source: 'room' }))}
                  color={tagById(draft.room_id)?.color}
                >
                  {tagById(draft.room_id)?.short} . Zimmer
                </Chip>
                <Chip
                  active={draft.code_source === 'person'}
                  onClick={() => setDraft((d) => ({ ...d, code_source: 'person' }))}
                  color={tagById(draft.person_id)?.color}
                >
                  {tagById(draft.person_id)?.short} . Person
                </Chip>
              </div>
            </Field>
          ) : null}

          <Field label="Groesse" required>
            <SizePicker value={draft.size} onChange={(size) => setDraft((d) => ({ ...d, size }))} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Art">
              <Select
                value={draft.kind}
                onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as ItemKind }))}
              >
                {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Titel" hint="Optional, zum Beispiel Buecher Regal links.">
              <Input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Ziel in der neuen Wohnung" hint="Optional.">
              <Input
                value={draft.target_room}
                onChange={(e) => setDraft((d) => ({ ...d, target_room: e.target.value }))}
                placeholder="Arbeitszimmer oben"
              />
            </Field>
            <Field label="Anzahl" hint="Mehrere gleiche Kisten auf einmal anlegen, maximal 50.">
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

          <Field label="Notiz">
            <Textarea
              rows={2}
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
            />
          </Field>

          <Switch
            checked={draft.fragile}
            onChange={(fragile) => setDraft((d) => ({ ...d, fragile }))}
            label="Zerbrechlich"
            hint="Wird auf dem Etikett hervorgehoben."
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
