import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Boxes,
  ChevronRight,
  ClipboardList,
  Cog,
  LayoutGrid,
  Plus,
  Printer,
  ScanLine,
  Users,
} from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  IconButton,
  Loading,
  SectionTitle,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { getStats, listProjectEvents, listTagStats } from '../lib/api'
import { useSprache, useT } from '../lib/i18n'
import type { ItemEvent } from '../lib/types'
import { contrastOn, relTime, useAsync, withAlpha } from '../lib/util'
import { displayNameOf } from '../lib/auth'

/** Schnellzugriff. Hoehe und Innenabstand stehen als Stil am Knopf, damit
 *  alle Kacheln gleich hoch bleiben, egal wie lang die Beschriftung ist. */
function Quick({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      variant="outline"
      full
      onClick={onClick}
      className="flex-col gap-2 text-center"
      style={{
        height: 'auto',
        minHeight: 92,
        paddingTop: 14,
        paddingBottom: 14,
        paddingLeft: 8,
        paddingRight: 8,
      }}
    >
      {icon}
      <span className="text-[0.9375rem] font-bold leading-tight">{label}</span>
    </Button>
  )
}

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
    <Link to={to} className="block">
      <div
        className="flex min-h-[96px] flex-col justify-center rounded-2xl border-2 px-3 py-3 transition hover:brightness-95 active:scale-[0.98]"
        style={{ background: withAlpha(color, 0.08), borderColor: withAlpha(color, 0.35) }}
      >
        <span className="text-3xl font-black leading-none tabular-nums" style={{ color }}>
          {value}
        </span>
        <span className="mt-2 break-words text-sm font-bold text-muted">{label}</span>
      </div>
    </Link>
  )
}

/** Ein Satz, in dem eine Seriennummer steckt. Die Nummer bekommt t-serial
 *  und bleibt damit auch im arabischen Satz von links nach rechts stehen. */
function mitSerial(text: string, serial: string): ReactNode {
  const i = serial ? text.indexOf(serial) : -1
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <span className="t-serial">{serial}</span>
      {text.slice(i + serial.length)}
    </>
  )
}

/** Ein Status aus der Datenbank als Wort. Kennt die App den Wert nicht,
 *  steht er unveraendert da, statt dass die Zeile leer bleibt. */
function statusWort(t: (key: string) => string, wert: string | undefined): string {
  if (wert === 'open' || wert === 'transit' || wert === 'arrived') return t(`status.${wert}`)
  return wert ?? ''
}

function EventLine({ ev, nameOf }: { ev: ItemEvent; nameOf: (id: string | null) => string }) {
  const t = useT()
  const d = ev.data as Record<string, string>
  let text: ReactNode = ev.type
  if (ev.type === 'created') {
    text = d.code
      ? mitSerial(t('umzuege.ereignis_angelegt', { code: d.code }), d.code)
      : t('umzuege.ereignis_angelegt', { code: t('umzuege.eine_kiste') })
  } else if (ev.type === 'status') {
    text = t('umzuege.ereignis_status', { status: statusWort(t, d.to) })
  } else if (ev.type === 'scan') {
    text = t('umzuege.ereignis_scan')
  } else if (ev.type === 'code') {
    text = mitSerial(t('umzuege.ereignis_code', { code: d.to ?? '' }), d.to ?? '')
  }
  return (
    <li className="flex items-baseline gap-2 px-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="t-name block truncate">{nameOf(ev.user_id)}</span>
        <span className="t-sub block truncate">{text}</span>
      </span>
      <span className="shrink-0 text-sm text-muted">{relTime(ev.created_at)}</span>
    </li>
  )
}

