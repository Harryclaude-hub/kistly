import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Check, DoorOpen, ImagePlus, User } from 'lucide-react'
import {
  Button,
  Card,
  CodeChip,
  ErrorBox,
  Loading,
  Modal,
  StatusPill,
  Textarea,
  useToast,
} from './ui'
import { MarkIcon } from './Mark'
import { zielFuerItem } from './ItemRow'
import {
  addPhotoRecord,
  getItem,
  listContents,
  listPhotos,
  setCoverPhoto,
  setItemStatus,
  updateItem,
} from '../lib/api'
import { useSprache } from '../lib/i18n'
import { compressImage, signedUrl, uploadTo } from '../lib/media'
import { notifyItemStatus } from '../lib/push'
import type { Item, ItemContent, ItemStatus, Tag } from '../lib/types'
import { contrastOn, uid } from '../lib/util'

/* Die Schnellansicht nach einem Scan.
 *
 * Sie steht hier und wird von allen drei Wegen benutzt, ueber die man
 * scannen kann: dem globalen Scanbereich, dem Scan im Umzug und der
 * QR-Adresse. Drei eigene Fassungen waeren drei Orte, an denen sie
 * auseinanderlaufen.
 *
 * Sie zeigt nur, was man beim Tragen in der Hand braucht: das Bild, die
 * Nummer, wo es hingehoert, ob es schon da ist. Der wichtigste Knopf ist
 * so gross, dass man ihn im Gehen trifft.
 */

/** Nur so viele Eintraege wie auf den ersten Blick lesbar sind. */
const INHALT_KURZ = 5

