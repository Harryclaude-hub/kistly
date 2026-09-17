import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Camera,
  Check,
  DoorOpen,
  FileText,
  ImagePlus,
  Pencil,
  Plus,
  MoveRight,
  Palette,
  Printer,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import { BildLesen } from '../components/BildLesen'
import { InhaltVerschieben } from '../components/InhaltVerschieben'
import { MarkIcon, MarkPicker } from '../components/Mark'
import {
  Button,
  Card,
  Chip,
  CodeChip,
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
  StatusPill,
  Switch,
  Textarea,
  useToast,
} from '../components/ui'
import { SizePicker } from './Items'
import { useProject } from './ProjectLayout'
import { useAuth } from '../lib/auth'
import {
  addContent,
  addPhotoRecord,
  deleteContent,
  deleteItem,
  deletePhoto,
  getItem,
  listContents,
  listPhotos,
  updateContent,
  updateItem,
} from '../lib/api'
import { useSprache } from '../lib/i18n'
import { markFlaeche } from '../lib/marken'
import { compressImage, signedUrls, uploadTo } from '../lib/media'
import { notifyItemStatus } from '../lib/push'
import { useWischen } from '../lib/wischen'
import type { Item, ItemContent, ItemPhoto, ItemStatus } from '../lib/types'
import { appUrl, contrastOn, cx, uid } from '../lib/util'

/* Ein einzelnes Moebelstueck im Vollbild.
 *
 * In der Datenbank ist das ein Eintrag in items mit kind = 'furniture'.
 * Nummer, Status, Zimmer, Person, Fotos und Inhaltsliste sind genau
 * dieselben Tabellen wie bei einer Kiste. Neu ist nur, wofuer sie hier
 * benutzt werden: die Inhaltsliste ist der Teilekatalog zum Nachzaehlen,
 * und die Fotos tragen eine Seitenangabe oder gelten als Anleitung.
 */

const STATI: ItemStatus[] = ['open', 'transit', 'arrived']

/** Die Seiten eines Moebelstuecks in fester Reihenfolge. Die Woerter dazu
 *  stehen im Woerterbuch unter moebel.seite_*, nicht hier. */
const SEITEN = ['vorne', 'hinten', 'links', 'rechts', 'oben', 'unten', 'innen', 'detail'] as const
type Seite = (typeof SEITEN)[number]

/** Nur bekannte Seiten werden uebersetzt. Steht dort etwas anderes,
 *  bleibt es so stehen, wie es gespeichert wurde. */
function seiteWort(t: (k: string) => string, s: string | null): string | null {
  if (!s) return null
  return (SEITEN as readonly string[]).includes(s) ? t(`moebel.seite_${s}`) : s
}

function istBild(f: File): boolean {
  return f.type.startsWith('image/')
}
function istPdf(f: File): boolean {
  return f.type === 'application/pdf'
}

