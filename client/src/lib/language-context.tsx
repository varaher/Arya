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

// ── IP-detected language banner ────────────────────────────────────────────
export function LanguageDetectionBanner() {
  const { language, setLanguage } = useLanguage();
  const [detected, setDetected] = useState<UiLanguage | null>(null);
  const [detectedName, setDetectedName] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only run if user has no stored preference (i.e., it's "en" from default, not a deliberate choice)
    const hasStored = (() => {
      try { return !!localStorage.getItem("arya_ui_language"); } catch { return false; }
    })();
    if (hasStored) return; // User already has a preference — skip

    const bannedKey = "arya_lang_banner_dismissed";
    const bannedVal = (() => { try { return localStorage.getItem(bannedKey); } catch { return null; } })();
    if (bannedVal) return;

    fetch("/api/detect-language", { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json())
      .then((data) => {
        const lang = data.language as UiLanguage;
        if (!lang || lang === "en") return;
        setDetected(lang);
        setDetectedName(data.languageName || lang);
      })
      .catch(() => {});
  }, []);

  if (!detected || dismissed || language !== "en") return null;

  const handleAccept = () => {
    setLanguage(detected);
    setDismissed(true);
    try { localStorage.setItem("arya_ui_language", detected); } catch {}
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem("arya_lang_banner_dismissed", "1"); } catch {}
  };

  return (
    <div
      data-testid="banner-language-detection"
      style={{
        position: "fixed",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "linear-gradient(135deg, #f0fdf4, #ecfdf5)",
        border: "1px solid rgba(6,78,59,0.18)",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 280,
        maxWidth: "calc(100vw - 32px)",
        fontSize: 13,
      }}
    >
      <span style={{ fontSize: 18 }}>🌐</span>
      <span style={{ flex: 1, color: "#065f46", fontWeight: 500, lineHeight: 1.3 }}>
        Switch to <strong>{detectedName}</strong> for your region?
      </span>
      <button
        data-testid="button-lang-banner-accept"
        onClick={handleAccept}
        style={{
          background: "#059669",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "5px 10px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Switch →
      </button>
      <button
        data-testid="button-lang-banner-dismiss"
        onClick={handleDismiss}
        style={{
          background: "transparent",
          border: "none",
          color: "#6b7280",
          fontSize: 12,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Keep English
      </button>
    </div>
  );
}
