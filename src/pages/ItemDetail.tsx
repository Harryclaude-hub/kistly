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
  Sparkles,
  Star,
  Trash2,
  Upload,
  MoveRight,
  Palette,
  X,
} from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { BildLesen } from '../components/BildLesen'
import { InhaltVerschieben } from '../components/InhaltVerschieben'
import { MarkIcon, MarkPicker } from '../components/Mark'
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  ErrorBox,
  Field,
  IconButton,
  Input,
  Loading,
  Modal,
  QrPanel,
  Select,
  SectionTitle,
  Switch,
  Textarea,
  useToast,
} from '../components/ui'
import { ARTEN, SizePicker } from './Items'
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
  setCoverPhoto,
  updateContent,
  updateItem,
} from '../lib/api'
import { useSprache } from '../lib/i18n'
import { markFlaeche } from '../lib/marken'
import { compressImage, signedUrls, uploadTo } from '../lib/media'
import { notifyItemStatus } from '../lib/push'
import {
  STATUS_COLOR,
  type Item,
  type ItemContent,
  type ItemKind,
  type ItemPhoto,
  type ItemStatus,
  type Tag,
  type TagKind,
} from '../lib/types'
import { appUrl, contrastOn, cx, fmtDateTime, relTime, uid, useAsync } from '../lib/util'
import { displayNameOf, useAuth } from '../lib/auth'

function labelUrl(itemId: string): string {
  return appUrl(`s/${itemId}`)
}

const STATI: ItemStatus[] = ['open', 'transit', 'arrived']

/** Ein Verlaufseintrag kann einen Status tragen, den diese Fassung noch
 *  nicht kennt. Dann steht der rohe Wert da, nie ein nackter Schluessel. */
function istStatus(wert: string): wert is ItemStatus {
  return (STATI as string[]).includes(wert)
}

/** Die Nummer ist das groesste Element der Seite, muss aber auf ein schmales
 *  Handy passen. Darum waechst die Schrift mit der Breite und schrumpft bei
 *  langen Codes, statt aus dem Bild zu laufen. Der Faktor 1.7 kommt aus der
 *  Zeichenbreite der Monospace-Schrift. */
function serialSize(chars: number): string {
  return `clamp(2.5rem, calc((100vw - 5rem) / ${Math.max(chars, 1)} * 1.7), 4.5rem)`
}

/** Zimmer und Person als grosse Kachel: Kuerzel und voller Name, beide gross
 *  genug, um sie beim Tragen einer Kiste zu lesen. */
function TagTile({ role, tag }: { role: string; tag: Tag }) {
  const fg = contrastOn(tag.color)
  const badge = fg === '#ffffff' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)'
  return (
    <div
      className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3"
      style={{ background: tag.color, color: fg }}
    >
      <span
        className="t-serial grid h-12 min-w-12 shrink-0 place-items-center rounded-xl px-2 text-xl"
        style={{ background: badge }}
      >
        {tag.short}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold uppercase tracking-wide opacity-80">{role}</span>
        <span className="t-name block break-words">{tag.name}</span>
      </span>
    </div>
  )
}

