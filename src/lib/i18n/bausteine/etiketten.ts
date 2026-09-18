import type { Woerterbuch } from '../woerter'

/* Texte der Druckansicht.
 *
 * Auf dem Etikett selbst wird nur uebersetzt, was zum Programm gehoert:
 * die Groessenangabe, das Wort Zerbrechlich, das Ziel, der Status und die
 * Spaltenkoepfe der Inhaltstabelle. Zimmername, Personenname, Kistentitel
 * und die Inhaltszeilen hat der Nutzer eingetippt und bleiben stehen. Die
 * Seriennummer bleibt in jeder Sprache gleich.
 */
export const etiketten: Woerterbuch = {
  // ------------------------------------------------------------- Kopfzeile
  'etiketten.titel': { de: 'Etiketten', ar: 'الملصقات' },
  'etiketten.pro_seite': { de: '{n} pro Seite', ar: '{n} في الصفحة' },

  // --------------------------------------------------- Papier und Raster
  'etiketten.papier_mass': { de: '{name} . {b} x {h} mm', ar: '{name} . {b} × {h} مم' },
  'etiketten.pro_seite_mass': {
    de: '{n} pro Seite . {b} x {h} mm',
    ar: '{n} في الصفحة . {b} × {h} مم',
  },

  // ---------------------------------------- Was auf dem Etikett steht
  'etiketten.modus.nummer': {
    de: 'Nur die Seriennummer, sehr groß',
    ar: 'الرقم التسلسلي وحده، بخط كبير جدًا',
  },
  'etiketten.modus.qr': { de: 'Seriennummer und QR-Code', ar: 'الرقم التسلسلي ورمز QR' },
  'etiketten.modus.tabelle': {
    de: 'Seriennummer, QR-Code und Inhaltstabelle',
    ar: 'الرقم التسلسلي ورمز QR وجدول المحتويات',
  },

  // ------------------------------------------------------------- Auswahl
  'etiketten.welche_kisten': { de: 'Welche Kisten', ar: 'أي الصناديق' },
  'etiketten.nur_eine_kiste': {
    de: 'Es wird nur diese eine Kiste gedruckt. Ohne den Link oben kommst du zur vollständigen Auswahl.',
    ar: 'يُطبع هذا الصندوق وحده. افتح الملصقات من صفحة النقلة لترى كل الصناديق.',
  },
  'etiketten.alle_zimmer': { de: 'Alle Zimmer', ar: 'كل الغرف' },
  'etiketten.alle_personen': { de: 'Alle Personen', ar: 'كل الأشخاص' },

  // --------------------------------------------------- Papier und Inhalt
  'etiketten.papier_und_inhalt': { de: 'Papier und Inhalt', ar: 'الورق والمحتوى' },
  'etiketten.papierformat': { de: 'Papierformat', ar: 'حجم الورق' },
  'etiketten.papierformat_hinweis': {
    de: 'Dieses Format wird auch wirklich gedruckt.',
    ar: 'هذا الحجم هو ما يُطبع فعلًا.',
  },
  'etiketten.was_steht_drauf': { de: 'Was steht auf dem Etikett', ar: 'ماذا يظهر على الملصق' },
  'etiketten.pro_seite_label': { de: 'Etiketten pro Seite', ar: 'عدد الملصقات في الصفحة' },
  'etiketten.pro_seite_hinweis': {
    de: 'Dahinter steht die Kachelgröße.',
    ar: 'الرقم المجاور هو مقاس الملصق الواحد.',
  },

  // ---------------------------------------------------------- Feinheiten
  'etiketten.feinheiten': { de: 'Feinheiten', ar: 'ضبط دقيق' },
  'etiketten.standard': { de: 'Standard', ar: 'الافتراضي' },
  'etiketten.exemplare': { de: 'Exemplare je Kiste', ar: 'عدد النسخ لكل صندوق' },
  'etiketten.exemplare_hinweis': {
    de: 'Zwei Etiketten kleben auf zwei Seiten.',
    ar: 'نسختان تعنيان ملصقًا على جهتين من الصندوق.',
  },
  'etiketten.zeilen_inhalt': { de: 'Zeilen Inhalt', ar: 'أسطر المحتويات' },
  'etiketten.alles_anzeigen': { de: 'Alles anzeigen', ar: 'عرض الكل' },
  'etiketten.zeilen_n': { de: '{n} Zeilen', ar: '{n} أسطر' },

  // ------------------------------------------------------------ Schalter
  'etiketten.schalter_zimmername': { de: 'Zimmername', ar: 'اسم الغرفة' },
  'etiketten.schalter_farbbalken': { de: 'Farbbalken', ar: 'شريط اللون' },
  'etiketten.schalter_groesse': { de: 'Größe als Text', ar: 'الحجم ككلمة' },
  'etiketten.schalter_umzugsname': { de: 'Name des Umzugs', ar: 'اسم النقلة' },
  'etiketten.schalter_schnittlinien': { de: 'Schnittlinien', ar: 'خطوط القص' },

  // ---------------------------------------------------------- Zustaende
  'etiketten.kisten_laden': { de: 'Kisten werden geladen', ar: 'جارٍ تحميل الصناديق' },
  'etiketten.nichts_zu_drucken': { de: 'Nichts zu drucken', ar: 'لا شيء للطباعة' },
  'etiketten.leer_einzeln': {
    de: 'Diese Kiste gibt es nicht mehr. Öffne die Etiketten über den Umzug, dann siehst du alle Kisten.',
    ar: 'هذا الصندوق لم يعد موجودًا. افتح الملصقات من النقلة لترى كل الصناديق.',
  },
  'etiketten.leer_filter': {
    de: 'Zu dieser Auswahl gibt es keine Kisten. Ändere den Filter oder lege zuerst Kisten an.',
    ar: 'لا توجد صناديق مطابقة لهذا الاختيار. غيّر التصفية أو أنشئ صناديق أولًا.',
  },

  // ------------------------------------------------- Satz ueber der Vorschau
  'etiketten.keine_auswahl': { de: 'Noch keine Etiketten ausgewählt.', ar: 'لم يُختر أي ملصق بعد.' },
  'etiketten.anzahl.eins': { de: '{n} Etikett', ar: 'ملصق واحد' },
  'etiketten.anzahl.viele': { de: '{n} Etiketten', ar: '{n} ملصقات' },
  'etiketten.seiten.eins': { de: '{n} Seite', ar: 'صفحة واحدة' },
  'etiketten.seiten.viele': { de: '{n} Seiten', ar: '{n} صفحات' },
  'etiketten.vorschau_satz': {
    de: '{etiketten} auf {seiten} {format}, jedes Etikett {b} x {h} mm.',
    ar: '{etiketten} على {seiten} من مقاس {format}، كل ملصق {b} × {h} مم.',
  },
  'etiketten.druck_hinweis': {
    de: 'Im Druckfenster ist {format} schon vorgegeben. Hintergrundgrafiken einschalten, damit Farbbalken und rote Ziffer mitkommen.',
    ar: 'مقاس {format} مضبوط مسبقًا في نافذة الطباعة. فعّل طباعة الخلفيات كي يظهر شريط اللون والرقم الأحمر.',
  },

  // ----------------------------------------------- Auf dem Etikett selbst
  'etiketten.groesse_von_zehn': { de: 'Größe {n} von 10', ar: 'الحجم {n} من 10' },
  'etiketten.zerbrechlich': { de: 'ZERBRECHLICH', ar: 'قابل للكسر' },
  'etiketten.nach_ziel': { de: 'nach {ziel}', ar: 'إلى {ziel}' },
  'etiketten.kein_inhalt': { de: 'Kein Inhalt eingetragen', ar: 'لم تُسجَّل محتويات' },
  'etiketten.menge': { de: 'Menge', ar: 'الكمية' },
  'etiketten.bezeichnung': { de: 'Bezeichnung', ar: 'الصنف' },
  'etiketten.weitere_nicht_gedruckt': {
    de: 'weitere, hier nicht gedruckt',
    ar: 'أخرى غير مطبوعة هنا',
  },
}
