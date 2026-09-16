import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useSprache, useT } from '../lib/i18n'
import type { Item, ItemContent, ItemStatus } from '../lib/types'
import { appUrl, useLocalState } from '../lib/util'

/* ------------------------------------------------------- Papier und Raster */

/** Rand des Druckbogens in Millimetern. Derselbe Wert steht in der
 *  @page-Regel, die zur Laufzeit gesetzt wird. */
const MARGIN = 8
/** Millimeter in Bildschirmpunkte. Nur fuer die verkleinerte Vorschau. */
const MM = 96 / 25.4
/** Kleiner wird auf Papier nicht mehr gelesen, darum ist hier Schluss. */
const MIN_MM = 2.6

const PAPERS = {
  A5: { w: 148, h: 210, name: 'A5' },
  A4: { w: 210, h: 297, name: 'A4' },
  A3: { w: 297, h: 420, name: 'A3' },
} as const
type PaperKey = keyof typeof PAPERS
const PAPER_KEYS = ['A5', 'A4', 'A3'] as const

/* Alle drei Formate haben dasselbe Seitenverhaeltnis, darum passt ein Raster
 * auf jedes Papier. Die Kachelgroesse wird ausgerechnet, nicht fest
 * eingetragen. */
const GRIDS = {
  1: { cols: 1, rows: 1 },
  2: { cols: 1, rows: 2 },
  4: { cols: 2, rows: 2 },
  6: { cols: 2, rows: 3 },
  8: { cols: 2, rows: 4 },
  12: { cols: 3, rows: 4 },
} as const
type PerPage = keyof typeof GRIDS
const PER_PAGE_KEYS = [1, 2, 4, 6, 8, 12] as const

/** Jeder Modus zeigt auf seinen Schluessel im Woerterbuch, damit die
 *  Beschriftung der Sprache folgt und nicht fest im Code steht. */
const MODE_TEXT = {
  nummer: 'etiketten.modus.nummer',
  qr: 'etiketten.modus.qr',
  tabelle: 'etiketten.modus.tabelle',
} as const
type Mode = keyof typeof MODE_TEXT
const MODE_KEYS = ['nummer', 'qr', 'tabelle'] as const

const COPIES = [1, 2, 3, 4] as const
const CONTENT_LINES = [4, 6, 8, 10, 14, 20, 30, 99] as const

interface Sheet {
  paperW: number
  paperH: number
  cols: number
  rows: number
  /** Kachelbreite und Kachelhoehe in Millimetern. */
  w: number
  h: number
  /** Schriftfaktor, waechst mit der Kachelflaeche. */
  s: number
  gridW: number
  gridH: number
}

function layoutOf(paper: PaperKey, perPage: PerPage): Sheet {
  const p = PAPERS[paper]
  const g = GRIDS[perPage]
  // Abrunden, damit das Raster sicher in die nutzbare Flaeche passt und der
  // Drucker keine leere Folgeseite auswirft.
  const down = (n: number) => Math.floor(n * 10) / 10
  const w = down((p.w - 2 * MARGIN) / g.cols)
  const h = down((p.h - 2 * MARGIN) / g.rows)
  // Die Schrift waechst mit der Kachelflaeche. 96 x 138 mm ist die alte Kachel
  // von vier Etiketten auf A4, dort ist der Faktor rund eins.
  const s = Math.sqrt((w * h) / (96 * 138)) * 1.08
  return {
    paperW: p.w,
    paperH: p.h,
    cols: g.cols,
    rows: g.rows,
    w,
    h,
    s,
    gridW: Math.round(w * g.cols * 10) / 10,
    gridH: Math.round(h * g.rows * 10) / 10,
  }
}

/** Schriftgroesse in Millimetern, nie unter der Lesegrenze. */
function fs(v: number): string {
  return `${Math.max(MIN_MM, v).toFixed(2)}mm`
}

/* ----------------------------------------------------------- Einstellungen */

