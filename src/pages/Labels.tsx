import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Printer, RefreshCw } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Loading,
  QrCode,
  SectionTitle,
  Select,
  Switch,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { listAllItems, listContentsForItems } from '../lib/api'
import { STATUS_LABEL, type Item, type ItemContent, type ItemStatus } from '../lib/types'
import { useLocalState } from '../lib/util'

/* A4 abzueglich 8mm Rand. Die Werte sind so gewaehlt, dass die Etiketten
 * auf einer Seite aufgehen, ohne dass etwas abgeschnitten wird. */
const LAYOUTS = {
  1: { cols: 1, w: 194, h: 277, scale: 1.9, label: '1 pro Seite, sehr gross' },
  2: { cols: 1, w: 194, h: 138, scale: 1.45, label: '2 pro Seite' },
  4: { cols: 2, w: 96, h: 138, scale: 1.1, label: '4 pro Seite' },
  6: { cols: 2, w: 96, h: 92, scale: 0.92, label: '6 pro Seite' },
  8: { cols: 2, w: 96, h: 69, scale: 0.78, label: '8 pro Seite' },
  12: { cols: 3, w: 64, h: 69, scale: 0.64, label: '12 pro Seite, klein' },
} as const

type PerPage = keyof typeof LAYOUTS

interface Config {
  perPage: PerPage
  copies: number
  showQr: boolean
  showContents: boolean
  contentLines: number
  showRoom: boolean
  showPerson: boolean
  showTarget: boolean
  showProject: boolean
  showSizeWord: boolean
  showStatus: boolean
  colorBar: boolean
  cutLines: boolean
}

const DEFAULT_CONFIG: Config = {
  perPage: 4,
  copies: 1,
  showQr: true,
  showContents: true,
  contentLines: 6,
  showRoom: true,
  showPerson: true,
  showTarget: true,
  showProject: true,
  showSizeWord: true,
  showStatus: false,
  colorBar: true,
  cutLines: true,
}

