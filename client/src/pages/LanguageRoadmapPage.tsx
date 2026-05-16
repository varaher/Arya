import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Check, Globe, TrendingUp, Zap, Clock, Lock } from "lucide-react";

type Status = "live" | "next" | "phase3" | "phase4";

interface Language {
  name: string;
  native: string;
  flag: string;
  speakers: string;
  speakersRaw: number;
  status: Status;
  market?: string;
  arpu?: "very-high" | "high" | "medium" | "lower";
  note?: string;
  powered?: "sarvam" | "browser" | "openai";
  phase?: number;
}

const INDIA_LANGUAGES: Language[] = [
  { name: "English",   native: "English",    flag: "🇬🇧", speakers: "1.53B total",  speakersRaw: 1530, status: "live",   arpu: "high",      powered: "browser", note: "Default · Global lingua franca" },
  { name: "Hindi",     native: "हिन्दी",       flag: "🇮🇳", speakers: "609M",        speakersRaw: 609,  status: "live",   arpu: "medium",    powered: "sarvam",  note: "Live voice · STT + TTS" },
  { name: "Tamil",     native: "தமிழ்",        flag: "🇮🇳", speakers: "77M India",   speakersRaw: 77,   status: "live",   arpu: "medium",    powered: "sarvam",  note: "Live voice · STT + TTS" },
  { name: "Telugu",    native: "తెలుగు",       flag: "🇮🇳", speakers: "83M",         speakersRaw: 83,   status: "next",   arpu: "medium",    powered: "sarvam",  note: "Sarvam ready · UI strings needed" },
  { name: "Kannada",   native: "ಕನ್ನಡ",        flag: "🇮🇳", speakers: "44M",         speakersRaw: 44,   status: "next",   arpu: "medium",    powered: "sarvam",  note: "Sarvam ready · UI strings needed" },
  { name: "Malayalam", native: "മലയാളം",       flag: "🇮🇳", speakers: "38M",         speakersRaw: 38,   status: "next",   arpu: "medium",    powered: "sarvam",  note: "Sarvam ready · UI strings needed" },
  { name: "Bengali",   native: "বাংলা",        flag: "🇮🇳", speakers: "230M India",  speakersRaw: 230,  status: "next",   arpu: "medium",    powered: "sarvam",  note: "Sarvam ready · extends to Bangladesh" },
  { name: "Marathi",   native: "मराठी",        flag: "🇮🇳", speakers: "83M",         speakersRaw: 83,   status: "next",   arpu: "medium",    powered: "sarvam",  note: "Sarvam ready · shares Devanagari font" },
  { name: "Gujarati",  native: "ગુજરાતી",      flag: "🇮🇳", speakers: "57M",         speakersRaw: 57,   status: "next",   arpu: "medium",    powered: "sarvam",  note: "Sarvam ready · high diaspora income" },
  { name: "Punjabi",   native: "ਪੰਜਾਬੀ",       flag: "🇮🇳", speakers: "33M",         speakersRaw: 33,   status: "next",   arpu: "medium",    powered: "sarvam",  note: "Sarvam ready" },
  { name: "Odia",      native: "ଓଡ଼ିଆ",        flag: "🇮🇳", speakers: "38M",         speakersRaw: 38,   status: "next",   arpu: "medium",    powered: "sarvam",  note: "Sarvam ready" },
  { name: "Sanskrit",  native: "संस्कृतम्",     flag: "🕉️",  speakers: "Cultural",    speakersRaw: 0,    status: "next",   arpu: "medium",    powered: "openai",  note: "Cultural · scholars · Vedic wisdom layer" },
];

