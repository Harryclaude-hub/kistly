# Kistly

**Live: https://harryclaude-hub.github.io/kistly/**

Umzugsverwaltung fuer Kisten, Zimmer und Personen. Jede Kiste bekommt eine
Nummer, einen QR-Code und ein druckfertiges Etikett. Beim Einzug wird
gescannt, und jeder im Umzug sieht sofort, was schon da ist und was fehlt.
Dazu ein Gruppenchat mit Sprachnachrichten, Bildern, Reaktionen und Anrufen.

Installierbare Web-App (PWA): laeuft im Browser, legt sich mit Logo auf den
Startbildschirm, bleibt angemeldet und kann Benachrichtigungen schicken.

---

## Das Nummernsystem

```
W - 3 - 007
│   │    └── Laufnummer, fortlaufend je Kuerzel, wird automatisch vergeben
│   └─────── Groesse von 1 bis 10, wird ueberall rot dargestellt
└─────────── Kuerzel des Zimmers oder der Person
```

- Jedes **Zimmer** und jede **Person** bekommt Namen, Kuerzel (1 bis 4 Zeichen)
  und Farbe.
- Ein Kuerzel gibt es pro Umzug nur einmal, egal ob Zimmer oder Person.
- Eine Kiste gehoert zu **einem** Zimmer und/oder **einer** Person. Zwei Zimmer
  oder zwei Personen an derselben Kiste sind ausgeschlossen, das Datenmodell
  laesst es gar nicht erst zu.
- Gehoert eine Kiste zu beidem, waehlt man, welches Kuerzel vorne steht.
- Die Vergabe passiert in der Datenbank (`items_before_insert`), nicht im
  Browser. Dieselbe Nummer kann nicht zweimal entstehen, auch wenn zwei Leute
  gleichzeitig anlegen.
- Aendert sich Groesse oder Kuerzel, wird ein neuer Code vergeben und der alte
  in `item_code_history` aufbewahrt. Ein bereits geklebtes Etikett wird beim
  Scannen weiterhin gefunden, mit Hinweis, dass es veraltet ist.

`scripts/smoketest.mjs` prueft genau das gegen die echte Datenbank.

## Was drin ist

| Bereich | Funktionen |
|---|---|
| Umzuege | mehrere Projekte, Mitglieder mit Rollen (Besitzer, Bearbeiter, Nur lesen), Einladungscodes |
| Bereiche | Zimmer und Personen, Kuerzel, Farbe, Notiz, Zaehler je Bereich |
| Kisten | Code, Groesse 1 bis 10, Art, Titel, Ziel, zerbrechlich, Notiz, Status, Mehrfachanlage bis 50 auf einmal |
| Inhalt | Liste je Kiste, abhakbar, landet auf Wunsch aufs Etikett |
| Fotos | aus der Kamera, per Drag and Drop oder aus der Zwischenablage, werden vor dem Upload verkleinert |
| Status | rot (alte Wohnung), gelb (unterwegs), gruen (angekommen), mit Verlauf wer wann was gesetzt hat |
| Etiketten | A5, A4 und A3, 1 bis 12 pro Seite, drei Inhaltsstufen: nur Nummer, Nummer mit QR-Code, oder zusaetzlich die Inhaltstabelle |
| Scannen | eigener Bereich ueber alle Umzuege hinweg: scannen, Uebersicht sehen, direkt zur Kiste, ins Zimmer oder in den Umzug springen |
| Chat | Text, Antworten, Reaktionen, Sprachnachrichten, Bilder per Drag and Drop und Einfuegen, klickbare Verweise auf Kisten und Zimmer |
| Anrufe | Sprach- und Videoanruf ueber WebRTC, Klingelton, wiederholte Benachrichtigung solange es klingelt |
| App | installierbar, Offline-Huelle, Push, hell und dunkel, untere Leiste mit den fuenf wichtigsten Bereichen |
| Export | CSV aller Kisten |

## Technik

- React 19, TypeScript, Vite, Tailwind CSS 4
- Supabase: Postgres, Auth, Storage, Realtime, Edge Functions
- WebRTC fuer Anrufe, Signalisierung ueber Supabase Realtime
- Web Push nach RFC 8291 und 8292, in der Edge Function selbst umgesetzt
- Service Worker von Hand geschrieben, kein Build-Schritt dahinter

Alle Datenbankzugriffe liegen in [`src/lib/api.ts`](src/lib/api.ts). Die Seiten
rufen nur diese Funktionen auf, damit dieselbe Abfrage nicht in zwei Fassungen
auseinanderlaeuft.

---

## Einrichtung

### 1. Repo holen und Pakete installieren

```bash
git clone https://github.com/Harryclaude-hub/kistly.git
cd kistly
npm install
```

### 2. Supabase-Projekt anlegen

