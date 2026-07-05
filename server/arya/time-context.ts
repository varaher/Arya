// ─────────────────────────────────────────────────────────────────────────────
//  time-context.ts
//
//  Builds time-aware context for ARYA's system prompt.
//  No API call — just reads the clock and calendar.
//  Zero cost. Zero latency.
//
//  Makes ARYA feel like a companion who notices:
//    - What time it is (brahma muhurta vs late night vs afternoon)
//    - What day it is (Sunday evening weight, Monday fresh start)
//    - How long since last conversation (gap awareness)
//    - Indian festivals and seasons
//    - The right greeting in the user's language
//
//  RULE: The time should be FELT, not STATED.
//  ARYA never says "I see it's late."
//  ARYA just IS the right version of itself for that hour.
// ─────────────────────────────────────────────────────────────────────────────

type TimeOfDay =
  | 'brahma_muhurta'
  | 'early_morning'
  | 'morning'
  | 'mid_morning'
  | 'midday'
  | 'afternoon'
  | 'evening'
  | 'late_evening'
  | 'night'
  | 'late_night';

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 4 && hour < 6)   return 'brahma_muhurta';
  if (hour >= 6 && hour < 7)   return 'early_morning';
  if (hour >= 7 && hour < 9)   return 'morning';
  if (hour >= 9 && hour < 12)  return 'mid_morning';
  if (hour >= 12 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  if (hour >= 20 && hour < 22) return 'late_evening';
  if (hour >= 22 || hour < 1)  return 'night';
  return 'late_night';
}

interface TimeGreetings {
  brahma_muhurta: string;
  early_morning: string;
  morning: string;
  mid_morning: string;
  midday: string;
  afternoon: string;
  evening: string;
  late_evening: string;
  night: string;
  late_night: string;
}

