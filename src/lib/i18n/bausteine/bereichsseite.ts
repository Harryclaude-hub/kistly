import type { Woerterbuch } from '../woerter'

/* Die eigene Seite eines Zimmers oder einer Person.
 * Sie oeffnet sich wie eine Akte: oben das Kuerzel und die Farbe, darunter
 * alles, was zu diesem Bereich gehoert. */
export const bereichsseite: Woerterbuch = {
  'bereichsseite.laedt': { de: 'Bereich wird geladen', ar: 'جارٍ تحميل المنطقة' },
  'bereichsseite.nicht_gefunden': {
    de: 'Diesen Bereich gibt es in diesem Umzug nicht.',
    ar: 'هذه المنطقة غير موجودة في هذه النقلة.',
  },
  'bereichsseite.zurueck': { de: 'Zu den Bereichen', ar: 'إلى المناطق' },

  'bereichsseite.kisten': { de: 'Kisten in diesem Bereich', ar: 'الصناديق في هذه المنطقة' },
  'bereichsseite.moebel': { de: 'Moebel in diesem Zimmer', ar: 'الأثاث في هذه الغرفة' },
  'bereichsseite.keine_kisten': { de: 'Noch keine Kisten hier', ar: 'لا توجد صناديق هنا بعد' },
  'bereichsseite.keine_kisten_hinweis': {
    de: 'Neue Kisten bekommen das Kuerzel dieses Bereichs in ihrer Nummer.',
    ar: 'الصناديق الجديدة تأخذ رمز هذه المنطقة في رقمها.',
  },
  'bereichsseite.keine_moebel': { de: 'Noch keine Moebel hier', ar: 'لا يوجد أثاث هنا بعد' },
  'bereichsseite.kiste_anlegen': { de: 'Kiste hier anlegen', ar: 'إنشاء صندوق هنا' },
  'bereichsseite.moebel_anlegen': { de: 'Moebel hier anlegen', ar: 'إضافة أثاث هنا' },
  'bereichsseite.alle_zeigen': { de: 'Alle in der Kistenliste zeigen', ar: 'عرض الكل في قائمة الصناديق' },
  'bereichsseite.etiketten': { de: 'Etiketten fuer diesen Bereich', ar: 'ملصقات هذه المنطقة' },

  'bereichsseite.personen_hier': { de: 'Personen mit Kisten hier', ar: 'أشخاص لديهم صناديق هنا' },
  'bereichsseite.zimmer_dieser_person': { de: 'Zimmer dieser Person', ar: 'غرف هذا الشخص' },
  'bereichsseite.ohne_zimmer': { de: 'Ohne Zimmer', ar: 'بدون غرفة' },
  'bereichsseite.ohne_person': { de: 'Ohne Person', ar: 'بدون شخص' },

  'bereichsseite.fortschritt': {
    de: '{a} von {b} angekommen',
    ar: 'وصل {a} من أصل {b}',
  },
  'bereichsseite.zahl_unbekannt': {
    de: 'Anzahl unbekannt',
    ar: 'العدد غير معروف',
  },
  'bereichsseite.zahlen_laden': { de: 'Zahlen werden geladen', ar: 'جارٍ تحميل الأعداد' },
  'bereichsseite.zaehlwerte_fehler': {
    de: 'Zaehlwerte konnten nicht geladen werden.',
    ar: 'تعذّر تحميل الأعداد.',
  },
}
