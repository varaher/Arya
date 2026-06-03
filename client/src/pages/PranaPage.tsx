import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useUserAuth } from "@/lib/user-auth";
import { useLanguage } from "@/lib/language-context";
import { X, Loader2, Trash2, ChevronLeft, Wifi, AlertCircle, Send, User, ChevronRight, CheckCircle2 } from "lucide-react";
import PranaOnboarding from "@/components/PranaOnboarding";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#08080e", surface: "#111118", surface2: "#181820",
  border: "#22222e", border2: "#2d2d3e",
  teal: "#3dd9c0", tealDim: "rgba(61,217,192,0.10)", tealBorder: "rgba(61,217,192,0.22)",
  rose: "#e87070", roseDim: "rgba(232,112,112,0.10)", roseBorder: "rgba(232,112,112,0.22)",
  violet: "#7c6aff", violetDim: "rgba(124,106,255,0.10)",
  amber: "#f5a623", amberDim: "rgba(245,166,35,0.10)", amberBorder: "rgba(245,166,35,0.22)",
  lime: "#a8e063", limeDim: "rgba(168,224,99,0.10)",
  text: "#e8e8f0", textDim: "#9898b8", textMuted: "#7878a0",
  green: "#4ade80", greenDim: "rgba(74,222,128,0.10)",
};
const sans = "'Inter', 'Nunito', sans-serif";
const serif = "'Libre Baskerville', Georgia, serif";

// ── Metrics config ────────────────────────────────────────────────────────────
const METRICS = [
  { key: "heart_rate",  label: "Heart Rate",   unit: "bpm",  emoji: "❤️",  color: C.rose,   bg: C.roseDim,   border: C.roseBorder,   min: 30,  max: 220, decimals: 0, isHigh: (v: number) => v > 100 || v < 50 },
  { key: "spo2",        label: "Blood Oxygen", unit: "%",    emoji: "🫁",  color: C.violet, bg: C.violetDim, border: "rgba(124,106,255,0.22)", min: 80,  max: 100, decimals: 1, isHigh: (v: number) => v < 95 },
  { key: "steps",       label: "Steps",        unit: "",     emoji: "👟",  color: C.teal,   bg: C.tealDim,   border: C.tealBorder,   min: 0,   max: 50000, decimals: 0, isHigh: () => false },
  { key: "stress",      label: "Stress",       unit: "/100", emoji: "🧠",  color: C.amber,  bg: C.amberDim,  border: C.amberBorder,  min: 0,   max: 100, decimals: 0, isHigh: (v: number) => v > 60 },
  { key: "calories",    label: "Calories",     unit: "kcal", emoji: "🔥",  color: "#f5c842", bg: "rgba(245,200,66,0.10)", border: "rgba(245,200,66,0.22)", min: 0, max: 9999, decimals: 0, isHigh: () => false },
  { key: "weight",      label: "Weight",       unit: "kg",   emoji: "⚖️",  color: "#8fa0b8", bg: "rgba(143,160,184,0.10)", border: "rgba(143,160,184,0.22)", min: 20, max: 300, decimals: 1, isHigh: () => false },
];
const SLEEP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ACTIVITY_LEVELS = [
  { key: "sedentary",   label: "Sedentary",    desc: "Mostly sitting, little movement",         mult: 1.2   },
  { key: "light",       label: "Light",        desc: "Light exercise 1–3 days/week",            mult: 1.375 },
  { key: "moderate",    label: "Moderate",     desc: "Moderate exercise 3–5 days/week",         mult: 1.55  },
  { key: "active",      label: "Active",       desc: "Hard exercise 6–7 days/week",             mult: 1.725 },
  { key: "very_active", label: "Very Active",  desc: "Very hard training or physical job",      mult: 1.9   },
];

