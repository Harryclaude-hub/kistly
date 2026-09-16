/* Gezeichnete Umzugskisten fuer den Hintergrund.
 *
 * Reine Optik, keine Logik. Flache Formen, warme Farben, kein Neon.
 * Die Farben kommen aus CSS-Variablen in buehne.css, damit hell und dunkel
 * dieselben Zeichnungen benutzen koennen.
 */

/** Gefalteter Karton mit Klebeband und Grifflaschen. */
export function Karton({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 136" className={className} aria-hidden="true">
      {/* Schatten auf dem Boden */}
      <ellipse cx="80" cy="128" rx="58" ry="7" fill="var(--kiste-schatten)" />

      {/* Korpus */}
      <rect x="16" y="46" width="128" height="80" rx="7" fill="var(--karton)" />
      {/* Rechte Seite etwas dunkler, das gibt Koerper */}
      <path
        d="M112 46 h25 a7 7 0 0 1 7 7 v66 a7 7 0 0 1 -7 7 h-25 z"
        fill="var(--karton-schatten)"
      />

      {/* Deckelklappen, leicht geoeffnet */}
      <path d="M12 46 L34 28 h44 v18 z" fill="var(--karton-klappe)" />
      <path d="M148 46 L126 28 H82 v18 z" fill="var(--karton-klappe-2)" />

      {/* Klebeband in der Mitte */}
      <rect x="72" y="46" width="16" height="80" fill="var(--karton-band)" />
      <rect x="66" y="40" width="28" height="9" rx="2" fill="var(--karton-band)" />

      {/* Grifflasche */}
      <rect x="34" y="82" width="30" height="10" rx="5" fill="var(--karton-schlitz)" />
    </svg>
  )
}

/** Stapelbare Plastikkiste mit Rippen und Griffausschnitten. */
export function Plastikkiste({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 130" className={className} aria-hidden="true">
      <ellipse cx="80" cy="123" rx="56" ry="6" fill="var(--kiste-schatten)" />

      {/* Korpus, unten etwas schmaler, damit sie stapelbar aussieht */}
      <path
        d="M22 44 h116 l-9 72 a6 6 0 0 1 -6 5 H37 a6 6 0 0 1 -6 -5 z"
        fill="var(--plastik)"
      />
      {/* Rand oben */}
      <rect x="14" y="34" width="132" height="14" rx="7" fill="var(--plastik-rand)" />

      {/* Rippen */}
      <rect x="46" y="58" width="7" height="48" rx="3.5" fill="var(--plastik-rippe)" />
      <rect x="76" y="58" width="7" height="48" rx="3.5" fill="var(--plastik-rippe)" />
      <rect x="106" y="58" width="7" height="48" rx="3.5" fill="var(--plastik-rippe)" />

      {/* Griffausschnitt */}
      <rect x="62" y="62" width="36" height="11" rx="5.5" fill="var(--plastik-griff)" />
    </svg>
  )
}

/** Zwei gestapelte Kartons, kleiner obendrauf. */
export function Stapel({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 150 160" className={className} aria-hidden="true">
      <ellipse cx="75" cy="152" rx="54" ry="7" fill="var(--kiste-schatten)" />

      {/* Unterer Karton */}
      <rect x="14" y="80" width="122" height="70" rx="7" fill="var(--karton)" />
      <path
        d="M104 80 h25 a7 7 0 0 1 7 7 v56 a7 7 0 0 1 -7 7 h-25 z"
        fill="var(--karton-schatten)"
      />
      <rect x="67" y="80" width="15" height="70" fill="var(--karton-band)" />

      {/* Oberer Karton, kleiner und leicht verdreht */}
      <g transform="rotate(-4 75 48)">
        <rect x="30" y="20" width="90" height="58" rx="6" fill="var(--karton-hell)" />
        <path
          d="M96 20 h18 a6 6 0 0 1 6 6 v46 a6 6 0 0 1 -6 6 H96 z"
          fill="var(--karton-schatten)"
        />
        <rect x="68" y="20" width="13" height="58" fill="var(--karton-band)" />
        <rect x="42" y="44" width="22" height="8" rx="4" fill="var(--karton-schlitz)" />
      </g>
    </svg>
  )
}
