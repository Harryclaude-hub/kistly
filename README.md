# Kistly

Umzugsverwaltung fuer Kisten, Zimmer und Personen. Jede Kiste bekommt eine
Nummer, einen QR-Code und ein druckfertiges Etikett. Beim Einzug wird
gescannt, und jeder im Umzug sieht sofort, was schon da ist und was fehlt.
Dazu ein Gruppenchat mit Sprachnachrichten, Bildern, Reaktionen und Anrufen.

Gebaut als installierbare Web-App (PWA): laeuft im Browser, legt sich auf
Wunsch mit Logo auf den Startbildschirm und kann Benachrichtigungen
schicken.

---

## Das Nummernsystem

```
W - 3 - 007
│   │    └── Laufnummer, fortlaufend je Kuerzel, wird automatisch vergeben
│   └─────── Groesse von 1 bis 10, wird ueberall rot dargestellt
└─────────── Kuerzel des Zimmers oder der Person
```

- Jedes **Zimmer** und jede **Person** bekommt einen Namen, ein Kuerzel
  (1 bis 4 Zeichen) und eine Farbe.
- Ein Kuerzel gibt es pro Umzug nur einmal, egal ob Zimmer oder Person.
- Eine Kiste gehoert zu **einem** Zimmer und/oder **einer** Person. Zwei
  Zimmer oder zwei Personen an derselben Kiste sind ausgeschlossen, das
  Datenmodell laesst es gar nicht erst zu.
- Gehoert eine Kiste zu beidem, waehlt man, welches Kuerzel vorne steht.
- Die Vergabe passiert in der Datenbank (`items_before_insert`), nicht im
  Browser. Dadurch kann dieselbe Nummer nicht zweimal entstehen, auch wenn
  zwei Leute gleichzeitig anlegen.
- Aendert sich Groesse oder Kuerzel, wird ein neuer Code vergeben und der
  alte in `item_code_history` aufbewahrt. Ein bereits geklebtes Etikett
  wird beim Scannen weiterhin gefunden, mit Hinweis, dass es veraltet ist.

## Was drin ist

| Bereich | Funktionen |
|---|---|
| Umzuege | mehrere Projekte, Mitglieder mit Rollen (Besitzer, Bearbeiter, Nur lesen), Einladungscodes |
| Bereiche | Zimmer und Personen, Kuerzel, Farbe, Notiz, Zaehler je Bereich |
| Kisten | Code, Groesse 1 bis 10, Art, Titel, Ziel, zerbrechlich, Notiz, Status, Mehrfachanlage bis 50 auf einmal |
| Inhalt | Liste je Kiste, abhakbar, landet auf Wunsch aufs Etikett |
| Fotos | direkt aus der Kamera, werden vor dem Upload verkleinert |
| Status | rot (alte Wohnung), gelb (unterwegs), gruen (angekommen), mit Verlauf wer wann was gesetzt hat |
| Etiketten | A4-Bogen, 1 bis 12 pro Seite, QR-Code, Farbbalken, Inhaltsliste, Schnittlinien, alles einzeln abschaltbar |
| Scannen | Kamera-Scanner mit Ton und Vibration, Taschenlampe, Eingabe von Hand, automatisches Setzen des Status |
| Chat | Textnachrichten, Antworten, Reaktionen, Sprachnachrichten, Bilder, Dateien, Verweise auf Kisten und Zimmer als klickbare Verknuepfung |
| Anrufe | Sprach- und Videoanruf ueber WebRTC, Klingelton, wiederholte Benachrichtigung solange es klingelt |
| App | installierbar, Offline-Huelle, Push-Benachrichtigungen, hell und dunkel |
| Export | CSV aller Kisten |

## Technik

- React 19, TypeScript, Vite, Tailwind CSS 4
- Supabase: Postgres, Auth, Storage, Realtime, Edge Functions
- WebRTC fuer Anrufe, Signalisierung ueber Supabase Realtime
- Web Push nach RFC 8291 und 8292, in der Edge Function selbst umgesetzt
- Service Worker von Hand geschrieben, kein Build-Schritt dahinter

Alle Datenbankzugriffe liegen in [`src/lib/api.ts`](src/lib/api.ts). Die
Seiten rufen nur diese Funktionen auf, damit dieselbe Abfrage nicht in zwei
Fassungen auseinanderlaeuft.

---

## Einrichtung

### 1. Repo holen und Pakete installieren

```bash
git clone https://github.com/<dein-konto>/kistly.git
cd kistly
npm install
```

### 2. Supabase-Projekt anlegen