const SEX_OPTIONS = [
  { key: "male",   label: "Male" },
  { key: "female", label: "Female" },
  { key: "other",  label: "Prefer not to say" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface HealthReading { id: string; metric: string; value: string; value2?: string | null; unit?: string | null; loggedAt: string; }
interface Insight { type: "positive" | "caution" | "flag" | "correlation" | "neutral"; icon: string; title: string; body: string; tip?: string | null; }
interface HealthProfile { heightCm: number | null; weightKg: number | null; sex: string | null; activityLevel: string | null; age: number | null; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "just now"; if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`; return `${Math.floor(d / 1440)}d ago`;
}
function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function last7Days() {
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d.toISOString().slice(0, 10); });
}
function calcBMI(heightCm: number, weightKg: number) {
  const h = heightCm / 100; return weightKg / (h * h);
}
function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: C.amber };
  if (bmi < 25)   return { label: "Normal",       color: C.green };
  if (bmi < 30)   return { label: "Overweight",   color: C.amber };
  return { label: "High BMI", color: C.rose };
}
function calcBMR(heightCm: number, weightKg: number, age: number, sex: string) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "male")   return base + 5;
  if (sex === "female") return base - 161;
  return base - 78;
}
function activityMult(level: string | null) {
  return ACTIVITY_LEVELS.find(a => a.key === level)?.mult ?? 1.55;
}
function stepGoal(level: string | null) {
  const map: Record<string, number> = { sedentary: 6000, light: 7500, moderate: 8500, active: 10000, very_active: 12000 };
  return map[level || "moderate"] ?? 8500;
}
function hasProfile(p: HealthProfile | null) {
  return !!(p && p.heightCm && p.weightKg && p.sex);
}

// ── LogModal ──────────────────────────────────────────────────────────────────
function LogModal({ metric, onClose, onSave, loading }: { metric: typeof METRICS[0]; onClose: () => void; onSave: (v: string, v2?: string) => void; loading: boolean; }) {
  const [val, setVal] = useState("");
  const [val2, setVal2] = useState("");
  const isBP = metric.key === "blood_pressure";
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}>
      <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        style={{ background: C.surface, borderRadius: "24px 24px 0 0", padding: "28px 24px 48px", width: "100%", maxWidth: 480 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>{metric.emoji}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: sans }}>{metric.label}</div>
              {metric.unit && <div style={{ fontSize: 12, color: C.textDim }}>{metric.unit}</div>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", padding: 6 }}><X size={20} /></button>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <input type="number" value={val} onChange={e => setVal(e.target.value)}
            placeholder={isBP ? "Systolic" : `Enter ${metric.label.toLowerCase()}`}
            style={{ flex: 1, background: C.surface2, border: `1.5px solid ${val ? metric.border : C.border2}`, borderRadius: 14, padding: "16px", fontSize: 24, fontWeight: 700, color: metric.color, fontFamily: sans, outline: "none", textAlign: "center" as const }}
            min={metric.min} max={metric.max} />
          {isBP && <input type="number" value={val2} onChange={e => setVal2(e.target.value)} placeholder="Diastolic"
            style={{ flex: 1, background: C.surface2, border: `1.5px solid ${val2 ? metric.border : C.border2}`, borderRadius: 14, padding: "16px", fontSize: 24, fontWeight: 700, color: metric.color, fontFamily: sans, outline: "none", textAlign: "center" as const }} />}
        </div>
        <button onClick={() => val && onSave(val, val2 || undefined)} disabled={!val || loading}
          style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: val ? `linear-gradient(135deg, ${metric.color}, ${metric.color}bb)` : C.border2, color: val ? "#08080e" : C.textDim, fontSize: 15, fontWeight: 700, cursor: val ? "pointer" : "not-allowed", fontFamily: sans, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
          Save reading
        </button>
      </motion.div>
    </motion.div>
  );
}

const BP_METRIC = { key: "blood_pressure", label: "Blood Pressure", unit: "mmHg", emoji: "🩺", color: C.violet, bg: C.violetDim, border: "rgba(124,106,255,0.22)", min: 40, max: 250, decimals: 0, isHigh: () => false };
const GLUCOSE_METRIC = { key: "glucose", label: "Blood Glucose", unit: "mg/dL", emoji: "🩸", color: "#f5c842", bg: "rgba(245,200,66,0.10)", border: "rgba(245,200,66,0.22)", min: 40, max: 400, decimals: 0, isHigh: (v: number) => v > 125 };
const SLEEP_METRIC = { key: "sleep_hours", label: "Sleep", unit: "hours", emoji: "🌙", color: C.violet, bg: C.violetDim, border: "rgba(124,106,255,0.22)", min: 0, max: 24, decimals: 1, isHigh: (v: number) => v < 5 };

// ── MetricCard ────────────────────────────────────────────────────────────────
function MetricCard({ metric, reading, onTap }: { metric: typeof METRICS[0]; reading?: HealthReading; onTap: () => void }) {
  const val = reading ? parseFloat(reading.value) : null;
  const warn = val !== null && metric.isHigh(val);
  return (
    <button onClick={onTap} data-testid={`prana-card-${metric.key}`}
      style={{ background: reading ? metric.bg : C.surface, border: `1.5px solid ${reading ? metric.border : C.border}`, borderRadius: 16, padding: "16px 14px", textAlign: "left" as const, cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column" as const, gap: 8, width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 22 }}>{metric.emoji}</span>
        {warn && <span style={{ fontSize: 9, color: metric.color, background: metric.bg, border: `1px solid ${metric.border}`, borderRadius: 6, padding: "2px 6px", letterSpacing: "0.08em" }}>NOTE</span>}
      </div>
      <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 3 }}>{metric.label}</div>
      {reading ? (
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: metric.color, lineHeight: 1 }}>
            {parseFloat(reading.value).toFixed(metric.decimals)}{metric.unit && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3 }}>{metric.unit}</span>}
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{timeAgo(reading.loggedAt)}</div>
        </div>
      ) : <div style={{ fontSize: 12, color: C.textMuted }}>Tap to log</div>}
    </button>
  );
}

// ── SleepChart ────────────────────────────────────────────────────────────────
function SleepChart({ readings }: { readings: HealthReading[] }) {
  const days = last7Days();
  const byDay: Record<string, number> = {};
  readings.forEach(r => { const d = r.loggedAt.slice(0, 10); if (!byDay[d]) byDay[d] = parseFloat(r.value); });
  const vals = days.map(d => byDay[d] ?? null);
  const maxVal = Math.max(9, ...vals.filter(Boolean) as number[]);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80 }}>
      {vals.map((v, i) => {
        const h = v ? Math.round((v / maxVal) * 72) : 4;
        const color = !v ? C.border : v < 5.5 ? C.amber : v >= 7 ? C.teal : "#8fa0b8";
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
            <div style={{ width: "100%", height: h, borderRadius: 4, background: color, transition: "height 0.4s" }} />
            {v && <div style={{ fontSize: 9, color: C.textMuted }}>{v.toFixed(1)}</div>}
            <div style={{ fontSize: 8, color: C.textMuted }}>{SLEEP_DAYS[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── GlucoseBar ────────────────────────────────────────────────────────────────
function GlucoseBar({ value }: { value: number | null }) {
  const zones = [{ label: "Low", w: 23, color: C.violet }, { label: "Normal", w: 23, color: C.teal }, { label: "Pre-D", w: 10, color: C.amber }, { label: "High", w: 44, color: C.rose }];
  const pos = value ? Math.min(100, Math.max(0, ((value - 40) / 260) * 100)) : null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ position: "relative", height: 8, borderRadius: 8, overflow: "hidden", display: "flex" }}>
        {zones.map((z, i) => <div key={i} style={{ flex: z.w, background: z.color, opacity: 0.35 }} />)}
        {pos !== null && <div style={{ position: "absolute", left: `${pos}%`, top: -1, width: 10, height: 10, borderRadius: "50%", background: "#fff", border: "2px solid #333", transform: "translateX(-50%)", transition: "left 0.4s" }} />}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {zones.map((z, i) => <span key={i} style={{ fontSize: 8, color: C.textMuted }}>{z.label}</span>)}
      </div>
      {value && <div style={{ marginTop: 6, fontSize: 12, color: C.textDim, textAlign: "center" as const }}>{value} mg/dL — {value < 70 ? "Low" : value <= 99 ? "Normal" : value <= 125 ? "Pre-diabetic range" : "Elevated"}</div>}
    </div>
  );
}

// ── TrendSparkline ────────────────────────────────────────────────────────────
function TrendSparkline({ readings, metric }: { readings: HealthReading[]; metric: typeof METRICS[0] }) {
  const days = last7Days();
  const byDay: Record<string, number[]> = {};
  readings.forEach(r => { const d = r.loggedAt.slice(0, 10); if (!byDay[d]) byDay[d] = []; byDay[d].push(parseFloat(r.value)); });
  const vals = days.map(d => byDay[d] ? avg(byDay[d]) : null);
  const existing = vals.filter(Boolean) as number[];
  if (existing.length < 2) return null;
  const min = Math.min(...existing), max = Math.max(...existing), range = max - min || 1;
  const W = 260, H = 48;
  const pts = vals.map((v, i) => { const x = (i / 6) * W; const y = v != null ? H - ((v - min) / range) * (H - 8) - 4 : null; return y != null ? `${x},${y}` : null; }).filter(Boolean) as string[];
  const polyline = pts.join(" ");
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{metric.emoji}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{metric.label}</div>
            <div style={{ fontSize: 11, color: C.textDim }}>7-day average{metric.unit ? ` · ${metric.unit}` : ""}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" as const }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: metric.color }}>{existing.length ? avg(existing).toFixed(metric.decimals) : "—"}</div>
          <div style={{ fontSize: 10, color: C.textMuted }}>avg</div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, overflow: "visible" }}>
        <defs>
          <linearGradient id={`grad-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={metric.color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={metric.color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polyline points={polyline} fill="none" stroke={metric.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((pt, i) => {
          const [x, y] = pt.split(",").map(Number);
          const v = existing[i];
          const warn = v !== undefined && metric.isHigh(v);
          return <circle key={i} cx={x} cy={y} r={4} fill={warn ? C.rose : metric.color} stroke={C.surface} strokeWidth={2} />;
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        {days.map((d, i) => <span key={i} style={{ fontSize: 9, color: C.textMuted }}>{SLEEP_DAYS[i]}</span>)}
      </div>
    </div>
  );
}

// ── InsightCard ───────────────────────────────────────────────────────────────
const insightColors = {
  positive:    { bg: "rgba(168,224,99,0.08)",  border: "rgba(168,224,99,0.20)",  text: "#a8e063" },
  caution:     { bg: C.amberDim,               border: C.amberBorder,            text: C.amber   },
  flag:        { bg: C.roseDim,                border: C.roseBorder,             text: C.rose    },
  correlation: { bg: C.tealDim,               border: C.tealBorder,             text: C.teal    },
  neutral:     { bg: C.surface2,              border: C.border2,                text: C.textDim },
};
function InsightCard({ insight }: { insight: Insight }) {
  const col = insightColors[insight.type] || insightColors.neutral;
  return (
    <div style={{ background: col.bg, border: `1px solid ${col.border}`, borderRadius: 16, padding: "16px", marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{insight.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: col.text, marginBottom: 6 }}>{insight.title}</div>
          <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.7 }}>{insight.body}</div>
          {insight.tip && (
            <div style={{ marginTop: 10, fontSize: 12, color: col.text, background: `${col.bg}`, borderLeft: `3px solid ${col.border}`, paddingLeft: 10, paddingTop: 4, paddingBottom: 4, borderRadius: "0 6px 6px 0" }}>
              → {insight.tip}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── ProfileSetupModal (Google Health "Tell us about yourself" style) ───────────
function ProfileSetupModal({ onSave, onSkip, token }: { onSave: (p: HealthProfile) => void; onSkip: () => void; token?: string | null }) {
  const [step, setStep] = useState<"intro" | "form">("intro");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [sex, setSex] = useState("");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [age, setAge] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = heightCm && weightKg && sex;

  async function handleSave() {
    if (!canSave || !token) return;
    setSaving(true);
    try {
      await fetch("/api/user/health/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({ heightCm: parseInt(heightCm), weightKg: parseFloat(weightKg), sex, activityLevel, age: age ? parseInt(age) : undefined }),
      });
      onSave({ heightCm: parseInt(heightCm), weightKg: parseFloat(weightKg), sex, activityLevel, age: age ? parseInt(age) : null });
    } catch {}
    setSaving(false);
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <motion.div initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 30 }}
        style={{ background: C.surface, borderRadius: "28px 28px 0 0", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto" as const, paddingBottom: 40 }}>

        {step === "intro" ? (
          <div style={{ padding: "36px 28px 0" }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={onSkip} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 13, fontFamily: sans }}>Skip for now</button>
            </div>
            <div style={{ textAlign: "center" as const, padding: "20px 0 32px" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg, ${C.teal}, ${C.violet})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, margin: "0 auto 20px" }}>🫁</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.text, fontFamily: sans, marginBottom: 10, lineHeight: 1.2 }}>Personal health coaching</div>
              <div style={{ fontSize: 15, color: C.textDim, lineHeight: 1.65, marginBottom: 8 }}>Built with ARYA</div>
              <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.7, maxWidth: 300, margin: "0 auto" }}>
                Set up your profile so ARYA can personalise your health insights — calorie needs, step goals, and coaching that fits your body.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, marginBottom: 16 }}>
              {[
                { icon: "📐", text: "Personalised step and calorie goals" },
                { icon: "💬", text: "Health coaching based on your data" },
                { icon: "📊", text: "BMI and metabolic rate calculated for you" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", background: C.surface2, borderRadius: 12, padding: "12px 14px" }}>
                  <span style={{ fontSize: 18 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: C.textDim }}>{item.text}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep("form")} data-testid="prana-profile-setup-btn"
              style={{ width: "100%", padding: "17px", borderRadius: 16, border: "none", background: `linear-gradient(135deg, ${C.teal}, ${C.violet})`, color: "#08080e", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: sans, marginTop: 8 }}>
              Tell us about yourself
            </button>
          </div>
        ) : (
          <div style={{ padding: "28px 24px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button onClick={() => setStep("intro")} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", padding: 4 }}><ChevronLeft size={20} /></button>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: sans }}>Tell us about yourself</div>
                <div style={{ fontSize: 12, color: C.textDim }}>Helps ARYA personalise your health metrics</div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.surface2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={22} color={C.textDim} />
              </div>
              <div style={{ fontSize: 13, color: C.textDim, lineHeight: 1.5 }}>
                Your profile info helps personalise metrics like stride length, calorie burn, and step goals.
              </div>
            </div>

            <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>Your profile info</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="Height (cm)"
                  data-testid="prana-height-input"
                  style={{ width: "100%", background: C.surface2, border: `1.5px solid ${heightCm ? C.tealBorder : C.border2}`, borderRadius: 12, padding: "14px 12px", fontSize: 15, color: C.text, fontFamily: sans, outline: "none", boxSizing: "border-box" as const }} />
              </div>
              <div>
                <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="Weight (kg)"
                  data-testid="prana-weight-input"
                  style={{ width: "100%", background: C.surface2, border: `1.5px solid ${weightKg ? C.tealBorder : C.border2}`, borderRadius: 12, padding: "14px 12px", fontSize: 15, color: C.text, fontFamily: sans, outline: "none", boxSizing: "border-box" as const }} />
              </div>
            </div>

            <select value={sex} onChange={e => setSex(e.target.value)} data-testid="prana-sex-select"
              style={{ width: "100%", background: C.surface2, border: `1.5px solid ${sex ? C.tealBorder : C.border2}`, borderRadius: 12, padding: "14px 12px", fontSize: 15, color: sex ? C.text : C.textMuted, fontFamily: sans, outline: "none", marginBottom: 10, cursor: "pointer", appearance: "none" as const }}>
              <option value="" disabled>Sex</option>
              {SEX_OPTIONS.map(o => <option key={o.key} value={o.key} style={{ background: C.surface2, color: C.text }}>{o.label}</option>)}
            </select>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 20, lineHeight: 1.5 }}>
              ARYA uses this to calculate metrics like calories burned and to provide personalised reference points.
            </div>

            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="Age (optional)"
              data-testid="prana-age-input"
              style={{ width: "100%", background: C.surface2, border: `1.5px solid ${age ? C.tealBorder : C.border2}`, borderRadius: 12, padding: "14px 12px", fontSize: 15, color: C.text, fontFamily: sans, outline: "none", marginBottom: 20, boxSizing: "border-box" as const }} />

            <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 10 }}>Activity Level</div>
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: 24 }}>
              {ACTIVITY_LEVELS.map(a => (
                <button key={a.key} onClick={() => setActivityLevel(a.key)} data-testid={`prana-activity-${a.key}`}
                  style={{ background: activityLevel === a.key ? C.tealDim : C.surface2, border: `1.5px solid ${activityLevel === a.key ? C.tealBorder : C.border2}`, borderRadius: 12, padding: "12px 14px", textAlign: "left" as const, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: activityLevel === a.key ? 700 : 400, color: activityLevel === a.key ? C.teal : C.text, fontFamily: sans }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{a.desc}</div>
                  </div>
                  {activityLevel === a.key && <CheckCircle2 size={18} color={C.teal} />}
                </button>
              ))}
            </div>

            <button onClick={handleSave} disabled={!canSave || saving} data-testid="prana-save-profile-btn"
              style={{ width: "100%", padding: "17px", borderRadius: 16, border: "none", background: canSave ? `linear-gradient(135deg, ${C.teal}, ${C.violet})` : C.border2, color: canSave ? "#08080e" : C.textDim, fontSize: 15, fontWeight: 800, cursor: canSave ? "pointer" : "not-allowed", fontFamily: sans, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : null}
              Save and continue
            </button>
            <button onClick={onSkip} style={{ width: "100%", padding: "14px", border: "none", background: "none", color: C.textMuted, fontSize: 13, cursor: "pointer", fontFamily: sans, marginTop: 8 }}>
              I'll do this later
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── PersonalizedStatsCard ─────────────────────────────────────────────────────
function PersonalizedStatsCard({ profile, onEdit }: { profile: HealthProfile; onEdit: () => void }) {
  if (!profile.heightCm || !profile.weightKg) return null;
  const bmi = calcBMI(profile.heightCm, parseFloat(String(profile.weightKg)));
  const bmiCat = bmiCategory(bmi);
  const bmr = profile.age && profile.sex
    ? calcBMR(profile.heightCm, parseFloat(String(profile.weightKg)), profile.age, profile.sex)
    : null;
  const tdee = bmr ? Math.round(bmr * activityMult(profile.activityLevel)) : null;
  const steps = stepGoal(profile.activityLevel);

  const stats = [
    { label: "BMI", value: bmi.toFixed(1), sub: bmiCat.label, color: bmiCat.color },
    tdee ? { label: "Cal / day", value: tdee.toLocaleString(), sub: "your goal", color: "#f5c842" } : null,
    { label: "Step goal", value: steps.toLocaleString(), sub: "daily target", color: C.teal },
  ].filter(Boolean) as { label: string; value: string; sub: string; color: string }[];

  return (
    <div style={{ background: `linear-gradient(135deg, rgba(61,217,192,0.07), rgba(124,106,255,0.07))`, border: `1px solid ${C.tealBorder}`, borderRadius: 18, padding: "16px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>Your Health Profile</div>
        <button onClick={onEdit} style={{ background: "none", border: `1px solid ${C.border}`, fontSize: 11, color: C.textDim, cursor: "pointer", fontFamily: sans, padding: "4px 8px", borderRadius: 6 }}>Edit</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 10 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: "center" as const }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>{s.label}</div>
            <div style={{ fontSize: 9, color: s.color, opacity: 0.8, marginTop: 1 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: C.textMuted }}>
        {profile.heightCm}cm · {profile.weightKg}kg · {SEX_OPTIONS.find(s => s.key === profile.sex)?.label || profile.sex} · {ACTIVITY_LEVELS.find(a => a.key === profile.activityLevel)?.label || "Moderate"} activity
      </div>
    </div>
  );
}

// ── CoachTab ──────────────────────────────────────────────────────────────────
const COACH_CHIPS = [
  "Is my resting heart rate healthy?",
  "How many calories should I eat today?",
  "Why am I tired even after 7 hours of sleep?",
  "What exercise suits my fitness level?",
  "How do I improve my step count gradually?",
  "What does my BMI mean for my health?",
];

function CoachTab({ token, profile }: { token?: string | null; profile: HealthProfile | null }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "arya"; text: string }[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [profilePrompted, setProfilePrompted] = useState(false);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(msg: string) {
    if (!msg.trim() || streaming || !token) return;
    const userMsg = msg.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setStreaming(true);
    setMessages(prev => [...prev, { role: "arya", text: "" }]);

    try {
      if (readerRef.current) { try { readerRef.current.cancel(); } catch {} }
      const res = await fetch("/api/user/health/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({ message: userMsg }),
      });
      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "arya", text: next[next.length - 1].text + parsed.token };
                return next;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages(prev => { const next = [...prev]; next[next.length - 1] = { role: "arya", text: "I'm not available right now. Please try again in a moment." }; return next; });
    } finally {
      setStreaming(false);
    }
  }

  const noProfile = !hasProfile(profile);

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "calc(100vh - 160px)", padding: "0 0 0" }}>
      {noProfile && !profilePrompted && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          style={{ margin: "0 20px 16px", background: `linear-gradient(135deg, ${C.tealDim}, ${C.violetDim})`, border: `1px solid ${C.tealBorder}`, borderRadius: 14, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 22 }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.teal, marginBottom: 3 }}>Set up your health profile</div>
            <div style={{ fontSize: 12, color: C.textDim }}>Adding height, weight & activity level unlocks personalised coaching.</div>
          </div>
          <button onClick={() => setProfilePrompted(true)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}><X size={16} /></button>
        </motion.div>
      )}

      <div style={{ flex: 1, overflowY: "auto" as const, padding: "0 20px" }}>
        {messages.length === 0 && (
          <div style={{ paddingTop: 8, paddingBottom: 16 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 24 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${C.teal}, ${C.violet})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🫁</div>
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: "4px 16px 16px 16px", padding: "12px 14px", maxWidth: "85%" }}>
                <div style={{ fontSize: 14, color: C.text, lineHeight: 1.65 }}>
                  {hasProfile(profile)
                    ? `Hi! I've looked at your profile — ${profile!.heightCm}cm, ${profile!.weightKg}kg, ${ACTIVITY_LEVELS.find(a => a.key === profile!.activityLevel)?.label?.toLowerCase() || "moderate"} activity. Ask me anything about your health — I'll give you honest, personalised guidance.`
                    : "Hi! I'm your personal health coach. Ask me anything — about your readings, daily habits, sleep, energy, or general wellness. I'll give you honest, practical guidance."}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 10 }}>Quick questions</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8 }}>
              {COACH_CHIPS.map((chip, i) => (
                <button key={i} onClick={() => sendMessage(chip)} data-testid={`prana-coach-chip-${i}`}
                  style={{ background: C.surface, border: `1px solid ${C.border2}`, borderRadius: 20, padding: "8px 14px", fontSize: 12, color: C.textDim, cursor: "pointer", fontFamily: sans, transition: "all 0.18s", textAlign: "left" as const }}>
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "arya" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${C.teal}, ${C.violet})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🫁</div>
            )}
            <div style={{
              background: m.role === "user" ? `linear-gradient(135deg, ${C.teal}22, ${C.tealBorder})` : C.surface,
              border: `1px solid ${m.role === "user" ? C.tealBorder : C.border}`,
              borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
              padding: "11px 14px", maxWidth: "85%",
            }}>
              <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, whiteSpace: "pre-wrap" as const }}>
                {m.text}
                {m.role === "arya" && streaming && i === messages.length - 1 && m.text === "" && (
                  <span style={{ display: "inline-flex", gap: 3, marginLeft: 4 }}>
                    {[0, 1, 2].map(d => <span key={d} style={{ width: 5, height: 5, borderRadius: "50%", background: C.teal, display: "inline-block", animation: "prana-pulse 1.2s ease-in-out infinite", animationDelay: `${d * 0.2}s` }} />)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px 20px 20px", borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask your health coach…" rows={1}
            data-testid="prana-coach-input"
            style={{ flex: 1, background: C.surface2, border: `1.5px solid ${input ? C.tealBorder : C.border2}`, borderRadius: 14, padding: "12px 14px", fontSize: 14, color: C.text, fontFamily: sans, outline: "none", resize: "none" as const, lineHeight: 1.5, minHeight: 46 }} />
          <button onClick={() => sendMessage(input)} disabled={!input.trim() || streaming} data-testid="prana-coach-send"
            style={{ width: 46, height: 46, borderRadius: 14, border: "none", background: input.trim() ? `linear-gradient(135deg, ${C.teal}, ${C.violet})` : C.border2, color: input.trim() ? "#08080e" : C.textDim, cursor: input.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
            {streaming ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={18} />}
          </button>
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, textAlign: "center" as const, marginTop: 8, lineHeight: 1.5 }}>
          For personal awareness only. Not medical advice — always consult your doctor.
        </div>
      </div>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = "log" | "trends" | "insights" | "coach";

function DailyLogTab({ readings, onLog, onDelete, token, profile, onEditProfile }: { readings: HealthReading[]; onLog: (metric: string, val: string, val2?: string) => void; onDelete: (id: string) => void; token?: string | null; profile: HealthProfile | null; onEditProfile: () => void; }) {
  const { t } = useLanguage();
  const [active, setActive] = useState<typeof METRICS[0] | typeof BP_METRIC | typeof GLUCOSE_METRIC | typeof SLEEP_METRIC | null>(null);
  const [saving, setSaving] = useState(false);

  const latest: Record<string, HealthReading> = {};
  readings.forEach(r => { if (!latest[r.metric]) latest[r.metric] = r; });

  const handleSave = async (val: string, val2?: string) => {
    if (!active) return;
    setSaving(true);
    await onLog(active.key, val, val2);
    setSaving(false);
    setActive(null);
  };

  const glucoseVal = latest["glucose"] ? parseFloat(latest["glucose"].value) : null;
  const bpReading = latest["blood_pressure"];
  const sleepReadings = readings.filter(r => r.metric === "sleep_hours");

  return (
    <div style={{ padding: "0 20px 120px" }}>
      {hasProfile(profile) && <PersonalizedStatsCard profile={profile!} onEdit={onEditProfile} />}

      <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 14, marginTop: 4 }}>{t("health_quick_metrics")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {METRICS.map(m => (
          <MetricCard key={m.key} metric={m} reading={latest[m.key]} onTap={() => setActive(m)} />
        ))}
      </div>

      <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 14 }}>Sleep</div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🌙</span>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Sleep Duration</div>
          </div>
          <button onClick={() => setActive(SLEEP_METRIC as any)}
            style={{ fontSize: 11, color: C.teal, background: C.tealDim, border: `1px solid ${C.tealBorder}`, borderRadius: 8, padding: "4px 12px", cursor: "pointer" }}>
            + Log
          </button>
        </div>
        {sleepReadings.length > 0 ? <SleepChart readings={sleepReadings} /> : (
          <div style={{ textAlign: "center" as const, padding: "20px 0", color: C.textMuted, fontSize: 13 }}>Log sleep to see your 7-day chart</div>
        )}
      </div>

      <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 14 }}>{t("health_bp")}</div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: bpReading ? 14 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🩺</span>
            {bpReading ? (
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.violet }}>{parseFloat(bpReading.value).toFixed(0)}{bpReading.value2 ? `/${parseFloat(bpReading.value2).toFixed(0)}` : ""}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>mmHg · {timeAgo(bpReading.loggedAt)}</div>
              </div>
            ) : <div style={{ fontSize: 13, color: C.textMuted }}>No readings yet</div>}
          </div>
          <button onClick={() => setActive(BP_METRIC as any)}
            style={{ fontSize: 11, color: C.violet, background: C.violetDim, border: "1px solid rgba(124,106,255,0.22)", borderRadius: 8, padding: "4px 12px", cursor: "pointer" }}>
            + Log
          </button>
        </div>
      </div>

      <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 14 }}>{t("health_glucose")}</div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🩸</span>
            {glucoseVal ? (
              <div style={{ fontSize: 20, fontWeight: 700, color: "#f5c842" }}>{glucoseVal} <span style={{ fontSize: 12, fontWeight: 400 }}>mg/dL</span></div>
            ) : <div style={{ fontSize: 13, color: C.textMuted }}>No readings yet</div>}
          </div>
          <button onClick={() => setActive(GLUCOSE_METRIC as any)}
            style={{ fontSize: 11, color: "#f5c842", background: "rgba(245,200,66,0.10)", border: "1px solid rgba(245,200,66,0.22)", borderRadius: 8, padding: "4px 12px", cursor: "pointer" }}>
            + Log
          </button>
        </div>
        <GlucoseBar value={glucoseVal} />
      </div>

      <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px", marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <Wifi size={20} color={C.teal} style={{ flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3 }}>{t("health_wearable_t")}</div>
          <div style={{ fontSize: 12, color: C.textDim }}>Apple Health, Google Fit, boAt & Noise integration will auto-fill your daily readings.</div>
        </div>
      </div>

      <div style={{ background: C.roseDim, border: `1px solid ${C.roseBorder}`, borderRadius: 14, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <AlertCircle size={16} color={C.rose} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12, color: C.textDim, lineHeight: 1.7 }}>
          <strong style={{ color: C.text }}>{t("health_disclaimer_t")}</strong> {t("health_disclaimer_b")}
        </div>
      </div>

      <AnimatePresence>
        {active && (
          <LogModal metric={active as any} onClose={() => setActive(null)} onSave={handleSave} loading={saving} />
        )}
      </AnimatePresence>
    </div>
  );
}

