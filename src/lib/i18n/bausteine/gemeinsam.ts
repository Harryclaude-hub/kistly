import type { Woerterbuch } from '../woerter'

/* Texte, die an vielen Stellen vorkommen: Navigation, Knoepfe, Zustaende,
 * Status, Rollen, Groessen. Seitenspezifisches gehoert in den jeweiligen
 * Baustein, nicht hierher. */
export const gemeinsam: Woerterbuch = {
  // ------------------------------------------------------------ Navigation
  'nav.umzuege': { de: 'Umzuege', ar: 'النقلات' },
  'nav.kisten': { de: 'Kisten', ar: 'الصناديق' },
  'nav.scannen': { de: 'Scannen', ar: 'مسح' },
  'nav.chat': { de: 'Chat', ar: 'المحادثة' },
  'nav.profil': { de: 'Profil', ar: 'حسابي' },

  // --------------------------------------------------------------- Aktionen
  'aktion.speichern': { de: 'Speichern', ar: 'حفظ' },
  'aktion.abbrechen': { de: 'Abbrechen', ar: 'إلغاء' },
  'aktion.loeschen': { de: 'Loeschen', ar: 'حذف' },
  'aktion.entfernen': { de: 'Entfernen', ar: 'إزالة' },
  'aktion.schliessen': { de: 'Schliessen', ar: 'إغلاق' },
  'aktion.zurueck': { de: 'Zurueck', ar: 'رجوع' },
  'aktion.anlegen': { de: 'Anlegen', ar: 'إنشاء' },
  'aktion.bearbeiten': { de: 'Bearbeiten', ar: 'تعديل' },
  'aktion.kopieren': { de: 'Kopieren', ar: 'نسخ' },
  'aktion.teilen': { de: 'Teilen', ar: 'مشاركة' },
  'aktion.suchen': { de: 'Suchen', ar: 'بحث' },
  'aktion.neu': { de: 'Neu', ar: 'جديد' },
  'aktion.fertig': { de: 'Fertig', ar: 'تم' },
  'aktion.weiter': { de: 'Weiter', ar: 'متابعة' },
  'aktion.alle': { de: 'Alle', ar: 'الكل' },
  'aktion.filter': { de: 'Filter', ar: 'تصفية' },
  'aktion.drucken': { de: 'Drucken', ar: 'طباعة' },
  'aktion.exportieren': { de: 'Als CSV exportieren', ar: 'تصدير كملف CSV' },
  'aktion.nochmal': { de: 'Nochmal versuchen', ar: 'حاول مرة أخرى' },
  'aktion.mehr_laden': { de: 'Weitere laden', ar: 'تحميل المزيد' },

  // -------------------------------------------------------------- Zustaende
  'zustand.laedt': { de: 'Laedt', ar: 'جارٍ التحميل' },
  'zustand.moment': { de: 'Moment', ar: 'لحظة' },
  'zustand.fehler': { de: 'Das hat nicht geklappt', ar: 'لم ينجح الأمر' },
  'zustand.nichts_gefunden': { de: 'Nichts gefunden', ar: 'لا توجد نتائج' },
  'zustand.unbekannter_fehler': { de: 'Unbekannter Fehler', ar: 'خطأ غير معروف' },

  // ---------------------------------------------------------------- Begriffe
  'begriff.umzug': { de: 'Umzug', ar: 'نقلة' },
  'begriff.zimmer': { de: 'Zimmer', ar: 'غرفة' },
  'begriff.person': { de: 'Person', ar: 'شخص' },
  'begriff.personen': { de: 'Personen', ar: 'الأشخاص' },
  'begriff.bereich': { de: 'Bereich', ar: 'منطقة' },
  'begriff.bereiche': { de: 'Bereiche', ar: 'المناطق' },
  'begriff.kiste': { de: 'Kiste', ar: 'صندوق' },
  'begriff.groesse': { de: 'Groesse', ar: 'الحجم' },
  'begriff.kuerzel': { de: 'Kuerzel', ar: 'الرمز' },
  'begriff.farbe': { de: 'Farbe', ar: 'اللون' },
  'begriff.name': { de: 'Name', ar: 'الاسم' },
  'begriff.notiz': { de: 'Notiz', ar: 'ملاحظة' },
  'begriff.titel': { de: 'Titel', ar: 'العنوان' },
  'begriff.status': { de: 'Status', ar: 'الحالة' },
  'begriff.inhalt': { de: 'Inhalt', ar: 'المحتويات' },
  'begriff.fotos': { de: 'Fotos', ar: 'الصور' },
  'begriff.verlauf': { de: 'Verlauf', ar: 'السجل' },
  'begriff.mitglieder': { de: 'Mitglieder', ar: 'الأعضاء' },
  'begriff.zerbrechlich': { de: 'Zerbrechlich', ar: 'قابل للكسر' },
  'begriff.ziel': { de: 'Ziel', ar: 'الوجهة' },
  'begriff.optional': { de: 'Optional', ar: 'اختياري' },
  'begriff.kisten_anzahl.eins': { de: '{n} Kiste', ar: 'صندوق واحد' },
  'begriff.kisten_anzahl.viele': { de: '{n} Kisten', ar: '{n} صندوق' },
  'begriff.mitglieder_anzahl.eins': { de: '{n} Mitglied', ar: 'عضو واحد' },
  'begriff.mitglieder_anzahl.viele': { de: '{n} Mitglieder', ar: '{n} أعضاء' },
  'begriff.eintraege.eins': { de: '{n} Eintrag', ar: 'إدخال واحد' },
  'begriff.eintraege.viele': { de: '{n} Eintraege', ar: '{n} إدخالات' },

  // ------------------------------------------------------------------ Status
  'status.open': { de: 'Alte Wohnung', ar: 'في البيت القديم' },
  'status.transit': { de: 'Unterwegs', ar: 'في الطريق' },
  'status.arrived': { de: 'Angekommen', ar: 'وصل' },
  'status.angekommen_von': { de: '{a} von {b} angekommen', ar: 'وصل {a} من أصل {b}' },

  // --------------------------------------------------------------- Kistenart
  'art.box': { de: 'Kiste', ar: 'صندوق' },
  'art.furniture': { de: 'Moebelstueck', ar: 'قطعة أثاث' },
  'art.bag': { de: 'Tasche', ar: 'حقيبة' },
  'art.other': { de: 'Sonstiges', ar: 'أخرى' },

  // ------------------------------------------------------------------ Rollen
  'rolle.owner': { de: 'Besitzer', ar: 'المالك' },
  'rolle.editor': { de: 'Bearbeiter', ar: 'محرر' },
  'rolle.viewer': { de: 'Nur lesen', ar: 'قراءة فقط' },

  // ---------------------------------------------------------------- Groessen
  'groesse.1': { de: 'winzig', ar: 'ضئيل' },
  'groesse.2': { de: 'sehr klein', ar: 'صغير للغاية' },
  'groesse.3': { de: 'klein', ar: 'صغير' },
  'groesse.4': { de: 'eher klein', ar: 'أصغر من المتوسط' },
  'groesse.5': { de: 'mittel', ar: 'متوسط' },
  'groesse.6': { de: 'eher gross', ar: 'أكبر من المتوسط' },
  'groesse.7': { de: 'gross', ar: 'كبير' },
  'groesse.8': { de: 'sehr gross', ar: 'كبير جدًا' },
  'groesse.9': { de: 'riesig', ar: 'ضخم' },
  'groesse.10': { de: 'sperrig', ar: 'ضخم وثقيل' },
  'groesse.von_zehn': { de: 'Groesse {n} von 10, {wort}', ar: 'الحجم {n} من 10، {wort}' },

  // ------------------------------------------- Von ui.tsx direkt gebraucht
  'konto.passwort_anzeigen': { de: 'Passwort anzeigen', ar: 'إظهار كلمة المرور' },
  'konto.passwort_verbergen': { de: 'Passwort verbergen', ar: 'إخفاء كلمة المرور' },

  // ------------------------------------------------------------ Kopfzeile
  'kopf.profil': { de: 'Profil und Einstellungen', ar: 'الحساب والإعدادات' },
  'kopf.darstellung': { de: 'Darstellung umschalten, aktuell {wert}', ar: 'تبديل المظهر، الحالي {wert}' },
  'kopf.sprache': { de: 'Sprache umschalten, aktuell {wert}', ar: 'تغيير اللغة، الحالية {wert}' },
  'kopf.bewegung': { de: 'Bewegung umschalten, aktuell {wert}', ar: 'تبديل الحركة، الحالي {wert}' },
}
