import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Palette (matches PranaPage dark-green theme) ───────────────────────────
const G = {
  bg:          "#060d0a",
  surface:     "#0d1a14",
  surface2:    "#132010",
  green:       "#22c55e",
  greenDim:    "rgba(34,197,94,0.10)",
  greenBorder: "rgba(34,197,94,0.28)",
  greenGlow:   "rgba(34,197,94,0.18)",
  teal:        "#2dd4bf",
  text:        "#e8f0ec",
  textDim:     "#8aab96",
  textMuted:   "#4d7a60",
  border:      "#1a2e20",
  border2:     "#22382a",
};
const serif = "'Cormorant Garamond', 'Georgia', serif";
const sans  = "'Inter', sans-serif";

// ── Progress dots ─────────────────────────────────────────────────────────
function Dots({ total, current }: { total: number; current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          animate={{ width: i === current ? 24 : 7, opacity: i <= current ? 1 : 0.28, background: i <= current ? G.green : G.textMuted }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          style={{ height: 7, borderRadius: 4 }}
        />
      ))}
    </div>
  );
}

// ── Sex chip ──────────────────────────────────────────────────────────────
function SexChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        flex: 1, padding: "12px 8px", borderRadius: 12,
        border: `1.5px solid ${selected ? G.greenBorder : G.border2}`,
        background: selected ? G.greenDim : G.surface,
        color: selected ? G.green : G.textDim,
        fontSize: 13, fontWeight: selected ? 700 : 400,
        fontFamily: sans, cursor: "pointer", transition: "all 0.2s",
      }}>
      {label}
    </button>
  );
}

// ── Activity card ─────────────────────────────────────────────────────────
const ACTIVITIES = [
  { key: "sedentary",   emoji: "🪑", label: "Mostly sitting",     desc: "Desk work, low movement" },
  { key: "light",       emoji: "🚶", label: "Lightly active",     desc: "Walking, light errands" },
  { key: "moderate",    emoji: "🏃", label: "Moderately active",  desc: "Exercise 3–5×/week" },
  { key: "active",      emoji: "🏋️", label: "Very active",        desc: "Daily intense training" },
  { key: "very_active", emoji: "⚡", label: "Extremely active",   desc: "Physical job or athlete" },
];

// ── Goal options ──────────────────────────────────────────────────────────
const GOALS = [
  { key: "sleep",    emoji: "🌙", label: "Better sleep" },
  { key: "stress",   emoji: "🧘", label: "Manage stress" },
  { key: "vitals",   emoji: "❤️", label: "Track vitals" },
  { key: "weight",   emoji: "⚖️", label: "Weight journey" },
  { key: "aware",    emoji: "🔍", label: "Stay aware" },
  { key: "energy",   emoji: "⚡", label: "More energy" },
];

// ── Shared CTA button ─────────────────────────────────────────────────────
function PrimaryBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: "100%", padding: "17px", borderRadius: 16, border: "none",
        background: disabled ? G.border2 : `linear-gradient(135deg, ${G.green}, ${G.teal})`,
        color: disabled ? G.textMuted : "#06100a",
        fontSize: 16, fontWeight: 800, fontFamily: sans,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.2s", boxShadow: disabled ? "none" : `0 4px 24px ${G.greenGlow}`,
        marginBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
      {label}
    </button>
  );
}

// ── Screen wrapper ────────────────────────────────────────────────────────
function Screen({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column", flex: 1 }}
    >
      {children}
    </motion.div>
  );
}

// ── Pulse ring animation style ────────────────────────────────────────────
const pulseStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
  @keyframes prana-ring { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.18);opacity:0} }
  @keyframes prana-leaf  { 0%,100%{transform:scale(1) rotate(-3deg)} 50%{transform:scale(1.08) rotate(3deg)} }