function TrendsTab({ readings }: { readings: HealthReading[] }) {
  const { t } = useLanguage();
  const trendMetrics = [METRICS[0], METRICS[1], METRICS[2], METRICS[3]];
  const sleepReadings = readings.filter(r => r.metric === "sleep_hours");
  const hasSleep = sleepReadings.length > 0;

  return (
    <div style={{ padding: "0 20px 120px" }}>
      <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 14, marginTop: 4 }}>{t("health_trends_t")}</div>
      {trendMetrics.map(m => {
        const mReadings = readings.filter(r => r.metric === m.key);
        if (mReadings.length < 2) return (
          <div key={m.key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px", marginBottom: 10, display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 20 }}>{m.emoji}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{m.label}</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{t("health_min_readings")}</div>
            </div>
          </div>
        );
        return <TrendSparkline key={m.key} readings={mReadings} metric={m} />;
      })}
      {hasSleep ? (
        <>
          <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 14, marginTop: 8 }}>Sleep</div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 20 }}>🌙</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Sleep Duration</div>
            </div>
            <SleepChart readings={sleepReadings} />
          </div>
        </>
      ) : null}
    </div>
  );
}

function InsightsTab({ token }: { token?: string | null }) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [insufficient, setInsufficient] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch("/api/user/health/insights", { headers: { "x-user-token": token } })
      .then(r => r.json())
      .then(d => { if (d.insufficient) setInsufficient(true); else setInsights(d.insights || []); })
      .catch(() => setInsufficient(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 16 }}>
      <div style={{ fontSize: 32, animation: "prana-pulse 2s ease-in-out infinite" }}>🫀</div>
      <div style={{ color: C.textDim, fontSize: 14 }}>Reading your patterns…</div>
    </div>
  );

  if (insufficient) return (
    <div style={{ padding: "40px 24px", textAlign: "center" as const }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
      <div style={{ fontFamily: serif, fontSize: 20, color: C.text, marginBottom: 10 }}>Keep logging to unlock insights</div>
      <div style={{ fontSize: 14, color: C.textDim, lineHeight: 1.7, maxWidth: 300, margin: "0 auto 24px" }}>
        ARYA needs at least 3 readings across a few days to start noticing patterns.
      </div>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 10, maxWidth: 300, margin: "0 auto" }}>
        {[
          { icon: "❤️", text: "Heart rate elevated 4 days → connected to your mood" },
          { icon: "🌙", text: "Under 5.5hrs sleep = lower decision quality the next day" },
          { icon: "👟", text: "8,000 steps = measurably better mood score" },
          { icon: "🔗", text: "Your peak days require all three: sleep + HR + movement" },
        ].map((ex, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left" as const, opacity: 0.5 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{ex.icon}</span>
            <span style={{ fontSize: 12, color: C.textDim, lineHeight: 1.6 }}>{ex.text}</span>
          </div>
        ))}
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>These are examples of what ARYA will show once you start logging</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "0 20px 120px" }}>
      <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: 14, marginTop: 4 }}>
        Personal patterns — based on your data
      </div>
      {insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
      <div style={{ background: C.roseDim, border: `1px solid ${C.roseBorder}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start", marginTop: 16 }}>
        <AlertCircle size={14} color={C.rose} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.7 }}>These insights are for personal awareness only. ARYA does not diagnose or prescribe — always consult your doctor for medical concerns.</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PranaPage() {
  const [, setLocation] = useLocation();
  const { token, isLoggedIn, user } = useUserAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("log");
  const [readings, setReadings] = useState<HealthReading[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [healthProfile, setHealthProfile] = useState<HealthProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@keyframes prana-pulse{0%,100%{opacity:0.6}50%{opacity:1}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  const fetchReadings = useCallback(async () => {
    if (!token) { setLoadingData(false); return; }
    try {
      const r = await fetch("/api/user/health/readings?days=14", { headers: { "x-user-token": token } });
      if (r.ok) { const d = await r.json(); setReadings(d.readings || []); }
    } catch {}
    setLoadingData(false);
  }, [token]);

  const fetchProfile = useCallback(async () => {
    if (!token) { setProfileLoaded(true); return; }
    try {
      const r = await fetch("/api/user/health/profile", { headers: { "x-user-token": token } });
      if (r.ok) {
        const d = await r.json();
        const profile: HealthProfile = { heightCm: d.heightCm || null, weightKg: d.weightKg ? parseFloat(d.weightKg) : null, sex: d.sex || null, activityLevel: d.activityLevel || "moderate", age: d.age || null };
        setHealthProfile(profile);
      }
    } catch {}
    setProfileLoaded(true);
  }, [token]);

  useEffect(() => { fetchReadings(); fetchProfile(); }, [fetchReadings, fetchProfile]);

  const handleLog = useCallback(async (metric: string, value: string, value2?: string) => {
    if (!token) return;
    const res = await fetch("/api/user/health/readings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-token": token },
      body: JSON.stringify({ metric, value, value2: value2 || null }),
    });
    if (res.ok) { const d = await res.json(); setReadings(prev => [d.reading, ...prev]); }
  }, [token]);

  const handleDelete = useCallback(async (id: string) => {
    if (!token) return;
    await fetch(`/api/user/health/readings/${id}`, { method: "DELETE", headers: { "x-user-token": token } });
    setReadings(prev => prev.filter(r => r.id !== id));
  }, [token]);

  const tabs: Array<{ key: Tab; label: string; emoji: string }> = [
    { key: "log",      label: t("health_tab_log"),      emoji: "📋" },
    { key: "trends",   label: t("health_tab_trends"),   emoji: "📈" },
    { key: "insights", label: t("health_tab_insights"), emoji: "✨" },
    { key: "coach",    label: "Coach",                  emoji: "💬" },
  ];

  // ── Full-screen onboarding for first-time users ───────────────────────────
  if (profileLoaded && isLoggedIn && token && !hasProfile(healthProfile)) {
    return (
      <PranaOnboarding
        userName={user?.name || ""}
        token={token}
        onComplete={(p) => {
          setHealthProfile({ ...p, weightKg: p.weightKg, age: null });
        }}
      />
    );
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: sans, position: "relative" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(61,217,192,0.04) 0%, transparent 70%)" }} />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => setLocation("/")} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, fontFamily: sans }}>
            <ChevronLeft size={16} /> {t("health_back")}
          </button>
          <div style={{ textAlign: "center" as const }}>
            <div style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: C.teal, opacity: 0.8 }}>ARYA PRANA</div>
            <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.1em" }}>{t("health_subtitle")}</div>
          </div>
          <button onClick={() => setShowProfileSetup(true)} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <User size={13} color={hasProfile(healthProfile) ? C.teal : C.textDim} />
            <span style={{ fontSize: 11, color: hasProfile(healthProfile) ? C.teal : C.textDim, fontFamily: sans }}>Profile</span>
          </button>
        </div>

        {!isLoggedIn && (
          <div style={{ margin: "16px 20px", background: C.amberDim, border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: "12px 16px", fontSize: 13, color: C.textDim }}>
            {t("health_sign_in")}
          </div>
        )}

        <div style={{ display: "flex", gap: 5, padding: "16px 20px 0", overflowX: "auto" as const }}>
          {tabs.map(tb => (
            <button key={tb.key} onClick={() => setTab(tb.key)} data-testid={`prana-tab-${tb.key}`}
              style={{ flex: "none", padding: "9px 12px", borderRadius: 10, border: `1.5px solid ${tab === tb.key ? C.tealBorder : C.border}`, background: tab === tb.key ? C.tealDim : "transparent", color: tab === tb.key ? C.teal : C.textDim, fontSize: 11, fontWeight: tab === tb.key ? 700 : 400, cursor: "pointer", transition: "all 0.2s", fontFamily: sans, letterSpacing: "0.02em", whiteSpace: "nowrap" as const, display: "flex", alignItems: "center", gap: 5 }}>
              <span>{tb.emoji}</span> {tb.label}
            </button>
          ))}
        </div>

        <div style={{ height: 16 }} />

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
            {tab === "log"      && <DailyLogTab readings={readings} onLog={handleLog} onDelete={handleDelete} token={token} profile={healthProfile} onEditProfile={() => setShowProfileSetup(true)} />}
            {tab === "trends"   && <TrendsTab readings={readings} />}
            {tab === "insights" && <InsightsTab token={token} />}
            {tab === "coach"    && <CoachTab token={token} profile={healthProfile} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showProfileSetup && profileLoaded && (
          <ProfileSetupModal
            token={token}
            onSave={(p) => { setHealthProfile(p); setShowProfileSetup(false); }}
            onSkip={() => setShowProfileSetup(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
