import type { Woerterbuch } from '../woerter'

/* Seiten Team und Umzug einstellen: Mitglieder, Rollen, Einladungscodes,
 * Grunddaten und Gefahrenbereich.
 * Projektname, Personennamen und Adressen der Nutzer bleiben unveraendert,
 * Einladungscodes ebenfalls. */
export const team: Woerterbuch = {
  // --------------------------------------------------------------- Kopfzeile
  'team.titel': { de: 'Team', ar: 'الفريق' },
  'team.einladen': { de: 'Einladen', ar: 'دعوة' },

  // -------------------------------------------------------------- Mitglieder
  'team.unbekannt': { de: 'Unbekannt', ar: 'غير معروف' },
  'team.du': { de: '(du)', ar: '(أنت)' },
  'team.ohne_email': { de: 'ohne E-Mail', ar: 'بدون بريد إلكتروني' },
  'team.dabei_seit': { de: 'dabei seit {datum}', ar: 'عضو منذ {datum}' },
  'team.rolle_von': { de: 'Rolle von {name}', ar: 'دور {name}' },
  'team.entfernen_label': { de: '{name} entfernen', ar: 'إزالة {name}' },
  'team.rolle_geaendert': { de: 'Rolle geändert', ar: 'تم تغيير الدور' },

  // ---------------------------------------------------------- Einladungscodes
  'team.codes_titel': { de: 'Einladungscodes', ar: 'رموز الدعوة' },
  'team.neuer_code': { de: 'Neuer Code', ar: 'رمز جديد' },
  'team.codes_laden': { de: 'Codes werden geladen', ar: 'جارٍ تحميل الرموز' },
  'team.kein_code_titel': { de: 'Kein Code offen', ar: 'لا يوجد رمز مفعّل' },
  'team.kein_code_hinweis': {
    de: 'Ein Code lässt andere diesem Umzug beitreten. Sie geben ihn unter Code einlösen ein.',
    ar: 'الرمز يتيح لغيرك الانضمام إلى هذه النقلة. يُدخلونه في صفحة استخدام رمز.',
  },
  'team.code_erstellen': { de: 'Code erstellen', ar: 'إنشاء رمز' },
  // Rolle und Nutzung in einer Zeile. Das Komma steht mit im Text, weil
  // Arabisch ein eigenes Kommazeichen benutzt.
  'team.code_zeile': {
    de: '{rolle}, {n}x benutzt',
    ar: '{rolle}، عدد الاستخدامات: {n}',
  },
  'team.code_deaktivieren': { de: 'Code deaktivieren', ar: 'إيقاف الرمز' },
  'team.code_deaktiviert': { de: 'Code deaktiviert', ar: 'تم إيقاف الرمز' },
  'team.einladung_teilen': { de: 'Einladung teilen', ar: 'مشاركة الدعوة' },

  // -------------------------------------------------------- Kopieren, Teilen
  'team.code_angelegt_kopiert': {
    de: 'Code {code} angelegt und kopiert',
    ar: 'تم إنشاء الرمز {code} ونسخه',
  },
  'team.code_angelegt_ohne_kopie': {
    de: 'Code {code} angelegt. Kopieren ging nicht, schreib ihn bitte ab.',
    ar: 'تم إنشاء الرمز {code}. النسخ لم ينجح، اكتبه بنفسك من فضلك.',
  },
  'team.code_kopiert': { de: 'Code kopiert', ar: 'تم نسخ الرمز' },
  'team.kopieren_fehler': {
    de: 'Kopieren hat nicht geklappt. Schreib den Code bitte ab.',
    ar: 'النسخ لم ينجح. اكتب الرمز بنفسك من فضلك.',
  },
  'team.einladung_kopiert': { de: 'Einladung kopiert', ar: 'تم نسخ الدعوة' },
  'team.teilen_fehler': {
    de: 'Teilen hat nicht geklappt. Schreib den Code bitte ab.',
    ar: 'المشاركة لم تنجح. اكتب الرمز بنفسك من فضلك.',
  },
  // Nachricht an einen Menschen. Der Name des Umzugs bleibt, wie er ist.
  'team.teilen_titel': { de: 'Kistly Einladung', ar: 'دعوة من Kistly' },
  'team.teilen_text': {
    de: 'Komm zu meinem Umzug "{name}" bei Kistly. Code: {code}',
    ar: 'انضم إلى نقلتي "{name}" على Kistly. الرمز: {code}',
  },

  // ---------------------------------------------------------------- Verlassen
  'team.verlassen_knopf': { de: 'Diesen Umzug verlassen', ar: 'مغادرة هذه النقلة' },
  'team.verlassen_besitzer': {
    de: 'Du bist Besitzer. Verlassen geht erst, wenn jemand anders Besitzer ist.',
    ar: 'أنت المالك. لا يمكنك المغادرة قبل أن يصبح شخص آخر المالك.',
  },
  'team.verlassen_titel': { de: 'Umzug verlassen', ar: 'مغادرة النقلة' },
  'team.verlassen_bestaetigen': { de: 'Verlassen', ar: 'مغادرة' },
  'team.verlassen_text': {
    de: 'Du siehst diesen Umzug danach nicht mehr. Mit einem neuen Einladungscode kommst du wieder rein.',
    ar: 'لن ترى هذه النقلة بعد ذلك. يمكنك العودة برمز دعوة جديد.',
  },
  'team.verlassen_ok': { de: 'Umzug verlassen', ar: 'تمت مغادرة النقلة' },

  // ------------------------------------------------------ Mitglied entfernen
  'team.entfernen_titel': { de: 'Mitglied entfernen', ar: 'إزالة عضو' },
  'team.entfernen_text': {
    de: 'Die Person verliert den Zugriff auf diesen Umzug. Ihre Kisten und Nachrichten bleiben erhalten.',
    ar: 'سيفقد هذا الشخص الوصول إلى هذه النقلة. صناديقه ورسائله تبقى كما هي.',
  },
  'team.entfernt': { de: 'Mitglied entfernt', ar: 'تمت إزالة العضو' },

  // ------------------------------------------- Umzug einstellen, Grunddaten
  'team.einstellen_titel': { de: 'Umzug einstellen', ar: 'إعدادات النقلة' },
  'team.grunddaten': { de: 'Grunddaten', ar: 'البيانات الأساسية' },
  'team.speichert_beim_verlassen': {
    de: 'Änderungen werden gespeichert, sobald du das Feld verlässt.',
    ar: 'يتم الحفظ بمجرد خروجك من الحقل.',
  },
  'team.nur_lesen': {
    de: 'Du kannst hier nur lesen. Zum Ändern brauchst du die Rolle Bearbeiter.',
    ar: 'لديك صلاحية القراءة فقط. للتعديل تحتاج إلى دور محرر.',
  },
  'team.umzug_name': { de: 'Name des Umzugs', ar: 'اسم النقلة' },
  'team.vermerk': { de: 'Vermerk', ar: 'ملاحظة' },
  'team.vermerk_hinweis': {
    de: 'Steht auf der Übersicht unter dem Namen.',
    ar: 'تظهر في القائمة تحت الاسم.',
  },
  'team.alte_adresse': { de: 'Alte Adresse', ar: 'العنوان القديم' },
  'team.neue_adresse': { de: 'Neue Adresse', ar: 'العنوان الجديد' },
  'team.umzugstag': { de: 'Umzugstag', ar: 'يوم النقل' },
  'team.zeitstempel': {
    de: 'Angelegt am {angelegt}. Zuletzt geändert {geaendert}.',
    ar: 'أُنشئت في {angelegt}. آخر تعديل {geaendert}.',
  },
  'team.gespeichert': { de: 'Gespeichert', ar: 'تم الحفظ' },

  // ------------------------------------------ Umzug einstellen, Mitglieder
  'team.karte_titel': { de: 'Team und Einladungscodes', ar: 'الفريق ورموز الدعوة' },
  'team.karte_hinweis': {
    de: 'Wer darf mit, wer darf nur lesen, und welcher Code ist offen.',
    ar: 'من يشارك، من يقرأ فقط، وأي رمز ما زال مفعّلًا.',
  },
  'team.karte_knopf': { de: 'Team öffnen', ar: 'فتح الفريق' },

  // -------------------------------------- Umzug einstellen, Gefahrenbereich
  'team.gefahr_titel': { de: 'Gefahrenbereich', ar: 'منطقة الخطر' },
  'team.umzug_loeschen': { de: 'Umzug löschen', ar: 'حذف النقلة' },
  'team.umzug_loeschen_hinweis': {
    de: 'Löscht Kisten, Bereiche, Fotos, Nachrichten und alle Mitgliedschaften. Das lässt sich nicht rückgängig machen.',
    ar: 'يحذف الصناديق والمناطق والصور والرسائل وكل العضويات. لا يمكن التراجع عن ذلك.',
  },
  'team.loeschen_titel': { de: 'Umzug endgültig löschen', ar: 'حذف النقلة نهائيًا' },
  'team.loeschen_text': {
    de: 'Alles in diesem Umzug wird gelöscht: Kisten, Bereiche, Fotos, Nachrichten und Mitgliedschaften. Tippe zur Sicherheit den Namen ein.',
    ar: 'سيُحذف كل شيء في هذه النقلة: الصناديق والمناطق والصور والرسائل والعضويات. اكتب الاسم للتأكيد.',
  },
  'team.loeschen_name_hinweis': {
    de: 'Muss Zeichen für Zeichen stimmen.',
    ar: 'يجب أن يطابق الاسم حرفًا بحرف.',
  },
  'team.loeschen_ja': { de: 'Ja, löschen', ar: 'نعم، احذف' },
  'team.geloescht': { de: 'Umzug gelöscht', ar: 'تم حذف النقلة' },
}
