import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Loader2, CheckCircle2, Users, Brain, Scale,
  Microscope, ChevronRight, Sparkles, Settings, Plus, X, Trash2,
} from "lucide-react";
import { useUserAuth } from "@/lib/user-auth";

// ── Palette ──────────────────────────────────────────────────
const N = {
  bg: "#0a0d14",
  surface: "#131926",
  surface2: "#1a2235",
  border: "#1e2d45",
  border2: "#253450",
  gold: "#d4a853",
  goldDim: "#7a5c2a",
  goldFaint: "rgba(212,168,83,0.08)",
  cream: "#f0e8d5",
  steel: "#7080a0",
  muted: "#3a4860",
  text: "#ddd5c5",
  green: "#4a9d7a",
  red: "#c05050",
};

// ── Types ────────────────────────────────────────────────────
type NitiScreen = "intro" | "context" | "focus" | "ready" | "home" | "session";

interface NitiMessage {
  id: number;
  role: "user" | "arya";
  content: string;
  pushQuestion?: string;
  followUps?: string[];
  philosopher?: string;
  source?: string;
}

interface NitiSessionMeta {
  id: number;
  sessionType: string;
  title?: string;
  status: string;
  philosopher?: string;
  createdAt: string;
}

interface Holding {
  id: number;
  name: string;
  assetType?: string;
  quantity?: string;
  avgPrice?: string;
  notes?: string;
}

interface MarketConv {
  topic: string;
  loading: boolean;
  data: { content: string; pushQuestion: string; takeaway: string } | null;
}

// ── Static data ──────────────────────────────────────────────
const PHILOSOPHER_META: Record<string, { name: string; emoji: string; domain: string; text: string; color: string }> = {
  chanakya:      { name: "Chanakya",      emoji: "⚔️",  domain: "Strategy & Competition",  text: "Arthashastra",   color: "#d4a853" },
  vidura:        { name: "Vidura",        emoji: "🏛️",  domain: "Ethics & Trust",           text: "Vidura Niti",    color: "#7c6aff" },
  thiruvalluvar: { name: "Thiruvalluvar", emoji: "📜",  domain: "Resilience & Timing",      text: "Thirukkural",    color: "#5ecfb0" },
  krishna:       { name: "Krishna",       emoji: "🪷",  domain: "Founder Clarity",          text: "Bhagavad Gita",  color: "#e87070" },
  shukra:        { name: "Shukracharya",  emoji: "💎",  domain: "Finance & Structure",      text: "Shukra Niti",    color: "#4a9d7a" },
};

const BUSINESS_TYPES  = ["Startup", "Small Business", "Enterprise", "Freelancer", "Consultant"];
const BUSINESS_STAGES = ["Idea Stage", "Early (< 1 yr)", "Growth (1–3 yrs)", "Scale (3–7 yrs)", "Established (7+ yrs)"];
const BUSINESS_ROLES  = ["Founder", "Co-founder", "CEO / MD", "Manager", "Consultant", "Professional"];
const FOCUS_AREAS     = ["Strategy", "Finance", "Team & People", "Customers", "Competition", "Founder Mindset", "Ethics & Trust", "Execution"];

const SESSION_TYPES = [
  { key: "decision",       Icon: Scale,       label: "Help me decide",       desc: "A decision that's been sitting with you",   philKey: "chanakya" },
  { key: "stress_test",    Icon: Microscope,  label: "Stress-test my plan",  desc: "Push back on what I'm about to do",         philKey: "chanakya" },
  { key: "people",         Icon: Users,       label: "People situation",     desc: "Team, hiring, trust, or conflict",           philKey: "vidura"   },
  { key: "think_out_loud", Icon: Brain,       label: "Think out loud",       desc: "I need to think — and be challenged",        philKey: "krishna"  },
];

const THINK_QUESTIONS = [
  "Should I stop my SIP during this market fall?",
  "My colleague says I should try F&O trading",
  "I'm down 23% on my portfolio — should I exit now?",
  "Buy a house now, or keep investing in markets?",
];

const ONBOARDING: NitiScreen[] = ["intro", "context", "focus", "ready"];

// ── Sparkline SVG ─────────────────────────────────────────────
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;
  const w = 56, h = 22;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - ((v - min) / range) * (h - 2) - 1,
  ] as [number, number]);
  const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
      <path d={d} fill="none" stroke={positive ? N.green : N.red} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Shared tiny components ───────────────────────────────────
function ProgDots({ screen }: { screen: NitiScreen }) {
  const idx = ONBOARDING.indexOf(screen);
  if (idx < 0) return null;
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", padding: "8px 0 4px" }}>
      {ONBOARDING.map((_, i) => (
        <div key={i} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 3, background: i === idx ? N.gold : N.muted, transition: "all 0.3s" }} />
      ))}
    </div>
  );
}

