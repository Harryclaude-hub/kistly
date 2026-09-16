import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  MessageSquare,
  Printer,
  QrCode as QrIcon,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react'
import { Button, CodeChip, QrCode, Wordmark } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useT } from '../lib/i18n'
import { ThemeToggle } from '../components/ThemeToggle'
import { SpracheToggle } from '../components/SpracheToggle'
import { Buehne } from '../design/Buehne'
import { MotionToggle } from '../design/motion'

/* In den Listen stehen nur die Schluessel. Uebersetzt wird erst beim
 * Zeichnen, sonst blieben die Texte beim Sprachwechsel stehen. */

const STEPS = [
  { n: '01', titel: 'start.schritt1_titel', text: 'start.schritt1_text' },
  { n: '02', titel: 'start.schritt2_titel', text: 'start.schritt2_text' },
  { n: '03', titel: 'start.schritt3_titel', text: 'start.schritt3_text' },
  { n: '04', titel: 'start.schritt4_titel', text: 'start.schritt4_text' },
]

const FEATURES = [
  { icon: QrIcon, titel: 'start.f_qr_titel', text: 'start.f_qr_text' },
  { icon: Printer, titel: 'start.f_etiketten_titel', text: 'start.f_etiketten_text' },
  { icon: ScanLine, titel: 'start.f_scanner_titel', text: 'start.f_scanner_text' },
  { icon: Boxes, titel: 'start.f_inhalt_titel', text: 'start.f_inhalt_text' },
  { icon: Users, titel: 'start.f_gruppen_titel', text: 'start.f_gruppen_text' },
  { icon: MessageSquare, titel: 'start.f_chat_titel', text: 'start.f_chat_text' },
  { icon: Smartphone, titel: 'start.f_start_titel', text: 'start.f_start_text' },
  { icon: ShieldCheck, titel: 'start.f_zugriff_titel', text: 'start.f_zugriff_text' },
]

/* Die drei Bausteine einer Nummer. Die Zeichen stehen sehr gross, weil genau
 * daran jeder den Code lesen lernt. Sie sind in jeder Sprache gleich. */
const CODE_TEILE = [
  { k: 'W', titel: 'begriff.kuerzel', text: 'start.teil_kuerzel_text' },
  { k: '3', titel: 'begriff.groesse', text: 'start.teil_groesse_text', red: true },
  { k: '007', titel: 'start.teil_nummer_titel', text: 'start.teil_nummer_text' },
]

const DEMO_INHALT = [
  'start.demo_inhalt_1',
  'start.demo_inhalt_2',
  'start.demo_inhalt_3',
  'start.demo_inhalt_4',
]

