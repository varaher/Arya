import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUserAuth } from "@/lib/user-auth";
import { Home } from "lucide-react";
import BottomNav from "@/components/BottomNav";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: "#0d0b0f", surface: "#16121e", surface2: "#1e1928",
  border: "#2a2438", border2: "#352d48",
  indigo: "#7c6aff",
  saffron: "#f5a623",
  teal: "#5ecfb0", rose: "#e87070",
  text: "#ede8f5", textDim: "#8a80a0", textMuted: "#3d3550",
};
const serif = "'Libre Baskerville', Georgia, serif";
const sans  = "'Nunito', 'Inter', sans-serif";

// Path accent system
const ACCENT = {
  western: { main: "#f5c842", dim: "rgba(245,200,66,0.10)", border: "rgba(245,200,66,0.22)", badge: "⭐ Western" },
  vedic:   { main: "#f5a623", dim: "rgba(245,166,35,0.10)", border: "rgba(245,166,35,0.22)", badge: "🪔 Vedic" },
  neutral: { main: "#8fa0b8", dim: "rgba(143,160,184,0.10)", border: "rgba(143,160,184,0.22)", badge: "🌐 Neutral" },
};

// ── Types ────────────────────────────────────────────────────────────────────
type VedicPath   = "western" | "vedic" | "neutral";
type VedicScreen = "path" | "sign" | "birth" | "ready" | "briefing";

interface VedicBriefing {
  userName: string;
  planetaryPills: Array<{ emoji: string; text: string; tone: "good" | "caution" | "watch" }>;
  aryaInsight: string;
  muhurat: { startTime: string; endTime: string; purpose: string };
  cosmicCards: Array<{ tone: "good" | "caution" | "watch"; label: string; text: string }>;
  guidance: { money: string; relationships: string; body: string };
  dasha: { lord: string; yearsLeft: number; chapterText: string };
}
interface LensProfile { rashi: string; nakshatra: string; dashaLord: string; dashaYearsLeft: string }

// ── Static data ───────────────────────────────────────────────────────────────
const RASHIS = [
  { symbol: "♈", name: "Mesh",      english: "Aries" },
  { symbol: "♉", name: "Vrishabh",  english: "Taurus" },
  { symbol: "♊", name: "Mithun",    english: "Gemini" },
  { symbol: "♋", name: "Kark",      english: "Cancer" },
  { symbol: "♌", name: "Simha",     english: "Leo" },
  { symbol: "♍", name: "Kanya",     english: "Virgo" },
  { symbol: "♎", name: "Tula",      english: "Libra" },
  { symbol: "♏", name: "Vrishchik", english: "Scorpio" },
  { symbol: "♐", name: "Dhanu",     english: "Sagittarius" },
  { symbol: "♑", name: "Makar",     english: "Capricorn" },
  { symbol: "♒", name: "Kumbh",     english: "Aquarius" },
  { symbol: "♓", name: "Meen",      english: "Pisces" },
];
const WESTERN_SIGNS = [
  { symbol: "♈", name: "Aries",       dates: "Mar 21 – Apr 19" },
  { symbol: "♉", name: "Taurus",      dates: "Apr 20 – May 20" },
  { symbol: "♊", name: "Gemini",      dates: "May 21 – Jun 20" },
  { symbol: "♋", name: "Cancer",      dates: "Jun 21 – Jul 22" },
  { symbol: "♌", name: "Leo",         dates: "Jul 23 – Aug 22" },
  { symbol: "♍", name: "Virgo",       dates: "Aug 23 – Sep 22" },
  { symbol: "♎", name: "Libra",       dates: "Sep 23 – Oct 22" },
  { symbol: "♏", name: "Scorpio",     dates: "Oct 23 – Nov 21" },
  { symbol: "♐", name: "Sagittarius", dates: "Nov 22 – Dec 21" },
  { symbol: "♑", name: "Capricorn",   dates: "Dec 22 – Jan 19" },
  { symbol: "♒", name: "Aquarius",    dates: "Jan 20 – Feb 18" },
  { symbol: "♓", name: "Pisces",      dates: "Feb 19 – Mar 20" },
];
const WESTERN_TO_VEDIC: Record<string, string> = {
  Aries: "Mesh", Taurus: "Vrishabh", Gemini: "Mithun", Cancer: "Kark",
  Leo: "Simha", Virgo: "Kanya", Libra: "Tula", Scorpio: "Vrishchik",
  Sagittarius: "Dhanu", Capricorn: "Makar", Aquarius: "Kumbh", Pisces: "Meen",
};
const TIME_WINDOWS = [
  { key: "late-night", emoji: "🌃", label: "Late night", range: "12am – 3am" },
  { key: "dawn",       emoji: "🌄", label: "Dawn",       range: "3am – 6am" },
  { key: "morning",    emoji: "🌅", label: "Morning",    range: "6am – 10am" },
  { key: "afternoon",  emoji: "☀️",  label: "Afternoon",  range: "10am – 2pm" },
  { key: "evening",    emoji: "🌆", label: "Evening",    range: "2pm – 6pm" },
  { key: "night",      emoji: "🌙", label: "Night",      range: "6pm – 12am" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();
}
function greetingTime() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

// ── Shared tiny components ────────────────────────────────────────────────────
function ProgDots({ step, total, color }: { step: number; total: number; color: string }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "0 0 24px" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 6, width: i === step ? 20 : 6, borderRadius: 3, background: i < step ? `${color}55` : i === step ? color : C.border2, transition: "all 0.3s" }} />
      ))}
    </div>
  );
}

