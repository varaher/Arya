import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useUserAuth } from "@/lib/user-auth";
import { useLanguage } from "@/lib/language-context";
import { X, Loader2, Trash2, ChevronLeft, Wifi, AlertCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";

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

// ── Types ─────────────────────────────────────────────────────────────────────
interface HealthReading { id: string; metric: string; value: string; value2?: string | null; unit?: string | null; loggedAt: string; }
interface Insight { type: "positive" | "caution" | "flag" | "correlation" | "neutral"; icon: string; title: string; body: string; tip?: string | null; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 1) return "just now";
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}
function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return d.toISOString().slice(0, 10);
  });
}

// ── LogModal ──────────────────────────────────────────────────────────────────
function LogModal({ metric, onClose, onSave, loading }: {
  metric: typeof METRICS[0]; onClose: () => void; onSave: (v: string, v2?: string) => void; loading: boolean;
}) {
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
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", padding: 6 }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
          <input
            autoFocus type="number" value={val} onChange={e => setVal(e.target.value)}
            placeholder={isBP ? "Systolic" : `Enter ${metric.label.toLowerCase()}`}
            style={{ flex: 1, background: C.surface2, border: `1.5px solid ${val ? metric.border : C.border2}`, borderRadius: 14, padding: "16px", fontSize: 24, fontWeight: 700, color: metric.color, fontFamily: sans, outline: "none", textAlign: "center" as const }}
            min={metric.min} max={metric.max}
          />
          {isBP && (
            <input type="number" value={val2} onChange={e => setVal2(e.target.value)} placeholder="Diastolic"
              style={{ flex: 1, background: C.surface2, border: `1.5px solid ${val2 ? metric.border : C.border2}`, borderRadius: 14, padding: "16px", fontSize: 24, fontWeight: 700, color: metric.color, fontFamily: sans, outline: "none", textAlign: "center" as const }}
            />
          )}
        </div>
        <button onClick={() => val && onSave(val, val2 || undefined)} disabled={!val || loading}
          style={{ width: "100%", padding: "16px", borderRadius: 14, border: "none", background: val ? `linear-gradient(135deg, ${metric.color}, ${metric.color}bb)` : C.border2, color: val ? "#08080e" : C.textDim, fontSize: 15, fontWeight: 700, cursor: val ? "pointer" : "not-allowed", fontFamily: sans, transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : "Save reading"}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── BP & Glucose modals ───────────────────────────────────────────────────────
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22 }}>{metric.emoji}</span>
        {warn && <span style={{ fontSize: 9, color: metric.color, background: metric.bg, border: `1px solid ${metric.border}`, borderRadius: 6, padding: "2px 6px", letterSpacing: "0.08em" }}>NOTE</span>}
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.textDim, letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 3 }}>{metric.label}</div>
        {reading ? (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: metric.color, lineHeight: 1 }}>
              {parseFloat(reading.value).toFixed(metric.decimals)}{metric.unit && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 3 }}>{metric.unit}</span>}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{timeAgo(reading.loggedAt)}</div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>Tap to log</div>
        )}
      </div>
    </button>
  );
}

