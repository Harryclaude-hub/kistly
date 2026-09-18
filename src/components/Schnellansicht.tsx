import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Check, ChevronRight, DoorOpen, ImagePlus, User, X } from 'lucide-react'
import { Button, ErrorBox, Loading, QrCode, StatusPill, Textarea, useToast } from './ui'
import { MarkIcon } from './Mark'
import { zielFuerItem } from './ItemRow'
import {
  addPhotoRecord,
  ladeSchnellansicht,
  setCoverPhoto,
  setItemStatus,
  updateItem,
  type SchnellDaten,
} from '../lib/api'
import { useSprache } from '../lib/i18n'
import { compressImage, signedUrl, uploadTo } from '../lib/media'
import { notifyItemStatus } from '../lib/push'
import type { Item, ItemStatus } from '../lib/types'
import { appUrl, contrastOn, uid } from '../lib/util'

/* Die Schnellansicht nach einem Scan.
 *
 * Sie legt sich ueber den ganzen Bildschirm, nicht als kleine Karte in die
 * Mitte. Wer eine Kiste in der Hand hat, soll nicht zielen muessen.
 *
 * Sie laedt ALLES selbst und braucht keinen Umzugs-Zusammenhang. Nur so
 * gibt es sie ueberall: im Umzug, im globalen Scanbereich und hinter der
 * QR-Adresse. Wuerde sie tagById und canEdit als Eigenschaften erwarten,
 * braeuchte der globale Scanbereich eine zweite Fassung, und ab dem Tag
 * laufen zwei Fassungen auseinander.
 *
 * Ein Tippen irgendwo auf den Inhalt, ausserhalb der Bedienelemente,
 * fuehrt auf die volle Seite. Der Knopf unten tut dasselbe und bleibt,
 * damit es auch mit der Tastatur geht.
 */

/** Nur so viele Eintraege wie auf den ersten Blick lesbar sind. */
const INHALT_KURZ = 5

/** Was ein Tippen NICHT weiterleiten darf, weil es dort schon etwas tut. */
const BEDIENELEMENTE = 'button, a, input, textarea, select, label, [role="button"]'