const GREETINGS_BY_LANGUAGE: Record<string, TimeGreetings> = {
  en: {
    brahma_muhurta: "You're up before dawn.",
    early_morning:  "Early morning.",
    morning:        "Good morning.",
    mid_morning:    "Morning.",
    midday:         "Midday.",
    afternoon:      "Afternoon.",
    evening:        "Good evening.",
    late_evening:   "Evening.",
    night:          "Late evening.",
    late_night:     "It's late.",
  },
  hi: {
    brahma_muhurta: "ब्रह्म मुहूर्त में जागे हो।",
    early_morning:  "सुबह सवेरे।",
    morning:        "सुप्रभात।",
    mid_morning:    "शुभ प्रभात।",
    midday:         "दोपहर का वक्त है।",
    afternoon:      "दोपहर।",
    evening:        "शाम हो गई।",
    late_evening:   "रात की शुरुआत।",
    night:          "रात गहरी हो रही है।",
    late_night:     "रात बहुत हो गई है।",
  },
  ml: {
    brahma_muhurta: "ബ്രഹ്മ മുഹൂർത്തത്തിൽ ഉണർന്നു.",
    early_morning:  "വെളുപ്പിന് ഉണർന്നിരിക്കുന്നു.",
    morning:        "ശുഭ പ്രഭാതം.",
    mid_morning:    "രാവിലെ.",
    midday:         "ഉച്ചനേരം.",
    afternoon:      "ഉച്ചകഴിഞ്ഞ് വിശ്രമ നേരം.",
    evening:        "സന്ധ്യ ആയി.",
    late_evening:   "രാത്രി ആകാൻ തുടങ്ങി.",
    night:          "രാത്രി ആയി.",
    late_night:     "ഇനി ഉറങ്ങേണ്ട നേരമാണ്.",
  },
  ta: {
    brahma_muhurta: "விடியலுக்கு முன்னே எழுந்திருந்திருக்கிறீர்கள்.",
    early_morning:  "அதிகாலை.",
    morning:        "காலை வணக்கம்.",
    mid_morning:    "காலை நேரம்.",
    midday:         "நண்பகல்.",
    afternoon:      "மதியம்.",
    evening:        "மாலை வணக்கம்.",
    late_evening:   "இரவு ஆகிறது.",
    night:          "இரவு.",
    late_night:     "நள்ளிரவு கடந்துவிட்டது.",
  },
  te: {
    brahma_muhurta: "తెల్లవారుజామున లేచారు.",
    early_morning:  "తెల్లవారు.",
    morning:        "శుభోదయం.",
    mid_morning:    "ఉదయం.",
    midday:         "మధ్యాహ్నం.",
    afternoon:      "మధ్యాహ్నం తర్వాత.",
    evening:        "శుభ సాయంత్రం.",
    late_evening:   "రాత్రి అవుతోంది.",
    night:          "రాత్రి.",
    late_night:     "చాలా రాత్రి అయింది.",
  },
  kn: {
    brahma_muhurta: "ಬ್ರಹ್ಮ ಮುಹೂರ್ತದಲ್ಲಿ ಎದ್ದಿದ್ದೀರಿ.",
    early_morning:  "ಬೆಳಿಗ್ಗೆ ಬೇಗ.",
    morning:        "ಶುಭೋದಯ.",
    mid_morning:    "ಬೆಳಿಗ್ಗೆ.",
    midday:         "ಮಧ್ಯಾಹ್ನ.",
    afternoon:      "ಮಧ್ಯಾಹ್ನ ನಂತರ.",
    evening:        "ಶುಭ ಸಂಜೆ.",
    late_evening:   "ರಾತ್ರಿ ಆಗುತ್ತಿದೆ.",
    night:          "ರಾತ್ರಿ.",
    late_night:     "ತುಂಬಾ ತಡ ರಾತ್ರಿ.",
  },
  bn: {
    brahma_muhurta: "ভোরের আলো ফোটার আগে উঠেছেন।",
    early_morning:  "ভোরবেলা।",
    morning:        "শুভ সকাল।",
    mid_morning:    "সকাল।",
    midday:         "দুপুর।",
    afternoon:      "বিকেল।",
    evening:        "শুভ সন্ধ্যা।",
    late_evening:   "রাত হচ্ছে।",
    night:          "রাত।",
    late_night:     "অনেক রাত হয়ে গেছে।",
  },
  mr: {
    brahma_muhurta: "पहाटे उठलात.",
    early_morning:  "पहाटे.",
    morning:        "शुभ प्रभात.",
    mid_morning:    "सकाळ.",
    midday:         "दुपार.",
    afternoon:      "दुपारनंतर.",
    evening:        "शुभ संध्याकाळ.",
    late_evening:   "रात्र होत आहे.",
    night:          "रात्र.",
    late_night:     "खूप रात्र झाली.",
  },
  gu: {
    brahma_muhurta: "બ્રહ્મ મુહૂર્તમાં જાગ્યા.",
    early_morning:  "વહેલી સવાર.",
    morning:        "શુભ સવાર.",
    mid_morning:    "સવાર.",
    midday:         "બપોર.",
    afternoon:      "બપોર પછી.",
    evening:        "શુભ સાંજ.",
    late_evening:   "રાત થઈ રહી છે.",
    night:          "રાત.",
    late_night:     "ઘણી મોડી રાત.",
  },
  pa: {
    brahma_muhurta: "ਅੰਮ੍ਰਿਤ ਵੇਲੇ ਉੱਠੇ ਹੋ।",
    early_morning:  "ਤੜਕੇ।",
    morning:        "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ।",
    mid_morning:    "ਸਵੇਰਾ।",
    midday:         "ਦੁਪਹਿਰ।",
    afternoon:      "ਦੁਪਹਿਰ ਤੋਂ ਬਾਅਦ।",
    evening:        "ਸ਼ੁਭ ਸ਼ਾਮ।",
    late_evening:   "ਰਾਤ ਹੋ ਰਹੀ ਹੈ।",
    night:          "ਰਾਤ।",
    late_night:     "ਬਹੁਤ ਦੇਰ ਹੋ ਗਈ।",
  },
  or: {
    brahma_muhurta: "ବ୍ରହ୍ମ ମୁହୂର୍ତ୍ତରେ ଉଠିଛନ୍ତି।",
    early_morning:  "ଭୋର ବେଳ।",
    morning:        "ଶୁଭ ସକାଳ।",
    mid_morning:    "ସକାଳ।",
    midday:         "ଦ୍ୱିପ୍ରହର।",
    afternoon:      "ଅପରାହ୍ନ।",
    evening:        "ଶୁଭ ସନ୍ଧ୍ୟା।",
    late_evening:   "ରାତ ହୋଇଆସୁଛି।",
    night:          "ରାତ।",
    late_night:     "ବହୁ ରାତ ହୋଇଗଲା।",
  },
  ar: {
    brahma_muhurta: "أنت مستيقظ قبل الفجر.",
    early_morning:  "الفجر.",
    morning:        "صباح الخير.",
    mid_morning:    "الصباح.",
    midday:         "الظهر.",
    afternoon:      "بعد الظهر.",
    evening:        "مساء الخير.",
    late_evening:   "الليل يقترب.",
    night:          "الليل.",
    late_night:     "وقت متأخر من الليل.",
  },
  fr: {
    brahma_muhurta: "Vous êtes réveillé avant l'aube.",
    early_morning:  "Très tôt le matin.",
    morning:        "Bonjour.",
    mid_morning:    "Ce matin.",
    midday:         "Midi.",
    afternoon:      "L'après-midi.",
    evening:        "Bonsoir.",
    late_evening:   "La nuit tombe.",
    night:          "La nuit.",
    late_night:     "Il est très tard.",
  },
  es: {
    brahma_muhurta: "Estás despierto antes del amanecer.",
    early_morning:  "Muy temprano.",
    morning:        "Buenos días.",
    mid_morning:    "La mañana.",
    midday:         "El mediodía.",
    afternoon:      "La tarde.",
    evening:        "Buenas tardes.",
    late_evening:   "La noche llega.",
    night:          "La noche.",
    late_night:     "Es muy tarde.",
  },
};

