import type { Woerterbuch } from '../woerter'

/* Moebel.
 *
 * Moebel sind in der Datenbank Eintraege in items mit kind = 'furniture'.
 * Darum heissen Nummer, Status, Zimmer und Person hier genauso wie bei den
 * Kisten. Neu sind nur die Angaben zum Stueck, die Seitenfotos, der
 * Teilekatalog und die Aufbauanleitung.
 */
export const moebel: Woerterbuch = {
  'moebel.titel': { de: 'Möbel', ar: 'الأثاث' },
  'moebel.untertitel': {
    de: 'Jedes Stück mit Fotos von allen Seiten, Teilen und Anleitung',
    ar: 'كل قطعة بصورها من كل الجوانب وقطعها وتعليمات تركيبها',
  },
  'moebel.laedt': { de: 'Möbel werden geladen', ar: 'جارٍ تحميل الأثاث' },
  'moebel.nicht_gefunden': {
    de: 'Dieses Möbelstück gibt es nicht.',
    ar: 'قطعة الأثاث هذه غير موجودة.',
  },
  'moebel.zur_liste': { de: 'Zu den Möbeln', ar: 'إلى الأثاث' },
  'moebel.anzahl.eins': { de: '1 Möbelstück', ar: 'قطعة أثاث واحدة' },
  'moebel.anzahl.viele': { de: '{n} Möbelstücke', ar: '{n} قطع أثاث' },

  'moebel.neu': { de: 'Neues Möbel', ar: 'أثاث جديد' },
  'moebel.name_platzhalter': { de: 'Esstisch, Kleiderschrank, Bett', ar: 'طاولة طعام، خزانة، سرير' },
  'moebel.angelegt': { de: '{code} angelegt', ar: 'تم إنشاء {code}' },
  'moebel.gespeichert': { de: 'Gespeichert', ar: 'تم الحفظ' },
  'moebel.leer_titel': { de: 'Noch keine Möbel', ar: 'لا يوجد أثاث بعد' },
  'moebel.leer_hinweis': {
    de: 'Leg jedes größere Stück einmal an. Danach kannst du jede Seite fotografieren, die Teile aufschreiben und die Anleitung dazulegen.',
    ar: 'أضف كل قطعة كبيرة مرة واحدة. بعدها يمكنك تصوير كل جانب وكتابة القطع وإرفاق التعليمات.',
  },
  'moebel.leer_filter': {
    de: 'In diesem Zimmer stehen keine Möbel.',
    ar: 'لا يوجد أثاث في هذه الغرفة.',
  },

  'moebel.angaben': { de: 'Angaben zum Stück', ar: 'مواصفات القطعة' },
  'moebel.hersteller': { de: 'Hersteller', ar: 'الشركة المصنّعة' },
  'moebel.hersteller_platzhalter': { de: 'IKEA, Tischler, unbekannt', ar: 'إيكيا، نجّار، غير معروف' },
  'moebel.modell': { de: 'Modell', ar: 'الطراز' },
  'moebel.modell_platzhalter': { de: 'PAX, NORDEN', ar: 'PAX، NORDEN' },
  'moebel.masse': { de: 'Maße', ar: 'المقاسات' },
  'moebel.masse_platzhalter': { de: 'Breite x Tiefe x Höhe', ar: 'العرض × العمق × الارتفاع' },
  'moebel.masse_hinweis': {
    de: 'Schreib es so, wie du es beim Tragen brauchst. Zum Beispiel 180 x 90 x 75 cm.',
    ar: 'اكتبها كما تحتاجها عند الحمل. مثلاً 180 x 90 x 75 cm.',
  },
  'moebel.zerlegt': { de: 'Zerlegt', ar: 'مفكوك' },
  'moebel.zerlegt_hinweis': {
    de: 'Ist das Stück für den Umzug auseinandergebaut?',
    ar: 'هل فُكّت القطعة من أجل النقل؟',
  },
  'moebel.zerlegt_ja': { de: 'Zerlegt', ar: 'مفكوك' },
  'moebel.zerlegt_nein': { de: 'Am Stück', ar: 'قطعة واحدة' },
  'moebel.keine_angaben': {
    de: 'Noch keine Angaben eingetragen.',
    ar: 'لم تُسجّل أي مواصفات بعد.',
  },

  'moebel.teile': { de: 'Teilekatalog', ar: 'قائمة القطع' },
  'moebel.teile_hinweis': {
    de: 'Freiwillig. Wer die Teile aufschreibt, kann sie beim Aufbauen nachzählen.',
    ar: 'اختياري. من يكتب القطع يستطيع عدّها عند التركيب.',
  },
  'moebel.teile_leer': { de: 'Noch keine Teile eingetragen.', ar: 'لم تُسجّل قطع بعد.' },
  'moebel.teil_platzhalter': { de: 'Tischbein, Schraube M6, Schlüssel', ar: 'رجل طاولة، مسمار M6، مفتاح' },
  'moebel.teile_gesamt.eins': { de: '1 Teil insgesamt', ar: 'قطعة واحدة في المجموع' },
  'moebel.teile_gesamt.viele': { de: '{n} Teile insgesamt', ar: '{n} قطعة في المجموع' },
  'moebel.teil_menge': { de: 'Menge', ar: 'العدد' },
  'moebel.teil_gezaehlt': { de: 'Nachgezählt', ar: 'تم العدّ' },

  'moebel.fotos_seiten': { de: 'Fotos von jeder Seite', ar: 'صور من كل جانب' },
  'moebel.fotos_hinweis': {
    de: 'Fotografier jede Seite einzeln. Beim Aufbauen weiß man dann wieder, wo was hingehört.',
    ar: 'صوّر كل جانب على حدة. عند التركيب ستعرف مكان كل شيء.',
  },
  'moebel.fotos_leer': {
    de: 'Noch kein Foto von diesem Stück.',
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
    de: 'Zieh die Anleitung als PDF hier herein oder fotografier die Blätter. Beides bleibt bei diesem Möbelstück.',
    ar: 'اسحب التعليمات كملف PDF إلى هنا أو صوّر الأوراق. كلاهما يبقى مع قطعة الأثاث.',
  },
  'moebel.anleitung_leer': { de: 'Noch keine Anleitung hinterlegt.', ar: 'لم تُرفق تعليمات بعد.' },
  'moebel.anleitung_pdf': { de: 'PDF wählen', ar: 'اختيار ملف PDF' },
  'moebel.anleitung_foto': { de: 'Blatt fotografieren', ar: 'تصوير ورقة' },
  'moebel.anleitung_oeffnen': { de: 'Anleitung öffnen', ar: 'فتح التعليمات' },
  'moebel.anleitung_seite': { de: 'Blatt {n}', ar: 'ورقة {n}' },
  'moebel.anleitung_hinzugefuegt.eins': { de: '1 Blatt hinzugefügt', ar: 'تمت إضافة ورقة واحدة' },
  'moebel.anleitung_hinzugefuegt.viele': { de: '{n} Blätter hinzugefügt', ar: 'تمت إضافة {n} أوراق' },
  'moebel.kein_pdf_oder_bild': {
    de: 'Nur Bilder und PDF können hier abgelegt werden. {n} Datei wurde nicht übernommen.',
    ar: 'يمكن رفع الصور وملفات PDF فقط. لم يتم قبول {n} ملف.',
  },

  'moebel.in_zimmer': { de: 'Zimmer', ar: 'الغرفة' },
  'moebel.ohne_zimmer': { de: 'Ohne Zimmer', ar: 'بدون غرفة' },
  'moebel.filter_zimmer': { de: 'Zimmer filtern', ar: 'تصفية حسب الغرفة' },
  'moebel.loeschen_titel': { de: 'Möbel löschen?', ar: 'حذف الأثاث؟' },
  'moebel.loeschen_text': {
    de: '{code} wird mit allen Fotos, Teilen und der Anleitung entfernt. Das lässt sich nicht rückgängig machen.',
    ar: 'سيُحذف {code} مع كل الصور والقطع والتعليمات. لا يمكن التراجع عن ذلك.',
  },
  'moebel.geloescht': { de: 'Möbel gelöscht', ar: 'تم حذف الأثاث' },
}
