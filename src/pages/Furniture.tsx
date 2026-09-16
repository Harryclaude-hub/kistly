import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Armchair, Plus } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { ItemRow } from '../components/ItemRow'
import {
  Button,
  Card,
  Chip,
  Empty,
  ErrorBox,
  Field,
  Input,
  Loading,
  Modal,
  Select,
  Switch,
  Textarea,
  useToast,
} from '../components/ui'
import { SizePicker } from './Items'
import { useProject } from './ProjectLayout'
import { createItem, listItems, setItemStatus } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { notifyItemStatus } from '../lib/push'
import { useWischen } from '../lib/wischen'
import type { Item, ItemStatus } from '../lib/types'

/* Der eigene Bereich fuer Moebel.
 *
 * Moebel sind erreichbar ueber das Zimmer, aber auch hier, neben den
 * Kisten. In der Datenbank sind es Eintraege in items mit
 * kind = 'furniture'. Diese Seite ist darum dieselbe Liste wie die
 * Kistenliste, nur mit dem umgekehrten Filter.
 */

const NAECHSTER_STATUS: Record<ItemStatus, ItemStatus> = {
  open: 'transit',
  transit: 'arrived',
  arrived: 'open',
}

interface Entwurf {
  title: string
  room_id: string
  size: number
  hersteller: string
  modell: string
  masse: string
  zerlegt: boolean
  note: string
}