export default function Landing() {
  const { session } = useAuth()
  const t = useT()

  return (
    <div className="relative min-h-screen">
      {/* Reine Optik. Diese Zeile und src/design/ duerfen weg, dann sieht die
          Seite schlicht aus und funktioniert unveraendert weiter. */}
      <Buehne />

      <header className="band safe-top sticky top-0 z-30">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-5">
          <Wordmark size={26} />
          {/* Bei 375px ist die Zeile randvoll. Die Umschalter zeigen dort nur
              ihr Symbol, Anmelden erscheint wie bisher erst ab sm, und der
              Bewegungsschalter kommt ebenfalls erst ab sm. Er ist reine
              Optik, waehrend Darstellung und Sprache immer erreichbar
              bleiben muessen. Nachgemessen: so passt die Zeile in jeder
              Sprache und in beiden Anmeldezustaenden ohne Umbruch. */}
          <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
            <span className="hidden shrink-0 sm:block">
              <MotionToggle />
            </span>
            <ThemeToggle />
            <SpracheToggle />
            {session ? (
              <Link to="/app" className="shrink-0">
                <Button size="md" className="kn-glanz whitespace-nowrap">
                  {t('start.zur_app')}
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden shrink-0 sm:block">
                  <Button size="md" variant="outline" className="whitespace-nowrap">
                    {t('start.anmelden')}
                  </Button>
                </Link>
                <Link to="/registrieren" className="shrink-0">
                  <Button size="md" className="kn-glanz whitespace-nowrap">
                    {t('start.loslegen')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero, steht ueber der Buehne */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-5 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink/15 bg-surface/70 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-ink backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-danger" />
                {t('start.badge')}
              </span>

              <h1 className="mt-6 text-[2.5rem] font-black leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
                {t('start.hero_1')}
                <br />
                {t('start.hero_2')}
                <br />
                <span className="text-muted">{t('start.hero_3')}</span>
              </h1>

              <div className="mt-6 h-1.5 w-24 rounded-full bg-danger" />

              <p className="mt-6 max-w-lg text-xl font-medium leading-relaxed text-muted">
                {t('start.hero_text')}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to={session ? '/app' : '/registrieren'} className="block">
                  <Button size="lg" full className="kn-glanz kn-gross kn-pfeil sm:w-auto">
                    {session ? t('start.zur_app') : t('start.kostenlos_starten')}
                    {/* Der Pfeil meint eine Richtung, im Arabischen zeigt er
                        darum nach links. */}
                    <ArrowRight size={21} className="spiegeln" />
                  </Button>
                </Link>
                <Link to="/login" className="block">
                  <Button size="lg" variant="outline" full className="kn-gross sm:w-auto">
                    {t('start.habe_konto')}
                  </Button>
                </Link>
              </div>

              <p className="mt-5 text-base font-semibold text-muted">{t('start.kein_link')}</p>
            </div>

            {/* Etikettvorschau */}
            <div className="relative min-w-0">
              {/* Der Schatten darf hoechstens so weit rausragen wie der
               *  Seitenrand breit ist, sonst scrollt die Seite waagerecht. */}
              <div
                className="absolute -inset-3 -z-10 rounded-[2.75rem] sm:-inset-5"
                style={{ background: 'var(--glas)' }}
              />
              <div className="karte-glas-stark rounded-3xl p-5 shadow-2xl sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* Zimmername, darum t-name und nicht kleiner. */}
                    <div className="t-name truncate uppercase tracking-widest text-muted">
                      {t('start.demo_zimmer')}
                    </div>
                    {/* Auf dem Handy bleiben neben dem QR-Code nur rund 180px. Bei
                        groesserer Schrift bricht KZ-7-012 um. t-serial haelt die
                        Nummer auch im arabischen Satz von links nach rechts, steht
                        dafuer aber wie bei den Codeteilen und den Schrittnummern
                        als span im Block. Auf dem Block selbst wuerde direction
                        ltr die Nummer im arabischen Satz nach links ziehen,
                        waehrend der Zimmername darueber rechts beginnt. */}
                    <div className="mt-1 whitespace-nowrap text-[1.875rem] leading-none sm:text-5xl">
                      <span className="t-serial">
                        KZ<span className="text-muted/45">-</span>
                        <span className="text-danger">7</span>
                        <span className="text-muted/45">-</span>012
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 rounded-xl border-4 border-ink bg-white p-1.5">
                    <QrCode
                      value="https://kistly.app/s/demo"
                      size={80}
                      className="sm:h-[96px] sm:w-[96px]"
                    />
                  </div>
                </div>
                <div className="mt-5 h-2 w-full rounded-full" style={{ background: '#0EA5E9' }} />
                <ul className="zebra mt-5 space-y-1 text-base">
                  {DEMO_INHALT.map((key) => (
                    <li key={key} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-muted" />
                      <span className="truncate font-medium">{t(key)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-line pt-4 text-base">
                  <span className="font-semibold text-muted">
                    {t('groesse.von_zehn', { n: 7, wort: t('groesse.7') })}
                  </span>
                  <span className="rounded-full bg-danger/12 px-3 py-1 font-black text-danger">
                    {t('status.open')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Das Nummernsystem */}
        <section className="band">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-5">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              {t('start.nummer_titel')}
            </h2>
            <p className="mt-4 max-w-2xl text-lg font-medium text-muted">
              {t('start.nummer_text')}
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {CODE_TEILE.map((x) => (
                <div key={x.titel} className="karte-glas min-w-0 rounded-2xl p-6">
                  {/* t-serial setzt direction auf ltr. Auf einem Block wuerde
                      das Zeichen darum im arabischen Satz links kleben,
                      waehrend die Ueberschrift darunter rechts beginnt. Als
                      inline-Element im umgebenden Block stimmt beides. */}
                  <div className="text-6xl leading-none sm:text-7xl">
                    <span className={`t-serial ${x.red ? 'text-danger' : 'text-ink'}`}>{x.k}</span>
                  </div>
                  <div className="t-name mt-5">{t(x.titel)}</div>
                  <p className="mt-2 text-base text-muted">{t(x.text)}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <span className="text-base font-black uppercase tracking-wide text-muted">
                {t('start.beispiele')}
              </span>
              <CodeChip code="W-3-007" size="lg" />
              <CodeChip code="KZ-7-012" size="lg" />
              <CodeChip code="S-1-003" size="lg" />
            </div>
          </div>
        </section>

        {/* Ablauf, hier scheint die Buehne durch */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-5">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
            {t('start.schritte_titel')}
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="min-w-0 border-t-4 border-ink pt-5">
                <div className="text-lg text-danger">
                  <span className="t-serial">{s.n}</span>
                </div>
                <h3 className="t-name mt-2">{t(s.titel)}</h3>
                <p className="mt-2 text-base text-muted">{t(s.text)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Funktionen */}
        <section className="band">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-5">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              {t('start.funktionen_titel')}
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.titel} className="karte-glas min-w-0 rounded-2xl p-6">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-paper">
                    <f.icon size={24} />
                  </span>
                  <h3 className="t-name mt-4">{t(f.titel)}</h3>
                  <p className="mt-2 text-base text-muted">{t(f.text)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Abschluss */}
        <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-5">
          <h2 className="text-[2rem] font-black leading-tight tracking-tight sm:text-5xl">
            {t('start.schluss_titel')}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-muted">
            {t('start.schluss_text')}
          </p>
          <Link to={session ? '/app' : '/registrieren'} className="mt-10 block sm:inline-block">
            <Button size="lg" full className="kn-glanz kn-gross kn-pfeil sm:w-auto">
              {session ? t('start.zur_app') : t('start.konto_anlegen')}
              <ArrowRight size={21} className="spiegeln" />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="band">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-base text-muted sm:flex-row sm:px-5">
          <Wordmark size={22} />
          <p className="text-center sm:text-end">{t('start.fuss')}</p>
        </div>
      </footer>
    </div>
  )
}
