import type { Woerterbuch } from '../woerter'

/* Markieren, auswaehlen, verschieben und zusammenfuehren.
 *
 * Das gehoert zusammen: man waehlt Zeilen aus wie in einer Tabelle und
 * macht dann etwas mit allen auf einmal. Darum stehen die Woerter dafuer
 * auch in einem Baustein.
 */
export const marken: Woerterbuch = {
  /* ------------------------------------------------------- Markieren */
  'marken.titel': { de: 'Markieren', ar: 'التمييز' },
  'marken.markieren': { de: 'Markieren', ar: 'تمييز' },
  'marken.farbe': { de: 'Farbe', ar: 'اللون' },
  'marken.symbol': { de: 'Zeichen', ar: 'الرمز' },
  'marken.ohne_farbe': { de: 'Keine Farbe', ar: 'بدون لون' },
  'marken.ohne_symbol': { de: 'Kein Zeichen', ar: 'بدون رمز' },
  'marken.farbe_waehlen': { de: 'Farbe {farbe} waehlen', ar: 'اختيار اللون {farbe}' },
  'marken.zebra_hinweis': {
    de: 'Eine Zeile bleibt heller, die naechste dunkler. Das gilt auch mit eigener Farbe, damit man beim Lesen die Spur nicht verliert.',
    ar: 'يبقى صف أفتح والذي يليه أغمق، حتى مع لون خاص، حتى لا تضيع عينك أثناء القراءة.',
  },
  'marken.gesetzt': { de: 'Markierung gesetzt', ar: 'تم وضع التمييز' },
  'marken.entfernt': { de: 'Markierung entfernt', ar: 'تم إزالة التمييز' },
  'marken.gehoert_der_zeile': {
    de: 'Die Markierung gehoert dieser Zeile. Die Farbe des Zimmers bleibt, wie sie ist.',
    ar: 'التمييز يخص هذا الصف. لون الغرفة يبقى كما هو.',
  },

  'marken.symbol_stern': { de: 'Stern', ar: 'نجمة' },
  'marken.symbol_haken': { de: 'Haken', ar: 'علامة صح' },
  'marken.symbol_achtung': { de: 'Achtung', ar: 'تنبيه' },
  'marken.symbol_herz': { de: 'Herz', ar: 'قلب' },
  'marken.symbol_flagge': { de: 'Flagge', ar: 'علم' },
  'marken.symbol_kreis': { de: 'Kreis', ar: 'دائرة' },
  'marken.symbol_blitz': { de: 'Blitz', ar: 'برق' },
  'marken.symbol_schloss': { de: 'Schloss', ar: 'قفل' },

  /* ------------------------------------------------------- Auswaehlen */
  'auswahl.modus_an': { de: 'Auswaehlen', ar: 'تحديد' },
  'auswahl.modus_aus': { de: 'Auswahl beenden', ar: 'إنهاء التحديد' },
  'auswahl.alle': { de: 'Alle', ar: 'الكل' },
  'auswahl.keine': { de: 'Keine', ar: 'لا شيء' },
  'auswahl.anzahl.eins': { de: '1 ausgewaehlt', ar: 'عنصر واحد محدّد' },
  'auswahl.anzahl.viele': { de: '{n} ausgewaehlt', ar: '{n} عناصر محدّدة' },
  'auswahl.nichts_gewaehlt': { de: 'Noch nichts ausgewaehlt', ar: 'لم يتم تحديد شيء بعد' },
  'auswahl.zeile_waehlen': { de: 'Zeile auswaehlen', ar: 'تحديد الصف' },
  'auswahl.hinweis': {
    de: 'Tippe die Zeilen an, die du meinst. Danach gilt jede Aktion fuer alle davon.',
    ar: 'اضغط على الصفوف التي تقصدها. بعدها يسري كل إجراء عليها جميعاً.',
  },

  /* ------------------------------------------------------ Verschieben */
  'verschieben.titel': { de: 'Verschieben', ar: 'نقل' },
  'verschieben.zimmer': { de: 'In dieses Zimmer', ar: 'إلى هذه الغرفة' },
  'verschieben.person': { de: 'Zu dieser Person', ar: 'إلى هذا الشخص' },
  'verschieben.unveraendert': { de: 'Nicht aendern', ar: 'بدون تغيير' },
  'verschieben.abhaengen': { de: 'Abhaengen', ar: 'إزالة الربط' },
  'verschieben.code_hinweis': {
    de: 'Die Nummer wird neu vergeben, weil das Kuerzel wechselt. Das alte Etikett bleibt scannbar.',
    ar: 'سيُعاد إصدار الرقم لأن الرمز يتغيّر. الملصق القديم يبقى قابلاً للمسح.',
  },
  'verschieben.erledigt.eins': { de: '1 Kiste verschoben', ar: 'تم نقل صندوق واحد' },
  'verschieben.erledigt.viele': { de: '{n} Kisten verschoben', ar: 'تم نقل {n} صناديق' },
  'verschieben.teilweise': {
    de: '{ok} verschoben, {fehler} nicht. Grund: {grund}',
    ar: 'تم نقل {ok}، وفشل {fehler}. السبب: {grund}',
  },
  'verschieben.nichts_gewaehlt': {
    de: 'Waehle ein Zimmer oder eine Person aus.',
    ar: 'اختر غرفة أو شخصاً.',
  },

  /* -------------------------------------------------- Zusammenfuehren */
  'zusammen.titel': { de: 'Bereiche zusammenfuehren', ar: 'دمج المناطق' },
  'zusammen.knopf': { de: 'Zusammenfuehren', ar: 'دمج' },
  'zusammen.ziel': { de: 'Alles kommt hierhin', ar: 'كل شيء ينتقل إلى هنا' },
  'zusammen.ziel_waehlen': { de: 'Ziel waehlen', ar: 'اختر الوجهة' },
  'zusammen.warnung': {
    de: 'Alles aus {von} haengt danach an {nach}, und {von} verschwindet. Die Nummern werden neu vergeben, die alten Etiketten bleiben scannbar. Rueckgaengig geht das nicht.',
    ar: 'كل ما في {von} سينتقل إلى {nach}، ثم تختفي {von}. ستُعاد إصدار الأرقام، والملصقات القديمة تبقى قابلة للمسح. لا يمكن التراجع.',
  },
  'zusammen.erledigt.eins': { de: '1 Eintrag umgehaengt', ar: 'تم نقل عنصر واحد' },
  'zusammen.erledigt.viele': { de: '{n} Eintraege umgehaengt', ar: 'تم نقل {n} عناصر' },
  'zusammen.kein_ziel': {
    de: 'Es gibt keinen zweiten Bereich derselben Art.',
    ar: 'لا توجد منطقة أخرى من النوع نفسه.',
  },

  /* ------------------------------------------- Inhalt in andere Kiste */
  'inhalt.verschieben': { de: 'In andere Kiste', ar: 'إلى صندوق آخر' },
  'inhalt.ziel_waehlen': { de: 'In welche Kiste?', ar: 'إلى أي صندوق؟' },
  'inhalt.verschoben': { de: '{text} liegt jetzt in {code}', ar: '{text} أصبح الآن في {code}' },
  'inhalt.suche': { de: 'Nummer oder Titel suchen', ar: 'ابحث برقم أو عنوان' },
  'inhalt.keine_kisten': { de: 'Keine andere Kiste gefunden.', ar: 'لم يُعثر على صندوق آخر.' },
}
