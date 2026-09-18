import type { Woerterbuch } from '../woerter'

/* Chat und Anrufe.
 *
 * Jeder Schluessel beginnt mit chat., damit sich nichts mit einem anderen
 * Baustein ueberschneidet. Navigation, Aktionen und Zustaende stehen schon
 * in gemeinsam.ts und werden von hier aus nur benutzt.
 *
 * Der Nachrichtentext selbst ist Nutzereingabe und steht nie hier. Ebenso
 * wenig Namen, Zimmernamen, Kistentitel und der Name des Umzugs. Was in
 * geschweiften Klammern steht, wird beim Uebersetzen eingesetzt und bleibt
 * unveraendert.
 */
export const chat: Woerterbuch = {
  // ----------------------------------------------------------- Kopfzeile
  'chat.anrufen': { de: 'Anrufen', ar: 'اتصال' },
  'chat.videoanruf': { de: 'Videoanruf', ar: 'مكالمة فيديو' },

  // -------------------------------------------------------- Verlauf laden
  'chat.laedt': { de: 'Nachrichten werden geladen', ar: 'جارٍ تحميل الرسائل' },
  'chat.aeltere': { de: 'Ältere Nachrichten', ar: 'الرسائل الأقدم' },
  'chat.leer_titel': { de: 'Noch keine Nachricht', ar: 'لا توجد رسائل بعد' },
  'chat.leer_hinweis': {
    de: 'Hier besprecht ihr den Umzug. Du kannst Kisten und Zimmer verlinken, Bilder hereinziehen oder einfach einfügen.',
    ar: 'هنا تنسّقون النقلة. يمكنك ربط الصناديق والغرف، أو سحب الصور إلى هنا، أو لصقها مباشرة.',
  },
  'chat.teilweise_geladen': {
    de: 'Neue Nachricht nur teilweise geladen: {grund}',
    ar: 'تم تحميل الرسالة الجديدة جزئيًا: {grund}',
  },

  // ----------------------------------------------------------- Tagestrenner
  'chat.heute': { de: 'Heute', ar: 'اليوم' },
  'chat.gestern': { de: 'Gestern', ar: 'أمس' },

  // ------------------------------------------------------ Nachrichtenarten
  'chat.geloescht': { de: 'Nachricht gelöscht', ar: 'رسالة محذوفة' },
  'chat.geloescht_kurz': { de: 'gelöscht', ar: 'محذوفة' },
  'chat.bearbeitet': { de: 'bearbeitet', ar: 'مُعدّلة' },
  'chat.sprachnachricht': { de: 'Sprachnachricht', ar: 'رسالة صوتية' },
  'chat.bild': { de: 'Bild', ar: 'صورة' },
  'chat.datei': { de: 'Datei', ar: 'ملف' },
  'chat.bild_gross': { de: 'Bild groß anzeigen', ar: 'عرض الصورة بحجم كبير' },
  'chat.bild_schliessen': { de: 'Bild schließen', ar: 'إغلاق الصورة' },
  'chat.bild_nicht_erreichbar': {
    de: 'Das Bild ist gerade nicht erreichbar.',
    ar: 'الصورة غير متاحة حاليًا.',
  },
  'chat.datei_nicht_erreichbar': {
    de: 'Die Datei ist gerade nicht erreichbar.',
    ar: 'الملف غير متاح حاليًا.',
  },

  // -------------------------------------------------------------- Aktionen
  'chat.reagieren': { de: 'Reagieren', ar: 'تفاعل' },
  'chat.antworten': { de: 'Antworten', ar: 'رد' },
  'chat.loeschen': { de: 'Nachricht löschen', ar: 'حذف الرسالة' },
  /* Die arabische Vorsilbe haengt ohne Leerzeichen am folgenden Zeichen. */
  'chat.mit_reagieren': { de: 'Mit {emoji} reagieren', ar: 'التفاعل بـ{emoji}' },
  'chat.reaktion_umschalten': {
    de: '{emoji} {n}, antippen zum Ändern',
    ar: '{emoji} {n}، اضغط للتغيير',
  },

  // --------------------------------------------------------------- Antwort
  'chat.antwort_an': { de: 'Antwort an {name}', ar: 'رد على {name}' },
  'chat.antwort_verwerfen': { de: 'Antwort verwerfen', ar: 'إلغاء الرد' },

  // -------------------------------------------------------------- Anhaenge
  'chat.bild_datei': { de: 'Bild oder Datei senden', ar: 'إرسال صورة أو ملف' },
  'chat.anhaenge_offen.eins': {
    de: '{n} Anhang, noch nicht gesendet',
    ar: 'مرفق واحد، لم يُرسل بعد',
  },
  'chat.anhaenge_offen.viele': {
    de: '{n} Anhänge, noch nicht gesendet',
    ar: '{n} مرفقات، لم تُرسل بعد',
  },
  'chat.anhang_entfernen': { de: '{name} entfernen', ar: 'إزالة {name}' },
  'chat.datei_zu_gross': {
    de: '{name} ist zu groß. Höchstens 25 MB.',
    ar: '{name} كبير جدًا. الحد الأقصى 25 ميغابايت.',
  },
  /* Wenn ein eingefuegtes Bild gar keinen Dateinamen mitbringt. */
  'chat.bild_dateiname': { de: 'Bild.png', ar: 'صورة.png' },
  'chat.abwurf_titel': { de: 'Loslassen zum Senden', ar: 'أفلت الملف للإرسال' },
  'chat.abwurf_hinweis': {
    de: 'Bilder und Dateien einfach hier fallen lassen.',
    ar: 'أفلت الصور والملفات هنا مباشرة.',
  },
  'chat.kein_datei_abwurf': { de: 'Da war keine Datei dabei.', ar: 'لم يكن هناك أي ملف.' },

  // ---------------------------------------------------------------- Eingabe
  'chat.platzhalter': { de: 'Nachricht', ar: 'رسالة' },
  'chat.senden': { de: 'Senden', ar: 'إرسال' },
  'chat.verwerfen': { de: 'Verwerfen', ar: 'إلغاء' },

  // --------------------------------------------------------------- Aufnahme
  'chat.aufnehmen': {
    de: 'Sprachnachricht aufnehmen, gedrückt halten',
    ar: 'تسجيل رسالة صوتية، اضغط مع الاستمرار',
  },
  'chat.abspielen': { de: 'Abspielen', ar: 'تشغيل' },
  'chat.pause': { de: 'Pause', ar: 'إيقاف مؤقت' },
  'chat.aufnahme_nicht_moeglich': {
    de: 'Dieser Browser kann keine Sprachnachrichten aufnehmen.',
    ar: 'هذا المتصفح لا يدعم تسجيل الرسائل الصوتية.',
  },
  'chat.mikrofon_abgelehnt': {
    de: 'Zugriff auf das Mikrofon wurde abgelehnt.',
    ar: 'تم رفض الوصول إلى الميكروفون.',
  },
  'chat.aufnahme_fehler': { de: 'Aufnahme nicht möglich: {grund}', ar: 'تعذّر التسجيل: {grund}' },
  'chat.aufnahme_zu_kurz': {
    de: 'Zu kurz. Halte den Knopf gedrückt, solange du sprichst.',
    ar: 'قصيرة جدًا. اضغط مع الاستمرار طوال حديثك.',
  },

  // -------------------------------------------------------- Verlinken
  'chat.verlinken': { de: 'Kiste oder Zimmer verlinken', ar: 'ربط صندوق أو غرفة' },
  'chat.verlinken_titel': { de: 'Kiste oder Bereich verlinken', ar: 'ربط صندوق أو منطقة' },
  'chat.verlinken_suche': {
    de: 'Nummer, Titel oder Zimmer suchen',
    ar: 'ابحث برقم أو عنوان أو غرفة',
  },
  'chat.sucht': { de: 'sucht', ar: 'جارٍ البحث' },

  // ----------------------------------------------------------- Namen
  'chat.jemand': { de: 'Jemand', ar: 'شخص ما' },
  'chat.du': { de: 'Du', ar: 'أنت' },

  // ------------------------------------------------- Benachrichtigungen
  'chat.push_neue_nachricht': { de: 'Neue Nachricht', ar: 'رسالة جديدة' },
  'chat.push_sprachnachricht': { de: 'Sprachnachricht, {dauer}', ar: 'رسالة صوتية، {dauer}' },

  // ------------------------------------------------------- Anruf, eingehend
  'chat.anruf_eingehend': { de: 'Anruf in {umzug}', ar: 'مكالمة في {umzug}' },
  'chat.anruf_eingehend_video': {
    de: 'Videoanruf in {umzug}',
    ar: 'مكالمة فيديو في {umzug}',
  },
  'chat.anruf_annehmen': { de: 'Annehmen', ar: 'الرد على المكالمة' },
  'chat.anruf_ablehnen': { de: 'Ablehnen', ar: 'رفض المكالمة' },
  'chat.anruf_ruft_an': { de: '{name} ruft an', ar: '{name} يتصل بك' },
  'chat.anruf_push_video': { de: '{umzug}, Videoanruf', ar: '{umzug}، مكالمة فيديو' },

  // --------------------------------------------------------- Anruf, laufend
  'chat.anruf_laeuft': { de: 'Anruf läuft', ar: 'مكالمة جارية' },
  'chat.anruf_laeuft_video': { de: 'Videoanruf läuft', ar: 'مكالمة فيديو جارية' },
  'chat.anruf_verbunden.eins': { de: '{n} verbunden', ar: 'متصل واحد' },
  'chat.anruf_verbunden.viele': { de: '{n} verbunden', ar: '{n} متصلين' },
  'chat.anruf_verbindet': { de: 'verbindet', ar: 'جارٍ الاتصال' },
  'chat.anruf_fehlgeschlagen': { de: 'Verbindung fehlgeschlagen', ar: 'فشل الاتصال' },
  'chat.mikro_an': { de: 'Mikrofon an', ar: 'تشغيل الميكروفون' },
  'chat.mikro_aus': { de: 'Mikrofon aus', ar: 'كتم الميكروفون' },
  'chat.kamera_an': { de: 'Kamera an', ar: 'تشغيل الكاميرا' },
  'chat.kamera_aus': { de: 'Kamera aus', ar: 'إيقاف الكاميرا' },
  'chat.auflegen': { de: 'Auflegen', ar: 'إنهاء المكالمة' },

  // ---------------------------------------------------------- Anruf, Ende
  'chat.anruf_niemand_da': {
    de: 'In diesem Umzug ist sonst niemand, den man anrufen könnte.',
    ar: 'لا يوجد أحد آخر في هذه النقلة للاتصال به.',
  },
  'chat.anruf_niemand_ran': { de: 'Niemand ist rangegangen.', ar: 'لم يرد أحد.' },
  'chat.anruf_beendet_kurz': { de: 'Anruf beendet', ar: 'انتهت المكالمة' },
  'chat.anruf_beendet': { de: 'Anruf beendet, {dauer}', ar: 'انتهت المكالمة، {dauer}' },
  'chat.anruf_abgelehnt': { de: 'Anruf abgelehnt', ar: 'تم رفض المكالمة' },
  'chat.anruf_nicht_angenommen': { de: 'Anruf nicht angenommen', ar: 'لم يُرد على المكالمة' },
}
