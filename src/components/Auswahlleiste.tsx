import { useEffect, useState } from 'react'
import { ArrowRightLeft, Palette, X } from 'lucide-react'
import { Button, ErrorBox, Field, Modal, Select, useToast } from './ui'
import { MarkPicker } from './Mark'
import { useSprache } from '../lib/i18n'
import { patchItems } from '../lib/api'
import type { Item, Tag } from '../lib/types'

/* Die Leiste, die erscheint, sobald Zeilen ausgewaehlt sind.
 *
 * Sie macht das, was man in einer Tabelle erwartet: mehrere Zeilen
 * anfassen und mit allen auf einmal etwas tun. Markieren und Verschieben
 * laufen hier zusammen, weil beides dieselbe Auswahl braucht.
 *
 * Geschrieben wird ueber api.ts, Zeile fuer Zeile, damit die Datenbank je
 * Kiste eine saubere neue Nummer vergeben kann. Was dabei schiefgeht, wird
 * gezaehlt und gemeldet, nicht verschluckt.
 */
export function Auswahlleiste({
  ids,
  gesamt,
  rooms,
  people,
  onAlle,
  onKeine,
  onEnde,
  onFertig,
}: {
  ids: string[]
  gesamt: number
  rooms: Tag[]
  people: Tag[]
  onAlle: () => void
  onKeine: () => void
  onEnde: () => void
  /** Nach dem Schreiben. Die Liste laedt danach neu, statt zu raten. */
  onFertig: () => void
}) {
  const { t, tn } = useSprache()
  const toast = useToast()
  const [markieren, setMarkieren] = useState(false)
  const [verschieben, setVerschieben] = useState(false)

  async function schreiben(patch: Partial<Item>, erfolg: (n: number) => string) {
    if (ids.length === 0) return
    const { ok, fehler } = await patchItems(ids, patch)
    if (ok > 0) toast(erfolg(ok), 'ok')
    if (fehler.length > 0) {
      toast(
        t('verschieben.teilweise', { ok, fehler: fehler.length, grund: fehler[0] }),
        'error',
      )
    }
    onFertig()
  }

  return (
    <>
      <div className="no-print safe-bottom sticky bottom-0 z-30 -mx-3 border-t-2 border-line bg-paper/98 px-3 py-2 backdrop-blur sm:mx-0 sm:rounded-t-2xl sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="t-name me-auto">
            {ids.length === 0 ? t('auswahl.nichts_gewaehlt') : tn('auswahl.anzahl', ids.length)}
          </span>
          <Button variant="ghost" size="sm" onClick={onAlle} disabled={ids.length === gesamt}>
            {t('auswahl.alle')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onKeine} disabled={ids.length === 0}>
            {t('auswahl.keine')}
          </Button>
          <Button variant="outline" size="sm" onClick={onEnde}>
            <X size={16} />
            {t('auswahl.modus_aus')}
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" disabled={ids.length === 0} onClick={() => setMarkieren(true)}>
            <Palette size={16} />
            {t('marken.markieren')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={ids.length === 0}
            onClick={() => setVerschieben(true)}
          >
            <ArrowRightLeft size={16} />
            {t('verschieben.titel')}
          </Button>
        </div>
      </div>

      <MarkierenDialog
        offen={markieren}
        anzahl={ids.length}
        onClose={() => setMarkieren(false)}
        onSpeichern={async (farbe, symbol) => {
          setMarkieren(false)
          await schreiben({ mark_color: farbe, mark_symbol: symbol }, () =>
            farbe || symbol ? t('marken.gesetzt') : t('marken.entfernt'),
          )
        }}
      />

      <VerschiebenDialog
        offen={verschieben}
        rooms={rooms}
        people={people}
        onClose={() => setVerschieben(false)}
        onSpeichern={async (patch) => {
          setVerschieben(false)
          await schreiben(patch, (n) => tn('verschieben.erledigt', n))
        }}
      />
    </>
  )
}

/* ------------------------------------------------------------ Markieren */

function MarkierenDialog({
  offen,
  anzahl,
  onClose,
  onSpeichern,
}: {
  offen: boolean
  anzahl: number
  onClose: () => void
  onSpeichern: (farbe: string | null, symbol: string | null) => Promise<void>
}) {
  const { t, tn } = useSprache()
  const [farbe, setFarbe] = useState<string | null>(null)
  const [symbol, setSymbol] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  /* Beim Oeffnen faengt der Dialog leer an. Ohne das stuende beim
   * naechsten Mal noch die Wahl von vorhin drin, und ein Druck auf
   * Speichern wuerde sie stillschweigend auf die neue Auswahl legen. */
  useEffect(() => {
    if (!offen) return
    setFarbe(null)
    setSymbol(null)
  }, [offen])

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={t('marken.titel')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button
            loading={busy}
            onClick={() => {
              setBusy(true)
              void onSpeichern(farbe, symbol).finally(() => setBusy(false))
            }}
          >
            {t('aktion.speichern')}
          </Button>
        </>
      }
    >
      <p className="t-sub mb-3">{tn('auswahl.anzahl', anzahl)}</p>
      <MarkPicker farbe={farbe} symbol={symbol} onFarbe={setFarbe} onSymbol={setSymbol} />
      <p className="t-sub mt-4">{t('marken.gehoert_der_zeile')}</p>
    </Modal>
  )
}