const getGreeting = (language: string, timeOfDay: TimeOfDay): string => {
  const greetings = GREETINGS_BY_LANGUAGE[language] || GREETINGS_BY_LANGUAGE['en'];
  return greetings[timeOfDay];
};

// ── INDIAN FESTIVAL / SEASON AWARENESS ───────────────────────────────────────

interface FestivalContext {
  name: string;
  awareness: string;
}

function getIndianSeasonContext(month: number, day: number, language: string): FestivalContext | null {
  if ((month === 2 && day >= 15) || month === 3) {
    return {
      name: 'board_exam_season',
      awareness: 'It is board exam season in India. Many users — students, parents — are under significant pressure right now. Be especially patient and present.',
    };
  }

  if (month === 4 || month === 5) {
    return {
      name: 'result_and_admission_season',
      awareness: 'Exam results and college admissions are happening now. This is a high-anxiety period for students and families.',
    };
  }

  if (month >= 6 && month <= 9) {
    const monsoonAwareness: Record<string, string> = {
      ml: 'It is monsoon season in Kerala — the time of Onam preparations, rain, and a particular introspective quality to life here.',
      ta: 'The monsoon is here. Tamil Nadu has its own relationship with this season.',
      default: 'Monsoon season in India. The rains affect mood in ways that are real and acknowledged.',
    };
    return {
      name: 'monsoon',
      awareness: monsoonAwareness[language] || monsoonAwareness['default'],
    };
  }

  if (month === 10 || (month === 11 && day <= 15)) {
    return {
      name: 'diwali_season',
      awareness: 'Diwali season. Families gather, expectations run high, financial pressures surface alongside celebration. A complex emotional time for many.',
    };
  }

  if ((month === 8 || month === 9) && language === 'ml') {
    return {
      name: 'onam',
      awareness: 'Onam season in Kerala. Homecoming, harvest, nostalgia — and for many who are away from home, a particular longing.',
    };
  }

  if (month === 1 && day <= 15) {
    return {
      name: 'new_year',
      awareness: 'The new year has just begun. People are still calibrating their intentions and hopes for the year. A time of genuine reflection.',
    };
  }

  if (month === 4 && day <= 20) {
    const regionalNewYear: Record<string, string> = {
      ml: 'Vishu season — the Malayalam new year. A time of fresh beginnings.',
      ta: 'Tamil Puthandu — the Tamil new year. A significant cultural moment.',
      te: 'Ugadi — the Telugu new year. A time of reflection on the year ahead.',
    };
    if (regionalNewYear[language]) {
      return { name: 'regional_new_year', awareness: regionalNewYear[language] };
    }
  }

  return null;
}

