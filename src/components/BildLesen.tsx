import { useCallback, useEffect, useState } from 'react'
import { Check, Eye, RefreshCw, Sparkles } from 'lucide-react'
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorBox,
  Input,
  Loading,
  Modal,
  useToast,
} from './ui'
import { useSprache } from '../lib/i18n'
import { addContent } from '../lib/api'
import {
  BildFehler,
  MAX_BILDER_JE_LAUF,
  bilderLesen,
  erkennungVerwerfen,
  lesbareFotos,
  restGuthaben,
  schonVorhanden,
  stufeVon,
  vorhandeneErkennungen,
  type BildErgebnis,
  type Erkennungsart,
} from '../lib/bildki'
import type { ErkanntesDing, ItemContent, ItemPhoto } from '../lib/types'
import { cx } from '../lib/util'

/* Vorschlaege aus einem Foto.
 *
 * Der wichtigste Satz dieser Datei: es wird nichts eingetragen, bis
 * jemand tippt. Ein Vorschlag, der von allein in der Liste landet, ist
 * spaeter nicht mehr von einer Angabe zu unterscheiden, die ein Mensch
 * gemacht hat, und dann weiss niemand mehr, worauf er sich verlassen kann.
 *
 * Was nicht uebernommen wird, verschwindet auch nicht: es bleibt in der
 * Tabelle stehen, abgewaehlt. Wer es spaeter doch braucht, findet es.
 */

/** Eine Zeile in der Vorschlagstabelle. Sie traegt ihren eigenen Zustand,
 *  weil man Text und Menge vor dem Uebernehmen noch aendern koennen soll. */
interface Zeile {
  schluessel: string
  photoId: string
  bildNr: number
  text: string
  menge: number
  sicherheit: number
  hinweis: string | null
  gewaehlt: boolean
  schonDrin: boolean
}

function zeilenAus(
  ergebnisse: BildErgebnis[],
  vorhanden: string[],
  reihenfolge: string[],
): Zeile[] {
  const out: Zeile[] = []
  for (const e of ergebnisse) {
    const nr = reihenfolge.indexOf(e.photo_id) + 1
    e.dinge.forEach((d: ErkanntesDing, i) => {
      const drin = schonVorhanden(d.text, vorhanden)
      out.push({
        schluessel: `${e.photo_id}:${i}`,
        photoId: e.photo_id,
        bildNr: nr,
        text: d.text,
        menge: d.menge,
        sicherheit: d.sicherheit,
        hinweis: d.hinweis ?? null,
        // Was schon in der Liste steht, ist vorgewaehlt abgewaehlt. Sonst
        // legt ein Tippen alles doppelt an.
        gewaehlt: !drin,
        schonDrin: drin,
      })
    })
  }
  return out
}

