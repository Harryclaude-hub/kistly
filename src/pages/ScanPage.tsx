import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, ScanLine, Search } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Scanner } from '../components/Scanner'
import {
  Button,
  Card,
  CodeChip,
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
        subtitle={autoStatus === 'off' ? 'Nur nachschlagen' : `Setzt automatisch: ${STATUS_LABEL[autoStatus]}`}
        back={`/app/p/${project.id}`}
      />
      <Page>
        <div className="mb-4">
          <Scanner onResult={(t) => void onScan(t)} paused={paused || busy} />
        </div>

        <Card className="mb-4 p-3">
          <Switch
            checked={autoStatus !== 'off'}
            onChange={(v) => setAutoStatus(v ? 'arrived' : 'off')}
            label="Beim Scannen Status setzen"
            hint="So geht der Einzug schnell: scannen, gruen, naechste Kiste."
            disabled={!canEdit}
          />
          {autoStatus !== 'off' ? (
            <div className="mt-2 flex gap-2">
              {(['open', 'transit', 'arrived'] as ItemStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setAutoStatus(s)}
                  className={`flex-1 rounded-xl border px-2 py-2 text-xs font-bold transition ${
                    autoStatus === s ? 'border-ink bg-ink text-paper' : 'border-line hover:bg-raised'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="mb-5 p-3">
          <Field label="Code von Hand eingeben" hint="Falls der QR-Code beschaedigt ist.">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
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
                  className="pl-9 font-mono uppercase"
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

        <SectionTitle
          action={
            hits.length > 0 ? (
              <button onClick={() => setHits([])} className="text-xs underline">
                Liste leeren
              </button>
            ) : null
          }
        >
          In dieser Sitzung gescannt ({hits.length})
        </SectionTitle>

        {hits.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">
            <ScanLine size={26} className="mx-auto mb-2 opacity-50" />
            Noch nichts gescannt. Halte den QR-Code vom Etikett in den Rahmen.
          </Card>
        ) : (
          <Card className="zebra divide-y divide-line overflow-hidden">
            {hits.map((h, i) => {
              const room = tagById(h.item.room_id)
              const person = tagById(h.item.person_id)
              return (
                <Link
                  key={`${h.item.id}-${i}`}
                  to={`/app/p/${project.id}/kisten/${h.item.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-raised"
                >
                  <Check size={16} className="shrink-0 text-ok" />
                  <CodeChip code={h.item.code} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {h.item.title || room?.name || person?.name || 'Kiste'}
                    </span>
                    <span className="flex items-center gap-1.5 text-[11px] text-muted">
                      {fmtTime(h.at)}
                      {room ? (
                        <span
                          className="rounded px-1 font-bold"
                          style={{ background: room.color, color: contrastOn(room.color) }}
                        >
                          {room.short}
                        </span>
                      ) : null}
                      {h.note ? <span className="text-warn">{h.note}</span> : null}
                    </span>
                  </span>
                  <StatusPill status={h.item.status} size="sm" />
                  <ArrowRight size={15} className="shrink-0 text-muted" />
                </Link>
              )
            })}
          </Card>
        )}
        <div className="h-4" />
      </Page>
    </>
  )
}
