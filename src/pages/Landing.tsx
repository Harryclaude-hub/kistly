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
import { ThemeToggle } from '../components/ThemeToggle'
import { Buehne } from '../design/Buehne'
import { MotionToggle } from '../design/motion'

const STEPS = [
  {
    n: '01',
    title: 'Bereiche anlegen',
    text: 'Jedes Zimmer und jede Person bekommt einen Namen, ein Kuerzel und eine Farbe. Wohnzimmer wird W, Kinderzimmer wird KZ, Sara wird S.',
  },
  {
    n: '02',
    title: 'Kisten nummerieren',
    text: 'Jede Kiste gehoert zu einem Zimmer, einer Person oder beidem. Kistly vergibt den Code automatisch, fortlaufend und ohne Dopplung.',
  },
  {
    n: '03',
    title: 'Etiketten drucken',
    text: 'QR-Code, Nummer, Farbe und die Inhaltsliste auf ein Blatt. Ausdrucken, aufkleben, fertig.',
  },
  {
    n: '04',
    title: 'Scannen und abhaken',
    text: 'In der neuen Wohnung scannen. Rot heisst noch alte Wohnung, gruen heisst angekommen. Alle sehen es sofort.',
  },
]

const FEATURES = [
  { icon: QrIcon, title: 'QR-Code je Kiste', text: 'Jede Kiste hat ihren eigenen Code und ihre eigene Seite.' },
  { icon: Printer, title: 'Druckfertige Etiketten', text: 'A5, A4 oder A3, frei konfigurierbar, mit oder ohne Inhaltsliste.' },
  { icon: ScanLine, title: 'Scanner eingebaut', text: 'Mit der Handykamera scannen, Status in einem Tipp aendern.' },
  { icon: Boxes, title: 'Inhalt, Fotos, Notizen', text: 'Was drin ist, sieht man ohne die Kiste zu oeffnen.' },
  { icon: Users, title: 'Gruppen teilen', text: 'Familie und Helfer einladen, jeder sieht denselben Stand.' },
  { icon: MessageSquare, title: 'Chat und Anrufe', text: 'Sprachnachrichten, Bilder, Reaktionen und Verweise auf Kisten.' },
  { icon: Smartphone, title: 'Auf den Startbildschirm', text: 'Installiert sich wie eine App, mit Benachrichtigungen.' },
  { icon: ShieldCheck, title: 'Zugriff streng getrennt', text: 'Nur wer im Umzug ist, sieht dessen Daten. Datenbankseitig geprueft.' },
]

/* Die drei Bausteine einer Nummer. Die Zeichen stehen sehr gross, weil genau
 * daran jeder den Code lesen lernt. */
const CODE_TEILE = [
  {
    k: 'W',
    t: 'Kuerzel',
    d: 'Zimmer oder Person. W fuer Wohnzimmer, KZ fuer Kinderzimmer, S fuer Sara.',
  },
  {
    k: '3',
    t: 'Groesse',
    d: '1 ist winzig, 10 ist sperrig. Steht immer rot, damit man die Traglast sofort sieht.',
    red: true,
  },
  {
    k: '007',
    t: 'Laufnummer',
    d: 'Fortlaufend je Kuerzel. Wird automatisch vergeben, nie doppelt.',
  },
]

