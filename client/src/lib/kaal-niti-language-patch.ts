// ============================================================
// KAAL AND NITI LANGUAGE PATCH — client side
// client/src/lib/kaal-niti-language-patch.ts
//
// Client-side constants for Niti and Drishya UI localisation.
// Server-side functions live in server/arya/kaal-niti-language-patch.ts
// ============================================================

// ── DRISHYA world names ───────────────────────────────────────
// Used by DrishyaPage.tsx WORLDS array for world selector labels.

export const DRISHYA_WORLD_NAMES: Record<string, {
  night: string;
  film: string;
  everyday: string;
  sub: {
    night: string;
    film: string;
    everyday: string;
  };
}> = {
  en: {
    night: 'Night',
    film: 'Film',
    everyday: 'Everyday',
    sub: {
      night: 'Bedtime · Personal · Warm',
      film: 'Scripts · Scenes · Drama',
      everyday: 'Today · Close · True',
    },
  },
  hi: {
    night: 'रात',
    film: 'फ़िल्म',
    everyday: 'रोज़ाना',
    sub: {
      night: 'रात की कहानी · गर्म · करीब',
      film: 'सिनेमाई · किरदार · नाटक',
      everyday: 'आज · सच्चाई · सामान्य',
    },
  },
  ml: {
    night: 'രാത്രി',
    film: 'ചലച്ചിത്രം',
    everyday: 'ദൈനംദിന',
    sub: {
      night: 'ഉറക്കത്തിനു മുമ്പ് · ഊഷ്മളം',
      film: 'ദൃശ്യഭാഷ · നാടകം',
      everyday: 'ഇന്ന് · ആഴം · സത്യം',
    },
  },
  ta: {
    night: 'இரவு',
    film: 'திரைப்படம்',
    everyday: 'அன்றாடம்',
    sub: {
      night: 'படுக்கை நேரம் · உண்மை · அமைதி',
      film: 'காட்சி · கதாபாத்திரம் · நாடகம்',
      everyday: 'இன்று · நெருக்கம் · ஆழம்',
    },
  },
  te: {
    night: 'రాత్రి',
    film: 'చలనచిత్రం',
    everyday: 'నిత్యం',
    sub: {
      night: 'నిద్రకు ముందు · వెచ్చగా',
      film: 'దృశ్యం · నాటకం · పాత్ర',
      everyday: 'ఈరోజు · సత్యం · లోతు',
    },
  },
  kn: {
    night: 'ರಾತ್ರಿ',
    film: 'ಚಲನಚಿತ್ರ',
    everyday: 'ದೈನಂದಿನ',
    sub: {
      night: 'ಮಲಗುವ ಮೊದಲು · ಬೆಚ್ಚಗೆ',
      film: 'ದೃಶ್ಯ · ಪಾತ್ರ · ನಾಟಕ',
      everyday: 'ಇಂದು · ಸತ್ಯ · ಆಳ',
    },
  },
  bn: {
    night: 'রাত',
    film: 'চলচ্চিত্র',
    everyday: 'দৈনন্দিন',
    sub: {
      night: 'ঘুমের আগে · উষ্ণ · কাছের',
      film: 'দৃশ্য · চরিত্র · নাটক',
      everyday: 'আজ · সত্য · গভীরতা',
    },
  },
};

export function getDrishyaWorldNames(language: string) {
  return DRISHYA_WORLD_NAMES[language] || DRISHYA_WORLD_NAMES['en'];
}

// ── NITI Market Lens impact tag translations ──────────────────
// Impact chips on news items in Market Lens tab.
// Currently server generates tags in English; these are for client display.

export const NITI_IMPACT_TAGS: Record<string, Record<string, string>> = {
  en: {
    positive:      'Positive',
    negative:      'Negative',
    neutral:       'Watch',
    opportunity:   'Opportunity',
    risk:          'Risk',
    sector_impact: 'Sector',
    macro:         'Macro',
  },
  hi: {
    positive:      'सकारात्मक',
    negative:      'नकारात्मक',
    neutral:       'ध्यान दें',
    opportunity:   'अवसर',
    risk:          'जोखिम',
    sector_impact: 'क्षेत्र',
    macro:         'व्यापक',
  },
  ml: {
    positive:      'ഗുണകരം',
    negative:      'ദോഷകരം',
    neutral:       'ശ്രദ്ധിക്കൂ',
    opportunity:   'അവസരം',
    risk:          'റിസ്ക്',
    sector_impact: 'മേഖല',
    macro:         'മാക്രോ',
  },
  ta: {
    positive:      'நேர்மறை',
    negative:      'எதிர்மறை',
    neutral:       'கவனிக்கவும்',
    opportunity:   'வாய்ப்பு',
    risk:          'ஆபத்து',
    sector_impact: 'துறை',
    macro:         'மேக்ரோ',
  },
  te: {
    positive:      'సానుకూలం',
    negative:      'ప్రతికూలం',
    neutral:       'చూడండి',
    opportunity:   'అవకాశం',
    risk:          'నష్టం',
    sector_impact: 'రంగం',
    macro:         'స్థూల',
  },
  kn: {
    positive:      'ಸಕಾರಾತ್ಮಕ',
    negative:      'ನಕಾರಾತ್ಮಕ',
    neutral:       'ಗಮನಿಸಿ',
    opportunity:   'ಅವಕಾಶ',
    risk:          'ಅಪಾಯ',
    sector_impact: 'ಕ್ಷೇತ್ರ',
    macro:         'ಮ್ಯಾಕ್ರೋ',
  },
  bn: {
    positive:      'ইতিবাচক',
    negative:      'নেতিবাচক',
    neutral:       'দেখুন',
    opportunity:   'সুযোগ',
    risk:          'ঝুঁকি',
    sector_impact: 'সেক্টর',
    macro:         'ম্যাক্রো',
  },
};

export function getNitiImpactTags(language: string) {
  return NITI_IMPACT_TAGS[language] || NITI_IMPACT_TAGS['en'];
}