function GoldBtn({ label, onClick, disabled, loading }: { label: string; onClick: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} data-testid={`btn-niti-${label.replace(/\s+/g, "-").toLowerCase()}`}
      style={{ width: "100%", padding: "14px 20px", borderRadius: 12, border: "none", background: disabled || loading ? N.muted : `linear-gradient(135deg, ${N.gold}, #b8892a)`, color: "#0a0d14", fontWeight: 700, fontSize: 14, letterSpacing: "0.04em", cursor: disabled || loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s", fontFamily: "Inter, sans-serif" }}>
      {loading && <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />}
      {label}
    </button>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "14px 16px", borderRadius: 12, border: `1px solid ${N.border2}`, background: "transparent", color: N.steel, cursor: "pointer", display: "flex", alignItems: "center" }}>
      <ArrowLeft size={15} />
    </button>
  );
}

function ChipSelector({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} data-testid={`chip-${o.replace(/\s+/g, "-").toLowerCase()}`}
          style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${value === o ? N.gold : N.border2}`, background: value === o ? N.goldFaint : "transparent", color: value === o ? N.gold : N.steel, fontSize: 13, cursor: "pointer", transition: "all 0.2s", fontFamily: "Inter, sans-serif" }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <div style={{ fontSize: 11, letterSpacing: "0.1em", color: N.steel, textTransform: "uppercase" as const, marginBottom: 10 }}>{text}</div>;
}

// ── Main page ────────────────────────────────────────────────
export default function NitiPage() {
  const [, setLocation] = useLocation();
  const { token } = useUserAuth();

  // Onboarding & navigation
  const [screen, setScreen]       = useState<NitiScreen>("intro");
  const [saving, setSaving]       = useState(false);
  const [bizType, setBizType]     = useState("");
  const [bizStage, setBizStage]   = useState("");
  const [bizRole, setBizRole]     = useState("");
  const [bizChallenge, setBizChallenge] = useState("");
  const [focusAreas, setFocusAreas]    = useState<string[]>([]);

  // Decision sessions
  const [sessions, setSessions]         = useState<NitiSessionMeta[]>([]);
  const [currentSession, setCurrentSession] = useState<{ id: number; sessionType: string } | null>(null);
  const [messages, setMessages]         = useState<NitiMessage[]>([]);
  const [inputText, setInputText]       = useState("");
  const [isLoading, setIsLoading]       = useState(false);
  const msgId  = useRef(1);
  const msgEnd = useRef<HTMLDivElement>(null);

  // Home tab
  const [activeTab, setActiveTab] = useState<"decisions" | "market">("decisions");

  // Market Lens
  const [marketConv, setMarketConv]   = useState<MarketConv | null>(null);
  const [indices, setIndices]         = useState<any[]>([]);
  const [marketNews, setMarketNews]   = useState<any[]>([]);
  const [portfolio, setPortfolio]     = useState<Holding[]>([]);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [holdingForm, setHoldingForm] = useState({ name: "", assetType: "Stock", quantity: "", avgPrice: "", notes: "" });
  const [savingHolding, setSavingHolding] = useState(false);
  const [thinkInput, setThinkInput]   = useState("");

  // ── Effects ────────────────────────────────────────────────
  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = N.bg;
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch("/api/niti/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.nitiEnabled) return;
        if (data.businessType)       setBizType(data.businessType);
        if (data.businessStage)      setBizStage(data.businessStage);
        if (data.businessRole)       setBizRole(data.businessRole);
        if (data.businessChallenge)  setBizChallenge(data.businessChallenge);
        if (data.businessFocusAreas) setFocusAreas(data.businessFocusAreas);
        setScreen("home");
        loadSessions();
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (screen === "session") msgEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, screen]);

  useEffect(() => {
    if (activeTab === "market" && indices.length === 0) {
      loadMarketData();
      if (token) loadPortfolio();
    }
  }, [activeTab, token]);

  // ── Callbacks ──────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/niti/sessions", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setSessions(await r.json());
    } catch {}
  }, [token]);

  const loadMarketData = useCallback(async () => {
    try {
      const [ir, nr] = await Promise.all([
        fetch("/api/niti/market/indices").then(r => r.json()),
        fetch("/api/niti/market/news").then(r => r.json()),
      ]);
      setIndices(ir || []);
      setMarketNews(nr || []);
    } catch {}
  }, []);

  const loadPortfolio = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch("/api/niti/portfolio", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) setPortfolio(await r.json());
    } catch {}
  }, [token]);

  const askMarket = useCallback(async (topic: string) => {
    setMarketConv({ topic, loading: true, data: null });
    try {
      const r = await fetch("/api/niti/market/ask", {
        method: "POST",
        headers: { Authorization: `Bearer ${token || ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ topic, businessChallenge: bizChallenge, businessType: bizType }),
      });
      const data = await r.json();
      setMarketConv({ topic, loading: false, data });
    } catch {
      setMarketConv(null);
    }
  }, [token, bizChallenge, bizType]);

  const addHolding = async () => {
    if (!token || !holdingForm.name) return;
    setSavingHolding(true);
    try {
      const r = await fetch("/api/niti/portfolio", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: holdingForm.name,
          assetType: holdingForm.assetType,
          quantity: parseFloat(holdingForm.quantity) || 0,
          avgPrice: parseFloat(holdingForm.avgPrice) || 0,
          notes: holdingForm.notes || null,
        }),
      });
      if (r.ok) {
        await loadPortfolio();
        setShowAddHolding(false);
        setHoldingForm({ name: "", assetType: "Stock", quantity: "", avgPrice: "", notes: "" });
      }
    } catch {}
    setSavingHolding(false);
  };

  const deleteHolding = async (id: number) => {
    if (!token) return;
    try {
      await fetch(`/api/niti/portfolio/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setPortfolio(prev => prev.filter(h => h.id !== id));
    } catch {}
  };

  const saveSetup = async () => {
    if (!token) { setScreen("ready"); return; }
    setSaving(true);
    try {
      await fetch("/api/niti/setup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: bizType, businessStage: bizStage, businessRole: bizRole, businessChallenge: bizChallenge, businessFocusAreas: focusAreas }),
      });
      await loadSessions();
    } catch {}
    setSaving(false);
    setScreen("ready");
  };

  const startSession = async (sessionType: string) => {
    if (!token) return;
    setIsLoading(true);
    setMessages([]);
    setCurrentSession(null);
    try {
      const r = await fetch("/api/niti/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionType }),
      });
      const data = await r.json();
      if (data.sessionId && data.opening) {
        setCurrentSession({ id: data.sessionId, sessionType });
        setMessages([{
          id: msgId.current++, role: "arya",
          content: data.opening.content, pushQuestion: data.opening.pushQuestion,
          followUps: data.opening.followUps, philosopher: data.opening.philosopher,
          source: data.opening.source,
        }]);
        setScreen("session");
        loadSessions();
      }
    } catch {}
    setIsLoading(false);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !currentSession || isLoading) return;
    setMessages(prev => [...prev, { id: msgId.current++, role: "user", content: text }]);
    setInputText("");
    setIsLoading(true);
    try {
      const r = await fetch(`/api/niti/sessions/${currentSession.id}/message`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await r.json();
      setMessages(prev => [...prev, {
        id: msgId.current++, role: "arya",
        content: data.content, pushQuestion: data.pushQuestion,
        followUps: data.followUps, philosopher: data.philosopher, source: data.source,
      }]);
    } catch {}
    setIsLoading(false);
  }, [currentSession, isLoading, token]);

  const toggleFocus = (area: string) =>
    setFocusAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);

  // ── Nav ────────────────────────────────────────────────────
  const navBack = () => {
    if (screen === "session") { setScreen("home"); loadSessions(); }
    else setLocation("/");
  };
  const sessionLabel = SESSION_TYPES.find(s => s.key === currentSession?.sessionType)?.label;

  // ── SCREEN 1 — Intro ─────────────────────────────────────
  const IntroScreen = (
    <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ padding: "0 20px 36px", display: "flex", flexDirection: "column", gap: 24 }}>
      <ProgDots screen={screen} />
      <div style={{ textAlign: "center" as const, padding: "4px 0" }}>
        <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 58, color: N.gold, fontWeight: 700, letterSpacing: "0.04em", lineHeight: 1 }}>Niti</div>
        <div style={{ fontSize: 12, letterSpacing: "0.2em", color: N.steel, marginTop: 8, textTransform: "uppercase" as const }}>The Wisdom Council</div>
        <div style={{ width: 48, height: 2, background: `linear-gradient(90deg, transparent, ${N.gold}, transparent)`, margin: "14px auto 0" }} />
      </div>
      <div style={{ background: N.surface2, border: `1px solid ${N.border}`, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ fontSize: 14, color: N.cream, lineHeight: 1.75 }}>
          India's greatest strategists spent lifetimes thinking about power, decisions, people, and money. ARYA draws from their specific wisdom based on what you're dealing with — automatically.
        </div>
        <div style={{ fontSize: 13, color: N.steel, lineHeight: 1.7, marginTop: 10 }}>Not as decoration. As actual thinking.</div>
      </div>
      <div>
        <Label text="The Council" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Object.entries(PHILOSOPHER_META).map(([key, p]) => (
            <div key={key} style={{ background: N.surface2, border: `1px solid ${N.border}`, borderLeft: `3px solid ${p.color}`, borderRadius: "0 10px 10px 0", padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{p.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: N.cream, fontWeight: 600 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: N.steel, marginTop: 2 }}>{p.domain} · <span style={{ color: p.color }}>{p.text}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <GoldBtn label="Set up my council →" onClick={() => setScreen("context")} />
    </motion.div>
  );

  // ── SCREEN 2 — Context ────────────────────────────────────
  const ContextScreen = (
    <motion.div key="context" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      style={{ padding: "0 20px 36px", display: "flex", flexDirection: "column", gap: 22 }}>
      <ProgDots screen={screen} />
      <div>
        <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 21, color: N.cream, fontWeight: 700 }}>Your business</div>
        <div style={{ fontSize: 13, color: N.steel, marginTop: 4, lineHeight: 1.5 }}>So the council speaks to your actual situation — not someone else's.</div>
      </div>
      <div><Label text="Type" /><ChipSelector options={BUSINESS_TYPES}  value={bizType}  onChange={setBizType}  /></div>
      <div><Label text="Stage" /><ChipSelector options={BUSINESS_STAGES} value={bizStage} onChange={setBizStage} /></div>
      <div><Label text="Your role" /><ChipSelector options={BUSINESS_ROLES}  value={bizRole}  onChange={setBizRole}  /></div>
      <div>
        <Label text="What's on your mind right now?" />
        <textarea value={bizChallenge} onChange={e => setBizChallenge(e.target.value)} rows={3}
          placeholder="The decision I'm wrestling with, the problem I keep returning to..."
          style={{ width: "100%", background: N.surface2, border: `1px solid ${N.border2}`, borderRadius: 10, padding: "12px 14px", color: N.cream, fontSize: 13, fontFamily: "Inter, sans-serif", resize: "none", outline: "none", lineHeight: 1.6, boxSizing: "border-box" as const }} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <BackBtn onClick={() => setScreen("intro")} />
        <div style={{ flex: 1 }}><GoldBtn label="Continue →" onClick={() => setScreen("focus")} disabled={!bizType || !bizStage || !bizRole} /></div>
      </div>
    </motion.div>
  );

  // ── SCREEN 3 — Focus areas ────────────────────────────────
  const FocusScreen = (
    <motion.div key="focus" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
      style={{ padding: "0 20px 36px", display: "flex", flexDirection: "column", gap: 22 }}>
      <ProgDots screen={screen} />
      <div>
        <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 21, color: N.cream, fontWeight: 700 }}>What should the council focus on?</div>
        <div style={{ fontSize: 13, color: N.steel, marginTop: 4, lineHeight: 1.5 }}>Select the areas most relevant to where you are right now.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {FOCUS_AREAS.map(area => {
          const active = focusAreas.includes(area);
          return (
            <button key={area} onClick={() => toggleFocus(area)} data-testid={`focus-${area.replace(/\s+/g, "-").toLowerCase()}`}
              style={{ padding: "14px 12px", borderRadius: 10, border: `1px solid ${active ? N.gold : N.border2}`, background: active ? N.goldFaint : N.surface2, color: active ? N.gold : N.steel, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", transition: "all 0.2s", textAlign: "center" as const, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {active && <CheckCircle2 size={13} />}
              {area}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: N.muted, textAlign: "center" as const }}>
        {focusAreas.length === 0 ? "Select all that apply — or all of them" : `${focusAreas.length} area${focusAreas.length > 1 ? "s" : ""} selected`}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <BackBtn onClick={() => setScreen("context")} />
        <div style={{ flex: 1 }}><GoldBtn label="Set up my council →" onClick={saveSetup} loading={saving} disabled={focusAreas.length === 0} /></div>
      </div>
    </motion.div>
  );

  // ── SCREEN 4 — Ready ──────────────────────────────────────
  const ReadyScreen = (
    <motion.div key="ready" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      style={{ padding: "0 20px 36px", display: "flex", flexDirection: "column", gap: 22, textAlign: "center" as const }}>
      <ProgDots screen={screen} />
      <div style={{ padding: "12px 0 4px" }}>
        <div style={{ fontSize: 44, marginBottom: 12, lineHeight: 1 }}>🏛️</div>
        <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 22, color: N.gold, fontWeight: 700 }}>Your council is ready</div>
        <div style={{ fontSize: 13, color: N.steel, marginTop: 8, lineHeight: 1.6 }}>Five classical minds. One purpose — help you think more clearly.</div>
      </div>
      <div style={{ background: N.surface2, border: `1px solid ${N.border}`, borderRadius: 14, padding: 20, textAlign: "left" as const }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: bizChallenge ? 16 : 0 }}>
          {[["Type", bizType], ["Stage", bizStage], ["Role", bizRole]].map(([k, v]) => v ? (
            <div key={k}>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", color: N.muted, textTransform: "uppercase" as const, marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 13, color: N.cream }}>{v}</div>
            </div>
          ) : null)}
        </div>
        {bizChallenge && (
          <div style={{ borderTop: `1px solid ${N.border}`, paddingTop: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: N.muted, textTransform: "uppercase" as const, marginBottom: 4 }}>On your mind</div>
            <div style={{ fontSize: 13, color: N.cream, lineHeight: 1.6, fontStyle: "italic" }}>"{bizChallenge}"</div>
          </div>
        )}
        <div style={{ borderTop: `1px solid ${N.border}`, paddingTop: 12, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={13} color={N.gold} />
          <div style={{ fontSize: 12, color: N.gold }}>Wisdom engine: Classical Indian Niti</div>
        </div>
      </div>
      {focusAreas.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6, justifyContent: "center" }}>
          {focusAreas.map(a => (
            <div key={a} style={{ padding: "4px 10px", borderRadius: 20, border: `1px solid ${N.goldDim}`, color: N.gold, fontSize: 11 }}>{a}</div>
          ))}
        </div>
      )}
      <GoldBtn label="Begin first session →" onClick={() => setScreen("home")} />
    </motion.div>
  );

  // ── SCREEN 5 — Home (with tab bar) ────────────────────────
  // Market Lens content
  const MarketLensContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Disclaimer */}
      <div style={{ fontSize: 11, color: N.muted, textAlign: "center" as const, paddingTop: 2 }}>
        Indicative values · Not real-time · Not investment advice
      </div>

      {/* Indices */}
      {indices.length > 0 ? (
        <div>
          <Label text="Today's Markets" />
          <div style={{ display: "flex", gap: 10, overflowX: "auto" as const, paddingBottom: 4, scrollbarWidth: "none" as const }}>
            {indices.map((idx: any) => {
              const pos = idx.changePercent >= 0;
              return (
                <div key={idx.shortName} style={{ flex: "0 0 140px", background: N.surface2, border: `1px solid ${N.border}`, borderTop: `2px solid ${pos ? N.green : N.red}`, borderRadius: 12, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 10, color: N.steel, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{idx.shortName}</div>
                  <div style={{ fontSize: 15, color: N.cream, fontWeight: 700, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                    {idx.value?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 11, color: pos ? N.green : N.red, fontWeight: 600 }}>
                      {pos ? "▲" : "▼"} {Math.abs(idx.changePercent).toFixed(2)}%
                    </div>
                    <Sparkline data={idx.sparkline} positive={pos} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
          <Loader2 size={18} color={N.muted} style={{ animation: "spin 0.8s linear infinite" }} />
        </div>
      )}

      {/* News */}
      {marketNews.length > 0 && (
        <div>
          <Label text="What's happening" />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {marketNews.map((item: any) => (
              <div key={item.id} style={{ background: N.surface2, border: `1px solid ${N.border}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 14, color: N.cream, lineHeight: 1.55, fontWeight: 500, marginBottom: 10 }}>
                  {item.headline}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 5, marginBottom: 10 }}>
                  {item.impactChips?.map((chip: string) => (
                    <div key={chip} style={{ padding: "3px 8px", borderRadius: 20, background: "rgba(112,128,160,0.12)", color: N.steel, fontSize: 11 }}>{chip}</div>
                  ))}
                </div>
                {item.aryaRead && (
                  <div style={{ fontSize: 12, color: N.steel, lineHeight: 1.55, fontStyle: "italic", borderLeft: `2px solid ${N.goldDim}`, paddingLeft: 9, marginBottom: 12 }}>
                    {item.aryaRead}
                  </div>
                )}
                <button onClick={() => askMarket(item.headline)} data-testid={`news-ask-${item.id}`}
                  style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: `1px solid ${N.goldDim}`, background: N.goldFaint, color: N.gold, fontSize: 12, cursor: "pointer", fontWeight: 600, transition: "all 0.15s" }}>
                  What does this mean for me?
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio Journal */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <Label text="Portfolio Journal" />
          <button onClick={() => setShowAddHolding(true)} data-testid="portfolio-add-btn"
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1px solid ${N.goldDim}`, background: "transparent", color: N.gold, fontSize: 12, cursor: "pointer" }}>
            <Plus size={12} /> Add
          </button>
        </div>
        {portfolio.length === 0 ? (
          <div style={{ background: N.surface2, border: `1px dashed ${N.border}`, borderRadius: 12, padding: "20px 16px", textAlign: "center" as const }}>
            <div style={{ fontSize: 13, color: N.steel, lineHeight: 1.6 }}>Add your holdings and ARYA will ask you honest questions about them.</div>
            <div style={{ fontSize: 11, color: N.muted, marginTop: 4 }}>No data is sold. No advice given. Ever.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {portfolio.map(h => (
              <div key={h.id} style={{ background: N.surface2, border: `1px solid ${N.border}`, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, color: N.cream, fontWeight: 600 }}>{h.name}</div>
                    <div style={{ fontSize: 11, color: N.steel, marginTop: 2 }}>
                      {h.assetType}
                      {h.quantity && parseFloat(h.quantity) > 0 ? ` · ${parseFloat(h.quantity)} units` : ""}
                      {h.avgPrice && parseFloat(h.avgPrice) > 0 ? ` · avg ₹${parseFloat(h.avgPrice).toLocaleString("en-IN")}` : ""}
                    </div>
                  </div>
                  <button onClick={() => deleteHolding(h.id)}
                    style={{ padding: 4, border: "none", background: "transparent", color: N.muted, cursor: "pointer" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <button onClick={() => askMarket(`I hold ${h.quantity || "some"} units of ${h.name}${h.avgPrice && parseFloat(h.avgPrice) > 0 ? ` at an average price of ₹${parseFloat(h.avgPrice).toLocaleString("en-IN")}` : ""}. Help me think about this.`)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${N.border2}`, background: "transparent", color: N.steel, fontSize: 12, cursor: "pointer", textAlign: "left" as const, display: "flex", alignItems: "center", gap: 6 }}>
                  <ChevronRight size={10} color={N.gold} style={{ flexShrink: 0 }} />
                  Think about this with ARYA
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Think with ARYA */}
      <div>
        <Label text="Think with ARYA" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {THINK_QUESTIONS.map((q, i) => (
            <button key={i} onClick={() => askMarket(q)} data-testid={`think-q-${i}`}
              style={{ textAlign: "left" as const, padding: "10px 14px", borderRadius: 9, border: `1px solid ${N.border2}`, background: N.surface2, color: N.text, fontSize: 13, cursor: "pointer", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}>
              <ChevronRight size={11} color={N.gold} style={{ flexShrink: 0 }} />
              {q}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={thinkInput} onChange={e => setThinkInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && thinkInput.trim()) { askMarket(thinkInput); setThinkInput(""); } }}
            placeholder="Or ask your own question…" data-testid="think-custom-input"
            style={{ flex: 1, background: N.surface2, border: `1px solid ${N.border2}`, borderRadius: 10, padding: "10px 14px", color: N.cream, fontSize: 13, outline: "none", fontFamily: "Inter, sans-serif" }} />
          <button onClick={() => { if (thinkInput.trim()) { askMarket(thinkInput); setThinkInput(""); } }} disabled={!thinkInput.trim()}
            style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: thinkInput.trim() ? `linear-gradient(135deg, ${N.gold}, #b8892a)` : N.surface2, color: thinkInput.trim() ? "#0a0d14" : N.muted, cursor: thinkInput.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  // Decisions content
  const DecisionsContent = (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 19, color: N.cream, fontWeight: 700 }}>What are you dealing with?</div>
          {bizChallenge && (
            <div style={{ fontSize: 13, color: N.steel, marginTop: 6, lineHeight: 1.5, fontStyle: "italic", borderLeft: `2px solid ${N.goldDim}`, paddingLeft: 10 }}>
              "{bizChallenge}"
            </div>
          )}
        </div>
        <button onClick={() => setScreen("context")} title="Edit business profile"
          style={{ padding: 8, borderRadius: 8, border: `1px solid ${N.border2}`, background: "transparent", color: N.muted, cursor: "pointer", flexShrink: 0 }}>
          <Settings size={14} />
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {SESSION_TYPES.map(({ key, Icon, label, desc, philKey }) => {
          const phil = PHILOSOPHER_META[philKey];
          return (
            <button key={key} onClick={() => !isLoading && startSession(key)} disabled={isLoading}
              data-testid={`session-type-${key}`}
              style={{ background: N.surface2, border: `1px solid ${N.border}`, borderTop: `3px solid ${phil.color}`, borderRadius: 14, padding: 16, textAlign: "left" as const, cursor: isLoading ? "not-allowed" : "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", gap: 8, opacity: isLoading ? 0.6 : 1 }}>
              <Icon size={20} color={phil.color} />
              <div style={{ fontSize: 13, color: N.cream, fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
              <div style={{ fontSize: 11, color: N.steel, lineHeight: 1.4 }}>{desc}</div>
              <div style={{ fontSize: 10, color: phil.color, letterSpacing: "0.05em" }}>{phil.emoji} {phil.name}</div>
            </button>
          );
        })}
      </div>
      {isLoading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: N.steel, fontSize: 13 }}>
          <Loader2 size={14} style={{ animation: "spin 0.8s linear infinite" }} />
          Opening session…
        </div>
      )}
      {sessions.length > 0 && (
        <div>
          <Label text="Recent sessions" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sessions.slice(0, 5).map(s => {
              const sType = SESSION_TYPES.find(st => st.key === s.sessionType);
              const phil  = s.philosopher ? PHILOSOPHER_META[s.philosopher] : null;
              return (
                <div key={s.id} style={{ background: N.surface2, border: `1px solid ${N.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: N.cream }}>{s.title || sType?.label || s.sessionType}</div>
                    <div style={{ fontSize: 11, color: N.steel, marginTop: 2 }}>
                      {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {phil && <span style={{ color: phil.color, marginLeft: 8 }}>{phil.emoji} {phil.name}</span>}
                    </div>
                  </div>
                  <div style={{ padding: "3px 8px", borderRadius: 20, background: s.status === "resolved" ? "rgba(74,157,122,0.15)" : "rgba(212,168,83,0.1)", color: s.status === "resolved" ? N.green : N.gold, fontSize: 10 }}>
                    {s.status === "resolved" ? "Resolved" : "Active"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const HomeScreen = (
    <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ padding: "0 20px 36px", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Tab bar */}
      <div style={{ display: "flex", background: N.surface2, borderRadius: 10, padding: 3, border: `1px solid ${N.border}` }}>
        {[
          { key: "decisions", label: "⚖️  Decisions" },
          { key: "market",    label: "📈  Market Lens" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as "decisions" | "market")} data-testid={`tab-${tab.key}`}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 8, border: "none", background: activeTab === tab.key ? N.gold : "transparent", color: activeTab === tab.key ? "#0a0d14" : N.steel, fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 400, cursor: "pointer", transition: "all 0.2s", fontFamily: "Inter, sans-serif" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "decisions" ? DecisionsContent : MarketLensContent}
    </motion.div>
  );

  // ── SCREEN 6 — Session ────────────────────────────────────
  const lastAryaIdx = messages.reduce((acc, m, i) => m.role === "arya" ? i : acc, -1);

  const SessionScreen = (
    <motion.div key="session" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

      {messages[0]?.philosopher && (
        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${N.border}`, display: "flex", alignItems: "center", gap: 8, background: N.surface }}>
          {(() => {
            const p = PHILOSOPHER_META[messages[0].philosopher!];
            return p ? (<><span style={{ fontSize: 16 }}>{p.emoji}</span><div><span style={{ fontSize: 12, color: p.color, fontWeight: 600 }}>{p.name}</span><span style={{ fontSize: 11, color: N.steel, marginLeft: 6 }}>{p.text}</span></div></>) : null;
          })()}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
        {messages.map((msg, idx) => (
          <div key={msg.id} style={{ marginBottom: 16 }}>
            {msg.role === "arya" ? (
              <div style={{ background: N.surface2, border: `1px solid ${N.border}`, borderLeft: `3px solid ${msg.philosopher ? (PHILOSOPHER_META[msg.philosopher]?.color || N.gold) : N.gold}`, borderRadius: "0 12px 12px 12px", padding: 16 }}>
                <div style={{ fontSize: 14, color: N.text, lineHeight: 1.75 }}>{msg.content}</div>
                {msg.pushQuestion && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${N.border}`, fontFamily: "Libre Baskerville, serif", fontSize: 14, color: N.gold, fontStyle: "italic", lineHeight: 1.6 }}>
                    {msg.pushQuestion}
                  </div>
                )}
                {msg.source && (
                  <div style={{ marginTop: 8, fontSize: 11, color: N.muted, display: "flex", alignItems: "center", gap: 4 }}>
                    {msg.philosopher && PHILOSOPHER_META[msg.philosopher] && <span>{PHILOSOPHER_META[msg.philosopher].emoji}</span>}
                    {msg.source}
                  </div>
                )}
                {idx === lastAryaIdx && !isLoading && msg.followUps && msg.followUps.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                    {msg.followUps.map((fu, fi) => (
                      <button key={fi} onClick={() => sendMessage(fu)} data-testid={`followup-${fi}`}
                        style={{ textAlign: "left" as const, padding: "8px 12px", borderRadius: 8, border: `1px solid ${N.border2}`, background: "transparent", color: N.steel, fontSize: 12, cursor: "pointer", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
                        <ChevronRight size={11} color={N.gold} style={{ flexShrink: 0 }} />
                        {fu}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <div style={{ background: "#182a1e", border: `1px solid #2a4535`, borderRadius: "12px 12px 0 12px", padding: "10px 14px", maxWidth: "80%", fontSize: 14, color: N.cream, lineHeight: 1.6 }}>
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ background: N.surface2, border: `1px solid ${N.border}`, borderLeft: `3px solid ${N.gold}`, borderRadius: "0 12px 12px 12px", padding: "14px 18px", display: "inline-flex", gap: 5, alignItems: "center" }}>
              {[0, 1, 2].map(i => (<div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: N.gold, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />))}
            </div>
          </div>
        )}
        <div ref={msgEnd} />
      </div>

      <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${N.border}`, background: N.surface, display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea value={inputText} onChange={e => setInputText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(inputText); } }}
          placeholder="Respond or ask a question…" rows={1} data-testid="niti-session-input"
          style={{ flex: 1, background: N.surface2, border: `1px solid ${N.border2}`, borderRadius: 10, padding: "10px 14px", color: N.cream, fontSize: 14, fontFamily: "Inter, sans-serif", resize: "none", outline: "none", lineHeight: 1.5, maxHeight: 100, overflowY: "auto", boxSizing: "border-box" as const }} />
        <button onClick={() => sendMessage(inputText)} disabled={!inputText.trim() || isLoading} data-testid="niti-send-btn"
          style={{ width: 40, height: 40, borderRadius: 10, border: "none", background: inputText.trim() && !isLoading ? `linear-gradient(135deg, ${N.gold}, #b8892a)` : N.surface2, color: inputText.trim() && !isLoading ? "#0a0d14" : N.muted, cursor: inputText.trim() && !isLoading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
          <Send size={16} />
        </button>
      </div>
    </motion.div>
  );

  // ── Root ──────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100dvh", background: N.bg, color: N.text, display: "flex", flexDirection: "column", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
        * { -webkit-font-smoothing: antialiased; box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Nav */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${N.border}`, display: "flex", alignItems: "center", gap: 12, background: N.surface, flexShrink: 0 }}>
        <button onClick={navBack} data-testid="niti-back-btn"
          style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${N.border2}`, background: "transparent", color: N.steel, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 15, color: N.gold, fontWeight: 700, letterSpacing: "0.06em" }}>
            {screen === "session" && sessionLabel ? sessionLabel : "NITI"}
          </div>
          <div style={{ fontSize: 10, color: N.steel, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
            {screen === "home" && activeTab === "market" ? "MARKET LENS" : "THE WISDOM COUNCIL"}
          </div>
        </div>
      </div>

      {/* Screens */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: screen === "session" ? "hidden" : "auto" }}>
        <AnimatePresence mode="wait">
          {screen === "intro"   && IntroScreen}
          {screen === "context" && ContextScreen}
          {screen === "focus"   && FocusScreen}
          {screen === "ready"   && ReadyScreen}
          {screen === "home"    && HomeScreen}
          {screen === "session" && SessionScreen}
        </AnimatePresence>
      </div>

      {/* ── ARYA Market Conversation Modal ─────────────────── */}
      <AnimatePresence>
        {marketConv !== null && (
          <motion.div key="market-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)" }}
              onClick={() => !marketConv.loading && setMarketConv(null)} />
            <motion.div key="market-sheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}
              style={{ position: "relative", background: N.surface, borderRadius: "22px 22px 0 0", border: `1px solid ${N.border}`, borderBottom: "none", padding: "20px 20px 40px", maxHeight: "82vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Handle */}
              <div style={{ width: 36, height: 4, borderRadius: 2, background: N.border2, margin: "-4px auto 4px" }} />

              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1, fontSize: 13, color: N.steel, lineHeight: 1.5, fontStyle: "italic" }}>
                  "{marketConv.topic}"
                </div>
                {!marketConv.loading && (
                  <button onClick={() => setMarketConv(null)}
                    style={{ padding: 4, border: "none", background: "transparent", color: N.muted, cursor: "pointer", flexShrink: 0 }}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {marketConv.loading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "28px 0", gap: 5 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: N.gold, animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
                  ))}
                </div>
              ) : marketConv.data ? (
                <>
                  <div style={{ fontSize: 14, color: N.text, lineHeight: 1.78 }}>
                    {marketConv.data.content}
                  </div>
                  <div style={{ paddingTop: 14, borderTop: `1px solid ${N.border}`, fontFamily: "Libre Baskerville, serif", fontSize: 14, color: N.gold, fontStyle: "italic", lineHeight: 1.65 }}>
                    {marketConv.data.pushQuestion}
                  </div>
                  <div style={{ background: N.goldFaint, border: `1px solid ${N.goldDim}`, borderRadius: 9, padding: "10px 14px", fontSize: 12, color: N.cream, lineHeight: 1.55, display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ flexShrink: 0 }}>💡</span>
                    {marketConv.data.takeaway}
                  </div>
                  <div style={{ fontSize: 11, color: N.muted, textAlign: "center" as const, paddingTop: 4 }}>
                    ARYA helps you think — not tell you what to do
                  </div>
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Holding Modal ───────────────────────────────── */}
      <AnimatePresence>
        {showAddHolding && (
          <motion.div key="holding-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)" }}
              onClick={() => !savingHolding && setShowAddHolding(false)} />
            <motion.div key="holding-sheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 260 }}
              style={{ position: "relative", background: N.surface, borderRadius: "22px 22px 0 0", border: `1px solid ${N.border}`, borderBottom: "none", padding: "20px 20px 40px", maxHeight: "85vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>

              <div style={{ width: 36, height: 4, borderRadius: 2, background: N.border2, margin: "-4px auto 4px" }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 16, color: N.cream, fontWeight: 700 }}>Add to Portfolio Journal</div>
                <button onClick={() => setShowAddHolding(false)} style={{ padding: 4, border: "none", background: "transparent", color: N.muted, cursor: "pointer" }}>
                  <X size={16} />
                </button>
              </div>

              <div>
                <Label text="Name" />
                <input value={holdingForm.name} onChange={e => setHoldingForm(p => ({...p, name: e.target.value}))}
                  placeholder="e.g. Infosys, HDFC Flexi Cap, Gold ETF" data-testid="holding-name-input"
                  style={{ width: "100%", background: N.surface2, border: `1px solid ${N.border2}`, borderRadius: 8, padding: "10px 12px", color: N.cream, fontSize: 13, outline: "none" }} />
              </div>

              <div>
                <Label text="Type" />
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                  {["Stock", "Mutual Fund", "ETF", "Gold", "Crypto", "Other"].map(t => (
                    <button key={t} onClick={() => setHoldingForm(p => ({...p, assetType: t}))}
                      style={{ padding: "6px 12px", borderRadius: 7, border: `1px solid ${holdingForm.assetType === t ? N.gold : N.border2}`, background: holdingForm.assetType === t ? N.goldFaint : "transparent", color: holdingForm.assetType === t ? N.gold : N.steel, fontSize: 12, cursor: "pointer" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label text="Quantity" />
                  <input type="number" value={holdingForm.quantity} onChange={e => setHoldingForm(p => ({...p, quantity: e.target.value}))}
                    placeholder="100"
                    style={{ width: "100%", background: N.surface2, border: `1px solid ${N.border2}`, borderRadius: 8, padding: "10px 12px", color: N.cream, fontSize: 13, outline: "none" }} />
                </div>
                <div>
                  <Label text="Avg. Buy Price (₹)" />
                  <input type="number" value={holdingForm.avgPrice} onChange={e => setHoldingForm(p => ({...p, avgPrice: e.target.value}))}
                    placeholder="540"
                    style={{ width: "100%", background: N.surface2, border: `1px solid ${N.border2}`, borderRadius: 8, padding: "10px 12px", color: N.cream, fontSize: 13, outline: "none" }} />
                </div>
              </div>

              <div>
                <Label text="Note (optional)" />
                <input value={holdingForm.notes} onChange={e => setHoldingForm(p => ({...p, notes: e.target.value}))}
                  placeholder="Why you bought this, what you're wondering about..."
                  style={{ width: "100%", background: N.surface2, border: `1px solid ${N.border2}`, borderRadius: 8, padding: "10px 12px", color: N.cream, fontSize: 13, outline: "none" }} />
              </div>

              <GoldBtn label="Add to journal" onClick={addHolding} loading={savingHolding} disabled={!holdingForm.name} />
              <div style={{ fontSize: 11, color: N.muted, textAlign: "center" as const }}>No investment advice given. No data sold. Ever.</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