export function Schnellansicht({
  itemId,
  offen,
  onClose,
  alterCode,
  onGeaendert,
}: {
  /** null heisst: es gibt gerade nichts zu zeigen. */
  itemId: string | null
  offen: boolean
  onClose: () => void
  /** Wurde ein altes Etikett gescannt, steht es hier. */
  alterCode?: string
  /** Die aufrufende Seite zieht ihre Liste nach. */
  onGeaendert?: (item: Item) => void
}) {
  const { t, tn } = useSprache()
  const toast = useToast()
  const nav = useNavigate()

  const [daten, setDaten] = useState<SchnellDaten | null>(null)
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
    setDaten(null)
    setBild(null)
    setNotizOffen(false)
    void (async () => {
      try {
        const d = await ladeSchnellansicht(itemId)
        if (!alive) return
        setDaten(d)
        setNotiz(d.item.note ?? '')
        setLaedt(false)
        if (d.coverPath) {
          const url = await signedUrl('item-photos', d.coverPath)
          if (alive) setBild(url)
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

  /* Escape schliesst, und der Hintergrund scrollt nicht mit. Beides macht
   * sonst der Dialogbaustein, den es hier nicht mehr gibt. */
  useEffect(() => {
    if (!offen) return
    const taste = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', taste)
    const vorher = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', taste)
      document.body.style.overflow = vorher
    }
  }, [offen, onClose])

  const melden = useCallback(
    (neu: Item) => {
      setDaten((d) => (d ? { ...d, item: neu } : d))
      onGeaendert?.(neu)
    },
    [onGeaendert],
  )

  const item = daten?.item ?? null
  const darfAendern = daten?.role === 'owner' || daten?.role === 'editor'

  function zurVollenSeite() {
    if (!item) return
    onClose()
    nav(zielFuerItem(item.project_id, item))
  }

  /** Ein Tippen irgendwo, ausser auf etwas, das selbst schon etwas tut. */
  function aufInhaltTippen(e: MouseEvent<HTMLDivElement>) {
    const ziel = e.target
    if (ziel instanceof Element && ziel.closest(BEDIENELEMENTE)) return
    zurVollenSeite()
  }

  async function statusSetzen(ziel: ItemStatus) {
    if (!item || busy) return
    setBusy(true)
    try {
      const neu = await setItemStatus(item.id, ziel)
      melden(neu)
      if (ziel === 'arrived' && daten) {
        void notifyItemStatus(
          item.project_id,
          daten.project.name,
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
      melden(await setCoverPhoto(item.id, foto.id))
      setBild(await signedUrl('item-photos', pfad))
      toast(t('schnell.deckbild_gesetzt'), 'ok')
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setLaedtHoch(false)
    }
  }

  if (!offen) return null

  const zimmer = daten?.room ?? null
  const person = daten?.person ?? null
  const angekommen = item?.status === 'arrived'
  const streifen = item?.mark_color ?? zimmer?.color ?? person?.color ?? '#94a3b8'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item ? item.code : t('schnell.laedt')}
      className="fixed inset-0 z-50 flex flex-col bg-paper"
    >
      {/* Kopfzeile. Der farbige Streifen sagt schon von weitem, wohin die
          Kiste gehoert. */}
      <div className="safe-top shrink-0 border-b border-line">
        <div className="h-1.5" style={{ background: streifen }} />
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-2.5">
          <span className="t-name min-w-0 flex-1 truncate">
            {item ? item.code : t('schnell.laedt')}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('schnell.schliessen')}
            title={t('schnell.schliessen')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-line bg-surface text-ink transition hover:bg-raised active:scale-95"
          >
            <X size={21} />
          </button>
        </div>
      </div>

      {/* Inhalt. Ein Tippen hier fuehrt auf die volle Seite. */}
      <div
        onClick={aufInhaltTippen}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="mx-auto w-full max-w-2xl px-4 pb-6">
          {laedt ? (
            <div className="py-12">
              <Loading label={t('schnell.laedt')} />
            </div>
          ) : fehler ? (
            <div className="py-6">
              <ErrorBox error={fehler} />
            </div>
          ) : !item ? (
            <p className="py-12 text-center text-base text-muted">{t('schnell.nicht_gefunden')}</p>
          ) : (
            <>
              {/* Deckbild randlos ueber die ganze Breite */}
              <div className="-mx-4 mb-4">
                {bild ? (
                  <button
                    type="button"
                    disabled={!darfAendern || laedtHoch}
                    onClick={() => feld.current?.click()}
                    className="relative block w-full"
                    aria-label={t('schnell.deckbild_wechseln')}
                  >
                    <img
                      src={bild}
                      alt={t('schnell.deckbild')}
                      className="h-52 w-full object-cover sm:h-72"
                    />
                    {darfAendern ? (
                      <span className="absolute end-3 bottom-3 flex items-center gap-1.5 rounded-xl bg-black/60 px-2.5 py-1.5 text-sm font-bold text-white">
                        <Camera size={15} />
                        {t('schnell.deckbild_wechseln')}
                      </span>
                    ) : null}
                  </button>
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 border-b border-line bg-raised sm:h-48">
                    <ImagePlus size={28} className="text-muted" />
                    <p className="t-sub">{t('schnell.kein_deckbild')}</p>
                    {darfAendern ? (
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

              {/* Nummer gross, QR-Code daneben. Beides gehoert zusammen:
                  was auf dem Etikett klebt, steht hier noch einmal. */}
              <div className="mb-4 flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p dir="ltr" className="t-serial text-4xl leading-none font-black sm:text-5xl">
                    {item.prefix}
                    <span className="opacity-25">-</span>
                    <span className="text-danger">{item.size}</span>
                    <span className="opacity-25">-</span>
                    {String(item.seq).padStart(3, '0')}
                  </p>
                  <p className="t-name-lg mt-2 break-words">
                    {item.title || t(`art.${item.kind}`)}
                  </p>
                  {item.mark_symbol ? (
                    <p className="t-sub mt-1 flex items-center gap-1.5">
                      <MarkIcon symbol={item.mark_symbol} size={15} />
                      {t(`marken.symbol_${item.mark_symbol}`)}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 rounded-xl border border-line bg-white p-1.5">
                  <QrCode value={appUrl(`s/${item.id}`)} size={86} />
                </div>
              </div>

              {alterCode ? (
                <p className="mb-4 rounded-xl border-2 border-warn/40 bg-warn/10 px-3 py-2 text-[0.9375rem] font-bold text-warn">
                  {t('schnell.alter_code_gescannt', { code: alterCode })}
                </p>
              ) : null}

              {/* Wohin es gehoert, in den Farben des Umzugs */}
              {zimmer || person ? (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {zimmer ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-base font-bold"
                      style={{ background: zimmer.color, color: contrastOn(zimmer.color) }}
                    >
                      <DoorOpen size={16} />
                      {zimmer.name}
                    </span>
                  ) : null}
                  {person ? (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-base font-bold"
                      style={{ background: person.color, color: contrastOn(person.color) }}
                    >
                      <User size={16} />
                      {person.name}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {item.target_room ? (
                <p className="t-sub mb-4">{t('kisten.nach_ziel', { ziel: item.target_room })}</p>
              ) : null}

              {/* Der wichtigste Knopf. Gross genug, um ihn im Gehen zu treffen. */}
              {darfAendern ? (
                angekommen ? (
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <StatusPill status={item.status} />
                    <Button
                      variant="outline"
                      size="sm"
                      loading={busy}
                      onClick={() => void statusSetzen('open')}
                    >
                      {t('schnell.wieder_offen')}
                    </Button>
                  </div>
                ) : (
                  <div className="mb-4">
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
                <div className="mb-4">
                  <StatusPill status={item.status} />
                </div>
              )}

              {/* Kurznotiz */}
              <div className="mb-4">
                {darfAendern ? (
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
                          item.note
                            ? 'block break-words text-base'
                            : 'block text-base text-muted italic'
                        }
                      >
                        {item.note || t('schnell.notiz_leer')}
                      </span>
                    </button>
                  )
                ) : item.note ? (
                  <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
                    <span className="t-sub block">{t('schnell.notiz')}</span>
                    <span className="block break-words text-base">{item.note}</span>
                  </div>
                ) : null}
              </div>

              {/* Was drin ist, nur die ersten Zeilen */}
              <div className="mb-4">
                <p className="t-sub mb-1">{t('begriff.inhalt')}</p>
                {(daten?.contents ?? []).length === 0 ? (
                  <p className="text-base text-muted">{t('schnell.inhalt_leer')}</p>
                ) : (
                  <ul className="space-y-0.5 text-base">
                    {(daten?.contents ?? []).slice(0, INHALT_KURZ).map((c) => (
                      <li key={c.id} className="break-words">
                        {c.qty > 1 ? <span className="t-serial">{c.qty}x </span> : null}
                        {c.text}
                      </li>
                    ))}
                    {(daten?.contents ?? []).length > INHALT_KURZ ? (
                      <li className="t-sub">
                        {t('schnell.inhalt_mehr', {
                          n: (daten?.contents ?? []).length - INHALT_KURZ,
                        })}
                      </li>
                    ) : null}
                  </ul>
                )}
              </div>

              {/* Sagt, dass ein Tippen weiterfuehrt. Ohne den Satz wuerde
                  es niemand von allein versuchen. */}
              <p className="t-sub flex items-center gap-1.5 border-t border-line pt-3">
                <ChevronRight size={15} className="spiegeln shrink-0" />
                {t('schnell.tippen_hinweis')}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Fussleiste. Bleibt stehen, damit beide Wege immer erreichbar sind. */}
      <div className="safe-bottom shrink-0 border-t-2 border-line bg-paper">
        <div className="mx-auto flex w-full max-w-2xl gap-2 px-4 py-2.5">
          <Button variant="outline" full onClick={onClose}>
            {t('schnell.weiter')}
          </Button>
          <Button full disabled={!item} onClick={zurVollenSeite}>
            {t('schnell.oeffnen')}
          </Button>
        </div>
      </div>
    </div>
  )
}
