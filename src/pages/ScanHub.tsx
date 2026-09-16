import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Check,
  DoorOpen,
  ScanLine,
  Search,
  User,
  Warehouse,
} from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Scanner } from '../components/Scanner'
import {
  Button,
  Card,
  CodeChip,
  Empty,
  ErrorBox,
  Field,
  Input,
  SectionTitle,
  Spinner,
  StatusPill,
  Switch,
  useToast,
} from '../components/ui'
import { setItemStatus } from '../lib/api'
import { signedUrls } from '../lib/media'
import { notifyItemStatus } from '../lib/push'
import { resolveScan, type ScanResult } from '../lib/scan'
import { SIZE_LABEL, STATUS_LABEL, type ItemStatus, type Tag } from '../lib/types'
import { contrastOn, fmtTime, useLocalState } from '../lib/util'
import { useAppShell } from './AppLayout'

/* Der Scan-Bereich fuer alles.
 * Er haengt an keinem Umzug, sondern sucht ueber alle, in denen man
 * Mitglied ist. Ein Treffer zeigt die ganze Kiste auf einen Blick und
 * fuehrt von dort mit einem Griff ins Zimmer oder in den Umzug.
 */

interface LogRow {
  at: string
  hit: ScanResult
}

/** Farbige Kachel fuer Zimmer oder Person. Kuerzel gross, Name daneben. */
function TagTile({ label, tag, icon }: { label: string; tag: Tag | null; icon: ReactNode }) {
  if (!tag) {
    return (
      <div className="min-w-0 rounded-xl border-2 border-dashed border-line px-3.5 py-3">
        <div className="t-sub flex items-center gap-1.5">
          {icon}
          {label}
        </div>
        <div className="t-name mt-0.5">nicht gesetzt</div>
      </div>
    )
  }
  return (
    <div
      className="min-w-0 rounded-xl px-3.5 py-3"
      style={{ background: tag.color, color: contrastOn(tag.color) }}
    >
      <div className="flex items-center gap-1.5 text-[0.9375rem] font-bold opacity-85">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
        <span className="t-serial shrink-0 text-2xl">{tag.short}</span>
        <span className="t-name-lg truncate">{tag.name}</span>
      </div>
    </div>
  )
}

