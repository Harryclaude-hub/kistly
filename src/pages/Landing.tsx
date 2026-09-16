import { Link } from 'react-router-dom'
import {
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
  { icon: Printer, title: 'Druckfertige Etiketten', text: 'A4-Bogen, frei konfigurierbar, mit oder ohne Inhaltsliste.' },
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
    <div className="min-h-screen bg-paper">
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center justify-between gap-3 px-4 sm:px-5">
          <Wordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <Link to="/app">
                <Button size="lg">Zur App</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button size="lg" variant="ghost">
                    Anmelden
                  </Button>
                </Link>
                <Link to="/registrieren">
                  <Button size="lg">Loslegen</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-5 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm font-bold uppercase tracking-wide text-muted">
                Umzugsplanung
              </span>
              <h1 className="mt-5 text-[2.25rem] font-black leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">
                Jede Kiste hat
                <br />
                eine Nummer.
                <br />
                <span className="text-muted">Und du weisst, wo sie ist.</span>
              </h1>
              <p className="mt-6 max-w-lg text-xl leading-relaxed text-muted">
                Kistly vergibt fuer jedes Zimmer und jede Person ein Kuerzel, nummeriert
                jede Kiste automatisch, druckt die Etiketten mit QR-Code und zeigt dir
                beim Einzug in Sekunden, was schon da ist und was noch fehlt.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link to={session ? '/app' : '/registrieren'} className="block">
                  <Button size="lg" full className="sm:w-auto">
                    {session ? 'Zur App' : 'Kostenlos starten'}
                  </Button>
                </Link>
                <Link to="/login" className="block">
                  <Button size="lg" variant="outline" full className="sm:w-auto">
                    Ich habe schon ein Konto
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted">
                E-Mail und Passwort genuegen. Kein Bestaetigungslink noetig.
              </p>
            </div>

            {/* Etikettvorschau */}
            <div className="relative min-w-0">
              {/* Der Schatten darf hoechstens so weit rausragen wie der
               *  Seitenrand breit ist, sonst scrollt die Seite waagerecht. */}
              <div className="absolute -inset-3 -z-10 rounded-[2.5rem] bg-raised sm:-inset-5" />
              <div className="rounded-3xl border border-line bg-surface p-5 shadow-xl sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {/* Zimmername, darum t-name und nicht kleiner. */}
                    <div className="t-name truncate uppercase tracking-wide text-muted">
                      Kinderzimmer
                    </div>
                    <div className="t-serial mt-1 text-[2.125rem] sm:text-5xl">
                      KZ<span className="text-muted/40">-</span>
                      <span className="text-danger">7</span>
                      <span className="text-muted/40">-</span>012
                    </div>
                  </div>
                  <QrCode
                    value="https://kistly.app/s/demo"
                    size={88}
                    className="shrink-0 rounded-lg sm:h-[104px] sm:w-[104px]"
                  />
                </div>
                <div className="mt-4 h-1.5 w-full rounded-full" style={{ background: '#0EA5E9' }} />
                <ul className="zebra mt-4 space-y-1 text-base">
                  {['Buecher Regal links', 'Lego Kiste', 'Bettwaesche', 'Nachtlicht'].map((t) => (
                    <li key={t} className="flex min-w-0 items-center gap-2 rounded px-2 py-1">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                      <span className="truncate">{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm text-muted">
                  <span>Groesse 7 von 10</span>
                  <span className="font-bold text-danger">noch alte Wohnung</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Das Nummernsystem */}
        <section className="border-y border-line bg-raised/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              So liest sich eine Nummer
            </h2>
            <p className="mt-3 max-w-2xl text-lg text-muted">
              Der Code steht auf jedem Etikett und ist ueberall gleich aufgebaut. Man
              versteht ihn ohne Erklaerung, auch wenn man nur beim Tragen hilft.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {CODE_TEILE.map((x) => (
                <div key={x.t} className="min-w-0 rounded-2xl border border-line bg-surface p-5">
                  <div
                    className={`t-serial text-6xl leading-none sm:text-7xl ${
                      x.red ? 'text-danger' : 'text-ink'
                    }`}
                  >
                    {x.k}
                  </div>
                  <div className="t-name mt-4">{x.t}</div>
                  <p className="mt-1.5 text-base text-muted">{x.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="text-base font-bold text-muted">Beispiele:</span>
              <CodeChip code="W-3-007" size="lg" />
              <CodeChip code="KZ-7-012" size="lg" />
              <CodeChip code="S-1-003" size="lg" />
            </div>
          </div>
        </section>

        {/* Ablauf */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">In vier Schritten</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="min-w-0 border-t-2 border-ink pt-4">
                <div className="t-serial text-base text-muted">{s.n}</div>
                <h3 className="t-name mt-2">{s.title}</h3>
                <p className="mt-2 text-base text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Funktionen */}
        <section className="border-t border-line bg-raised/40">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-5">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Alles drin</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="min-w-0 rounded-2xl border border-line bg-surface p-5">
                  <f.icon size={24} />
                  <h3 className="t-name mt-3">{f.title}</h3>
                  <p className="mt-1.5 text-base text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Abschluss */}
        <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-5">
          <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
            Der naechste Umzug wird langweilig.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            Genau so soll er sein. Anlegen, drucken, kleben, scannen.
          </p>
          <Link to={session ? '/app' : '/registrieren'} className="mt-8 block sm:inline-block">
            <Button size="lg" full className="sm:w-auto">
              {session ? 'Zur App' : 'Konto anlegen'}
            </Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-base text-muted sm:flex-row sm:px-5">
          <Wordmark size={22} />
          <p className="text-center sm:text-right">
            Gebaut fuer genau einen Umzug. Und fuer jeden danach.
          </p>
        </div>
      </footer>
    </div>
  )
}