function PathBadge({ path }: { path: VedicPath }) {
  const a = ACCENT[path];
  return (
    <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: a.main, background: a.dim, border: `1px solid ${a.border}`, padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap" as const }}>
      {a.badge}
    </div>
  );
}

function TopBar({ path, onBack }: { path: VedicPath | null; onBack: () => void }) {
  return (
    <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <button onClick={onBack} style={{ color: C.textDim, fontSize: 13, background: "none", border: "none", cursor: "pointer", fontFamily: sans }}>← Back</button>
      {path ? <PathBadge path={path} /> : <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: C.textMuted }}>ARYA Lens</div>}
      <div style={{ width: 60 }} />
    </div>
  );
}

function Btn({ children, onClick, color, ghost, disabled, style: s }: {
  children: React.ReactNode; onClick?: () => void; color?: string; ghost?: boolean; disabled?: boolean; style?: React.CSSProperties;
}) {
  const c = color || C.indigo;
  if (ghost) return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: "100%", padding: "14px", borderRadius: 14, border: `1px solid ${C.border}`, background: "transparent", fontFamily: sans, fontSize: 14, color: C.textDim, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: disabled ? 0.5 : 1, ...s }}>
      {children}
    </button>
  );
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", fontFamily: sans, fontSize: 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s", opacity: disabled ? 0.5 : 1, background: `linear-gradient(135deg, ${c}, ${c}cc)`, color: "#0d0b0f", boxShadow: `0 4px 20px ${c}44`, ...s }}>
      {children}
    </button>
  );
}

