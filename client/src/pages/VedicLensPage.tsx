import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUserAuth } from "@/lib/user-auth";
import { ArrowLeft, Loader2, ChevronRight, Home } from "lucide-react";

// ── Colors ─────────────────────────────────────────────────────────────────
const C = {
  bg: "#0d0b0f", surface: "#16121e", surface2: "#1e1928",
  border: "#2a2438", border2: "#352d48",
  indigo: "#7c6aff", indigoDim: "#4a3fa0",
  saffron: "#f5a623", saffronDim: "#a06a10",
  rose: "#e87070", teal: "#5ecfb0",
  text: "#ede8f5", textDim: "#8a80a0", textMuted: "#3d3550",
};

const serif = "'Libre Baskerville', Georgia, serif";
const sans = "'Nunito', 'Inter', sans-serif";

// ── Types ───────────────────────────────────────────────────────────────────
type VedicScreen = "intro" | "rashi" | "birth" | "ready" | "briefing";
interface VedicBriefing {
  userName: string;
  planetaryPills: Array<{ emoji: string; text: string; tone: "good" | "caution" | "watch" }>;
  aryaInsight: string;
  muhurat: { startTime: string; endTime: string; purpose: string };
  cosmicCards: Array<{ tone: "good" | "caution" | "watch"; label: string; text: string; source: string }>;
  guidance: { money: string; relationships: string; body: string };
  dasha: { lord: string; yearsLeft: number; chapterText: string };
}
interface KundliProfile { rashi: string; nakshatra: string; dashaLord: string; dashaYearsLeft: string }

// ── Data ────────────────────────────────────────────────────────────────────
const RASHIS = [
  { symbol: "♈", name: "Mesh", english: "Aries" },
  { symbol: "♉", name: "Vrishabh", english: "Taurus" },
  { symbol: "♊", name: "Mithun", english: "Gemini" },
  { symbol: "♋", name: "Kark", english: "Cancer" },
  { symbol: "♌", name: "Simha", english: "Leo" },
  { symbol: "♍", name: "Kanya", english: "Virgo" },
  { symbol: "♎", name: "Tula", english: "Libra" },
  { symbol: "♏", name: "Vrishchik", english: "Scorpio" },
  { symbol: "♐", name: "Dhanu", english: "Sagittarius" },
  { symbol: "♑", name: "Makar", english: "Capricorn" },
  { symbol: "♒", name: "Kumbh", english: "Aquarius" },
  { symbol: "♓", name: "Meen", english: "Pisces" },
];
const TIME_CHIPS = [
  { key: "morning", emoji: "🌅", label: "Morning" },
  { key: "afternoon", emoji: "☀️", label: "Afternoon" },
  { key: "evening", emoji: "🌆", label: "Evening" },
  { key: "night", emoji: "🌙", label: "Night" },
];
const PREVIEW_CARDS = [
  { emoji: "🌅", bg: C.saffron, label: "Morning Cosmic Briefing", desc: "What the day holds for you — in plain language. Not \"Mercury is combust.\" Just \"double-check what you send today.\"" },
  { emoji: "⏰", bg: C.indigo, label: "Auspicious Timing", desc: "The best window today for starting something new, having an important conversation, or making a decision." },
  { emoji: "🔮", bg: C.teal, label: "Your Personal Dasha", desc: "The bigger chapter your life is in right now — and what that means for your energy, decisions and growth." },
  { emoji: "💡", bg: C.rose, label: "Blended with Your Life", desc: "ARYA connects cosmic context with what's actually happening in your life — your goals, your mood, your week." },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
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

// ── Sub-components ──────────────────────────────────────────────────────────
function ProgDots({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "0 0 24px" }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          height: 6,
          width: i === step ? 20 : 6,
          borderRadius: 3,
          background: i < step ? C.indigoDim : i === step ? C.indigo : C.border2,
          transition: "all 0.3s",
        }} />
      ))}
    </div>
  );
}