const GLOBAL_LANGUAGES: Language[] = [
  // Phase 2
  { name: "Arabic",     native: "العربية",         flag: "🌙", speakers: "400M",   speakersRaw: 400, status: "next",   phase: 2, arpu: "very-high", powered: "browser", note: "Gulf premium · 0.6% web content · huge gap" },
  { name: "Spanish",    native: "Español",          flag: "🇪🇸", speakers: "559M",   speakersRaw: 559, status: "next",   phase: 2, arpu: "medium",    powered: "browser", note: "Latin America · mobile-first · 20 countries" },
  { name: "French",     native: "Français",         flag: "🇫🇷", speakers: "312M",   speakersRaw: 312, status: "next",   phase: 2, arpu: "high",      powered: "browser", note: "France + West Africa · 650M by 2050" },
  // Phase 3
  { name: "Portuguese", native: "Português",        flag: "🇧🇷", speakers: "267M",   speakersRaw: 267, status: "phase3", phase: 3, arpu: "medium",    powered: "browser", note: "Brazil · 215M people · fastest growing" },
  { name: "Bengali",    native: "বাংলা (BD)",       flag: "🇧🇩", speakers: "284M",   speakersRaw: 284, status: "phase3", phase: 3, arpu: "lower",     powered: "browser", note: "Bangladesh · extends Indian Bengali work" },
  { name: "Indonesian", native: "Bahasa Indonesia", flag: "🇮🇩", speakers: "252M",   speakersRaw: 252, status: "phase3", phase: 3, arpu: "lower",     powered: "browser", note: "SE Asia · young · mobile-first" },
  // Phase 4
  { name: "German",     native: "Deutsch",          flag: "🇩🇪", speakers: "135M",   speakersRaw: 135, status: "phase4", phase: 4, arpu: "very-high", powered: "browser", note: "Highest income per user in Europe" },
  { name: "Japanese",   native: "日本語",            flag: "🇯🇵", speakers: "125M",   speakersRaw: 125, status: "phase4", phase: 4, arpu: "high",      powered: "browser", note: "Loyal · high-paying · premium market" },
  { name: "Swahili",    native: "Kiswahili",        flag: "🌍", speakers: "80M",    speakersRaw: 80,  status: "phase4", phase: 4, arpu: "lower",     powered: "browser", note: "East Africa · first-mover advantage" },
  { name: "Russian",    native: "Русский",          flag: "🇷🇺", speakers: "253M",   speakersRaw: 253, status: "phase4", phase: 4, arpu: "medium",    powered: "browser", note: "Large market · payment complexity post-2022" },
  { name: "Korean",     native: "한국어",            flag: "🇰🇷", speakers: "85M",    speakersRaw: 85,  status: "phase4", phase: 4, arpu: "high",      powered: "browser", note: "High smartphone usage · premium apps culture" },
  { name: "Turkish",    native: "Türkçe",           flag: "🇹🇷", speakers: "90M",    speakersRaw: 90,  status: "phase4", phase: 4, arpu: "medium",    powered: "browser", note: "Bridge between Europe and Middle East" },
];