// ── Screen 1: Path selection ──────────────────────────────────────────────────
function PathSelectionScreen({ onSelect }: { onSelect: (p: VedicPath) => void }) {
  const [chosen, setChosen] = useState<VedicPath | null>(null);
  const paths: Array<{ key: VedicPath; emoji: string; title: string; desc: string }> = [
    { key: "western", emoji: "⭐", title: "I know my star sign",          desc: "Use your Western zodiac (Scorpio, Aries…) as the base for personal insights." },
    { key: "vedic",   emoji: "🪔", title: "I know my Rashi",              desc: "Use your Moon sign (Vrishchik, Mesh…) for deeper cycle-based guidance." },
    { key: "neutral", emoji: "🌐", title: "Neither — just tell me when",  desc: "No signs, no zodiac. Pure personal timing patterns based on your birth data." },
  ];
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "32px 24px 0", display: "flex", justifyContent: "center" }}>
        <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: C.textMuted }}>ARYA Lens · Setup</div>
      </div>
      <div style={{ padding: "28px 24px 90px", maxWidth: 460, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, lineHeight: 1.3, color: C.text, marginBottom: 10 }}>
            How do you connect<br />with <em style={{ color: C.saffron }}>timing?</em>
          </h1>
          <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.7 }}>
            ARYA adapts its language to how you see the world. Pick the path that feels natural.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {paths.map(p => {
            const a = ACCENT[p.key];
            const active = chosen === p.key;
            return (
              <button key={p.key} onClick={() => setChosen(p.key)} data-testid={`path-${p.key}`}
                style={{ textAlign: "left" as const, padding: "18px 20px", borderRadius: 16, border: `2px solid ${active ? a.main : C.border}`, background: active ? a.dim : C.surface, cursor: "pointer", transition: "all 0.2s", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{p.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: active ? a.main : C.text, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>{p.desc}</div>
                </div>
                {active && <div style={{ width: 20, height: 20, borderRadius: "50%", background: a.main, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#0d0b0f", fontWeight: 700, marginTop: 4 }}>✓</div>}
              </button>
            );
          })}
        </div>
        <Btn color={chosen ? ACCENT[chosen].main : C.indigo} disabled={!chosen} onClick={() => chosen && onSelect(chosen)}>
          Continue →
        </Btn>
        <p style={{ fontSize: 11, color: C.textMuted, textAlign: "center" as const, lineHeight: 1.6 }}>You can change this any time in your settings.</p>
      </div>
    </div>
  );
}

// ── Screen 2a: Western sign picker ────────────────────────────────────────────
function WesternSignScreen({ selected, onSelect, selectedRashi, onSelectRashi, onBack, onContinue }: {
  selected: string; onSelect: (s: string) => void;
  selectedRashi: string; onSelectRashi: (r: string) => void;
  onBack: () => void; onContinue: () => void;
}) {
  const [showRashi, setShowRashi] = useState(false);
  const a = ACCENT.western;
  return (
    <div style={{ minHeight: "100vh" }}>
      <TopBar path="western" onBack={onBack} />
      <ProgDots step={1} total={4} color={a.main} />
      <div style={{ padding: "0 24px 90px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: a.main, opacity: 0.7, marginBottom: 10 }}>Step 1 of 3</p>
        <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, lineHeight: 1.25, color: C.text, marginBottom: 8 }}>
          What's your <em style={{ color: a.main }}>star sign?</em>
        </h1>
        <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, marginBottom: 20 }}>Select from the grid — date ranges are shown on each card.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
          {WESTERN_SIGNS.map(s => {
            const active = selected === s.name;
            return (
              <div key={s.name} onClick={() => onSelect(s.name)} data-testid={`sign-${s.name.toLowerCase()}`}
                style={{ background: active ? a.dim : C.surface, border: `1.5px solid ${active ? a.main : C.border}`, borderRadius: 12, padding: "12px 6px", textAlign: "center" as const, cursor: "pointer", transition: "all 0.2s", position: "relative" as const }}>
                {active && <span style={{ position: "absolute" as const, top: 4, right: 7, fontSize: 9, color: a.main }}>✓</span>}
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.symbol}</div>
                <div style={{ fontSize: 11, color: active ? a.main : C.text, fontWeight: active ? 600 : 400 }}>{s.name}</div>
                <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2, lineHeight: 1.3 }}>{s.dates}</div>
              </div>
            );
          })}
        </div>

        {/* Optional Rashi add-on */}
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
          <div onClick={() => setShowRashi(v => !v)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>I also know my Rashi</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>Add an extra layer of depth — optional</div>
            </div>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: showRashi ? ACCENT.vedic.main : C.border, transition: "all 0.2s", flexShrink: 0, position: "relative" as const }}>
              <div style={{ position: "absolute" as const, top: 3, left: showRashi ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "all 0.2s" }} />
            </div>
          </div>
          <AnimatePresence>
            {showRashi && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                <div style={{ marginTop: 14 }}>
                  <p style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>Your Moon sign — each card shows both names</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                    {RASHIS.map(r => {
                      const active = selectedRashi === r.name;
                      return (
                        <div key={r.name} onClick={() => onSelectRashi(r.name)}
                          style={{ background: active ? ACCENT.vedic.dim : C.surface, border: `1px solid ${active ? ACCENT.vedic.main : C.border}`, borderRadius: 10, padding: "8px 4px", textAlign: "center" as const, cursor: "pointer", transition: "all 0.2s" }}>
                          <div style={{ fontSize: 16, marginBottom: 2 }}>{r.symbol}</div>
                          <div style={{ fontSize: 9, color: active ? ACCENT.vedic.main : C.textDim, fontWeight: active ? 600 : 400 }}>{r.name}</div>
                          <div style={{ fontSize: 8, color: C.textMuted }}>{r.english}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Btn color={a.main} disabled={!selected} onClick={onContinue}>Continue →</Btn>
        <div style={{ height: 8 }} />
        <Btn ghost onClick={onContinue}>I don't know my sign — skip</Btn>
      </div>
    </div>
  );
}

// ── Screen 2b: Vedic Rashi picker ─────────────────────────────────────────────
function VedicRashiScreen({ selected, onSelect, onBack, onContinue }: {
  selected: string; onSelect: (r: string) => void; onBack: () => void; onContinue: () => void;
}) {
  const a = ACCENT.vedic;
  return (
    <div style={{ minHeight: "100vh" }}>
      <TopBar path="vedic" onBack={onBack} />
      <ProgDots step={1} total={4} color={a.main} />
      <div style={{ padding: "0 24px 90px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: a.main, opacity: 0.7, marginBottom: 10 }}>Step 1 of 3</p>
        <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, lineHeight: 1.25, color: C.text, marginBottom: 8 }}>
          What is your <em style={{ color: a.main }}>Moon sign?</em>
        </h1>
        <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, marginBottom: 20 }}>
          Each card shows both names — pick whichever you recognise.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20 }}>
          {RASHIS.map(r => {
            const active = selected === r.name;
            return (
              <div key={r.name} onClick={() => onSelect(r.name)} data-testid={`rashi-${r.name.toLowerCase()}`}
                style={{ background: active ? a.dim : C.surface, border: `1.5px solid ${active ? a.main : C.border}`, borderRadius: 12, padding: "12px 6px", textAlign: "center" as const, cursor: "pointer", transition: "all 0.2s", position: "relative" as const }}>
                {active && <span style={{ position: "absolute" as const, top: 4, right: 7, fontSize: 9, color: a.main }}>✓</span>}
                <div style={{ fontSize: 22, marginBottom: 4 }}>{r.symbol}</div>
                <div style={{ fontSize: 12, color: active ? a.main : C.text, fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{r.english}</div>
              </div>
            );
          })}
        </div>
        <Btn color={a.main} onClick={onContinue}>Continue →</Btn>
        <div style={{ height: 8 }} />
        <Btn ghost onClick={onContinue}>I don't know my sign — skip</Btn>
      </div>
    </div>
  );
}

// ── Screen 3: Birth details (universal) ──────────────────────────────────────
function BirthScreen({ path, birthDate, setBirthDate, birthPlace, setBirthPlace, birthTimeApprox, setBirthTimeApprox, birthTimeExact, setBirthTimeExact, onBack, onContinue, onSkip, saving }: {
  path: VedicPath;
  birthDate: string; setBirthDate: (v: string) => void;
  birthPlace: string; setBirthPlace: (v: string) => void;
  birthTimeApprox: string; setBirthTimeApprox: (v: string) => void;
  birthTimeExact: string; setBirthTimeExact: (v: string) => void;
  onBack: () => void; onContinue: () => void; onSkip: () => void; saving: boolean;
}) {
  const a = ACCENT[path];
  const isNeutral = path === "neutral";
  const step = isNeutral ? 1 : 2;
  const total = isNeutral ? 3 : 4;
  const inputStyle: React.CSSProperties = {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: "14px 16px", color: C.text, fontFamily: sans, fontSize: 14,
    outline: "none", width: "100%",
  };
  return (
    <div style={{ minHeight: "100vh" }}>
      <TopBar path={path} onBack={onBack} />
      <ProgDots step={step} total={total} color={a.main} />
      <div style={{ padding: "0 24px 90px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: a.main, opacity: 0.7, marginBottom: 10 }}>
          Step {step} of {total - 1}
        </p>
        <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, lineHeight: 1.25, color: C.text, marginBottom: 8 }}>
          Your birth <em style={{ color: a.main }}>details</em>
        </h1>
        <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7, marginBottom: 20 }}>
          {isNeutral
            ? "This lets ARYA map your personal timing patterns — the windows when you think most clearly and act most effectively."
            : "This lets ARYA build your personal profile — precise life cycles and timing, blended with your goals."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.textMuted, marginBottom: 6 }}>Date of birth</div>
            <input data-testid="input-birth-date" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.textMuted, marginBottom: 6 }}>Birth city or town</div>
            <input data-testid="input-birth-place" type="text" value={birthPlace} onChange={e => setBirthPlace(e.target.value)} placeholder="e.g. Mumbai, Chennai, Delhi…" style={inputStyle} />
          </div>
        </div>

        {/* 6 time windows */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.textMuted, marginBottom: 10 }}>Approximate birth time</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
            {TIME_WINDOWS.map(tw => {
              const active = birthTimeApprox === tw.key;
              return (
                <button key={tw.key} onClick={() => setBirthTimeApprox(active ? "" : tw.key)} data-testid={`time-${tw.key}`}
                  style={{ padding: "12px 6px", borderRadius: 12, border: `1.5px solid ${active ? a.main : C.border}`, background: active ? a.dim : C.surface, cursor: "pointer", transition: "all 0.2s", textAlign: "center" as const }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{tw.emoji}</div>
                  <div style={{ fontSize: 11, color: active ? a.main : C.text, fontWeight: active ? 600 : 400 }}>{tw.label}</div>
                  <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{tw.range}</div>
                </button>
              );
            })}
          </div>

          {/* I don't know — first-class option */}
          <button onClick={() => { setBirthTimeApprox("unknown"); setBirthTimeExact(""); }}
            data-testid="time-dont-know"
            style={{ width: "100%", padding: "13px 16px", borderRadius: 12, border: `1.5px solid ${birthTimeApprox === "unknown" ? a.main : C.border2}`, background: birthTimeApprox === "unknown" ? a.dim : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "all 0.2s", textAlign: "left" as const }}>
            <div>
              <div style={{ fontSize: 13, color: birthTimeApprox === "unknown" ? a.main : C.textDim, fontWeight: birthTimeApprox === "unknown" ? 600 : 400 }}>I don't know my birth time</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>Still meaningful — just not to the precise hour</div>
            </div>
            {birthTimeApprox === "unknown" && <span style={{ color: a.main, fontSize: 14, marginLeft: 8 }}>✓</span>}
          </button>

          {/* Exact time — only if not "unknown" */}
          {birthTimeApprox && birthTimeApprox !== "unknown" && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>Exact time from birth certificate (optional)</div>
              <input data-testid="input-birth-time" type="time" value={birthTimeExact} onChange={e => setBirthTimeExact(e.target.value)}
                style={{ ...inputStyle, width: "auto", minWidth: 150 }} />
            </motion.div>
          )}
        </div>

        <div style={{ background: "rgba(124,106,255,0.04)", border: `1px solid rgba(124,106,255,0.12)`, borderRadius: 12, padding: "13px 16px", fontSize: 12, color: C.textDim, lineHeight: 1.7, display: "flex", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
          <span>Your birth details are stored privately and used solely to personalise your ARYA Lens. Never shared. Delete any time via Privacy &amp; Control.</span>
        </div>

        <Btn color={a.main} onClick={onContinue} disabled={saving}>
          {saving ? "Building your profile…" : "Build my profile →"}
        </Btn>
        <div style={{ height: 8 }} />
        <Btn ghost onClick={onSkip} disabled={saving}>Skip — use what I've given</Btn>
      </div>
    </div>
  );
}

