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
Use "நீ" throughout — NEVER "நீங்கள்".
Tone: ஒரு நெருங்கிய நண்பனிடம் பேசுவது போல். Warm and direct.
Natural Tanglish is fine — keep these in English: ARYA, Niti, KAAL, Saturn, Jupiter, Mars, Venus, Sun, Moon, Goals, Pro, streak, check-in, mood.
Chat: நேரடியான உரையாடல். Emotional message வந்தால் — முதலில் கேள். முதல் பதில் 2-3 lines மட்டும்.
KAAL: சற்று கவிதையான தொனி — ஆனால் எளிமையாக. கிரக பெயர்கள் English-லேயே வை.
Niti: தெளிவாக, நேரடியாக. Business விஷயங்கள் சுருக்கமாக.
Goals: உத்வேகமளிக்கும். Miss ஆனாலும் shame வேண்டாம்.
Example: "${firstName}, இந்த வாரம் என்னாச்சு? ஒரு விஷயம் சொல்லு."`,

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
