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
import { useT } from '../lib/i18n'
import { notifyItemStatus } from '../lib/push'
import { type Item, type ItemStatus } from '../lib/types'
import { contrastOn, fmtTime, normalizeCodeInput, useLocalState } from '../lib/util'

interface Hit {
  item: Item
  at: string
  /* Nur der alte Code wird gemerkt, nicht der fertige Satz. So steht der
   * Hinweis in der Liste immer in der Sprache, die gerade gewaehlt ist. */
  oldCode?: string
}

export default function ScanPage() {
  const { project, tagById, canEdit } = useProject()
  const toast = useToast()
  const t = useT()

  const [autoStatus, setAutoStatus] = useLocalState<ItemStatus | 'off'>(
    'kistly.scanAuto',
    'arrived',
  )
  const [hits, setHits] = useState<Hit[]>([])
  const [paused, setPaused] = useState(false)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)

  const handleItem = useCallback(
    async (itemId: string, oldCode?: string) => {
      setBusy(true)
      try {
        let item = await getItem(itemId)
        if (item.project_id !== project.id) {
          toast(t('scannen.anderer_umzug'), 'error')
          return
        }
        /* Die Notiz im Verlauf bleibt bewusst deutsch. Sie steht in der
         * Datenbank und wird von allen im Umzug gelesen, egal in welcher
         * Sprache sie gerade unterwegs sind. */
        await logScan(project.id, item.id, oldCode ? `alter Code ${oldCode}` : undefined)
        if (canEdit && autoStatus !== 'off' && item.status !== autoStatus) {
          item = await setItemStatus(item.id, autoStatus)
          toast(
            t('scannen.status_gesetzt', { code: item.code, wert: t(`status.${autoStatus}`) }),
            'ok',
          )
          if (autoStatus === 'arrived') {
            void notifyItemStatus(
              project.id,
              project.name,
              t('scannen.ist_angekommen', { code: item.code }),
            )
          }
        } else {
          toast(t('scannen.gefunden', { code: item.code }), 'ok')
        }
        setHits((h) => [{ item, at: new Date().toISOString(), oldCode }, ...h].slice(0, 40))
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), 'error')
      } finally {
        setBusy(false)
        setPaused(true)
        setTimeout(() => setPaused(false), 900)
      }
    },
    [project.id, project.name, autoStatus, canEdit, toast, t],
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
          toast(t('scannen.nichts_im_umzug', { code }), 'error')
          setPaused(true)
          setTimeout(() => setPaused(false), 1200)
          return
        }
        const old = rows.find((r) => r.is_old)
        await handleItem(rows[0].item_id, old?.code)
        if (old) toast(t('scannen.alter_code', { code: old.code }), 'info')
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), 'error')
      }
    },
    [handleItem, project.id, toast, t],
  )

  return (
    <>
      <AppHeader
        title={t('nav.scannen')}
        subtitle={
          autoStatus === 'off'
            ? t('scannen.nur_nachschlagen')
            : t('scannen.setzt_automatisch', { wert: t(`status.${autoStatus}`) })
        }
        back={`/app/p/${project.id}`}
      />
      <Page>
        <div className="mb-4">
          <Scanner onResult={(text) => void onScan(text)} paused={paused || busy} />
        </div>

        <Card className="mb-4 p-4">
          <Switch
            checked={autoStatus !== 'off'}
            onChange={(v) => setAutoStatus(v ? 'arrived' : 'off')}
            label={t('scannen.auto_label_kurz')}
            hint={t('scannen.auto_hinweis_kurz')}
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
                  {t(`status.${s}`)}
                </Button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="mb-4 p-4">
          <Field label={t('scannen.von_hand')} hint={t('scannen.von_hand_hinweis')}>
            <div className="flex gap-2">
              {/* Das Feld haelt eine Seriennummer und laeuft darum immer von
                  links nach rechts, das macht schon t-serial. Dann muss aber
                  auch die Lupe links bleiben, sonst sitzt sie im Arabischen
                  rechts und der Platz dafuer waere links frei. Darum steht
                  die Richtung am Rahmen und nicht an einzelnen Klassen. */}
              <div dir="ltr" className="relative min-w-0 flex-1">
                <Search
                  size={18}
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted"
                />
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
                  className="t-serial ps-10 uppercase"
                />
              </div>
              <Button
                disabled={!manual.trim()}
                onClick={() => {
                  void onScan(manual)
                  setManual('')
                }}
              >
                {t('aktion.suchen')}
              </Button>
            </div>
          </Field>
        </Card>

        {/* Dieser Scanner sucht nur in diesem Umzug. Wer ein fremdes Etikett in
            der Hand haelt, kommt hier zum Scanner ueber alle Umzuege. */}
        <Card className="mb-5 p-4">
          <p className="t-name">{t('scannen.fremdes_etikett')}</p>
          <p className="t-sub mt-1.5 break-words">
            {t('scannen.nur_dieser_umzug', { name: project.name })}
          </p>
          <Link to="/app/scan" className="mt-4 block sm:inline-block">
            <Button variant="soft" size="lg" full className="sm:w-auto">
              <Warehouse size={20} /> {t('scannen.alle_umzuege')}
            </Button>
          </Link>
        </Card>

        <SectionTitle
          action={
            hits.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setHits([])}>
                {t('scannen.liste_leeren')}
              </Button>
            ) : null
          }
        >
          {t('scannen.sitzung', { n: hits.length })}
        </SectionTitle>

        {hits.length === 0 ? (
          <Empty
            icon={<ScanLine size={30} />}
            title={t('scannen.leer_titel')}
            hint={t('scannen.leer_hinweis_umzug')}
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
                      {h.item.title || room?.name || person?.name || t('begriff.kiste')}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-2">
                      <CodeChip code={h.item.code} />
                      <StatusPill status={h.item.status} size="sm" />
                      {room ? (
                        <span
                          dir="ltr"
                          className="rounded-lg px-2 py-1 text-sm font-black"
                          style={{ background: room.color, color: contrastOn(room.color) }}
                        >
                          {room.short}
                        </span>
                      ) : null}
                    </span>
                    <span className="t-sub mt-1.5 block truncate">
                      {t('scannen.gescannt_um', { zeit: fmtTime(h.at) })}
                    </span>
                    {/* Der alte Code steht neben der Beschriftung, nicht
                        mitten im Satz. So bleibt die Nummer auch im
                        arabischen Text von links nach rechts. */}
                    {h.oldCode ? (
                      <span className="mt-1 flex flex-wrap items-baseline gap-1.5 text-sm font-bold text-warn">
                        <span>{t('scannen.note_alter_code')}</span>
                        <span className="t-serial">{h.oldCode}</span>
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight size={20} className="spiegeln shrink-0 text-muted" />
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
