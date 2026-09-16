# Fahrplan

Damit der Faden nicht verloren geht. Hier steht, was fertig ist, was offen
ist und in welcher Reihenfolge es gebaut wird. Wer hier weiterarbeitet,
liest zuerst diese Datei, dann `README.md`.

---

## Fertig und veroeffentlicht

- Datenbank steht (Supabase `kistly`), Migrationen 0001 bis 0010,
  `scripts/smoketest.mjs` prueft 65 Punkte gegen die echte Datenbank
- Codevergabe KUERZEL-GROESSE-NUMMER in der Datenbank, alte Codes bleiben
  auffindbar
- Umzuege, Bereiche (Zimmer und Personen), Kisten, Inhalt, Fotos, Status
- Etiketten A5/A4/A3, drei Inhaltsstufen, 1 bis 12 pro Seite
- Globaler Scan-Bereich ueber alle Umzuege
- Chat mit Sprachnachrichten, Bildern, Reaktionen, Verweisen, Anrufen
- Push ueber eigene Edge Function
- Deutsch und Arabisch mit vollstaendiger Rechts-nach-links-Ansicht
- Warmes Beige, gezeichnete Umzugskisten im Hintergrund, drei
  Bewegungsstufen

---

## Offen, in dieser Reihenfolge

### 1. Datenbank erweitern (0010) FERTIG

Grundlage fuer alles Weitere. **Wichtigste Entscheidung: Moebel sind keine
zweite Tabelle, sondern Kisten mit `kind = 'furniture'`.**

Begruendung: `items` haengt schon an Zimmer, Person, Code, Status, Fotos,
Inhaltsliste, Scanner, Etiketten und Chat-Verweisen. Eine zweite Tabelle
haette all diese Verbindungen ein zweites Mal gebraucht, und genau dort
laufen Fassungen auseinander. Was Moebel zusaetzlich brauchen, kommt als
Spalten dazu.

| Was | Wo | Warum |
|---|---|---|
| `items.hersteller`, `items.modell`, `items.masse` | neu | Angaben zum Moebelstueck |
| `items.zerlegt` | neu | auseinandergebaut ja/nein |
| `items.mark_color`, `items.mark_symbol` | neu | Markieren wie in Excel |
| `tags.symbol` | neu | Symbol je Zimmer und Person |
| `item_photos.art` | neu | `foto` oder `anleitung` |
| `item_photos.seite` | neu | welche Seite fotografiert wurde |
| Bucket `item-photos` | erweitert | PDF erlaubt, fuer Aufbauanleitungen |
| `merge_tags(von, nach)` | neue RPC | Zimmer zusammenfuehren |

Der Teilekatalog zum Nachzaehlen ist `item_contents`, das gibt es schon:
Text, Menge, Haken. Nichts Neues noetig.

Stand: Migration liegt in `supabase/migrations/0010_moebel_und_markierungen.sql`
und ist angewandt. `src/lib/types.ts` und `src/lib/api.ts` sind im selben
Arbeitsgang nachgezogen (`mergeTags`, `moveContent`, `moveItems`, Filter
`kind` und `kindNot`, `addPhotoRecord` mit `art` und `seite`). Der Smoketest
prueft die Erweiterung mit 24 zusaetzlichen Punkten.

### 2. Eigene Seiten und Vollbild FERTIG

- `/app/p/:pid/zimmer/:tagId` Zimmerseite: Kisten, Moebel, Personen
- `/app/p/:pid/person/:tagId` Personenseite
- `/app/p/:pid/moebel` eigener Moebelbereich, neben Kisten
- `/app/p/:pid/moebel/:id` Moebelstueck mit Fotos je Seite, Teileliste,
  Aufbauanleitung
- Wischen nach rechts geht zurueck, nach links vorwaerts (Handy)
- Am Laptop dieselben Seiten, breiter gesetzt

Stand: alle vier Seiten stehen. Zimmer und Person teilen sich eine Datei
(`src/pages/AreaDetail.tsx`), weil sie in der Datenbank dieselbe Tabelle
sind. Die Kistenzeile steht nur noch einmal, in
`src/components/ItemRow.tsx`, und wird von Kistenliste, Zimmerseite,
Personenseite und Moebelbereich gemeinsam benutzt. Das Wischen liegt in
`src/lib/wischen.ts`, nicht in der Designschicht, und ist auf Arabisch
gespiegelt. Moebel sind aus der Kistenliste ausgeblendet
(`kindNot: 'furniture'`), damit ein Stueck nicht in zwei Listen steht.