interface Config {
  paper: PaperKey
  perPage: PerPage
  mode: Mode
  copies: number
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
  paper: 'A4',
  perPage: 4,
  mode: 'qr',
  copies: 1,
  contentLines: 8,
  showRoom: true,
  showPerson: true,
  showTarget: true,
  showProject: true,
  showSizeWord: true,
  showStatus: false,
  colorBar: true,
  cutLines: true,
}

function pick<T extends string | number>(v: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(v) ? (v as T) : fallback
}

function flag(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

/** Der gespeicherte Wert kann aus einer aelteren Fassung stammen und Felder
 *  enthalten, die es nicht mehr gibt. Darum wird jedes Feld einzeln geprueft
 *  und faellt sonst auf den Standard zurueck. */
function sanitize(raw: unknown): Config {
  const d = DEFAULT_CONFIG
  if (raw === null || typeof raw !== 'object') return d
  const o = raw as Record<string, unknown>
  return {
    paper: pick(o.paper, PAPER_KEYS, d.paper),
    perPage: pick(o.perPage, PER_PAGE_KEYS, d.perPage),
    mode: pick(o.mode, MODE_KEYS, d.mode),
    copies: pick(o.copies, COPIES, d.copies),
    contentLines: pick(o.contentLines, CONTENT_LINES, d.contentLines),
    showRoom: flag(o.showRoom, d.showRoom),
    showPerson: flag(o.showPerson, d.showPerson),
    showTarget: flag(o.showTarget, d.showTarget),
    showProject: flag(o.showProject, d.showProject),
    showSizeWord: flag(o.showSizeWord, d.showSizeWord),
    showStatus: flag(o.showStatus, d.showStatus),
    colorBar: flag(o.colorBar, d.colorBar),
    cutLines: flag(o.cutLines, d.cutLines),
  }
}

/* --------------------------------------------------------------- Bausteine */

/** QR-Code mit schwarzem Rahmen und der Nummer darunter. Die Groesse kommt in
 *  Millimetern, damit der Code mit der Kachel mitwaechst. */
function QrFrame({ value, code, sizeMm }: { value: string; code: string; sizeMm: number }) {
  const border = Math.max(0.4, sizeMm * 0.035)
  const gap = Math.max(0.7, sizeMm * 0.05)
  return (
    <div
      className="shrink-0"
      style={{
        width: `${sizeMm.toFixed(2)}mm`,
        border: `${border.toFixed(2)}mm solid #000000`,
        borderRadius: `${(sizeMm * 0.06).toFixed(2)}mm`,
        background: '#ffffff',
        padding: `${gap.toFixed(2)}mm`,
        boxSizing: 'border-box',
      }}
    >
      <QrCode value={value} size={512} className="block h-auto w-full" />
      <div
        className="t-serial text-center"
        dir="ltr"
        style={{
          fontSize: fs(sizeMm * 0.13),
          lineHeight: 1.1,
          marginTop: `${(gap * 0.7).toFixed(2)}mm`,
          color: '#000000',
        }}
      >
        {code}
      </div>
    </div>
  )
}

/** Seriennummer. Schriftart und Fettung kommen aus t-serial, damit die Nummer
 *  auf Papier genauso aussieht wie in der App. Die Klasse haelt die Nummer
 *  auch von links nach rechts, in jeder Sprache.
 *
 *  Wo der Block steht, richtet sich dagegen nach der Sprache des Bogens. Darum
 *  liegt die Ausrichtung im Rahmen aussen herum und nicht auf der Nummer
 *  selbst: saesse sie auf der Nummer, wuerde start dort immer links heissen
 *  und die Nummer stuende auf dem arabischen Etikett an der anderen Kante als
 *  der Titel darunter. Die Groessenziffer in der Mitte bleibt rot. */
function Serial({ item, sizeMm, center }: { item: Item; sizeMm: number; center?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: center ? 'center' : 'flex-start' }}>
      <span
        className="t-serial"
        dir="ltr"
        style={{
          fontSize: `${sizeMm.toFixed(2)}mm`,
          lineHeight: 1,
          whiteSpace: 'nowrap',
        }}
      >
        {item.prefix}
        <span style={{ opacity: 0.35 }}>-</span>
        <span style={{ color: '#E11D48' }}>{item.size}</span>
        <span style={{ opacity: 0.35 }}>-</span>
        {String(item.seq).padStart(3, '0')}
      </span>
    </div>
  )
}

