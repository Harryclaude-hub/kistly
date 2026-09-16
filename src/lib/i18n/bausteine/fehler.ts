import type { Woerterbuch } from '../woerter'

/* Meldungen aus dem Datenzugriff und den Hilfsmodulen. Sie erscheinen als
 * Hinweis oder in einer Fehlerkarte, gehoeren also zum Programm und werden
 * uebersetzt.
 *
 * Der Platzhalter {grund} traegt den Klartext, den der Server geliefert
 * hat. Der kommt aus errText und ist selbst schon uebersetzt.
 *
 * Nicht hier: die Texte aus console.warn. Die liest nur, wer die Konsole
 * offen hat, und die bleiben darum deutsch.
 */
export const fehler: Woerterbuch = {
  // --------------------------------------------------------- Allgemein
  'fehler.keine_daten': { de: 'keine Daten erhalten', ar: 'لم تصل أي بيانات' },
  'fehler.nicht_angemeldet': { de: 'Nicht angemeldet', ar: 'لست مسجّل الدخول' },

  // ---------------------------------------------------------- Umzuege
  'fehler.umzuege_laden': {
    de: 'Umzuege laden: {grund}',
    ar: 'تعذّر تحميل النقلات: {grund}',
  },
  'fehler.umzug_laden': { de: 'Umzug laden: {grund}', ar: 'تعذّر تحميل النقلة: {grund}' },
  'fehler.umzug_anlegen': { de: 'Umzug anlegen: {grund}', ar: 'تعذّر إنشاء النقلة: {grund}' },
  'fehler.umzug_speichern': { de: 'Umzug speichern: {grund}', ar: 'تعذّر حفظ النقلة: {grund}' },
  'fehler.umzug_loeschen': { de: 'Umzug loeschen: {grund}', ar: 'تعذّر حذف النقلة: {grund}' },
  'fehler.beitreten': { de: 'Beitreten: {grund}', ar: 'تعذّر الانضمام: {grund}' },
  'fehler.umzug_fehlt': {
    de: 'Dieser Umzug existiert nicht oder du bist nicht eingeladen.',
    ar: 'هذه النقلة غير موجودة أو لم تتم دعوتك إليها.',
  },
  'fehler.umzug_unsichtbar': {
    de: 'Der Umzug zu dieser Kiste ist fuer dich nicht sichtbar.',
    ar: 'النقلة التي ينتمي إليها هذا الصندوق غير ظاهرة لك.',
  },
  'fehler.zaehlwerte_laden': {
    de: 'Zaehlwerte laden: {grund}',
    ar: 'تعذّر تحميل الأعداد: {grund}',
  },
  'fehler.zaehlwerte_bereich': {
    de: 'Zaehlwerte je Bereich: {grund}',
    ar: 'تعذّر تحميل أعداد المناطق: {grund}',
  },

  // -------------------------------------------------------- Mitglieder
  'fehler.mitglieder_laden': {
    de: 'Mitglieder laden: {grund}',
    ar: 'تعذّر تحميل الأعضاء: {grund}',
  },
  'fehler.rolle_aendern': { de: 'Rolle aendern: {grund}', ar: 'تعذّر تغيير الدور: {grund}' },
  'fehler.mitglied_entfernen': {
    de: 'Mitglied entfernen: {grund}',
    ar: 'تعذّرت إزالة العضو: {grund}',
  },

  // ------------------------------------------------------- Einladungen
  'fehler.einladungen_laden': {
    de: 'Einladungen laden: {grund}',
    ar: 'تعذّر تحميل الدعوات: {grund}',
  },
  'fehler.einladung_anlegen': {
    de: 'Einladung anlegen: {grund}',
    ar: 'تعذّر إنشاء الدعوة: {grund}',
  },
  'fehler.einladung_aendern': {
    de: 'Einladung aendern: {grund}',
    ar: 'تعذّر تغيير الدعوة: {grund}',
  },

  // ---------------------------------------------------------- Bereiche
  'fehler.bereiche_laden': { de: 'Bereiche laden: {grund}', ar: 'تعذّر تحميل المناطق: {grund}' },
  'fehler.bereich_anlegen': { de: 'Bereich anlegen: {grund}', ar: 'تعذّر إنشاء المنطقة: {grund}' },
  'fehler.bereich_speichern': {
    de: 'Bereich speichern: {grund}',
    ar: 'تعذّر حفظ المنطقة: {grund}',
  },
  'fehler.bereich_loeschen': { de: 'Bereich loeschen: {grund}', ar: 'تعذّر حذف المنطقة: {grund}' },
  'fehler.zimmer_person_laden': {
    de: 'Zimmer und Person laden: {grund}',
    ar: 'تعذّر تحميل الغرفة والشخص: {grund}',
  },

  // ------------------------------------------------------------ Kisten
  'fehler.kisten_laden': { de: 'Kisten laden: {grund}', ar: 'تعذّر تحميل الصناديق: {grund}' },
  'fehler.kiste_laden': { de: 'Kiste laden: {grund}', ar: 'تعذّر تحميل الصندوق: {grund}' },
  'fehler.kiste_anlegen': { de: 'Kiste anlegen: {grund}', ar: 'تعذّر إنشاء الصندوق: {grund}' },
  'fehler.kiste_speichern': { de: 'Kiste speichern: {grund}', ar: 'تعذّر حفظ الصندوق: {grund}' },
  'fehler.kiste_loeschen': { de: 'Kiste loeschen: {grund}', ar: 'تعذّر حذف الصندوق: {grund}' },
  'fehler.kiste_suchen': { de: 'Kiste suchen: {grund}', ar: 'تعذّر البحث عن الصندوق: {grund}' },
  'fehler.kiste_fehlt': { de: 'Diese Kiste gibt es nicht mehr.', ar: 'هذا الصندوق لم يعد موجوداً.' },
  'fehler.code_suchen': { de: 'Code suchen: {grund}', ar: 'تعذّر البحث عن الرمز: {grund}' },
  'fehler.alter_code_suchen': {
    de: 'Alten Code suchen: {grund}',
    ar: 'تعذّر البحث عن الرمز القديم: {grund}',
  },

  // ----------------------------------------------------------- Inhalte
  'fehler.inhalt_laden': { de: 'Inhalt laden: {grund}', ar: 'تعذّر تحميل المحتويات: {grund}' },
  'fehler.inhalte_laden': { de: 'Inhalte laden: {grund}', ar: 'تعذّر تحميل المحتويات: {grund}' },
  'fehler.eintrag_anlegen': { de: 'Eintrag anlegen: {grund}', ar: 'تعذّر إضافة الإدخال: {grund}' },
  'fehler.eintrag_speichern': {
    de: 'Eintrag speichern: {grund}',
    ar: 'تعذّر حفظ الإدخال: {grund}',
  },
  'fehler.eintrag_loeschen': { de: 'Eintrag loeschen: {grund}', ar: 'تعذّر حذف الإدخال: {grund}' },

  // ------------------------------------------------------------- Fotos
  'fehler.fotos_laden': { de: 'Fotos laden: {grund}', ar: 'تعذّر تحميل الصور: {grund}' },
  'fehler.foto_speichern': { de: 'Foto speichern: {grund}', ar: 'تعذّر حفظ الصورة: {grund}' },
  'fehler.foto_loeschen': { de: 'Foto loeschen: {grund}', ar: 'تعذّر حذف الصورة: {grund}' },
  'fehler.hochladen': { de: 'Hochladen: {grund}', ar: 'تعذّر الرفع: {grund}' },

  // ----------------------------------------------------------- Verlauf
  'fehler.verlauf_laden': { de: 'Verlauf laden: {grund}', ar: 'تعذّر تحميل السجل: {grund}' },

  // -------------------------------------------------------------- Chat
  'fehler.nachrichten_laden': {
    de: 'Nachrichten laden: {grund}',
    ar: 'تعذّر تحميل الرسائل: {grund}',
  },
  'fehler.nachricht_senden': {
    de: 'Nachricht senden: {grund}',
    ar: 'تعذّر إرسال الرسالة: {grund}',
  },
  'fehler.nachricht_loeschen': {
    de: 'Nachricht loeschen: {grund}',
    ar: 'تعذّر حذف الرسالة: {grund}',
  },
  'fehler.nachricht_aendern': {
    de: 'Nachricht aendern: {grund}',
    ar: 'تعذّر تعديل الرسالة: {grund}',
  },
  'fehler.reaktion_setzen': {
    de: 'Reaktion setzen: {grund}',
    ar: 'تعذّرت إضافة التفاعل: {grund}',
  },
  'fehler.reaktion_entfernen': {
    de: 'Reaktion entfernen: {grund}',
    ar: 'تعذّرت إزالة التفاعل: {grund}',
  },

  // ------------------------------------------------------------ Anrufe
  'fehler.anruf_starten': { de: 'Anruf starten: {grund}', ar: 'تعذّر بدء المكالمة: {grund}' },
  'fehler.anruf_laden': { de: 'Anruf laden: {grund}', ar: 'تعذّر تحميل المكالمة: {grund}' },
  'fehler.anruf_aendern': { de: 'Anruf aendern: {grund}', ar: 'تعذّر تغيير المكالمة: {grund}' },
  'fehler.anruf_fehlt': { de: 'Anruf nicht gefunden', ar: 'لم يتم العثور على المكالمة' },
  'fehler.teilnehmer_eintragen': {
    de: 'Teilnehmer eintragen: {grund}',
    ar: 'تعذّر تسجيل المشاركين: {grund}',
  },
  'fehler.teilnehmer_aendern': {
    de: 'Teilnehmer aendern: {grund}',
    ar: 'تعذّر تغيير المشارك: {grund}',
  },
  'fehler.mikrofon_abgelehnt': {
    de: 'Zugriff auf Mikrofon wurde abgelehnt. Ohne Mikrofon geht kein Anruf.',
    ar: 'تم رفض الوصول إلى الميكروفون. لا مكالمة بدون ميكروفون.',
  },
  'fehler.mikrofon_fehlt': {
    de: 'Mikrofon nicht verfuegbar: {grund}',
    ar: 'الميكروفون غير متاح: {grund}',
  },
  'fehler.signalkanal': {
    de: 'Der Signalkanal ist abgebrochen. Anruf neu starten.',
    ar: 'انقطعت قناة الاتصال. ابدأ المكالمة من جديد.',
  },
  'fehler.verbindung_direkt': {
    de: 'Die direkte Verbindung kam nicht zustande. Das passiert in manchen Mobilfunknetzen ohne TURN-Server.',
    ar: 'لم يتم إنشاء الاتصال المباشر. يحدث ذلك في بعض شبكات الهاتف عندما لا يتوفر خادم TURN.',
  },

  // ---------------------------------------------------------- Aufnahme
  'fehler.keine_aufnahme': { de: 'Es laeuft keine Aufnahme', ar: 'لا يوجد تسجيل جارٍ' },
  'fehler.aufnahme_leer': {
    de: 'Die Aufnahme ist leer geblieben',
    ar: 'بقي التسجيل فارغاً',
  },

  // ------------------------------------------------------ Einstellungen
  'fehler.prefs_laden': {
    de: 'Einstellungen laden: {grund}',
    ar: 'تعذّر تحميل الإعدادات: {grund}',
  },
  'fehler.prefs_anlegen': {
    de: 'Einstellungen anlegen: {grund}',
    ar: 'تعذّر إنشاء الإعدادات: {grund}',
  },
  'fehler.prefs_speichern': {
    de: 'Einstellungen speichern: {grund}',
    ar: 'تعذّر حفظ الإعدادات: {grund}',
  },

  // -------------------------------------------------------------- Push
  'fehler.push_nicht_moeglich': {
    de: 'Dieser Browser kann keine Push-Benachrichtigungen.',
    ar: 'هذا المتصفح لا يدعم الإشعارات.',
  },
  'fehler.push_kein_schluessel': {
    de: 'Es ist kein VAPID-Schluessel hinterlegt. Ohne den kann der Server nichts schicken.',
    ar: 'لا يوجد مفتاح VAPID. بدونه لا يستطيع الخادم إرسال أي شيء.',
  },
  'fehler.push_blockiert': {
    de: 'Benachrichtigungen wurden im Browser blockiert. Das musst du in den Seiteneinstellungen wieder erlauben.',
    ar: 'تم حظر الإشعارات في المتصفح. اسمح بها من جديد في إعدادات الموقع.',
  },
  'fehler.push_keine_erlaubnis': {
    de: 'Ohne Erlaubnis gibt es keine Benachrichtigungen.',
    ar: 'بدون إذن لا توجد إشعارات.',
  },
  'fehler.push_abo_unvollstaendig': {
    de: 'Das Abo des Browsers war unvollstaendig.',
    ar: 'كان اشتراك المتصفح ناقصاً.',
  },
  'fehler.push_abo_speichern': {
    de: 'Abo speichern: {grund}',
    ar: 'تعذّر حفظ الاشتراك: {grund}',
  },

  // --------------------------------------- Aus errText, Antwort des Servers
  'fehler.mail_limit': {
    de: 'Supabase wollte eine Bestaetigungsmail verschicken und hat das Stundenlimit erreicht. Abhilfe: in der Projektverwaltung unter Authentication, Sign In, Email die Option "Confirm email" ausschalten. Dann wird gar keine Mail mehr verschickt und die Registrierung geht sofort durch.',
    ar: 'حاول Supabase إرسال رسالة تأكيد وبلغ الحد المسموح في الساعة. الحل: في إدارة المشروع ضمن Authentication ثم Sign In ثم Email أوقف خيار "Confirm email". عندها لا تُرسل أي رسالة ويكتمل التسجيل فوراً.',
  },
  'fehler.zu_viele_versuche': {
    de: 'Zu viele Versuche kurz hintereinander. Warte einen Moment und probier es noch einmal.',
    ar: 'محاولات كثيرة في وقت قصير. انتظر قليلاً ثم حاول مرة أخرى.',
  },
  'fehler.registrierung_aus': {
    de: 'Registrierung ist in diesem Projekt abgeschaltet.',
    ar: 'التسجيل معطّل في هذا المشروع.',
  },
  'fehler.login_falsch': {
    de: 'E-Mail oder Passwort stimmt nicht.',
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  },
  'fehler.mail_vergeben': {
    de: 'Diese E-Mail ist schon registriert.',
    ar: 'هذا البريد الإلكتروني مسجّل من قبل.',
  },
  'fehler.mail_unbestaetigt': {
    de: 'Das Konto wartet noch auf eine Bestaetigung. Sag Bescheid, dann wird es freigeschaltet.',
    ar: 'الحساب ما زال بانتظار التأكيد. أخبرنا وسيتم تفعيله.',
  },
  'fehler.passwort_kurz': {
    de: 'Das Passwort braucht mindestens 6 Zeichen.',
    ar: 'كلمة المرور تحتاج 6 أحرف على الأقل.',
  },
  'fehler.passwort_gleich': {
    de: 'Das neue Passwort muss sich vom alten unterscheiden.',
    ar: 'كلمة المرور الجديدة يجب أن تختلف عن القديمة.',
  },
  'fehler.sitzung_weg': {
    de: 'Die Sitzung ist abgelaufen. Bitte neu anmelden.',
    ar: 'انتهت الجلسة. سجّل الدخول من جديد.',
  },
  'fehler.kuerzel_vergeben': {
    de: 'Dieses Kuerzel ist in diesem Umzug schon vergeben.',
    ar: 'هذا الرمز مستخدم بالفعل في هذه النقلة.',
  },
  'fehler.eintrag_doppelt': { de: 'Der Eintrag existiert schon.', ar: 'الإدخال موجود بالفعل.' },
  'fehler.keine_berechtigung': {
    de: 'Dafuer fehlt dir die Berechtigung in diesem Umzug.',
    ar: 'لا تملك الصلاحية لذلك في هذه النقلة.',
  },
  'fehler.bereiche_zusammenfuehren': {
    de: 'Bereiche zusammenfuehren: {grund}',
    ar: 'تعذّر دمج المناطق: {grund}',
  },
  'fehler.inhalt_verschieben': {
    de: 'Inhalt verschieben: {grund}',
    ar: 'تعذّر نقل المحتوى: {grund}',
  },
  'fehler.keine_verbindung': {
    de: 'Keine Verbindung zum Server. Internet pruefen.',
    ar: 'لا يوجد اتصال بالخادم. تحقق من الإنترنت.',
  },
}
