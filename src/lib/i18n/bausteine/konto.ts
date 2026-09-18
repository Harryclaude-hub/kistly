import type { Woerterbuch } from '../woerter'

/* Anmelden, Konto anlegen und Passwort zuruecksetzen. Alle Schluessel
 * beginnen mit konto.
 *
 * konto.passwort_anzeigen und konto.passwort_verbergen stehen absichtlich
 * nicht hier, sondern in gemeinsam.ts, weil ui.tsx sie direkt braucht.
 */
export const konto: Woerterbuch = {
  // ------------------------------------------------------- Rahmen und Kopf
  'konto.startseite': { de: 'Startseite', ar: 'الصفحة الرئيسية' },

  // ------------------------------------------------------------- Anmelden
  'konto.anmelden': { de: 'Anmelden', ar: 'تسجيل الدخول' },
  'konto.anmelden_unter': {
    de: 'Mit E-Mail und Passwort.',
    ar: 'بالبريد الإلكتروني وكلمة المرور.',
  },
  'konto.noch_kein_konto': { de: 'Noch kein Konto?', ar: 'ليس لديك حساب؟' },
  'konto.jetzt_anlegen': { de: 'Jetzt anlegen', ar: 'أنشئ حسابًا الآن' },

  // ---------------------------------------------------------------- Felder
  'konto.email': { de: 'E-Mail', ar: 'البريد الإلكتروني' },
  'konto.email_platzhalter': { de: 'du@beispiel.de', ar: 'du@beispiel.de' },
  'konto.passwort': { de: 'Passwort', ar: 'كلمة المرور' },
  'konto.passwort_platzhalter': { de: 'Dein Passwort', ar: 'كلمة المرور' },
  'konto.passwort_vergessen': { de: 'Passwort vergessen', ar: 'نسيت كلمة المرور' },

  // -------------------------------------------------------- Konto anlegen
  'konto.konto_anlegen': { de: 'Konto anlegen', ar: 'إنشاء حساب' },
  'konto.konto_anlegen_unter': {
    de: 'Name ist freiwillig. E-Mail und Passwort brauchst du.',
    ar: 'الاسم اختياري. تحتاج البريد الإلكتروني وكلمة المرور.',
  },
  'konto.schon_konto': { de: 'Schon ein Konto?', ar: 'لديك حساب؟' },
  'konto.name_hinweis': {
    de: 'Optional. So sehen dich die anderen im Umzug.',
    ar: 'اختياري. هكذا يراك الآخرون في النقلة.',
  },
  'konto.name_platzhalter': { de: 'Karam', ar: 'كرم' },
  'konto.passwort_kurz': { de: 'Nimm mindestens 8 Zeichen.', ar: 'استخدم 8 أحرف على الأقل.' },
  'konto.passwort_min': { de: 'Mindestens 8 Zeichen.', ar: '8 أحرف على الأقل.' },
  'konto.passwort_hinweis': {
    de: 'Mindestens 8 Zeichen. Mit dem Auge im Feld kannst du es anzeigen.',
    ar: '8 أحرف على الأقل. اضغط رمز العين في الحقل لإظهارها.',
  },
  'konto.neues_passwort_platzhalter': { de: 'Neues Passwort', ar: 'كلمة مرور جديدة' },
  'konto.fast_fertig': { de: 'Fast fertig', ar: 'اقتربت من النهاية' },
  'konto.bestaetigung_noetig': {
    de: 'Konto angelegt. Dieses Supabase-Projekt verlangt noch eine Bestätigung per E-Mail. Schau in dein Postfach, dann kannst du dich anmelden.',
    ar: 'تم إنشاء الحساب. يطلب مشروع Supabase هذا تأكيدًا عبر البريد الإلكتروني. تحقق من بريدك، ثم يمكنك تسجيل الدخول.',
  },
  'konto.zur_anmeldung': { de: 'Zur Anmeldung', ar: 'إلى تسجيل الدخول' },

  // --------------------------------------------------- Passwort vergessen
  'konto.reset_titel': { de: 'Passwort zurücksetzen', ar: 'إعادة تعيين كلمة المرور' },
  'konto.reset_unter': {
    de: 'Wir schicken dir einen Link, mit dem du ein neues Passwort setzt.',
    ar: 'سنرسل لك رابطًا تضبط به كلمة مرور جديدة.',
  },
  'konto.zurueck_anmeldung': { de: 'Zurück zur Anmeldung', ar: 'رجوع إلى تسجيل الدخول' },
  'konto.link_verschickt': { de: 'Link verschickt', ar: 'تم إرسال الرابط' },
  'konto.link_verschickt_text': {
    de: 'Falls es zu dieser Adresse ein Konto gibt, liegt gleich eine Mail im Postfach. Der Link führt direkt auf die Seite für das neue Passwort.',
    ar: 'إن كان لهذا العنوان حساب، فستصل رسالة إلى بريدك بعد لحظات. يقودك الرابط مباشرة إلى صفحة كلمة المرور الجديدة.',
  },
  'konto.link_schicken': { de: 'Link schicken', ar: 'أرسل الرابط' },

  // ------------------------------------------------------- Neues Passwort
  'konto.neues_passwort': { de: 'Neues Passwort', ar: 'كلمة مرور جديدة' },
  'konto.neues_passwort_unter': {
    de: 'Setze jetzt dein neues Passwort.',
    ar: 'اضبط الآن كلمة المرور الجديدة.',
  },
  'konto.link_wird_geprueft': { de: 'Link wird geprüft', ar: 'جارٍ التحقق من الرابط' },
  'konto.link_ungueltig': { de: 'Kein gültiger Link', ar: 'رابط غير صالح' },
  'konto.link_ungueltig_text': {
    de: 'Der Link ist abgelaufen oder wurde schon benutzt. Fordere unter Passwort vergessen einen neuen an.',
    ar: 'انتهت صلاحية الرابط أو استُخدم من قبل. اطلب رابطًا جديدًا من صفحة نسيت كلمة المرور.',
  },
  'konto.neuen_link': { de: 'Neuen Link anfordern', ar: 'اطلب رابطًا جديدًا' },
  'konto.passwort_nochmal': { de: 'Nochmal', ar: 'أعد الكتابة' },
  'konto.passwoerter_ungleich': {
    de: 'Die beiden Passwörter sind nicht gleich.',
    ar: 'كلمتا المرور غير متطابقتين.',
  },
  'konto.passwort_speichern': { de: 'Passwort speichern', ar: 'حفظ كلمة المرور' },
  'konto.passwort_geaendert': { de: 'Passwort geändert', ar: 'تم تغيير كلمة المرور' },
  'konto.weiter_geht_es': { de: 'Weiter geht es.', ar: 'لنكمل.' },
}