Neues Projekt bei [supabase.com](https://supabase.com), Region Europa. Dann die
Migrationen der Reihe nach im SQL-Editor ausfuehren:

```
supabase/migrations/0001_core.sql
supabase/migrations/0002_functions.sql
supabase/migrations/0003_chat_calls_push.sql
supabase/migrations/0004_rls.sql
supabase/migrations/0005_storage.sql
supabase/migrations/0006_hardening.sql
supabase/migrations/0007_config_access.sql
supabase/migrations/0008_fix_project_delete.sql
supabase/migrations/0009_keine_email_bestaetigung.sql
```

Mit der Supabase CLI geht es in einem Rutsch:

```bash
supabase link --project-ref <ref>
supabase db push
```

### 3. E-Mail-Bestaetigung abschalten

**Das ist der einzige Schritt, der von Hand im Dashboard passieren muss.**

**Authentication → Sign In / Providers → Email → "Confirm email" ausschalten.**

Dieser Schalter liegt in der Projektverwaltung, nicht in der Datenbank. Er
laesst sich weder per SQL noch per Migration umlegen.

Bleibt er an, versucht Supabase bei jeder Registrierung eine Mail zu
verschicken. Der eingebaute Mailversand ist auf wenige Mails pro Stunde
begrenzt, und dann kommt:

```
email rate limit exceeded
```

Die Absage kommt mit Status 429, bevor ueberhaupt eine Zeile in
`auth.users` entsteht. Kein Trigger und kein Kniff in der Datenbank hilft
dagegen, nur der Schalter.

`0009_keine_email_bestaetigung.sql` setzt die Vorgabe zusaetzlich auf
Datenbankebene um: jedes neue Konto wird per Trigger sofort selbst
bestaetigt. Damit haengt nie ein Konto im Zustand "angelegt, aber nicht
bestaetigt", auch wenn der Schalter spaeter wieder angeht oder das Projekt
neu aufgesetzt wird. Bewusste Folge: eine Adresse wird nicht geprueft.

### 4. Umgebung setzen

```bash
cp .env.example .env.local
```

`VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` stehen unter
**Project Settings → API**.

### 5. Push einrichten

```bash
node scripts/vapid.mjs
```

Der oeffentliche Schluessel kommt als `VITE_VAPID_PUBLIC_KEY` in die
`.env.local`. Beide Schluessel braucht die Edge Function. Es gibt zwei Wege,
die Funktion versucht sie in dieser Reihenfolge:

1. Als Function Secrets:

```bash
supabase secrets set VAPID_PUBLIC_KEY=...
supabase secrets set VAPID_PRIVATE_KEY=...
supabase secrets set VAPID_SUBJECT=mailto:deine@adresse.de
```

2. Oder in der Tabelle `private.config`, falls die CLI nicht zur Hand ist:

```sql
insert into private.config (key, value) values
  ('VAPID_PUBLIC_KEY',  '...'),
  ('VAPID_PRIVATE_KEY', '...'),
  ('VAPID_SUBJECT',     'mailto:deine@adresse.de')
on conflict (key) do update set value = excluded.value;
```

Das Schema `private` haengt nicht an der REST-Schnittstelle. Nur der
Dienstschluessel der Edge Function kommt ueber `public.app_config()` dort hin,
angemeldete Nutzer und Fremde nicht.

Dann ausrollen:

```bash
supabase functions deploy push-send
```

Ohne Schluessel laeuft die App normal weiter und meldet in den Einstellungen,
dass kein Schluessel hinterlegt ist.

### 6. Starten und pruefen

```bash
npm run dev
node scripts/smoketest.mjs
```

Der Smoketest legt einen Umzug an, prueft die komplette Codevergabe, die
Code-Historie, Rechte und Abschottung, und raeumt danach wieder auf. Er
braucht einmalig einen Testzugang:

```sql
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
  'authenticated', 'authenticated', 'smoketest@kistly.app',
  crypt('Smoketest-2026-kistly', gen_salt('bf')), now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
  '', '', '', ''
);
```

Die leeren Zeichenketten am Ende sind kein Zierrat: GoTrue liest diese Spalten
in nicht-nullbare Felder und meldet sonst beim Anmelden
"Database error querying schema".

### 7. Symbole neu erzeugen (nur wenn das Logo geaendert wird)

```bash
node scripts/make-icons.mjs
```

---

## Veroeffentlichen

Bei jedem Push auf `main` baut
[.github/workflows/pages.yml](.github/workflows/pages.yml) die App und legt
sie auf GitHub Pages: **https://harryclaude-hub.github.io/kistly/**

Die Adressen stehen als Repository-Variablen unter
**Settings → Secrets and variables → Actions → Variables**:
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.
Fehlt eine davon, bricht der Bau mit einer Meldung ab, statt eine tote Seite
zu veroeffentlichen.

Weil Pages unter einem Unterordner ausliefert, setzt der Bau `VITE_BASE`.
Alles, was eine vollstaendige Adresse braucht (QR-Codes, Einladungslink,
Passwort-Link, Service Worker), laeuft ueber `appUrl` in
[src/lib/util.ts](src/lib/util.ts) und ueber den Geltungsbereich des Service
Workers. Lokal und bei Vercel bleibt es die Wurzel.

Fuer Vercel liegt `vercel.json` bei, fuer Netlify `netlify.toml`. Dort
entfaellt der Unterordner, `VITE_BASE` bleibt einfach ungesetzt.

```bash
npm run build     # erzeugt dist/
```

Nach dem Deployen die URL in Supabase unter
**Authentication → URL Configuration** als Site URL eintragen, sonst zeigt
der Link zum Zuruecksetzen des Passworts auf localhost.

---

## Sicherheit

- Jede Tabelle hat Row Level Security. Ohne Mitgliedschaft im Umzug gibt es
  keine Zeile zu sehen, auch nicht ueber die API. Der Smoketest prueft das.
- Die Pruefung steht an genau einer Stelle: `is_member`, `is_editor` und
  `is_owner`.
- Jede Funktion hat einen festen `search_path`. Ausfuehrrechte sind entzogen
  und nur dort wieder vergeben, wo sie gebraucht werden (siehe
  `0006_hardening.sql`). `anon` darf gar nichts.
- `next_seq` prueft die Mitgliedschaft. Ohne diese Pruefung haette ein
  angemeldeter Nutzer die Nummerierung fremder Umzuege verschieben koennen.
- Die Speicher-Buckets sind privat. Bilder und Sprachnachrichten kommen nur
  ueber zeitlich begrenzte, signierte Links. Der erste Ordner im Pfad ist die
  Projekt-ID, daran haengt die Berechtigung.
- Die Rolle eines Mitglieds kann nur der Besitzer aendern, abgesichert durch
  einen Trigger, nicht nur durch die Oberflaeche.
- Ein Projekt kann nicht ohne Besitzer zurueckbleiben.
- Der private VAPID-Schluessel liegt nur serverseitig, nie im Frontend.

## Bekannte Grenzen

Ehrlich aufgeschrieben, damit niemand davon ueberrascht wird:

- **Anrufe ohne TURN-Server.** Die Verbindung wird direkt zwischen den Geraeten
  aufgebaut. In manchen Mobilfunknetzen klappt das nicht. Die App meldet dann
  "Die direkte Verbindung kam nicht zustande", statt still zu haengen. Abhilfe:
  einen TURN-Server in `ICE_SERVERS` in
  [`src/lib/webrtc.ts`](src/lib/webrtc.ts) eintragen.
- **Anrufe sind fuer kleine Runden gedacht.** Jeder verbindet sich mit jedem.
  Bis etwa vier Personen unproblematisch, darueber wird es auf dem Handy eng.
- **Push auf dem iPhone** funktioniert erst, wenn die App ueber Teilen,
  "Zum Home-Bildschirm" installiert wurde. Vorgabe von Apple.
- **Der Push-Versand selbst ist noch nicht auf einem echten Geraet erprobt.**
  Berechtigung, Mitgliedschaftspruefung und Schluesselzugriff der Edge Function
  sind geprueft (401 ohne Token, 403 bei fremdem Projekt, 200 mit Token). Die
  Verschluesselung nach RFC 8291 laesst sich nur mit einem echten Abo im
  Browser abschliessend pruefen. Fehlschlaege landen sichtbar in `push_log`.
- **Der Chat ist auf dem Transportweg verschluesselt (TLS) und durch RLS
  geschuetzt, aber nicht Ende zu Ende verschluesselt.** Wer Zugriff auf die
  Datenbank hat, koennte mitlesen. Fuer ein privates Umzugsprojekt in Ordnung,
  soll aber nicht falsch klingen.
- **Der Passwort-Link zum Zuruecksetzen** laeuft ueber den eingebauten
  Mailversand von Supabase. Der ist stark begrenzt (wenige Mails pro Stunde).
  Fuer mehr braucht es einen eigenen SMTP-Zugang im Supabase-Projekt.

## Ordner

```
src/
  components/   Bausteine der Oberflaeche, Scanner, Anrufe, Sprachbubble
  lib/          Datenzugriff (api.ts), Auth, Medien, Push, WebRTC, Hilfen
  pages/        eine Datei je Seite, AppLayout haelt die untere Leiste
supabase/
  migrations/   Schema, Funktionen, RLS, Storage, Haertung
  functions/    Edge Function push-send
scripts/        Symbole, VAPID-Schluessel, Smoketest
public/         Manifest, Service Worker, Symbole
```
