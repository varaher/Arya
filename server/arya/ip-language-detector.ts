// India — state/region → language code
const INDIA_STATE_LANGUAGE: Record<string, string> = {
  // South India
  "Tamil Nadu": "ta",
  Puducherry: "ta",
  "Andhra Pradesh": "te",
  Telangana: "te",
  Karnataka: "kn",
  Kerala: "ml",
  Lakshadweep: "ml",
  // West India
  Maharashtra: "mr",
  Goa: "en",
  Gujarat: "gu",
  "Dadra and Nagar Haveli": "gu",
  "Daman and Diu": "gu",
  // North India
  Delhi: "hi",
  "Uttar Pradesh": "hi",
  "Madhya Pradesh": "hi",
  Rajasthan: "hi",
  Bihar: "hi",
  Jharkhand: "hi",
  Uttarakhand: "hi",
  "Himachal Pradesh": "hi",
  Haryana: "hi",
  Chandigarh: "hi",
  Chhattisgarh: "hi",
  // East India
  "West Bengal": "bn",
  Odisha: "od",
  Assam: "bn",
  // Northeast
  Meghalaya: "en",
  Nagaland: "en",
  Mizoram: "en",
  "Arunachal Pradesh": "en",
  Manipur: "en",
  Tripura: "bn",
  Sikkim: "en",
  // Punjab region
  Punjab: "pa",
  "Jammu and Kashmir": "hi",
  Ladakh: "hi",
};

// International — ISO country code → language code
const COUNTRY_LANGUAGE: Record<string, string> = {
  IN: "hi", // India default (overridden by state above)
  BD: "bn",
  LK: "ta",
  PK: "hi",
  NP: "hi",
  // Middle East
  SA: "ar", AE: "ar", KW: "ar", QA: "ar", BH: "ar",
  OM: "ar", IQ: "ar", JO: "ar", LB: "ar", SY: "ar",
  EG: "ar", MA: "ar", DZ: "ar", TN: "ar", LY: "ar",
  YE: "ar",
  IL: "he",
  // Europe
  FR: "fr", BE: "fr",
  DE: "de", AT: "de", CH: "de",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es",
  PE: "es", VE: "es", EC: "es",
  PT: "pt", BR: "pt",
  RU: "ru", UA: "ru", KZ: "ru",
  TR: "tr",
  // Asia Pacific
  JP: "ja",
  CN: "zh", TW: "zh", HK: "zh", SG: "zh",
  KR: "ko",
  ID: "id", MY: "id",
  // Africa
  KE: "sw", TZ: "sw", UG: "sw",
  SN: "fr", CI: "fr", CM: "fr", CD: "fr",
  // English-speaking
  US: "en", GB: "en", CA: "en", AU: "en",
  NZ: "en", ZA: "en", NG: "en", GH: "en",
};

// Display name for the soft banner
export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  hi: "हिंदी",
  ta: "தமிழ்",
  te: "తెలుగు",
  kn: "ಕನ್ನಡ",
  ml: "മലയാളം",
  bn: "বাংলা",
  mr: "मराठी",
  gu: "ગુજરાતી",
  pa: "ਪੰਜਾਬੀ",
  od: "ଓଡ଼ିଆ",
  ar: "العربية",
  he: "עברית",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
  ja: "日本語",
  zh: "中文",
  ko: "한국어",
  pt: "Português",
  ru: "Русский",
  tr: "Türkçe",
  id: "Bahasa Indonesia",
  sw: "Kiswahili",
};

function mapLocationToLanguage(countryCode: string, region: string): string {
  if (countryCode === "IN") {
    return INDIA_STATE_LANGUAGE[region] ?? "hi";
  }
  return COUNTRY_LANGUAGE[countryCode] ?? "en";
}

export async function detectLanguageFromIP(
  ip: string
): Promise<{ language: string; languageName: string; country: string; region: string }> {
  const fallback = { language: "en", languageName: "English", country: "", region: "" };

  try {
    // Skip local/development IPs
    if (
      ip === "127.0.0.1" ||
      ip === "::1" ||
      ip.startsWith("192.168.") ||
      ip.startsWith("10.") ||
      ip.startsWith("172.")
    ) {
      return fallback;
    }

    const res = await fetch(`https://ipwho.is/${ip}`, {
      signal: AbortSignal.timeout(2500),
    });

    if (!res.ok) return fallback;

    const data = await res.json();
    if (!data.success) return fallback;

    const language = mapLocationToLanguage(data.country_code ?? "", data.region ?? "");
    const languageName = LANGUAGE_DISPLAY_NAMES[language] || language;

    return {
      language,
      languageName,
      country: data.country_code ?? "",
      region: data.region ?? "",
    };
  } catch {
    return fallback;
  }
}
