import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
import { useUserAuth } from "@/lib/user-auth";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";

const C = {
  bg: "#070710",
  surface: "#0e0e1c",
  card: "#13131f",
  border: "#1e1e2e",
  borderLight: "#282840",
  cyan: "#00cfa8",
  cyanDim: "rgba(0,207,168,0.1)",
  amber: "#f59e0b",
  amberDim: "rgba(245,158,11,0.1)",
  text: "#eeeef4",
  muted: "#6868a0",
  steel: "#404060",
  green: "#22c55e",
  parchment: "#fdf6ec",
  parchmentBorder: "#e4cfa8",
  parchmentText: "#3d2810",
  parchmentMuted: "#7a6048",
  parchmentGold: "#8a6820",
};

const FOCUS_AREAS = [
  { id: "health",       icon: "💪", label: "Health & Fitness" },
  { id: "career",       icon: "💼", label: "Career & Work" },
  { id: "relationships",icon: "💑", label: "Relationships" },
  { id: "finances",     icon: "💰", label: "Finances" },
  { id: "learning",     icon: "📚", label: "Learning & Growth" },
  { id: "business",     icon: "🏢", label: "Business" },
  { id: "mental",       icon: "🧘", label: "Mental Wellbeing" },
  { id: "spirituality", icon: "🙏", label: "Spirituality" },
  { id: "creativity",   icon: "🎨", label: "Creativity" },
  { id: "family",       icon: "👨‍👩‍👧", label: "Family" },
  { id: "direct",       icon: "💬", label: "I'll tell ARYA directly" },
];

const LANGS = LANGUAGE_OPTIONS;

const TOTAL_SCREENS = 8;

function getFutureDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit:  (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
};

// ── Sub-components ───────────────────────────────────────────────────

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 26, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.25 }}>
      {children}
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6, marginBottom: 28 }}>
      {children}
    </div>
  );
}

// ── Screens ──────────────────────────────────────────────────────────

