import type { Woerterbuch } from '../woerter'

/* Uebersicht der Umzuege, Startseite eines Umzugs und der Rahmen darum.
 * Aufbau je Eintrag:
 *   'schluessel': { de: 'Deutsch', ar: 'Arabisch' }
 *
 * Namen von Umzuegen, Zimmern und Personen stehen hier nicht. Die hat der
 * Nutzer selbst eingetippt und bleiben in jeder Sprache so, wie sie sind.
 */
export const umzuege: Woerterbuch = {
  // ------------------------------------------------- Uebersicht, Begruessung
  'umzuege.hallo': { de: 'Hallo', ar: 'أهلاً' },
  'umzuege.hallo_name': { de: 'Hallo, {name}', ar: 'أهلاً {name}' },
  'umzuege.blick': { de: 'Deine Umzuege auf einen Blick.', ar: 'كل نقلاتك في لمحة.' },

  // ---------------------------------------------------- Uebersicht, Knoepfe
  'umzuege.neu': { de: 'Neuer Umzug', ar: 'نقلة جديدة' },
  'umzuege.code_einloesen': { de: 'Code einloesen', ar: 'استخدام رمز' },

  // ------------------------------------------------ Uebersicht, Liste leer
  'umzuege.laden': { de: 'Umzuege werden geladen', ar: 'جارٍ تحميل النقلات' },
  'umzuege.leer_titel': { de: 'Noch kein Umzug angelegt', ar: 'لا توجد نقلة بعد' },
  'umzuege.leer_hinweis': {
    de: 'Ein Umzug ist die Klammer um alles: Zimmer, Personen, Kisten, Etiketten und den Chat.',
    ar: 'النقلة تجمع كل شيء: الغرف والأشخاص والصناديق والملصقات والمحادثة.',
  },
  'umzuege.leer_knopf': { de: 'Ersten Umzug anlegen', ar: 'أنشئ أول نقلة' },

  // ------------------------------------------------------ Karte eines Umzugs
  'umzuege.kein_vermerk': { de: 'Kein Vermerk', ar: 'بدون ملاحظة' },
  'umzuege.umzug_am': { de: 'Umzug am {datum}', ar: 'النقلة في {datum}' },
  'umzuege.karte_kisten': { de: 'Kisten', ar: 'صناديق' },
  'umzuege.karte_dabei': { de: 'dabei', ar: 'مشاركين' },
  'umzuege.karte_unterwegs': { de: '{n} unterwegs', ar: '{n} في الطريق' },

  // ----------------------------------------------------- Dialog neuer Umzug
  'umzuege.toast_angelegt': { de: 'Umzug angelegt', ar: 'تم إنشاء النقلة' },
  'umzuege.name_platzhalter': { de: 'Umzug Salzburg 2026', ar: 'نقلة سالزبورغ 2026' },
  'umzuege.vermerk': { de: 'Vermerk', ar: 'ملاحظة' },
  'umzuege.vermerk_hinweis': {
    de: 'Optional, zum Beispiel die neue Adresse.',
    ar: 'اختياري، مثلاً العنوان الجديد.',
  },
  'umzuege.standardzimmer': { de: 'Standardzimmer anlegen', ar: 'إنشاء الغرف المعتادة' },
  'umzuege.standardzimmer_hinweis': {
    de: 'Wohnzimmer, Kueche, Schlafzimmer, Kinderzimmer, Bad, Flur, Keller. Kannst du danach aendern.',
    ar: 'غرفة المعيشة، المطبخ، غرفة النوم، غرفة الأطفال، الحمام، الممر، القبو. يمكنك تغييرها لاحقاً.',
  },

  // -------------------------------------------------------- Dialog beitreten
  'umzuege.beitreten_titel': { de: 'Einem Umzug beitreten', ar: 'الانضمام إلى نقلة' },
  'umzuege.beitreten': { de: 'Beitreten', ar: 'انضمام' },
  'umzuege.toast_beigetreten': {
    de: 'Du bist jetzt bei {name} dabei',
    ar: 'انضممت الآن إلى {name}',
  },
  'umzuege.einladungscode': { de: 'Einladungscode', ar: 'رمز الدعوة' },
  'umzuege.einladungscode_hinweis': {
    de: 'Den Code bekommst du von der Person, die den Umzug angelegt hat.',
    ar: 'تحصل على الرمز ممن أنشأ النقلة.',
  },

  // ------------------------------------------- Startseite, Kopf und Zahlen
  'umzuege.einstellen': { de: 'Umzug einstellen', ar: 'إعدادات النقلة' },
  'umzuege.zaehlwerte_laden': { de: 'Zaehlwerte werden geladen', ar: 'جارٍ تحميل الأرقام' },
  'umzuege.a_von_b': { de: '{a} von {b}', ar: '{a} من {b}' },

  // -------------------------------------------------- Startseite, Schnellzugriff
  'umzuege.kiste_anlegen': { de: 'Kiste anlegen', ar: 'صندوق جديد' },
  'umzuege.etiketten': { de: 'Etiketten', ar: 'الملصقات' },

  // ------------------------------------------ Startseite, Zimmer und Personen
  'umzuege.zimmer_ueberschrift': { de: 'Zimmer', ar: 'الغرف' },
  'umzuege.verwalten': { de: 'Verwalten', ar: 'إدارة' },
  'umzuege.keine_zimmer': { de: 'Noch keine Zimmer', ar: 'لا توجد غرف بعد' },
  'umzuege.keine_zimmer_hinweis': {
    de: 'Lege zuerst die Bereiche an. Jedes Zimmer bekommt ein Kuerzel, damit die Kisten eine Nummer bekommen koennen.',
    ar: 'أنشئ المناطق أولاً. كل غرفة تأخذ رمزاً حتى تحصل الصناديق على أرقامها.',
  },
  'umzuege.bereiche_anlegen': { de: 'Bereiche anlegen', ar: 'إنشاء المناطق' },
  'umzuege.zaehlwerte_fehler': { de: 'Zaehlwerte nicht geladen', ar: 'تعذّر تحميل الأرقام' },
  'umzuege.wird_gezaehlt': { de: 'wird gezaehlt', ar: 'جارٍ العد' },
  'umzuege.noch_keine_kisten': { de: 'noch keine Kisten', ar: 'لا صناديق بعد' },

  // ---------------------------------------------------- Startseite, Verlauf
  'umzuege.zuletzt': { de: 'Zuletzt passiert', ar: 'آخر ما حدث' },
  'umzuege.verlauf_laden': { de: 'Verlauf wird geladen', ar: 'جارٍ تحميل السجل' },
  'umzuege.verlauf_leer': {
    de: 'Noch nichts passiert. Sobald Kisten angelegt oder gescannt werden, steht es hier.',
    ar: 'لم يحدث شيء بعد. بمجرد إنشاء صندوق أو مسحه سيظهر ذلك هنا.',
  },
  'umzuege.jemand': { de: 'Jemand', ar: 'شخص ما' },
  'umzuege.eine_kiste': { de: 'eine Kiste', ar: 'صندوقاً' },
  'umzuege.ereignis_angelegt': { de: 'hat {code} angelegt', ar: 'أنشأ {code}' },
  'umzuege.ereignis_status': { de: 'hat {status} gesetzt', ar: 'ضبط الحالة على {status}' },
  'umzuege.ereignis_scan': { de: 'hat gescannt', ar: 'قام بالمسح' },
  'umzuege.ereignis_code': {
    de: 'hat den Code auf {code} geaendert',
    ar: 'غيّر الرمز إلى {code}',
  },

  // ------------------------------------------------- Startseite, Fusszeile
  'umzuege.alle_kisten': { de: 'Alle Kisten', ar: 'كل الصناديق' },
  'umzuege.etiketten_liste': { de: 'Etiketten und Liste', ar: 'الملصقات والقائمة' },
  'umzuege.team': { de: 'Team', ar: 'الفريق' },
  'umzuege.andere': { de: 'Andere Umzuege', ar: 'نقلات أخرى' },

  // ------------------------------------------------------------- Der Rahmen
  'umzuege.umzug_laden': { de: 'Umzug wird geladen', ar: 'جارٍ تحميل النقلة' },
  'umzuege.zur_uebersicht': { de: 'Zur Uebersicht', ar: 'إلى القائمة' },
}