function NavBar({ onBack, step, onSkip, skipLabel }: { onBack?: () => void; step: number; onSkip?: () => void; skipLabel?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" }}>
      <div style={{ cursor: "pointer", color: C.textDim, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
        onClick={onBack}>
        {onBack ? "← Back" : <span style={{ width: 60 }} />}
      </div>
      <div style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: C.indigo, background: "rgba(124,106,255,0.1)", border: `1px solid rgba(124,106,255,0.2)`, padding: "4px 12px", borderRadius: 20 }}>
        ✦ Vedic Lens
      </div>
      {onSkip
        ? <div style={{ fontSize: 13, color: C.textMuted, cursor: "pointer" }} onClick={onSkip}>{skipLabel || "Skip"}</div>
        : <div style={{ width: 60 }} />
      }
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, style: s }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "saffron" | "ghost"; disabled?: boolean; style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    width: "100%", padding: "16px", borderRadius: 14, border: "none",
    fontFamily: sans, fontSize: 15, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
    letterSpacing: "0.01em", transition: "all 0.2s", opacity: disabled ? 0.5 : 1, ...s,
  };
  if (variant === "primary") return (
    <button style={{ ...base, background: `linear-gradient(135deg, ${C.indigo} 0%, #9b6aff 100%)`, color: "white", boxShadow: `0 4px 20px rgba(124,106,255,0.3)` }} onClick={onClick} disabled={disabled}>{children}</button>
  );
  if (variant === "saffron") return (
    <button style={{ ...base, background: `linear-gradient(135deg, ${C.saffron} 0%, #f5c842 100%)`, color: "#1a1200", boxShadow: `0 4px 20px rgba(245,166,35,0.3)` }} onClick={onClick} disabled={disabled}>{children}</button>
  );
  return (
    <button style={{ ...base, background: "transparent", color: C.textDim, border: `1px solid ${C.border}`, marginTop: 10 }} onClick={onClick} disabled={disabled}>{children}</button>
  );
}

// ── Screen 1: Intro ──────────────────────────────────────────────────────────
function IntroScreen({ onBegin, onSkip }: { onBegin: () => void; onSkip: () => void }) {
  return (
    <>
      <NavBar step={0} onSkip={onSkip} skipLabel="Skip for now →" />
      <ProgDots step={0} />
      <div style={{ padding: "8px 24px 40px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 90, height: 90, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,166,35,0.15), rgba(124,106,255,0.08))",
            border: `1px solid rgba(245,166,35,0.2)`, fontSize: 42,
            animation: "vl-pulse 4s ease-in-out infinite",
          }}>🪐</div>
        </div>
        <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.saffronDim, textAlign: "center", marginBottom: 10 }}>Ancient Wisdom · Modern Life</p>
        <h1 style={{ fontFamily: serif, fontSize: 30, fontWeight: 400, lineHeight: 1.25, color: C.text, textAlign: "center", marginBottom: 10 }}>
          Meet your<br /><em style={{ color: C.saffron }}>Vedic Lens</em>
        </h1>
        <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75, textAlign: "center", marginBottom: 28 }}>
          India's oldest wisdom tradition — Jyotish — translated into plain, practical guidance for your everyday life. No jargon. No fear. Just clarity.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {PREVIEW_CARDS.map((card, i) => (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, background: `${card.bg}18`, border: `1px solid ${card.bg}28` }}>
                {card.emoji}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 3, fontFamily: sans }}>{card.label}</div>
                <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>{card.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "rgba(124,106,255,0.04)", border: `1px solid rgba(124,106,255,0.12)`, borderRadius: 12, padding: "14px 16px", fontSize: 12, color: C.textDim, lineHeight: 1.7, display: "flex", gap: 10, marginBottom: 24 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🙏</span>
          <span>Vedic Lens offers perspective and reflection — not prediction. Think of it as a wise elder's view, not a fortune teller's. You always decide.</span>
        </div>
        <Btn variant="saffron" onClick={onBegin}>Begin setup</Btn>
        <Btn variant="ghost" onClick={onSkip}>Skip — show me the briefing</Btn>
      </div>
    </>
  );
}