// ── DAY OF WEEK AWARENESS ─────────────────────────────────────────────────────

function getDayAwareness(weekday: number, hour: number, language: string): string | null {
  if (weekday === 0 && hour >= 17) {
    const sundayEvening: Record<string, string> = {
      en: 'Sunday evening. For many people, a quiet heaviness settles now — not sadness exactly, but the week ahead beginning to make itself felt. You do not need to name it unless they do.',
      hi: 'रविवार की शाम। हफ्ते की शुरुआत से पहले का वो खास पल।',
      ml: 'ഞായറാഴ്ച സന്ധ്യ. ആഴ്ചയുടെ ഭാരം ഇനിയും ആരംഭിക്കാത്ത ഒരു നിമിഷം.',
      ta: 'ஞாயிறு மாலை. வாரம் தொடங்கும் முன்னிலையில் ஒரு தனி அமைதி.',
    };
    return sundayEvening[language] || sundayEvening['en'];
  }

  if (weekday === 1 && hour < 10) {
    return 'Monday morning. A new week beginning. Some people feel the possibility of this; some feel the weight. Follow where this person is.';
  }

  if (weekday === 5 && hour >= 14) {
    return 'Friday afternoon or evening. The week winding down. A lighter energy for many, though not all.';
  }

  if (weekday === 6 && hour < 12) {
    return 'Saturday morning. For many people, the first truly free morning of the week. A different quality of time.';
  }

  return null;
}

// ── GAP AWARENESS (days since last conversation) ──────────────────────────────

function getGapAwareness(daysSinceLast: number | null, language: string): string | null {
  if (daysSinceLast === null) return null;

  if (daysSinceLast === 0) {
    return 'This user has already talked with you today. This is a continuation of an existing day together. No need to re-establish context — it is already there.';
  }

  if (daysSinceLast >= 1 && daysSinceLast <= 2) return null;

  if (daysSinceLast >= 3 && daysSinceLast <= 7) {
    return `It has been ${daysSinceLast} days since this user last talked to you. A normal gap — just pick up naturally. No need to comment on the absence.`;
  }

  if (daysSinceLast >= 8 && daysSinceLast <= 20) {
    const longGap: Record<string, string> = {
      en: `It has been ${daysSinceLast} days. They came back. You might gently notice this — not with guilt, with warmth. "It's been a little while" is enough.`,
      hi: `${daysSinceLast} दिन बाद आए हैं। गर्मजोशी से मिलो — "कुछ दिन हो गए थे" कहना काफी है।`,
      ml: `${daysSinceLast} ദിവസങ്ങൾ കഴിഞ്ഞ് തിരിച്ചു വന്നു. ഊഷ്മളതയോടെ, "കുറച്ചു ദിവസം കഴിഞ്ഞു" എന്ന് ഒന്ന് പറഞ്ഞാൽ മതി.`,
    };
    return longGap[language] || longGap['en'];
  }

  if (daysSinceLast > 20) {
    const veryLongGap: Record<string, string> = {
      en: `It has been ${daysSinceLast} days — more than three weeks. This person came back after a significant gap. Receive them warmly. You might ask how things have been. Do not make them feel guilty for being away.`,
      hi: `${daysSinceLast} दिन बाद — तीन हफ्तों से ज़्यादा। वापस आने का स्वागत करो। पूछो कि कैसे रहे।`,
      ml: `${daysSinceLast} ദിവസങ്ങൾ — മൂന്ന് ആഴ്ചയിലേറെ. തിരിച്ചു വന്നതിനെ ഊഷ്മളമായി സ്വീകരിക്കൂ.`,
    };
    return veryLongGap[language] || veryLongGap['en'];
  }

  return null;
}