function S0({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh" }}>
      <div className="ob-ring" style={{ width: 80, height: 80, borderRadius: "50%", border: `2px solid rgba(0,207,168,0.35)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, flexShrink: 0 }}>
        <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 28, fontWeight: 700, color: C.cyan }}>✦</div>
      </div>
      <div style={{ fontFamily: "Space Grotesk, sans-serif", fontSize: 40, fontWeight: 700, color: C.text, marginBottom: 8, letterSpacing: "-0.02em" }}>
        ARYA
      </div>
      <div style={{ fontSize: 14, color: C.muted, marginBottom: 6, letterSpacing: "0.04em" }}>
        Your Personal Thinking & Growth Assistant
      </div>
      <div style={{ fontSize: 12, color: C.steel, marginBottom: 44, letterSpacing: "0.06em" }}>
        3 minutes. Then ARYA knows you.
      </div>
      <button
        data-testid="button-onboarding-start"
        onClick={onNext}
        style={{ padding: "14px 44px", borderRadius: 12, border: "none", background: C.cyan, color: C.bg, fontSize: 15, fontWeight: 700 }}
      >
        Get started →
      </button>
    </div>
  );
}

function S1() {
  const cards = [
    { icon: "🧠", title: "Thinks with you", body: "Every response is built from what you share — not generic advice pulled from the internet." },
    { icon: "💭", title: "Remembers context", body: "What you said last week matters next week. ARYA builds a picture of you over time." },
    { icon: "🔒", title: "Completely private", body: "Your data is yours. We never sell it, train on it, or share it. You can delete everything at any time." },
  ];
  return (
    <div>
      <Heading>This is different<br />from other AI.</Heading>
      <Sub>Three things that set ARYA apart — worth knowing before we start.</Sub>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {cards.map(c => (
          <div key={c.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ fontSize: 22, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{c.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function S2({ name, setName, firstName }: { name: string; setName: (v: string) => void; firstName: string }) {
  return (
    <div>
      <Heading>What should<br />ARYA call you?</Heading>
      <Sub>Just your first name is fine. This is how ARYA will speak to you.</Sub>
      <input
        data-testid="input-onboarding-name"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Your name"
        autoFocus
        style={{ width: "100%", background: C.surface, border: `1.5px solid ${name.trim().length >= 2 ? C.cyan : C.border}`, borderRadius: 12, padding: "16px 18px", color: C.text, fontSize: 22, fontFamily: "Space Grotesk, sans-serif", fontWeight: 600, marginBottom: 20, transition: "border-color 0.2s" }}
      />
      <AnimatePresence>
        {firstName.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.3 }}
            style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}
          >
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
              First message from ARYA
            </div>
            <div style={{ fontSize: 16, color: C.text, lineHeight: 1.65 }}>
              Hi <span style={{ color: C.cyan, fontWeight: 600 }}>{firstName}</span> —<br />
              I've been waiting to meet you.
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: C.muted, textAlign: "right" as const }}>
              — ARYA
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function S3({ focusAreas, toggle }: { focusAreas: string[]; toggle: (id: string) => void }) {
  return (
    <div>
      <Heading>What matters<br />most to you?</Heading>
      <Sub>Select all that apply. ARYA will focus there first.</Sub>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {FOCUS_AREAS.map(area => {
          const active = focusAreas.includes(area.id);
          return (
            <button
              key={area.id}
              data-testid={`button-focus-${area.id}`}
              onClick={() => toggle(area.id)}
              style={{ padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${active ? C.cyan : C.border}`, background: active ? C.cyanDim : C.card, color: active ? C.cyan : C.muted, fontSize: 13, fontWeight: active ? 600 : 400, textAlign: "left" as const, display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
            >
              <span style={{ fontSize: 16 }}>{area.icon}</span>
              <span style={{ lineHeight: 1.35 }}>{area.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function S4({ futureLetter, setFutureLetter, firstName }: { futureLetter: string; setFutureLetter: (v: string) => void; firstName: string }) {
  const words = futureLetter.trim() ? futureLetter.trim().split(/\s+/).length : 0;
  const futureDate = getFutureDate();

  return (
    <div>
      <Heading>A letter from<br />your future self.</Heading>
      <Sub>Six months from now, you've grown. Write to yourself from there.</Sub>

      <div style={{ background: C.parchment, border: `1px solid ${C.parchmentBorder}`, borderRadius: 14, padding: "20px", boxShadow: "0 4px 24px rgba(0,0,0,0.35)" }}>
        <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 11, color: C.parchmentGold, letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 14 }}>
          {futureDate}
        </div>
        <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 15, color: C.parchmentText, marginBottom: 14 }}>
          Dear {firstName || "me"},
        </div>
        <textarea
          data-testid="input-future-letter"
          value={futureLetter}
          onChange={e => setFutureLetter(e.target.value)}
          rows={6}
          placeholder={`What did you achieve?\nHow do you feel?\nWhat changed about you?`}
          style={{ width: "100%", background: "transparent", border: "none", color: C.parchmentText, fontSize: 14, fontFamily: "Libre Baskerville, serif", lineHeight: 1.75, resize: "none", boxSizing: "border-box" as const, caretColor: C.parchmentGold }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, borderTop: `1px solid ${C.parchmentBorder}`, paddingTop: 10 }}>
          <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 13, color: C.parchmentMuted, fontStyle: "italic" }}>
            — {firstName || "Me"}, six months later
          </div>
          <div style={{ fontSize: 11, color: C.parchmentMuted }}>
            {words > 0 ? `${words} word${words === 1 ? "" : "s"}` : "Optional"}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: C.steel, textAlign: "center" as const, lineHeight: 1.5 }}>
        ARYA holds this letter and reads it back to you — unexpectedly.
      </div>
    </div>
  );
}

