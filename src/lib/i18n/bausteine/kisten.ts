import type { Woerterbuch } from '../woerter'

/* Kistenliste und Kistenansicht.
 *
 * Jeder Schluessel beginnt mit kisten., damit sich nichts mit einem anderen
 * Baustein ueberschneidet. Status, Kistenart und die Groessenwoerter stehen
 * schon in gemeinsam.ts und werden von hier aus nur benutzt.
 *
 * Seriennummern und Kuerzel bleiben immer unveraendert, sie stehen nur als
 * Platzhalter in den Texten.
 */
export const kisten: Woerterbuch = {
  // ----------------------------------------------------- Suche und Filter
  'kisten.suche_platzhalter': { de: 'Code, Titel oder Notiz', ar: 'الرقم أو العنوان أو الملاحظة' },
  'kisten.suche_leeren': { de: 'Suche leeren', ar: 'مسح البحث' },
  'kisten.filter_gesetzt': { de: 'Filter, {n} gesetzt', ar: 'التصفية، {n} مفعّلة' },
  'kisten.filter_oeffnen': { de: 'Filter oeffnen', ar: 'فتح التصفية' },
  'kisten.filter_schliessen': { de: 'Filter schliessen', ar: 'إغلاق التصفية' },
  'kisten.filter_zuruecksetzen': { de: 'Filter zuruecksetzen', ar: 'إلغاء التصفية' },
  'kisten.alle_zimmer': { de: 'Alle Zimmer', ar: 'كل الغرف' },
  'kisten.alle_personen': { de: 'Alle Personen', ar: 'كل الأشخاص' },
  'kisten.sortierung': { de: 'Sortierung', ar: 'الترتيب' },
  'kisten.sort_code': { de: 'Nach Nummer', ar: 'حسب الرقم' },
  'kisten.sort_neueste': { de: 'Neueste zuerst', ar: 'الأحدث أولاً' },
  'kisten.sort_groesste': { de: 'Groesste zuerst', ar: 'الأكبر أولاً' },

  // -------------------------------------------------------------- Liste
  'kisten.laedt': { de: 'Kisten werden geladen', ar: 'جارٍ تحميل الصناديق' },
  'kisten.leer_titel': { de: 'Noch keine Kiste', ar: 'لا يوجد صندوق بعد' },
  'kisten.leer_hinweis': {
    de: 'Lege die erste Kiste an. Die Nummer vergibt Kistly selbst.',
    ar: 'أنشئ أول صندوق. Kistly يعطيه رقمه تلقائيًا.',
  },
  'kisten.leer_filter': {
    de: 'Zu diesem Filter passt gerade nichts. Setz den Filter zurueck.',
    ar: 'لا شيء يطابق هذه التصفية. ألغِ التصفية.',
  },
  'kisten.leer_suche': {
    de: 'Zu dieser Suche passt gerade keine Kiste. Leere die Suche.',
    ar: 'لا يوجد صندوق يطابق هذا البحث. امسح البحث.',
  },
  'kisten.erste': { de: 'Erste Kiste', ar: 'أول صندوق' },
  'kisten.nach_ziel': { de: 'nach {ziel}', ar: 'إلى {ziel}' },
  'kisten.geladen_von': { de: '{a} von {b} geladen', ar: 'تم تحميل {a} من {b}' },
  'kisten.alle_geladen': { de: 'Alle {n} Kisten geladen', ar: 'تم تحميل كل الصناديق، {n}' },

  // ------------------------------------------------------------ Groesse
  'kisten.groesse_knopf': { de: 'Groesse {n}, {wort}', ar: 'الحجم {n}، {wort}' },
  'kisten.groesse_hinweis': {
    de: 'Die Ziffer steht rot mitten in der Nummer.',
    ar: 'تظهر خانة الحجم بالأحمر في وسط رقم الصندوق.',
  },

  // ------------------------------------------------------- Neue Kiste
  'kisten.neu': { de: 'Neue Kiste', ar: 'صندوق جديد' },
  'kisten.anzahl_anlegen': { de: '{n} anlegen', ar: 'إنشاء {n}' },
  'kisten.nummer_wird': { de: 'Die Nummer wird', ar: 'الرقم سيكون' },
  'kisten.nummer_hinweis': {
    de: 'Die letzten drei Ziffern vergibt Kistly selbst.',
    ar: 'الأرقام الثلاثة الأخيرة يضعها Kistly تلقائيًا.',
  },
  'kisten.kein_zimmer': { de: 'kein Zimmer', ar: 'بدون غرفة' },
  'kisten.keine_person': { de: 'keine Person', ar: 'بدون شخص' },
  'kisten.kuerzel_frage': { de: 'Welches Kuerzel steht vorne?', ar: 'أي رمز يأتي في البداية؟' },
  'kisten.kuerzel_hinweis': {
    de: 'Eine Kiste kann zu einem Zimmer und einer Person gehoeren. Die Nummer beginnt aber mit genau einem Kuerzel.',
    ar: 'يمكن أن ينتمي الصندوق إلى غرفة وإلى شخص معًا، لكن الرقم يبدأ برمز واحد فقط.',
  },
  'kisten.kuerzel_zimmer': { de: '{kuerzel} . Zimmer', ar: '{kuerzel} . غرفة' },
  'kisten.kuerzel_person': { de: '{kuerzel} . Person', ar: '{kuerzel} . شخص' },
  'kisten.art': { de: 'Art', ar: 'النوع' },
  'kisten.titel_hinweis': {
    de: 'Optional, zum Beispiel Buecher Regal links.',
    ar: 'اختياري، مثلاً كتب الرف الأيسر.',
  },
  'kisten.ziel': { de: 'Ziel in der neuen Wohnung', ar: 'المكان في البيت الجديد' },
  'kisten.ziel_platzhalter': { de: 'Arbeitszimmer oben', ar: 'مكتب الطابق العلوي' },
  'kisten.anzahl': { de: 'Anzahl', ar: 'العدد' },
  'kisten.anzahl_hinweis': {
    de: 'Mehrere gleiche Kisten auf einmal anlegen, maximal 50.',
    ar: 'إنشاء عدة صناديق متشابهة دفعة واحدة، 50 كحد أقصى.',
  },
  'kisten.zerbrechlich_hinweis': {
    de: 'Wird auf dem Etikett hervorgehoben.',
    ar: 'يظهر بوضوح على الملصق.',
  },
  'kisten.fehler_kein_tag': {
    de: 'Waehle mindestens ein Zimmer oder eine Person.',
    ar: 'اختر غرفة أو شخصًا على الأقل.',
  },
  'kisten.angelegt': { de: '{code} angelegt', ar: 'تم إنشاء {code}' },
  'kisten.mehrere_angelegt': {
    de: '{n} Kisten angelegt, {von} bis {bis}',
    ar: 'تم إنشاء {n} صناديق، من {von} إلى {bis}',
  },
  'kisten.ist_angekommen': { de: '{code} ist angekommen', ar: 'وصل {code}' },

  // ---------------------------------------------------------- CSV-Datei
  'kisten.csv_code': { de: 'Code', ar: 'الرقم' },
  'kisten.ja': { de: 'ja', ar: 'نعم' },
  'kisten.nein': { de: 'nein', ar: 'لا' },
  'kisten.nichts_zu_exportieren': {
    de: 'Es gibt noch nichts zu exportieren.',
    ar: 'لا يوجد شيء لتصديره بعد.',
  },
  'kisten.exportiert': { de: '{n} Kisten exportiert', ar: 'تم تصدير {n} صندوق' },

  // ------------------------------------------------------- Kistenansicht
  'kisten.kiste_laedt': { de: 'Kiste wird geladen', ar: 'جارٍ تحميل الصندوق' },
  'kisten.nicht_gefunden': { de: 'Diese Kiste gibt es nicht mehr.', ar: 'هذا الصندوق لم يعد موجودًا.' },
  'kisten.zur_liste': { de: 'Zur Kistenliste', ar: 'إلى قائمة الصناديق' },
  'kisten.bearbeiten': { de: 'Kiste bearbeiten', ar: 'تعديل الصندوق' },
  'kisten.loeschen': { de: 'Kiste loeschen', ar: 'حذف الصندوق' },
  'kisten.art_und_groesse': {
    de: '{art}, Groesse {n} von 10, {wort}',
    ar: '{art}، الحجم {n} من 10، {wort}',
  },
  'kisten.ohne_zuordnung': { de: 'Ohne Zimmer und Person', ar: 'بدون غرفة أو شخص' },
  'kisten.ohne_zuordnung_hinweis': {
    de: 'Beides laesst sich beim Bearbeiten setzen.',
    ar: 'يمكن تحديدهما عند التعديل.',
  },
  'kisten.zerbrechlich_warnung': {
    de: 'Zerbrechlich, bitte vorsichtig tragen',
    ar: 'قابل للكسر، يُرجى الحمل بحذر',
  },
  'kisten.link_kopieren': { de: 'Link kopieren', ar: 'نسخ الرابط' },
  'kisten.link_kopiert': { de: 'Link kopiert', ar: 'تم نسخ الرابط' },
  'kisten.kopieren_fehler': { de: 'Kopieren nicht moeglich: {grund}', ar: 'تعذّر النسخ: {grund}' },
  'kisten.druckansicht': { de: 'Druckansicht', ar: 'عرض الطباعة' },
  'kisten.angekommen_am': { de: 'Angekommen: {wann}', ar: 'وصل: {wann}' },

  // ------------------------------------------------------------- Inhalt
  'kisten.inhalt_leer': {
    de: 'Noch nichts eingetragen. Was hier steht, landet auf Wunsch mit auf dem Etikett.',
    ar: 'لم يُسجَّل شيء بعد. ما تكتبه هنا يمكن أن يظهر على الملصق.',
  },
  'kisten.abhaken': { de: 'Abhaken', ar: 'وضع علامة' },
  'kisten.haken_entfernen': { de: 'Haken entfernen', ar: 'إزالة العلامة' },
  'kisten.eintrag_loeschen': { de: 'Eintrag loeschen', ar: 'حذف الإدخال' },
  'kisten.eintrag_hinzufuegen': { de: 'Eintrag hinzufuegen', ar: 'إضافة إدخال' },
  'kisten.inhalt_platzhalter': { de: 'Was ist drin?', ar: 'ما الذي بداخله؟' },

  // -------------------------------------------------------------- Fotos
  'kisten.foto': { de: 'Foto', ar: 'صورة' },
  'kisten.foto_aufnehmen': { de: 'Foto aufnehmen', ar: 'التقاط صورة' },
  'kisten.foto_alt': { de: 'Foto der Kiste', ar: 'صورة الصندوق' },
  'kisten.foto_loeschen': { de: 'Foto loeschen', ar: 'حذف الصورة' },
  'kisten.fotos_leer': { de: 'Noch kein Foto vom Inhalt', ar: 'لا توجد صورة للمحتويات بعد' },
  'kisten.fotos_hinweis': {
    de: 'Bilder lassen sich hierher ziehen oder mit Strg und V einfuegen.',
    ar: 'يمكن سحب الصور إلى هنا أو لصقها بـ Ctrl و V.',
  },
  'kisten.hier_ablegen': { de: 'Bilder hier ablegen', ar: 'أفلت الصور هنا' },
  'kisten.bild': { de: 'Bild', ar: 'صورة' },
  'kisten.bild_fehlt': { de: 'Bild nicht ladbar', ar: 'تعذّر تحميل الصورة' },
  'kisten.fotos_fehlen.eins': {
    de: 'Ein Foto laesst sich gerade nicht laden.',
    ar: 'تعذّر تحميل صورة واحدة.',
  },
  'kisten.fotos_fehlen.viele': {
    de: '{n} Fotos lassen sich gerade nicht laden.',
    ar: 'تعذّر تحميل {n} صور.',
  },
  'kisten.fotos_hinzugefuegt.eins': { de: 'Ein Foto hinzugefuegt', ar: 'تمت إضافة صورة' },
  'kisten.fotos_hinzugefuegt.viele': { de: '{n} Fotos hinzugefuegt', ar: 'تمت إضافة {n} صور' },
  'kisten.kein_bild.eins': {
    de: 'Eine Datei war kein Bild und wurde uebersprungen',
    ar: 'ملف واحد لم يكن صورة، فتم تخطيه',
  },
  'kisten.kein_bild.viele': {
    de: '{n} Dateien waren kein Bild und wurden uebersprungen',
    ar: 'تم تخطي {n} ملفات لأنها ليست صورًا',
  },
  'kisten.upload_fehler': { de: 'Nicht hochgeladen: {liste}', ar: 'لم يتم الرفع: {liste}' },

  // ------------------------------------------------------------ Verlauf
  'kisten.verlauf_laedt': { de: 'Verlauf wird geladen', ar: 'جارٍ تحميل السجل' },
  'kisten.verlauf_leer': { de: 'Noch nichts passiert.', ar: 'لم يحدث شيء بعد.' },
  'kisten.jemand': { de: 'Jemand', ar: 'شخص ما' },
  'kisten.ev_created': { de: 'hat die Kiste angelegt', ar: 'أنشأ الصندوق' },
  'kisten.ev_status': { de: 'hat {status} gesetzt', ar: 'غيّر الحالة إلى {status}' },
  'kisten.ev_scan': { de: 'hat gescannt', ar: 'قام بالمسح' },
  'kisten.ev_code': { de: 'hat den Code geaendert:', ar: 'غيّر الرقم:' },

  // --------------------------------------------------- Bearbeiten und Loeschen
  'kisten.code_hinweis': {
    de: 'Aenderst du Groesse oder Kuerzel, vergibt Kistly einen neuen Code. Der alte bleibt gespeichert, damit ein schon geklebtes Etikett weiter gefunden wird.',
    ar: 'إذا غيّرت الحجم أو الرمز، يعطي Kistly رقمًا جديدًا. يبقى القديم محفوظًا حتى يظل الملصق الملصوق قابلاً للعثور عليه.',
  },
  'kisten.kuerzel_im_code': { de: 'Kuerzel im Code', ar: 'الرمز في رقم الصندوق' },
  'kisten.kuerzel_option_zimmer': { de: 'Zimmer ({kuerzel})', ar: 'الغرفة ({kuerzel})' },
  'kisten.kuerzel_option_person': { de: 'Person ({kuerzel})', ar: 'الشخص ({kuerzel})' },
  'kisten.loeschen_titel': { de: '{code} loeschen', ar: 'حذف {code}' },
  'kisten.loeschen_text': {
    de: 'Die Kiste, ihr Inhalt, die Fotos und der Verlauf werden geloescht. Das laesst sich nicht rueckgaengig machen.',
    ar: 'سيُحذف الصندوق ومحتوياته وصوره وسجله. لا يمكن التراجع عن ذلك.',
  },
  'kisten.geloescht': { de: 'Kiste geloescht', ar: 'تم حذف الصندوق' },
}
