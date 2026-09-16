import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ScanLine, Search, Warehouse } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Scanner } from '../components/Scanner'
import {
  Button,
  Card,
  CodeChip,
  Empty,
  Field,
  Input,
  SectionTitle,
  StatusPill,
  Switch,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { getItem, logScan, resolveCode, setItemStatus } from '../lib/api'
import { notifyItemStatus } from '../lib/push'
import { STATUS_LABEL, type Item, type ItemStatus } from '../lib/types'
import { contrastOn, fmtTime, normalizeCodeInput, useLocalState } from '../lib/util'

interface Hit {
  item: Item
  at: string
  note?: string
}

export default function ScanPage() {
  const { project, tagById, canEdit } = useProject()
  const toast = useToast()

  const [autoStatus, setAutoStatus] = useLocalState<ItemStatus | 'off'>(
    'kistly.scanAuto',
    'arrived',
  )
  const [hits, setHits] = useState<Hit[]>([])
  const [paused, setPaused] = useState(false)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)

  const handleItem = useCallback(
    async (itemId: string, note?: string) => {
      setBusy(true)
      try {
        let item = await getItem(itemId)
        if (item.project_id !== project.id) {
          toast('Diese Kiste gehoert zu einem anderen Umzug.', 'error')
          return
        }
        await logScan(project.id, item.id, note)
        if (canEdit && autoStatus !== 'off' && item.status !== autoStatus) {
          item = await setItemStatus(item.id, autoStatus)
          toast(`${item.code} auf ${STATUS_LABEL[autoStatus]} gesetzt`, 'ok')
          if (autoStatus === 'arrived') {
            void notifyItemStatus(project.id, project.name, `${item.code} ist angekommen`)
          }
        } else {
          toast(`${item.code} gefunden`, 'ok')
        }
        setHits((h) => [{ item, at: new Date().toISOString(), note }, ...h].slice(0, 40))
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), 'error')
      } finally {
        setBusy(false)
        setPaused(true)
        setTimeout(() => setPaused(false), 900)
      }
    },
    [project.id, project.name, autoStatus, canEdit, toast],
  )

  /** Ein Scan kann eine Kistly-Adresse sein oder ein getippter Code. */
  const onScan = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      const match = /\/s\/([0-9a-f-]{36})/i.exec(trimmed)
      if (match) {
        await handleItem(match[1])
        return
      }
      const code = normalizeCodeInput(trimmed)
      try {
        const rows = await resolveCode(project.id, code)
        if (rows.length === 0) {
          toast(`Zu ${code} gibt es in diesem Umzug nichts.`, 'error')
          setPaused(true)
          setTimeout(() => setPaused(false), 1200)
          return
        }
        const old = rows.find((r) => r.is_old)
        await handleItem(rows[0].item_id, old ? `alter Code ${old.code}` : undefined)
        if (old) toast(`Achtung: ${old.code} ist ein alter Code, das Etikett ist veraltet.`, 'info')
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), 'error')
      }
    },
    [handleItem, project.id, toast],
  )

  return (
    <>
      <AppHeader
        title="Scannen"
        subtitle={
          autoStatus === 'off'
            ? 'Nur nachschlagen'
            : `Setzt automatisch: ${STATUS_LABEL[autoStatus]}`
        }
        back={`/app/p/${project.id}`}
      />
      <Page>
        <div className="mb-4">
          <Scanner onResult={(t) => void onScan(t)} paused={paused || busy} />
        </div>

        <Card className="mb-4 p-4">
          <Switch
            checked={autoStatus !== 'off'}
            onChange={(v) => setAutoStatus(v ? 'arrived' : 'off')}
            label="Beim Scannen Status setzen"
            hint="So geht der Einzug schnell: scannen, gruen, naechste Kiste."
            disabled={!canEdit}
          />
          {/* Auf dem Handy untereinander, damit lange Namen wie Alte Wohnung
              nicht umbrechen muessen. */}
          {autoStatus !== 'off' ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(['open', 'transit', 'arrived'] as ItemStatus[]).map((s) => (
                <Button
                  key={s}
                  full
                  variant={autoStatus === s ? 'primary' : 'outline'}
                  aria-pressed={autoStatus === s}
                  onClick={() => setAutoStatus(s)}
                >
                  {STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="mb-4 p-4">
          <Field label="Code von Hand eingeben" hint="Falls der QR-Code beschaedigt ist.">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  value={manual}
                  onChange={(e) => setManual(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manual.trim()) {
                      void onScan(manual)
                      setManual('')
                    }
                  }}
                  placeholder="W-3-007"
                  className="t-serial pl-10 uppercase"
                />
              </div>
              <Button
                disabled={!manual.trim()}
                onClick={() => {
                  void onScan(manual)
                  setManual('')
                }}
              >
                Suchen
              </Button>
            </div>
          </Field>
        </Card>

        {/* Dieser Scanner sucht nur in diesem Umzug. Wer ein fremdes Etikett in
            der Hand haelt, kommt hier zum Scanner ueber alle Umzuege. */}
        <Card className="mb-5 p-4">
          <p className="t-name">Etikett aus einem anderen Umzug?</p>
          <p className="t-sub mt-1.5 break-words">
            Hier wird nur in {project.name} gesucht. Der grosse Scan-Bereich zeigt Treffer aus allen
            deinen Umzuegen.
          </p>
          <Link to="/app/scan" className="mt-4 block sm:inline-block">
            <Button variant="soft" size="lg" full className="sm:w-auto">
              <Warehouse size={20} /> Ueber alle Umzuege scannen
            </Button>
          </Link>
        </Card>

        <SectionTitle
          action={
            hits.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setHits([])}>
                Liste leeren
              </Button>
            ) : null
          }
        >
          In dieser Sitzung gescannt ({hits.length})
        </SectionTitle>

        {hits.length === 0 ? (
          <Empty
            icon={<ScanLine size={30} />}
            title="Noch nichts gescannt"
            hint="Halte den QR-Code vom Etikett in den Rahmen. Jeder Treffer landet hier in der Liste."
          />
        ) : (
          <Card className="zebra divide-y divide-line overflow-hidden">
            {hits.map((h, i) => {
              const room = tagById(h.item.room_id)
              const person = tagById(h.item.person_id)
              return (
                <Link
                  key={`${h.item.id}-${i}`}
                  to={`/app/p/${project.id}/kisten/${h.item.id}`}
                  className="flex items-center gap-3 px-3 py-3 hover:bg-raised"
                >
                  <Check size={20} className="shrink-0 text-ok" />
                  <span className="min-w-0 flex-1">
                    <span className="t-name block truncate">
                      {h.item.title || room?.name || person?.name || 'Kiste'}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <CodeChip code={h.item.code} />
                      <StatusPill status={h.item.status} size="sm" />
                      {room ? (
                        <span
                          className="rounded-lg px-2 py-1 text-sm font-black"
                          style={{ background: room.color, color: contrastOn(room.color) }}
                        >
                          {room.short}
                        </span>
                      ) : null}
                    </span>
                    <span className="t-sub mt-1.5 block truncate">
                      Gescannt um {fmtTime(h.at)}
                      {h.note ? <span className="font-bold text-warn">, {h.note}</span> : null}
                    </span>
                  </span>
                  <ArrowRight size={20} className="shrink-0 text-muted" />
                </Link>
              )
            })}
          </Card>
        )}

        {/* Luft fuer die untere Navigationsleiste */}
        <div className="h-6" />
      </Page>
    </>
  )
}