export default function Landing() {
  const { session } = useAuth()

  return (
    <div className="relative min-h-screen">
      {/* Reine Optik. Diese Zeile und src/design/ duerfen weg, dann sieht die
          Seite schlicht aus und funktioniert unveraendert weiter. */}
      <Buehne />

      <header className="band safe-top sticky top-0 z-30">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <Wordmark size={26} />
          {/* Auf dem Handy ist die Zeile eng. Darum mittlere Groesse und
              kein Umbruch, sonst faellt der Knopf auseinander. */}
          <div className="flex min-w-0 items-center gap-1">
            <MotionToggle />
            <ThemeToggle />
            {session ? (
              <Link to="/app" className="shrink-0">
                <Button size="md" className="kn-glanz whitespace-nowrap">
                  Zur App
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden shrink-0 sm:block">
                  <Button size="md" variant="outline" className="whitespace-nowrap">
                    Anmelden
                  </Button>
                </Link>
                <Link to="/registrieren" className="shrink-0">
                  <Button size="md" className="kn-glanz whitespace-nowrap">
                    Loslegen
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
                Umzugsplanung
              </span>

              <h1 className="mt-6 text-[2.5rem] font-black leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
                Jede Kiste hat
                <br />
                eine Nummer.
                <br />
                <span className="text-muted">Und du weisst, wo sie ist.</span>
              </h1>

              <div className="mt-6 h-1.5 w-24 rounded-full bg-danger" />

              <p className="mt-6 max-w-lg text-xl font-medium leading-relaxed text-muted">
                Kistly vergibt fuer jedes Zimmer und jede Person ein Kuerzel, nummeriert
                jede Kiste automatisch, druckt die Etiketten mit QR-Code und zeigt dir
                beim Einzug in Sekunden, was schon da ist und was noch fehlt.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to={session ? '/app' : '/registrieren'} className="block">
                  <Button size="lg" full className="kn-glanz kn-gross kn-pfeil sm:w-auto">
                    {session ? 'Zur App' : 'Kostenlos starten'}
                    <ArrowRight size={21} />
                  </Button>
                </Link>
                <Link to="/login" className="block">
                  <Button size="lg" variant="outline" full className="kn-gross sm:w-auto">
                    Ich habe schon ein Konto
                  </Button>
                </Link>
              </div>

              <p className="mt-5 text-base font-semibold text-muted">
                E-Mail und Passwort genuegen. Kein Bestaetigungslink noetig.
              </p>
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
                      Kinderzimmer
                    </div>
                    {/* Auf dem Handy bleiben neben dem QR-Code nur rund 180px. Bei
                        groesserer Schrift bricht KZ-7-012 um. */}
                    <div className="t-serial mt-1 whitespace-nowrap text-[1.875rem] leading-none sm:text-5xl">
                      KZ<span className="text-muted/45">-</span>
                      <span className="text-danger">7</span>
                      <span className="text-muted/45">-</span>012
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
                  {['Buecher Regal links', 'Lego Kiste', 'Bettwaesche', 'Nachtlicht'].map((t) => (
                    <li key={t} className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-muted" />
                      <span className="truncate font-medium">{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-line pt-4 text-base">
                  <span className="font-semibold text-muted">Groesse 7 von 10</span>
                  <span className="rounded-full bg-danger/12 px-3 py-1 font-black text-danger">
                    noch alte Wohnung
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
              So liest sich eine Nummer
            </h2>
            <p className="mt-4 max-w-2xl text-lg font-medium text-muted">
              Der Code steht auf jedem Etikett und ist ueberall gleich aufgebaut. Man
              versteht ihn ohne Erklaerung, auch wenn man nur beim Tragen hilft.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {CODE_TEILE.map((x) => (
                <div key={x.t} className="karte-glas min-w-0 rounded-2xl p-6">
                  <div
                    className={`t-serial text-6xl leading-none sm:text-7xl ${
                      x.red ? 'text-danger' : 'text-ink'
                    }`}
                  >
                    {x.k}
                  </div>
                  <div className="t-name mt-5">{x.t}</div>
                  <p className="mt-2 text-base text-muted">{x.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <span className="text-base font-black uppercase tracking-wide text-muted">
                Beispiele
              </span>
              <CodeChip code="W-3-007" size="lg" />
              <CodeChip code="KZ-7-012" size="lg" />
              <CodeChip code="S-1-003" size="lg" />
            </div>
          </div>
        </section>

        {/* Ablauf, hier scheint die Buehne durch */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-5">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">In vier Schritten</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="min-w-0 border-t-4 border-ink pt-5">
                <div className="t-serial text-lg text-danger">{s.n}</div>
                <h3 className="t-name mt-2">{s.title}</h3>
                <p className="mt-2 text-base text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Funktionen */}
        <section className="band">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-5">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Alles drin</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="karte-glas min-w-0 rounded-2xl p-6">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-ink text-paper">
                    <f.icon size={24} />
                  </span>
                  <h3 className="t-name mt-4">{f.title}</h3>
                  <p className="mt-2 text-base text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Abschluss */}
        <section className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-5">
          <h2 className="text-[2rem] font-black leading-tight tracking-tight sm:text-5xl">
            Der naechste Umzug wird langweilig.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg font-medium text-muted">
            Genau so soll er sein. Anlegen, drucken, kleben, scannen.
          </p>
          <Link to={session ? '/app' : '/registrieren'} className="mt-10 block sm:inline-block">
            <Button size="lg" full className="kn-glanz kn-gross kn-pfeil sm:w-auto">
              {session ? 'Zur App' : 'Konto anlegen'}
              <ArrowRight size={21} />
            </Button>
          </Link>
        </section>
      </main>

      <footer className="band">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-base text-muted sm:flex-row sm:px-5">
          <Wordmark size={22} />
          <p className="text-center sm:text-right">
            Gebaut fuer genau einen Umzug. Und fuer jeden danach.
          </p>
        </div>
      </footer>
    </div>
  )
}
