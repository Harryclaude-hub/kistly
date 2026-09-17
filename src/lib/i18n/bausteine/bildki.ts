import type { Woerterbuch } from '../woerter'

/* Bilderkennung.
 *
 * Die Texte sagen ausdruecklich, was passiert: dass das Bild den Server
 * verlaesst, dass es Geld kostet, und dass ein Vorschlag ein Vorschlag
 * bleibt, bis jemand ihn uebernimmt.
 */
export const bildki: Woerterbuch = {
  'bildki.titel': { de: 'Aus dem Foto lesen', ar: 'القراءة من الصورة' },
  'bildki.knopf': { de: 'Inhalt aus Foto lesen', ar: 'قراءة المحتوى من الصورة' },
  'bildki.knopf_kurz': { de: 'Foto lesen', ar: 'قراءة الصورة' },
  'bildki.laeuft': { de: 'Das Bild wird gelesen', ar: 'جارٍ قراءة الصورة' },
  'bildki.erklaerung': {
    de: 'Die Erkennung sieht sich das Foto an und schlaegt vor, was darauf liegt. Nichts wird von allein eingetragen: du entscheidest Zeile fuer Zeile.',
    ar: 'يفحص التعرّف الصورة ويقترح ما فيها. لا يُسجَّل شيء تلقائياً: أنت تقرر سطراً بسطر.',
  },

  'bildki.keine_bilder': {
    de: 'Es gibt noch kein Foto zum Lesen. Mach zuerst eins.',
    ar: 'لا توجد صورة للقراءة بعد. التقط واحدة أولاً.',
  },
  'bildki.kein_ergebnis': {
    de: 'Auf diesem Bild war nichts zu erkennen. Ein Foto von naeher dran oder bei besserem Licht hilft meistens.',
    ar: 'لم يُتعرَّف على شيء في هذه الصورة. عادةً تساعد صورة من مسافة أقرب أو بإضاءة أفضل.',
  },
  'bildki.bild_nummer': { de: 'Bild {n}', ar: 'الصورة {n}' },

  'bildki.uebernehmen': { de: 'Uebernehmen', ar: 'اعتماد' },
  'bildki.alle_uebernehmen': { de: 'Alle gewaehlten uebernehmen', ar: 'اعتماد كل المحدّد' },
  'bildki.uebernommen.eins': { de: '1 Zeile uebernommen', ar: 'تم اعتماد سطر واحد' },
  'bildki.uebernommen.viele': { de: '{n} Zeilen uebernommen', ar: 'تم اعتماد {n} سطور' },
  'bildki.teilweise_uebernommen': {
    de: '{ok} uebernommen, {fehler} nicht. Grund: {grund}',
    ar: 'تم اعتماد {ok}، وفشل {fehler}. السبب: {grund}',
  },
  'bildki.nichts_gewaehlt': { de: 'Nichts ausgewaehlt', ar: 'لم يُحدَّد شيء' },
  'bildki.schon_drin': { de: 'Steht schon in der Liste', ar: 'موجود في القائمة' },

  'bildki.stufe_sicher': { de: 'Sicher', ar: 'مؤكّد' },
  'bildki.stufe_wahrscheinlich': { de: 'Wahrscheinlich', ar: 'على الأرجح' },
  'bildki.stufe_unsicher': { de: 'Unsicher', ar: 'غير مؤكّد' },
  'bildki.stufe_hinweis': {
    de: 'Die Stufe ist eine Selbsteinschaetzung der Erkennung, keine Messung. Sieh die unsicheren Zeilen durch, bevor du sie uebernimmst.',
    ar: 'الدرجة تقدير ذاتي من التعرّف، وليست قياساً. راجع السطور غير المؤكدة قبل اعتمادها.',
  },

  'bildki.menge': { de: 'Menge', ar: 'العدد' },
  'bildki.zeile_aendern': { de: 'Zeile aendern', ar: 'تعديل السطر' },

  'bildki.kostet': {
    de: 'Jedes neue Bild kostet einen Bruchteil eines Cent. Ein Bild, das schon gelesen wurde, kostet nichts mehr.',
    ar: 'كل صورة جديدة تكلّف جزءاً من السنت. الصورة التي قُرئت من قبل لا تكلّف شيئاً.',
  },
  'bildki.aus_speicher': { de: 'Schon gelesen', ar: 'قُرئت سابقاً' },
  'bildki.neu_lesen': { de: 'Neu lesen', ar: 'إعادة القراءة' },
  'bildki.neu_lesen_frage': {
    de: 'Das Bild wird noch einmal gelesen und kostet wieder. Die bisherigen Vorschlaege gehen dabei verloren.',
    ar: 'ستُقرأ الصورة من جديد وستُكلّف مجدداً، وستضيع الاقتراحات الحالية.',
  },
  'bildki.rest': {
    de: 'Heute noch frei: {projekt} fuer diesen Umzug, {nutzer} fuer dich in dieser Stunde.',
    ar: 'المتبقّي اليوم: {projekt} لهذه النقلة، و{nutzer} لك خلال هذه الساعة.',
  },
  'bildki.grenze_erreicht': {
    de: 'Die Grenze fuer heute ist erreicht. {n} Bilder sind darum liegen geblieben. Morgen geht es weiter.',
    ar: 'تم بلوغ حدّ اليوم. لذلك بقيت {n} صور دون قراءة. يمكنك المتابعة غداً.',
  },

  'bildki.datenschutz': {
    de: 'Zum Lesen wird das Bild an den Erkennungsdienst geschickt. Fotografier nichts, was niemanden angeht: Papiere, Rezepte, Ausweise.',
    ar: 'لقراءتها تُرسَل الصورة إلى خدمة التعرّف. لا تصوّر ما لا يخصّ أحداً: أوراقاً أو وصفات أو هويات.',
  },

  'bildki.sprache_anders': {
    de: 'Diese Vorschlaege wurden auf {sprache} gelesen. Sie bleiben so stehen, denn ab jetzt sind sie dein Inhalt.',
    ar: 'قُرئت هذه الاقتراحات بلغة {sprache}. تبقى كما هي، فهي من الآن محتواك.',
  },
  'bildki.sprache_de': { de: 'Deutsch', ar: 'الألمانية' },
  'bildki.sprache_ar': { de: 'Arabisch', ar: 'العربية' },

  'bildki.kein_schluessel_titel': { de: 'Die Erkennung ist noch nicht eingeschaltet', ar: 'التعرّف غير مُفعّل بعد' },
  'bildki.kein_schluessel': {
    de: 'Es fehlt der Schluessel fuer den Erkennungsdienst. Er wird einmal im Supabase-Projekt hinterlegt, entweder als Function Secret ANTHROPIC_API_KEY oder als Zeile in private.config. Danach laeuft es ohne weiteres Zutun.',
    ar: 'مفتاح خدمة التعرّف ناقص. يُضاف مرة واحدة في مشروع Supabase، إما كسرّ للدالة باسم ANTHROPIC_API_KEY أو كسطر في private.config. بعدها يعمل كل شيء تلقائياً.',
  },
  'bildki.nur_lesen': {
    de: 'Nur Bearbeiter duerfen Bilder lesen lassen.',
    ar: 'المحرّرون فقط يمكنهم تشغيل قراءة الصور.',
  },
}