// ── Screen 2: Rashi ──────────────────────────────────────────────────────────
function RashiScreen({ selected, onSelect, onBack, onContinue }: { selected: string; onSelect: (r: string) => void; onBack: () => void; onContinue: () => void }) {
  return (
    <>
      <NavBar onBack={onBack} step={1} onSkip={onContinue} />
      <ProgDots step={1} />
      <div style={{ padding: "8px 24px 40px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.saffronDim, marginBottom: 10 }}>Step 1 of 3</p>
        <h1 style={{ fontFamily: serif, fontSize: 30, fontWeight: 400, lineHeight: 1.25, color: C.text, marginBottom: 10 }}>
          What is your<br /><em style={{ color: C.saffron }}>Rashi?</em>
        </h1>
        <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75, marginBottom: 24 }}>
          Your Moon sign in Vedic astrology. If you don't know it — no problem, enter your birth details next and ARYA will calculate it.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 24 }}>
          {RASHIS.map(r => (
            <div key={r.name}
              data-testid={`button-rashi-${r.name.toLowerCase()}`}
              onClick={() => onSelect(r.name)}
              style={{
                background: selected === r.name ? "rgba(124,106,255,0.1)" : C.surface,
                border: `1px solid ${selected === r.name ? C.indigo : C.border}`,
                borderRadius: 14, padding: "12px 8px", textAlign: "center", cursor: "pointer",
                transition: "all 0.2s", position: "relative",
              }}>
              {selected === r.name && <span style={{ position: "absolute", top: 4, right: 6, fontSize: 9, color: C.indigo }}>✓</span>}
              <div style={{ fontSize: 22, marginBottom: 4 }}>{r.symbol}</div>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: "0.05em" }}>{r.name}</div>
              <div style={{ fontSize: 9, color: C.textMuted, marginTop: 2 }}>{r.english}</div>
            </div>
          ))}
        </div>
        <Btn variant="primary" onClick={onContinue}>Continue →</Btn>
        <Btn variant="ghost" onClick={onContinue}>I don't know my Rashi</Btn>
      </div>
    </>
  );
}

// ── Screen 3: Birth Details ───────────────────────────────────────────────────
function BirthScreen({ birthDate, setBirthDate, birthPlace, setBirthPlace, birthTimeApprox, setBirthTimeApprox, birthTimeExact, setBirthTimeExact, onBack, onContinue, onSkip, saving }: {
  birthDate: string; setBirthDate: (v: string) => void;
  birthPlace: string; setBirthPlace: (v: string) => void;
  birthTimeApprox: string; setBirthTimeApprox: (v: string) => void;
  birthTimeExact: string; setBirthTimeExact: (v: string) => void;
  onBack: () => void; onContinue: () => void; onSkip: () => void; saving: boolean;
}) {
  const inputStyle: React.CSSProperties = {
    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
    padding: "14px 16px", color: C.text, fontFamily: sans, fontSize: 14,
    outline: "none", width: "100%", colorScheme: "dark",
  };
  return (
    <>
      <NavBar onBack={onBack} step={2} onSkip={onSkip} />
      <ProgDots step={2} />
      <div style={{ padding: "8px 24px 40px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.saffronDim, marginBottom: 10 }}>Step 2 of 3</p>
        <h1 style={{ fontFamily: serif, fontSize: 30, fontWeight: 400, lineHeight: 1.25, color: C.text, marginBottom: 10 }}>
          Your birth<br /><em style={{ color: C.saffron }}>details</em>
        </h1>
        <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75, marginBottom: 24 }}>
          This lets ARYA calculate your personal Kundli — your exact cosmic fingerprint. More accurate than any generic horoscope.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted, marginBottom: 6 }}>Date of birth</div>
            <input data-testid="input-birth-date" type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted, marginBottom: 6 }}>Place of birth</div>
            <input data-testid="input-birth-place" type="text" value={birthPlace} onChange={e => setBirthPlace(e.target.value)} placeholder="e.g. Chennai, Tamil Nadu" style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: C.textMuted, marginBottom: 8 }}>Time of birth — even approximate is fine</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 10 }}>
              {TIME_CHIPS.map(chip => (
                <div key={chip.key} data-testid={`button-time-${chip.key}`}
                  onClick={() => setBirthTimeApprox(birthTimeApprox === chip.key ? "" : chip.key)}
                  style={{
                    background: birthTimeApprox === chip.key ? "rgba(245,166,35,0.08)" : C.surface,
                    border: `1px solid ${birthTimeApprox === chip.key ? C.saffron : C.border}`,
                    borderRadius: 10, padding: "10px 6px", textAlign: "center", cursor: "pointer",
                    fontSize: 11, color: birthTimeApprox === chip.key ? C.text : C.textDim,
                  }}>
                  <span style={{ fontSize: 18, display: "block", marginBottom: 4 }}>{chip.emoji}</span>
                  {chip.label}
                </div>
              ))}
            </div>
            <input type="time" value={birthTimeExact} onChange={e => setBirthTimeExact(e.target.value)}
              placeholder="Exact time if known" style={{ ...inputStyle, marginTop: 0 }} />
          </div>
        </div>
        <div style={{ background: "rgba(124,106,255,0.04)", border: `1px solid rgba(124,106,255,0.12)`, borderRadius: 12, padding: "14px 16px", fontSize: 12, color: C.textDim, lineHeight: 1.7, display: "flex", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
          <span>Your birth details are stored privately on your account and used solely to generate your Kundli. They are never shared. You can delete them anytime via Privacy & Control.</span>
        </div>
        <Btn variant="primary" onClick={onContinue} disabled={saving}>
          {saving ? "Calculating…" : "Calculate my Kundli →"}
        </Btn>
        <Btn variant="ghost" onClick={onSkip} disabled={saving}>Skip — use just my Rashi</Btn>
      </div>
    </>
  );
}