// ── Screen 4: Ready (path-specific completion) ────────────────────────────────
function ReadyScreen({ path, profile, westernSign, selectedRashi, onBack, onContinue }: {
  path: VedicPath; profile: LensProfile | null; westernSign: string; selectedRashi: string;
  onBack: () => void; onContinue: () => void;
}) {
  const a = ACCENT[path];
  const rashi = profile?.rashi || selectedRashi || "";
  const rashiData = RASHIS.find(r => r.name === rashi);
  const westernData = WESTERN_SIGNS.find(s => s.name === westernSign);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar path={path} onBack={onBack} />
      <div style={{ padding: "0 24px 90px", maxWidth: 460, margin: "0 auto", width: "100%", textAlign: "center" as const, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180, delay: 0.1 }}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle, ${a.dim} 0%, transparent 70%)`, border: `1px solid ${a.border}`, fontSize: 44, marginBottom: 24 }}>
          {path === "western" ? "⭐" : path === "vedic" ? "🪔" : "🌐"}
        </motion.div>

        <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: a.main, opacity: 0.7, marginBottom: 8 }}>Your profile is ready</p>
        <h1 style={{ fontFamily: serif, fontSize: 28, fontWeight: 400, lineHeight: 1.25, color: C.text, marginBottom: 20 }}>
          ARYA Lens<br /><em style={{ color: a.main }}>is active.</em>
        </h1>

        {/* Western completion */}
        {path === "western" && (
          <>
            {westernData && <div style={{ fontSize: 40, marginBottom: 6 }}>{westernData.symbol}</div>}
            <div style={{ fontSize: 20, color: a.main, fontWeight: 700, marginBottom: 4 }}>
              {westernSign || "Your sign"}
            </div>
            {westernData && <div style={{ fontSize: 12, color: C.textDim, marginBottom: 20 }}>{westernData.dates}</div>}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, width: "100%", maxWidth: 320, textAlign: "left" as const, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>What ARYA will bring you</div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.75, fontStyle: "italic", borderLeft: `2px solid ${a.main}44`, paddingLeft: 10 }}>
                "For {westernSign || "your sign"} this week: your best decision window looks mid-week. ARYA will pinpoint the precise moment using your mood, calendar, and open goals."
              </div>
            </div>
          </>
        )}

        {/* Vedic completion */}
        {path === "vedic" && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, width: "100%", maxWidth: 320, textAlign: "left" as const, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 12 }}>Your profile</div>
            {[
              rashi ? ["Moon sign", `${rashiData?.symbol || ""} ${rashi} · ${rashiData?.english || ""}`, a.main] : null,
              profile?.nakshatra ? ["Birth star", profile.nakshatra, C.text] : null,
              profile?.dashaLord ? ["Current cycle", `${profile.dashaLord} · ${profile.dashaYearsLeft} yrs left`, C.text] : null,
            ].filter(Boolean).map(row => (
              <div key={row![0] as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 13, marginBottom: 9, gap: 8, flexWrap: "wrap" as const }}>
                <span style={{ color: C.textDim, flexShrink: 0 }}>{row![0] as string}</span>
                <span style={{ color: row![2] as string, fontWeight: 500 }}>{row![1] as string}</span>
              </div>
            ))}
            {!rashi && !profile && (
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7 }}>Profile built from your birth details — ARYA will use these for every briefing.</div>
            )}
          </div>
        )}

        {/* Neutral completion */}
        {path === "neutral" && (
          <div style={{ background: C.surface, border: `1px solid ${a.border}`, borderRadius: 14, padding: 18, width: "100%", maxWidth: 320, textAlign: "left" as const, marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>Your personal rhythm</div>
            <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.75, fontStyle: "italic", borderLeft: `2px solid ${a.main}55`, paddingLeft: 10 }}>
              "Your clearest thinking window this week is <strong style={{ color: a.main, fontStyle: "normal" }}>Tuesday before noon</strong> — that's when your pattern says you make your best calls. The data backs this up."
            </div>
            <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted }}>No zodiac. No signs. Just your personal pattern, traceable to actual data points in your life.</div>
          </div>
        )}

        <p style={{ fontSize: 13, color: C.textDim, lineHeight: 1.75, maxWidth: 300, marginBottom: 24 }}>
          Every briefing now includes personal timing context — in plain language.
        </p>
        <Btn color={a.main} onClick={onContinue}>See today's briefing →</Btn>
      </div>
    </div>
  );
}

// ── Screen 5: Briefing (path-aware) ──────────────────────────────────────────
function BriefingScreen({ briefing, loading, onHome, path }: {
  briefing: VedicBriefing | null; loading: boolean; onHome: () => void; path: VedicPath;
}) {
  const { data: goalsData } = useQuery<any[]>({
    queryKey: ["/api/arya/goals"],
    queryFn: async () => { const r = await fetch("/api/arya/goals"); return r.ok ? r.json() : []; },
  });
  const [doneGoals, setDoneGoals] = useState<Set<number>>(new Set());
  const a = ACCENT[path];

  const toneColors = {
    good:    { bg: "rgba(94,207,176,0.06)",   border: "rgba(94,207,176,0.15)",   bar: C.teal,    label: C.teal },
    caution: { bg: "rgba(245,166,35,0.06)",   border: "rgba(245,166,35,0.15)",   bar: C.saffron, label: C.saffron },
    watch:   { bg: "rgba(232,112,112,0.06)",  border: "rgba(232,112,112,0.15)",  bar: C.rose,    label: C.rose },
  };
  const pillStyle = (tone: "good" | "caution" | "watch") => ({
    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
    whiteSpace: "nowrap" as const, fontSize: 12, flexShrink: 0,
    ...{ good: { border: `1px solid rgba(94,207,176,0.3)`, color: C.teal, background: "rgba(94,207,176,0.06)" },
         caution: { border: `1px solid rgba(245,166,35,0.3)`, color: C.saffron, background: "rgba(245,166,35,0.06)" },
         watch: { border: `1px solid rgba(232,112,112,0.3)`, color: C.rose, background: "rgba(232,112,112,0.06)" } }[tone],
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 36, animation: "vl-pulse 2s ease-in-out infinite" }}>
        {path === "western" ? "⭐" : path === "vedic" ? "🪐" : "🌐"}
      </div>
      <p style={{ color: C.textDim, fontSize: 14 }}>
        {path === "neutral" ? "Reading your patterns…" : "Reading the signals…"}
      </p>
    </div>
  );

  if (!briefing) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
      <div style={{ fontSize: 40 }}>🌙</div>
      <div style={{ fontFamily: serif, fontSize: 18, color: C.text, textAlign: "center" as const }}>Briefing unavailable right now</div>
      <div style={{ fontSize: 13, color: C.textDim, textAlign: "center" as const, maxWidth: 260 }}>Check your connection and try again.</div>
      <button onClick={onHome} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 24, border: `1px solid ${C.border2}`, background: "transparent", color: C.textDim, fontSize: 13, cursor: "pointer" }}>← Back</button>
    </div>
  );

  const b = briefing;
  const activeGoals = (goalsData || []).filter((g: any) => g.isActive).slice(0, 4);

  return (
    <div>
      {/* Header */}
      <div style={{ background: `linear-gradient(180deg, ${a.dim} 0%, transparent 100%)`, borderBottom: `1px solid ${C.border}`, padding: "24px 24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.06em" }}>{todayStr()}</div>
          <PathBadge path={path} />
        </div>
        <div style={{ fontFamily: serif, fontSize: 22, color: C.text, marginBottom: 4 }}>
          {greetingTime()}, <em style={{ color: a.main }}>{b.userName}.</em>
        </div>
        <div style={{ fontSize: 13, color: C.textDim, marginBottom: path !== "neutral" ? 16 : 8 }}>Here's what today looks like — for you, specifically.</div>
        {path !== "neutral" && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" as any }}>
            {(b.planetaryPills || []).map((p, i) => (
              <div key={i} style={pillStyle(p.tone)}><span>{p.emoji}</span><span>{p.text}</span></div>
            ))}
          </div>
        )}
        {path === "neutral" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            <div style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${a.border}`, color: a.main, background: a.dim, fontSize: 12 }}>📊 Best window: Tuesday morning</div>
            <div style={{ padding: "6px 12px", borderRadius: 20, border: `1px solid ${C.border}`, color: C.textDim, background: C.surface2, fontSize: 12 }}>⚡ Energy: Rising</div>
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "0 24px 80px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <div style={{ height: 20 }} />

        {/* ARYA insight */}
        <div style={{ background: a.dim, border: `1px solid ${a.border}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg, ${a.main}, ${a.main}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#0d0b0f", fontWeight: 700 }}>A</div>
            <div style={{ fontSize: 11, color: a.main, letterSpacing: "0.08em" }}>ARYA · {path === "neutral" ? "Personal Insight" : "Blended Insight"}</div>
          </div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.75 }}
            dangerouslySetInnerHTML={{ __html: (b.aryaInsight || "").replace(/\*\*(.*?)\*\*/g, `<strong style="color:${a.main}">$1</strong>`) }} />
        </div>

        {/* Timing window */}
        <div style={{ background: `linear-gradient(135deg, ${a.dim}, rgba(124,106,255,0.06))`, border: `1px solid ${a.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>⏰</span>
            <div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Best window today</div>
              <div style={{ fontSize: 16, color: a.main, fontWeight: 600, letterSpacing: "0.05em" }}>{b.muhurat?.startTime ?? "—"} – {b.muhurat?.endTime ?? "—"}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.textDim, textAlign: "right" as const }}>For {b.muhurat?.purpose ?? "important tasks"}</div>
        </div>

        {/* Cosmic cards — Western + Vedic only */}
        {path !== "neutral" && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 18 }}>{path === "western" ? "⭐" : "🪐"}</span>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: C.textMuted, fontWeight: 600 }}>
                {path === "western" ? "This Week's Energy" : "Today's Guidance"}
              </div>
              <div style={{ marginLeft: "auto", fontSize: 9, padding: "3px 8px", borderRadius: 10, color: a.main, background: a.dim, border: `1px solid ${a.border}`, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>ARYA Lens</div>
            </div>
            <div style={{ padding: 16 }}>
              {(b.cosmicCards || []).map((card, i) => {
                const tc = toneColors[card.tone];
                return (
                  <div key={i} style={{ borderRadius: 12, padding: 14, marginBottom: 10, position: "relative" as const, overflow: "hidden", background: tc.bg, border: `1px solid ${tc.border}` }}>
                    <div style={{ position: "absolute" as const, left: 0, top: 0, bottom: 0, width: 3, background: tc.bar }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 13 }}>{card.tone === "good" ? "✦" : "◈"}</span>
                      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: tc.label }}>{card.label}</div>
                    </div>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7, fontStyle: "italic", fontFamily: serif }}>{card.text}</div>
                  </div>
                );
              })}
              {[
                { emoji: "💰", label: "Money & decisions",  text: b.guidance?.money ?? "" },
                { emoji: "❤️", label: "Relationships",      text: b.guidance?.relationships ?? "" },
                { emoji: "🏃", label: "Body & energy",      text: b.guidance?.body ?? "" },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{row.emoji}</span>
                  <div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{row.label}</div>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{row.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Neutral: personal pattern card (no cosmic language) */}
        {path === "neutral" && (
          <div style={{ background: C.surface, border: `1px solid ${a.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: C.textMuted, fontWeight: 600 }}>Your Personal Pattern Today</div>
              <div style={{ marginLeft: "auto", fontSize: 9, padding: "3px 8px", borderRadius: 10, color: a.main, background: a.dim, border: `1px solid ${a.border}`, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Data-backed</div>
            </div>
            <div style={{ padding: 16 }}>
              {[
                { emoji: "💰", label: "Money & decisions", text: b.guidance?.money ?? "" },
                { emoji: "❤️", label: "Relationships",     text: b.guidance?.relationships ?? "" },
                { emoji: "🏃", label: "Energy & focus",    text: b.guidance?.body ?? "" },
              ].map((row, i, arr) => (
                <div key={row.label} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{row.emoji}</span>
                  <div>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{row.label}</div>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{row.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Goals */}
        {activeGoals.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 18 }}>🎯</span>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: C.textMuted, fontWeight: 600 }}>Your Focus Today</div>
            </div>
            <div style={{ padding: "0 16px" }}>
              {activeGoals.map((g: any) => {
                const done = doneGoals.has(g.id);
                return (
                  <div key={g.id} onClick={() => setDoneGoals(prev => { const s = new Set(prev); done ? s.delete(g.id) : s.add(g.id); return s; })}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, border: `1.5px solid ${done ? C.teal : C.border2}`, flexShrink: 0, background: done ? C.teal : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", fontSize: 11, color: "white" }}>
                      {done ? "✓" : ""}
                    </div>
                    <div style={{ fontSize: 13, color: done ? C.textDim : C.text, flex: 1, textDecoration: done ? "line-through" : "none" }}>{g.title}</div>
                    {g.streak > 0 && <div style={{ fontSize: 11, color: C.saffron }}>🔥 {g.streak}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vedic only: current life chapter */}
        {path === "vedic" && b.dasha && (
          <div style={{ background: "rgba(124,106,255,0.04)", border: `1px solid rgba(124,106,255,0.12)`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>🌊</span>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: C.textMuted, fontWeight: 600 }}>Your Current Chapter</div>
            </div>
            <div style={{ fontSize: 13, color: C.textDim, marginBottom: 6 }}>
              <span style={{ color: C.indigo, fontWeight: 600 }}>{b.dasha.lord} cycle</span> · {b.dasha.yearsLeft} years remaining
            </div>
            <div style={{ fontSize: 14, color: C.text, lineHeight: 1.75 }}>{b.dasha.chapterText}</div>
          </div>
        )}

        <div style={{ height: 8 }} />
        <button onClick={onHome} style={{ width: "100%", padding: "14px 16px", borderRadius: 14, background: "transparent", border: `1px solid ${C.border}`, color: C.textDim, fontFamily: sans, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Home size={16} /> Back to ARYA
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VedicLensPage() {
  const [, setLocation] = useLocation();
  const { token, isLoggedIn } = useUserAuth();

  const [screen,            setScreen]            = useState<VedicScreen>("path");
  const [path,              setPath]              = useState<VedicPath>("vedic");
  const [selectedWestern,   setSelectedWestern]   = useState("");
  const [selectedRashi,     setSelectedRashi]     = useState("");
  const [birthDate,         setBirthDate]         = useState("");
  const [birthPlace,        setBirthPlace]        = useState("");
  const [birthTimeApprox,   setBirthTimeApprox]   = useState("");
  const [birthTimeExact,    setBirthTimeExact]    = useState("");
  const [saving,            setSaving]            = useState(false);
  const [profile,           setProfile]           = useState<LensProfile | null>(null);
  const [briefing,          setBriefing]          = useState<VedicBriefing | null>(null);
  const [briefingLoading,   setBriefingLoading]   = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Nunito:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `@keyframes vl-pulse{0%,100%{opacity:0.7}50%{opacity:1}}@keyframes vl-twinkle{0%,100%{opacity:var(--min-op,0.1)}50%{opacity:var(--max-op,0.5)}}`;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(link); document.head.removeChild(style); } catch {} };
  }, []);

  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i, left: `${(i * 17 + 7) % 100}%`, top: `${(i * 23 + 11) % 100}%`,
    size: i % 3 === 0 ? 1.5 : 1, dur: `${2 + (i % 4)}s`, delay: `${-(i % 5) * 0.8}s`,
    minOp: 0.04, maxOp: 0.14 + (i % 3) * 0.10,
  })), []);

  const saveProfile = useCallback(async () => {
    if (!token || !isLoggedIn) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/vedic-lens", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({
          path,
          westernSign: selectedWestern,
          rashi: selectedRashi || (selectedWestern ? WESTERN_TO_VEDIC[selectedWestern] : ""),
          birthDate, birthPlace, birthTimeApprox, birthTimeExact,
        }),
      });
      const data = await res.json();
      if (res.ok && data.profile) setProfile(data.profile);
    } catch {}
    setSaving(false);
  }, [token, isLoggedIn, path, selectedWestern, selectedRashi, birthDate, birthPlace, birthTimeApprox, birthTimeExact]);

  const fetchBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["x-user-token"] = token;
      const res = await fetch("/api/user/vedic-briefing", { headers });
      if (res.ok) setBriefing(await res.json());
    } catch {}
    setBriefingLoading(false);
  }, [token]);

  const goTo = async (next: VedicScreen) => {
    if (next === "ready") await saveProfile();
    if (next === "briefing") {
      setScreen("briefing");
      fetchBriefing();
      return;
    }
    setScreen(next);
  };

  const handlePathSelect = (p: VedicPath) => {
    setPath(p);
    setScreen(p === "neutral" ? "birth" : "sign");
  };

  const backFromSign  = () => setScreen("path");
  const backFromBirth = () => setScreen(path === "neutral" ? "path" : "sign");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: sans, position: "relative", overflowX: "hidden" }}>
      {/* Star field */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {stars.map(s => (
          <div key={s.id} style={{ position: "absolute", borderRadius: "50%", background: "white", left: s.left, top: s.top, width: s.size, height: s.size, animation: `vl-twinkle ${s.dur} ease-in-out infinite`, animationDelay: s.delay, "--min-op": s.minOp, "--max-op": s.maxOp } as any} />
        ))}
      </div>
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,106,255,0.05) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div key={screen} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }} style={{ minHeight: "100vh" }}>

            {screen === "path" && <PathSelectionScreen onSelect={handlePathSelect} />}

            {screen === "sign" && path === "western" && (
              <WesternSignScreen
                selected={selectedWestern} onSelect={setSelectedWestern}
                selectedRashi={selectedRashi} onSelectRashi={setSelectedRashi}
                onBack={backFromSign} onContinue={() => setScreen("birth")} />
            )}
            {screen === "sign" && path === "vedic" && (
              <VedicRashiScreen
                selected={selectedRashi} onSelect={setSelectedRashi}
                onBack={backFromSign} onContinue={() => setScreen("birth")} />
            )}

            {screen === "birth" && (
              <BirthScreen
                path={path}
                birthDate={birthDate}       setBirthDate={setBirthDate}
                birthPlace={birthPlace}     setBirthPlace={setBirthPlace}
                birthTimeApprox={birthTimeApprox} setBirthTimeApprox={setBirthTimeApprox}
                birthTimeExact={birthTimeExact}   setBirthTimeExact={setBirthTimeExact}
                onBack={backFromBirth}
                onContinue={() => goTo("ready")}
                onSkip={() => goTo("ready")}
                saving={saving} />
            )}

            {screen === "ready" && (
              <ReadyScreen
                path={path} profile={profile}
                westernSign={selectedWestern} selectedRashi={selectedRashi}
                onBack={() => setScreen("birth")} onContinue={() => goTo("briefing")} />
            )}

            {screen === "briefing" && (
              <BriefingScreen
                briefing={briefing} loading={briefingLoading}
                onHome={() => setLocation("/")} path={path} />
            )}

          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