export default function ScanHub() {
  const { rememberProject } = useAppShell()
  const toast = useToast()

  /* Derselbe Schluessel wie beim Scannen innerhalb eines Umzugs, damit die
   * Einstellung nicht an zwei Orten auseinanderlaeuft. */
  const [autoStatus, setAutoStatus] = useLocalState<ItemStatus | 'off'>(
    'kistly.scanAuto',
    'arrived',
  )
  const auto = autoStatus === 'off' ? null : autoStatus

  const [hit, setHit] = useState<ScanResult | null>(null)
  const [log, setLog] = useState<LogRow[]>([])
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [photosFor, setPhotosFor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState<ItemStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [paused, setPaused] = useState(false)
  const [lastInput, setLastInput] = useState('')

  const busyRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    },
    [],
  )

  // Ueber den Verweis liest der Scan-Aufruf immer die aktuelle Einstellung.
  // Damit bleibt run stabil und der Kamera-Scanner startet nicht bei jedem
  // Tastendruck im Suchfeld neu.
  const autoRef = useRef(auto)
  useEffect(() => {
    autoRef.current = auto
  }, [auto])

  /* Eine leere Kachel heisst zweierlei: noch unterwegs oder endgueltig
   * nicht da. photosFor haelt fest, fuer welche Kiste die Adressen schon
   * durch sind, damit die Kachel das eine vom anderen unterscheiden kann. */
  const photosPending = hit !== null && hit.photoPaths.length > 0 && photosFor !== hit.item.id

  /* Fotos der getroffenen Kiste. Signierte Adressen halten eine Stunde und
   * werden in media.ts gemerkt, ein zweiter Scan laedt also nicht neu.
   * Alte Eintraege bleiben stehen, der Schluessel ist der Pfad. */
  useEffect(() => {
    let alive = true
    const itemId = hit?.item.id
    const paths = hit?.photoPaths ?? []
    if (!itemId || paths.length === 0) return
    /* Ohne dieses Abfangen bliebe bei einem Aussetzer nur ein Kreisel
     * stehen, der sich nie wieder beruhigt. Die Kachel soll stattdessen
     * sagen, dass dieses Foto gerade nicht kommt. */
    signedUrls('item-photos', paths)
      .then((m) => {
        if (alive) setUrls((cur) => new Map([...cur, ...m]))
      })
      .catch((err: unknown) => {
        console.warn('[scan] Fotos nicht geladen:', err)
      })
      .finally(() => {
        if (alive) setPhotosFor(itemId)
      })
    return () => {
      alive = false
    }
  }, [hit])

  const run = useCallback(
    async (text: string) => {
      const input = text.trim()
      if (!input || busyRef.current) return
      busyRef.current = true
      setBusy(true)
      setPaused(true)
      setError(null)
      setNotFound(null)
      setLastInput(input)
      try {
        const res = await resolveScan(input)
        if (!res) {
          setHit(null)
          setNotFound(input.toUpperCase())
          return
        }
        // Damit die untere Leiste ab jetzt in den richtigen Umzug zielt.
        rememberProject(res.project.id)

        let current = res
        const want = autoRef.current
        if (want && res.item.status !== want) {
          try {
            const updated = await setItemStatus(res.item.id, want)
            current = { ...res, item: updated }
            toast(`${updated.code} auf ${STATUS_LABEL[want]} gesetzt`, 'ok')
            if (want === 'arrived') {
              void notifyItemStatus(
                res.project.id,
                res.project.name,
                `${updated.code} ist angekommen`,
              )
            }
          } catch (err) {
            // Der Treffer bleibt stehen, nur das Setzen ist misslungen.
            toast(
              `Status nicht geaendert: ${err instanceof Error ? err.message : String(err)}`,
              'error',
            )
          }
        } else {
          toast(`${res.item.code} gefunden`, 'ok')
        }

        setHit(current)
        setLog((rows) => [{ at: new Date().toISOString(), hit: current }, ...rows].slice(0, 40))
      } catch (err) {
        setHit(null)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        busyRef.current = false
        setBusy(false)
        if (timerRef.current) window.clearTimeout(timerRef.current)
        timerRef.current = window.setTimeout(() => setPaused(false), 900)
      }
    },
    [rememberProject, toast],
  )

  // Bewusst als eigener, stabiler Wert. Ein neuer Pfeil bei jedem Rendern
  // wuerde die Kamera im Scanner jedes Mal neu starten.
  const onScanned = useCallback(
    (text: string) => {
      void run(text)
    },
    [run],
  )

  async function changeStatus(next: ItemStatus) {
    if (!hit || saving) return
    setSaving(next)
    try {
      const updated = await setItemStatus(hit.item.id, next)
      setHit((h) => (h && h.item.id === updated.id ? { ...h, item: updated } : h))
      setLog((rows) =>
        rows.map((r) =>
          r.hit.item.id === updated.id ? { ...r, hit: { ...r.hit, item: updated } } : r,
        ),
      )
      toast(`${updated.code} auf ${STATUS_LABEL[next]} gesetzt`, 'ok')
      if (next === 'arrived') {
        void notifyItemStatus(hit.project.id, hit.project.name, `${updated.code} ist angekommen`)
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSaving(null)
    }
  }

  /* Der Knopf ist waehrend der Suche gesperrt, die Eingabetaste nicht.
   * Ohne die Pruefung auf busy wuerde run stumm abbrechen und das Feld
   * waere trotzdem leer, der getippte Code also verloren. */
  function submitManual() {
    const v = manual.trim()
    if (!v || busy) return
    void run(v)
    setManual('')
  }

  return (
    <>
      <AppHeader title="Scannen" subtitle="Jede Kiste, jeder Umzug" />
      <Page>
        <div className="mb-4">
          <Scanner onResult={onScanned} paused={paused || busy} />
        </div>

        <Card className="mb-4 p-3.5">
          <Field label="Code von Hand eingeben" hint="Falls der QR-Code beschaedigt oder weg ist.">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                />
                <Input
                  value={manual}
                  onChange={(e) => setManual(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitManual()
                  }}
                  placeholder="W-3-007"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  className="t-serial pl-10 text-lg uppercase"
                />
              </div>
              <Button disabled={!manual.trim() || busy} onClick={submitManual}>
                Suchen
              </Button>
            </div>
          </Field>
        </Card>

        {busy ? (
          <Card className="mb-4 flex items-center gap-3 p-4">
            <Spinner />
            <span className="t-name">Kiste wird gesucht</span>
          </Card>
        ) : null}

        {error ? (
          <div className="mb-4">
            <ErrorBox error={error} onRetry={lastInput ? () => void run(lastInput) : undefined} />
          </div>
        ) : null}

        {notFound && !busy ? (
          <Card className="mb-4 border-2 border-danger/30 p-5">
            <p className="t-name">Dazu gibt es nichts</p>
            <p className="t-serial mt-2 break-words text-2xl">{notFound}</p>
            <p className="t-sub mt-2">
              Das steckt in keinem deiner Umzuege. Vielleicht gehoert das Etikett zu einem Umzug, in
              dem du noch nicht bist. Lass dir einen Einladungscode geben.
            </p>
          </Card>
        ) : null}

        {hit && !busy ? (
          <>
            <Card className="animate-in mb-3 overflow-hidden">
              <div
                className="h-2"
                style={{ background: hit.room?.color ?? hit.person?.color ?? '#94a3b8' }}
              />
              <div className="p-4">
                {hit.isOldCode ? (
                  <div className="mb-3 flex items-start gap-2 rounded-xl border-2 border-warn/40 bg-warn/10 px-3 py-3 text-warn">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0" />
                    <span className="min-w-0 text-base font-bold">
                      Dieses Etikett ist veraltet. Die Kiste heisst jetzt {hit.item.code}. Am besten
                      neu bekleben.
                    </span>
                  </div>
                ) : null}

                <CodeChip code={hit.item.code} size="xl" className="break-words" />
                <p className="t-name-lg mt-3 break-words">
                  {hit.item.title || hit.room?.name || hit.person?.name || 'Kiste ohne Namen'}
                </p>
                <p className="t-sub mt-0.5">
                  Groesse {hit.item.size} von 10, {SIZE_LABEL[hit.item.size]}
                  {hit.item.fragile ? ', zerbrechlich' : ''}
                </p>
                {hit.moreMatches > 0 ? (
                  <p className="mt-1.5 text-base font-bold text-warn">
                    Denselben Code tragen noch {hit.moreMatches} weitere Kisten in anderen Umzuegen.
                  </p>
                ) : null}

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <TagTile label="Zimmer" tag={hit.room} icon={<DoorOpen size={15} />} />
                  <TagTile label="Person" tag={hit.person} icon={<User size={15} />} />
                </div>

                <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl bg-raised px-3.5 py-3">
                  <Warehouse size={18} className="shrink-0 text-muted" />
                  <span className="t-name truncate">{hit.project.name}</span>
                </div>

                <div className="mt-4 flex min-w-0 items-center gap-2">
                  <StatusPill status={hit.item.status} />
                  <span className="t-sub truncate">so steht die Kiste gerade</span>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(['open', 'transit', 'arrived'] as ItemStatus[]).map((s) => (
                    <Button
                      key={s}
                      size="lg"
                      full
                      variant={hit.item.status === s ? 'primary' : 'outline'}
                      loading={saving === s}
                      disabled={saving !== null}
                      onClick={() => void changeStatus(s)}
                    >
                      {STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>

                {hit.contents.length > 0 ? (
                  <div className="mt-4">
                    <SectionTitle>Inhalt ({hit.contents.length})</SectionTitle>
                    <div className="zebra divide-y divide-line overflow-hidden rounded-xl border border-line">
                      {hit.contents.map((c) => (
                        <div key={c.id} className="flex items-center gap-3 px-3.5 py-2.5">
                          <span
                            className={`min-w-0 flex-1 break-words text-base font-semibold ${
                              c.checked ? 'text-muted line-through' : ''
                            }`}
                          >
                            {c.text}
                          </span>
                          {c.qty > 1 ? (
                            <span className="shrink-0 text-sm font-bold text-muted">
                              {c.qty} Stueck
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {hit.photoPaths.length > 0 ? (
                  <div className="mt-4">
                    <SectionTitle>Fotos ({hit.photoPaths.length})</SectionTitle>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      {hit.photoPaths.map((p) => {
                        const url = urls.get(p)
                        return (
                          <div
                            key={p}
                            className="aspect-square overflow-hidden rounded-xl border border-line bg-raised"
                          >
                            {url ? (
                              <img
                                src={url}
                                alt="Foto der Kiste"
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            ) : photosPending ? (
                              <div className="flex h-full items-center justify-center">
                                <Spinner />
                              </div>
                            ) : (
                              <div className="flex h-full items-center justify-center px-1 text-center text-sm font-bold text-muted">
                                nicht ladbar
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>

            <div className="mb-5 grid gap-2 sm:grid-cols-3">
              <Link to={`/app/p/${hit.project.id}/kisten/${hit.item.id}`} className="block">
                <Button size="lg" full>
                  <Boxes size={20} /> Zur Kiste
                </Button>
              </Link>
              {hit.room ? (
                <Link to={`/app/p/${hit.project.id}/kisten?room=${hit.room.id}`} className="block">
                  <Button size="lg" full variant="outline">
                    <DoorOpen size={20} /> Zum Zimmer
                  </Button>
                </Link>
              ) : null}
              <Link to={`/app/p/${hit.project.id}`} className="block">
                <Button size="lg" full variant="outline">
                  <Warehouse size={20} /> Zum Umzug
                </Button>
              </Link>
            </div>
          </>
        ) : null}

        <Card className="mb-5 p-3.5">
          <Switch
            checked={auto !== null}
            onChange={(v) => setAutoStatus(v ? 'arrived' : 'off')}
            label="Beim Scannen direkt auf Angekommen setzen"
            hint={
              auto && auto !== 'arrived'
                ? `Gerade eingestellt: ${STATUS_LABEL[auto]}`
                : 'Scannen, gruen, naechste Kiste. Ohne Haken wird nur nachgeschlagen.'
            }
          />
        </Card>

        <SectionTitle
          action={
            log.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setLog([])}>
                Liste leeren
              </Button>
            ) : null
          }
        >
          In dieser Sitzung gescannt ({log.length})
        </SectionTitle>

        {log.length === 0 ? (
          <Empty
            icon={<ScanLine size={30} />}
            title="Noch nichts gescannt"
            hint="Halte den QR-Code vom Etikett in den Rahmen. Jede Kiste landet hier, egal zu welchem Umzug sie gehoert."
          />
        ) : (
          <Card className="zebra divide-y divide-line overflow-hidden">
            {/* Gestapelt statt alles in einer Zeile: Code, Status und Name
                nebeneinander sprengen bei 375px die Breite. */}
            {log.map((row) => {
              const room = row.hit.room
              return (
                <Link
                  key={`${row.at}-${row.hit.item.id}`}
                  to={`/app/p/${row.hit.project.id}/kisten/${row.hit.item.id}`}
                  className="flex items-center gap-3 px-3.5 py-3 transition hover:bg-raised"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <Check size={18} className="shrink-0 text-ok" />
                      <CodeChip code={row.hit.item.code} />
                      <StatusPill status={row.hit.item.status} size="sm" />
                    </span>
                    <span className="t-name block truncate">
                      {row.hit.item.title || room?.name || row.hit.project.name}
                    </span>
                    {/* Der volle Zimmername, nicht nur das Kuerzel: beim
                        Tragen sagt W niemandem, wohin die Kiste soll. */}
                    <span className="flex min-w-0 items-center gap-1.5">
                      {room ? (
                        <span
                          className="inline-flex min-w-0 items-center gap-1 rounded-lg px-2 py-0.5 text-[0.9375rem] font-bold leading-6"
                          style={{ background: room.color, color: contrastOn(room.color) }}
                        >
                          <DoorOpen size={14} className="shrink-0 opacity-80" />
                          <span className="min-w-0 truncate">{room.name}</span>
                        </span>
                      ) : null}
                      <span className="shrink-0 text-sm text-muted">{fmtTime(row.at)}</span>
                    </span>
                  </span>
                  <ArrowRight size={18} className="shrink-0 text-muted" />
                </Link>
              )
            })}
          </Card>
        )}

        <div className="h-6" />
      </Page>
    </>
  )
}