// ── Screen 4: Kundli Ready ────────────────────────────────────────────────────
function ReadyScreen({ profile, selectedRashi, onBack, onContinue }: { profile: KundliProfile | null; selectedRashi: string; onBack: () => void; onContinue: () => void }) {
  const rashi = profile?.rashi || selectedRashi || "—";
  const rashiSymbol = RASHIS.find(r => r.name === rashi)?.symbol || "✦";
  const nakshatra = profile?.nakshatra || "—";
  const dashaLord = profile?.dashaLord || "—";
  const dashaYearsLeft = profile?.dashaYearsLeft || "—";
  return (
    <>
      <NavBar onBack={onBack} step={3} />
      <ProgDots step={3} />
      <div style={{ padding: "8px 24px 40px", maxWidth: 460, margin: "0 auto", width: "100%", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180, delay: 0.1 }}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(245,166,35,0.15), rgba(124,106,255,0.08))", border: `1px solid rgba(245,166,35,0.2)`, fontSize: 48, marginBottom: 24 }}>
          ✨
        </motion.div>
        <p style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: C.saffronDim, marginBottom: 8 }}>Your Kundli is ready</p>
        <h1 style={{ fontFamily: serif, fontSize: 30, fontWeight: 400, lineHeight: 1.25, color: C.text, marginBottom: 10 }}>
          Vedic Lens<br /><em style={{ color: C.saffron }}>is active.</em>
        </h1>
        <p style={{ fontSize: 14, color: C.textDim, lineHeight: 1.75, maxWidth: 300, marginBottom: 28 }}>
          Every morning briefing now includes your personal cosmic context — in plain, simple language. No jargon ever.
        </p>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18, width: "100%", maxWidth: 320, textAlign: "left", marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Your cosmic profile</div>
          {[
            ["Rashi (Moon sign)", `${rashi} ${rashiSymbol}`, C.saffron],
            ["Current Dasha", `${dashaLord} · ${dashaYearsLeft} yrs left`, C.text],
            ["Nakshatra", nakshatra, C.text],
            ["Source", "Brihat Parashara Hora Shastra", C.textDim],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
              <span style={{ color: C.textDim }}>{label}</span>
              <span style={{ color: color as string }}>{value}</span>
            </div>
          ))}
        </div>
        <Btn variant="saffron" onClick={onContinue} style={{ maxWidth: 320 }}>See today's briefing →</Btn>
      </div>
    </>
  );
}

