import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2, User, DoorOpen } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import {
  Button,
  Card,
  ConfirmDialog,
  Empty,
  Field,
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
          className="h-8 w-8 rounded-lg border-2 transition"
          style={{
            background: c,
            borderColor: value.toUpperCase() === c ? 'var(--ink)' : 'transparent',
          }}
        />
      ))}
      <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-line">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-6 w-6 cursor-pointer"
          aria-label="Eigene Farbe"
        />
      </label>
    </div>
  )
}

function TagRow({
  tag,
  count,
  onEdit,
  onDelete,
  canEdit,
}: {
  tag: Tag
  count: number | undefined
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black"
        style={{ background: tag.color, color: contrastOn(tag.color) }}
      >
        {tag.short}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{tag.name}</p>
        <p className="truncate text-xs text-muted">
          {count === undefined ? 'zaehlt' : `${count} Kisten`}
          {tag.note ? ` . ${tag.note}` : ''}
        </p>
      </div>
      {canEdit ? (
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            aria-label={`${tag.name} bearbeiten`}
            className="rounded-lg p-2 text-muted hover:bg-raised hover:text-ink"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onDelete}
            aria-label={`${tag.name} loeschen`}
            className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : null}
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
  const [toDelete, setToDelete] = useState<Tag | null>(null)
  const [deleteCount, setDeleteCount] = useState(0)

  useEffect(() => {
    let alive = true
    void listTagStats(project.id)
      .then((stats) => {
        if (!alive) return
        const m = new Map<string, number>()
        for (const [id, s] of stats) m.set(id, s.total)
        setCounts(m)
      })
      .catch((err) => {
        // Zaehlen ist nur Anzeige. Scheitert es, bleibt das Feld leer und
        // die Liste funktioniert trotzdem, aber es steht in der Konsole.
        console.warn('[bereiche] Zaehlwerte nicht geladen:', err)
      })
    return () => {
      alive = false
    }
  }, [project.id, tags])

  function openNew(kind: TagKind) {
    const used = tags.length
    setError(null)
    setDraft(EMPTY(kind, TAG_COLORS[used % TAG_COLORS.length]))
  }

  function openEdit(t: Tag) {
    setError(null)
    setDraft({ id: t.id, kind: t.kind, name: t.name, short: t.short, color: t.color, note: t.note ?? '' })
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

  async function askDelete(t: Tag) {
    setToDelete(t)
    setDeleteCount(counts.get(t.id) ?? 0)
  }

  const section = (kind: TagKind, list: Tag[]) => (
    <>
      <SectionTitle
        action={
          canEdit ? (
            <Button size="sm" variant="soft" onClick={() => openNew(kind)}>
              <Plus size={14} /> {kind === 'room' ? 'Zimmer' : 'Person'}
            </Button>
          ) : null
        }
      >
        {kind === 'room' ? 'Zimmer und Bereiche' : 'Personen'}
      </SectionTitle>
      {list.length === 0 ? (
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
      ) : (
        <Card className="zebra mb-6 divide-y divide-line overflow-hidden">
          {list.map((t) => (
            <TagRow
              key={t.id}
              tag={t}
              count={counts.get(t.id)}
              canEdit={canEdit}
              onEdit={() => openEdit(t)}
              onDelete={() => void askDelete(t)}
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
        <Card className="mb-6 p-4 text-sm text-muted">
          Das Kuerzel steht vorne auf jeder Nummer. Wohnzimmer mit dem Kuerzel W
          ergibt Kisten wie W-3-001. Jedes Kuerzel darf es in diesem Umzug nur einmal
          geben, egal ob Zimmer oder Person.
        </Card>

        {section('room', rooms)}
        {section('person', people)}
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
          <form id="tag-form" onSubmit={save} className="space-y-4">
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
                className="w-28 font-mono text-lg font-bold uppercase tracking-widest"
              />
            </Field>

            <Field label="Farbe" hint="Wird auf dem Etikett als Balken gedruckt.">
              <ColorGrid
                value={draft.color}
                onChange={(color) => setDraft((d) => (d ? { ...d, color } : d))}
              />
            </Field>

            <Field label="Notiz" hint="Optional, zum Beispiel wohin es in der neuen Wohnung soll.">
              <Textarea
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft((d) => (d ? { ...d, note: e.target.value } : d))}
              />
            </Field>

            <div className="rounded-xl bg-raised p-3 text-sm">
              Vorschau:{' '}
              <span className="font-mono font-bold">
                {(draft.short || '??').toUpperCase()}
                <span className="opacity-40">-</span>
                <span className="text-danger">3</span>
                <span className="opacity-40">-</span>001
              </span>
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}
          </form>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={`${toDelete?.name ?? ''} loeschen`}
        body={
          deleteCount > 0
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