function S5({ accountName, setAccountName, accountPhone, setAccountPhone }: {
  accountName: string; setAccountName: (v: string) => void;
  accountPhone: string; setAccountPhone: (v: string) => void;
}) {
  return (
    <div>
      <Heading>Who holds<br />you accountable?</Heading>
      <Sub>ARYA mentions them quietly — a gentle nudge, not surveillance. Completely optional.</Sub>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: C.muted, letterSpacing: "0.06em", marginBottom: 6 }}>Name</div>
          <input
            data-testid="input-account-name"
            value={accountName}
            onChange={e => setAccountName(e.target.value)}
            placeholder="Their name"
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "13px 16px", color: C.text, fontSize: 14 }}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.muted, letterSpacing: "0.06em", marginBottom: 6 }}>WhatsApp number</div>
          <input
            data-testid="input-account-phone"
            value={accountPhone}
            onChange={e => setAccountPhone(e.target.value)}
            placeholder="+91 98765 43210"
            type="tel"
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "13px 16px", color: C.text, fontSize: 14 }}
          />
        </div>
      </div>
      {accountName.trim().length >= 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ marginTop: 16, background: C.cyanDim, border: `1px solid rgba(0,207,168,0.2)`, borderRadius: 10, padding: "12px 14px", fontSize: 13, color: C.cyan, lineHeight: 1.55 }}
        >
          ARYA will refer to {accountName.trim().split(" ")[0]} occasionally — "Would {accountName.trim().split(" ")[0]} be proud of this decision?"
        </motion.div>
      )}
    </div>
  );
}

function S6({ briefingTime, setBriefingTime, language, setLanguage, weeklyReview, setWeeklyReview }: {
  briefingTime: string; setBriefingTime: (v: string) => void;
  language: string; setLanguage: (v: string) => void;
  weeklyReview: boolean; setWeeklyReview: (v: boolean) => void;
}) {
  return (
    <div>
      <Heading>Make ARYA<br />yours.</Heading>
      <Sub>Set when ARYA greets you each morning, and in what language.</Sub>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: C.muted, letterSpacing: "0.06em", marginBottom: 8, textTransform: "uppercase" as const }}>
          Morning briefing time
        </div>
        <input
          data-testid="input-briefing-time"
          type="time"
          value={briefingTime}
          onChange={e => setBriefingTime(e.target.value)}
          style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "13px 16px", color: C.text, fontSize: 20, fontFamily: "Space Grotesk, sans-serif", fontWeight: 600 }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: C.muted, letterSpacing: "0.06em", marginBottom: 10, textTransform: "uppercase" as const }}>
          Language that feels like home
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {LANGS.map(lang => {
            const active = language === lang.code;
            return (
              <button
                key={lang.code}
                data-testid={`button-lang-${lang.code}`}
                onClick={() => setLanguage(lang.code)}
                style={{ padding: "11px 8px", borderRadius: 10, border: `1.5px solid ${active ? C.cyan : C.border}`, background: active ? C.cyanDim : C.card, color: active ? C.cyan : C.muted, fontSize: 14, fontWeight: active ? 600 : 400, transition: "all 0.15s", lineHeight: 1.3 }}
              >
                <div>{lang.native}</div>
                {lang.code !== "en" && <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{lang.english}</div>}
              </button>
            );
          })}
        </div>
        {!language && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.amber, textAlign: "center" as const }}>
            Pick the language that feels most like home
          </div>
        )}
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Weekly Sunday Review</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>ARYA writes you a personal letter each Sunday</div>
        </div>
        <button
          data-testid="toggle-weekly-review-onboarding"
          onClick={() => setWeeklyReview(!weeklyReview)}
          style={{ width: 44, height: 24, borderRadius: 12, border: "none", background: weeklyReview ? C.cyan : C.border, position: "relative", transition: "background 0.2s", flexShrink: 0 }}
        >
          <div style={{ position: "absolute", top: 2, left: weeklyReview ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.3)", transition: "left 0.2s" }} />
        </button>
      </div>
    </div>
  );
}

