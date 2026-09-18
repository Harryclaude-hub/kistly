import type { Woerterbuch } from '../woerter'

/* Einstellungen, Installationshinweis und Darstellungsschalter.
 * Der Name Kistly bleibt in beiden Sprachen stehen, ebenso VAPID und
 * Safari. Zahlen bleiben in westlichen Ziffern, weil dieselben Ziffern
 * auf den Etiketten stehen.
 */
export const einstellungen: Woerterbuch = {
  // -------------------------------------------------------------- Kopfzeile
  'einstellungen.titel': { de: 'Einstellungen', ar: 'الإعدادات' },

  // ----------------------------------------------------------------- Profil
  'einstellungen.profil': { de: 'Profil', ar: 'الملف الشخصي' },
  'einstellungen.ohne_namen': { de: 'Ohne Namen', ar: 'بدون اسم' },
  'einstellungen.anzeigename': { de: 'Anzeigename', ar: 'الاسم الظاهر' },
  'einstellungen.anzeigename_hinweis': {
    de: 'So sehen dich die anderen in Umzügen und im Chat.',
    ar: 'هكذا يراك الآخرون في النقلات وفي المحادثة.',
  },
  'einstellungen.name_platzhalter': { de: 'Dein Name', ar: 'اسمك' },
  'einstellungen.name_gespeichert': { de: 'Name gespeichert', ar: 'تم حفظ الاسم' },

  // --------------------------------------------------------------- Passwort
  'einstellungen.passwort': { de: 'Passwort', ar: 'كلمة المرور' },
  'einstellungen.neues_passwort': { de: 'Neues Passwort', ar: 'كلمة مرور جديدة' },
  'einstellungen.passwort_hinweis': {
    de: 'Mindestens 8 Zeichen. Mit dem Auge kannst du es anzeigen.',
    ar: '8 أحرف على الأقل. اضغط على العين لإظهارها.',
  },
  'einstellungen.aendern': { de: 'Ändern', ar: 'تغيير' },
  'einstellungen.passwort_geaendert': { de: 'Passwort geändert', ar: 'تم تغيير كلمة المرور' },
  'einstellungen.sicherheit_hinweis': {
    de: 'Die Verbindung läuft verschlüsselt, Passwörter liegen nur als Hash beim Anbieter. Deine Daten sieht nur, wer im jeweiligen Umzug eingetragen ist.',
    ar: 'الاتصال مشفّر، وكلمات المرور محفوظة كبصمة مشفّرة فقط. بياناتك لا يراها إلا من كان مسجّلاً في النقلة نفسها.',
  },

  // ----------------------------------------------------- Benachrichtigungen
  'einstellungen.benachrichtigungen': { de: 'Benachrichtigungen', ar: 'الإشعارات' },
  'einstellungen.dieses_geraet': { de: 'Auf diesem Gerät', ar: 'على هذا الجهاز' },
  'einstellungen.push_unsupported': {
    de: 'Dieser Browser kann keine Push-Benachrichtigungen. Auf dem iPhone geht es erst, wenn Kistly auf dem Startbildschirm liegt.',
    ar: 'هذا المتصفح لا يدعم الإشعارات. على iPhone تعمل فقط بعد وضع Kistly على الشاشة الرئيسية.',
  },
  'einstellungen.push_no_key': {
    de: 'Auf dem Server ist kein VAPID-Schlüssel hinterlegt. Ohne den kann nichts verschickt werden.',
    ar: 'لا يوجد مفتاح VAPID على الخادم. بدونه لا يمكن إرسال أي إشعار.',
  },
  'einstellungen.push_denied': {
    de: 'Benachrichtigungen sind im Browser blockiert. Das musst du in den Seiteneinstellungen wieder erlauben.',
    ar: 'الإشعارات محظورة في المتصفح. اسمح بها من جديد في إعدادات الموقع.',
  },
  'einstellungen.push_default': { de: 'Noch nicht erlaubt.', ar: 'لم يتم السماح بعد.' },
  'einstellungen.push_granted_off': {
    de: 'Erlaubt, aber dieses Gerät ist nicht angemeldet.',
    ar: 'مسموح، لكن هذا الجهاز غير مشترك.',
  },
  'einstellungen.push_granted_on': {
    de: 'Dieses Gerät bekommt Benachrichtigungen.',
    ar: 'هذا الجهاز يستقبل الإشعارات.',
  },
  'einstellungen.einschalten': { de: 'Einschalten', ar: 'تشغيل' },
  'einstellungen.ausschalten': { de: 'Ausschalten', ar: 'إيقاف' },
  'einstellungen.push_an': { de: 'Benachrichtigungen an', ar: 'تم تشغيل الإشعارات' },
  'einstellungen.push_aus': { de: 'Auf diesem Gerät aus', ar: 'تم الإيقاف على هذا الجهاز' },
  'einstellungen.laedt': { de: 'Einstellungen werden geladen', ar: 'جارٍ تحميل الإعدادات' },
  'einstellungen.chat': { de: 'Chatnachrichten', ar: 'رسائل المحادثة' },
  'einstellungen.chat_hinweis': { de: 'Einmal pro Nachricht.', ar: 'إشعار واحد لكل رسالة.' },
  'einstellungen.anrufe': { de: 'Anrufe', ar: 'المكالمات' },
  'einstellungen.anrufe_hinweis': {
    de: 'Wiederholt sich, solange es klingelt.',
    ar: 'يتكرر ما دام الرنين مستمراً.',
  },
  'einstellungen.kisten': { de: 'Kisten und Status', ar: 'الصناديق والحالة' },
  'einstellungen.kisten_hinweis': {
    de: 'Wenn jemand etwas scannt oder auf angekommen setzt.',
    ar: 'عند مسح صندوق أو تغيير حالته إلى وصل.',
  },

  // ---------------------------------------------------------------- Sprache
  'einstellungen.sprache': { de: 'Sprache', ar: 'اللغة' },

  // ------------------------------------------------------------ Darstellung
  'einstellungen.darstellung': { de: 'Darstellung', ar: 'المظهر' },
  'einstellungen.theme_system': { de: 'System', ar: 'النظام' },
  'einstellungen.theme_hell': { de: 'Hell', ar: 'فاتح' },
  'einstellungen.theme_dunkel': { de: 'Dunkel', ar: 'داكن' },
  'einstellungen.theme_titel': { de: 'Darstellung: {wert}', ar: 'المظهر: {wert}' },

  // --------------------------------------------------------------- Bewegung
  'einstellungen.bewegung': { de: 'Bewegung', ar: 'الحركة' },
  'einstellungen.bewegung_ruhig': { de: 'Ruhig', ar: 'هادئ' },
  'einstellungen.bewegung_ruhig_hinweis': {
    de: 'Nichts bewegt sich. Schont den Akku.',
    ar: 'لا شيء يتحرك. يوفّر البطارية.',
  },
  'einstellungen.bewegung_normal': { de: 'Normal', ar: 'عادي' },
  'einstellungen.bewegung_normal_hinweis': {
    de: 'Der Hintergrund steht fest, der Vordergrund scrollt darüber.',
    ar: 'الخلفية ثابتة والمحتوى يمر فوقها.',
  },
  'einstellungen.bewegung_voll': { de: 'Voll', ar: 'كامل' },
  'einstellungen.bewegung_voll_hinweis': {
    de: 'Dazu driftende Kisten und atmende Lichter.',
    ar: 'مع صناديق تنساب وأضواء تتنفس.',
  },

  // -------------------------------------------------------------------- App
  'einstellungen.app': { de: 'App', ar: 'التطبيق' },
  'einstellungen.abmelden': { de: 'Abmelden', ar: 'تسجيل الخروج' },
  'einstellungen.fusszeile': {
    de: 'Kistly . gebaut für den eigenen Umzug',
    ar: 'Kistly . صُنع من أجل نقلة حقيقية',
  },

  // --------------------------------------------------- Auf den Startbildschirm
  'einstellungen.install_ausblenden': { de: 'Hinweis ausblenden', ar: 'إخفاء الملاحظة' },
  'einstellungen.install_titel': {
    de: 'Kistly auf den Startbildschirm',
    ar: 'Kistly على الشاشة الرئيسية',
  },
  'einstellungen.install_ios_1': { de: 'In Safari unten auf', ar: 'في Safari اضغط بالأسفل على' },
  'einstellungen.install_ios_2': {
    de: 'Teilen tippen, dann auf Zum Home-Bildschirm. Danach startet Kistly wie eine normale App, mit Logo.',
    ar: 'مشاركة، ثم إضافة إلى الشاشة الرئيسية. بعدها يفتح Kistly مثل أي تطبيق، بشعاره الخاص.',
  },
  'einstellungen.install_text': {
    de: 'Ein Tipp, und Kistly liegt mit Logo auf deinem Startbildschirm. Ohne Browserleiste, mit Benachrichtigungen.',
    ar: 'ضغطة واحدة، ويصبح Kistly بشعاره على شاشتك الرئيسية. بلا شريط المتصفح، ومع الإشعارات.',
  },
  'einstellungen.install_knopf': { de: 'Jetzt installieren', ar: 'التثبيت الآن' },
}
