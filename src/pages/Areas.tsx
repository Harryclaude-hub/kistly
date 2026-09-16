import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight, Pencil, Plus, Trash2, User, DoorOpen } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { MarkIcon } from '../components/Mark'
import {
  Button,
  Card,
  CodeChip,
  ConfirmDialog,
  Empty,
  ErrorBox,
  Field,
  IconButton,
  Input,
  Modal,
  SectionTitle,
  Textarea,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { createTag, deleteTag, listTagStats, updateTag } from '../lib/api'
import { useSprache, useT } from '../lib/i18n'
import { MARK_SYMBOLE } from '../lib/marken'
import { TAG_COLORS, type Tag, type TagKind } from '../lib/types'
import { contrastOn, cx, suggestShort } from '../lib/util'

interface Draft {
  id?: string
  kind: TagKind
  name: string
  short: string
  color: string
  /** Ein Zeichen neben dem Kuerzel. Freiwillig, hilft beim schnellen
   *  Erkennen auf Papier und in langen Listen. */
  symbol: string | null
  note: string
}

const EMPTY = (kind: TagKind, color: string): Draft => ({
  kind,
  name: '',
  short: '',
  color,
  symbol: null,
  note: '',
})

function ColorGrid({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const t = useT()
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={t('bereiche.farbe_waehlen', { farbe: c })}
          aria-pressed={value.toUpperCase() === c}
          className="h-11 w-11 rounded-xl border-4 transition active:scale-95"
          style={{
            background: c,
            borderColor: value.toUpperCase() === c ? 'var(--ink)' : 'transparent',
          }}
        />
      ))}
      <label
        title={t('bereiche.eigene_farbe')}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-raised"
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-7 w-7 cursor-pointer"
          aria-label={t('bereiche.eigene_farbe')}
        />
      </label>
    </div>
  )
}

