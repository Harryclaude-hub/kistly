import type { Woerterbuch } from '../woerter'

/* Die Schnellansicht.
 *
 * Sie erscheint nach jedem Scan. Wichtig ist, was man beim Tragen in der
 * Hand braucht: was ist das, wo gehoert es hin, ist es schon da. Alles
 * andere steht auf der vollen Seite.
 */
export const schnell: Woerterbuch = {
  'schnell.laedt': { de: 'Kiste wird geholt', ar: 'جارٍ إحضار الصندوق' },
  'schnell.nicht_gefunden': { de: 'Dazu gibt es nichts.', ar: 'لا يوجد شيء لذلك.' },

  'schnell.angekommen_knopf': { de: 'Angekommen', ar: 'وصل' },
  'schnell.angekommen_hinweis': {
    de: 'Ein Tippen, dann steht sie auf angekommen.',
    ar: 'ضغطة واحدة ويصبح في حالة وصل.',
  },
  'schnell.wieder_offen': { de: 'Doch nicht angekommen', ar: 'لم يصل بعد' },
  'schnell.status_aendern': { de: 'Status', ar: 'الحالة' },

  'schnell.deckbild': { de: 'Deckbild', ar: 'الصورة الرئيسية' },
  'schnell.kein_deckbild': { de: 'Noch kein Deckbild', ar: 'لا توجد صورة رئيسية بعد' },
  'schnell.deckbild_aufnehmen': { de: 'Deckbild aufnehmen', ar: 'التقاط صورة رئيسية' },
  'schnell.deckbild_wechseln': { de: 'Anderes Deckbild', ar: 'تغيير الصورة الرئيسية' },
  'schnell.deckbild_gesetzt': { de: 'Deckbild gesetzt', ar: 'تم تعيين الصورة الرئيسية' },
  'schnell.deckbild_hinweis': {
    de: 'Das Bild erscheint beim naechsten Scan sofort. Dann sieht man, was man in der Hand hat, ohne zu lesen.',
    ar: 'تظهر الصورة فوراً عند المسح التالي، فتعرف ما بيدك دون قراءة.',
  },
  'schnell.bild_laedt_hoch': { de: 'Bild wird hochgeladen', ar: 'جارٍ رفع الصورة' },

  'schnell.notiz': { de: 'Kurznotiz', ar: 'ملاحظة قصيرة' },
  'schnell.notiz_platzhalter': {
    de: 'Steht im Keller, oben aufmachen, Glas',
    ar: 'في القبو، يُفتح من الأعلى، زجاج',
  },
  'schnell.notiz_leer': {
    de: 'Noch nichts notiert. Antippen zum Schreiben.',
    ar: 'لا توجد ملاحظة بعد. اضغط للكتابة.',
  },
  'schnell.notiz_speichern': { de: 'Notiz sichern', ar: 'حفظ الملاحظة' },
  'schnell.notiz_gespeichert': { de: 'Notiz gesichert', ar: 'تم حفظ الملاحظة' },

  'schnell.inhalt_leer': { de: 'Kein Inhalt eingetragen', ar: 'لم يُسجّل محتوى' },
  'schnell.inhalt_mehr': { de: 'und {n} weitere', ar: 'و{n} أخرى' },

  'schnell.tippen_hinweis': {
    de: 'Tipp irgendwo hier hin, dann siehst du alles: Tabelle, Notizen und alle Bilder.',
    ar: '\u0627\u0636\u063a\u0637 \u0641\u064a \u0623\u064a \u0645\u0643\u0627\u0646 \u0647\u0646\u0627 \u0644\u062a\u0631\u0649 \u0643\u0644 \u0634\u064a\u0621: \u0627\u0644\u062c\u062f\u0648\u0644 \u0648\u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0648\u0643\u0644 \u0627\u0644\u0635\u0648\u0631.',
  },
  'schnell.oeffnen': { de: 'Ganz oeffnen', ar: 'فتح بالكامل' },
  'schnell.weiter': { de: 'Weiter scannen', ar: 'متابعة المسح' },
  'schnell.schliessen': { de: 'Schliessen', ar: 'إغلاق' },
  'schnell.alter_code_gescannt': {
    de: 'Gescannt wurde das alte Etikett {code}. Die Kiste heisst jetzt anders.',
    ar: 'تم مسح الملصق القديم {code}. الصندوق له رقم آخر الآن.',
  },
}
