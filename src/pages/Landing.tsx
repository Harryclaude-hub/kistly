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

export default function Landing() {
  const { session } = useAuth()

  return (
    <div className="min-h-screen bg-paper">
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Wordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <Link to="/app">
                <Button size="sm">Zur App</Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button size="sm" variant="ghost">
                    Anmelden
                  </Button>
                </Link>
                <Link to="/registrieren">
                  <Button size="sm">Loslegen</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted">
                Umzugsplanung
              </span>
              <h1 className="mt-5 text-[2rem] font-black leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Jede Kiste hat
                <br />
                eine Nummer.
                <br />
                <span className="text-muted">Und du weisst, wo sie ist.</span>
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted">
                Kistly vergibt fuer jedes Zimmer und jede Person ein Kuerzel, nummeriert
                jede Kiste automatisch, druckt die Etiketten mit QR-Code und zeigt dir
                beim Einzug in Sekunden, was schon da ist und was noch fehlt.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to={session ? '/app' : '/registrieren'}>
                  <Button size="lg">{session ? 'Zur App' : 'Kostenlos starten'}</Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline">
                    Ich habe schon ein Konto
                  </Button>
                </Link>
              </div>
              <p className="mt-4 text-xs text-muted">
                E-Mail und Passwort genuegen. Kein Bestaetigungslink noetig.
              </p>
            </div>

            {/* Etikettvorschau */}
            <div className="relative min-w-0">
              <div className="absolute -inset-3 -z-10 rounded-[2.5rem] bg-raised sm:-inset-6" />
              <div className="rounded-3xl border border-line bg-surface p-6 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      Kinderzimmer
                    </div>
                    <div className="mt-1 font-mono text-[2.5rem] font-black tracking-tighter sm:text-5xl">
                      KZ<span className="text-muted/40">-</span>
                      <span className="text-danger">7</span>
                      <span className="text-muted/40">-</span>012
                    </div>
                  </div>
                  <QrCode value="https://kistly.app/s/demo" size={88} className="shrink-0 rounded-lg sm:w-[104px]" />
                </div>
                <div className="mt-4 h-1.5 w-full rounded-full" style={{ background: '#0EA5E9' }} />
                <ul className="mt-4 space-y-1 text-sm">
                  {['Buecher Regal links', 'Lego Kiste', 'Bettwaesche', 'Nachtlicht'].map(
                    (t, i) => (
                      <li
                        key={t}
                        className={`flex items-center gap-2 rounded px-2 py-1 ${
                          i % 2 ? 'bg-raised' : ''
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                        {t}
                      </li>
                    ),
                  )}
                </ul>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                  <span>Groesse 7 von 10</span>
                  <span className="font-bold text-danger">noch alte Wohnung</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Das Nummernsystem */}
        <section className="border-y border-line bg-raised/40">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
              So liest sich eine Nummer
            </h2>
            <p className="mt-2 max-w-2xl text-muted">
              Der Code steht auf jedem Etikett und ist ueberall gleich aufgebaut. Man
              versteht ihn ohne Erklaerung, auch wenn man nur beim Tragen hilft.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
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
              ].map((x) => (
                <div key={x.t} className="rounded-2xl border border-line bg-surface p-5">
                  <div
                    className={`font-mono text-4xl font-black ${x.red ? 'text-danger' : 'text-ink'}`}
                  >
                    {x.k}
                  </div>
                  <div className="mt-2 font-bold">{x.t}</div>
                  <p className="mt-1 text-sm text-muted">{x.d}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
              Beispiele:
              <CodeChip code="W-3-007" size="lg" />
              <CodeChip code="KZ-7-012" size="lg" />
              <CodeChip code="S-1-003" size="lg" />
            </div>
          </div>
        </section>

        {/* Ablauf */}
        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl">In vier Schritten</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="border-t-2 border-ink pt-4">
                <div className="font-mono text-sm font-bold text-muted">{s.n}</div>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Funktionen */}
        <section className="border-t border-line bg-raised/40">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Alles drin</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-line bg-surface p-5">
                  <f.icon size={22} />
                  <h3 className="mt-3 font-bold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Abschluss */}
        <section className="mx-auto max-w-3xl px-5 py-20 text-center">
          <h2 className="text-[1.75rem] font-black tracking-tight sm:text-4xl">
            Der naechste Umzug wird langweilig.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Genau so soll er sein. Anlegen, drucken, kleben, scannen.
          </p>
          <Link to={session ? '/app' : '/registrieren'} className="mt-8 inline-block">
            <Button size="lg">{session ? 'Zur App' : 'Konto anlegen'}</Button>
          </Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:flex-row">
          <Wordmark size={22} />
          <p>Gebaut fuer genau einen Umzug. Und fuer jeden danach.</p>
        </div>
      </footer>
    </div>
  )
}