function Label({
  item,
  contents,
  cfg,
  tile,
  roomName,
  personName,
  color,
  projectName,
}: {
  item: Item
  contents: ItemContent[]
  cfg: Config
  tile: Sheet
  roomName?: string
  personName?: string
  color: string
  projectName: string
}) {
  const t = useT()
  const s = tile.s
  const pad = 3 * s
  const bar = cfg.colorBar ? 2.6 * s : 0
  const code = `${item.prefix}-${item.size}-${String(item.seq).padStart(3, '0')}`

  // Nutzbare Breite in der Kachel, danach richtet sich alles andere.
  const inner = Math.max(10, tile.w - 2 * pad - bar - 1.2 * s)
  const qrMm =
    cfg.mode === 'qr'
      ? Math.min(tile.h * 0.58, inner * 0.42)
      : cfg.mode === 'tabelle'
        ? Math.min(tile.h * 0.34, inner * 0.34)
        : 0
  const serialW = qrMm > 0 ? inner - qrMm - 2 * s : inner
  const capH = cfg.mode === 'nummer' ? 0.4 : cfg.mode === 'qr' ? 0.3 : 0.2
  // Monospace-Zeichen sind etwa 0.62 em breit. Damit laesst sich die groesste
  // Schrift ausrechnen, die noch in die Kachel passt.
  const serialMm = Math.max(3.2, Math.min(serialW / (code.length * 0.62), tile.h * capH))

  const room = cfg.showRoom ? roomName : undefined
  const person = cfg.showPerson ? personName : undefined
  const hasHead = Boolean(room || person)

  const shown = cfg.contentLines === 99 ? contents : contents.slice(0, cfg.contentLines)
  const rest = contents.length - shown.length

  const cell = {
    border: '0.25mm solid #bbbbbb',
    padding: `${(0.8 * s).toFixed(2)}mm ${(1.2 * s).toFixed(2)}mm`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const

  const title = item.title ? (
    <div
      className="truncate"
      style={{ fontSize: fs(3.4 * s), fontWeight: 700, marginTop: `${(1 * s).toFixed(2)}mm` }}
    >
      {item.title}
    </div>
  ) : null

  return (
    <div
      className="label-card relative flex flex-col overflow-hidden"
      style={{
        width: `${tile.w}mm`,
        height: `${tile.h}mm`,
        border: cfg.cutLines ? '0.25mm dashed #9ca3af' : '0.25mm solid transparent',
        padding: `${pad.toFixed(2)}mm`,
        background: '#ffffff',
        color: '#000000',
        boxSizing: 'border-box',
      }}
    >
      {cfg.colorBar ? (
        <div
          style={{
            position: 'absolute',
            insetInlineStart: 0,
            insetBlock: 0,
            width: `${bar.toFixed(2)}mm`,
            background: color,
          }}
        />
      ) : null}

      <div
        className="flex h-full min-h-0 flex-col"
        style={{ paddingInlineStart: cfg.colorBar ? `${(bar + 1.2 * s).toFixed(2)}mm` : 0 }}
      >
        {hasHead ? (
          cfg.mode === 'nummer' ? (
            <div
              className="truncate uppercase"
              style={{ fontSize: fs(3.6 * s), fontWeight: 800, letterSpacing: '0.03em' }}
            >
              {[room, person].filter(Boolean).join(' . ')}
            </div>
          ) : (
            <div className="min-w-0">
              {room ? (
                <div
                  className="truncate uppercase"
                  style={{ fontSize: fs(3.4 * s), fontWeight: 800, letterSpacing: '0.03em' }}
                >
                  {room}
                </div>
              ) : null}
              {person ? (
                <div className="truncate" style={{ fontSize: fs(3.1 * s), fontWeight: 600 }}>
                  {person}
                </div>
              ) : null}
            </div>
          )
        ) : null}

        {cfg.mode === 'nummer' ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
            <Serial item={item} sizeMm={serialMm} center />
            {title}
          </div>
        ) : (
          <div
            className="flex min-w-0 items-center"
            style={{
              gap: `${(2 * s).toFixed(2)}mm`,
              marginTop: `${(1.5 * s).toFixed(2)}mm`,
              flex: cfg.mode === 'qr' ? '1 1 auto' : '0 0 auto',
            }}
          >
            <div className="min-w-0 flex-1">
              <Serial item={item} sizeMm={serialMm} />
              {title}
            </div>
            <QrFrame value={appUrl(`s/${item.id}`)} code={code} sizeMm={qrMm} />
          </div>
        )}

        {cfg.showSizeWord || item.fragile || cfg.showStatus ? (
          <div
            className="flex flex-wrap items-center"
            style={{
              gap: `${(1.6 * s).toFixed(2)}mm`,
              marginTop: `${(1.2 * s).toFixed(2)}mm`,
              fontSize: fs(2.9 * s),
            }}
          >
            {cfg.showSizeWord ? (
              <span>{t('etiketten.groesse_von_zehn', { n: item.size })}</span>
            ) : null}
            {item.fragile ? (
              <span style={{ fontWeight: 900, color: '#E11D48' }}>{t('etiketten.zerbrechlich')}</span>
            ) : null}
            {cfg.showStatus ? <span>{t(`status.${item.status}`)}</span> : null}
          </div>
        ) : null}

        {cfg.mode === 'tabelle' ? (
          <div
            className="min-h-0 flex-1 overflow-hidden"
            style={{ marginTop: `${(1.6 * s).toFixed(2)}mm` }}
          >
            {contents.length === 0 ? (
              <p style={{ fontSize: fs(3 * s), opacity: 0.6 }}>{t('etiketten.kein_inhalt')}</p>
            ) : (
              <table
                style={{
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                  fontSize: fs(3 * s),
                  lineHeight: 1.3,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        ...cell,
                        width: `${Math.max(9, 10 * s).toFixed(2)}mm`,
                        textAlign: 'center',
                        fontWeight: 800,
                        background: '#eeeeee',
                      }}
                    >
                      {t('etiketten.menge')}
                    </th>
                    <th
                      style={{
                        ...cell,
                        textAlign: 'start',
                        fontWeight: 800,
                        background: '#eeeeee',
                      }}
                    >
                      {t('etiketten.bezeichnung')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c.id}>
                      <td style={{ ...cell, textAlign: 'center', fontWeight: 800 }}>{c.qty}</td>
                      <td style={cell}>{c.text}</td>
                    </tr>
                  ))}
                  {rest > 0 ? (
                    <tr>
                      <td style={{ ...cell, textAlign: 'center', fontWeight: 800 }}>{rest}</td>
                      <td style={{ ...cell, opacity: 0.6 }}>
                        {t('etiketten.weitere_nicht_gedruckt')}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1" />
        )}

        {cfg.showProject || (cfg.showTarget && item.target_room) ? (
          <div
            className="flex items-center justify-between"
            style={{
              gap: `${(1.6 * s).toFixed(2)}mm`,
              borderTop: '0.25mm solid #cccccc',
              paddingTop: `${(1.2 * s).toFixed(2)}mm`,
              marginTop: `${(1.2 * s).toFixed(2)}mm`,
              fontSize: fs(2.8 * s),
            }}
          >
            <span className="min-w-0 truncate">{cfg.showProject ? projectName : ''}</span>
            {cfg.showTarget && item.target_room ? (
              <span className="min-w-0 shrink-0 truncate" style={{ fontWeight: 800 }}>
                {t('etiketten.nach_ziel', { ziel: item.target_room })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------- Seite */

export default function Labels() {
  const { project, rooms, people, tagById } = useProject()
  const { t, tn, dir, rtl } = useSprache()
  const [params] = useSearchParams()
  const singleId = params.get('item')

  const [stored, setStored] = useLocalState<unknown>('kistly.labels', DEFAULT_CONFIG)
  const cfg = useMemo(() => sanitize(stored), [stored])
  const patch = (next: Partial<Config>) => setStored({ ...cfg, ...next })

  const [roomId, setRoomId] = useState(params.get('room') ?? 'all')
  const [personId, setPersonId] = useState(params.get('person') ?? 'all')
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
        const map = await listContentsForItems(all.map((i) => i.id))
        if (alive) setContents(map)
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

  const L = useMemo(() => layoutOf(cfg.paper, cfg.perPage), [cfg.paper, cfg.perPage])

  // Solange geladen wird oder ein Fehler steht, gibt es keine Vorschau. Sonst
  // stuenden alte Bogen neben der Fehlermeldung und man wuesste nicht, was gilt.
  const ready = !loading && error === null
  const pages = useMemo(() => {
    if (!ready) return []
    const out: Item[][] = []
    for (let i = 0; i < selected.length; i += cfg.perPage) {
      out.push(selected.slice(i, i + cfg.perPage))
    }
    return out
  }, [ready, selected, cfg.perPage])

  /* Ohne eigene @page-Regel druckt der Browser immer A4 und die Etiketten
   * passen nicht. Darum haengt die Regel zur Laufzeit im Dokumentkopf. */
  const printCss = useMemo(
    () =>
      [
        '@media print {',
        `  @page { size: ${cfg.paper} portrait; margin: ${MARGIN}mm }`,
        '  .kistly-fit { height: auto !important; overflow: visible !important }',
        // Als Block statt Flex, sonst setzt der Browser die Seitenumbrueche
        // nicht zuverlaessig.
        '  .kistly-stack {',
        '    display: block !important; transform: none !important;',
        '    width: auto !important; gap: 0 !important;',
        '  }',
        '  .kistly-sheet {',
        `    width: ${L.gridW}mm !important;`,
        `    height: ${L.gridH}mm !important;`,
        '    padding: 0 !important; margin: 0 !important;',
        '    border-radius: 0 !important; box-shadow: none !important;',
        '    break-after: page; page-break-after: always;',
        '  }',
        '  .kistly-sheet:last-child { break-after: auto; page-break-after: auto }',
        '  .kistly-sheet, .kistly-sheet * {',
        '    -webkit-print-color-adjust: exact; print-color-adjust: exact;',
        '  }',
        '}',
      ].join('\n'),
    [cfg.paper, L.gridW, L.gridH],
  )

  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-kistly', 'etiketten-druck')
    el.textContent = printCss
    document.head.appendChild(el)
    return () => {
      el.remove()
    }
  }, [printCss])

  /* Ein A3-Bogen ist breiter als jedes Handy. Die Vorschau wird darum auf die
   * verfuegbare Breite heruntergerechnet, damit nichts waagerecht scrollt. */
  const fitRef = useRef<HTMLDivElement>(null)
  const [fitW, setFitW] = useState(0)
  useEffect(() => {
    const el = fitRef.current
    if (!el) return
    const read = () => setFitW(el.clientWidth)
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const zoom = fitW > 0 ? Math.min(1, fitW / (L.paperW * MM)) : 1
  const stackPx = pages.length * L.paperH * MM + Math.max(0, pages.length - 1) * 16

  const paper = PAPERS[cfg.paper]
  const summary =
    selected.length === 0
      ? t('etiketten.keine_auswahl')
      : t('etiketten.vorschau_satz', {
          etiketten: tn('etiketten.anzahl', selected.length),
          seiten: tn('etiketten.seiten', pages.length),
          format: paper.name,
          b: Math.round(L.w),
          h: Math.round(L.h),
        })

  return (
    <>
      <AppHeader
        title={t('etiketten.titel')}
        subtitle={`${paper.name} . ${t('etiketten.pro_seite', { n: cfg.perPage })} . ${t(
          MODE_TEXT[cfg.mode],
        )}`}
        back={`/app/p/${project.id}`}
        actions={
          <Button size="sm" onClick={() => window.print()} disabled={pages.length === 0}>
            <Printer size={16} /> {t('aktion.drucken')}
          </Button>
        }
      />

      <Page wide className="no-print">
        <Card className="mb-4 p-4">
          <SectionTitle>{t('etiketten.welche_kisten')}</SectionTitle>
          {singleId ? (
            <p className="text-base text-muted">{t('etiketten.nur_eine_kiste')}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t('begriff.zimmer')}>
                <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                  <option value="all">{t('etiketten.alle_zimmer')}</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.short} . {r.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('begriff.person')}>
                <Select value={personId} onChange={(e) => setPersonId(e.target.value)}>
                  <option value="all">{t('etiketten.alle_personen')}</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.short} . {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t('begriff.status')}>
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ItemStatus | 'all')}
                >
                  <option value="all">{t('aktion.alle')}</option>
                  <option value="open">{t('status.open')}</option>
                  <option value="transit">{t('status.transit')}</option>
                  <option value="arrived">{t('status.arrived')}</option>
                </Select>
              </Field>
            </div>
          )}
        </Card>

        <Card className="mb-4 p-4">
          <SectionTitle>{t('etiketten.papier_und_inhalt')}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label={t('etiketten.papierformat')}
              hint={t('etiketten.papierformat_hinweis')}
            >
              <Select
                value={cfg.paper}
                onChange={(e) => patch({ paper: pick(e.target.value, PAPER_KEYS, cfg.paper) })}
              >
                {PAPER_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t('etiketten.papier_mass', {
                      name: PAPERS[k].name,
                      b: PAPERS[k].w,
                      h: PAPERS[k].h,
                    })}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('etiketten.was_steht_drauf')}>
              <Select
                value={cfg.mode}
                onChange={(e) => patch({ mode: pick(e.target.value, MODE_KEYS, cfg.mode) })}
              >
                {MODE_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {t(MODE_TEXT[k])}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label={t('etiketten.pro_seite_label')}
              hint={t('etiketten.pro_seite_hinweis')}
            >
              <Select
                value={String(cfg.perPage)}
                onChange={(e) =>
                  patch({ perPage: pick(Number(e.target.value), PER_PAGE_KEYS, cfg.perPage) })
                }
              >
                {PER_PAGE_KEYS.map((n) => {
                  const kachel = layoutOf(cfg.paper, n)
                  return (
                    <option key={n} value={n}>
                      {t('etiketten.pro_seite_mass', {
                        n,
                        b: Math.round(kachel.w),
                        h: Math.round(kachel.h),
                      })}
                    </option>
                  )
                })}
              </Select>
            </Field>
          </div>
        </Card>

        <Card className="mb-4 p-4">
          <SectionTitle
            action={
              <Button size="sm" variant="ghost" onClick={() => setStored(DEFAULT_CONFIG)}>
                <RefreshCw size={14} /> {t('etiketten.standard')}
              </Button>
            }
          >
            {t('etiketten.feinheiten')}
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('etiketten.exemplare')} hint={t('etiketten.exemplare_hinweis')}>
              <Select
                value={String(cfg.copies)}
                onChange={(e) => patch({ copies: pick(Number(e.target.value), COPIES, cfg.copies) })}
              >
                {COPIES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            {cfg.mode === 'tabelle' ? (
              <Field label={t('etiketten.zeilen_inhalt')}>
                <Select
                  value={String(cfg.contentLines)}
                  onChange={(e) =>
                    patch({
                      contentLines: pick(Number(e.target.value), CONTENT_LINES, cfg.contentLines),
                    })
                  }
                >
                  {CONTENT_LINES.map((n) => (
                    <option key={n} value={n}>
                      {n === 99 ? t('etiketten.alles_anzeigen') : t('etiketten.zeilen_n', { n })}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>

          <div className="mt-2 grid gap-x-6 sm:grid-cols-2">
            <Switch
              checked={cfg.showRoom}
              onChange={(v) => patch({ showRoom: v })}
              label={t('etiketten.schalter_zimmername')}
            />
            <Switch
              checked={cfg.showPerson}
              onChange={(v) => patch({ showPerson: v })}
              label={t('begriff.person')}
            />
            <Switch
              checked={cfg.colorBar}
              onChange={(v) => patch({ colorBar: v })}
              label={t('etiketten.schalter_farbbalken')}
            />
            <Switch
              checked={cfg.showSizeWord}
              onChange={(v) => patch({ showSizeWord: v })}
              label={t('etiketten.schalter_groesse')}
            />
            <Switch
              checked={cfg.showTarget}
              onChange={(v) => patch({ showTarget: v })}
              label={t('begriff.ziel')}
            />
            <Switch
              checked={cfg.showProject}
              onChange={(v) => patch({ showProject: v })}
              label={t('etiketten.schalter_umzugsname')}
            />
            <Switch
              checked={cfg.showStatus}
              onChange={(v) => patch({ showStatus: v })}
              label={t('begriff.status')}
            />
            <Switch
              checked={cfg.cutLines}
              onChange={(v) => patch({ cutLines: v })}
              label={t('etiketten.schalter_schnittlinien')}
            />
          </div>
        </Card>

        {error ? <ErrorBox error={error} onRetry={() => setNonce((n) => n + 1)} /> : null}
        {loading ? <Loading label={t('etiketten.kisten_laden')} /> : null}
        {ready && selected.length === 0 ? (
          <Empty
            title={t('etiketten.nichts_zu_drucken')}
            hint={t(singleId ? 'etiketten.leer_einzeln' : 'etiketten.leer_filter')}
          />
        ) : null}
      </Page>

      {/* Druckbogen und Vorschau */}
      <div className="print-sheet mx-auto w-full max-w-6xl px-3 sm:px-5">
        {pages.length > 0 ? (
          <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="t-name">{summary}</p>
              <p className="t-sub">{t('etiketten.druck_hinweis', { format: paper.name })}</p>
            </div>
            <Button size="lg" onClick={() => window.print()}>
              <Printer size={20} /> {t('aktion.drucken')}
            </Button>
          </div>
        ) : null}

        <div
          ref={fitRef}
          className="kistly-fit overflow-hidden"
          style={{ height: pages.length > 0 ? Math.round(stackPx * zoom) : undefined }}
        >
          <div
            className="kistly-stack flex flex-col items-start"
            style={{
              width: `${L.paperW}mm`,
              gap: 16,
              transform: `scale(${zoom})`,
              // Der Stapel haengt am Anfang der Zeile. Im arabischen Satz ist
              // das die rechte Kante, sonst rutscht die Vorschau beim
              // Verkleinern aus dem Bild.
              transformOrigin: rtl ? 'top right' : 'top left',
            }}
          >
            {pages.map((page, pi) => (
              <div
                key={pi}
                className="kistly-sheet"
                /* Der Bogen wird in der gewaehlten Sprache gelesen. Arabische
                 * Etiketten fangen darum rechts an. */
                dir={dir}
                style={{
                  width: `${L.paperW}mm`,
                  height: `${L.paperH}mm`,
                  padding: `${MARGIN}mm`,
                  boxSizing: 'border-box',
                  background: '#ffffff',
                  borderRadius: 3,
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.18)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${L.cols}, ${L.w}mm)`,
                    gridTemplateRows: `repeat(${L.rows}, ${L.h}mm)`,
                  }}
                >
                  {page.map((item, idx) => {
                    const room = tagById(item.room_id)
                    const person = tagById(item.person_id)
                    return (
                      <Label
                        key={`${item.id}-${pi}-${idx}`}
                        item={item}
                        contents={contents.get(item.id) ?? []}
                        cfg={cfg}
                        tile={L}
                        roomName={room?.name}
                        personName={person?.name}
                        color={room?.color ?? person?.color ?? '#111111'}
                        projectName={project.name}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="no-print h-6" />
      </div>
    </>
  )
}