const ARPU_LABEL: Record<string, { label: string; color: string }> = {
  "very-high": { label: "$14.99 Elite",  color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  "high":      { label: "$7.99 Pro",     color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800" },
  "medium":    { label: "$4.99 Core",    color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800" },
  "lower":     { label: "$2.99 Core",    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
};

const STATUS_CONFIG: Record<Status, { label: string; dot: string; badge: string }> = {
  live:   { label: "Live",          dot: "bg-emerald-500",                                                          badge: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  next:   { label: "Next — 3 mo",  dot: "bg-amber-400 animate-pulse",                                              badge: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  phase3: { label: "Months 4–6",   dot: "bg-sky-400",                                                              badge: "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800" },
  phase4: { label: "Months 7–12",  dot: "bg-gray-300 dark:bg-gray-600",                                            badge: "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700" },
};

const POWER_LABEL: Record<string, string> = {
  sarvam:  "Sarvam AI",
  browser: "Web Speech",
  openai:  "GPT-4o",
};

const PHASES = [
  { id: "live",   label: "Phase 1 — Live now",       sub: "3 languages active",                  color: "border-emerald-300 dark:border-emerald-700",  dot: "bg-emerald-500" },
  { id: "next",   label: "Phase 2 — Next 3 months",  sub: "India complete + Arabic, Spanish, French", color: "border-amber-300 dark:border-amber-700", dot: "bg-amber-400" },
  { id: "phase3", label: "Phase 3 — Months 4–6",     sub: "Portuguese, Bengali BD, Indonesian",  color: "border-sky-300 dark:border-sky-700",           dot: "bg-sky-400" },
  { id: "phase4", label: "Phase 4 — Months 7–12",    sub: "German, Japanese, Swahili + more",    color: "border-gray-300 dark:border-gray-700",         dot: "bg-gray-400" },
];

function LanguageCard({ lang, compact = false }: { lang: Language; compact?: boolean }) {
  const status = STATUS_CONFIG[lang.status];
  const arpu = lang.arpu ? ARPU_LABEL[lang.arpu] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${
        lang.status === "live"
          ? "border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10"
          : lang.status === "next"
          ? "border-amber-100 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/10"
          : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50"
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{lang.flag}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{lang.name}</p>
            <p className="text-xs text-muted-foreground">{lang.native}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status.dot}`} />
          {lang.status === "live" && <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] font-medium text-muted-foreground bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md">
          {lang.speakers}
        </span>
        {arpu && !compact && (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md border ${arpu.color}`}>
            {arpu.label}
          </span>
        )}
        {lang.powered && !compact && (
          <span className="text-[10px] text-muted-foreground bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded-md">
            {POWER_LABEL[lang.powered]}
          </span>
        )}
      </div>

      {lang.note && !compact && (
        <p className="text-[10px] text-muted-foreground leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-1.5">{lang.note}</p>
      )}
    </motion.div>
  );
}

const STATS = [
  { value: "3.2B+",  label: "Total addressable speakers", icon: Globe },
  { value: "26",     label: "Languages on roadmap",        icon: TrendingUp },
  { value: "0.6%",   label: "Web content in Arabic",       icon: Zap, sub: "← massive gap" },
  { value: "2050",   label: "French reaches 650M speakers", icon: Clock, sub: "2/3 in Africa" },
];

export default function LanguageRoadmapPage() {
  const [filter, setFilter] = useState<Status | "all">("all");

  const liveLangs  = [...INDIA_LANGUAGES.filter(l => l.status === "live"), ...GLOBAL_LANGUAGES.filter(l => l.status === "live")];
  const nextLangs  = [...INDIA_LANGUAGES.filter(l => l.status === "next"), ...GLOBAL_LANGUAGES.filter(l => l.status === "next")];
  const phase3Langs = GLOBAL_LANGUAGES.filter(l => l.status === "phase3");
  const phase4Langs = GLOBAL_LANGUAGES.filter(l => l.status === "phase4");

  const totalSpeakers = [...INDIA_LANGUAGES, ...GLOBAL_LANGUAGES]
    .filter((l, i, arr) => arr.findIndex(x => x.name === l.name) === i)
    .reduce((acc, l) => acc + l.speakersRaw, 0);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">

      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/language">
            <button className="text-muted-foreground hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Global Language Roadmap</h1>
            <p className="text-xs text-muted-foreground">Ethnologue 2025 · {Math.round(totalSpeakers / 100) / 10}B+ speakers · {[...INDIA_LANGUAGES, ...GLOBAL_LANGUAGES].length} languages</p>
          </div>
          <Link href="/language-demo">
            <button className="text-xs font-medium text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 rounded-full px-3 py-1.5 hover:bg-cyan-50 dark:hover:bg-cyan-950/20 transition-colors">
              Live demo →
            </button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">

        {/* Hero stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="border border-gray-100 dark:border-gray-800 rounded-2xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.label}</p>
              {s.sub && <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">{s.sub}</p>}
            </motion.div>
          ))}
        </div>

        {/* Phase timeline strip */}
        <div className="relative">
          <div className="absolute top-4 left-0 right-0 h-px bg-gray-100 dark:bg-gray-800 mx-8" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative">
            {PHASES.map((ph, i) => (
              <button
                key={ph.id}
                onClick={() => setFilter(filter === ph.id as Status ? "all" : ph.id as Status)}
                className={`flex flex-col items-center gap-2 pt-0 transition-all`}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white dark:bg-gray-950 z-10 relative transition-all ${
                  filter === ph.id || filter === "all"
                    ? ph.color + " shadow-sm"
                    : "border-gray-200 dark:border-gray-700"
                }`}>
                  {ph.id === "live"
                    ? <Check className="w-4 h-4 text-emerald-500" />
                    : <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                  }
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{ph.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{ph.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── PHASE 1: LIVE ── */}
        {(filter === "all" || filter === "live") && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Phase 1 — Live</h2>
              </div>
              <span className="text-xs text-muted-foreground bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                {liveLangs.length} languages
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {liveLangs.map(l => <LanguageCard key={l.name + l.flag} lang={l} />)}
            </div>
          </section>
        )}

        {/* ── PHASE 2: INDIA COMPLETE + GLOBAL TIER 1 ── */}
        {(filter === "all" || filter === "next") && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Phase 2 — Next 3 months</h2>
              </div>
              <span className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full">
                {nextLangs.length} languages
              </span>
            </div>

            {/* India sub-section */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">🇮🇳 India — Sarvam AI powered</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {INDIA_LANGUAGES.filter(l => l.status === "next").map(l => <LanguageCard key={l.name} lang={l} />)}
              </div>
            </div>

            {/* Global sub-section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">🌍 Global Tier 1</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {GLOBAL_LANGUAGES.filter(l => l.status === "next").map(l => <LanguageCard key={l.name} lang={l} />)}
              </div>
            </div>
          </section>
        )}

        {/* ── PHASE 3 ── */}
        {(filter === "all" || filter === "phase3") && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Phase 3 — Months 4–6</h2>
              </div>
              <span className="text-xs text-muted-foreground bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 text-sky-700 dark:text-sky-400 px-2 py-0.5 rounded-full">
                {phase3Langs.length} languages
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {phase3Langs.map(l => <LanguageCard key={l.name} lang={l} />)}
            </div>
          </section>
        )}

        {/* ── PHASE 4 ── */}
        {(filter === "all" || filter === "phase4") && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Phase 4 — Months 7–12</h2>
              </div>
              <span className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full">
                {phase4Langs.length} languages
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {phase4Langs.map(l => <LanguageCard key={l.name} lang={l} />)}
            </div>
          </section>
        )}

        {/* Revenue insight table */}
        {(filter === "all") && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Revenue by Market</h2>
            </div>
            <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Market</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Language</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rev/user/mo</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {[
                    { market: "Gulf (Dubai/Riyadh)", lang: "Arabic",    plan: "$14.99 Elite", rev: "$14.24",  note: "Highest international ARPU", highlight: true },
                    { market: "Europe",               lang: "German",    plan: "$7.99 Pro",    rev: "$7.09",   note: "Highest income per user" },
                    { market: "Japan",                lang: "Japanese",  plan: "$7.99 Pro",    rev: "$7.09",   note: "Loyal, high-retention users" },
                    { market: "France + Africa",      lang: "French",    plan: "$7.99 Pro",    rev: "$7.09",   note: "650M by 2050" },
                    { market: "Latin America",        lang: "Spanish",   plan: "$4.99 Core",   rev: "$4.24",   note: "Largest addressable market" },
                    { market: "Brazil",               lang: "Portuguese",plan: "$4.99 Core",   rev: "$4.24",   note: "215M mobile-first users" },
                    { market: "SE Asia",              lang: "Indonesian",plan: "$2.99 Core",   rev: "$2.54",   note: "Young demographic" },
                    { market: "Bangladesh",           lang: "Bengali",   plan: "$2.99 Core",   rev: "$2.54",   note: "Extends India Bengali" },
                  ].map((row, i) => (
                    <tr key={i} className={row.highlight ? "bg-amber-50/50 dark:bg-amber-950/10" : "bg-white dark:bg-gray-950"}>
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-900 dark:text-white">{row.market}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.lang}</td>
                      <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${row.highlight ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700" : "bg-gray-50 dark:bg-gray-900 text-muted-foreground border-gray-200 dark:border-gray-700"}`}>{row.plan}</span></td>
                      <td className="px-4 py-2.5 text-xs font-bold text-gray-900 dark:text-white">{row.rev}</td>
                      <td className="px-4 py-2.5 text-[10px] text-muted-foreground hidden sm:table-cell">{row.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* The hidden opportunity */}
        {filter === "all" && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              <div className="sm:col-span-2 border border-purple-100 dark:border-purple-900/30 bg-purple-50/30 dark:bg-purple-950/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🌍</span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">The Hidden Opportunity — Africa</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  French speakers will reach <strong className="text-gray-900 dark:text-white">650 million by 2050</strong> — and most of that growth is in Africa.
                  Nigeria, Kenya, Ethiopia, Ghana: fast-growing smartphone markets, young demographics,
                  almost no AI product built for them.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  <strong className="text-gray-900 dark:text-white">Swahili</strong> has 80M total speakers across East Africa.
                  Nobody is building for this market yet. ARYA could be first.
                </p>
                <div className="flex gap-2 mt-4">
                  {["French 🇫🇷 West Africa", "Swahili 🌍 East Africa"].map(t => (
                    <span key={t} className="text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>

              <div className="border border-amber-100 dark:border-amber-900/30 bg-amber-50/30 dark:bg-amber-950/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">⚡</span>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">The Arabic Gap</h3>
                </div>
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400">0.6%</p>
                <p className="text-xs text-muted-foreground mt-1">of web content is in Arabic — despite 400M speakers</p>
                <div className="mt-3 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: "0.6%" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">That gap between speakers and digital content is the opportunity. ARYA in Arabic = almost no competition.</p>
              </div>

            </div>
          </section>
        )}

        {/* The one insight */}
        {filter === "all" && (
          <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">The one insight to remember</p>
            <p className="text-base font-semibold text-gray-900 dark:text-white leading-relaxed max-w-2xl mx-auto">
              The languages most underserved by technology relative to their speaker population are{" "}
              <span className="text-amber-600 dark:text-amber-400">Arabic</span>,{" "}
              <span className="text-cyan-600 dark:text-cyan-400">Bengali</span>,{" "}
              <span className="text-emerald-600 dark:text-emerald-400">Indonesian</span>, and{" "}
              <span className="text-purple-600 dark:text-purple-400">Swahili</span>.
              ARYA going into these languages early means almost no competition.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