function Label({
  item,
  contents,
  cfg,
  roomName,
  personName,
  color,
  projectName,
}: {
  item: Item
  contents: ItemContent[]
  cfg: Config
  roomName?: string
  personName?: string
  color: string
  projectName: string
}) {
  const L = LAYOUTS[cfg.perPage]
  const s = L.scale
  return (
    <div
      className="label-card relative flex flex-col overflow-hidden bg-white text-black"
      style={{
        width: `${L.w}mm`,
        height: `${L.h}mm`,
        border: cfg.cutLines ? '1px dashed #bbb' : '1px solid transparent',
        padding: `${3 * s}mm`,
        boxSizing: 'border-box',
      }}
    >
      {cfg.colorBar ? (
        <div
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            insetBlock: 0,
            width: `${2.5 * s}mm`,
            background: color,
          }}
        />
      ) : null}

      <div style={{ paddingInlineStart: cfg.colorBar ? `${3.5 * s}mm` : 0 }} className="flex h-full flex-col">
        {/* Kopfzeile */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {cfg.showRoom && roomName ? (
              <div
                style={{ fontSize: `${3.2 * s}mm`, fontWeight: 800, letterSpacing: '0.04em' }}
                className="truncate uppercase"
              >
                {roomName}
              </div>
            ) : null}
            {cfg.showPerson && personName ? (
              <div style={{ fontSize: `${3 * s}mm` }} className="truncate">
                {personName}
              </div>
            ) : null}
          </div>
          {cfg.showQr ? (
            <QrCode value={`${location.origin}/s/${item.id}`} size={Math.round(16 * s * 3.78)} />
          ) : null}
        </div>

        {/* Nummer */}
        <div
          style={{
            fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
            fontSize: `${11 * s}mm`,
            lineHeight: 1,
            fontWeight: 900,
            letterSpacing: '-0.03em',
            marginTop: `${2 * s}mm`,
          }}
        >
          {item.prefix}
          <span style={{ opacity: 0.35 }}>-</span>
          <span style={{ color: '#E11D48' }}>{item.size}</span>
          <span style={{ opacity: 0.35 }}>-</span>
          {String(item.seq).padStart(3, '0')}
        </div>

        {item.title ? (
          <div style={{ fontSize: `${3.4 * s}mm`, fontWeight: 700, marginTop: `${1 * s}mm` }} className="truncate">
            {item.title}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2" style={{ marginTop: `${1 * s}mm`, fontSize: `${2.8 * s}mm` }}>
          {cfg.showSizeWord ? <span>Groesse {item.size} von 10</span> : null}
          {item.fragile ? (
            <span style={{ fontWeight: 800, color: '#E11D48' }}>ZERBRECHLICH</span>
          ) : null}
          {cfg.showStatus ? <span>{STATUS_LABEL[item.status as ItemStatus]}</span> : null}
        </div>

        {/* Inhalt */}
        {cfg.showContents && contents.length > 0 ? (
          <ul
            style={{ marginTop: `${2 * s}mm`, fontSize: `${2.9 * s}mm`, lineHeight: 1.45 }}
            className="min-h-0 flex-1 overflow-hidden"
          >
            {contents.slice(0, cfg.contentLines).map((c) => (
              <li key={c.id} className="truncate">
                <span style={{ opacity: 0.45 }}>. </span>
                {c.qty > 1 ? `${c.qty}x ` : ''}
                {c.text}
              </li>
            ))}
            {contents.length > cfg.contentLines ? (
              <li style={{ opacity: 0.55 }}>und {contents.length - cfg.contentLines} weitere</li>
            ) : null}
          </ul>
        ) : (
          <div className="min-h-0 flex-1" />
        )}

        {/* Fusszeile */}
        <div
          style={{ fontSize: `${2.6 * s}mm`, borderTop: '1px solid #ddd', paddingTop: `${1.5 * s}mm` }}
          className="flex items-center justify-between gap-2"
        >
          <span className="truncate">{cfg.showProject ? projectName : ''}</span>
          {cfg.showTarget && item.target_room ? (
            <span className="shrink-0 truncate" style={{ fontWeight: 700 }}>
              nach {item.target_room}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function Labels() {
  const { project, rooms, people, tagById } = useProject()
  const [params] = useSearchParams()
  const singleId = params.get('item')

  const [cfg, setCfg] = useLocalState<Config>('kistly.labels', DEFAULT_CONFIG)
  const [roomId, setRoomId] = useState(params.get('room') ?? 'all')
  const [personId, setPersonId] = useState('all')
  const [status, setStatus] = useState<ItemStatus | 'all'>('all')

  const [items, setItems] = useState<Item[]>([])
  const [contents, setContents] = useState<Map<string, ItemContent[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const all = await listAllItems(project.id)
        if (!alive) return
        setItems(all)
        setContents(await listContentsForItems(all.map((i) => i.id)))
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [project.id, nonce])

  const selected = useMemo(() => {
    let list = items
    if (singleId) list = list.filter((i) => i.id === singleId)
    else {
      if (roomId !== 'all') list = list.filter((i) => i.room_id === roomId)
      if (personId !== 'all') list = list.filter((i) => i.person_id === personId)
      if (status !== 'all') list = list.filter((i) => i.status === status)
    }
    const out: Item[] = []
    for (const i of list) for (let c = 0; c < cfg.copies; c++) out.push(i)
    return out
  }, [items, singleId, roomId, personId, status, cfg.copies])

  const L = LAYOUTS[cfg.perPage]
  const pages = Math.ceil(selected.length / cfg.perPage) || 0

  const set = <K extends keyof Config>(key: K, value: Config[K]) => setCfg({ ...cfg, [key]: value })

  return (
    <>
      <AppHeader
        title="Etiketten"
        subtitle={`${selected.length} Etiketten auf ${pages} Seiten`}
        back={`/app/p/${project.id}`}
        actions={
          <Button size="sm" onClick={() => window.print()} disabled={selected.length === 0}>
            <Printer size={16} /> Drucken
          </Button>
        }
      />

      <Page wide className="no-print">
        <Card className="mb-4 p-4">
          <SectionTitle>Welche Kisten</SectionTitle>
          {singleId ? (
            <p className="text-sm text-muted">
              Es wird nur diese eine Kiste gedruckt. Ohne den Link oben kommst du zur
              vollstaendigen Auswahl.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Zimmer">
                <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                  <option value="all">Alle Zimmer</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.short} . {r.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Person">
                <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
                  <option value="all">Alle Personen</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.short} . {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ItemStatus | 'all')}
                >
                  <option value="all">Alle</option>
                  <option value="open">{STATUS_LABEL.open}</option>
                  <option value="transit">{STATUS_LABEL.transit}</option>
                  <option value="arrived">{STATUS_LABEL.arrived}</option>
                </Select>
              </Field>
            </div>
          )}
        </Card>

        <Card className="mb-4 p-4">
          <SectionTitle
            action={
              <Button size="sm" variant="ghost" onClick={() => setCfg(DEFAULT_CONFIG)}>
                <RefreshCw size={14} /> Standard
              </Button>
            }
          >
            Aussehen
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Etiketten pro Seite">
              <Select
                value={String(cfg.perPage)}
                onChange={(e) => set('perPage', Number(e.target.value) as PerPage)}
              >
                {(Object.keys(LAYOUTS) as unknown as PerPage[]).map((k) => (
                  <option key={k} value={k}>
                    {LAYOUTS[k].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Exemplare je Kiste" hint="Zwei Etiketten kleben auf zwei Seiten.">
              <Select value={String(cfg.copies)} onChange={(e) => set('copies', Number(e.target.value))}>
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Zeilen Inhalt">
              <Select
                value={String(cfg.contentLines)}
                onChange={(e) => set('contentLines', Number(e.target.value))}
              >
                {[3, 4, 6, 8, 10, 14].map((n) => (
                  <option key={n} value={n}>
                    {n} Zeilen
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
            <Switch checked={cfg.showQr} onChange={(v) => set('showQr', v)} label="QR-Code" />
            <Switch
              checked={cfg.showContents}
              onChange={(v) => set('showContents', v)}
              label="Inhaltsliste"
            />
            <Switch checked={cfg.showRoom} onChange={(v) => set('showRoom', v)} label="Zimmername" />
            <Switch checked={cfg.showPerson} onChange={(v) => set('showPerson', v)} label="Person" />
            <Switch checked={cfg.colorBar} onChange={(v) => set('colorBar', v)} label="Farbbalken" />
            <Switch
              checked={cfg.showSizeWord}
              onChange={(v) => set('showSizeWord', v)}
              label="Groesse als Text"
            />
            <Switch checked={cfg.showTarget} onChange={(v) => set('showTarget', v)} label="Ziel" />
            <Switch
              checked={cfg.showProject}
              onChange={(v) => set('showProject', v)}
              label="Name des Umzugs"
            />
            <Switch checked={cfg.showStatus} onChange={(v) => set('showStatus', v)} label="Status" />
            <Switch
              checked={cfg.cutLines}
              onChange={(v) => set('cutLines', v)}
              label="Schnittlinien"
            />
          </div>
        </Card>

        {error ? <ErrorBox error={error} onRetry={() => setNonce((n) => n + 1)} /> : null}
        {loading ? <Loading label="Kisten werden geladen" /> : null}
        {!loading && selected.length === 0 ? (
          <Empty
            title="Nichts zu drucken"
            hint="Zu dieser Auswahl gibt es keine Kisten. Aendere den Filter oder lege zuerst Kisten an."
          />
        ) : null}
        {!loading && selected.length > 0 ? (
          <p className="mb-2 text-sm text-muted">
            Vorschau. Beim Drucken A4 waehlen, Raender auf Standard lassen und
            Hintergrundgrafiken einschalten, damit Farbbalken und rote Ziffer mitkommen.
          </p>
        ) : null}
      </Page>

      {/* Druckbogen */}
      <div className="print-sheet mx-auto w-full max-w-[210mm] px-2 pb-10">
        <div
          className="grid justify-center gap-0"
          style={{ gridTemplateColumns: `repeat(${L.cols}, ${L.w}mm)` }}
        >
          {selected.map((item, idx) => {
            const room = tagById(item.room_id)
            const person = tagById(item.person_id)
            return (
              <Label
                key={`${item.id}-${idx}`}
                item={item}
                contents={contents.get(item.id) ?? []}
                cfg={cfg}
                roomName={room?.name}
                personName={person?.name}
                color={room?.color ?? person?.color ?? '#111111'}
                projectName={project.name}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}