// ── Sleep Bar Chart ───────────────────────────────────────────────────────────
function SleepChart({ readings }: { readings: HealthReading[] }) {
  const days = last7Days();
  const byDay: Record<string, number> = {};
  readings.forEach(r => { const d = r.loggedAt.slice(0, 10); if (!byDay[d]) byDay[d] = parseFloat(r.value); });
  const vals = days.map(d => byDay[d] ?? null);
  const maxVal = Math.max(9, ...vals.filter(Boolean) as number[]);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
      {vals.map((v, i) => {
        const h = v ? Math.round((v / maxVal) * 72) : 4;
        const color = !v ? C.border : v < 5.5 ? C.amber : v >= 7 ? C.teal : "#8fa0b8";
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 4 }}>
            <div style={{ fontSize: 9, color: v ? color : C.textMuted, fontWeight: 600 }}>{v ? v.toFixed(1) : ""}</div>
            <div style={{ width: "100%", height: h, borderRadius: 4, background: color, opacity: v ? 1 : 0.25, transition: "height 0.3s" }} />
            <div style={{ fontSize: 9, color: C.textMuted, letterSpacing: "0.04em" }}>{SLEEP_DAYS[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── Glucose Range Bar ─────────────────────────────────────────────────────────
function GlucoseBar({ value }: { value: number | null }) {
  const zones = [
    { label: "Low", max: 70,  color: C.violet },
    { label: "Normal", max: 99, color: C.teal },
    { label: "Pre-diabetic", max: 125, color: C.amber },
    { label: "High", max: 300, color: C.rose },
  ];
  const pos = value ? Math.min(100, Math.max(0, ((value - 40) / 260) * 100)) : null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ position: "relative", height: 10, borderRadius: 5, background: `linear-gradient(to right, ${C.violet}, ${C.teal}, ${C.amber}, ${C.rose})`, marginBottom: 6 }}>
        {pos !== null && (
          <div style={{ position: "absolute", top: -3, left: `${pos}%`, transform: "translateX(-50%)", width: 16, height: 16, borderRadius: "50%", background: "white", border: `2px solid ${C.surface}`, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }} />
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {zones.map(z => <span key={z.label} style={{ fontSize: 9, color: C.textMuted }}>{z.label}</span>)}
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
  const pts = vals.map((v, i) => v !== null ? `${(i / 6) * W},${H - ((v - min) / range) * (H - 8) - 4}` : null).filter(Boolean) as string[];
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

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = "log" | "trends" | "insights";

function DailyLogTab({ readings, onLog, onDelete, token }: { readings: HealthReading[]; onLog: (metric: string, val: string, val2?: string) => void; onDelete: (id: string) => void; token?: string | null }) {
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
                <div style={{ fontSize: 20, fontWeight: 700, color: C.violet }}>
                  {parseFloat(bpReading.value).toFixed(0)}{bpReading.value2 ? `/${parseFloat(bpReading.value2).toFixed(0)}` : ""}
                </div>
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
      .then(d => {
        if (d.insufficient) setInsufficient(true);
        else setInsights(d.insights || []);
      })
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
        ARYA needs at least 3 readings across a few days to start noticing patterns. Log your first readings in the Daily Log tab.
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
  const { token, isLoggedIn } = useUserAuth();
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("log");
  const [readings, setReadings] = useState<HealthReading[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@keyframes prana-pulse{0%,100%{opacity:0.6}50%{opacity:1}}`;
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

  useEffect(() => { fetchReadings(); }, [fetchReadings]);

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

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "log", label: t("health_tab_log") },
    { key: "trends", label: t("health_tab_trends") },
    { key: "insights", label: t("health_tab_insights") },
  ];

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
          <div style={{ width: 60 }} />
        </div>

        {!isLoggedIn && (
          <div style={{ margin: "16px 20px", background: C.amberDim, border: `1px solid ${C.amberBorder}`, borderRadius: 12, padding: "12px 16px", fontSize: 13, color: C.textDim }}>
            {t("health_sign_in")}
          </div>
        )}

        <div style={{ display: "flex", gap: 6, padding: "16px 20px 0" }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} data-testid={`prana-tab-${t.key}`}
              style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: `1.5px solid ${tab === t.key ? C.tealBorder : C.border}`, background: tab === t.key ? C.tealDim : "transparent", color: tab === t.key ? C.teal : C.textDim, fontSize: 11, fontWeight: tab === t.key ? 700 : 400, cursor: "pointer", transition: "all 0.2s", fontFamily: sans, letterSpacing: "0.02em" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ height: 16 }} />

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}>
            {tab === "log" && <DailyLogTab readings={readings} onLog={handleLog} onDelete={handleDelete} token={token} />}
            {tab === "trends" && <TrendsTab readings={readings} />}
            {tab === "insights" && <InsightsTab token={token} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  );
}