`;

// ── Props ─────────────────────────────────────────────────────────────────
interface Props {
  userName: string;
  token: string;
  onComplete: (profile: { heightCm: number; weightKg: number; sex: string; activityLevel: string; age?: number }) => void;
}

// ── Main component ────────────────────────────────────────────────────────
export default function PranaOnboarding({ userName, token, onComplete }: Props) {
  const [screen, setScreen] = useState(0);
  const [height, setHeight]   = useState("");
  const [weight, setWeight]   = useState("");
  const [sex, setSex]         = useState("");
  const [activity, setActivity] = useState("");
  const [goals, setGoals]     = useState<string[]>([]);
  const [saving, setSaving]   = useState(false);

  const firstName = userName?.split(" ")[0] || "you";
  const initial   = (firstName[0] || "A").toUpperCase();

  const TOTAL = 6;

  async function finish() {
    if (saving) return;
    setSaving(true);
    try {
      await fetch("/api/user/health/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({
          heightCm:      parseInt(height),
          weightKg:      parseFloat(weight),
          sex,
          activityLevel: activity || "moderate",
          healthGoals:   goals,
        }),
      });
      onComplete({
        heightCm:      parseInt(height),
        weightKg:      parseFloat(weight),
        sex,
        activityLevel: activity || "moderate",
      });
    } catch {}
    setSaving(false);
  }

  const canMetrics  = height.trim() !== "" && weight.trim() !== "" && sex !== "";
  const canActivity = activity !== "";
  const canGoals    = goals.length > 0;

  function toggleGoal(key: string) {
    setGoals(prev => prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]);
  }

  return (
    <>
      <style>{pulseStyle}</style>
      <div style={{
        position: "fixed", inset: 0, background: G.bg, zIndex: 300,
        display: "flex", flexDirection: "column",
        fontFamily: sans, color: G.text,
        paddingBottom: "max(24px, env(safe-area-inset-bottom))",
      }}>
        {/* Header — dots + skip */}
        <div style={{ padding: "56px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Dots total={TOTAL} current={screen} />
          {screen < 5 && (
            <button onClick={() => setScreen(5)}
              style={{ background: "none", border: "none", color: G.textMuted, fontSize: 12, cursor: "pointer", fontFamily: sans }}>
              Skip
            </button>
          )}
        </div>

        {/* Screens */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
          <AnimatePresence mode="wait">

            {/* ── Screen 0: Welcome ─────────────────────────────────── */}
            {screen === 0 && (
              <Screen key="s0">
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: 48, paddingBottom: 32 }}>
                  {/* Pulsing heart */}
                  <div style={{ position: "relative", marginBottom: 36 }}>
                    <div style={{ position: "absolute", inset: -16, borderRadius: "50%", background: G.greenGlow, animation: "prana-ring 2.4s ease-in-out infinite" }} />
                    <div style={{ position: "absolute", inset: -8, borderRadius: "50%", background: G.greenDim, animation: "prana-ring 2.4s ease-in-out 0.8s infinite" }} />
                    <div style={{ width: 96, height: 96, borderRadius: "50%", background: G.surface2, border: `2px solid ${G.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, position: "relative" }}>
                      🫀
                    </div>
                  </div>
                  <div style={{ fontSize: 36, fontFamily: serif, fontWeight: 600, color: G.text, lineHeight: 1.25, marginBottom: 18 }}>
                    Your body tells<br />a story.
                  </div>
                  <div style={{ fontSize: 18, fontFamily: serif, fontStyle: "italic", color: G.green, lineHeight: 1.5, marginBottom: 8 }}>
                    ARYA listens to it.
                  </div>
                  <div style={{ fontSize: 13, color: G.textDim, lineHeight: 1.7, maxWidth: 280, marginTop: 16 }}>
                    A health companion that reads your vitals, notices your patterns, and coaches you — personally.
                  </div>
                </div>
              </Screen>
            )}

            {/* ── Screen 1: Name ────────────────────────────────────── */}
            {screen === 1 && (
              <Screen key="s1">
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: 48, paddingBottom: 32 }}>
                  {/* Initial circle */}
                  <div style={{ position: "relative", marginBottom: 32 }}>
                    <div style={{ position: "absolute", inset: -10, borderRadius: "50%", background: G.greenDim, animation: "prana-ring 2.8s ease-in-out infinite" }} />
                    <div style={{ width: 88, height: 88, borderRadius: "50%", background: `linear-gradient(135deg, ${G.green}33, ${G.teal}22)`, border: `2px solid ${G.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <span style={{ fontSize: 36, fontFamily: serif, fontWeight: 700, color: G.green }}>{initial}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 32, fontFamily: serif, fontWeight: 600, color: G.text, lineHeight: 1.3, marginBottom: 12 }}>
                    We'll call you
                  </div>
                  <div style={{ fontSize: 40, fontFamily: serif, fontWeight: 700, color: G.green, marginBottom: 20 }}>
                    {firstName}.
                  </div>
                  <div style={{ fontSize: 14, color: G.textDim, lineHeight: 1.7, maxWidth: 260 }}>
                    Everything ARYA learns about your health stays private to you — always.
                  </div>
                </div>
              </Screen>
            )}

            {/* ── Screen 2: Body metrics ────────────────────────────── */}
            {screen === 2 && (
              <Screen key="s2">
                <div style={{ paddingTop: 36, paddingBottom: 24 }}>
                  <div style={{ fontSize: 30, fontFamily: serif, fontWeight: 600, color: G.text, lineHeight: 1.3, marginBottom: 8 }}>
                    Tell me about<br />your body.
                  </div>
                  <div style={{ fontSize: 13, color: G.textDim, marginBottom: 32, lineHeight: 1.6 }}>
                    Only used to personalise your health insights.
                  </div>

                  {/* Height + Weight row */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: G.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Height</div>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number" value={height} onChange={e => setHeight(e.target.value)}
                          placeholder="170"
                          data-testid="prana-onboard-height"
                          style={{
                            width: "100%", background: G.surface2, border: `1.5px solid ${height ? G.greenBorder : G.border2}`,
                            borderRadius: 14, padding: "16px 44px 16px 16px", fontSize: 22, fontWeight: 700,
                            color: height ? G.green : G.textDim, fontFamily: sans, outline: "none",
                            boxSizing: "border-box", appearance: "textfield",
                          }}
                        />
                        <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: G.textMuted }}>cm</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: G.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Weight</div>
                      <div style={{ position: "relative" }}>
                        <input
                          type="number" value={weight} onChange={e => setWeight(e.target.value)}
                          placeholder="68"
                          data-testid="prana-onboard-weight"
                          style={{
                            width: "100%", background: G.surface2, border: `1.5px solid ${weight ? G.greenBorder : G.border2}`,
                            borderRadius: 14, padding: "16px 44px 16px 16px", fontSize: 22, fontWeight: 700,
                            color: weight ? G.green : G.textDim, fontFamily: sans, outline: "none",
                            boxSizing: "border-box", appearance: "textfield",
                          }}
                        />
                        <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: G.textMuted }}>kg</span>
                      </div>
                    </div>
                  </div>

                  {/* Sex chips */}
                  <div style={{ fontSize: 10, color: G.textMuted, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Biological sex</div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                    <SexChip label="Male"   selected={sex === "male"}   onClick={() => setSex("male")} />
                    <SexChip label="Female" selected={sex === "female"} onClick={() => setSex("female")} />
                    <SexChip label="Other"  selected={sex === "other"}  onClick={() => setSex("other")} />
                  </div>

                  <div style={{ fontSize: 11, color: G.textMuted, lineHeight: 1.6, marginBottom: 8 }}>
                    🔒 Used only to calculate BMI, calories, and step goals. Never shared.
                  </div>
                </div>
              </Screen>
            )}

            {/* ── Screen 3: Activity ────────────────────────────────── */}
            {screen === 3 && (
              <Screen key="s3">
                <div style={{ paddingTop: 36, paddingBottom: 24 }}>
                  <div style={{ fontSize: 30, fontFamily: serif, fontWeight: 600, color: G.text, lineHeight: 1.3, marginBottom: 8 }}>
                    How active are<br />you day to day?
                  </div>
                  <div style={{ fontSize: 13, color: G.textDim, marginBottom: 28, lineHeight: 1.6 }}>
                    ARYA calibrates your step goals and calorie needs from this.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {ACTIVITIES.map(a => (
                      <button key={a.key} onClick={() => setActivity(a.key)}
                        data-testid={`prana-onboard-activity-${a.key}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          background: activity === a.key ? G.greenDim : G.surface,
                          border: `1.5px solid ${activity === a.key ? G.greenBorder : G.border2}`,
                          borderRadius: 14, padding: "14px 16px", cursor: "pointer",
                          transition: "all 0.2s", textAlign: "left",
                        }}>
                        <span style={{ fontSize: 24, flexShrink: 0 }}>{a.emoji}</span>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: activity === a.key ? 700 : 400, color: activity === a.key ? G.green : G.text, fontFamily: sans }}>{a.label}</div>
                          <div style={{ fontSize: 11, color: G.textMuted, marginTop: 1 }}>{a.desc}</div>
                        </div>
                        {activity === a.key && (
                          <div style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: G.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ fontSize: 10, color: "#06100a", fontWeight: 800 }}>✓</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </Screen>
            )}

            {/* ── Screen 4: Health goals (multi-select) ────────────── */}
            {screen === 4 && (
              <Screen key="s4">
                <div style={{ paddingTop: 36, paddingBottom: 24 }}>
                  <div style={{ fontSize: 30, fontFamily: serif, fontWeight: 600, color: G.text, lineHeight: 1.3, marginBottom: 8 }}>
                    What matters<br />to you?
                  </div>
                  <div style={{ fontSize: 13, color: G.textDim, marginBottom: 6, lineHeight: 1.6 }}>
                    Pick all that apply.
                  </div>
                  <div style={{ fontSize: 12, color: canGoals ? G.green : G.textMuted, marginBottom: 24, fontWeight: canGoals ? 600 : 400, minHeight: 18, transition: "color 0.2s" }}>
                    {canGoals ? `${goals.length} selected` : "Be honest with yourself."}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {GOALS.map(g => {
                      const sel = goals.includes(g.key);
                      return (
                        <button key={g.key} onClick={() => toggleGoal(g.key)}
                          data-testid={`prana-onboard-goal-${g.key}`}
                          style={{
                            position: "relative",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            gap: 8, padding: "20px 12px",
                            background: sel ? G.greenDim : G.surface,
                            border: `1.5px solid ${sel ? G.greenBorder : G.border2}`,
                            borderRadius: 16, cursor: "pointer", transition: "all 0.2s",
                          }}>
                          {sel && (
                            <div style={{ position: "absolute", top: 8, right: 8, width: 16, height: 16, borderRadius: "50%", background: G.green, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 9, color: "#06100a", fontWeight: 900, lineHeight: 1 }}>✓</span>
                            </div>
                          )}
                          <span style={{ fontSize: 28 }}>{g.emoji}</span>
                          <div style={{ fontSize: 12, fontWeight: sel ? 700 : 400, color: sel ? G.green : G.textDim, fontFamily: sans, textAlign: "center" }}>{g.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Screen>
            )}

            {/* ── Screen 5: Ready ───────────────────────────────────── */}
            {screen === 5 && (
              <Screen key="s5">
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", paddingTop: 48, paddingBottom: 32 }}>
                  {/* Glowing leaf */}
                  <div style={{ position: "relative", marginBottom: 36 }}>
                    <div style={{ position: "absolute", inset: -20, borderRadius: "50%", background: G.greenGlow, animation: "prana-ring 3s ease-in-out infinite" }} />
                    <div style={{ width: 104, height: 104, borderRadius: "50%", background: G.surface2, border: `2px solid ${G.greenBorder}`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                      <span style={{ fontSize: 48, display: "inline-block", animation: "prana-leaf 3.5s ease-in-out infinite" }}>🌿</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 34, fontFamily: serif, fontWeight: 600, color: G.text, lineHeight: 1.25, marginBottom: 14 }}>
                    ARYA is ready to<br />look after you,
                  </div>
                  <div style={{ fontSize: 42, fontFamily: serif, fontWeight: 700, color: G.green, marginBottom: 20 }}>
                    {firstName}.
                  </div>
                  <div style={{ fontSize: 13, color: G.textDim, lineHeight: 1.75, maxWidth: 280 }}>
                    Log your vitals. Track patterns. Ask anything about your health — ARYA remembers what matters.
                  </div>
                </div>
              </Screen>
            )}

          </AnimatePresence>
        </div>

        {/* CTA footer */}
        <div style={{ padding: "0 24px 8px" }}>
          {screen === 0 && <PrimaryBtn label="Begin →" onClick={() => setScreen(1)} />}
          {screen === 1 && <PrimaryBtn label="That's me →" onClick={() => setScreen(2)} />}
          {screen === 2 && <PrimaryBtn label="Continue →" onClick={() => setScreen(3)} disabled={!canMetrics} />}
          {screen === 3 && <PrimaryBtn label="Continue →" onClick={() => setScreen(4)} disabled={!canActivity} />}
          {screen === 4 && (
            <>
              <PrimaryBtn label="Continue →" onClick={() => setScreen(5)} disabled={!canGoals} />
              {!canGoals && (
                <button onClick={() => setScreen(5)}
                  style={{ width: "100%", padding: "12px", border: "none", background: "none", color: G.textMuted, fontSize: 12, cursor: "pointer", fontFamily: sans, marginTop: 4 }}>
                  Skip this step
                </button>
              )}
            </>
          )}
          {screen === 5 && <PrimaryBtn label={saving ? "Setting up…" : "Open Prana →"} onClick={finish} disabled={saving} />}
        </div>
      </div>
    </>
  );
}