export default function Furniture() {
  const { project, rooms, tagById, canEdit } = useProject()
  const { t, tn } = useSprache()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  useWischen()

  const zimmerFilter = params.get('room') ?? 'all'

  const [rows, setRows] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const laden = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listItems(project.id, {
        kind: 'furniture',
        roomId: zimmerFilter,
        limit: 300,
        sort: 'code',
      })
      setRows(res.rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [project.id, zimmerFilter])

  useEffect(() => {
    void laden()
  }, [laden])

  /* -------------------------------------------------------- neues Stueck */
  const [offen, setOffen] = useState(params.get('neu') === '1')
  const [busy, setBusy] = useState(false)
  const [formFehler, setFormFehler] = useState<string | null>(null)
  const [entwurf, setEntwurf] = useState<Entwurf>({
    title: '',
    room_id: zimmerFilter !== 'all' ? zimmerFilter : (rooms[0]?.id ?? ''),
    size: 8,
    hersteller: '',
    modell: '',
    masse: '',
    zerlegt: false,
    note: '',
  })

  const vorschau = tagById(entwurf.room_id)?.short ?? '??'

  async function anlegen(e: FormEvent) {
    e.preventDefault()
    setFormFehler(null)
    if (!entwurf.room_id) {
      setFormFehler(t('kisten.fehler_kein_tag'))
      return
    }
    setBusy(true)
    try {
      const neu = await createItem({
        project_id: project.id,
        kind: 'furniture',
        title: entwurf.title.trim() || null,
        room_id: entwurf.room_id,
        code_source: 'room',
        size: entwurf.size,
        note: entwurf.note.trim() || null,
        hersteller: entwurf.hersteller.trim() || null,
        modell: entwurf.modell.trim() || null,
        masse: entwurf.masse.trim() || null,
        zerlegt: entwurf.zerlegt,
      })
      toast(t('moebel.angelegt', { code: neu.code }), 'ok')
      setOffen(false)
      setEntwurf((d) => ({ ...d, title: '', hersteller: '', modell: '', masse: '', note: '' }))
      await laden()
    } catch (err) {
      setFormFehler(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function statusWeiter(item: Item) {
    const ziel = NAECHSTER_STATUS[item.status]
    setRows((prev) => prev.map((r) => (r.id === item.id ? { ...r, status: ziel } : r)))
    try {
      await setItemStatus(item.id, ziel)
      if (ziel === 'arrived') {
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

  function setzeZimmer(id: string) {
    const next = new URLSearchParams(params)
    if (id === 'all') next.delete('room')
    else next.set('room', id)
    next.delete('neu')
    setParams(next, { replace: true })
  }

  return (
    <>
      <AppHeader
        title={t('moebel.titel')}
        subtitle={t('moebel.untertitel')}
        back={`/app/p/${project.id}`}
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => setOffen(true)}>
              <Plus size={17} />
              {t('aktion.neu')}
            </Button>
          ) : null
        }
      />
      <Page>
        {rooms.length > 1 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <Chip active={zimmerFilter === 'all'} onClick={() => setzeZimmer('all')}>
              {t('aktion.alle')}
            </Chip>
            {rooms.map((r) => (
              <Chip
                key={r.id}
                active={zimmerFilter === r.id}
                color={r.color}
                onClick={() => setzeZimmer(r.id)}
              >
                {r.name}
              </Chip>
            ))}
          </div>
        ) : null}

        {loading ? (
          <Loading label={t('moebel.laedt')} />
        ) : error ? (
          <ErrorBox error={error} onRetry={() => void laden()} />
        ) : rows.length === 0 ? (
          <Empty
            icon={<Armchair size={32} />}
            title={zimmerFilter === 'all' ? t('moebel.leer_titel') : t('moebel.leer_filter')}
            hint={zimmerFilter === 'all' ? t('moebel.leer_hinweis') : undefined}
            action={
              canEdit ? (
                <Button onClick={() => setOffen(true)}>
                  <Plus size={18} />
                  {t('moebel.neu')}
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <p className="t-sub mb-3">{tn('moebel.anzahl', rows.length)}</p>
            <Card className="zebra divide-y divide-line overflow-hidden">
              {rows.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  projectId={project.id}
                  tagById={tagById}
                  canEdit={canEdit}
                  onStatus={statusWeiter}
                />
              ))}
            </Card>
          </>
        )}
        <div className="h-6" />
      </Page>

      <Modal
        open={offen}
        onClose={() => setOffen(false)}
        title={t('moebel.neu')}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={() => setOffen(false)}>
              {t('aktion.abbrechen')}
            </Button>
            <Button form="moebel-form" type="submit" loading={busy}>
              {t('aktion.anlegen')}
            </Button>
          </>
        }
      >
        <form id="moebel-form" onSubmit={(e) => void anlegen(e)} className="space-y-4">
          {formFehler ? <ErrorBox error={formFehler} /> : null}

          <Field label={t('begriff.name')}>
            <Input
              value={entwurf.title}
              onChange={(e) => setEntwurf({ ...entwurf, title: e.target.value })}
              placeholder={t('moebel.name_platzhalter')}
              autoFocus
            />
          </Field>

          <Field label={t('begriff.zimmer')} hint={t('kisten.kuerzel_im_code')}>
            <Select
              value={entwurf.room_id}
              onChange={(e) => setEntwurf({ ...entwurf, room_id: e.target.value })}
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.short} - {r.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('begriff.groesse')}>
            <SizePicker value={entwurf.size} onChange={(v) => setEntwurf({ ...entwurf, size: v })} />
          </Field>

          <p className="t-sub">
            {t('kisten.nummer_wird')}{' '}
            <span className="t-serial font-black">
              {vorschau}-<span className="text-danger">{entwurf.size}</span>-...
            </span>
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('moebel.hersteller')} hint={t('begriff.optional')}>
              <Input
                value={entwurf.hersteller}
                onChange={(e) => setEntwurf({ ...entwurf, hersteller: e.target.value })}
                placeholder={t('moebel.hersteller_platzhalter')}
              />
            </Field>
            <Field label={t('moebel.modell')} hint={t('begriff.optional')}>
              <Input
                value={entwurf.modell}
                onChange={(e) => setEntwurf({ ...entwurf, modell: e.target.value })}
                placeholder={t('moebel.modell_platzhalter')}
              />
            </Field>
          </div>

          <Field label={t('moebel.masse')} hint={t('moebel.masse_hinweis')}>
            <Input
              value={entwurf.masse}
              onChange={(e) => setEntwurf({ ...entwurf, masse: e.target.value })}
              placeholder={t('moebel.masse_platzhalter')}
              dir="ltr"
            />
          </Field>

          <Switch
            checked={entwurf.zerlegt}
            onChange={(v) => setEntwurf({ ...entwurf, zerlegt: v })}
            label={t('moebel.zerlegt')}
            hint={t('moebel.zerlegt_hinweis')}
          />

          <Field label={t('begriff.notiz')} hint={t('begriff.optional')}>
            <Textarea
              value={entwurf.note}
              onChange={(e) => setEntwurf({ ...entwurf, note: e.target.value })}
              rows={2}
            />
          </Field>
        </form>
      </Modal>

      {/* Ein fester Knopf unten rechts, damit man auf dem Handy nicht erst
          nach oben scrollen muss. Ein echter Knopf, kein Link ins Leere. */}
      {canEdit && rows.length > 0 ? (
        <button
          type="button"
          onClick={() => setOffen(true)}
          aria-label={t('moebel.neu')}
          title={t('moebel.neu')}
          className="no-print fixed bottom-[calc(var(--nav-h,6rem)+1rem)] end-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-paper shadow-lg transition active:scale-95"
        >
          <Plus size={26} />
        </button>
      ) : null}
    </>
  )
}
