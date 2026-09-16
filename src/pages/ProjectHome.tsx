import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Boxes,
  ClipboardList,
  Cog,
  LayoutGrid,
  Plus,
  Printer,
  ScanLine,
} from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { Button, Card, Empty, Loading, SectionTitle } from '../components/ui'
import { useProject } from './ProjectLayout'
import { getStats, listItems, listProjectEvents } from '../lib/api'
import { STATUS_LABEL, type ItemEvent, type ItemStatus } from '../lib/types'
import { relTime, useAsync, withAlpha } from '../lib/util'
import { displayNameOf } from '../lib/auth'

function StatTile({
  label,
  value,
  color,
  to,
}: {
  label: string
  value: number
  color: string
  to: string
}) {
  return (
    <Link to={to}>
      <div
        className="rounded-2xl border border-line p-3.5 transition hover:border-ink/25"
        style={{ background: withAlpha(color, 0.07) }}
      >
        <div className="text-2xl font-black tabular-nums" style={{ color }}>
          {value}
        </div>
        <div className="mt-0.5 text-xs font-semibold text-muted">{label}</div>
      </div>
    </Link>
  )
}

function EventLine({ ev, nameOf }: { ev: ItemEvent; nameOf: (id: string | null) => string }) {
  const d = ev.data as Record<string, string>
  const text =
    ev.type === 'created'
      ? `hat ${d.code ?? 'eine Kiste'} angelegt`
      : ev.type === 'status'
        ? `hat ${STATUS_LABEL[d.to as ItemStatus] ?? d.to} gesetzt`
        : ev.type === 'scan'
          ? 'hat gescannt'
          : ev.type === 'code'
            ? `hat den Code auf ${d.to} geaendert`
            : ev.type
  return (
    <li className="flex items-baseline gap-2 px-3 py-2 text-sm">
      <span className="font-semibold">{nameOf(ev.user_id)}</span>
      <span className="min-w-0 flex-1 truncate text-muted">{text}</span>
      <span className="shrink-0 text-xs text-muted">{relTime(ev.created_at)}</span>
    </li>
  )
}

