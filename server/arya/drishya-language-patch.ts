// ============================================================
// DRISHYA LANGUAGE PATCH
// server/arya/drishya-language-patch.ts
//
// Language names, literary registers, and voice configs
// for Drishya story generation.
// Wire into generateDrishyaStory() in drishya.ts.
// ============================================================

export const DRISHYA_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi (हिंदी)',
  ml: 'Malayalam (മലയാളം)',
  ta: 'Tamil (தமிழ்)',
  te: 'Telugu (తెలుగు)',
  kn: 'Kannada (ಕನ್ನಡ)',
  bn: 'Bengali (বাংলা)',
  mr: 'Marathi (मराठी)',
  gu: 'Gujarati (ગુજરાતી)',
  pa: 'Punjabi (ਪੰਜਾਬੀ)',
  or: 'Odia (ଓଡ଼ିଆ)',
};

// Per-language literary register guidance.
// GPT-4o needs this to write authentically — not just translate English.

export const DRISHYA_LITERARY_REGISTER: Record<string, string> = {
  en: `Write with warmth and directness. Use concrete images. Avoid abstraction.
End with one quiet question that stays with the reader.`,

  hi: `Write in literary Hindi — not formal textbook Hindi, but the warm,
flowing Hindi of storytelling. Use compound verbs naturally.
The emotional register should feel like kathavachan — the oral
storytelling tradition. Short paragraphs. Each line should land.
End with a single line that feels like a doha — complete in itself.`,

  ml: `Write in literary Malayalam — the language of Thakazhi and Vaikom
Muhammad Basheer. Warm, intimate, rooted in the earth of Kerala.
Sentences can be longer than in English — Malayalam has a natural
flow that English breaks unnecessarily. Use sensory detail:
the smell of rain on red earth, the sound of temple bells at dusk.
The closing question should feel like something a grandmother
would ask at the end of a story.`,

  ta: `Write in literary Tamil — drawing from the Sangam tradition of
precise emotional mapping. Tamil stories have a particular quality
of restraint: the deepest feelings are implied, not stated.
Use the tinai vocabulary naturally if appropriate — the landscape
as emotional mirror. Each sentence should have weight.
The ending should feel inevitable, not surprising.`,

  te: `Write in literary Telugu — the language known as the 'Italian of
the East' for its musicality. Telugu stories have a lyrical quality.
Use the natural flow of Telugu sentence structure — verb at the end.
Sensory detail matters. End with a question that the reader will
carry into sleep.`,

  kn: `Write in literary Kannada — drawing from the Vachana tradition
of Basavanna and Akka Mahadevi. Kannada stories can be direct and
philosophical simultaneously. The language has a groundedness —
connect the wisdom to the earth, to ordinary daily life.
End with something that feels like a vachana: complete, surprising,
and simple all at once.`,

  bn: `Write in literary Bengali — the language of Tagore and Bibhutibhushan.
Bengali stories have a particular emotional richness. Nature is
always present — the river, the monsoon, the evening light.
Allow sentences to breathe. The emotional register can be higher
than English comfortably allows. End with something that rhymes
with longing.`,

  mr: `Write in literary Marathi — warm, direct, with a particular Maharashtrian
groundedness. Marathi stories often have a philosophical underpinning
drawn from the Sant tradition — Tukaram, Dnyaneshwar. Connect the
story to ordinary life. The wisdom should feel earned, not given.`,

  gu: `Write in literary Gujarati — warm, merchant-practical, and deeply
human. Gujarati stories value clarity and warmth over complexity.
The ending should feel like advice from an elder — practical and
kind at the same time.`,

  pa: `Write in literary Punjabi — direct, warm, with the particular energy
of Punjab. Punjabi stories have colour and movement. Use nature —
wheat fields, rivers, the open sky. The wisdom should feel physical,
embodied. End with something that could be sung.`,

  or: `Write in literary Odia — the language of Jagannath and the ocean.
Odia stories have a particular devotional quality without being
religious. Connect to the landscape — the sea, the temples,
the rice fields. Quiet and deep.`,
};

// Sarvam bulbul:v3 voice config for story narration.
// Stories need slower pace than regular chat.
// Verify speaker names against live Sarvam bulbul:v3 speaker list.

export const DRISHYA_VOICE_BY_LANGUAGE: Record<string, {
  speaker: string;
  speed: number;
}> = {
  en: { speaker: 'meera',     speed: 0.85 },
  hi: { speaker: 'anushka',   speed: 0.85 },
  ml: { speaker: 'vaishnavi', speed: 0.83 },
  ta: { speaker: 'pavithra',  speed: 0.85 },
  te: { speaker: 'shreya',    speed: 0.85 },
  kn: { speaker: 'anushka',   speed: 0.85 },
  bn: { speaker: 'anushka',   speed: 0.85 },
  mr: { speaker: 'anushka',   speed: 0.85 },
  gu: { speaker: 'anushka',   speed: 0.85 },
  pa: { speaker: 'anushka',   speed: 0.85 },
  or: { speaker: 'anushka',   speed: 0.85 },
};

// ── Main instruction builder ──────────────────────────────────
// Append this to the DRISHYA_SYSTEM_PROMPT (or inject into user turn)
// for non-English languages. For English, returns empty string.

export function buildDrishyaLanguageInstruction(language: string): string {
  if (!language || language === 'en') return '';

  const langName = DRISHYA_LANGUAGE_NAMES[language] || language;
  const register = DRISHYA_LITERARY_REGISTER[language] || DRISHYA_LITERARY_REGISTER['en'];

  return `

LANGUAGE INSTRUCTION FOR THIS STORY:
Write entirely in ${langName}.
Not as a translation from English.
As if this story was originally composed in ${langName},
by someone who has lived inside this language their whole life.

LITERARY REGISTER FOR ${langName.toUpperCase()}:
${register}

The closing question must also be in ${langName}.
The wisdom thread, the sensory detail, the character voices —
all in ${langName}. No code-switching.`;
}