// ── EXPORTED TYPES ────────────────────────────────────────────────────────────

export interface TimeContextResult {
  greeting: string;
  timeOfDay: TimeOfDay;
  hour: number;
  weekday: number;
  month: number;
  contextBlock: string;
  debugInfo: {
    localTimeString: string;
    timezone: string;
    daysSinceLast: number | null;
    festivalContext: string | null;
  };
}

// ── MAIN FUNCTION ─────────────────────────────────────────────────────────────

export function buildTimeContext(
  userId: string | number = 0,
  timezone: string = 'Asia/Kolkata',
  language: string = 'en',
  lastConversationAt?: Date | null,
): TimeContextResult {

  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: timezone,
    hour: 'numeric',
    hour12: false,
    minute: 'numeric',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  const hour = parseInt(getPart('hour'));
  const weekdayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const weekdayName = getPart('weekday');
  const weekday = weekdayNames.indexOf(weekdayName);
  const monthNames = ['January','February','March','April','May','June',
                      'July','August','September','October','November','December'];
  const monthName = getPart('month');
  const month = monthNames.indexOf(monthName) + 1;
  const day = parseInt(getPart('day'));
  const mins = String(now.getMinutes()).padStart(2, '0');

  const timeOfDay = getTimeOfDay(hour);
  const greeting = getGreeting(language, timeOfDay);

  const daysSinceLast = lastConversationAt
    ? Math.floor((now.getTime() - lastConversationAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const dayAwareness = getDayAwareness(weekday, hour, language);
  const gapAwareness = getGapAwareness(daysSinceLast, language);
  const festival = getIndianSeasonContext(month, day, language);

  const toneGuidance: Partial<Record<TimeOfDay, string>> = {
    brahma_muhurta: 'Before dawn — a sacred, silent hour. Be calm, unhurried, and fully present. Something genuine is happening if this person is here now.',
    late_night:     'It is very late or very early. Real conversations happen at this hour. The noise of the day has gone. Be fully present — not cheerful, not clinical. Just here.',
    night:          'Late evening. Many genuine conversations start at this hour. People are more honest when the day is done and others are asleep.',
  };

  const tone = toneGuidance[timeOfDay] || '';

  const contextParts = [
    `[TIME & PRESENCE CONTEXT]`,
    `Current time: ${hour}:${mins} — ${timeOfDay.replace(/_/g, ' ')}`,
    `Day: ${weekdayName}, ${day} ${monthName}`,
    `User language: ${language}`,
    `Natural greeting for this moment: "${greeting}"`,
    tone          ? `Tone guidance: ${tone}` : '',
    dayAwareness  ? `Day awareness: ${dayAwareness}` : '',
    gapAwareness  ? `Return awareness: ${gapAwareness}` : '',
    festival      ? `Season/festival context: ${festival.awareness}` : '',
    ``,
    `CRITICAL RULE:`,
    `The time and season should be FELT in your response, not stated.`,
    `Never say: "I see it's late" or "Since it's Sunday evening" or "Given the time..."`,
    `Just BE the right version of yourself for this hour.`,
    `The greeting above is a suggestion — use it naturally or adapt it.`,
    `Do not announce context. Embody it.`,
  ].filter(s => s !== undefined && s !== null).join('\n');

  return {
    greeting,
    timeOfDay,
    hour,
    weekday,
    month,
    contextBlock: contextParts,
    debugInfo: {
      localTimeString: `${hour}:${mins} ${timezone}`,
      timezone,
      daysSinceLast,
      festivalContext: festival?.name || null,
    },
  };
}