export function BildLesen({
  offen,
  onClose,
  projectId,
  itemId,
  fotos,
  art,
  vorhandeneInhalte,
  canEdit,
  userId,
  onUebernommen,
}: {
  offen: boolean
  onClose: () => void
  projectId: string
  /** Wohin die uebernommenen Zeilen gehen. */
  itemId: string
  fotos: ItemPhoto[]
  art: Erkennungsart
  vorhandeneInhalte: ItemContent[]
  canEdit: boolean
  userId: string
  onUebernommen: (neu: ItemContent[]) => void
}) {
  const { t, tn, lang } = useSprache()
  const toast = useToast()

  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<{ code: string; text: string } | null>(null)
  const [zeilen, setZeilen] = useState<Zeile[] | null>(null)
  const [rest, setRest] = useState<{ projekt: number; nutzer: number } | null>(null)
  const [grenzeUebrig, setGrenzeUebrig] = useState(0)
  const [schonGelesen, setSchonGelesen] = useState<Set<string>>(new Set())
  const [neuLesen, setNeuLesen] = useState(false)
  const [busy, setBusy] = useState(false)

  const brauchbar = lesbareFotos(fotos).slice(0, MAX_BILDER_JE_LAUF)
  const reihenfolge = brauchbar.map((f) => f.id)
  const vorhandeneTexte = vorhandeneInhalte.map((c) => c.text)

  /* Beim Oeffnen wird nur nachgesehen, was schon einmal gelesen wurde.
   * Gelesen wird erst auf Tippen: es kostet Geld, und Geld gibt niemand
   * ungefragt aus. */
  useEffect(() => {
    if (!offen) return
    let alive = true
    setZeilen(null)
    setFehler(null)
    setGrenzeUebrig(0)
    void (async () => {
      try {
        const [alt, guthaben] = await Promise.all([
          vorhandeneErkennungen(reihenfolge, lang),
          restGuthaben(projectId, userId),
        ])
        if (!alive) return
        setRest(guthaben)
        setSchonGelesen(new Set([...alt.keys()]))
        const fertige = [...alt.values()].filter((a) => a.status === 'fertig')
        if (fertige.length > 0) {
          setZeilen(
            zeilenAus(
              fertige.map((a) => ({
                photo_id: a.photo_id,
                status: 'fertig' as const,
                aus_speicher: true,
                dinge: a.ergebnis,
              })),
              vorhandeneTexte,
              reihenfolge,
            ),
          )
        }
      } catch (err) {
        if (alive) setFehler({ code: 'laden', text: err instanceof Error ? err.message : String(err) })
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen, projectId, userId, lang])

  const lesen = useCallback(async () => {
    if (brauchbar.length === 0) {
      setFehler({ code: 'leer', text: t('bildki.keine_bilder') })
      return
    }
    setLaeuft(true)
    setFehler(null)
    try {
      const antwort = await bilderLesen(projectId, reihenfolge, art, lang)
      setRest({ projekt: antwort.rest_projekt, nutzer: antwort.rest_nutzer })
      setGrenzeUebrig(antwort.uebersprungen_wegen_grenze)
      setSchonGelesen(new Set(antwort.ergebnisse.map((e) => e.photo_id)))

      // Fehlgeschlagene Bilder werden gemeldet, nicht uebergangen.
      const kaputt = antwort.ergebnisse.filter((e) => e.status === 'fehler')
      if (kaputt.length > 0) {
        toast(kaputt[0].fehler ?? t('zustand.unbekannter_fehler'), 'error')
      }
      setZeilen(
        zeilenAus(
          antwort.ergebnisse.filter((e) => e.status === 'fertig'),
          vorhandeneTexte,
          reihenfolge,
        ),
      )
    } catch (err) {
      if (err instanceof BildFehler) setFehler({ code: err.code, text: err.message })
      else setFehler({ code: 'unbekannt', text: err instanceof Error ? err.message : String(err) })
    } finally {
      setLaeuft(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, art, lang, brauchbar.length, t, toast])

  async function uebernehmen() {
    const gewaehlt = (zeilen ?? []).filter((z) => z.gewaehlt && z.text.trim())
    if (gewaehlt.length === 0) {
      toast(t('bildki.nichts_gewaehlt'), 'error')
      return
    }
    setBusy(true)
    const neu: ItemContent[] = []
    const fehlgeschlagen: string[] = []
    for (const z of gewaehlt) {
      try {
        neu.push(await addContent(projectId, itemId, z.text.trim(), z.menge, 'bild'))
      } catch (err) {
        fehlgeschlagen.push(err instanceof Error ? err.message : String(err))
      }
    }
    setBusy(false)
    if (neu.length > 0) {
      onUebernommen(neu)
      toast(tn('bildki.uebernommen', neu.length), 'ok')
      // Uebernommene Zeilen bleiben stehen, aber abgewaehlt und als
      // vorhanden markiert. Sie verschwinden nicht: wer nachsehen will,
      // was die Erkennung gesagt hat, findet es weiter.
      const genommen = new Set(gewaehlt.map((z) => z.schluessel))
      setZeilen((alt) =>
        (alt ?? []).map((z) =>
          genommen.has(z.schluessel) ? { ...z, gewaehlt: false, schonDrin: true } : z,
        ),
      )
    }
    if (fehlgeschlagen.length > 0) {
      toast(
        t('bildki.teilweise_uebernommen', {
          ok: neu.length,
          fehler: fehlgeschlagen.length,
          grund: fehlgeschlagen[0],
        }),
        'error',
      )
    }
  }

  const gewaehlteZahl = (zeilen ?? []).filter((z) => z.gewaehlt).length

  return (
    <>
      <Modal
        open={offen}
        onClose={onClose}
        title={t('bildki.titel')}
        wide
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('aktion.schliessen')}
            </Button>
            {zeilen && zeilen.length > 0 ? (
              <Button loading={busy} disabled={gewaehlteZahl === 0} onClick={() => void uebernehmen()}>
                <Check size={17} />
                {t('bildki.alle_uebernehmen')}
              </Button>
            ) : null}
          </>
        }
      >
        <div className="space-y-4">
          <p className="t-sub">{t('bildki.erklaerung')}</p>

          {fehler ? (
            fehler.code === 'kein_schluessel' ? (
              <Card className="border-2 border-warn/40 bg-warn/10 p-4">
                <p className="t-name mb-1">{t('bildki.kein_schluessel_titel')}</p>
                <p className="text-base">{t('bildki.kein_schluessel')}</p>
              </Card>
            ) : fehler.code === 'nur_lesen' ? (
              <ErrorBox error={t('bildki.nur_lesen')} />
            ) : (
              <ErrorBox error={fehler.text} onRetry={() => void lesen()} />
            )
          ) : null}

          {grenzeUebrig > 0 ? (
            <ErrorBox error={t('bildki.grenze_erreicht', { n: grenzeUebrig })} />
          ) : null}

          {!canEdit ? (
            <ErrorBox error={t('bildki.nur_lesen')} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button loading={laeuft} onClick={() => void lesen()} disabled={brauchbar.length === 0}>
                <Sparkles size={17} />
                {schonGelesen.size > 0 ? t('bildki.knopf_kurz') : t('bildki.knopf')}
              </Button>
              {schonGelesen.size > 0 ? (
                <Button variant="outline" size="sm" onClick={() => setNeuLesen(true)}>
                  <RefreshCw size={16} />
                  {t('bildki.neu_lesen')}
                </Button>
              ) : null}
              {rest ? (
                <span className="t-sub">
                  {t('bildki.rest', { projekt: rest.projekt, nutzer: rest.nutzer })}
                </span>
              ) : null}
            </div>
          )}

          {laeuft ? <Loading label={t('bildki.laeuft')} /> : null}

          {zeilen && zeilen.length === 0 && !laeuft ? (
            <p className="rounded-xl border border-dashed border-line px-3 py-4 text-base text-muted">
              {t('bildki.kein_ergebnis')}
            </p>
          ) : null}

          {zeilen && zeilen.length > 0 ? (
            <>
              <Card className="zebra divide-y divide-line overflow-hidden">
                {zeilen.map((z, i) => (
                  <div key={z.schluessel} className="flex items-start gap-2 px-3 py-2.5">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={z.gewaehlt}
                      aria-label={t('bildki.uebernehmen')}
                      onClick={() =>
                        setZeilen((alt) =>
                          (alt ?? []).map((x, j) => (j === i ? { ...x, gewaehlt: !x.gewaehlt } : x)),
                        )
                      }
                      className={cx(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition',
                        z.gewaehlt ? 'border-ink bg-ink text-paper' : 'border-line bg-surface',
                      )}
                    >
                      {z.gewaehlt ? <Check size={17} /> : null}
                    </button>

                    <div className="min-w-0 flex-1">
                      <Input
                        value={z.text}
                        onChange={(e) =>
                          setZeilen((alt) =>
                            (alt ?? []).map((x, j) =>
                              j === i ? { ...x, text: e.target.value } : x,
                            ),
                          )
                        }
                        aria-label={t('bildki.zeile_aendern')}
                        className="py-1.5 text-base"
                      />
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Stufenband sicherheit={z.sicherheit} />
                        {z.hinweis ? <span className="t-sub">{z.hinweis}</span> : null}
                        {z.schonDrin ? (
                          <span className="t-sub font-bold">{t('bildki.schon_drin')}</span>
                        ) : null}
                        {brauchbar.length > 1 ? (
                          <span className="t-sub">{t('bildki.bild_nummer', { n: z.bildNr })}</span>
                        ) : null}
                      </div>
                    </div>

                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={z.menge}
                      onChange={(e) =>
                        setZeilen((alt) =>
                          (alt ?? []).map((x, j) =>
                            j === i
                              ? { ...x, menge: Math.max(1, Number(e.target.value) || 1) }
                              : x,
                          ),
                        )
                      }
                      aria-label={t('bildki.menge')}
                      dir="ltr"
                      className="w-20 shrink-0 py-1.5 text-center"
                    />
                  </div>
                ))}
              </Card>
              <p className="t-sub">{t('bildki.stufe_hinweis')}</p>
            </>
          ) : null}

          <p className="t-sub border-t border-line pt-3">{t('bildki.kostet')}</p>
          <p className="t-sub flex items-start gap-1.5">
            <Eye size={15} className="mt-0.5 shrink-0" />
            {t('bildki.datenschutz')}
          </p>
        </div>
      </Modal>

      <ConfirmDialog
        open={neuLesen}
        title={t('bildki.neu_lesen')}
        body={t('bildki.neu_lesen_frage')}
        confirmLabel={t('bildki.neu_lesen')}
        danger={false}
        onClose={() => setNeuLesen(false)}
        onConfirm={async () => {
          setNeuLesen(false)
          try {
            for (const id of reihenfolge) await erkennungVerwerfen(id, lang)
            setSchonGelesen(new Set())
            setZeilen(null)
            await lesen()
          } catch (err) {
            toast(err instanceof Error ? err.message : String(err), 'error')
          }
        }}
      />
    </>
  )
}

/** Drei Stufen statt einer Prozentzahl. Eine Prozentzahl liest sich wie
 *  ein Messwert, und das ist sie nicht. */
function Stufenband({ sicherheit }: { sicherheit: number }) {
  const t = useSprache().t
  const stufe = stufeVon(sicherheit)
  const farbe =
    stufe === 'sicher' ? 'var(--ok)' : stufe === 'wahrscheinlich' ? 'var(--warn)' : 'var(--muted)'
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-sm font-bold"
      style={{ color: farbe, borderColor: farbe }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: farbe }} />
      {t(`bildki.stufe_${stufe}`)}
    </span>
  )
}
