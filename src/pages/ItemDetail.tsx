import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Camera,
  Check,
  Copy,
  ImagePlus,
  Pencil,
  Plus,
  Printer,
  Trash2,
  X,
} from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Input,
  Loading,
  Modal,
  QrCode,
  Select,
  SectionTitle,
  Switch,
  Textarea,
  useToast,
} from '../components/ui'
import { SizePicker } from './Items'
import { useProject } from './ProjectLayout'
import {
  addContent,
  addPhotoRecord,
  deleteContent,
  deleteItem,
  deletePhoto,
  getItem,
  listContents,
  listItemEvents,
  listPhotos,
  updateContent,
  updateItem,
} from '../lib/api'
import { compressImage, signedUrls, uploadTo } from '../lib/media'
import {
  KIND_LABEL,
  SIZE_LABEL,
  STATUS_LABEL,
  type Item,
  type ItemContent,
  type ItemKind,
  type ItemPhoto,
  type ItemStatus,
  type TagKind,
} from '../lib/types'
import { contrastOn, fmtDateTime, relTime, uid, useAsync } from '../lib/util'
import { displayNameOf } from '../lib/auth'

function labelUrl(itemId: string): string {
  return `${location.origin}/s/${itemId}`
}

export default function ItemDetail() {
  const { iid = '' } = useParams()
  const { project, rooms, people, tagById, canEdit, members } = useProject()
  const toast = useToast()
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [contents, setContents] = useState<ItemContent[]>([])
  const [photos, setPhotos] = useState<ItemPhoto[]>([])
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [newEntry, setNewEntry] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

  const events = useAsync(() => listItemEvents(iid, 25), [iid])

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [i, c, p] = await Promise.all([getItem(iid), listContents(iid), listPhotos(iid)])
      setItem(i)
      setContents(c)
      setPhotos(p)
      if (p.length) setUrls(await signedUrls('item-photos', p.map((x) => x.path)))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [iid])

  useEffect(() => {
    void reload()
  }, [reload])

  async function patch(p: Partial<Item>) {
    if (!item) return
    const before = item
    setItem({ ...item, ...p })
    try {
      const next = await updateItem(item.id, p)
      setItem(next)
      events.reload()
    } catch (err) {
      setItem(before)
      toast(err instanceof Error ? err.message : String(err), 'error')
    }
  }

  async function onAddEntry() {
    const text = newEntry.trim()
    if (!text || !item) return
    setNewEntry('')
    try {
      const row = await addContent(project.id, item.id, text)
      setContents((c) => [...c, row])
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
      setNewEntry(text)
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || !item) return
    setUploading(true)
    let ok = 0
    const failed: string[] = []
    for (const file of Array.from(files)) {
      try {
        const blob = await compressImage(file)
        const path = `${project.id}/${item.id}/${uid()}.jpg`
        await uploadTo('item-photos', path, blob, 'image/jpeg')
        const row = await addPhotoRecord(project.id, item.id, path)
        setPhotos((p) => [...p, row])
        const u = await signedUrls('item-photos', [path])
        setUrls((m) => new Map([...m, ...u]))
        ok++
      } catch (err) {
        failed.push(`${file.name}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }
    setUploading(false)
    if (ok) toast(`${ok} Foto${ok > 1 ? 's' : ''} hinzugefuegt`, 'ok')
    // Fehlgeschlagene Uploads werden gemeldet, nicht verschwiegen.
    if (failed.length) toast(`Nicht hochgeladen: ${failed.join(' | ')}`, 'error')
  }

  if (loading) return <Loading label="Kiste wird geladen" />
  if (error || !item)
    return (
      <Page>
        <Card className="p-5">
          <p className="font-bold text-danger">Kiste nicht gefunden</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <Link to={`/app/p/${project.id}/kisten`} className="mt-4 inline-block">
            <Button variant="outline">Zur Liste</Button>
          </Link>
        </Card>
      </Page>
    )

  const room = tagById(item.room_id)
  const person = tagById(item.person_id)
  const color = room?.color ?? person?.color ?? '#94a3b8'
  const nameOf = (id: string | null) =>
    displayNameOf(members.find((m) => m.user_id === id)?.profile, 'Jemand')

  return (
    <>
      <AppHeader
        title={item.code}
        subtitle={item.title || KIND_LABEL[item.kind]}
        back={`/app/p/${project.id}/kisten`}
        actions={
          canEdit ? (
            <>
              <button
                onClick={() => setEditOpen(true)}
                aria-label="Bearbeiten"
                className="rounded-xl p-2 hover:bg-raised"
              >
                <Pencil size={19} />
              </button>
              <button
                onClick={() => setDelOpen(true)}
                aria-label="Loeschen"
                className="rounded-xl p-2 text-danger hover:bg-danger/10"
              >
                <Trash2 size={19} />
              </button>
            </>
          ) : null
        }
      />

      <Page>
        {/* Kopf */}
        <Card className="mb-4 overflow-hidden">
          <div className="h-2" style={{ background: color }} />
          <div className="flex flex-wrap items-start gap-4 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-4xl font-black tracking-tighter">
                {item.prefix}
                <span className="opacity-30">-</span>
                <span className="text-danger">{item.size}</span>
                <span className="opacity-30">-</span>
                {String(item.seq).padStart(3, '0')}
              </p>
              <p className="mt-1 text-sm text-muted">
                Groesse {item.size} von 10, {SIZE_LABEL[item.size]}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {room ? (
                  <span
                    className="rounded-lg px-2 py-1 text-xs font-bold"
                    style={{ background: room.color, color: contrastOn(room.color) }}
                  >
                    {room.short} . {room.name}
                  </span>
                ) : null}
                {person ? (
                  <span
                    className="rounded-lg px-2 py-1 text-xs font-bold"
                    style={{ background: person.color, color: contrastOn(person.color) }}
                  >
                    {person.short} . {person.name}
                  </span>
                ) : null}
                {item.fragile ? (
                  <span className="rounded-lg bg-warn/15 px-2 py-1 text-xs font-bold text-warn">
                    zerbrechlich
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <QrCode value={labelUrl(item.id)} size={112} className="rounded-lg border border-line" />
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(labelUrl(item.id))
                  toast('Link kopiert', 'ok')
                }}
                className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink"
              >
                <Copy size={12} /> Link kopieren
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="border-t border-line p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Status</p>
            <div className="flex flex-wrap gap-2">
              {(['open', 'transit', 'arrived'] as ItemStatus[]).map((s) => (
                <button
                  key={s}
                  disabled={!canEdit}
                  onClick={() => void patch({ status: s })}
                  className={`rounded-xl border px-3 py-2 text-sm font-bold transition disabled:opacity-50 ${
                    item.status === s ? 'border-ink bg-ink text-paper' : 'border-line hover:bg-raised'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {item.arrived_at ? (
              <p className="mt-2 text-xs text-muted">Angekommen: {fmtDateTime(item.arrived_at)}</p>
            ) : null}
          </div>

          {item.note || item.target_room ? (
            <div className="border-t border-line p-3 text-sm">
              {item.target_room ? (
                <p>
                  <span className="font-semibold">Ziel:</span> {item.target_room}
                </p>
              ) : null}
              {item.note ? <p className="mt-1 whitespace-pre-wrap text-muted">{item.note}</p> : null}
            </div>
          ) : null}

          <div className="flex gap-2 border-t border-line p-3">
            <Link to={`/app/p/${project.id}/etiketten?item=${item.id}`} className="flex-1">
              <Button variant="soft" full>
                <Printer size={16} /> Etikett drucken
              </Button>
            </Link>
          </div>
        </Card>

        {/* Inhalt */}
        <SectionTitle>
          Inhalt {contents.length > 0 ? `(${contents.length})` : ''}
        </SectionTitle>
        <Card className="mb-4 overflow-hidden">
          {contents.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-muted">
              Noch nichts eingetragen. Was hier steht, landet auf Wunsch mit auf dem Etikett.
            </p>
          ) : (
            <ul className="zebra divide-y divide-line">
              {contents.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                  <button
                    disabled={!canEdit}
                    onClick={() => {
                      const next = !c.checked
                      setContents((list) =>
                        list.map((x) => (x.id === c.id ? { ...x, checked: next } : x)),
                      )
                      void updateContent(c.id, { checked: next }).catch((err) => {
                        setContents((list) =>
                          list.map((x) => (x.id === c.id ? { ...x, checked: !next } : x)),
                        )
                        toast(String(err), 'error')
                      })
                    }}
                    aria-label={c.checked ? 'Haken entfernen' : 'Abhaken'}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      c.checked ? 'border-ok bg-ok text-white' : 'border-line'
                    }`}
                  >
                    {c.checked ? <Check size={13} /> : null}
                  </button>
                  <span
                    className={`min-w-0 flex-1 text-sm ${c.checked ? 'text-muted line-through' : ''}`}
                  >
                    {c.qty > 1 ? <span className="font-bold">{c.qty}x </span> : null}
                    {c.text}
                  </span>
                  {canEdit ? (
                    <button
                      onClick={() => {
                        setContents((list) => list.filter((x) => x.id !== c.id))
                        void deleteContent(c.id).catch((err) => {
                          toast(String(err), 'error')
                          void reload()
                        })
                      }}
                      aria-label="Eintrag loeschen"
                      className="rounded p-1.5 text-muted hover:text-danger"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {canEdit ? (
            <div className="flex gap-2 border-t border-line p-2">
              <Input
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void onAddEntry()
                  }
                }}
                placeholder="Was ist drin?"
              />
              <Button onClick={() => void onAddEntry()} disabled={!newEntry.trim()}>
                <Plus size={16} />
              </Button>
            </div>
          ) : null}
        </Card>

        {/* Fotos */}
        <SectionTitle
          action={
            canEdit ? (
              <Button size="sm" variant="soft" loading={uploading} onClick={() => fileRef.current?.click()}>
                <ImagePlus size={14} /> Foto
              </Button>
            ) : null
          }
        >
          Fotos {photos.length > 0 ? `(${photos.length})` : ''}
        </SectionTitle>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={(e) => {
            void onFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <Card className="mb-4 p-3">
          {photos.length === 0 ? (
            <button
              disabled={!canEdit}
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line py-8 text-sm text-muted hover:bg-raised disabled:opacity-60"
            >
              <Camera size={24} />
              Foto vom Inhalt aufnehmen
            </button>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p) => {
                const url = urls.get(p.path)
                return (
                  <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-raised">
                    {url ? (
                      <img
                        src={url}
                        alt={p.caption ?? 'Foto'}
                        loading="lazy"
                        className="h-full w-full cursor-zoom-in object-cover"
                        onClick={() => setLightbox(url)}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted">
                        laedt
                      </div>
                    )}
                    {canEdit ? (
                      <button
                        onClick={() => {
                          setPhotos((list) => list.filter((x) => x.id !== p.id))
                          void deletePhoto(p).catch((err) => {
                            toast(String(err), 'error')
                            void reload()
                          })
                        }}
                        aria-label="Foto loeschen"
                        className="absolute right-1 top-1 rounded-lg bg-black/55 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Verlauf */}
        <SectionTitle>Verlauf</SectionTitle>
        <Card className="mb-6 overflow-hidden">
          {events.loading ? (
            <Loading label="Verlauf" />
          ) : (events.data ?? []).length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-muted">Noch nichts passiert.</p>
          ) : (
            <ul className="zebra divide-y divide-line">
              {(events.data ?? []).map((ev) => {
                const d = ev.data as Record<string, string>
                return (
                  <li key={ev.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <Avatar name={nameOf(ev.user_id)} size={24} />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{nameOf(ev.user_id)}</span>{' '}
                      <span className="text-muted">
                        {ev.type === 'created'
                          ? 'hat die Kiste angelegt'
                          : ev.type === 'status'
                            ? `hat ${STATUS_LABEL[d.to as ItemStatus] ?? d.to} gesetzt`
                            : ev.type === 'scan'
                              ? 'hat gescannt'
                              : ev.type === 'code'
                                ? `hat den Code von ${d.from} auf ${d.to} geaendert`
                                : ev.type}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{relTime(ev.created_at)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      </Page>

      {/* Bearbeiten */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Kiste bearbeiten"
        wide
        footer={
          <Button onClick={() => setEditOpen(false)}>Fertig</Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-raised p-3 text-sm">
            Aenderst du Groesse oder Kuerzel, vergibt Kistly einen neuen Code. Der alte
            bleibt gespeichert, damit ein schon geklebtes Etikett weiter gefunden wird.
          </div>

          <Field label="Titel">
            <Input
              defaultValue={item.title ?? ''}
              onBlur={(e) => void patch({ title: e.target.value.trim() || null })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Zimmer">
              <Select
                value={item.room_id ?? ''}
                onChange={(e) => void patch({ room_id: e.target.value || null })}
              >
                <option value="">kein Zimmer</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.short} . {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Person">
              <Select
                value={item.person_id ?? ''}
                onChange={(e) => void patch({ person_id: e.target.value || null })}
              >
                <option value="">keine Person</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short} . {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {item.room_id && item.person_id ? (
            <Field label="Kuerzel im Code">
              <Select
                value={item.code_source}
                onChange={(e) => void patch({ code_source: e.target.value as TagKind })}
              >
                <option value="room">Zimmer ({room?.short})</option>
                <option value="person">Person ({person?.short})</option>
              </Select>
            </Field>
          ) : null}

          <Field label="Groesse">
            <SizePicker value={item.size} onChange={(size) => void patch({ size })} />
          </Field>

          <Field label="Art">
            <Select
              value={item.kind}
              onChange={(e) => void patch({ kind: e.target.value as ItemKind })}
            >
              {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Ziel in der neuen Wohnung">
            <Input
              defaultValue={item.target_room ?? ''}
              onBlur={(e) => void patch({ target_room: e.target.value.trim() || null })}
            />
          </Field>

          <Field label="Notiz">
            <Textarea
              rows={3}
              defaultValue={item.note ?? ''}
              onBlur={(e) => void patch({ note: e.target.value.trim() || null })}
            />
          </Field>

          <Switch
            checked={item.fragile}
            onChange={(fragile) => void patch({ fragile })}
            label="Zerbrechlich"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={delOpen}
        title={`${item.code} loeschen`}
        body="Die Kiste, ihr Inhalt, die Fotos und der Verlauf werden geloescht. Das laesst sich nicht rueckgaengig machen."
        onClose={() => setDelOpen(false)}
        onConfirm={async () => {
          try {
            await deleteItem(item.id)
            toast('Kiste geloescht', 'ok')
            nav(`/app/p/${project.id}/kisten`)
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />

      {lightbox ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Foto" className="max-h-full max-w-full rounded-xl object-contain" />
          <button
            className="absolute right-4 top-4 rounded-xl bg-white/15 p-2 text-white"
            aria-label="Schliessen"
          >
            <X size={20} />
          </button>
        </div>
      ) : null}
    </>
  )
}