function S7({ name, focusAreas, futureLetter, accountName, accountPhone, briefingTime, language, weeklyReview, saving, onBegin }: {
  name: string; focusAreas: string[]; futureLetter: string;
  accountName: string; accountPhone: string; briefingTime: string;
  language: string; weeklyReview: boolean; saving: boolean;
  onBegin: () => void;
}) {
  const langLabel = LANGUAGE_OPTIONS.find(l => l.code === language)?.native || "English";
  const focusLabels = focusAreas.map(id => FOCUS_AREAS.find(f => f.id === id)?.label || id);
  const firstName = name.trim().split(" ")[0];

  const summary = [
    { icon: "✦", label: "Name", value: name.trim() || "—" },
    focusAreas.length > 0 && { icon: "🎯", label: "Focus", value: focusLabels.slice(0, 3).join(", ") + (focusAreas.length > 3 ? ` +${focusAreas.length - 3}` : "") },
    futureLetter.trim() && { icon: "💌", label: "Future letter", value: "Written — ARYA will hold it" },
    accountName.trim() && { icon: "🤝", label: "Accountability", value: accountName.trim() + (accountPhone.trim() ? ` · ${accountPhone.trim().slice(0, 8)}…` : "") },
    { icon: "🌅", label: "Briefing", value: `${briefingTime} in ${langLabel}` },
    weeklyReview && { icon: "📋", label: "Sunday Review", value: "On" },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  return (
    <div>
      <Heading>ARYA is ready<br />for you, {firstName || "friend"}.</Heading>
      <Sub>Here's what you've built together — your companion knows you now.</Sub>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "6px 4px", marginBottom: 28, overflow: "hidden" }}>
        {summary.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.25 }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: i < summary.length - 1 ? `1px solid ${C.border}` : "none" }}
          >
            <span style={{ fontSize: 16, width: 22, textAlign: "center" as const, flexShrink: 0 }}>{item.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.steel, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>{item.label}</div>
              <div style={{ fontSize: 13, color: C.text, marginTop: 1 }}>{item.value}</div>
            </div>
            <Check size={13} color={C.cyan} strokeWidth={2.5} />
          </motion.div>
        ))}
      </div>

      <motion.button
        data-testid="button-begin-journey"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: summary.length * 0.08 + 0.1, duration: 0.3 }}
        onClick={onBegin}
        disabled={saving}
        style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: saving ? C.border : `linear-gradient(135deg, #f59e0b, #d97706)`, color: saving ? C.steel : "#1a0e00", fontSize: 16, fontWeight: 700, fontFamily: "Space Grotesk, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        {saving ? <><Loader2 size={16} className="ob-spin" /> Setting up ARYA…</> : "Begin my journey →"}
      </motion.button>

      <div style={{ marginTop: 14, textAlign: "center" as const, fontSize: 12, color: C.steel }}>
        You can change any of this in settings later.
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────

interface Props { onComplete: () => Promise<void>; }

