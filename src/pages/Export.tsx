import { useEffect, useMemo, useState } from 'react'
import { FileCode2, FileText, Printer, Sheet } from 'lucide-react'
import { AppHeader, Page } from '../components/AppShell'
import {
  Button,
  Card,
  Chip,
  ErrorBox,
  Field,
  Loading,
  SectionTitle,
  Select,
  Switch,
  useToast,
} from '../components/ui'
import { useProject } from './ProjectLayout'
import { listAllItems, listContentsForItems } from '../lib/api'
import { useSprache } from '../lib/i18n'
import { useWischen } from '../lib/wischen'
import {
  SPALTEN,
  alsHtml,
  alsWord,
  bauTabelle,
  dateiname,
  type Spalte,
} from '../lib/ausgabe'
import type { Item, ItemContent, ItemStatus } from '../lib/types'
import { download, toCsv, useLocalState } from '../lib/util'

/* Drucken und Ausgeben.
 *
 * Die Vorschau zeigt kein nachgebautes Bild, sondern genau das HTML, das
 * auch gedruckt und in die Datei geschrieben wird. Es gibt nur eine
 * Fassung. Was hier steht, steht auch auf dem Blatt.
 *
 * PDF entsteht ueber das Druckfenster. Das ist Absicht: nur so stimmen
 * Schrift, Seitengroesse und arabische Schreibrichtung. Eine selbst
 * gebaute PDF-Ausgabe kann kein Arabisch setzen, und ein Programm, das
 * zweisprachig ist, darf in einer der beiden Sprachen nicht kaputte
 * Dateien erzeugen.
 */

const PAPIERE = ['A4', 'A3', 'A5'] as const
type Papier = (typeof PAPIERE)[number]

interface Einstellung {
  spalten: Spalte[]
  farben: boolean
  symbole: boolean
  papier: Papier
  qr: number
  nurMarkierte: boolean
  mitMoebeln: boolean
  zimmer: string
  person: string
  status: ItemStatus | 'all'
}

const STANDARD: Einstellung = {
  spalten: ['code', 'titel', 'zimmer', 'person', 'status'],
  farben: true,
  symbole: true,
  papier: 'A4',
  qr: 90,
  nurMarkierte: false,
  mitMoebeln: true,
  zimmer: 'all',
  person: 'all',
  status: 'all',
}

/** Was aus dem Speicher kommt, ist alles und nichts. Darum wird jeder Wert
 *  geprueft, bevor er benutzt wird. */
function pruefen(roh: unknown): Einstellung {
  const o = (roh ?? {}) as Partial<Einstellung>
  const spalten = Array.isArray(o.spalten)
    ? o.spalten.filter((s): s is Spalte => (SPALTEN as readonly string[]).includes(s))
    : STANDARD.spalten
  return {
    spalten: spalten.length > 0 ? spalten : STANDARD.spalten,
    farben: typeof o.farben === 'boolean' ? o.farben : STANDARD.farben,
    symbole: typeof o.symbole === 'boolean' ? o.symbole : STANDARD.symbole,
    papier: PAPIERE.includes(o.papier as Papier) ? (o.papier as Papier) : STANDARD.papier,
    qr: typeof o.qr === 'number' && o.qr >= 50 && o.qr <= 200 ? o.qr : STANDARD.qr,
    nurMarkierte: typeof o.nurMarkierte === 'boolean' ? o.nurMarkierte : false,
    mitMoebeln: typeof o.mitMoebeln === 'boolean' ? o.mitMoebeln : true,
    zimmer: typeof o.zimmer === 'string' ? o.zimmer : 'all',
    person: typeof o.person === 'string' ? o.person : 'all',
    status: (['all', 'open', 'transit', 'arrived'] as string[]).includes(o.status as string)
      ? (o.status as ItemStatus | 'all')
      : 'all',
  }
}

