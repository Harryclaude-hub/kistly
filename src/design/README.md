# Designschicht

Alles in diesem Ordner ist reine Optik. Hier steht keine Berechnung, keine
Datenabfrage, keine Reihenfolge. Nimmt man den Ordner weg, sieht die
Startseite schlicht aus und die App funktioniert unveraendert weiter.

| Datei | Was |
|---|---|
| `buehne.css` | warmer Grund, Kistenfarben, Knopfglanz, Glaskarten |
| `Kisten.tsx` | die gezeichneten Umzugskisten als SVG |
| `Buehne.tsx` | haengt die Hintergrundebenen ein und schreibt die Scrollhoehe nach `--sy` |
| `motion.tsx` | Bewegungsstufe und der Schalter dazu |

## Bewegungsstufen

Der Wert steht als `data-motion` am `html`-Element und wird in
`localStorage` unter `kistly.motion` gemerkt. Standard ist `normal`.

| Stufe | Was passiert | Kosten |
|---|---|---|
| `ruhig` | nichts bewegt sich, kein Scroll-Zuhoerer, keine Animation | keine |
| `normal` | Hintergrund steht fest, einzelne Ebenen gehen unterschiedlich weit mit | ein Wert pro Bild, vernachlaessigbar |
| `voll` | zusaetzlich driftende Kisten und atmende Lichter | Dauerbewegung, merkbar auf dem Akku |

Umschalten: Kopfzeile der Startseite oder Einstellungen, Abschnitt
Darstellung. Wer im Betriebssystem weniger Bewegung eingestellt hat, bekommt
sie nicht, unabhaengig von der Stufe.

## Farben

Alle Farben stehen als CSS-Variablen in `src/index.css`, nicht hier und
nicht im JavaScript. Wer den Kontrast anders will, aendert dort die Werte.

## Rueckweg

Soll die Buehne weg:

1. In `src/pages/Landing.tsx` die beiden Zeilen
   `import { Buehne } from '../design/Buehne'` und
   `import { MotionToggle } from '../design/motion'` loeschen, dazu
   `<Buehne />` und `<MotionToggle />` im Rumpf.
2. In `src/pages/Settings.tsx` den Import aus `../design/motion` und den
   Block "Bewegung" im Abschnitt Darstellung loeschen.
3. Ordner `src/design` loeschen.

Die Klassen `kn-glanz`, `kn-gross`, `kn-pfeil`, `karte-glas`,
`karte-glas-stark` und `band` sind dann wirkungslos, stoeren aber nicht.
Wer auch die wegraeumen will, entfernt sie aus `Landing.tsx`.

`src/main.tsx` setzt nur ein Attribut und bricht ohne diesen Ordner nicht.