export default function OnboardingFlow({ onComplete }: Props) {
  const { user, token } = useUserAuth();
  const [screen, setScreen] = useState(0);
  const [dir, setDir] = useState(1);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(user?.name || "");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [futureLetter, setFutureLetter] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountPhone, setAccountPhone] = useState("");
  const [briefingTime, setBriefingTime] = useState("07:00");
  const [language, setLanguage] = useState("");
  const [weeklyReview, setWeeklyReview] = useState(true);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  useEffect(() => { if (user?.name && !name) setName(user.name); }, [user]);

  const go = (target: number) => {
    setDir(target > screen ? 1 : -1);
    setScreen(target);
  };
  const next = () => go(screen + 1);
  const back = () => go(screen - 1);
  const toggleFocus = (id: string) => setFocusAreas(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const firstName = name.trim().split(" ")[0];

  const canNext = [
    true,
    true,
    name.trim().length >= 2,
    focusAreas.length > 0,
    true,
    true,
    language !== "",
    true,
  ][screen] ?? true;

  const handleComplete = async () => {
    if (!token || saving) return;
    setSaving(true);
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          focusAreas,
          futureLetter: futureLetter.trim(),
          accountName: accountName.trim(),
          accountPhone: accountPhone.trim(),
          morningBriefingEnabled: true,
          morningBriefingTime: briefingTime,
          uiLanguage: language,
          weeklyReviewEnabled: weeklyReview,
          preferredLanguage: language,
          wantsDailyReminder: true,
          voiceEnabled: true,
        }),
      });
      await onComplete();
    } catch {
      setSaving(false);
    }
  };

  const showProgress = screen > 0;
  const progressFill = screen > 0 ? screen - 1 : 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: C.bg, zIndex: 9999, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <style>{`
        @keyframes ob-breathe {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,207,168,0.06), 0 0 0 0 rgba(0,207,168,0.03); }
          50% { transform: scale(1.1); box-shadow: 0 0 0 20px rgba(0,207,168,0.07), 0 0 0 44px rgba(0,207,168,0.02); }
        }
        .ob-ring { animation: ob-breathe 3.2s ease-in-out infinite; }
        @keyframes ob-spin { to { transform: rotate(360deg); } }
        .ob-spin { animation: ob-spin 0.8s linear infinite; }
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        textarea:focus, input:focus { outline: none; }
        button { font-family: Inter, sans-serif; cursor: pointer; }
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
      `}</style>

      {/* Progress header */}
      {showProgress && (
        <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {screen > 1 && (
            <button
              data-testid="button-onboarding-back"
              onClick={back}
              style={{ width: 34, height: 34, borderRadius: "50%", border: `1px solid ${C.border}`, background: "transparent", color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {screen === 1 && <div style={{ width: 34, flexShrink: 0 }} />}
          <div style={{ flex: 1, display: "flex", gap: 4, alignItems: "center" }}>
            {Array.from({ length: TOTAL_SCREENS - 1 }, (_, i) => (
              <div
                key={i}
                style={{ flex: 1, height: 3, borderRadius: 2, background: i < progressFill ? C.cyan : i === progressFill ? `linear-gradient(90deg, ${C.cyan}, rgba(0,207,168,0.4))` : C.border, transition: "all 0.3s" }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Screen content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <AnimatePresence custom={dir} mode="wait">
          <motion.div
            key={screen}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ position: "absolute", inset: 0, overflowY: "auto" }}
          >
            <div style={{ padding: screen === 0 ? "0 24px" : "28px 24px 24px", maxWidth: 460, margin: "0 auto", width: "100%", minHeight: "100%", display: "flex", flexDirection: "column", justifyContent: screen === 0 ? "center" : "flex-start" }}>
              {screen === 0 && <S0 onNext={next} />}
              {screen === 1 && <S1 />}
              {screen === 2 && <S2 name={name} setName={setName} firstName={firstName} />}
              {screen === 3 && <S3 focusAreas={focusAreas} toggle={toggleFocus} />}
              {screen === 4 && <S4 futureLetter={futureLetter} setFutureLetter={setFutureLetter} firstName={firstName} />}
              {screen === 5 && <S5 accountName={accountName} setAccountName={setAccountName} accountPhone={accountPhone} setAccountPhone={setAccountPhone} />}
              {screen === 6 && <S6 briefingTime={briefingTime} setBriefingTime={setBriefingTime} language={language} setLanguage={setLanguage} weeklyReview={weeklyReview} setWeeklyReview={setWeeklyReview} />}
              {screen === 7 && (
                <S7
                  name={name} focusAreas={focusAreas} futureLetter={futureLetter}
                  accountName={accountName} accountPhone={accountPhone}
                  briefingTime={briefingTime} language={language}
                  weeklyReview={weeklyReview} saving={saving} onBegin={handleComplete}
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom nav (screens 1–6) */}
      {screen > 0 && screen < 7 && (
        <div style={{ padding: "12px 24px 36px", maxWidth: 460, margin: "0 auto", width: "100%", flexShrink: 0 }}>
          <button
            data-testid="button-onboarding-next"
            onClick={next}
            disabled={!canNext}
            style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: canNext ? C.cyan : C.border, color: canNext ? C.bg : C.steel, fontSize: 15, fontWeight: 700, transition: "all 0.18s" }}
          >
            Continue →
          </button>
          {screen === 5 && (
            <button
              data-testid="button-onboarding-skip"
              onClick={next}
              style={{ marginTop: 10, width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "transparent", color: C.muted, fontSize: 13 }}
            >
              Skip for now
            </button>
          )}
        </div>
      )}
    </div>
  );
}
