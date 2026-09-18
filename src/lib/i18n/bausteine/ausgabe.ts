import type { Woerterbuch } from '../woerter'

/* Drucken und Ausgeben.
 *
 * Die Vorschau zeigt genau das HTML, das auch gedruckt und in die Datei
 * geschrieben wird. Darum reden diese Woerter nur ueber das, was auf dem
 * Blatt landet.
 */
export const ausgabe: Woerterbuch = {
  'ausgabe.titel': { de: 'Drucken und Ausgeben', ar: 'الطباعة والإخراج' },
  'ausgabe.untertitel': {
    de: 'Erst die Vorschau, dann aufs Papier oder in eine Datei',
    ar: 'أولاً المعاينة، ثم إلى الورق أو إلى ملف',
  },
  'ausgabe.laedt': { de: 'Daten werden geladen', ar: 'جارٍ تحميل البيانات' },
  'ausgabe.leer': {
    de: 'Mit diesen Einstellungen bleibt das Blatt leer.',
    ar: 'بهذه الإعدادات ستبقى الورقة فارغة.',
  },

  'ausgabe.spalte_qr': { de: 'QR', ar: 'QR' },
  'ausgabe.spalte_code': { de: 'Nummer', ar: 'الرقم' },
  'ausgabe.spalte_titel': { de: 'Bezeichnung', ar: 'التسمية' },
  'ausgabe.spalte_zimmer': { de: 'Zimmer', ar: 'الغرفة' },
  'ausgabe.spalte_person': { de: 'Person', ar: 'الشخص' },
  'ausgabe.spalte_groesse': { de: 'Größe', ar: 'الحجم' },
  'ausgabe.spalte_status': { de: 'Status', ar: 'الحالة' },
  'ausgabe.spalte_inhalt': { de: 'Inhalt', ar: 'المحتوى' },
  'ausgabe.spalte_notiz': { de: 'Notiz', ar: 'ملاحظة' },
  'ausgabe.fusszeile': { de: '{n} Zeilen. Erstellt mit Kistly.', ar: '{n} صفوف. أُنشئت بواسطة Kistly.' },

  'ausgabe.was_drauf': { de: 'Was aufs Blatt kommt', ar: 'ما الذي يظهر على الورقة' },
  'ausgabe.spalten': { de: 'Spalten', ar: 'الأعمدة' },
  'ausgabe.spalten_hinweis': {
    de: 'Tipp die Spalten an, die du brauchst. Die Vorschau ändert sich sofort.',
    ar: 'اضغط على الأعمدة التي تحتاجها. تتغيّر المعاينة فوراً.',
  },
  'ausgabe.gestaltung': { de: 'Gestaltung', ar: 'التنسيق' },
  'ausgabe.farben': { de: 'Farben mitdrucken', ar: 'طباعة الألوان' },
  'ausgabe.farben_hinweis': {
    de: 'Zimmerfarbe, Personenfarbe und eigene Markierung. Aus ergibt ein schlichtes Blatt, das auch in Schwarzweiß gut aussieht.',
    ar: 'لون الغرفة ولون الشخص والتمييز الخاص. عند الإيقاف تحصل على ورقة بسيطة تظهر جيداً بالأبيض والأسود.',
  },
  'ausgabe.symbole': { de: 'Zeichen mitdrucken', ar: 'طباعة الرموز' },
  'ausgabe.symbole_hinweis': {
    de: 'Das Zeichen der Markierung steht neben der Nummer.',
    ar: 'يظهر رمز التمييز بجانب الرقم.',
  },
  'ausgabe.schlicht': { de: 'Schlicht', ar: 'بسيط' },
  'ausgabe.schlicht_hinweis': {
    de: 'Ohne Farben und ohne Zeichen, nur die Angaben.',
    ar: 'بدون ألوان وبدون رموز، المعلومات فقط.',
  },
  'ausgabe.zebra_immer': {
    de: 'Eine Zeile bleibt heller, die nächste dunkler. Das gilt immer, auch schlicht und auch mit eigenen Farben.',
    ar: 'يبقى صف أفتح والذي يليه أغمق. هذا ثابت دائماً، في الوضع البسيط ومع الألوان الخاصة أيضاً.',
  },
  'ausgabe.papier': { de: 'Papierformat', ar: 'حجم الورق' },
  'ausgabe.qr_groesse': { de: 'Größe des QR-Codes', ar: 'حجم رمز QR' },
  'ausgabe.qr_mass': { de: '{n} Punkte', ar: '{n} نقطة' },

  'ausgabe.auswahl': { de: 'Was ausgegeben wird', ar: 'ما سيتم إخراجه' },
  'ausgabe.nur_markierte': { de: 'Nur markierte Zeilen', ar: 'الصفوف المميّزة فقط' },
  'ausgabe.mit_moebeln': { de: 'Möbel mitnehmen', ar: 'تضمين الأثاث' },
  'ausgabe.anzahl.eins': { de: '1 Zeile kommt aufs Blatt', ar: 'صف واحد على الورقة' },
  'ausgabe.anzahl.viele': { de: '{n} Zeilen kommen aufs Blatt', ar: '{n} صفوف على الورقة' },

  'ausgabe.vorschau': { de: 'Vorschau', ar: 'المعاينة' },
  'ausgabe.vorschau_hinweis': {
    de: 'Genau das kommt aufs Papier und genau das steht in der Datei.',
    ar: 'هذا بالضبط ما سيُطبع وما سيكون في الملف.',
  },

  'ausgabe.drucken': { de: 'Drucken', ar: 'طباعة' },
  'ausgabe.pdf_hinweis': {
    de: 'Im Druckfenster steht "Als PDF speichern". Das gibt ein sauberes PDF, auch auf Arabisch.',
    ar: 'في نافذة الطباعة اختر "حفظ كـ PDF". هذا يعطي ملف PDF نظيفاً، بالعربية أيضاً.',
  },
  'ausgabe.word': { de: 'Word-Datei', ar: 'ملف Word' },
  'ausgabe.word_hinweis': {
    de: 'Öffnet sich in Word und in LibreOffice und lässt sich dort weiterschreiben.',
    ar: 'يفتح في Word وفي LibreOffice ويمكن متابعة الكتابة فيه.',
  },
  'ausgabe.html': { de: 'HTML-Datei', ar: 'ملف HTML' },
  'ausgabe.html_hinweis': {
    de: 'Eine Datei zum Weitergeben. Sie öffnet sich in jedem Browser und lässt sich von dort als PDF speichern.',
    ar: 'ملف للمشاركة. يفتح في أي متصفّح ويمكن حفظه منه كـ PDF.',
  },
  'ausgabe.csv': { de: 'Tabelle als CSV', ar: 'جدول CSV' },
  'ausgabe.csv_hinweis': {
    de: 'Für Excel und Google Tabellen.',
    ar: 'لبرنامج Excel وجداول Google.',
  },
  'ausgabe.etiketten_statt': {
    de: 'Einzelne Etiketten mit großem QR-Code gibt es im Etikettenbereich.',
    ar: 'الملصقات المفردة برمز QR كبير موجودة في قسم الملصقات.',
  },
  'ausgabe.datei_fertig': { de: 'Datei wurde erzeugt', ar: 'تم إنشاء الملف' },
}