/* ---------------------------------------------------------- Verschieben */

const BLEIBT = '__bleibt__'
const AB = '__ab__'

function VerschiebenDialog({
  offen,
  rooms,
  people,
  onClose,
  onSpeichern,
}: {
  offen: boolean
  rooms: Tag[]
  people: Tag[]
  onClose: () => void
  onSpeichern: (patch: Partial<Item>) => Promise<void>
}) {
  const { t } = useSprache()
  const [zimmer, setZimmer] = useState(BLEIBT)
  const [person, setPerson] = useState(BLEIBT)
  const [fehler, setFehler] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Auch hier: jedes Oeffnen faengt bei "nicht aendern" an.
  useEffect(() => {
    if (!offen) return
    setZimmer(BLEIBT)
    setPerson(BLEIBT)
    setFehler(null)
  }, [offen])

  function bauen(): Partial<Item> | null {
    const patch: Partial<Item> = {}
    if (zimmer !== BLEIBT) patch.room_id = zimmer === AB ? null : zimmer
    if (person !== BLEIBT) patch.person_id = person === AB ? null : person
    return Object.keys(patch).length === 0 ? null : patch
  }

  return (
    <Modal
      open={offen}
      onClose={onClose}
      title={t('verschieben.titel')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('aktion.abbrechen')}
          </Button>
          <Button
            loading={busy}
            onClick={() => {
              const patch = bauen()
              if (!patch) {
                setFehler(t('verschieben.nichts_gewaehlt'))
                return
              }
              setFehler(null)
              setBusy(true)
              void onSpeichern(patch).finally(() => setBusy(false))
            }}
          >
            {t('verschieben.titel')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {fehler ? <ErrorBox error={fehler} /> : null}
        <Field label={t('verschieben.zimmer')}>
          <Select value={zimmer} onChange={(e) => setZimmer(e.target.value)}>
            <option value={BLEIBT}>{t('verschieben.unveraendert')}</option>
            <option value={AB}>{t('verschieben.abhaengen')}</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.short} - {r.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('verschieben.person')}>
          <Select value={person} onChange={(e) => setPerson(e.target.value)}>
            <option value={BLEIBT}>{t('verschieben.unveraendert')}</option>
            <option value={AB}>{t('verschieben.abhaengen')}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.short} - {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="t-sub">{t('verschieben.code_hinweis')}</p>
      </div>
    </Modal>
  )
}
