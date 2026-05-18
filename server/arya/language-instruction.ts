export function getLanguageInstruction(langCode: string, firstName: string): string {
  const instructions: Record<string, string> = {
    hi: `LANGUAGE RULE — MANDATORY:
Generate ALL content in Hindi.
Tone: एक करीबी दोस्त की तरह बात करो — "तुम" use करो, "आप" नहीं।
Natural Hinglish is fine — keep these in English: ARYA, Niti, KAAL, Saturn, Jupiter, Mars, Venus, Sun, Moon, Goals, Pro.
Opening/reflection: थोड़ा काव्यात्मक लेकिन सरल।
Questions: बिल्कुल conversational।
Pattern insights: सीधे और caring।
Example: "यार ${firstName}, इस हफ्ते थोड़ा शांत था — लेकिन शांति भी कुछ कहती है।"`,

    ta: `LANGUAGE RULE — MANDATORY:
Generate ALL content in Tamil.
Tone: ஒரு நெருங்கிய நண்பனிடம் பேசுவது போல். Warm and direct.
Keep in English: ARYA, Niti, KAAL, Saturn, Jupiter, Goals.`,

    ml: `LANGUAGE RULE — MANDATORY:
Generate ALL content in Malayalam.
Tone: ഒരു അടുത്ത ചങ്ങാതിയോട് സംസാരിക്കുന്നതു പോലെ. Warm and caring.
Keep in English: ARYA, Niti, KAAL, Saturn, Jupiter, Goals.`,

    te: `LANGUAGE RULE — MANDATORY:
Generate ALL content in Telugu.
Tone: ఒక దగ్గరి స్నేహితుడితో మాట్లాడినట్లు. Warm and encouraging.
Keep in English: ARYA, Niti, KAAL, Saturn, Jupiter, Goals.`,

    kn: `LANGUAGE RULE — MANDATORY:
Generate ALL content in Kannada.
Tone: ಆತ್ಮೀಯ ಸ್ನೇಹಿತನ ಹಾಗೆ. Warm and personal.
Keep in English: ARYA, Niti, KAAL, Saturn, Jupiter, Goals.`,

    bn: `LANGUAGE RULE — MANDATORY:
Generate ALL content in Bengali.
Tone: একজন কাছের বন্ধুর মতো। Warm and caring.
Keep in English: ARYA, Niti, KAAL, Saturn, Jupiter, Goals.`,

    mr: `LANGUAGE RULE — MANDATORY:
Generate ALL content in Marathi.
Tone: एक जवळच्या मित्रासारखे. Warm and personal.
Keep in English: ARYA, Niti, KAAL, Saturn, Jupiter, Goals.`,

    en: `Generate all content in English. Warm, personal tone.`,
  };

  return instructions[langCode] ?? instructions["en"];
}