// ── Screen 5: Morning Briefing ────────────────────────────────────────────────
function BriefingScreen({ briefing, loading, onHome, selectedRashi }: { briefing: VedicBriefing | null; loading: boolean; onHome: () => void; selectedRashi: string }) {
  const { data: goalsData } = useQuery<any[]>({
    queryKey: ["/api/arya/goals"],
    queryFn: async () => {
      const res = await fetch("/api/arya/goals");
      return res.ok ? res.json() : [];
    },
  });
  const [doneGoals, setDoneGoals] = useState<Set<number>>(new Set());
  const toneColors = {
    good: { bg: "rgba(94,207,176,0.06)", border: "rgba(94,207,176,0.15)", bar: C.teal, label: C.teal },
    caution: { bg: "rgba(245,166,35,0.06)", border: "rgba(245,166,35,0.15)", bar: C.saffron, label: C.saffron },
    watch: { bg: "rgba(232,112,112,0.06)", border: "rgba(232,112,112,0.15)", bar: C.rose, label: C.rose },
  };
  const pillStyle = (tone: string) => ({
    display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
    whiteSpace: "nowrap" as const, fontSize: 12, flexShrink: 0,
    ...({
      good: { border: `1px solid rgba(94,207,176,0.3)`, color: C.teal, background: "rgba(94,207,176,0.06)" },
      caution: { border: `1px solid rgba(245,166,35,0.3)`, color: C.saffron, background: "rgba(245,166,35,0.06)" },
      watch: { border: `1px solid rgba(232,112,112,0.3)`, color: C.rose, background: "rgba(232,112,112,0.06)" },
    } as any)[tone],
  });

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <div style={{ fontSize: 32, animation: "vl-pulse 2s ease-in-out infinite" }}>🪐</div>
      <p style={{ color: C.textDim, fontSize: 14 }}>Consulting the stars…</p>
    </div>
  );

  const b = briefing;
  if (!b) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
      <div style={{ fontSize: 40 }}>🌙</div>
      <div style={{ fontFamily: serif, fontSize: 18, color: C.text, textAlign: "center" }}>The stars are quiet right now</div>
      <div style={{ fontSize: 13, color: C.textDim, textAlign: "center", maxWidth: 260 }}>We couldn't fetch today's briefing. Please check your connection and try again.</div>
      <button onClick={onHome} style={{ marginTop: 8, padding: "10px 24px", borderRadius: 24, border: `1px solid ${C.border2}`, background: "transparent", color: C.textDim, fontSize: 13, cursor: "pointer" }}>← Back</button>
    </div>
  );

  const activeGoals = (goalsData || []).filter((g: any) => g.isActive).slice(0, 4);

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(180deg, rgba(245,166,35,0.08) 0%, transparent 100%)", borderBottom: `1px solid ${C.border}`, padding: "24px 24px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.08em" }}>{todayStr()}</div>
          <div style={{ fontSize: 20 }}>🌤️</div>
        </div>
        <div style={{ fontFamily: serif, fontSize: 22, color: C.text, marginBottom: 4 }}>
          {greetingTime()}, <em style={{ color: C.saffron }}>{b.userName}.</em>
        </div>
        <div style={{ fontSize: 13, color: C.textDim, marginBottom: 16 }}>Here's what today looks like — for you, specifically.</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
          {b.planetaryPills.map((p, i) => (
            <div key={i} style={pillStyle(p.tone)}><span>{p.emoji}</span><span>{p.text}</span></div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "0 24px 80px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <div style={{ height: 20 }} />

        {/* ARYA blended insight */}
        <div style={{ background: "rgba(124,106,255,0.06)", border: `1px solid rgba(124,106,255,0.15)`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #7c6aff, #9b6aff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>A</div>
            <div style={{ fontSize: 11, color: C.indigo, letterSpacing: "0.08em" }}>ARYA · Blended Insight</div>
          </div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.75 }}
            dangerouslySetInnerHTML={{ __html: b.aryaInsight.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${C.saffron}">$1</strong>`) }} />
        </div>

        {/* Muhurat */}
        <div style={{ background: "linear-gradient(135deg, rgba(245,166,35,0.08), rgba(124,106,255,0.08))", border: `1px solid rgba(245,166,35,0.2)`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>⏰</span>
            <div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>Best window today</div>
              <div style={{ fontSize: 16, color: C.saffron, fontWeight: 600, letterSpacing: "0.05em" }}>{b.muhurat.startTime} – {b.muhurat.endTime}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.textDim, textAlign: "right" }}>For {b.muhurat.purpose}</div>
        </div>

        {/* Cosmic Guidance */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 18 }}>🪐</span>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: C.textMuted, fontWeight: 600 }}>Today's Cosmic Guidance</div>
            <div style={{ marginLeft: "auto", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "3px 8px", borderRadius: 10, color: C.saffron, background: "rgba(245,166,35,0.08)", border: `1px solid rgba(245,166,35,0.2)` }}>Vedic Lens</div>
          </div>
          <div style={{ padding: 16 }}>
            {b.cosmicCards.map((card, i) => {
              const tc = toneColors[card.tone];
              return (
                <div key={i} style={{ borderRadius: 12, padding: 16, marginBottom: 10, position: "relative", overflow: "hidden", background: tc.bg, border: `1px solid ${tc.border}` }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderRadius: "3px 0 0 3px", background: tc.bar }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 14 }}>{card.tone === "good" ? "✦" : "◈"}</span>
                    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: tc.label }}>{card.label}</div>
                  </div>
                  <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, fontStyle: "italic", fontFamily: serif, fontWeight: 400 }}>{card.text}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 8 }}>{card.source}</div>
                </div>
              );
            })}
            {/* Guidance rows */}
            {[
              { emoji: "💰", label: "Money & finances", text: b.guidance.money },
              { emoji: "❤️", label: "Relationships", text: b.guidance.relationships },
              { emoji: "🏃", label: "Body & energy", text: b.guidance.body },
            ].map((row, i, arr) => (
              <div key={row.label} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{row.emoji}</span>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3, letterSpacing: "0.05em" }}>{row.label}</div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{row.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Goals Today */}
        {activeGoals.length > 0 && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 18 }}>🎯</span>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: C.textMuted, fontWeight: 600 }}>Your Focus Today</div>
              <div style={{ marginLeft: "auto", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "3px 8px", borderRadius: 10, color: C.indigo, background: "rgba(124,106,255,0.08)", border: `1px solid rgba(124,106,255,0.2)` }}>Personal</div>
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
                    {g.streak > 0 && <div style={{ fontSize: 11, color: C.saffron, display: "flex", alignItems: "center", gap: 3 }}>🔥 {g.streak}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dasha period */}
        <div style={{ background: "rgba(124,106,255,0.04)", border: `1px solid rgba(124,106,255,0.12)`, borderRadius: 14, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>🌊</span>
            <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: C.textMuted, fontWeight: 600 }}>Your Current Chapter</div>
          </div>
          <div style={{ fontSize: 13, color: C.textDim, marginBottom: 6 }}>
            <span style={{ color: C.indigo, fontWeight: 600 }}>{b.dasha.lord} Dasha</span> · {b.dasha.yearsLeft} years remaining
          </div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.75 }}>{b.dasha.chapterText}</div>
        </div>

        <div style={{ height: 20 }} />

        {/* Back home */}
        <button onClick={onHome}
          style={{ width: "100%", padding: "14px 16px", borderRadius: 14, background: "transparent", border: `1px solid ${C.border}`, color: C.textDim, fontFamily: sans, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Home size={16} /> Back to ARYA
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VedicLensPage() {
  const [, setLocation] = useLocation();
  const { token, user, isLoggedIn } = useUserAuth();

  const [screen, setScreen] = useState<VedicScreen>("intro");
  const [selectedRashi, setSelectedRashi] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthTimeApprox, setBirthTimeApprox] = useState("");
  const [birthTimeExact, setBirthTimeExact] = useState("");
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<KundliProfile | null>(null);
  const [briefing, setBriefing] = useState<VedicBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(false);

  // Inject Libre Baskerville font
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Nunito:wght@300;400;500;600&display=swap";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `@keyframes vl-pulse{0%,100%{box-shadow:0 0 30px rgba(245,166,35,0.1),inset 0 0 20px rgba(124,106,255,0.05)}50%{box-shadow:0 0 50px rgba(245,166,35,0.2),inset 0 0 30px rgba(124,106,255,0.1)}}@keyframes vl-twinkle{0%,100%{opacity:var(--min-op,0.1)}50%{opacity:var(--max-op,0.5)}}`;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(link); document.head.removeChild(style); } catch {} };
  }, []);

  // Generate deterministic stars
  const stars = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: `${(i * 17 + 7) % 100}%`,
    top: `${(i * 23 + 11) % 100}%`,
    size: i % 3 === 0 ? 1.5 : 1,
    dur: `${2 + (i % 4)}s`,
    delay: `${-(i % 5) * 0.8}s`,
    minOp: 0.05,
    maxOp: 0.15 + (i % 3) * 0.12,
  })), []);

  const saveProfile = useCallback(async () => {
    if (!token || !isLoggedIn) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/vedic-lens", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({ rashi: selectedRashi, birthDate, birthPlace, birthTimeApprox, birthTimeExact }),
      });
      const data = await res.json();
      if (res.ok && data.profile) setProfile(data.profile);
    } catch { }
    setSaving(false);
  }, [token, isLoggedIn, selectedRashi, birthDate, birthPlace, birthTimeApprox, birthTimeExact]);

  const fetchBriefing = useCallback(async () => {
    setBriefingLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers["x-user-token"] = token;
      const res = await fetch("/api/user/vedic-briefing", { headers });
      if (res.ok) setBriefing(await res.json());
    } catch { }
    setBriefingLoading(false);
  }, [token]);

  const goTo = async (next: VedicScreen) => {
    if (next === "ready") await saveProfile();
    if (next === "briefing") await fetchBriefing();
    setScreen(next);
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: sans, position: "relative", overflowX: "hidden" }}>
      {/* Star field */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {stars.map(s => (
          <div key={s.id} style={{
            position: "absolute", borderRadius: "50%", background: "white",
            left: s.left, top: s.top, width: s.size, height: s.size,
            animation: `vl-twinkle ${s.dur} ease-in-out infinite`,
            animationDelay: s.delay,
            "--min-op": s.minOp, "--max-op": s.maxOp,
          } as any} />
        ))}
      </div>
      {/* Mandala glow */}
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,106,255,0.06) 0%, rgba(245,166,35,0.03) 40%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Screens */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div key={screen}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{ minHeight: "100vh" }}>
            {screen === "intro" && <IntroScreen onBegin={() => setScreen("rashi")} onSkip={() => goTo("briefing")} />}
            {screen === "rashi" && <RashiScreen selected={selectedRashi} onSelect={setSelectedRashi} onBack={() => setScreen("intro")} onContinue={() => setScreen("birth")} />}
            {screen === "birth" && <BirthScreen birthDate={birthDate} setBirthDate={setBirthDate} birthPlace={birthPlace} setBirthPlace={setBirthPlace} birthTimeApprox={birthTimeApprox} setBirthTimeApprox={setBirthTimeApprox} birthTimeExact={birthTimeExact} setBirthTimeExact={setBirthTimeExact} onBack={() => setScreen("rashi")} onContinue={() => goTo("ready")} onSkip={() => goTo("ready")} saving={saving} />}
            {screen === "ready" && <ReadyScreen profile={profile} selectedRashi={selectedRashi} onBack={() => setScreen("birth")} onContinue={() => goTo("briefing")} />}
            {screen === "briefing" && <BriefingScreen briefing={briefing} loading={briefingLoading} onHome={() => setLocation("/")} selectedRashi={selectedRashi} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