export default function Export() {
  const { project, rooms, people, tagById } = useProject()
  const { t, tn, rtl } = useSprache()
  const toast = useToast()
  useWischen()

  const [roh, setRoh] = useLocalState<unknown>('kistly.ausgabe', STANDARD)
  const cfg = useMemo(() => pruefen(roh), [roh])
  const setzen = (teil: Partial<Einstellung>) => setRoh({ ...cfg, ...teil })

  const [alle, setAlle] = useState<Item[]>([])
  const [inhalte, setInhalte] = useState<Map<string, ItemContent[]>>(new Map())
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let alive = true
    setLaedt(true)
    setFehler(null)
    void (async () => {
      try {
        const liste = await listAllItems(project.id)
        if (!alive) return
        setAlle(liste)
        const map = await listContentsForItems(liste.map((i) => i.id))
        if (alive) setInhalte(map)
      } catch (err) {
        if (alive) setFehler(err instanceof Error ? err.message : String(err))
      } finally {
        if (alive) setLaedt(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [project.id, nonce])

  const zeilen = useMemo(() => {
    let liste = alle
    if (!cfg.mitMoebeln) liste = liste.filter((i) => i.kind !== 'furniture')
    if (cfg.zimmer !== 'all') liste = liste.filter((i) => i.room_id === cfg.zimmer)
    if (cfg.person !== 'all') liste = liste.filter((i) => i.person_id === cfg.person)
    if (cfg.status !== 'all') liste = liste.filter((i) => i.status === cfg.status)
    if (cfg.nurMarkierte) liste = liste.filter((i) => i.mark_color || i.mark_symbol)
    return liste
  }, [alle, cfg])

  /* Solange geladen wird oder ein Fehler steht, gibt es keine Vorschau.
   * Sonst stuende ein alter Bogen neben der Fehlermeldung und niemand
   * wuesste, was gilt. */
  const bereit = !laedt && fehler === null
  const tabelle = useMemo(() => {
    if (!bereit) return ''
    return bauTabelle({
      titel: project.name,
      untertitel: [
        cfg.zimmer !== 'all' ? tagById(cfg.zimmer)?.name : null,
        cfg.person !== 'all' ? tagById(cfg.person)?.name : null,
        cfg.status !== 'all' ? t(`status.${cfg.status}`) : null,
        cfg.nurMarkierte ? t('ausgabe.nur_markierte') : null,
      ]
        .filter(Boolean)
        .join(' | '),
      items: zeilen,
      tagById,
      inhalte,
      spalten: cfg.spalten,
      farben: cfg.farben,
      symbole: cfg.symbole,
      rtl,
      qrGroesse: cfg.qr,
      t,
    })
  }, [bereit, project.name, zeilen, tagById, inhalte, cfg, rtl, t])

  /* Ohne eigene Regel druckt der Browser immer A4. Die Regel haengt zur
   * Laufzeit im Dokumentkopf, genau wie auf der Etikettenseite. */
  useEffect(() => {
    const knoten = document.createElement('style')
    knoten.textContent = [
      '@media print {',
      `  @page { size: ${cfg.papier} portrait; margin: 12mm }`,
      '  .ausgabe-blatt { box-shadow: none !important; border: 0 !important;',
      '    padding: 0 !important; margin: 0 !important; max-height: none !important;',
      '    overflow: visible !important; background: #fff !important }',
      '  .ausgabe-blatt tr { break-inside: avoid; page-break-inside: avoid }',
      '  .ausgabe-blatt thead { display: table-header-group }',
      '}',
    ].join('\n')
    document.head.appendChild(knoten)
    return () => {
      knoten.remove()
    }
  }, [cfg.papier])

  function spalteUm(s: Spalte) {
    const an = cfg.spalten.includes(s)
    const gewaehlt = an ? cfg.spalten.filter((x) => x !== s) : [...cfg.spalten, s]
    /* Die Reihenfolge der Spalten steht fest und haengt nicht davon ab, in
     * welcher Reihenfolge angetippt wurde. Sonst stuende die Nummer mal
     * vorne und mal hinten. */
    const sortiert = SPALTEN.filter((x) => gewaehlt.includes(x))
    // Eine leere Tabelle waere kein Blatt. Mindestens die Nummer bleibt.
    setzen({ spalten: sortiert.length === 0 ? ['code'] : [...sortiert] })
  }

  function csv() {
    if (zeilen.length === 0) return
    const daten = zeilen.map((i) => ({
      [t('ausgabe.spalte_code')]: i.code,
      [t('ausgabe.spalte_titel')]: i.title ?? '',
      [t('ausgabe.spalte_zimmer')]: tagById(i.room_id)?.name ?? '',
      [t('ausgabe.spalte_person')]: tagById(i.person_id)?.name ?? '',
      [t('ausgabe.spalte_groesse')]: i.size,
      [t('ausgabe.spalte_status')]: t(`status.${i.status}`),
      [t('ausgabe.spalte_inhalt')]: (inhalte.get(i.id) ?? [])
        .map((c) => (c.qty > 1 ? `${c.qty}x ${c.text}` : c.text))
        .join(', '),
      [t('ausgabe.spalte_notiz')]: i.note ?? '',
    }))
    download(dateiname(project.name, 'csv', new Date()), toCsv(daten))
    toast(t('ausgabe.datei_fertig'), 'ok')
  }

  return (
    <>
      <AppHeader
        title={t('ausgabe.titel')}
        subtitle={t('ausgabe.untertitel')}
        back={`/app/p/${project.id}`}
      />
      <Page wide>
        {fehler ? (
          <div className="no-print mb-5">
            <ErrorBox error={fehler} onRetry={() => setNonce((n) => n + 1)} />
          </div>
        ) : null}

        {laedt ? (
          <Loading label={t('ausgabe.laedt')} />
        ) : (
          <>
            {/* -------------------------------------------- Einstellungen */}
            <div className="no-print">
              <SectionTitle>{t('ausgabe.auswahl')}</SectionTitle>
              <Card className="mb-5 p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t('begriff.zimmer')}>
                    <Select
                      value={cfg.zimmer}
                      onChange={(e) => setzen({ zimmer: e.target.value })}
                    >
                      <option value="all">{t('kisten.alle_zimmer')}</option>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.short} - {r.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('begriff.person')}>
                    <Select
                      value={cfg.person}
                      onChange={(e) => setzen({ person: e.target.value })}
                    >
                      <option value="all">{t('kisten.alle_personen')}</option>
                      {people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.short} - {p.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('begriff.status')}>
                    <Select
                      value={cfg.status}
                      onChange={(e) =>
                        setzen({ status: e.target.value as ItemStatus | 'all' })
                      }
                    >
                      <option value="all">{t('aktion.alle')}</option>
                      <option value="open">{t('status.open')}</option>
                      <option value="transit">{t('status.transit')}</option>
                      <option value="arrived">{t('status.arrived')}</option>
                    </Select>
                  </Field>
                </div>
                <Switch
                  checked={cfg.mitMoebeln}
                  onChange={(v) => setzen({ mitMoebeln: v })}
                  label={t('ausgabe.mit_moebeln')}
                />
                <Switch
                  checked={cfg.nurMarkierte}
                  onChange={(v) => setzen({ nurMarkierte: v })}
                  label={t('ausgabe.nur_markierte')}
                />
                <p className="t-sub mt-2">{tn('ausgabe.anzahl', zeilen.length)}</p>
              </Card>

              <SectionTitle>{t('ausgabe.was_drauf')}</SectionTitle>
              <Card className="mb-5 p-4">
                <p className="mb-2 text-[0.9375rem] font-bold">{t('ausgabe.spalten')}</p>
                <div className="flex flex-wrap gap-2">
                  {SPALTEN.map((s) => (
                    <Chip key={s} active={cfg.spalten.includes(s)} onClick={() => spalteUm(s)}>
                      {t(`ausgabe.spalte_${s}`)}
                    </Chip>
                  ))}
                </div>
                <p className="t-sub mt-2">{t('ausgabe.spalten_hinweis')}</p>

                {cfg.spalten.includes('qr') ? (
                  <div className="mt-4">
                    <Field label={t('ausgabe.qr_groesse')}>
                      <input
                        type="range"
                        min={50}
                        max={200}
                        step={10}
                        value={cfg.qr}
                        onChange={(e) => setzen({ qr: Number(e.target.value) })}
                        className="w-full"
                        aria-label={t('ausgabe.qr_groesse')}
                      />
                    </Field>
                    <p className="t-sub">{t('ausgabe.qr_mass', { n: cfg.qr })}</p>
                  </div>
                ) : null}
              </Card>

              <SectionTitle>{t('ausgabe.gestaltung')}</SectionTitle>
              <Card className="mb-5 p-4">
                <Field label={t('ausgabe.papier')}>
                  <Select
                    value={cfg.papier}
                    onChange={(e) => setzen({ papier: e.target.value as Papier })}
                  >
                    {PAPIERE.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Switch
                  checked={cfg.farben}
                  onChange={(v) => setzen({ farben: v })}
                  label={t('ausgabe.farben')}
                  hint={t('ausgabe.farben_hinweis')}
                />
                <Switch
                  checked={cfg.symbole}
                  onChange={(v) => setzen({ symbole: v })}
                  label={t('ausgabe.symbole')}
                  hint={t('ausgabe.symbole_hinweis')}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setzen({ farben: false, symbole: false })}
                >
                  {t('ausgabe.schlicht')}
                </Button>
                <p className="t-sub mt-1">{t('ausgabe.schlicht_hinweis')}</p>
                <p className="t-sub mt-3 border-t border-line pt-3">{t('ausgabe.zebra_immer')}</p>
              </Card>

              {/* --------------------------------------------- Ausgeben */}
              <SectionTitle>{t('ausgabe.titel')}</SectionTitle>
              <Card className="mb-5 p-4">
                <div className="flex flex-wrap gap-2">
                  <Button size="lg" disabled={zeilen.length === 0} onClick={() => window.print()}>
                    <Printer size={19} />
                    {t('ausgabe.drucken')}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={zeilen.length === 0}
                    onClick={() => {
                      alsWord(dateiname(project.name, 'doc', new Date()), tabelle, cfg.papier)
                      toast(t('ausgabe.datei_fertig'), 'ok')
                    }}
                  >
                    <FileText size={19} />
                    {t('ausgabe.word')}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    disabled={zeilen.length === 0}
                    onClick={() => {
                      alsHtml(dateiname(project.name, 'html', new Date()), project.name, tabelle)
                      toast(t('ausgabe.datei_fertig'), 'ok')
                    }}
                  >
                    <FileCode2 size={19} />
                    {t('ausgabe.html')}
                  </Button>
                  <Button size="lg" variant="outline" disabled={zeilen.length === 0} onClick={csv}>
                    <Sheet size={19} />
                    {t('ausgabe.csv')}
                  </Button>
                </div>
                <ul className="t-sub mt-3 space-y-1">
                  <li>{t('ausgabe.pdf_hinweis')}</li>
                  <li>{t('ausgabe.word_hinweis')}</li>
                  <li>{t('ausgabe.html_hinweis')}</li>
                  <li>{t('ausgabe.csv_hinweis')}</li>
                  <li>{t('ausgabe.etiketten_statt')}</li>
                </ul>
              </Card>

              <SectionTitle>{t('ausgabe.vorschau')}</SectionTitle>
              <p className="t-sub mb-2">{t('ausgabe.vorschau_hinweis')}</p>
            </div>

            {/* ------------------------------------------------ Vorschau */}
            {zeilen.length === 0 ? (
              <div className="no-print">
                <Card className="p-6 text-center text-base text-muted">{t('ausgabe.leer')}</Card>
              </div>
            ) : (
              <div
                className="ausgabe-blatt max-h-[70vh] overflow-auto rounded-2xl border border-line bg-white p-5 shadow-sm"
                dangerouslySetInnerHTML={{ __html: tabelle }}
              />
            )}
            <div className="no-print h-8" />
          </>
        )}
      </Page>
    </>
  )
}
