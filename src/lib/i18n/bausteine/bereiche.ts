import type { Woerterbuch } from '../woerter'

/* Seite Bereiche: Zimmer und Personen mit Kuerzel und Farbe.
 * Namen, Kuerzel und Notizen der Nutzer bleiben unveraendert, hier stehen
 * nur die Texte der Oberflaeche. */
export const bereiche: Woerterbuch = {
  // ------------------------------------------------------------- Kopfzeile
  'bereiche.untertitel': {
    de: 'Zimmer und Personen mit Kuerzel und Farbe',
    ar: 'الغرف والأشخاص مع رمز ولون',
  },
  'bereiche.erklaerung': {
    de: 'Das Kuerzel steht vorne auf jeder Nummer. Wohnzimmer mit dem Kuerzel W ergibt Kisten wie W-3-001. Jedes Kuerzel darf es in diesem Umzug nur einmal geben, egal ob Zimmer oder Person.',
    ar: 'الرمز يظهر في بداية كل رقم. غرفة الجلوس بالرمز W تعطي صناديق مثل W-3-001. كل رمز يُستخدم مرة واحدة فقط في هذه النقلة، سواء كان لغرفة أو لشخص.',
  },

  // -------------------------------------------------------------- Abschnitte
  'bereiche.zimmer_titel': { de: 'Zimmer und Bereiche', ar: 'الغرف والمناطق' },
  'bereiche.leer_zimmer_titel': { de: 'Noch kein Zimmer', ar: 'لا توجد غرفة بعد' },
  'bereiche.leer_zimmer_hinweis': {
    de: 'Wohnzimmer, Kueche, Keller. Jedes bekommt ein Kuerzel und eine Farbe.',
    ar: 'غرفة الجلوس، المطبخ، القبو. كل واحدة تأخذ رمزًا ولونًا.',
  },
  'bereiche.leer_person_titel': { de: 'Noch keine Person', ar: 'لا يوجد شخص بعد' },
  'bereiche.leer_person_hinweis': {
    de: 'Wem gehoert die Kiste? Personen bekommen genau wie Zimmer ein Kuerzel.',
    ar: 'لمن الصندوق؟ الأشخاص يأخذون رمزًا مثل الغرف تمامًا.',
  },

  // ------------------------------------------------------------- Kistenzahl
  'bereiche.anzahl_fehlt': { de: 'Anzahl nicht geladen', ar: 'تعذّر تحميل العدد' },
  'bereiche.wird_gezaehlt': { de: 'wird gezaehlt', ar: 'جارٍ العد' },
  'bereiche.anzahl_fehler': {
    de: 'Die Anzahl der Kisten konnte nicht geladen werden. {grund}',
    ar: 'تعذّر تحميل عدد الصناديق. {grund}',
  },

  // ------------------------------------------------------------- Zeile
  'bereiche.bearbeiten_label': { de: '{name} bearbeiten', ar: 'تعديل {name}' },
  'bereiche.loeschen_label': { de: '{name} loeschen', ar: 'حذف {name}' },

  // ------------------------------------------------------------- Farbwahl
  'bereiche.farbe_waehlen': { de: 'Farbe {farbe}', ar: 'اللون {farbe}' },
  'bereiche.eigene_farbe': { de: 'Eigene Farbe', ar: 'لون مخصص' },

  // --------------------------------------------------------------- Dialog
  'bereiche.dialog_bearbeiten': { de: 'Bereich bearbeiten', ar: 'تعديل المنطقة' },
  'bereiche.dialog_neues_zimmer': { de: 'Neues Zimmer', ar: 'غرفة جديدة' },
  'bereiche.dialog_neue_person': { de: 'Neue Person', ar: 'شخص جديد' },
  'bereiche.name_platzhalter_zimmer': { de: 'Kinderzimmer', ar: 'غرفة الأطفال' },
  'bereiche.name_platzhalter_person': { de: 'Sara', ar: 'سارة' },
  'bereiche.kuerzel_hinweis': {
    de: '1 bis 4 Zeichen. Steht vorne auf jeder Kistennummer.',
    ar: 'من 1 إلى 4 خانات. تظهر في بداية رقم كل صندوق.',
  },
  // Das Kuerzel besteht immer aus lateinischen Zeichen, darum bleibt der
  // Platzhalter in beiden Sprachen gleich.
  'bereiche.kuerzel_platzhalter': { de: 'KZ', ar: 'KZ' },
  'bereiche.farbe_hinweis': {
    de: 'Wird auf dem Etikett als Balken gedruckt.',
    ar: 'يُطبع على الملصق كشريط ملوّن.',
  },
  'bereiche.notiz_hinweis': {
    de: 'Optional, zum Beispiel wohin es in der neuen Wohnung soll.',
    ar: 'اختياري، مثلًا إلى أين يذهب في البيت الجديد.',
  },
  'bereiche.vorschau': { de: 'So sieht die Nummer aus', ar: 'هكذا يبدو الرقم' },

  // ---------------------------------------------------------- Pruefung
  'bereiche.fehler_name': { de: 'Name fehlt.', ar: 'الاسم ناقص.' },
  'bereiche.fehler_kuerzel': {
    de: 'Das Kuerzel darf 1 bis 4 Buchstaben oder Ziffern haben.',
    ar: 'الرمز يتكوّن من 1 إلى 4 أحرف أو أرقام.',
  },
  'bereiche.fehler_kuerzel_belegt': {
    de: 'Das Kuerzel {kuerzel} gehoert schon zu {name}.',
    ar: 'الرمز {kuerzel} يخص {name} بالفعل.',
  },

  // ---------------------------------------------------------------- Meldungen
  'bereiche.gespeichert': { de: 'Bereich gespeichert', ar: 'تم حفظ المنطقة' },
  'bereiche.angelegt': { de: 'Bereich angelegt', ar: 'تم إنشاء المنطقة' },
  'bereiche.geloescht': { de: 'Bereich geloescht', ar: 'تم حذف المنطقة' },

  // ------------------------------------------------------------ Loeschabfrage
  'bereiche.loeschen_titel': { de: '{name} loeschen', ar: 'حذف {name}' },
  'bereiche.loeschen_unbekannt': {
    de: 'Wie viele Kisten zu diesem Bereich gehoeren, ist gerade nicht bekannt. Die Kisten bleiben bestehen, verlieren aber die Zuordnung und behalten ihren bisherigen Code. Wirklich loeschen?',
    ar: 'عدد الصناديق التابعة لهذه المنطقة غير معروف الآن. الصناديق تبقى كما هي، لكنها تفقد الارتباط وتحتفظ برمزها الحالي. هل تريد الحذف فعلًا؟',
  },
  'bereiche.loeschen_mit_kisten': {
    de: 'Dieser Bereich hat {kisten}. Die Kisten bleiben bestehen, verlieren aber die Zuordnung und behalten ihren bisherigen Code. Wirklich loeschen?',
    ar: 'لهذه المنطقة {kisten}. الصناديق تبقى كما هي، لكنها تفقد الارتباط وتحتفظ برمزها الحالي. هل تريد الحذف فعلًا؟',
  },
  'bereiche.loeschen_leer': {
    de: 'Der Bereich wird entfernt. Das laesst sich nicht rueckgaengig machen.',
    ar: 'سيتم حذف المنطقة. لا يمكن التراجع عن ذلك.',
  },
}
