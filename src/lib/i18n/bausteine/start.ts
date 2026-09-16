import type { Woerterbuch } from '../woerter'

/* Startseite und 404. Alle Schluessel beginnen mit start., die der
 * Fehlerseite zusaetzlich mit start.nichtgefunden.
 *
 * Der Name Kistly bleibt in beiden Sprachen Kistly. Die Beispielcodes
 * W-3-007, KZ-7-012 und S-1-003 bleiben ebenfalls unveraendert, sie stehen
 * genauso auf den gedruckten Etiketten.
 */
export const start: Woerterbuch = {
  // ------------------------------------------------------------ Kopfzeile
  'start.zur_app': { de: 'Zur App', ar: 'إلى التطبيق' },
  'start.anmelden': { de: 'Anmelden', ar: 'تسجيل الدخول' },
  'start.loslegen': { de: 'Loslegen', ar: 'ابدأ' },

  // ------------------------------------------------------------------ Hero
  'start.badge': { de: 'Umzugsplanung', ar: 'تنظيم النقلة' },
  'start.hero_1': { de: 'Jede Kiste hat', ar: 'لكل صندوق' },
  'start.hero_2': { de: 'eine Nummer.', ar: 'رقمه الخاص.' },
  /* Die dritte Zeile steht bei 375px allein auf einer Zeile, darum kurz. */
  'start.hero_3': { de: 'Und du weisst, wo sie ist.', ar: 'وتعرف مكانه.' },
  'start.hero_text': {
    de: 'Kistly vergibt fuer jedes Zimmer und jede Person ein Kuerzel, nummeriert jede Kiste automatisch, druckt die Etiketten mit QR-Code und zeigt dir beim Einzug in Sekunden, was schon da ist und was noch fehlt.',
    ar: 'يمنح Kistly كل غرفة وكل شخص رمزًا، ويرقّم كل صندوق تلقائيًا، ويطبع الملصقات مع رمز QR، ويُظهر لك عند الوصول خلال ثوانٍ ما وصل وما ينقص.',
  },
  'start.kostenlos_starten': { de: 'Kostenlos starten', ar: 'ابدأ مجانًا' },
  'start.habe_konto': { de: 'Ich habe schon ein Konto', ar: 'لدي حساب بالفعل' },
  'start.kein_link': {
    de: 'E-Mail und Passwort genuegen. Kein Bestaetigungslink noetig.',
    ar: 'بريد إلكتروني وكلمة مرور فقط. بلا رابط تأكيد.',
  },

  // ------------------------------------------------- Etikett in der Vorschau
  'start.demo_zimmer': { de: 'Kinderzimmer', ar: 'غرفة الأطفال' },
  'start.demo_inhalt_1': { de: 'Buecher vom Regal', ar: 'كتب من الرف' },
  'start.demo_inhalt_2': { de: 'Lego Kiste', ar: 'علبة ليغو' },
  'start.demo_inhalt_3': { de: 'Bettwaesche', ar: 'أغطية سرير' },
  'start.demo_inhalt_4': { de: 'Nachtlicht', ar: 'ضوء ليلي' },

  // ------------------------------------------------------- Das Nummernsystem
  'start.nummer_titel': { de: 'So liest sich eine Nummer', ar: 'كيف يُقرأ الرقم' },
  'start.nummer_text': {
    de: 'Der Code steht auf jedem Etikett und ist ueberall gleich aufgebaut. Man versteht ihn ohne Erklaerung, auch wenn man nur beim Tragen hilft.',
    ar: 'الرمز مطبوع على كل ملصق وبالتركيب نفسه دائمًا. يفهمه أي شخص بلا شرح، حتى لو جاء للمساعدة في الحمل فقط.',
  },
  'start.teil_kuerzel_text': {
    de: 'Zimmer oder Person. W fuer Wohnzimmer, KZ fuer Kinderzimmer, S fuer Sara.',
    ar: 'غرفة أو شخص. W لغرفة المعيشة، KZ لغرفة الأطفال، S لسارة.',
  },
  'start.teil_groesse_text': {
    de: '1 ist winzig, 10 ist sperrig. Steht immer rot, damit man die Traglast sofort sieht.',
    ar: '1 ضئيل و10 ضخم وثقيل. يظهر بالأحمر دائمًا لترى الوزن فورًا.',
  },
  'start.teil_nummer_titel': { de: 'Laufnummer', ar: 'الرقم المتسلسل' },
  'start.teil_nummer_text': {
    de: 'Fortlaufend je Kuerzel. Wird automatisch vergeben, nie doppelt.',
    ar: 'متسلسل لكل رمز. يُمنح تلقائيًا ولا يتكرر أبدًا.',
  },
  'start.beispiele': { de: 'Beispiele', ar: 'أمثلة' },

  // ------------------------------------------------------------- Vier Schritte
  'start.schritte_titel': { de: 'In vier Schritten', ar: 'في أربع خطوات' },
  'start.schritt1_titel': { de: 'Bereiche anlegen', ar: 'أنشئ المناطق' },
  'start.schritt1_text': {
    de: 'Jedes Zimmer und jede Person bekommt einen Namen, ein Kuerzel und eine Farbe. Wohnzimmer wird W, Kinderzimmer wird KZ, Sara wird S.',
    ar: 'كل غرفة وكل شخص يحصل على اسم ورمز ولون. غرفة المعيشة تصبح W، غرفة الأطفال KZ، وسارة S.',
  },
  'start.schritt2_titel': { de: 'Kisten nummerieren', ar: 'رقّم الصناديق' },
  'start.schritt2_text': {
    de: 'Jede Kiste gehoert zu einem Zimmer, einer Person oder beidem. Kistly vergibt den Code automatisch, fortlaufend und ohne Dopplung.',
    ar: 'كل صندوق يخص غرفة أو شخصًا أو كليهما. يمنح Kistly الرمز تلقائيًا، متسلسلًا وبلا تكرار.',
  },
  'start.schritt3_titel': { de: 'Etiketten drucken', ar: 'اطبع الملصقات' },
  'start.schritt3_text': {
    de: 'QR-Code, Nummer, Farbe und die Inhaltsliste auf ein Blatt. Ausdrucken, aufkleben, fertig.',
    ar: 'رمز QR والرقم واللون وقائمة المحتويات على ورقة واحدة. اطبع، ألصق، انتهى.',
  },
  'start.schritt4_titel': { de: 'Scannen und abhaken', ar: 'امسح وتحقّق' },
  'start.schritt4_text': {
    de: 'In der neuen Wohnung scannen. Rot heisst noch alte Wohnung, gruen heisst angekommen. Alle sehen es sofort.',
    ar: 'امسح في البيت الجديد. الأحمر يعني ما زال في البيت القديم، والأخضر يعني وصل. يرى الجميع ذلك فورًا.',
  },

  // ---------------------------------------------------------------- Funktionen
  'start.funktionen_titel': { de: 'Alles drin', ar: 'كل شيء متوفر' },
  'start.f_qr_titel': { de: 'QR-Code je Kiste', ar: 'رمز QR لكل صندوق' },
  'start.f_qr_text': {
    de: 'Jede Kiste hat ihren eigenen Code und ihre eigene Seite.',
    ar: 'لكل صندوق رمزه الخاص وصفحته الخاصة.',
  },
  'start.f_etiketten_titel': { de: 'Druckfertige Etiketten', ar: 'ملصقات جاهزة للطباعة' },
  'start.f_etiketten_text': {
    de: 'A5, A4 oder A3, frei konfigurierbar, mit oder ohne Inhaltsliste.',
    ar: 'A5 أو A4 أو A3، قابلة للضبط، مع قائمة المحتويات أو بدونها.',
  },
  'start.f_scanner_titel': { de: 'Scanner eingebaut', ar: 'ماسح مدمج' },
  'start.f_scanner_text': {
    de: 'Mit der Handykamera scannen, Status in einem Tipp aendern.',
    ar: 'امسح بكاميرا الهاتف وغيّر الحالة بلمسة واحدة.',
  },
  'start.f_inhalt_titel': { de: 'Inhalt, Fotos, Notizen', ar: 'المحتويات والصور والملاحظات' },
  'start.f_inhalt_text': {
    de: 'Was drin ist, sieht man ohne die Kiste zu oeffnen.',
    ar: 'ترى ما بالداخل دون فتح الصندوق.',
  },
  'start.f_gruppen_titel': { de: 'Gruppen teilen', ar: 'شارك مع المجموعة' },
  'start.f_gruppen_text': {
    de: 'Familie und Helfer einladen, jeder sieht denselben Stand.',
    ar: 'ادعُ العائلة والمساعدين، والجميع يرى الحالة نفسها.',
  },
  'start.f_chat_titel': { de: 'Chat und Anrufe', ar: 'محادثة ومكالمات' },
  'start.f_chat_text': {
    de: 'Sprachnachrichten, Bilder, Reaktionen und Verweise auf Kisten.',
    ar: 'رسائل صوتية وصور وتفاعلات وإشارات إلى الصناديق.',
  },
  'start.f_start_titel': { de: 'Auf den Startbildschirm', ar: 'على الشاشة الرئيسية' },
  'start.f_start_text': {
    de: 'Installiert sich wie eine App, mit Benachrichtigungen.',
    ar: 'يُثبَّت مثل أي تطبيق، مع الإشعارات.',
  },
  'start.f_zugriff_titel': { de: 'Zugriff streng getrennt', ar: 'وصول مفصول تمامًا' },
  'start.f_zugriff_text': {
    de: 'Nur wer im Umzug ist, sieht dessen Daten. Datenbankseitig geprueft.',
    ar: 'لا يرى بيانات النقلة إلا من هو ضمنها. التحقق يجري في قاعدة البيانات.',
  },

  // ----------------------------------------------------------------- Abschluss
  'start.schluss_titel': {
    de: 'Der naechste Umzug wird langweilig.',
    ar: 'النقلة القادمة ستكون مملّة.',
  },
  'start.schluss_text': {
    de: 'Genau so soll er sein. Anlegen, drucken, kleben, scannen.',
    ar: 'وهذا هو المطلوب. أنشئ، اطبع، ألصق، امسح.',
  },
  'start.konto_anlegen': { de: 'Konto anlegen', ar: 'أنشئ حسابًا' },
  'start.fuss': {
    de: 'Gebaut fuer genau einen Umzug. Und fuer jeden danach.',
    ar: 'صُنع من أجل نقلة واحدة. ومن أجل كل نقلة بعدها.',
  },

  // -------------------------------------------------------------- Seite fehlt
  'start.nichtgefunden.text': {
    de: 'Diese Seite gibt es nicht. Vielleicht wurde der Umzug geloescht oder der Link ist alt.',
    ar: 'هذه الصفحة غير موجودة. ربما حُذفت النقلة أو أن الرابط قديم.',
  },
  'start.nichtgefunden.zurueck': { de: 'Zur Uebersicht', ar: 'إلى النقلات' },
}