### 3. Markieren wie in Excel FERTIG

- Zeilen und Bereiche einfaerben, Symbol vergeben
- Abwechselnde Zeilenhelligkeit bleibt **immer** erhalten, auch mit
  eigenen Farben. Eine Zeile dunkler, eine heller, sonst verliert man beim
  Lesen die Spur.

Stand: geloest ueber zwei Schichten in `src/index.css`. Die eigene Farbe
liegt als `--mark` in der Hintergrundfarbe, der Zebrastreifen als
`linear-gradient` darueber. Damit tragen zwei Zeilen mit derselben eigenen
Farbe trotzdem verschiedene Helligkeit. Im Browser nachgemessen, nicht
geschaetzt. Die Farben und Zeichen selbst stehen in `src/lib/marken.ts`,
die Bilder dazu in `src/components/Mark.tsx`.

### 4. Verschieben und Zusammenfuehren FERTIG

- Kiste in ein anderes Zimmer (geht schon ueber Bearbeiten, braucht einen
  schnellen Weg aus der Liste heraus)
- Mehrere Kisten auf einmal
- Zimmer zusammenfuehren
- Einzelne Inhalte von einer Kiste in eine andere

Stand: Auswaehlen wie in einer Tabelle steckt in
`src/components/Auswahlleiste.tsx` und wird von Kistenliste und
Bereichsseite gemeinsam benutzt. Zusammenfuehren sitzt auf der
Bereichsseite und fragt zweimal, weil es nicht rueckgaengig geht. Einen
einzelnen Inhalt umhaengen geht ueber
`src/components/InhaltVerschieben.tsx`, sowohl in einer Kiste als auch im
Teilekatalog eines Moebelstuecks.

### 5. Drucken und Ausgeben FERTIG

- Vorschau zeigt, was aufs Blatt kommt: QR-Code, Seriennummer, Tabelle
- Auswaehlbar: mit oder ohne Farben, mit oder ohne Symbole, schlicht
- Groesse und Gestaltung einstellbar
- Ausgabe als PDF und als Word-Datei, nicht nur ueber den Druckdialog

Stand: `src/pages/Export.tsx` unter `/app/p/:pid/export`. Die Tabelle wird
genau einmal gebaut, in `src/lib/ausgabe.ts`. Dieses eine Stueck HTML ist
die Vorschau, der Druck und der Inhalt der Datei. Es gibt keine zweite
Fassung fuer die Vorschau, die auseinanderlaufen koennte.

Ausgabewege:
- Word (`.doc` als HTML mit Word-Kopf): oeffnet in Word und LibreOffice,
  mit Farben, Zeichen und QR-Codes als eingebettete PNG. Ausdruecklich
  kein `.docx` im Zip-Format.
- HTML-Datei zum Weitergeben, laesst sich im Browser als PDF speichern.
- CSV fuer Excel.
- Drucken, und im Druckfenster "Als PDF speichern".

Warum PDF ueber das Druckfenster: eine selbst gebaute PDF-Ausgabe
(jsPDF und Aehnliches) kann kein Arabisch setzen, weil sie die Buchstaben
nicht verbindet und die Richtung nicht dreht. Ein zweisprachiges Programm
darf in einer der beiden Sprachen keine kaputten Dateien erzeugen. Der
Weg ueber den Drucker liefert in beiden Sprachen ein sauberes PDF.

---

## Regeln, die ueberall gelten

- Datenbankzugriffe nur in `src/lib/api.ts`
- Codevergabe nur in der Datenbank, nie im Browser
- Jede Tabelle hat RLS, Zugriff haengt an der Mitgliedschaft
- Design ist eine eigene Schicht in `src/design`, loeschbar
- Texte kommen aus `src/lib/i18n`, jede Zeile in Deutsch und Arabisch
- Seriennummern bleiben in jeder Sprache gleich und von links nach rechts
- Kein stiller Fehlschlag: laedt, Fehler und leer sind drei Zustaende