export default function FurnitureDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { project, rooms, people, tagById, canEdit } = useProject()
  const { user } = useAuth()
  const { t, tn } = useSprache()
  const toast = useToast()
  useWischen()

  const [item, setItem] = useState<Item | null>(null)
  const [teile, setTeile] = useState<ItemContent[]>([])
  const [fotos, setFotos] = useState<ItemPhoto[]>([])
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [neuesTeil, setNeuesTeil] = useState('')
  const [neueMenge, setNeueMenge] = useState(1)
  const [seite, setSeite] = useState<Seite | ''>('vorne')
  const [laedtHoch, setLaedtHoch] = useState(false)
  const [ziehen, setZiehen] = useState(false)
  const [loeschen, setLoeschen] = useState(false)
  const [bearbeiten, setBearbeiten] = useState(false)
  const [markieren, setMarkieren] = useState(false)
  const [umhaengen, setUmhaengen] = useState<ItemContent | null>(null)
  const [bildLesen, setBildLesen] = useState(false)

  const fotoFeld = useRef<HTMLInputElement>(null)
  const anleitungFeld = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const [i, c, p] = await Promise.all([getItem(id), listContents(id), listPhotos(id)])
        if (!alive) return
        setItem(i)
        setTeile(c)
        setFotos(p)
        if (p.length) setUrls(await signedUrls('item-photos', p.map((x) => x.path)))
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  /** Gibt zurueck, ob es wirklich geklappt hat. Wer danach Erfolg meldet,
   *  muss das hier abfragen. Sonst steht eine gruene Meldung neben einer
   *  roten und niemand weiss, was nun gilt. */
  async function aendern(p: Partial<Item>): Promise<boolean> {
    if (!item) return false
    const vorher = item
    setItem({ ...item, ...p })
    try {
      const neu = await updateItem(item.id, p)
      setItem(neu)
      if (p.status === 'arrived') {
        void notifyItemStatus(
          project.id,
          project.name,
          t('kisten.ist_angekommen', { code: neu.code }),
        )
      }
      return true
    } catch (err) {
      setItem(vorher)
      toast(err instanceof Error ? err.message : String(err), 'error')
      return false
    }
  }

  async function teilHinzufuegen(e?: FormEvent) {
    e?.preventDefault()
    const text = neuesTeil.trim()
    if (!text || !item) return
    setNeuesTeil('')
    const menge = neueMenge
    setNeueMenge(1)
    try {
      const row = await addContent(project.id, item.id, text, menge)
      setTeile((c) => [...c, row])
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
      setNeuesTeil(text)
      setNeueMenge(menge)
    }
  }

  /** Ein Weg fuer Fotos und Anleitungen, egal ob aus dem Dateiknopf,
   *  gezogen oder aus der Zwischenablage eingefuegt. Bilder werden
   *  verkleinert, PDF geht unveraendert durch. */
  const dateienNehmen = useCallback(
    async (liste: FileList | File[] | null, art: ItemPhoto['art'], seiteFuer?: string) => {
      if (!liste || !item) return
      const alle = Array.from(liste)
      // Anleitungen duerfen PDF sein, Seitenfotos nicht.
      const brauchbar = alle.filter((f) => (art === 'anleitung' ? istBild(f) || istPdf(f) : istBild(f)))
      const verworfen = alle.length - brauchbar.length
      if (verworfen > 0) {
        toast(
          art === 'anleitung'
            ? t('moebel.kein_pdf_oder_bild', { n: verworfen })
            : tn('kisten.kein_bild', verworfen),
          'error',
        )
      }
      if (brauchbar.length === 0) return

      setLaedtHoch(true)
      let gut = 0
      const fehler: string[] = []
      for (const datei of brauchbar) {
        try {
          const alsPdf = istPdf(datei)
          const koerper = alsPdf ? datei : await compressImage(datei)
          const pfad = `${project.id}/${item.id}/${uid()}.${alsPdf ? 'pdf' : 'jpg'}`
          await uploadTo('item-photos', pfad, koerper, alsPdf ? 'application/pdf' : 'image/jpeg')
          const row = await addPhotoRecord(
            project.id,
            item.id,
            pfad,
            datei.name || undefined,
            art,
            seiteFuer,
          )
          setFotos((p) => [...p, row])
          const u = await signedUrls('item-photos', [pfad])
          setUrls((m) => new Map([...m, ...u]))
          gut++
        } catch (err) {
          fehler.push(
            `${datei.name || t('kisten.bild')}: ${err instanceof Error ? err.message : String(err)}`,
          )
        }
      }
      setLaedtHoch(false)
      if (gut) {
        toast(
          art === 'anleitung'
            ? tn('moebel.anleitung_hinzugefuegt', gut)
            : tn('kisten.fotos_hinzugefuegt', gut),
          'ok',
        )
      }
      // Fehlgeschlagene Uploads werden gemeldet, nicht verschwiegen.
      if (fehler.length) toast(t('kisten.upload_fehler', { liste: fehler.join(' | ') }), 'error')
    },
    [item, project.id, toast, t, tn],
  )

  // Bild aus der Zwischenablage landet bei den Seitenfotos.
  useEffect(() => {
    if (!canEdit) return
    const handler = (e: ClipboardEvent) => {
      const dateien = Array.from(e.clipboardData?.files ?? []).filter(istBild)
      if (dateien.length === 0) return
      e.preventDefault()
      void dateienNehmen(dateien, 'foto', seite || undefined)
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [canEdit, dateienNehmen, seite])

  if (loading) return <Loading label={t('moebel.laedt')} />
  if (error || !item) {
    return (
      <>
        <AppHeader title={t('moebel.titel')} back={`/app/p/${project.id}/moebel`} />
        <Page>
          <ErrorBox error={error ?? t('moebel.nicht_gefunden')} />
          <Link to={`/app/p/${project.id}/moebel`} className="mt-4 inline-block">
            <Button variant="outline">{t('moebel.zur_liste')}</Button>
          </Link>
        </Page>
      </>
    )
  }

  const zimmer = tagById(item.room_id)
  const person = tagById(item.person_id)
  const seitenFotos = fotos.filter((f) => f.art === 'foto')
  const anleitungen = fotos.filter((f) => f.art === 'anleitung')
  const teileGesamt = teile.reduce((s, x) => s + (x.qty || 1), 0)
  const fehlendeBilder = laedtHoch ? 0 : fotos.filter((f) => !urls.get(f.path)).length
  const hatAngaben = Boolean(item.hersteller || item.modell || item.masse || item.zerlegt)

  return (
    <>
      <AppHeader
        title={item.title || t('art.furniture')}
        subtitle={item.code}
        back={`/app/p/${project.id}/moebel`}
        actions={
          canEdit ? (
            <>
              <IconButton label={t('marken.markieren')} size="sm" onClick={() => setMarkieren(true)}>
                <Palette size={17} />
              </IconButton>
              <IconButton
                label={t('aktion.bearbeiten')}
                size="sm"
                onClick={() => setBearbeiten(true)}
              >
                <Pencil size={17} />
              </IconButton>
            </>
          ) : null
        }
      />
      <Page>
        {/* Nummer und Status ganz oben, so wie bei einer Kiste. */}
        <Card className="mb-5 p-4" style={{ backgroundColor: markFlaeche(item.mark_color) }}>
          <div className="flex flex-wrap items-center gap-3">
            <CodeChip code={item.code} size="lg" />
            <StatusPill status={item.status} />
            {item.mark_symbol ? (
              <span
                className="flex h-9 items-center gap-1.5 rounded-xl border-2 px-2.5 text-[0.9375rem] font-bold"
                style={{
                  borderColor: item.mark_color ?? 'var(--line)',
                  color: item.mark_color ?? 'var(--ink)',
                }}
              >
                <MarkIcon symbol={item.mark_symbol} size={16} />
                {t(`marken.symbol_${item.mark_symbol}`)}
              </span>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {zimmer ? (
              <Link
                to={`/app/p/${project.id}/zimmer/${zimmer.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-base font-bold transition active:scale-95"
                style={{ background: zimmer.color, color: contrastOn(zimmer.color) }}
              >
                <DoorOpen size={15} />
                {zimmer.name}
              </Link>
            ) : (
              <span className="t-sub">{t('moebel.ohne_zimmer')}</span>
            )}
            {person ? (
              <Link
                to={`/app/p/${project.id}/person/${person.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-base font-bold transition active:scale-95"
                style={{ background: person.color, color: contrastOn(person.color) }}
              >
                {person.name}
              </Link>
            ) : null}
          </div>

          {canEdit ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {STATI.map((s) => (
                <Chip key={s} active={item.status === s} onClick={() => void aendern({ status: s })}>
                  {t(`status.${s}`)}
                </Chip>
              ))}
            </div>
          ) : null}

          {item.note ? (
            <p className="mt-4 border-t border-line pt-3 text-base break-words">{item.note}</p>
          ) : null}
        </Card>

        {/* Angaben zum Stueck */}
        <SectionTitle
          action={
            canEdit ? (
              <Button size="sm" variant="ghost" onClick={() => setBearbeiten(true)}>
                {t('aktion.bearbeiten')}
              </Button>
            ) : null
          }
        >
          {t('moebel.angaben')}
        </SectionTitle>
        <Card className="zebra mb-6 divide-y divide-line overflow-hidden">
          {hatAngaben ? (
            <>
              {item.hersteller ? (
                <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                  <span className="t-sub">{t('moebel.hersteller')}</span>
                  <span className="font-bold break-words">{item.hersteller}</span>
                </div>
              ) : null}
              {item.modell ? (
                <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                  <span className="t-sub">{t('moebel.modell')}</span>
                  <span className="font-bold break-words">{item.modell}</span>
                </div>
              ) : null}
              {item.masse ? (
                <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                  <span className="t-sub">{t('moebel.masse')}</span>
                  <span dir="ltr" className="t-serial font-bold">
                    {item.masse}
                  </span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 px-3 py-2.5">
                <span className="t-sub">{t('moebel.zerlegt')}</span>
                <span className="font-bold">
                  {item.zerlegt ? t('moebel.zerlegt_ja') : t('moebel.zerlegt_nein')}
                </span>
              </div>
            </>
          ) : (
            <p className="px-3 py-4 text-base text-muted">{t('moebel.keine_angaben')}</p>
          )}
        </Card>

        {/* Teilekatalog zum Nachzaehlen */}
        <SectionTitle
          action={
            canEdit && seitenFotos.length > 0 ? (
              <Button size="sm" variant="outline" onClick={() => setBildLesen(true)}>
                <Sparkles size={16} />
                {t('bildki.knopf_kurz')}
              </Button>
            ) : null
          }
        >
          {t('moebel.teile')}
        </SectionTitle>
        <p className="t-sub mb-2">{t('moebel.teile_hinweis')}</p>
        <Card className="mb-6 overflow-hidden">
          {teile.length === 0 ? (
            <p className="px-3 py-4 text-base text-muted">{t('moebel.teile_leer')}</p>
          ) : (
            <ul className="zebra divide-y divide-line">
              {teile.map((teil) => (
                <li key={teil.id} className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => {
                      const neu = !teil.checked
                      setTeile((c) => c.map((x) => (x.id === teil.id ? { ...x, checked: neu } : x)))
                      void updateContent(teil.id, { checked: neu }).catch((err: unknown) => {
                        setTeile((c) =>
                          c.map((x) => (x.id === teil.id ? { ...x, checked: !neu } : x)),
                        )
                        toast(err instanceof Error ? err.message : String(err), 'error')
                      })
                    }}
                    aria-label={t('moebel.teil_gezaehlt')}
                    aria-pressed={teil.checked}
                    className={cx(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition',
                      teil.checked ? 'border-ok bg-ok text-white' : 'border-line bg-surface',
                      !canEdit && 'opacity-60',
                    )}
                  >
                    {teil.checked ? <Check size={17} /> : null}
                  </button>
                  <span
                    className={cx('min-w-0 flex-1 break-words', teil.checked && 'text-muted line-through')}
                  >
                    {teil.text}
                  </span>
                  <span className="t-serial shrink-0 rounded-lg border border-line bg-raised px-2 py-0.5 font-bold">
                    {teil.qty}
                  </span>
                  {canEdit ? (
                    <IconButton
                      label={t('inhalt.verschieben')}
                      size="sm"
                      onClick={() => setUmhaengen(teil)}
                    >
                      <MoveRight size={16} className="spiegeln" />
                    </IconButton>
                  ) : null}
                  {canEdit ? (
                    <IconButton
                      label={t('kisten.eintrag_loeschen')}
                      size="sm"
                      tone="danger"
                      onClick={() => {
                        const merken = teile
                        setTeile((c) => c.filter((x) => x.id !== teil.id))
                        void deleteContent(teil.id).catch((err: unknown) => {
                          setTeile(merken)
                          toast(err instanceof Error ? err.message : String(err), 'error')
                        })
                      }}
                    >
                      <X size={16} />
                    </IconButton>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {canEdit ? (
            <form
              onSubmit={(e) => void teilHinzufuegen(e)}
              className="flex gap-2 border-t border-line p-3"
            >
              <Input
                value={neuesTeil}
                onChange={(e) => setNeuesTeil(e.target.value)}
                placeholder={t('moebel.teil_platzhalter')}
                className="min-w-0 flex-1"
              />
              <Input
                type="number"
                min={1}
                max={999}
                value={neueMenge}
                onChange={(e) => setNeueMenge(Math.max(1, Number(e.target.value) || 1))}
                aria-label={t('moebel.teil_menge')}
                className="w-20 shrink-0 text-center"
                dir="ltr"
              />
              <Button type="submit" className="shrink-0">
                <Plus size={18} />
              </Button>
            </form>
          ) : null}
          {teile.length > 0 ? (
            <p className="t-sub border-t border-line px-3 py-2">
              {tn('moebel.teile_gesamt', teileGesamt)}
            </p>
          ) : null}
        </Card>

        {fehlendeBilder > 0 ? (
          <div className="mb-4">
            <ErrorBox error={tn('kisten.fotos_fehlen', fehlendeBilder)} />
          </div>
        ) : null}

        {/* Fotos von jeder Seite */}
        <SectionTitle>{t('moebel.fotos_seiten')}</SectionTitle>
        <p className="t-sub mb-2">{t('moebel.fotos_hinweis')}</p>
        {canEdit ? (
          <div className="mb-3">
            <p className="t-sub mb-2">{t('moebel.seite_waehlen')}</p>
            <div className="flex flex-wrap gap-2">
              {SEITEN.map((s) => (
                <Chip key={s} active={seite === s} onClick={() => setSeite(s)}>
                  {t(`moebel.seite_${s}`)}
                </Chip>
              ))}
              <Chip active={seite === ''} onClick={() => setSeite('')}>
                {t('moebel.seite_ohne')}
              </Chip>
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setZiehen(true)
              }}
              onDragLeave={() => setZiehen(false)}
              onDrop={(e) => {
                e.preventDefault()
                setZiehen(false)
                void dateienNehmen(e.dataTransfer.files, 'foto', seite || undefined)
              }}
              className={cx(
                'mt-3 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed p-3 transition',
                ziehen ? 'border-ink bg-raised' : 'border-line',
              )}
            >
              <Button variant="outline" onClick={() => fotoFeld.current?.click()} loading={laedtHoch}>
                <Camera size={18} />
                {t('kisten.foto_aufnehmen')}
              </Button>
              <span className="t-sub">{t('kisten.hier_ablegen')}</span>
              <input
                ref={fotoFeld}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void dateienNehmen(e.target.files, 'foto', seite || undefined)
                  e.target.value = ''
                }}
              />
            </div>
          </div>
        ) : null}

        {seitenFotos.length === 0 ? (
          <Card className="mb-6 px-3 py-4">
            <p className="text-base text-muted">{t('moebel.fotos_leer')}</p>
          </Card>
        ) : (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {seitenFotos.map((f) => (
              <figure key={f.id} className="relative overflow-hidden rounded-2xl border border-line">
                {urls.get(f.path) ? (
                  <img
                    src={urls.get(f.path)}
                    alt={seiteWort(t, f.seite) ?? t('kisten.foto_alt')}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-raised">
                    <ImagePlus size={24} className="text-muted" />
                  </div>
                )}
                <figcaption className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-sm font-bold text-white">
                  {seiteWort(t, f.seite) ?? t('moebel.seite_offen')}
                </figcaption>
                {canEdit ? (
                  <button
                    type="button"
                    aria-label={t('kisten.foto_loeschen')}
                    onClick={() => {
                      setFotos((l) => l.filter((x) => x.id !== f.id))
                      void deletePhoto(f).catch((err: unknown) => {
                        setFotos((l) => [...l, f])
                        toast(err instanceof Error ? err.message : String(err), 'error')
                      })
                    }}
                    className="absolute end-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-xl bg-black/55 text-white transition active:scale-95"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </figure>
            ))}
          </div>
        )}

        {/* Aufbauanleitung */}
        <SectionTitle>{t('moebel.anleitung')}</SectionTitle>
        <p className="t-sub mb-2">{t('moebel.anleitung_hinweis')}</p>
        {canEdit ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              void dateienNehmen(e.dataTransfer.files, 'anleitung')
            }}
            className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-line p-3"
          >
            <Button variant="outline" onClick={() => anleitungFeld.current?.click()} loading={laedtHoch}>
              <FileText size={18} />
              {t('moebel.anleitung_pdf')}
            </Button>
            <span className="t-sub">{t('moebel.hier_ablegen')}</span>
            <input
              ref={anleitungFeld}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                void dateienNehmen(e.target.files, 'anleitung')
                e.target.value = ''
              }}
            />
          </div>
        ) : null}

        {anleitungen.length === 0 ? (
          <Card className="mb-6 px-3 py-4">
            <p className="text-base text-muted">{t('moebel.anleitung_leer')}</p>
          </Card>
        ) : (
          <Card className="zebra mb-6 divide-y divide-line overflow-hidden">
            {anleitungen.map((f, i) => {
              const url = urls.get(f.path)
              const pdf = f.path.endsWith('.pdf')
              return (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-raised">
                    {pdf ? <FileText size={20} /> : <ImagePlus size={20} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">
                      {f.caption || t('moebel.anleitung_seite', { n: i + 1 })}
                    </span>
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="t-sub underline underline-offset-2"
                      >
                        {t('moebel.anleitung_oeffnen')}
                      </a>
                    ) : (
                      <span className="t-sub">{t('kisten.bild_fehlt')}</span>
                    )}
                  </span>
                  {canEdit ? (
                    <IconButton
                      label={t('kisten.foto_loeschen')}
                      size="sm"
                      tone="danger"
                      onClick={() => {
                        setFotos((l) => l.filter((x) => x.id !== f.id))
                        void deletePhoto(f).catch((err: unknown) => {
                          setFotos((l) => [...l, f])
                          toast(err instanceof Error ? err.message : String(err), 'error')
                        })
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  ) : null}
                </div>
              )
            })}
          </Card>
        )}

        {/* Etikett und QR-Code, damit auch ein Moebelstueck scannbar bleibt */}
        <SectionTitle>{t('etiketten.titel')}</SectionTitle>
        <Card className="mb-6 p-4">
          <QrPanel value={appUrl(`s/${item.id}`)} code={item.code} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/app/p/${project.id}/etiketten?item=${item.id}`}>
              <Button variant="outline" size="sm">
                <Printer size={16} />
                {t('kisten.druckansicht')}
              </Button>
            </Link>
          </div>
        </Card>

        {canEdit ? (
          <Button variant="outline" className="text-danger" onClick={() => setLoeschen(true)}>
            <Trash2 size={18} />
            {t('aktion.loeschen')}
          </Button>
        ) : null}
        <div className="h-8" />
      </Page>

      <AngabenDialog
        offen={bearbeiten}
        item={item}
        rooms={rooms}
        people={people}
        onClose={() => setBearbeiten(false)}
        onSpeichern={async (p) => {
          // Nur bei echtem Erfolg schliessen und melden. Der Fehler selbst
          // wurde in aendern schon angezeigt.
          if (await aendern(p)) {
            setBearbeiten(false)
            toast(t('moebel.gespeichert'), 'ok')
          }
        }}
      />

      <BildLesen
        offen={bildLesen}
        onClose={() => setBildLesen(false)}
        projectId={project.id}
        itemId={item.id}
        fotos={fotos}
        art="moebel"
        vorhandeneInhalte={teile}
        canEdit={canEdit}
        userId={user?.id ?? ''}
        onUebernommen={(neu) => setTeile((c) => [...c, ...neu])}
      />

      <InhaltVerschieben
        offen={umhaengen !== null}
        projectId={project.id}
        quelleId={item.id}
        inhalt={umhaengen}
        onClose={() => setUmhaengen(null)}
        onFertig={(inhaltId) => setTeile((c) => c.filter((x) => x.id !== inhaltId))}
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
          onFarbe={(c) => void aendern({ mark_color: c })}
          onSymbol={(sym) => void aendern({ mark_symbol: sym })}
        />
        <p className="t-sub mt-4">{t('marken.gehoert_der_zeile')}</p>
      </Modal>

      <ConfirmDialog
        open={loeschen}
        title={t('moebel.loeschen_titel')}
        body={t('moebel.loeschen_text', { code: item.code })}
        confirmLabel={t('aktion.loeschen')}
        onClose={() => setLoeschen(false)}
        onConfirm={() => {
          void (async () => {
            try {
              await deleteItem(item.id)
              toast(t('moebel.geloescht'), 'ok')
              nav(`/app/p/${project.id}/moebel`)
            } catch (err) {
              toast(err instanceof Error ? err.message : String(err), 'error')
            }
          })()
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------- Bearbeiten */

function AngabenDialog({
  offen,
  item,
  rooms,
  people,
  onClose,
  onSpeichern,
}: {
  offen: boolean
  item: Item
  rooms: Array<{ id: string; short: string; name: string }>
  people: Array<{ id: string; short: string; name: string }>
  onClose: () => void
  onSpeichern: (p: Partial<Item>) => Promise<void>
}) {
  const { t } = useSprache()
  const [busy, setBusy] = useState(false)
  const [entwurf, setEntwurf] = useState(() => ({
    title: item.title ?? '',
    room_id: item.room_id ?? '',
    person_id: item.person_id ?? '',
    size: item.size,
    hersteller: item.hersteller ?? '',
    modell: item.modell ?? '',
    masse: item.masse ?? '',
    zerlegt: item.zerlegt,
    note: item.note ?? '',
  }))

  // Wird der Dialog neu geoeffnet, zeigt er den aktuellen Stand, nicht den
  // von vorhin.
  useEffect(() => {
    if (!offen) return
    setEntwurf({
      title: item.title ?? '',
      room_id: item.room_id ?? '',
      person_id: item.person_id ?? '',
      size: item.size,
      hersteller: item.hersteller ?? '',
      modell: item.modell ?? '',
      masse: item.masse ?? '',
      zerlegt: item.zerlegt,
      note: item.note ?? '',
    })
  }, [offen, item])

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={t('kisten.bearbeiten')}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button form="moebel-angaben" type="submit" loading={busy}>
            {t('aktion.speichern')}
          </Button>
        </>
      }
    >
      <form
        id="moebel-angaben"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          setBusy(true)
          void onSpeichern({
            title: entwurf.title.trim() || null,
            room_id: entwurf.room_id || null,
            person_id: entwurf.person_id || null,
            size: entwurf.size,
            hersteller: entwurf.hersteller.trim() || null,
            modell: entwurf.modell.trim() || null,
            masse: entwurf.masse.trim() || null,
            zerlegt: entwurf.zerlegt,
            note: entwurf.note.trim() || null,
          }).finally(() => setBusy(false))
        }}
      >
        <Field label={t('begriff.name')}>
          <Input
            value={entwurf.title}
            onChange={(e) => setEntwurf({ ...entwurf, title: e.target.value })}
            placeholder={t('moebel.name_platzhalter')}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('begriff.zimmer')}>
            <Select
              value={entwurf.room_id}
              onChange={(e) => setEntwurf({ ...entwurf, room_id: e.target.value })}
            >
              <option value="">{t('kisten.kein_zimmer')}</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.short} - {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t('begriff.person')}>
            <Select
              value={entwurf.person_id}
              onChange={(e) => setEntwurf({ ...entwurf, person_id: e.target.value })}
            >
              <option value="">{t('kisten.keine_person')}</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.short} - {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label={t('begriff.groesse')}>
          <SizePicker value={entwurf.size} onChange={(v) => setEntwurf({ ...entwurf, size: v })} />
        </Field>

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
  )
}