function TagRow({
  tag,
  to,
  count,
  countsFailed,
  onEdit,
  onDelete,
  canEdit,
}: {
  tag: Tag
  /** Die eigene Seite dieses Bereichs. Antippen oeffnet sie wie eine Akte. */
  to: string
  count: number | undefined
  countsFailed: boolean
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  const { t, tn } = useSprache()
  const countText =
    count !== undefined
      ? tn('begriff.kisten_anzahl', count)
      : countsFailed
        ? t('bereiche.anzahl_fehlt')
        : t('bereiche.wird_gezaehlt')
  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-3">
        {/* Das Kuerzel ist die Verbindung zur Nummer auf dem Etikett, darum
            steht es so gross wie moeglich. Es bleibt immer von links nach
            rechts, auch im arabischen Satz. */}
        <Link to={to} className="-m-1 flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1">
          <span
            dir="ltr"
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-mono font-black ${
              tag.short.length > 2 ? 'text-lg' : 'text-2xl'
            }`}
            style={{ background: tag.color, color: contrastOn(tag.color) }}
          >
            {tag.short}
          </span>
          <span className="min-w-0 flex-1">
            <span className="t-name-lg flex items-center gap-1.5 break-words">
              {tag.symbol ? <MarkIcon symbol={tag.symbol} size={17} /> : null}
              {tag.name}
            </span>
            <span className="t-sub block truncate">{countText}</span>
          </span>
          <ChevronRight size={20} className="spiegeln shrink-0 text-muted" />
        </Link>
        {canEdit ? (
          <div className="flex shrink-0 gap-1.5">
            <IconButton
              label={t('bereiche.bearbeiten_label', { name: tag.name })}
              size="sm"
              onClick={onEdit}
            >
              <Pencil size={17} />
            </IconButton>
            <IconButton
              label={t('bereiche.loeschen_label', { name: tag.name })}
              size="sm"
              tone="danger"
              onClick={onDelete}
            >
              <Trash2 size={17} />
            </IconButton>
          </div>
        ) : null}
      </div>
      {tag.note ? <p className="t-sub mt-2 break-words">{tag.note}</p> : null}
    </div>
  )
}

export default function Areas() {
  const { project, rooms, people, tags, canEdit, reloadTags } = useProject()
  const { t, tn } = useSprache()
  const toast = useToast()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [countsError, setCountsError] = useState<string | null>(null)
  const [countsNonce, setCountsNonce] = useState(0)
  const [toDelete, setToDelete] = useState<Tag | null>(null)
  const [params, setParams] = useSearchParams()

  const retryCounts = useCallback(() => setCountsNonce((n) => n + 1), [])

  /* Die eigene Seite eines Bereichs schickt zum Bearbeiten hierher zurueck.
   * Der Dialog steht nur an dieser einen Stelle, sonst gaebe es ihn zweimal
   * und beide wuerden auseinanderlaufen. */
  useEffect(() => {
    const wunsch = params.get('bearbeiten')
    if (!wunsch) return
    const tag = tags.find((x) => x.id === wunsch)
    if (tag) {
      setError(null)
      setDraft({
        id: tag.id,
        kind: tag.kind,
        name: tag.name,
        short: tag.short,
        color: tag.color,
        symbol: tag.symbol,
        note: tag.note ?? '',
      })
    }
    const rest = new URLSearchParams(params)
    rest.delete('bearbeiten')
    setParams(rest, { replace: true })
  }, [params, tags, setParams])

  useEffect(() => {
    let alive = true
    setCountsError(null)
    void listTagStats(project.id)
      .then((stats) => {
        if (!alive) return
        const m = new Map<string, number>()
        for (const [id, s] of stats) m.set(id, s.total)
        setCounts(m)
      })
      .catch((err: unknown) => {
        if (!alive) return
        // Zaehlen ist nur Anzeige, die Liste laeuft ohne weiter. Trotzdem
        // steht der Fehler auf dem Bildschirm und nicht nur in der Konsole.
        setCountsError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      alive = false
    }
  }, [project.id, tags, countsNonce])

  function openNew(kind: TagKind) {
    const used = tags.length
    setError(null)
    setDraft(EMPTY(kind, TAG_COLORS[used % TAG_COLORS.length]))
  }

  function openEdit(tag: Tag) {
    setError(null)
    setDraft({
      id: tag.id,
      kind: tag.kind,
      name: tag.name,
      short: tag.short,
      color: tag.color,
      symbol: tag.symbol,
      note: tag.note ?? '',
    })
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    setError(null)
    if (!draft.name.trim()) {
      setError(t('bereiche.fehler_name'))
      return
    }
    const short = draft.short.trim().toUpperCase()
    if (!/^[A-Z0-9]{1,4}$/.test(short)) {
      setError(t('bereiche.fehler_kuerzel'))
      return
    }
    const clash = tags.find((x) => x.short.toUpperCase() === short && x.id !== draft.id)
    if (clash) {
      setError(t('bereiche.fehler_kuerzel_belegt', { kuerzel: short, name: clash.name }))
      return
    }
    setBusy(true)
    try {
      if (draft.id) {
        await updateTag(draft.id, {
          name: draft.name.trim(),
          short,
          color: draft.color,
          symbol: draft.symbol,
          note: draft.note.trim() || null,
        })
        toast(t('bereiche.gespeichert'), 'ok')
      } else {
        await createTag({
          project_id: project.id,
          kind: draft.kind,
          name: draft.name.trim(),
          short,
          color: draft.color,
          symbol: draft.symbol,
          note: draft.note.trim() || null,
        })
        toast(t('bereiche.angelegt'), 'ok')
      }
      await reloadTags()
      setDraft(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const deleteCount = toDelete ? counts.get(toDelete.id) : undefined

  const section = (kind: TagKind, list: Tag[]) => (
    <>
      <SectionTitle
        action={
          canEdit ? (
            <Button size="sm" variant="soft" onClick={() => openNew(kind)}>
              <Plus size={16} /> {kind === 'room' ? t('begriff.zimmer') : t('begriff.person')}
            </Button>
          ) : null
        }
      >
        {kind === 'room' ? t('bereiche.zimmer_titel') : t('begriff.personen')}
      </SectionTitle>
      {list.length === 0 ? (
        <div className="mb-6">
          <Empty
            icon={kind === 'room' ? <DoorOpen size={26} /> : <User size={26} />}
            title={
              kind === 'room' ? t('bereiche.leer_zimmer_titel') : t('bereiche.leer_person_titel')
            }
            hint={
              kind === 'room'
                ? t('bereiche.leer_zimmer_hinweis')
                : t('bereiche.leer_person_hinweis')
            }
            action={
              canEdit ? (
                <Button onClick={() => openNew(kind)}>
                  <Plus size={16} /> {t('aktion.anlegen')}
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <Card className="zebra mb-6 divide-y divide-line overflow-hidden">
          {list.map((tag) => (
            <TagRow
              key={tag.id}
              tag={tag}
              to={`/app/p/${project.id}/${tag.kind === 'room' ? 'zimmer' : 'person'}/${tag.id}`}
              count={counts.get(tag.id)}
              countsFailed={Boolean(countsError)}
              canEdit={canEdit}
              onEdit={() => openEdit(tag)}
              onDelete={() => setToDelete(tag)}
            />
          ))}
        </Card>
      )}
    </>
  )

  return (
    <>
      <AppHeader
        title={t('begriff.bereiche')}
        subtitle={t('bereiche.untertitel')}
        back={`/app/p/${project.id}`}
      />
      <Page>
        <Card className="t-sub mb-6 p-4">{t('bereiche.erklaerung')}</Card>

        {countsError ? (
          <div className="mb-6">
            <ErrorBox
              error={t('bereiche.anzahl_fehler', { grund: countsError })}
              onRetry={retryCounts}
            />
          </div>
        ) : null}

        {section('room', rooms)}
        {section('person', people)}

        <div className="h-6" />
      </Page>

      <Modal
        open={Boolean(draft)}
        onClose={() => setDraft(null)}
        title={
          draft?.id
            ? t('bereiche.dialog_bearbeiten')
            : draft?.kind === 'room'
              ? t('bereiche.dialog_neues_zimmer')
              : t('bereiche.dialog_neue_person')
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              {t('aktion.abbrechen')}
            </Button>
            <Button form="tag-form" type="submit" loading={busy}>
              {t('aktion.speichern')}
            </Button>
          </>
        }
      >
        {draft ? (
          <form id="tag-form" onSubmit={save} className="space-y-5">
            <Field label={t('begriff.name')} required>
              <Input
                autoFocus
                required
                value={draft.name}
                onChange={(e) => {
                  const name = e.target.value
                  setDraft((d) =>
                    d
                      ? {
                          ...d,
                          name,
                          short:
                            d.id || d.short
                              ? d.short
                              : suggestShort(
                                  name,
                                  tags.map((x) => x.short),
                                ),
                        }
                      : d,
                  )
                }}
                placeholder={
                  draft.kind === 'room'
                    ? t('bereiche.name_platzhalter_zimmer')
                    : t('bereiche.name_platzhalter_person')
                }
                className="text-lg font-bold"
              />
            </Field>

            <Field label={t('begriff.kuerzel')} required hint={t('bereiche.kuerzel_hinweis')}>
              {/* Das Kuerzel ist immer lateinisch und gehoert zur Nummer,
                  darum bleibt das Feld von links nach rechts. */}
              <Input
                dir="ltr"
                required
                maxLength={4}
                value={draft.short}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, short: e.target.value.toUpperCase() } : d))
                }
                placeholder={t('bereiche.kuerzel_platzhalter')}
                className="w-32 font-mono text-2xl font-black uppercase"
              />
            </Field>

            <Field label={t('marken.symbol')} hint={t('begriff.optional')}>
              <div className="flex flex-wrap gap-2">
                {MARK_SYMBOLE.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() =>
                      setDraft((d) => (d ? { ...d, symbol: d.symbol === sym ? null : sym } : d))
                    }
                    aria-label={t(`marken.symbol_${sym}`)}
                    title={t(`marken.symbol_${sym}`)}
                    aria-pressed={draft.symbol === sym}
                    className={cx(
                      'flex h-11 w-11 items-center justify-center rounded-xl border-2 transition active:scale-95',
                      draft.symbol === sym
                        ? 'border-ink bg-ink text-paper'
                        : 'border-line bg-surface text-ink hover:border-ink/35 hover:bg-raised',
                    )}
                  >
                    <MarkIcon symbol={sym} size={20} />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDraft((d) => (d ? { ...d, symbol: null } : d))}
                  aria-pressed={draft.symbol === null}
                  className={cx(
                    'flex h-11 items-center rounded-xl border-2 px-3 text-[0.9375rem] font-bold transition active:scale-95',
                    draft.symbol === null
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line bg-surface text-ink',
                  )}
                >
                  {t('marken.ohne_symbol')}
                </button>
              </div>
            </Field>

            <Field label={t('begriff.farbe')} hint={t('bereiche.farbe_hinweis')}>
              <ColorGrid
                value={draft.color}
                onChange={(color) => setDraft((d) => (d ? { ...d, color } : d))}
              />
            </Field>

            <div className="rounded-2xl border-2 border-line bg-raised px-3 py-4 text-center">
              <p className="text-sm font-black uppercase tracking-wide text-muted">
                {t('bereiche.vorschau')}
              </p>
              <div className="mt-2 flex justify-center">
                <CodeChip
                  code={`${(draft.short || t('bereiche.kuerzel_platzhalter')).toUpperCase()}-3-001`}
                  size="xl"
                />
              </div>
            </div>

            <Field label={t('begriff.notiz')} hint={t('bereiche.notiz_hinweis')}>
              <Textarea
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft((d) => (d ? { ...d, note: e.target.value } : d))}
              />
            </Field>

            {error ? (
              <p className="rounded-xl border-2 border-danger/30 bg-danger/5 px-3 py-2.5 text-base font-bold text-danger">
                {error}
              </p>
            ) : null}
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('bereiche.loeschen_titel', { name: toDelete?.name ?? '' })}
        body={
          deleteCount === undefined
            ? t('bereiche.loeschen_unbekannt')
            : deleteCount > 0
              ? t('bereiche.loeschen_mit_kisten', {
                  kisten: tn('begriff.kisten_anzahl', deleteCount),
                })
              : t('bereiche.loeschen_leer')
        }
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return
          try {
            await deleteTag(toDelete.id)
            await reloadTags()
            toast(t('bereiche.geloescht'), 'ok')
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </>
  )
}
