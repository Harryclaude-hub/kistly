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

  'schnell.oeffnen': { de: 'Ganz oeffnen', ar: 'فتح بالكامل' },
  'schnell.weiter': { de: 'Weiter scannen', ar: 'متابعة المسح' },
  'schnell.schliessen': { de: 'Schliessen', ar: 'إغلاق' },
  'schnell.alter_code_gescannt': {
    de: 'Gescannt wurde das alte Etikett {code}. Die Kiste heisst jetzt anders.',
    ar: 'تم مسح الملصق القديم {code}. الصندوق له رقم آخر الآن.',
  },
}