export default function ItemDetail() {
  const { iid = '' } = useParams()
  const { project, rooms, people, tagById, canEdit, members } = useProject()
  const { user } = useAuth()
  const { t, tn } = useSprache()
  const toast = useToast()
  const nav = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [contents, setContents] = useState<ItemContent[]>([])
  const [photos, setPhotos] = useState<ItemPhoto[]>([])
  /* Einen Eintrag in eine andere Kiste umhaengen, und die Zeile selbst
   * markieren. Beides sind eigene Dialoge, damit die Seite ruhig bleibt. */
  const [umhaengen, setUmhaengen] = useState<ItemContent | null>(null)
  const [markieren, setMarkieren] = useState(false)
  const [bildLesen, setBildLesen] = useState(false)
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [newEntry, setNewEntry] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  // Beim Ziehen ueber Kindelemente feuert dragleave staendig. Der Zaehler
  // sorgt dafuer, dass die Ueberlagerung nicht flackert.
  const dragDepth = useRef(0)

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
      if (p.status === 'arrived' && before.status !== 'arrived') {
        void notifyItemStatus(
          project.id,
          project.name,
          t('kisten.ist_angekommen', { code: next.code }),
        )
      }
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

  /** Ein Weg fuer alle drei Quellen: Dateiknopf, Ziehen und Ablegen,
   *  Einfuegen aus der Zwischenablage. */
  const onFiles = useCallback(
    async (list: FileList | File[] | null) => {
      if (!list || !item) return
      const all = Array.from(list)
      const images = all.filter((f) => f.type.startsWith('image/'))
      const skipped = all.length - images.length
      // Was kein Bild ist, wird gemeldet statt still verworfen.
      if (skipped > 0) {
        toast(tn('kisten.kein_bild', skipped), 'error')
      }
      if (images.length === 0) return

      setUploading(true)
      let ok = 0
      const failed: string[] = []
      for (const file of images) {
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
          failed.push(
            `${file.name || t('kisten.bild')}: ${err instanceof Error ? err.message : String(err)}`,
          )
        }
      }
      setUploading(false)
      if (ok) toast(tn('kisten.fotos_hinzugefuegt', ok), 'ok')
      // Fehlgeschlagene Uploads werden gemeldet, nicht verschwiegen.
      if (failed.length) toast(t('kisten.upload_fehler', { liste: failed.join(' | ') }), 'error')
    },
    [item, project.id, toast, t, tn],
  )

  // Der Aufhaenger fuer das Einfuegen liegt auf dem Dokument, damit ein Bild
  // aus der Zwischenablage ankommt, egal worauf gerade der Fokus steht.
  useEffect(() => {
    if (!canEdit) return
    const handler = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) =>
        f.type.startsWith('image/'),
      )
      if (files.length === 0) return
      e.preventDefault()
      void onFiles(files)
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [canEdit, onFiles])

  async function copyLink(id: string) {
    try {
      await navigator.clipboard.writeText(labelUrl(id))
      toast(t('kisten.link_kopiert'), 'ok')
    } catch (err) {
      toast(
        t('kisten.kopieren_fehler', {
          grund: err instanceof Error ? err.message : String(err),
        }),
        'error',
      )
    }
  }

  if (loading) return <Loading label={t('kisten.kiste_laedt')} />

  if (error || !item)
    return (
      <Page>
        <ErrorBox error={error ?? t('kisten.nicht_gefunden')} onRetry={() => void reload()} />
        <Link to={`/app/p/${project.id}/kisten`} className="mt-4 inline-block">
          <Button variant="outline">{t('kisten.zur_liste')}</Button>
        </Link>
        <div className="h-6" />
      </Page>
    )

  const room = tagById(item.room_id)
  const person = tagById(item.person_id)
  const color = room?.color ?? person?.color ?? '#94a3b8'
  const seq = String(item.seq).padStart(3, '0')
  const serial = `${item.prefix}-${item.size}-${seq}`
  const nameOf = (id: string | null) =>
    displayNameOf(members.find((m) => m.user_id === id)?.profile, t('kisten.jemand'))
  const printHref = `/app/p/${project.id}/etiketten?item=${item.id}`
  // Eine signierte Adresse kann fehlen, ohne dass ein Fehler geworfen wird.
  // Ohne diese Zaehlung bliebe die Kachel stumm auf "laedt" stehen.
  const missingPhotos = uploading ? 0 : photos.filter((p) => !urls.get(p.path)).length

  return (
    <>
      <AppHeader
        title={item.code}
        subtitle={item.title || t(`art.${item.kind}`)}
        back={`/app/p/${project.id}/kisten`}
        actions={
          canEdit ? (
            <>
              <IconButton label={t('marken.markieren')} size="sm" onClick={() => setMarkieren(true)}>
                <Palette size={19} />
              </IconButton>
              <IconButton label={t('kisten.bearbeiten')} size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={19} />
              </IconButton>
              <IconButton
                label={t('kisten.loeschen')}
                tone="danger"
                size="sm"
                onClick={() => setDelOpen(true)}
              >
                <Trash2 size={19} />
              </IconButton>
            </>
          ) : null
        }
      />

      <Page>
        {/* Kopf: Nummer, Titel, Zimmer und Person, QR-Code */}
        <Card
          className="mb-5 overflow-hidden"
          style={{ backgroundColor: markFlaeche(item.mark_color) }}
        >
          <div className="h-2.5" style={{ background: item.mark_color ?? color }} />
          {item.mark_symbol ? (
            <p className="flex items-center gap-2 border-b border-line px-4 py-2 text-[0.9375rem] font-bold">
              <MarkIcon symbol={item.mark_symbol} size={17} />
              {t(`marken.symbol_${item.mark_symbol}`)}
            </p>
          ) : null}

          <div className="grid gap-5 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-7 sm:p-5">
            <div className="min-w-0">
              <p className="t-serial leading-none" style={{ fontSize: serialSize(serial.length) }}>
                {item.prefix}
                <span className="opacity-25">-</span>
                <span className="text-danger">{item.size}</span>
                <span className="opacity-25">-</span>
                {seq}
              </p>

              <p className="t-name-lg mt-3 break-words">{item.title || t(`art.${item.kind}`)}</p>
              <p className="t-sub mt-1">
                {t('kisten.art_und_groesse', {
                  art: t(`art.${item.kind}`),
                  n: item.size,
                  wort: t(`groesse.${item.size}`),
                })}
              </p>

              <div className="mt-4 grid gap-2">
                {room ? <TagTile role={t('begriff.zimmer')} tag={room} /> : null}
                {person ? <TagTile role={t('begriff.person')} tag={person} /> : null}
                {!room && !person ? (
                  <div className="rounded-2xl border border-dashed border-line px-3 py-3">
                    <p className="t-name">{t('kisten.ohne_zuordnung')}</p>
                    <p className="t-sub">{t('kisten.ohne_zuordnung_hinweis')}</p>
                  </div>
                ) : null}
                {item.fragile ? (
                  <div className="t-name rounded-2xl bg-warn/15 px-3 py-3 text-warn">
                    {t('kisten.zerbrechlich_warnung')}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 sm:w-56">
              <QrPanel value={labelUrl(item.id)} code={item.code} size={168} />
              <div className="grid w-full gap-2">
                <Button variant="soft" full onClick={() => void copyLink(item.id)}>
                  <Copy size={18} /> {t('kisten.link_kopieren')}
                </Button>
                <Link to={printHref} className="block">
                  <Button full>
                    <Printer size={18} /> {t('kisten.druckansicht')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="border-t border-line p-4">
            <p className="mb-2.5 text-sm font-black uppercase tracking-wider text-muted">
              {t('begriff.status')}
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {STATI.map((s) => (
                <Button
                  key={s}
                  full
                  disabled={!canEdit}
                  variant={item.status === s ? 'primary' : 'soft'}
                  onClick={() => void patch({ status: s })}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: STATUS_COLOR[s] }}
                  />
                  <span className="truncate">{t(`status.${s}`)}</span>
                </Button>
              ))}
            </div>
            {item.arrived_at ? (
              <p className="t-sub mt-2.5">
                {t('kisten.angekommen_am', { wann: fmtDateTime(item.arrived_at) })}
              </p>
            ) : null}
          </div>

          {item.note || item.target_room ? (
            <div className="border-t border-line p-4">
              {item.target_room ? (
                <p className="break-words text-base">
                  <span className="font-bold">{t('begriff.ziel')}: </span>
                  {item.target_room}
                </p>
              ) : null}
              {item.note ? (
                <p className="mt-1.5 whitespace-pre-wrap break-words text-base text-muted">
                  {item.note}
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>

        {/* Inhalt */}
        <SectionTitle
          action={
            canEdit && photos.some((p) => p.art === 'foto') ? (
              <Button size="sm" variant="outline" onClick={() => setBildLesen(true)}>
                <Sparkles size={16} />
                {t('bildki.knopf_kurz')}
              </Button>
            ) : null
          }
        >
          {t('begriff.inhalt')}
          {contents.length > 0 ? ` (${contents.length})` : ''}
        </SectionTitle>
        <Card className="mb-5 overflow-hidden">
          {contents.length === 0 ? (
            <p className="px-4 py-6 text-center text-base text-muted">{t('kisten.inhalt_leer')}</p>
          ) : (
            <ul className="zebra divide-y divide-line">
              {contents.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      const next = !c.checked
                      setContents((list) =>
                        list.map((x) => (x.id === c.id ? { ...x, checked: next } : x)),
                      )
                      void updateContent(c.id, { checked: next }).catch((err: unknown) => {
                        setContents((list) =>
                          list.map((x) => (x.id === c.id ? { ...x, checked: !next } : x)),
                        )
                        toast(err instanceof Error ? err.message : String(err), 'error')
                      })
                    }}
                    aria-label={c.checked ? t('kisten.haken_entfernen') : t('kisten.abhaken')}
                    title={c.checked ? t('kisten.haken_entfernen') : t('kisten.abhaken')}
                    className={cx(
                      'grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 transition active:scale-95',
                      'disabled:cursor-not-allowed disabled:opacity-45',
                      c.checked ? 'border-ok bg-ok text-white' : 'border-line bg-surface',
                    )}
                  >
                    {c.checked ? <Check size={20} strokeWidth={3} /> : null}
                  </button>

                  <span
                    className={cx(
                      'min-w-0 flex-1 break-words text-lg font-semibold',
                      c.checked && 'text-muted line-through',
                    )}
                  >
                    {c.qty > 1 ? <span className="t-serial">{c.qty}x </span> : null}
                    {c.text}
                  </span>

                  {canEdit ? (
                    <IconButton
                      label={t('inhalt.verschieben')}
                      size="sm"
                      onClick={() => setUmhaengen(c)}
                    >
                      <MoveRight size={16} className="spiegeln" />
                    </IconButton>
                  ) : null}

                  {canEdit ? (
                    <IconButton
                      label={t('kisten.eintrag_loeschen')}
                      tone="danger"
                      size="sm"
                      onClick={() => {
                        setContents((list) => list.filter((x) => x.id !== c.id))
                        void deleteContent(c.id).catch((err: unknown) => {
                          toast(err instanceof Error ? err.message : String(err), 'error')
                          void reload()
                        })
                      }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {canEdit ? (
            <div className="flex gap-2 border-t border-line p-3">
              <Input
                className="min-w-0"
                value={newEntry}
                onChange={(e) => setNewEntry(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void onAddEntry()
                  }
                }}
                placeholder={t('kisten.inhalt_platzhalter')}
              />
              <IconButton
                label={t('kisten.eintrag_hinzufuegen')}
                disabled={!newEntry.trim()}
                onClick={() => void onAddEntry()}
              >
                <Plus size={20} />
              </IconButton>
            </div>
          ) : null}
        </Card>

        {/* Fotos */}
        <SectionTitle
          action={
            canEdit ? (
              <Button
                size="sm"
                variant="soft"
                loading={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus size={16} /> {t('kisten.foto')}
              </Button>
            ) : null
          }
        >
          {t('begriff.fotos')}
          {photos.length > 0 ? ` (${photos.length})` : ''}
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

        <Card
          className="relative mb-5 p-3"
          onDragEnter={(e) => {
            if (!canEdit) return
            e.preventDefault()
            dragDepth.current += 1
            setDragOver(true)
          }}
          onDragOver={(e) => {
            if (!canEdit) return
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
          }}
          onDragLeave={() => {
            if (!canEdit) return
            dragDepth.current = Math.max(0, dragDepth.current - 1)
            if (dragDepth.current === 0) setDragOver(false)
          }}
          onDrop={(e) => {
            if (!canEdit) return
            e.preventDefault()
            dragDepth.current = 0
            setDragOver(false)
            void onFiles(e.dataTransfer.files)
          }}
        >
          {dragOver ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl border-4 border-dashed border-ink bg-paper/92">
              <Upload size={34} />
              <span className="t-name">{t('kisten.hier_ablegen')}</span>
            </div>
          ) : null}

          {photos.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line px-4 py-8 text-center">
              <Camera size={28} className="text-muted" />
              <p className="t-name">{t('kisten.fotos_leer')}</p>
              <p className="t-sub max-w-xs">{t('kisten.fotos_hinweis')}</p>
              {canEdit ? (
                <Button variant="soft" loading={uploading} onClick={() => fileRef.current?.click()}>
                  <ImagePlus size={18} /> {t('kisten.foto_aufnehmen')}
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              {missingPhotos > 0 ? (
                <div className="mb-2">
                  <ErrorBox
                    error={tn('kisten.fotos_fehlen', missingPhotos)}
                    onRetry={() => void reload()}
                  />
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {photos.map((p) => {
                  const url = urls.get(p.path)
                  return (
                    <div
                      key={p.id}
                      className="relative aspect-square overflow-hidden rounded-xl bg-raised"
                    >
                      {url ? (
                        <img
                          src={url}
                          alt={p.caption ?? t('kisten.foto_alt')}
                          loading="lazy"
                          className="h-full w-full cursor-zoom-in object-cover"
                          onClick={() => setLightbox(url)}
                        />
                      ) : uploading ? (
                        <div className="flex h-full items-center justify-center text-sm text-muted">
                          {t('zustand.laedt')}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center px-2 text-center text-sm font-bold text-danger">
                          {t('kisten.bild_fehlt')}
                        </div>
                      )}
                      {/* Das Deckbild ist das, was beim Scannen sofort
                          erscheint. Darum steht der Knopf direkt am Bild
                          und zeigt an, welches gerade gilt. */}
                      {canEdit ? (
                        <button
                          type="button"
                          aria-pressed={item.cover_photo_id === p.id}
                          aria-label={
                            item.cover_photo_id === p.id
                              ? t('schnell.deckbild')
                              : t('kisten.zum_deckbild')
                          }
                          title={
                            item.cover_photo_id === p.id
                              ? t('schnell.deckbild')
                              : t('kisten.zum_deckbild')
                          }
                          onClick={() => {
                            const ziel = item.cover_photo_id === p.id ? null : p.id
                            void setCoverPhoto(item.id, ziel)
                              .then((neu) => {
                                setItem(neu)
                                toast(
                                  ziel ? t('schnell.deckbild_gesetzt') : t('kisten.deckbild_ab'),
                                  'ok',
                                )
                              })
                              .catch((err: unknown) =>
                                toast(err instanceof Error ? err.message : String(err), 'error'),
                              )
                          }}
                          className={cx(
                            'absolute start-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-xl transition active:scale-95',
                            item.cover_photo_id === p.id
                              ? 'bg-ink text-paper'
                              : 'bg-black/60 text-white',
                          )}
                        >
                          <Star
                            size={17}
                            fill={item.cover_photo_id === p.id ? 'currentColor' : 'none'}
                          />
                        </button>
                      ) : null}
                      {canEdit ? (
                        // Immer sichtbar, denn auf dem Handy gibt es kein Ueberfahren
                        // mit der Maus und der Knopf waere sonst nicht erreichbar. Die
                        // dunkle Platte dahinter haelt ihn auf jedem Foto lesbar.
                        <span className="absolute end-1.5 top-1.5 rounded-xl bg-black/60 p-0.5">
                          <IconButton
                            label={t('kisten.foto_loeschen')}
                            tone="danger"
                            size="sm"
                            onClick={() => {
                              setPhotos((list) => list.filter((x) => x.id !== p.id))
                              void deletePhoto(p).catch((err: unknown) => {
                                toast(err instanceof Error ? err.message : String(err), 'error')
                                void reload()
                              })
                            }}
                          >
                            <Trash2 size={17} />
                          </IconButton>
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </Card>

        {/* Verlauf */}
        <SectionTitle>{t('begriff.verlauf')}</SectionTitle>
        <Card className="overflow-hidden">
          {events.loading ? (
            <Loading label={t('kisten.verlauf_laedt')} />
          ) : events.error ? (
            <div className="p-3">
              <ErrorBox error={events.error} onRetry={events.reload} />
            </div>
          ) : (events.data ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-base text-muted">{t('kisten.verlauf_leer')}</p>
          ) : (
            <ul className="zebra divide-y divide-line">
              {(events.data ?? []).map((ev) => {
                const d = ev.data as Record<string, string>
                return (
                  <li key={ev.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar name={nameOf(ev.user_id)} size={34} />
                    <span className="min-w-0 flex-1 break-words text-base">
                      <span className="font-bold">{nameOf(ev.user_id)}</span>{' '}
                      <span className="text-muted">
                        {ev.type === 'created' ? (
                          t('kisten.ev_created')
                        ) : ev.type === 'status' ? (
                          t('kisten.ev_status', {
                            status: istStatus(d.to) ? t(`status.${d.to}`) : d.to,
                          })
                        ) : ev.type === 'scan' ? (
                          t('kisten.ev_scan')
                        ) : ev.type === 'code' ? (
                          <>
                            {t('kisten.ev_code')}{' '}
                            {/* Beide Nummern in einem Stueck von links nach rechts,
                                damit der Pfeil auch im arabischen Satz vom alten
                                auf den neuen Code zeigt. */}
                            <span className="t-serial" dir="ltr">
                              {d.from} &rarr; {d.to}
                            </span>
                          </>
                        ) : (
                          ev.type
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm text-muted">{relTime(ev.created_at)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Luft fuer die untere Navigationsleiste */}
        <div className="h-6" />
      </Page>

      {/* Bearbeiten */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('kisten.bearbeiten')}
        wide
        footer={<Button onClick={() => setEditOpen(false)}>{t('aktion.fertig')}</Button>}
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-raised p-3 text-base">{t('kisten.code_hinweis')}</div>

          <Field label={t('begriff.titel')}>
            <Input
              defaultValue={item.title ?? ''}
              onBlur={(e) => void patch({ title: e.target.value.trim() || null })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('begriff.zimmer')}>
              <Select
                value={item.room_id ?? ''}
                onChange={(e) => void patch({ room_id: e.target.value || null })}
              >
                <option value="">{t('kisten.kein_zimmer')}</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.short} . {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('begriff.person')}>
              <Select
                value={item.person_id ?? ''}
                onChange={(e) => void patch({ person_id: e.target.value || null })}
              >
                <option value="">{t('kisten.keine_person')}</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.short} . {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {item.room_id && item.person_id ? (
            <Field label={t('kisten.kuerzel_im_code')}>
              <Select
                value={item.code_source}
                onChange={(e) => void patch({ code_source: e.target.value as TagKind })}
              >
                <option value="room">
                  {t('kisten.kuerzel_option_zimmer', { kuerzel: room?.short ?? '' })}
                </option>
                <option value="person">
                  {t('kisten.kuerzel_option_person', { kuerzel: person?.short ?? '' })}
                </option>
              </Select>
            </Field>
          ) : null}

          <Field label={t('begriff.groesse')}>
            <SizePicker value={item.size} onChange={(size) => void patch({ size })} />
          </Field>

          <Field label={t('kisten.art')}>
            <Select
              value={item.kind}
              onChange={(e) => void patch({ kind: e.target.value as ItemKind })}
            >
              {ARTEN.map((k) => (
                <option key={k} value={k}>
                  {t(`art.${k}`)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t('kisten.ziel')}>
            <Input
              defaultValue={item.target_room ?? ''}
              onBlur={(e) => void patch({ target_room: e.target.value.trim() || null })}
            />
          </Field>

          <Field label={t('begriff.notiz')}>
            <Textarea
              rows={3}
              defaultValue={item.note ?? ''}
              onBlur={(e) => void patch({ note: e.target.value.trim() || null })}
            />
          </Field>

          <Switch
            checked={item.fragile}
            onChange={(fragile) => void patch({ fragile })}
            label={t('begriff.zerbrechlich')}
          />
        </div>
      </Modal>

      <BildLesen
        offen={bildLesen}
        onClose={() => setBildLesen(false)}
        projectId={project.id}
        itemId={item.id}
        fotos={photos}
        art={item.kind === 'furniture' ? 'moebel' : 'kiste'}
        vorhandeneInhalte={contents}
        canEdit={canEdit}
        userId={user?.id ?? ''}
        onUebernommen={(neu) => setContents((c) => [...c, ...neu])}
      />

      <InhaltVerschieben
        offen={umhaengen !== null}
        projectId={project.id}
        quelleId={item.id}
        inhalt={umhaengen}
        onClose={() => setUmhaengen(null)}
        onFertig={(inhaltId) => setContents((list) => list.filter((x) => x.id !== inhaltId))}
      />

      <Modal
        open={markieren}
        onClose={() => setMarkieren(false)}
        title={t('marken.titel')}
        footer={
          <Button variant="ghost" onClick={() => setMarkieren(false)}>
            {t('aktion.fertig')}
          </Button>
        }
      >
        <MarkPicker
          farbe={item.mark_color}
          symbol={item.mark_symbol}
          onFarbe={(c) => void patch({ mark_color: c })}
          onSymbol={(sym) => void patch({ mark_symbol: sym })}
        />
        <p className="t-sub mt-4">{t('marken.gehoert_der_zeile')}</p>
      </Modal>

      <ConfirmDialog
        open={delOpen}
        title={t('kisten.loeschen_titel', { code: item.code })}
        body={t('kisten.loeschen_text')}
        onClose={() => setDelOpen(false)}
        onConfirm={async () => {
          try {
            await deleteItem(item.id)
            toast(t('kisten.geloescht'), 'ok')
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
          <img
            src={lightbox}
            alt={t('kisten.foto_alt')}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
          <IconButton
            label={t('aktion.schliessen')}
            className="absolute end-4 top-4"
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </IconButton>
        </div>
      ) : null}
    </>
  )
}