Ein neues Projekt bei [supabase.com](https://supabase.com) anlegen, Region
Europa. Dann die Migrationen der Reihe nach im SQL-Editor ausfuehren:

```
supabase/migrations/0001_core.sql
supabase/migrations/0002_functions.sql
supabase/migrations/0003_chat_calls_push.sql
supabase/migrations/0004_rls.sql
supabase/migrations/0005_storage.sql
```

Mit der Supabase CLI geht es auch in einem Rutsch:

```bash
supabase link --project-ref <ref>
supabase db push
```

### 3. E-Mail-Bestaetigung abschalten

Damit die Anmeldung ohne Bestaetigungslink funktioniert:
**Authentication → Sign In / Providers → Email → "Confirm email" ausschalten.**

Bleibt die Option an, meldet die Registrierung das ehrlich zurueck
("Dieses Supabase-Projekt verlangt noch eine Bestaetigung per E-Mail")
statt so zu tun, als sei alles fertig.

### 4. Umgebung setzen

```bash
cp .env.example .env.local
```

`VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` stehen unter
**Project Settings → API**.

### 5. Push einrichten (optional, aber empfohlen)

```bash
node scripts/vapid.mjs
```

Der oeffentliche Schluessel kommt als `VITE_VAPID_PUBLIC_KEY` in die
`.env.local`. Beide Schluessel gehoeren in die Secrets der Edge Function:

```bash
supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
supabase secrets set VAPID_SUBJECT=mailto:deine@adresse.de
supabase functions deploy push-send
```

Ohne diese Schluessel laeuft die App normal weiter, sie meldet nur in den
Einstellungen, dass kein Schluessel hinterlegt ist.

### 6. Starten

```bash
npm run dev
```

### 7. Symbole neu erzeugen (nur wenn das Logo geaendert wird)

```bash
node scripts/make-icons.mjs
```

---

## Veroeffentlichen

Die App ist eine statische Seite mit Client-Routing. Wichtig ist nur, dass
alle Pfade auf `index.html` zeigen und `/sw.js` nicht dauerhaft
zwischengespeichert wird. Fuer Vercel liegt `vercel.json` bei, fuer Netlify
`netlify.toml`, beides ohne weitere Einstellungen nutzbar.

```bash
npm run build     # erzeugt dist/
```

Nach dem Deployen die URL in Supabase unter
**Authentication → URL Configuration** als Site URL eintragen, sonst
funktioniert der Link zum Zuruecksetzen des Passworts nicht.

---

## Sicherheit

- Jede Tabelle hat Row Level Security. Ohne Mitgliedschaft im Umzug gibt es
  keine Zeile zu sehen, auch nicht ueber die API.
- Die Pruefung steht an genau einer Stelle: `is_member`, `is_editor` und
  `is_owner` in `0001_core.sql`.
- Die Speicher-Buckets sind privat. Bilder und Sprachnachrichten werden nur
  ueber zeitlich begrenzte, signierte Links ausgeliefert. Der erste
  Ordner im Pfad ist die Projekt-ID, daran haengt die Berechtigung.
- Die Rolle eines Mitglieds kann nur der Besitzer aendern, abgesichert
  durch einen Trigger, nicht nur durch die Oberflaeche.
- Ein Projekt kann nicht ohne Besitzer zurueckbleiben.
- Der private VAPID-Schluessel liegt ausschliesslich in den Supabase
  Secrets, nie im Frontend.

## Bekannte Grenzen

Ehrlich aufgeschrieben, damit niemand davon ueberrascht wird:

- **Anrufe ohne TURN-Server.** Die Verbindung wird direkt zwischen den
  Geraeten aufgebaut. In manchen Mobilfunknetzen klappt das nicht. Die App
  meldet dann "Die direkte Verbindung kam nicht zustande", statt still zu
  haengen. Abhilfe: einen TURN-Server in `ICE_SERVERS` in
  [`src/lib/webrtc.ts`](src/lib/webrtc.ts) eintragen.
- **Anrufe sind fuer kleine Runden gedacht.** Jeder verbindet sich mit
  jedem. Bis etwa vier Personen ist das unproblematisch, darueber wird es
  auf dem Handy eng.
- **Push auf dem iPhone** funktioniert erst, wenn die App ueber Teilen,
  "Zum Home-Bildschirm" installiert wurde. Das ist eine Vorgabe von Apple.
- **Die Nachrichten sind auf dem Transportweg verschluesselt (TLS) und
  durch RLS geschuetzt, aber nicht Ende zu Ende verschluesselt.** Wer
  Zugriff auf die Datenbank hat, koennte sie lesen. Fuer ein privates
  Umzugsprojekt ist das in Ordnung, es soll aber nicht falsch klingen.
- **Der Passwort-Link zum Zuruecksetzen** laeuft ueber den eingebauten
  Mailversand von Supabase. Der ist stark begrenzt (wenige Mails pro
  Stunde). Fuer mehr braucht es einen eigenen SMTP-Zugang im
  Supabase-Projekt.

## Ordner

```
src/
  components/   Bausteine der Oberflaeche, Scanner, Anrufe, Sprachbubble
  lib/          Datenzugriff (api.ts), Auth, Medien, Push, WebRTC, Hilfen
  pages/        eine Datei je Seite
supabase/
  migrations/   Schema, Funktionen, RLS, Storage
  functions/    Edge Function push-send
scripts/        Symbole erzeugen, VAPID-Schluessel erzeugen
public/         Manifest, Service Worker, Symbole
```