export default function ProjectHome() {
  const { project, rooms, people, members, canEdit } = useProject()
  const nav = useNavigate()
  const base = `/app/p/${project.id}`

  const stats = useAsync(() => getStats(project.id), [project.id])
  const events = useAsync(() => listProjectEvents(project.id, 12), [project.id])
  const roomCounts = useAsync(async () => {
    const out = new Map<string, { total: number; arrived: number }>()
    for (const r of rooms) {
      const [all, arrived] = await Promise.all([
        listItems(project.id, { roomId: r.id, limit: 1 }),
        listItems(project.id, { roomId: r.id, status: 'arrived', limit: 1 }),
      ])
      out.set(r.id, { total: all.total, arrived: arrived.total })
    }
    return out
  }, [project.id, rooms.map((r) => r.id).join(',')])

  const nameOf = (id: string | null) =>
    displayNameOf(members.find((m) => m.user_id === id)?.profile, 'Jemand')

  const s = stats.data
  const pct = s && s.items_total > 0 ? Math.round((s.items_arrived / s.items_total) * 100) : 0

  return (
    <>
      <AppHeader
        title={project.name}
        subtitle={project.note ?? `${members.length} Mitglieder`}
        back="/app"
        actions={
          <Link to={`${base}/einstellungen`} aria-label="Umzug einstellen" className="rounded-xl p-2 hover:bg-raised">
            <Cog size={20} />
          </Link>
        }
      />

      <Page>
        {/* Fortschritt */}
        <Card className="mb-4 p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-muted">Angekommen</p>
              <p className="text-3xl font-black tabular-nums">
                {pct}
                <span className="text-lg text-muted">%</span>
              </p>
            </div>
            <p className="text-sm text-muted">
              {s?.items_arrived ?? 0} von {s?.items_total ?? 0}
            </p>
          </div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-raised">
            <div className="h-full rounded-full bg-ok transition-all" style={{ width: `${pct}%` }} />
          </div>
        </Card>

        <div className="mb-5 grid grid-cols-3 gap-2">
          <StatTile
            label={STATUS_LABEL.open}
            value={s?.items_open ?? 0}
            color="#ef4444"
            to={`${base}/kisten?status=open`}
          />
          <StatTile
            label={STATUS_LABEL.transit}
            value={s?.items_transit ?? 0}
            color="#f59e0b"
            to={`${base}/kisten?status=transit`}
          />
          <StatTile
            label={STATUS_LABEL.arrived}
            value={s?.items_arrived ?? 0}
            color="#16a34a"
            to={`${base}/kisten?status=arrived`}
          />
        </div>

        {/* Schnellzugriff */}
        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {canEdit ? (
            <Button variant="outline" className="h-auto flex-col py-4" onClick={() => nav(`${base}/kisten?neu=1`)}>
              <Plus size={20} />
              Kiste anlegen
            </Button>
          ) : null}
          <Button variant="outline" className="h-auto flex-col py-4" onClick={() => nav(`${base}/scan`)}>
            <ScanLine size={20} />
            Scannen
          </Button>
          <Button variant="outline" className="h-auto flex-col py-4" onClick={() => nav(`${base}/bereiche`)}>
            <LayoutGrid size={20} />
            Bereiche
          </Button>
          <Button variant="outline" className="h-auto flex-col py-4" onClick={() => nav(`${base}/etiketten`)}>
            <Printer size={20} />
            Etiketten
          </Button>
        </div>

        {/* Zimmer */}
        <SectionTitle
          action={
            <Link to={`${base}/bereiche`} className="text-xs font-semibold underline">
              verwalten
            </Link>
          }
        >
          Zimmer
        </SectionTitle>
        {rooms.length === 0 ? (
          <Empty
            title="Noch keine Zimmer"
            hint="Lege zuerst die Bereiche an. Jedes Zimmer bekommt ein Kuerzel, damit die Kisten eine Nummer bekommen koennen."
            action={
              <Link to={`${base}/bereiche`}>
                <Button>
                  <Plus size={16} /> Bereiche anlegen
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="zebra mb-6 overflow-hidden rounded-2xl border border-line">
            {rooms.map((r) => {
              const c = roomCounts.data?.get(r.id)
              const p = c && c.total > 0 ? Math.round((c.arrived / c.total) * 100) : 0
              return (
                <Link
                  key={r.id}
                  to={`${base}/kisten?room=${r.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-raised"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black"
                    style={{ background: r.color, color: '#fff' }}
                  >
                    {r.short}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className="block text-xs text-muted">
                      {c ? `${c.arrived} von ${c.total} angekommen` : 'zaehlt'}
                    </span>
                  </span>
                  <span className="w-16 shrink-0">
                    <span className="block h-1.5 overflow-hidden rounded-full bg-raised">
                      <span
                        className="block h-full rounded-full bg-ok"
                        style={{ width: `${p}%` }}
                      />
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Personen */}
        {people.length > 0 ? (
          <>
            <SectionTitle>Personen</SectionTitle>
            <div className="mb-6 flex flex-wrap gap-2">
              {people.map((p) => (
                <Link key={p.id} to={`${base}/kisten?person=${p.id}`}>
                  <span
                    className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm font-semibold hover:bg-raised"
                    style={{ borderColor: p.color }}
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-black"
                      style={{ background: p.color, color: '#fff' }}
                    >
                      {p.short}
                    </span>
                    {p.name}
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : null}

        {/* Verlauf */}
        <SectionTitle>Zuletzt passiert</SectionTitle>
        <Card className="overflow-hidden">
          {events.loading ? (
            <Loading label="Verlauf" />
          ) : (events.data ?? []).length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">
              Noch nichts passiert. Sobald Kisten angelegt oder gescannt werden, steht es hier.
            </p>
          ) : (
            <ul className="zebra divide-y divide-line">
              {(events.data ?? []).map((ev) => (
                <EventLine key={ev.id} ev={ev} nameOf={nameOf} />
              ))}
            </ul>
          )}
        </Card>

        <div className="mt-6 flex flex-wrap gap-2 pb-4">
          <Link to={`${base}/kisten`}>
            <Button variant="soft">
              <Boxes size={16} /> Alle Kisten
            </Button>
          </Link>
          <Link to={`${base}/etiketten`}>
            <Button variant="soft">
              <ClipboardList size={16} /> Etiketten und Liste
            </Button>
          </Link>
          <Link to="/app">
            <Button variant="ghost">
              <ArrowLeft size={16} /> Andere Umzuege
            </Button>
          </Link>
        </div>
      </Page>
    </>
  )
}
