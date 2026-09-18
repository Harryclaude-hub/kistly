import type { Woerterbuch } from '../woerter'

/* Der Scan-Bereich: Kamera, Eingabe von Hand, Trefferkarte, Sitzungsliste.
 *
 * Seriennummern und Kuerzel stehen hier nur als Platzhalter {code}. Sie
 * werden nie uebersetzt und bleiben auch im arabischen Satz von links nach
 * rechts, dafuer sorgt die Klasse t-serial.
 */
export const scannen: Woerterbuch = {
  // ------------------------------------------------------------- Kopfzeile
  'scannen.untertitel_alle': { de: 'Jede Kiste, jeder Umzug', ar: 'كل صندوق، كل نقلة' },
  'scannen.nur_nachschlagen': { de: 'Nur nachschlagen', ar: 'بحث فقط' },
  'scannen.setzt_automatisch': { de: 'Setzt automatisch: {wert}', ar: 'يضبط تلقائيًا: {wert}' },

  // --------------------------------------------------------- Eingabe, Suche
  'scannen.von_hand': { de: 'Code von Hand eingeben', ar: 'أدخل الرمز يدويًا' },
  'scannen.von_hand_hinweis': {
    de: 'Falls der QR-Code beschädigt oder weg ist.',
    ar: 'إذا كان رمز QR تالفًا أو مفقودًا.',
  },
  'scannen.wird_gesucht': { de: 'Kiste wird gesucht', ar: 'جارٍ البحث عن الصندوق' },

  // --------------------------------------------------------- Kein Treffer
  'scannen.nichts_dazu': { de: 'Dazu gibt es nichts', ar: 'لا يوجد شيء بهذا الرمز' },
  'scannen.nichts_dazu_hinweis': {
    de: 'Das steckt in keinem deiner Umzüge. Vielleicht gehört das Etikett zu einem Umzug, in dem du noch nicht bist. Lass dir einen Einladungscode geben.',
    ar: 'هذا ليس في أي من نقلاتك. ربما يعود الملصق إلى نقلة لست عضوًا فيها بعد. اطلب رمز دعوة.',
  },
  'scannen.nichts_im_umzug': {
    de: 'In diesem Umzug gibt es nichts zu {code}',
    ar: 'لا يوجد شيء في هذه النقلة بالرمز {code}',
  },

  // ----------------------------------------------------------- Trefferkarte
  'scannen.etikett_veraltet': {
    de: 'Dieses Etikett ist veraltet. Am besten neu bekleben.',
    ar: 'هذا الملصق قديم. الأفضل استبداله بملصق جديد.',
  },
  'scannen.heisst_jetzt': { de: 'Die Kiste heißt jetzt', ar: 'اسم الصندوق الآن' },
  'scannen.alter_code': {
    de: 'Achtung: {code} ist ein alter Code, das Etikett ist veraltet.',
    ar: 'تنبيه: {code} رمز قديم، والملصق لم يعد صالحًا.',
  },
  /* Nur die Beschriftung. Der Code steht daneben als eigenes Stueck mit
   * t-serial, sonst stuende eine Nummer ohne Halt im arabischen Satz. */
  'scannen.note_alter_code': { de: 'Alter Code', ar: 'رمز قديم' },
  'scannen.ohne_namen': { de: 'Kiste ohne Namen', ar: 'صندوق بلا اسم' },
  'scannen.groesse_zerbrechlich': { de: '{groesse}, zerbrechlich', ar: '{groesse}، قابل للكسر' },
  'scannen.mehrfach.eins': {
    de: 'Denselben Code trägt noch eine weitere Kiste in einem anderen Umzug.',
    ar: 'يوجد صندوق آخر بالرمز نفسه في نقلة أخرى.',
  },
  'scannen.mehrfach.viele': {
    de: 'Denselben Code tragen noch {n} weitere Kisten in anderen Umzügen.',
    ar: 'توجد {n} صناديق أخرى بالرمز نفسه في نقلات أخرى.',
  },
  'scannen.nicht_gesetzt': { de: 'nicht gesetzt', ar: 'غير محدد' },
  'scannen.status_jetzt': { de: 'so steht die Kiste gerade', ar: 'هذه حالة الصندوق الآن' },
  'scannen.stueck': { de: '{n} Stück', ar: '{n} قطعة' },
  'scannen.foto_alt': { de: 'Foto der Kiste', ar: 'صورة الصندوق' },
  'scannen.foto_fehlt': { de: 'nicht ladbar', ar: 'تعذّر التحميل' },

  // ------------------------------------------------------------- Zielknoepfe
  'scannen.zur_kiste': { de: 'Zur Kiste', ar: 'إلى الصندوق' },
  'scannen.zum_zimmer': { de: 'Zum Zimmer', ar: 'إلى الغرفة' },
  'scannen.zum_umzug': { de: 'Zum Umzug', ar: 'إلى النقلة' },
  'scannen.zu_meinen_umzuegen': { de: 'Zu meinen Umzügen', ar: 'إلى نقلاتي' },
  'scannen.alle_umzuege': { de: 'Über alle Umzüge scannen', ar: 'المسح في كل النقلات' },

  // ----------------------------------------------------------- Schalter
  'scannen.auto_label': {
    de: 'Beim Scannen direkt auf Angekommen setzen',
    ar: 'ضبط الحالة على وصل مباشرة عند المسح',
  },
  'scannen.auto_hinweis': {
    de: 'Scannen, grün, nächste Kiste. Ohne Haken wird nur nachgeschlagen.',
    ar: 'امسح، يصبح أخضر، انتقل إلى الصندوق التالي. بدون تفعيل يتم البحث فقط.',
  },
  'scannen.auto_eingestellt': { de: 'Gerade eingestellt: {wert}', ar: 'المضبوط حاليًا: {wert}' },
  'scannen.auto_label_kurz': { de: 'Beim Scannen Status setzen', ar: 'ضبط الحالة عند المسح' },
  'scannen.auto_hinweis_kurz': {
    de: 'So geht der Einzug schnell: scannen, grün, nächste Kiste.',
    ar: 'هكذا يمضي التفريغ بسرعة: امسح، يصبح أخضر، التالي.',
  },

  // --------------------------------------------------------- Sitzungsliste
  'scannen.sitzung': {
    de: 'In dieser Sitzung gescannt ({n})',
    ar: 'ما تم مسحه في هذه الجلسة ({n})',
  },
  'scannen.liste_leeren': { de: 'Liste leeren', ar: 'إفراغ القائمة' },
  'scannen.gescannt_um': { de: 'Gescannt um {zeit}', ar: 'تم المسح الساعة {zeit}' },
  'scannen.leer_titel': { de: 'Noch nichts gescannt', ar: 'لم يتم مسح شيء بعد' },
  'scannen.leer_hinweis_alle': {
    de: 'Halte den QR-Code vom Etikett in den Rahmen. Jede Kiste landet hier, egal zu welchem Umzug sie gehört.',
    ar: 'ضع رمز QR الموجود على الملصق داخل الإطار. كل صندوق يظهر هنا مهما كانت نقلته.',
  },
  'scannen.leer_hinweis_umzug': {
    de: 'Halte den QR-Code vom Etikett in den Rahmen. Jeder Treffer landet hier in der Liste.',
    ar: 'ضع رمز QR الموجود على الملصق داخل الإطار. كل نتيجة تظهر هنا في القائمة.',
  },

  // ------------------------------------------------------------- Meldungen
  'scannen.status_gesetzt': { de: '{code} auf {wert} gesetzt', ar: 'تم ضبط {code} على {wert}' },
  'scannen.status_nicht_geaendert': {
    de: 'Status nicht geändert: {grund}',
    ar: 'لم تتغير الحالة: {grund}',
  },
  'scannen.ist_angekommen': { de: '{code} ist angekommen', ar: 'وصل {code}' },
  'scannen.gefunden': { de: '{code} gefunden', ar: 'تم العثور على {code}' },
  'scannen.anderer_umzug': {
    de: 'Diese Kiste gehört zu einem anderen Umzug.',
    ar: 'هذا الصندوق يعود إلى نقلة أخرى.',
  },
  'scannen.fremdes_etikett': { de: 'Etikett aus einem anderen Umzug?', ar: 'ملصق من نقلة أخرى؟' },
  'scannen.nur_dieser_umzug': {
    de: 'Hier wird nur in {name} gesucht. Der große Scan-Bereich zeigt Treffer aus allen deinen Umzügen.',
    ar: 'البحث هنا يقتصر على {name}. قسم المسح الكبير يعرض النتائج من كل نقلاتك.',
  },
  'scannen.nicht_sichtbar': {
    de: 'Diese Kiste ist für dich nicht sichtbar',
    ar: 'هذا الصندوق غير ظاهر لك',
  },
  'scannen.nicht_sichtbar_hinweis': {
    de: 'Wahrscheinlich gehört der Code zu einem Umzug, in dem du nicht bist. Lass dir einen Einladungscode geben.',
    ar: 'على الأرجح يعود الرمز إلى نقلة لست عضوًا فيها. اطلب رمز دعوة.',
  },

  // ----------------------------------------------------------------- Kamera
  'scannen.kamera_laeuft_nicht': { de: 'Kamera läuft nicht', ar: 'الكاميرا لا تعمل' },
  'scannen.kamera_kein_zugriff': {
    de: 'Dieser Browser gibt keinen Zugriff auf die Kamera.',
    ar: 'هذا المتصفح لا يتيح الوصول إلى الكاميرا.',
  },
  'scannen.kamera_abgelehnt': {
    de: 'Der Zugriff auf die Kamera wurde abgelehnt. In den Seiteneinstellungen des Browsers wieder erlauben.',
    ar: 'تم رفض الوصول إلى الكاميرا. اسمح به من جديد في إعدادات الموقع في المتصفح.',
  },
  'scannen.kamera_nicht_gefunden': {
    de: 'Es wurde keine Kamera gefunden.',
    ar: 'لم يتم العثور على كاميرا.',
  },
  'scannen.kamera_fehler': {
    de: 'Kamera nicht verfügbar: {grund}',
    ar: 'الكاميرا غير متاحة: {grund}',
  },
  'scannen.licht_an': { de: 'Licht einschalten', ar: 'تشغيل الضوء' },
  'scannen.licht_aus': { de: 'Licht ausschalten', ar: 'إطفاء الضوء' },
  'scannen.treffer': { de: 'Treffer', ar: 'تم المسح' },
  'scannen.rahmen_hinweis': { de: 'QR-Code in den Rahmen halten', ar: 'ضع رمز QR داخل الإطار' },
}