export function Schnellansicht({
  itemId,
  offen,
  onClose,
  alterCode,
  tagById,
  canEdit,
  projectName,
  onGeaendert,
}: {
  /** null heisst: es gibt gerade nichts zu zeigen. */
  itemId: string | null
  offen: boolean
  onClose: () => void
  /** Wurde ein altes Etikett gescannt, steht es hier. */
  alterCode?: string
  tagById: (id: string | null | undefined) => Tag | undefined
  canEdit: boolean
  projectName: string
  /** Die aufrufende Seite zieht ihre Liste nach. */
  onGeaendert?: (item: Item) => void
}) {
  const { t, tn } = useSprache()
  const toast = useToast()

  const [item, setItem] = useState<Item | null>(null)
  const [inhalt, setInhalt] = useState<ItemContent[]>([])
  const [bild, setBild] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [notiz, setNotiz] = useState('')
  const [notizOffen, setNotizOffen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [laedtHoch, setLaedtHoch] = useState(false)
  const feld = useRef<HTMLInputElement>(null)

  /* Beim Oeffnen wird alles frisch geholt. Ein Rest vom vorigen Scan waere
   * schlimmer als ein kurzer Ladebalken: man haette die Angaben der
   * falschen Kiste vor sich und wuerde danach handeln. */
  useEffect(() => {
    if (!offen || !itemId) return
    let alive = true
    setLaedt(true)
    setFehler(null)
    setItem(null)
    setInhalt([])
    setBild(null)
    setNotizOffen(false)
    void (async () => {
      try {
        const [i, c] = await Promise.all([getItem(itemId), listContents(itemId)])
        if (!alive) return
        setItem(i)
        setInhalt(c)
        setNotiz(i.note ?? '')
        setLaedt(false)
        if (i.cover_photo_id) {
          const fotos = await listPhotos(i.id)
          const deck = fotos.find((f) => f.id === i.cover_photo_id)
          if (alive && deck) setBild(await signedUrl('item-photos', deck.path))
        }
      } catch (err) {
        if (alive) {
          setFehler(err instanceof Error ? err.message : String(err))
          setLaedt(false)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [offen, itemId])

  const melden = useCallback(
    (neu: Item) => {
      setItem(neu)
      onGeaendert?.(neu)
    },
    [onGeaendert],
  )

  async function statusSetzen(ziel: ItemStatus) {
    if (!item || busy) return
    setBusy(true)
    try {
      const neu = await setItemStatus(item.id, ziel)
      melden(neu)
      if (ziel === 'arrived') {
        void notifyItemStatus(
          item.project_id,
          projectName,
          t('kisten.ist_angekommen', { code: neu.code }),
        )
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function notizSichern() {
    if (!item || busy) return
    const wert = notiz.trim() || null
    if (wert === (item.note ?? null)) {
      setNotizOffen(false)
      return
    }
    setBusy(true)
    try {
      melden(await updateItem(item.id, { note: wert }))
      toast(t('schnell.notiz_gespeichert'), 'ok')
      setNotizOffen(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setBusy(false)
    }
  }

  /** Ein Bild aufnehmen und sofort zum Deckbild machen. Ein Schritt,
   *  keine zwei: im Treppenhaus tippt niemand zweimal. */
  async function deckbildNehmen(dateien: FileList | null) {
    const datei = dateien?.[0]
    if (!datei || !item) return
    if (!datei.type.startsWith('image/')) {
      toast(tn('kisten.kein_bild', 1), 'error')
      return
    }
    setLaedtHoch(true)
    try {
      const blob = await compressImage(datei)
      const pfad = `${item.project_id}/${item.id}/${uid()}.jpg`
      await uploadTo('item-photos', pfad, blob, 'image/jpeg')
      const foto = await addPhotoRecord(item.project_id, item.id, pfad)
      const neu = await setCoverPhoto(item.id, foto.id)
      melden(neu)
      setBild(await signedUrl('item-photos', pfad))
      toast(t('schnell.deckbild_gesetzt'), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setLaedtHoch(false)
    }
  }

  const zimmer = tagById(item?.room_id)
  const person = tagById(item?.person_id)
  const angekommen = item?.status === 'arrived'

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={item ? item.code : t('schnell.laedt')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('schnell.weiter')}
          </Button>
          {item ? (
            <Link to={zielFuerItem(item.project_id, item)} onClick={onClose}>
              <Button variant="outline">{t('schnell.oeffnen')}</Button>
            </Link>
          ) : null}
        </>
      }
    >
      {laedt ? (
        <Loading label={t('schnell.laedt')} />
      ) : fehler ? (
        <ErrorBox error={fehler} />
      ) : !item ? (
        <p className="py-6 text-center text-base text-muted">{t('schnell.nicht_gefunden')}</p>
      ) : (
        <div className="space-y-4">
          {/* Deckbild randlos oben. Es ist das Erste, was man sieht. */}
          <div className="-mx-5 -mt-4">
            {bild ? (
              <button
                type="button"
                disabled={!canEdit || laedtHoch}
                onClick={() => feld.current?.click()}
                className="relative block w-full"
                aria-label={t('schnell.deckbild_wechseln')}
              >
                <img
                  src={bild}
                  alt={t('schnell.deckbild')}
                  className="h-44 w-full object-cover sm:h-56"
                />
                {canEdit ? (
                  <span className="absolute end-2 bottom-2 flex items-center gap-1.5 rounded-xl bg-black/60 px-2.5 py-1.5 text-sm font-bold text-white">
                    <Camera size={15} />
                    {t('schnell.deckbild_wechseln')}
                  </span>
                ) : null}
              </button>
            ) : (
              <div className="flex h-36 flex-col items-center justify-center gap-2 border-b border-line bg-raised sm:h-44">
                <ImagePlus size={26} className="text-muted" />
                <p className="t-sub">{t('schnell.kein_deckbild')}</p>
                {canEdit ? (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={laedtHoch}
                    onClick={() => feld.current?.click()}
                  >
                    <Camera size={16} />
                    {t('schnell.deckbild_aufnehmen')}
                  </Button>
                ) : null}
              </div>
            )}
            <input
              ref={feld}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                void deckbildNehmen(e.target.files)
                e.target.value = ''
              }}
            />
          </div>

          {/* Nummer und Name */}
          <div>
            <CodeChip code={item.code} size="lg" />
            <p className="t-name-lg mt-2 break-words">{item.title || t(`art.${item.kind}`)}</p>
            {item.mark_symbol ? (
              <p className="t-sub mt-1 flex items-center gap-1.5">
                <MarkIcon symbol={item.mark_symbol} size={15} />
                {t(`marken.symbol_${item.mark_symbol}`)}
              </p>
            ) : null}
          </div>

          {alterCode ? (
            <p className="rounded-xl border-2 border-warn/40 bg-warn/10 px-3 py-2 text-[0.9375rem] font-bold text-warn">
              {t('schnell.alter_code_gescannt', { code: alterCode })}
            </p>
          ) : null}

          {/* Wo es hingehoert */}
          {zimmer || person ? (
            <div className="flex flex-wrap items-center gap-2">
              {zimmer ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-base font-bold"
                  style={{ background: zimmer.color, color: contrastOn(zimmer.color) }}
                >
                  <DoorOpen size={15} />
                  {zimmer.name}
                </span>
              ) : null}
              {person ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-base font-bold"
                  style={{ background: person.color, color: contrastOn(person.color) }}
                >
                  <User size={15} />
                  {person.name}
                </span>
              ) : null}
            </div>
          ) : null}

          {item.target_room ? (
            <p className="t-sub">{t('kisten.nach_ziel', { ziel: item.target_room })}</p>
          ) : null}

          {/* Der wichtigste Knopf. Gross genug, um ihn im Gehen zu treffen. */}
          {canEdit ? (
            angekommen ? (
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill status={item.status} />
                <Button variant="ghost" size="sm" loading={busy} onClick={() => void statusSetzen('open')}>
                  {t('schnell.wieder_offen')}
                </Button>
              </div>
            ) : (
              <div>
                <Button
                  full
                  size="lg"
                  loading={busy}
                  onClick={() => void statusSetzen('arrived')}
                  className="h-16 justify-center gap-2 text-lg"
                >
                  <Check size={24} />
                  {t('schnell.angekommen_knopf')}
                </Button>
                <p className="t-sub mt-1.5 text-center">{t('schnell.angekommen_hinweis')}</p>
              </div>
            )
          ) : (
            <StatusPill status={item.status} />
          )}

          {/* Kurznotiz */}
          {canEdit ? (
            notizOffen ? (
              <div>
                <Textarea
                  value={notiz}
                  onChange={(e) => setNotiz(e.target.value)}
                  placeholder={t('schnell.notiz_platzhalter')}
                  rows={2}
                  autoFocus
                />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" loading={busy} onClick={() => void notizSichern()}>
                    {t('schnell.notiz_speichern')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setNotiz(item.note ?? '')
                      setNotizOffen(false)
                    }}
                  >
                    {t('aktion.abbrechen')}
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNotizOffen(true)}
                className="w-full rounded-xl border-2 border-dashed border-line px-3 py-2.5 text-start transition hover:border-ink/35 hover:bg-raised"
              >
                <span className="t-sub block">{t('schnell.notiz')}</span>
                <span
                  className={
                    item.note ? 'block break-words text-base' : 'block text-base text-muted italic'
                  }
                >
                  {item.note || t('schnell.notiz_leer')}
                </span>
              </button>
            )
          ) : item.note ? (
            <Card className="px-3 py-2.5">
              <span className="t-sub block">{t('schnell.notiz')}</span>
              <span className="block break-words text-base">{item.note}</span>
            </Card>
          ) : null}

          {/* Was drin ist, nur die ersten Zeilen */}
          <div>
            <p className="t-sub mb-1">{t('begriff.inhalt')}</p>
            {inhalt.length === 0 ? (
              <p className="text-base text-muted">{t('schnell.inhalt_leer')}</p>
            ) : (
              <ul className="space-y-0.5 text-base">
                {inhalt.slice(0, INHALT_KURZ).map((c) => (
                  <li key={c.id} className="break-words">
                    {c.qty > 1 ? <span className="t-serial">{c.qty}x </span> : null}
                    {c.text}
                  </li>
                ))}
                {inhalt.length > INHALT_KURZ ? (
                  <li className="t-sub">
                    {t('schnell.inhalt_mehr', { n: inhalt.length - INHALT_KURZ })}
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          {canEdit && !bild ? <p className="t-sub">{t('schnell.deckbild_hinweis')}</p> : null}
        </div>
      )}
    </Modal>
  )
}