export default function ProjectHome() {
  const { project, rooms, people, members, canEdit } = useProject()
  const { t, tn } = useSprache()
  const nav = useNavigate()
  const base = `/app/p/${project.id}`

  const stats = useAsync(() => getStats(project.id), [project.id])
  const events = useAsync(() => listProjectEvents(project.id, 12), [project.id])
  const roomCounts = useAsync(() => listTagStats(project.id), [project.id])

  const nameOf = (id: string | null) =>
    displayNameOf(members.find((m) => m.user_id === id)?.profile, t('umzuege.jemand'))

  const s = stats.data
  const pct = s && s.items_total > 0 ? Math.round((s.items_arrived / s.items_total) * 100) : 0

  /** Eine Zeile unter dem Namen eines Bereichs. Solange gezaehlt wird, steht
   *  das da, und wenn das Zaehlen scheitert, steht auch das da. */
  const countLine = (id: string) => {
    if (roomCounts.error) return t('umzuege.zaehlwerte_fehler')
    const c = roomCounts.data?.get(id)
    if (!c) return t(roomCounts.loading ? 'umzuege.wird_gezaehlt' : 'umzuege.noch_keine_kisten')
    return t('status.angekommen_von', { a: c.arrived, b: c.total })
  }

  return (
    <>
      <AppHeader
        title={project.name}
        subtitle={project.note ?? tn('begriff.mitglieder_anzahl', members.length)}
        back="/app"
        actions={
          <IconButton
            label={t('umzuege.einstellen')}
            onClick={() => nav(`${base}/einstellungen`)}
          >
            <Cog size={20} />
          </IconButton>
        }
      />

      <Page>
        {/* Fortschritt und Zaehlwerte: laedt, Fehler oder Daten */}
        {stats.loading ? (
          <Loading label={t('umzuege.zaehlwerte_laden')} />
        ) : stats.error ? (
          <ErrorBox error={stats.error} onRetry={stats.reload} />
        ) : (
          <>
            <Card className="mb-3 p-5">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="t-sub font-bold">{t('status.arrived')}</p>
                  <p className="text-4xl font-black leading-none tabular-nums">
                    {pct}
                    <span className="text-2xl text-muted">%</span>
                  </p>
                </div>
                <p className="t-sub shrink-0">
                  {t('umzuege.a_von_b', { a: s?.items_arrived ?? 0, b: s?.items_total ?? 0 })}
                </p>
              </div>
              <div
                className="mt-4 h-3 w-full overflow-hidden rounded-full bg-raised"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('status.arrived')}
              >
                <div
                  className="h-full rounded-full bg-ok transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Card>

            <div className="mb-5 grid grid-cols-3 gap-2">
              <StatTile
                label={t('status.open')}
                value={s?.items_open ?? 0}
                color="#ef4444"
                to={`${base}/kisten?status=open`}
              />
              <StatTile
                label={t('status.transit')}
                value={s?.items_transit ?? 0}
                color="#f59e0b"
                to={`${base}/kisten?status=transit`}
              />
              <StatTile
                label={t('status.arrived')}
                value={s?.items_arrived ?? 0}
                color="#16a34a"
                to={`${base}/kisten?status=arrived`}
              />
            </div>
          </>
        )}

        {/* Schnellzugriff */}
        <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {canEdit ? (
            <Quick
              icon={<Plus size={26} />}
              label={t('umzuege.kiste_anlegen')}
              onClick={() => nav(`${base}/kisten?neu=1`)}
            />
          ) : null}
          <Quick
            icon={<ScanLine size={26} />}
            label={t('nav.scannen')}
            onClick={() => nav(`${base}/scan`)}
          />
          <Quick
            icon={<LayoutGrid size={26} />}
            label={t('begriff.bereiche')}
            onClick={() => nav(`${base}/bereiche`)}
          />
          <Quick
            icon={<Printer size={26} />}
            label={t('umzuege.etiketten')}
            onClick={() => nav(`${base}/etiketten`)}
          />
        </div>

        {/* Zimmer */}
        <SectionTitle
          action={
            <Link to={`${base}/bereiche`}>
              <Button variant="outline" size="sm">
                {t('umzuege.verwalten')}
              </Button>
            </Link>
          }
        >
          {t('umzuege.zimmer_ueberschrift')}
        </SectionTitle>
        {rooms.length === 0 ? (
          <Empty
            title={t('umzuege.keine_zimmer')}
            hint={t('umzuege.keine_zimmer_hinweis')}
            action={
              <Link to={`${base}/bereiche`}>
                <Button size="lg">
                  <Plus size={20} /> {t('umzuege.bereiche_anlegen')}
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="zebra mb-6 overflow-hidden rounded-2xl border border-line">
            {rooms.map((r) => (
              <Link
                key={r.id}
                to={`${base}/kisten?room=${r.id}`}
                className="flex items-center gap-3 px-3 py-3 hover:bg-raised"
              >
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-black"
                  style={{ background: r.color, color: contrastOn(r.color) }}
                >
                  {r.short}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="t-name block truncate">{r.name}</span>
                  <span className="t-sub block truncate">{countLine(r.id)}</span>
                </span>
                <ChevronRight size={20} className="spiegeln shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        )}

        {/* Personen */}
        {people.length > 0 ? (
          <>
            <SectionTitle
              action={
                <Link to={`${base}/bereiche`}>
                  <Button variant="outline" size="sm">
                    {t('umzuege.verwalten')}
                  </Button>
                </Link>
              }
            >
              {t('begriff.personen')}
            </SectionTitle>
            <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {people.map((p) => (
                <Link key={p.id} to={`${base}/kisten?person=${p.id}`} className="block">
                  <span
                    className="flex min-h-[76px] items-center gap-3 rounded-2xl border-2 bg-surface px-3 py-3 transition hover:bg-raised active:scale-[0.99]"
                    style={{ borderColor: withAlpha(p.color, 0.45) }}
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-black"
                      style={{ background: p.color, color: contrastOn(p.color) }}
                    >
                      {p.short}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-name block truncate">{p.name}</span>
                      <span className="t-sub block truncate">{countLine(p.id)}</span>
                    </span>
                    <ChevronRight size={20} className="spiegeln shrink-0 text-muted" />
                  </span>
                </Link>
              ))}
            </div>
          </>
        ) : null}

        {/* Verlauf */}
        <SectionTitle>{t('umzuege.zuletzt')}</SectionTitle>
        <Card className="overflow-hidden">
          {events.loading ? (
            <Loading label={t('umzuege.verlauf_laden')} />
          ) : events.error ? (
            <div className="p-4">
              <ErrorBox error={events.error} onRetry={events.reload} />
            </div>
          ) : (events.data ?? []).length === 0 ? (
            <p className="t-sub px-4 py-8 text-center">{t('umzuege.verlauf_leer')}</p>
          ) : (
            <ul className="zebra divide-y divide-line">
              {(events.data ?? []).map((ev) => (
                <EventLine key={ev.id} ev={ev} nameOf={nameOf} />
              ))}
            </ul>
          )}
        </Card>

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <Link to={`${base}/kisten`} className="block">
            <Button variant="soft" full>
              <Boxes size={18} /> {t('umzuege.alle_kisten')}
            </Button>
          </Link>
          <Link to={`${base}/etiketten`} className="block">
            <Button variant="soft" full>
              <ClipboardList size={18} /> {t('umzuege.etiketten_liste')}
            </Button>
          </Link>
          <Link to={`${base}/team`} className="block">
            <Button variant="soft" full>
              <Users size={18} /> {t('umzuege.team')}
            </Button>
          </Link>
          <Link to="/app" className="block">
            <Button variant="outline" full>
              <ArrowLeft size={18} className="spiegeln" /> {t('umzuege.andere')}
            </Button>
          </Link>
        </div>

        {/* Luft fuer die untere Navigationsleiste */}
        <div className="h-6" />
      </Page>
    </>
  )
}
