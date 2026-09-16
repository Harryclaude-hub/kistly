import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2, User, DoorOpen } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
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
import { TAG_COLORS, type Tag, type TagKind } from '../lib/types'
import { contrastOn, suggestShort } from '../lib/util'

interface Draft {
  id?: string
  kind: TagKind
  name: string
  short: string
  color: string
  note: string
}

const EMPTY = (kind: TagKind, color: string): Draft => ({
  kind,
  name: '',
  short: '',
  color,
  note: '',
})

function ColorGrid({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TAG_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Farbe ${c}`}
          aria-pressed={value.toUpperCase() === c}
          className="h-11 w-11 rounded-xl border-4 transition active:scale-95"
          style={{
            background: c,
            borderColor: value.toUpperCase() === c ? 'var(--ink)' : 'transparent',
          }}
        />
      ))}
      <label
        title="Eigene Farbe"
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border-2 border-line bg-raised"
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-7 w-7 cursor-pointer"
          aria-label="Eigene Farbe"
        />
      </label>
    </div>
  )
}

function TagRow({
  tag,
  count,
  countsFailed,
  onEdit,
  onDelete,
  canEdit,
}: {
  tag: Tag
  count: number | undefined
  countsFailed: boolean
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  const countText =
    count !== undefined
      ? `${count} ${count === 1 ? 'Kiste' : 'Kisten'}`
      : countsFailed
        ? 'Anzahl nicht geladen'
        : 'wird gezaehlt'
  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-3">
        {/* Das Kuerzel ist die Verbindung zur Nummer auf dem Etikett, darum
            steht es so gross wie moeglich. */}
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-mono font-black ${
            tag.short.length > 2 ? 'text-lg' : 'text-2xl'
          }`}
          style={{ background: tag.color, color: contrastOn(tag.color) }}
        >
          {tag.short}
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-name-lg break-words">{tag.name}</p>
          <p className="t-sub truncate">{countText}</p>
        </div>
        {canEdit ? (
          <div className="flex shrink-0 gap-1.5">
            <IconButton label={`${tag.name} bearbeiten`} size="sm" onClick={onEdit}>
              <Pencil size={17} />
            </IconButton>
            <IconButton label={`${tag.name} loeschen`} size="sm" tone="danger" onClick={onDelete}>
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
  const toast = useToast()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [countsError, setCountsError] = useState<string | null>(null)
  const [countsNonce, setCountsNonce] = useState(0)
  const [toDelete, setToDelete] = useState<Tag | null>(null)

  const retryCounts = useCallback(() => setCountsNonce((n) => n + 1), [])

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

  function openEdit(t: Tag) {
    setError(null)
    setDraft({
      id: t.id,
      kind: t.kind,
      name: t.name,
      short: t.short,
      color: t.color,
      note: t.note ?? '',
    })
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (!draft) return
    setError(null)
    if (!draft.name.trim()) {
      setError('Name fehlt.')
      return
    }
    const short = draft.short.trim().toUpperCase()
    if (!/^[A-Z0-9]{1,4}$/.test(short)) {
      setError('Das Kuerzel darf 1 bis 4 Buchstaben oder Ziffern haben.')
      return
    }
    const clash = tags.find((t) => t.short.toUpperCase() === short && t.id !== draft.id)
    if (clash) {
      setError(`Das Kuerzel ${short} gehoert schon zu ${clash.name}.`)
      return
    }
    setBusy(true)
    try {
      if (draft.id) {
        await updateTag(draft.id, {
          name: draft.name.trim(),
          short,
          color: draft.color,
          note: draft.note.trim() || null,
        })
        toast('Bereich gespeichert', 'ok')
      } else {
        await createTag({
          project_id: project.id,
          kind: draft.kind,
          name: draft.name.trim(),
          short,
          color: draft.color,
          note: draft.note.trim() || null,
        })
        toast('Bereich angelegt', 'ok')
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
              <Plus size={16} /> {kind === 'room' ? 'Zimmer' : 'Person'}
            </Button>
          ) : null
        }
      >
        {kind === 'room' ? 'Zimmer und Bereiche' : 'Personen'}
      </SectionTitle>
      {list.length === 0 ? (
        <div className="mb-6">
          <Empty
            icon={kind === 'room' ? <DoorOpen size={26} /> : <User size={26} />}
            title={kind === 'room' ? 'Noch kein Zimmer' : 'Noch keine Person'}
            hint={
              kind === 'room'
                ? 'Wohnzimmer, Kueche, Keller. Jedes bekommt ein Kuerzel und eine Farbe.'
                : 'Wem gehoert die Kiste? Personen bekommen genau wie Zimmer ein Kuerzel.'
            }
            action={
              canEdit ? (
                <Button onClick={() => openNew(kind)}>
                  <Plus size={16} /> Anlegen
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <Card className="zebra mb-6 divide-y divide-line overflow-hidden">
          {list.map((t) => (
            <TagRow
              key={t.id}
              tag={t}
              count={counts.get(t.id)}
              countsFailed={Boolean(countsError)}
              canEdit={canEdit}
              onEdit={() => openEdit(t)}
              onDelete={() => setToDelete(t)}
            />
          ))}
        </Card>
      )}
    </>
  )

  return (
    <>
      <AppHeader
        title="Bereiche"
        subtitle="Zimmer und Personen mit Kuerzel und Farbe"
        back={`/app/p/${project.id}`}
      />
      <Page>
        <Card className="t-sub mb-6 p-4">
          Das Kuerzel steht vorne auf jeder Nummer. Wohnzimmer mit dem Kuerzel W ergibt Kisten wie
          W-3-001. Jedes Kuerzel darf es in diesem Umzug nur einmal geben, egal ob Zimmer oder
          Person.
        </Card>

        {countsError ? (
          <div className="mb-6">
            <ErrorBox
              error={`Die Anzahl der Kisten konnte nicht geladen werden. ${countsError}`}
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
            ? 'Bereich bearbeiten'
            : draft?.kind === 'room'
              ? 'Neues Zimmer'
              : 'Neue Person'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Abbrechen
            </Button>
            <Button form="tag-form" type="submit" loading={busy}>
              Speichern
            </Button>
          </>
        }
      >
        {draft ? (
          <form id="tag-form" onSubmit={save} className="space-y-5">
            <Field label="Name" required>
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
                                  tags.map((t) => t.short),
                                ),
                        }
                      : d,
                  )
                }}
                placeholder={draft.kind === 'room' ? 'Kinderzimmer' : 'Sara'}
                className="text-lg font-bold"
              />
            </Field>

            <Field
              label="Kuerzel"
              required
              hint="1 bis 4 Zeichen. Steht vorne auf jeder Kistennummer."
            >
              <Input
                required
                maxLength={4}
                value={draft.short}
                onChange={(e) =>
                  setDraft((d) => (d ? { ...d, short: e.target.value.toUpperCase() } : d))
                }
                placeholder="KZ"
                className="w-32 font-mono text-2xl font-black uppercase"
              />
            </Field>

            <Field label="Farbe" hint="Wird auf dem Etikett als Balken gedruckt.">
              <ColorGrid
                value={draft.color}
                onChange={(color) => setDraft((d) => (d ? { ...d, color } : d))}
              />
            </Field>

            <div className="rounded-2xl border-2 border-line bg-raised px-3 py-4 text-center">
              <p className="text-sm font-black uppercase tracking-wide text-muted">
                So sieht die Nummer aus
              </p>
              <div className="mt-2 flex justify-center">
                <CodeChip code={`${(draft.short || 'KZ').toUpperCase()}-3-001`} size="xl" />
              </div>
            </div>

            <Field label="Notiz" hint="Optional, zum Beispiel wohin es in der neuen Wohnung soll.">
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
        title={`${toDelete?.name ?? ''} loeschen`}
        body={
          deleteCount === undefined
            ? 'Wie viele Kisten zu diesem Bereich gehoeren, ist gerade nicht bekannt. Die Kisten bleiben bestehen, verlieren aber die Zuordnung und behalten ihren bisherigen Code. Wirklich loeschen?'
            : deleteCount > 0
              ? `Zu diesem Bereich gehoeren ${deleteCount} Kisten. Die Kisten bleiben bestehen, verlieren aber die Zuordnung und behalten ihren bisherigen Code. Wirklich loeschen?`
              : 'Der Bereich wird entfernt. Das laesst sich nicht rueckgaengig machen.'
        }
        onClose={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return
          try {
            await deleteTag(toDelete.id)
            await reloadTags()
            toast('Bereich geloescht', 'ok')
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </>
  )
}
