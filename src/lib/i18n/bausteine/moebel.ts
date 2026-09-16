import type { Woerterbuch } from '../woerter'

/* Moebel.
 *
 * Moebel sind in der Datenbank Eintraege in items mit kind = 'furniture'.
 * Darum heissen Nummer, Status, Zimmer und Person hier genauso wie bei den
 * Kisten. Neu sind nur die Angaben zum Stueck, die Seitenfotos, der
 * Teilekatalog und die Aufbauanleitung.
 */
export const moebel: Woerterbuch = {
  'moebel.titel': { de: 'Moebel', ar: 'الأثاث' },
  'moebel.untertitel': {
    de: 'Jedes Stueck mit Fotos von allen Seiten, Teilen und Anleitung',
    ar: 'كل قطعة بصورها من كل الجوانب وقطعها وتعليمات تركيبها',
  },
  'moebel.laedt': { de: 'Moebel werden geladen', ar: 'جارٍ تحميل الأثاث' },
  'moebel.nicht_gefunden': {
    de: 'Dieses Moebelstueck gibt es nicht.',
    ar: 'قطعة الأثاث هذه غير موجودة.',
  },
  'moebel.zur_liste': { de: 'Zu den Moebeln', ar: 'إلى الأثاث' },
  'moebel.anzahl.eins': { de: '1 Moebelstueck', ar: 'قطعة أثاث واحدة' },
  'moebel.anzahl.viele': { de: '{n} Moebelstuecke', ar: '{n} قطع أثاث' },

  'moebel.neu': { de: 'Neues Moebel', ar: 'أثاث جديد' },
  'moebel.name_platzhalter': { de: 'Esstisch, Kleiderschrank, Bett', ar: 'طاولة طعام، خزانة، سرير' },
  'moebel.angelegt': { de: '{code} angelegt', ar: 'تم إنشاء {code}' },
  'moebel.gespeichert': { de: 'Gespeichert', ar: 'تم الحفظ' },
  'moebel.leer_titel': { de: 'Noch keine Moebel', ar: 'لا يوجد أثاث بعد' },
  'moebel.leer_hinweis': {
    de: 'Leg jedes groessere Stueck einmal an. Danach kannst du jede Seite fotografieren, die Teile aufschreiben und die Anleitung dazulegen.',
    ar: 'أضف كل قطعة كبيرة مرة واحدة. بعدها يمكنك تصوير كل جانب وكتابة القطع وإرفاق التعليمات.',
  },
  'moebel.leer_filter': {
    de: 'In diesem Zimmer stehen keine Moebel.',
    ar: 'لا يوجد أثاث في هذه الغرفة.',
  },

  'moebel.angaben': { de: 'Angaben zum Stueck', ar: 'مواصفات القطعة' },
  'moebel.hersteller': { de: 'Hersteller', ar: 'الشركة المصنّعة' },
  'moebel.hersteller_platzhalter': { de: 'IKEA, Tischler, unbekannt', ar: 'إيكيا، نجّار، غير معروف' },
  'moebel.modell': { de: 'Modell', ar: 'الطراز' },
  'moebel.modell_platzhalter': { de: 'PAX, NORDEN', ar: 'PAX، NORDEN' },
  'moebel.masse': { de: 'Masse', ar: 'المقاسات' },
  'moebel.masse_platzhalter': { de: 'Breite x Tiefe x Hoehe', ar: 'العرض × العمق × الارتفاع' },
  'moebel.masse_hinweis': {
    de: 'Schreib es so, wie du es beim Tragen brauchst. Zum Beispiel 180 x 90 x 75 cm.',
    ar: 'اكتبها كما تحتاجها عند الحمل. مثلاً 180 x 90 x 75 cm.',
  },
  'moebel.zerlegt': { de: 'Zerlegt', ar: 'مفكوك' },
  'moebel.zerlegt_hinweis': {
    de: 'Ist das Stueck fuer den Umzug auseinandergebaut?',
    ar: 'هل فُكّت القطعة من أجل النقل؟',
  },
  'moebel.zerlegt_ja': { de: 'Zerlegt', ar: 'مفكوك' },
  'moebel.zerlegt_nein': { de: 'Am Stueck', ar: 'قطعة واحدة' },
  'moebel.keine_angaben': {
    de: 'Noch keine Angaben eingetragen.',
    ar: 'لم تُسجّل أي مواصفات بعد.',
  },

  'moebel.teile': { de: 'Teilekatalog', ar: 'قائمة القطع' },
  'moebel.teile_hinweis': {
    de: 'Freiwillig. Wer die Teile aufschreibt, kann sie beim Aufbauen nachzaehlen.',
    ar: 'اختياري. من يكتب القطع يستطيع عدّها عند التركيب.',
  },
  'moebel.teile_leer': { de: 'Noch keine Teile eingetragen.', ar: 'لم تُسجّل قطع بعد.' },
  'moebel.teil_platzhalter': { de: 'Tischbein, Schraube M6, Schluessel', ar: 'رجل طاولة، مسمار M6، مفتاح' },
  'moebel.teile_gesamt.eins': { de: '1 Teil insgesamt', ar: 'قطعة واحدة في المجموع' },
  'moebel.teile_gesamt.viele': { de: '{n} Teile insgesamt', ar: '{n} قطعة في المجموع' },
  'moebel.teil_menge': { de: 'Menge', ar: 'العدد' },
  'moebel.teil_gezaehlt': { de: 'Nachgezaehlt', ar: 'تم العدّ' },

  'moebel.fotos_seiten': { de: 'Fotos von jeder Seite', ar: 'صور من كل جانب' },
  'moebel.fotos_hinweis': {
    de: 'Fotografier jede Seite einzeln. Beim Aufbauen weiss man dann wieder, wo was hingehoert.',
    ar: 'صوّر كل جانب على حدة. عند التركيب ستعرف مكان كل شيء.',
  },
  'moebel.fotos_leer': {
    de: 'Noch kein Foto von diesem Stueck.',
    ar: 'لا توجد صورة لهذه القطعة بعد.',
  },
  'moebel.hier_ablegen': {
    de: 'Bilder oder PDF hier ablegen',
    ar: 'اسحب الصور أو ملف PDF إلى هنا',
  },
  'moebel.seite_waehlen': { de: 'Welche Seite?', ar: 'أي جانب؟' },
  'moebel.seite_ohne': { de: 'Ohne Angabe', ar: 'بدون تحديد' },
  'moebel.seite_vorne': { de: 'Vorne', ar: 'الأمام' },
  'moebel.seite_hinten': { de: 'Hinten', ar: 'الخلف' },
  'moebel.seite_links': { de: 'Seite A', ar: 'الجانب أ' },
  'moebel.seite_rechts': { de: 'Seite B', ar: 'الجانب ب' },
  'moebel.seite_oben': { de: 'Oben', ar: 'الأعلى' },
  'moebel.seite_unten': { de: 'Unten', ar: 'الأسفل' },
  'moebel.seite_innen': { de: 'Innen', ar: 'الداخل' },
  'moebel.seite_detail': { de: 'Detail', ar: 'تفصيل' },
  'moebel.seite_offen': { de: 'Seite noch offen', ar: 'الجانب غير محدّد' },
  'moebel.seite_setzen': { de: 'Seite eintragen', ar: 'تحديد الجانب' },

  'moebel.anleitung': { de: 'Aufbauanleitung', ar: 'تعليمات التركيب' },
  'moebel.anleitung_hinweis': {
    de: 'Zieh die Anleitung als PDF hier herein oder fotografier die Blaetter. Beides bleibt bei diesem Moebelstueck.',
    ar: 'اسحب التعليمات كملف PDF إلى هنا أو صوّر الأوراق. كلاهما يبقى مع قطعة الأثاث.',
  },
  'moebel.anleitung_leer': { de: 'Noch keine Anleitung hinterlegt.', ar: 'لم تُرفق تعليمات بعد.' },
  'moebel.anleitung_pdf': { de: 'PDF waehlen', ar: 'اختيار ملف PDF' },
  'moebel.anleitung_foto': { de: 'Blatt fotografieren', ar: 'تصوير ورقة' },
  'moebel.anleitung_oeffnen': { de: 'Anleitung oeffnen', ar: 'فتح التعليمات' },
  'moebel.anleitung_seite': { de: 'Blatt {n}', ar: 'ورقة {n}' },
  'moebel.anleitung_hinzugefuegt.eins': { de: '1 Blatt hinzugefuegt', ar: 'تمت إضافة ورقة واحدة' },
  'moebel.anleitung_hinzugefuegt.viele': { de: '{n} Blaetter hinzugefuegt', ar: 'تمت إضافة {n} أوراق' },
  'moebel.kein_pdf_oder_bild': {
    de: 'Nur Bilder und PDF koennen hier abgelegt werden. {n} Datei wurde nicht uebernommen.',
    ar: 'يمكن رفع الصور وملفات PDF فقط. لم يتم قبول {n} ملف.',
  },

  'moebel.in_zimmer': { de: 'Zimmer', ar: 'الغرفة' },
  'moebel.ohne_zimmer': { de: 'Ohne Zimmer', ar: 'بدون غرفة' },
  'moebel.filter_zimmer': { de: 'Zimmer filtern', ar: 'تصفية حسب الغرفة' },
  'moebel.loeschen_titel': { de: 'Moebel loeschen?', ar: 'حذف الأثاث؟' },
  'moebel.loeschen_text': {
    de: '{code} wird mit allen Fotos, Teilen und der Anleitung entfernt. Das laesst sich nicht rueckgaengig machen.',
    ar: 'سيُحذف {code} مع كل الصور والقطع والتعليمات. لا يمكن التراجع عن ذلك.',
  },
  'moebel.geloescht': { de: 'Moebel geloescht', ar: 'تم حذف الأثاث' },
}
