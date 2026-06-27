import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  UiLanguage,
  getStoredUiLanguage,
  setStoredUiLanguage,
  createTranslator,
  isRTLLanguage,
} from "./i18n";

// ── Noto font slugs for non-Latin scripts ──────────────────────────────────
const NOTO_FONTS: Partial<Record<UiLanguage, string>> = {
  hi: "Noto+Sans+Devanagari",
  mr: "Noto+Sans+Devanagari",
  sa: "Noto+Sans+Devanagari",
  ta: "Noto+Sans+Tamil",
  te: "Noto+Sans+Telugu",
  kn: "Noto+Sans+Kannada",
  ml: "Noto+Sans+Malayalam",
  bn: "Noto+Sans+Bengali",
  gu: "Noto+Sans+Gujarati",
  pa: "Noto+Sans+Gurmukhi",
  od: "Noto+Sans+Oriya",
  ar: "Noto+Sans+Arabic",
  he: "Noto+Sans+Hebrew",
  ja: "Noto+Sans+JP",
  zh: "Noto+Sans+SC",
  ko: "Noto+Sans+KR",
};

function loadNotoFont(lang: UiLanguage): void {
  const slug = NOTO_FONTS[lang];
  if (!slug) return;
  const id = `noto-${lang}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${slug}:wght@300;400;600&display=swap`;
  document.head.appendChild(link);
}

function applyDocumentLanguage(lang: UiLanguage): void {
  const rtl = isRTLLanguage(lang);
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute("dir", rtl ? "rtl" : "ltr");
  loadNotoFont(lang);
  const slug = NOTO_FONTS[lang];
  const family = slug
    ? `'${slug.replace(/\+/g, " ")}', sans-serif`
    : "'Inter', sans-serif";
  document.documentElement.style.setProperty("--font-body", family);
}

// ── Context ────────────────────────────────────────────────────────────────
interface LanguageContextValue {
  language: UiLanguage;
  t: (key: string) => string;
  setLanguage: (lang: UiLanguage) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  t: (k) => k,
  setLanguage: () => {},
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLang] = useState<UiLanguage>(() => {
    const stored = getStoredUiLanguage();
    applyDocumentLanguage(stored);
    return stored;
  });

  const setLanguage = useCallback((lang: UiLanguage) => {
    setLang(lang);
    setStoredUiLanguage(lang);
    applyDocumentLanguage(lang);
    // Persist to DB asynchronously — never block the UI
    try {
      const token = localStorage.getItem("arya_user_token");
      if (token) {
        fetch("/api/user/ui-language", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-token": token },
          body: JSON.stringify({ language: lang }),
        }).catch(() => {});
      }
    } catch {}
  }, []);

  const t = createTranslator(language);
  const isRTL = isRTLLanguage(language);

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// App always opens in English by default — users choose their language manually.
// IP-based auto-detection is disabled to keep the experience consistent worldwide.
export function LanguageDetectionBanner() {
  return null;
}
