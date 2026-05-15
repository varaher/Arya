import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Share2 } from "lucide-react";
import { useUserAuth } from "@/lib/user-auth";
import BottomNav from "@/components/BottomNav";

const P = {
  bg: "#fdf6ec",
  surface: "#fffaf3",
  surface2: "#f5e8d0",
  border: "#e4cfa8",
  borderLight: "#eedfbf",
  gold: "#8a6820",
  goldLight: "#b8902e",
  text: "#261808",
  body: "#3d2810",
  muted: "#7a6048",
  steel: "#9a8060",
  green: "#266040",
  greenBg: "rgba(38,96,64,0.08)",
  darkCard: "#140e04",
  darkBorder: "#2e2010",
  darkGold: "#d4a853",
  darkCream: "#f0e8d5",
  darkMuted: "#7a6848",
};

interface DayMood {
  day: string;
  dayShort: string;
  mood: number;
  energy: number;
  emoji: string;
  hasData: boolean;
}

interface WeeklyLetterData {
  weekLabel: string;
  userName: string;
  headline: string;
  moodArc: {
    days: DayMood[];
    aryaRead: string;
    avgMood: number;
    checkInCount: number;
  };
  goals: {
    total: number;
    active: number;
    activeThisWeek: number;
    bestStreak: { title: string; count: number } | null;
    items: { id: string; title: string; progress: number; streak: number; activeThisWeek: boolean }[];
  };
  aryaNoticed: { insight: string; confidence: string };
  businessRecap: {
    sessions: { id: number; sessionType: string; philosopher: string | null; title: string | null; createdAt: string }[];
    hasData: boolean;
  };
  cosmicWeek: { name: string; summary: string; nextHint: string; stars: number };
  aryaQuestion: string;
  intentionChips: string[];
  savedIntention?: string;
}

function buildSmoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  const t = 0.38;
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) * t;
    const cp1y = p1[1] + (p2[1] - p0[1]) * t;
    const cp2x = p2[0] - (p3[0] - p1[0]) * t;
    const cp2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function MoodArcSVG({ days }: { days: DayMood[] }) {
  const W = 300, H = 54;
  const dayW = W / 7;
  const getY = (mood: number) => H - ((mood - 1) / 4) * (H - 12) - 6;

  const curvePoints: [number, number][] = days
    .map((d, i) => d.hasData ? [i * dayW + dayW / 2, getY(d.mood)] as [number, number] : null)
    .filter(Boolean) as [number, number][];

  const curvePath = buildSmoothPath(curvePoints);
  const first = curvePoints[0];
  const last = curvePoints[curvePoints.length - 1];

  return (
    <svg
      width="100%"
      height={H + 22}
      viewBox={`-2 -8 ${W + 4} ${H + 30}`}
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="wrmf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.goldLight} stopOpacity="0.22" />
          <stop offset="100%" stopColor={P.goldLight} stopOpacity="0" />
        </linearGradient>
      </defs>
      {curvePath && first && last && (
        <>
          <path
            d={`${curvePath} L ${last[0].toFixed(1)} ${H} L ${first[0].toFixed(1)} ${H} Z`}
            fill="url(#wrmf)"
          />
          <path d={curvePath} fill="none" stroke={P.goldLight} strokeWidth={2} strokeLinecap="round" />
        </>
      )}
      {days.map((day, i) => {
        const x = i * dayW + dayW / 2;
        const y = day.hasData ? getY(day.mood) : H / 2;
        return (
          <g key={i}>
            {day.hasData ? (
              <>
                {day.emoji && (
                  <text x={x} y={y - 9} textAnchor="middle" fontSize={15} style={{ userSelect: "none" }}>
                    {day.emoji}
                  </text>
                )}
                <circle cx={x} cy={y} r={4} fill={P.goldLight} stroke={P.bg} strokeWidth={1.5} />
              </>
            ) : (
              <circle cx={x} cy={y} r={3} fill={P.borderLight} />
            )}
            <text x={x} y={H + 18} textAnchor="middle" fontSize={10} fill={P.steel} fontFamily="Inter, sans-serif">
              {day.dayShort[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SLabel({ text }: { text: string }) {
  return (
    <div style={{ fontSize: 10, letterSpacing: "0.14em", color: P.steel, textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
      {text}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: P.borderLight, margin: "28px 0" }} />;
}

const SESSION_LABELS: Record<string, string> = {
  decision: "Help me decide",
  stress_test: "Stress-testing a plan",
  people: "People situation",
  think_out_loud: "Thinking out loud",
};

const PHILOSOPHER_NAMES: Record<string, string> = {
  chanakya: "Chanakya",
  vidura: "Vidura",
  thiruvalluvar: "Thiruvalluvar",
  krishna: "Krishna",
  shukra: "Shukracharya",
};

export default function WeeklyReviewPage() {
  const [, setLocation] = useLocation();
  const { token } = useUserAuth();

  const [data, setData] = useState<WeeklyLetterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [questionAnswer, setQuestionAnswer] = useState("");
  const [answerSaved, setAnswerSaved] = useState(false);
  const [savingAnswer, setSavingAnswer] = useState(false);

  const [selectedChip, setSelectedChip] = useState("");
  const [customIntention, setCustomIntention] = useState("");
  const [intentionSaved, setIntentionSaved] = useState(false);
  const [savingIntention, setSavingIntention] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch {} };
  }, []);

  useEffect(() => {
    if (!token) { setLoading(false); setError("not_authed"); return; }
    fetch("/api/review/weekly", { headers: { "x-user-token": token } })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: WeeklyLetterData) => {
        setData(d);
        if (d.savedIntention) setSelectedChip(d.savedIntention);
        setLoading(false);
      })
      .catch(() => { setError("load_failed"); setLoading(false); });
  }, [token]);

  const saveAnswer = async () => {
    if (!token || !data || !questionAnswer.trim() || savingAnswer) return;
    setSavingAnswer(true);
    await fetch("/api/review/answer", {
      method: "POST",
      headers: { "x-user-token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ question: data.aryaQuestion, answer: questionAnswer }),
    }).catch(() => {});
    setAnswerSaved(true);
    setSavingAnswer(false);
  };

  const saveIntention = async () => {
    const intention = customIntention.trim() || selectedChip;
    if (!token || !intention || savingIntention) return;
    setSavingIntention(true);
    await fetch("/api/review/intention", {
      method: "POST",
      headers: { "x-user-token": token, "Content-Type": "application/json" },
      body: JSON.stringify({ intention }),
    }).catch(() => {});
    setIntentionSaved(true);
    setSavingIntention(false);
  };

  const handleShare = () => {
    if (!data) return;
    const text = `"${data.headline}"\n\n— My week with ARYA\n${data.weekLabel}`;
    if (navigator.share) {
      navigator.share({ title: "My Sunday Review", text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  const intentionValue = customIntention.trim() || selectedChip;

  return (
    <div style={{ minHeight: "100dvh", background: P.bg, color: P.body, fontFamily: "Inter, sans-serif", paddingBottom: 68 }}>
      <style>{`
        @keyframes wr-spin { to { transform: rotate(360deg); } }
        .wr-spin { animation: wr-spin 0.8s linear infinite; }
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        textarea:focus, input:focus { outline: none; }
        button { font-family: Inter, sans-serif; }
      `}</style>

      {/* ── Sticky Nav ─────────────────────────────────────── */}
      <div style={{ position: "sticky", top: 0, background: P.bg, borderBottom: `1px solid ${P.borderLight}`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, zIndex: 10 }}>
        <button
          data-testid="button-review-back"
          onClick={() => setLocation("/")}
          style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${P.border}`, background: "transparent", color: P.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <ArrowLeft size={15} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 14, color: P.gold, fontWeight: 700, lineHeight: 1.2 }}>
            Sunday Review
          </div>
          {data && (
            <div style={{ fontSize: 10, color: P.steel, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {data.weekLabel}
            </div>
          )}
        </div>
        {data && (
          <button
            data-testid="button-review-share"
            onClick={handleShare}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: `1px solid ${P.gold}`, background: "transparent", color: P.gold, fontSize: 12, cursor: "pointer", fontWeight: 600 }}
          >
            <Share2 size={12} /> Share
          </button>
        )}
      </div>

      {/* ── Loading ─────────────────────────────────────────── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "72vh", gap: 14 }}>
          <div style={{ fontSize: 36 }}>🌿</div>
          <div style={{ fontSize: 14, color: P.muted }}>ARYA is reading your week…</div>
          <Loader2 size={18} color={P.gold} className="wr-spin" />
        </div>
      )}

      {/* ── Not authenticated ───────────────────────────────── */}
      {!loading && error === "not_authed" && (
        <div style={{ padding: "60px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 15, color: P.text, marginBottom: 8, fontWeight: 600 }}>Sign in to see your Sunday Review</div>
          <div style={{ fontSize: 13, color: P.muted }}>Your personal weekly letter from ARYA lives here.</div>
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────── */}
      {!loading && error === "load_failed" && (
        <div style={{ padding: "60px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 15, color: P.text, marginBottom: 18, fontWeight: 600 }}>Couldn't load your review</div>
          <button
            onClick={() => { setError(""); setLoading(true); window.location.reload(); }}
            style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${P.gold}`, background: "transparent", color: P.gold, fontSize: 13, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      )}

      {/* ── The Letter ──────────────────────────────────────── */}
      {!loading && data && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ padding: "0 20px 80px", maxWidth: 520, margin: "0 auto" }}
        >

          {/* Header */}
          <div style={{ padding: "28px 0 24px", textAlign: "center" }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🌿</div>
            <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 11, color: P.muted, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 4 }}>
              ARYA's Sunday Letter
            </div>
            <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 27, color: P.text, fontWeight: 700, marginBottom: 4 }}>
              to {data.userName}
            </div>
            <div style={{ fontSize: 11, color: P.steel, letterSpacing: "0.06em", marginBottom: 22 }}>
              {data.weekLabel}
            </div>
            <div style={{ width: 52, height: 1.5, background: `linear-gradient(90deg, transparent, ${P.gold}, transparent)`, margin: "0 auto 22px" }} />
            <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 16, color: P.body, lineHeight: 1.74, fontStyle: "italic", maxWidth: 340, margin: "0 auto" }}>
              "{data.headline}"
            </div>
          </div>

          <Divider />

          {/* ── Mood Arc ───────────────────────────────────── */}
          <div>
            <SLabel text="Your week in mood" />
            {data.moodArc.checkInCount === 0 ? (
              <div style={{ background: P.surface2, borderRadius: 10, padding: "16px 18px", textAlign: "center", fontSize: 13, color: P.steel, lineHeight: 1.6 }}>
                No mood check-ins this week.<br />Start tomorrow — it takes 10 seconds.
              </div>
            ) : (
              <>
                <MoodArcSVG days={data.moodArc.days} />
                <div style={{ marginTop: 12, fontSize: 13, color: P.muted, lineHeight: 1.65, fontStyle: "italic", borderLeft: `2px solid ${P.borderLight}`, paddingLeft: 12 }}>
                  {data.moodArc.aryaRead}
                </div>
                <div style={{ marginTop: 8, fontSize: 11, color: P.steel }}>
                  {data.moodArc.checkInCount} of 7 days · avg mood {data.moodArc.avgMood.toFixed(1)}/5
                </div>
              </>
            )}
          </div>

          <Divider />

          {/* ── Goals ──────────────────────────────────────── */}
          <div>
            <SLabel text="Goals this week" />
            {data.goals.active === 0 ? (
              <div style={{ background: P.surface2, borderRadius: 10, padding: "16px 18px", textAlign: "center", fontSize: 13, color: P.steel, lineHeight: 1.6 }}>
                No active goals yet. Set one in the chat — ARYA will track it here.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 24, marginBottom: 18 }}>
                  {[
                    { label: "Active", value: data.goals.active },
                    { label: "Check-ins", value: data.goals.activeThisWeek },
                    { label: "Missed", value: Math.max(0, data.goals.active - data.goals.activeThisWeek) },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 24, color: P.text, fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
                      <div style={{ fontSize: 10, color: P.steel, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {data.goals.bestStreak && data.goals.bestStreak.count >= 3 && (
                  <div style={{ background: P.greenBg, border: `1px solid rgba(38,96,64,0.18)`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>🔥</span>
                    <div>
                      <div style={{ fontSize: 13, color: P.green, fontWeight: 600 }}>{data.goals.bestStreak.count}-day streak</div>
                      <div style={{ fontSize: 12, color: P.muted, marginTop: 1 }}>"{data.goals.bestStreak.title}"</div>
                    </div>
                  </div>
                )}

                {data.goals.items.map((g, i) => (
                  <div
                    key={g.id}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < data.goals.items.length - 1 ? `1px solid ${P.borderLight}` : "none" }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${g.activeThisWeek ? P.green : P.borderLight}`, background: g.activeThisWeek ? P.greenBg : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {g.activeThisWeek && <Check size={11} color={P.green} strokeWidth={2.5} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: g.activeThisWeek ? P.body : P.muted, fontWeight: g.activeThisWeek ? 500 : 400 }}>
                        {g.title}
                      </div>
                      <div style={{ fontSize: 11, color: P.steel, marginTop: 2 }}>
                        {g.progress}% progress{g.streak > 0 ? ` · 🔥 ${g.streak}-day streak` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* ── ARYA Noticed (dark card) ────────────────────── */}
          <div style={{ margin: "28px -2px 0", background: P.darkCard, border: `1px solid ${P.darkBorder}`, borderRadius: 16, padding: "20px 18px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", color: P.darkMuted, textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ color: P.darkGold, fontSize: 11 }}>◆</span> Something ARYA noticed
            </div>
            <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 14, color: P.darkCream, lineHeight: 1.78, fontStyle: "italic" }}>
              {data.aryaNoticed.insight}
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: P.darkMuted, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: data.aryaNoticed.confidence === "forming" ? P.darkMuted : P.darkGold, flexShrink: 0 }} />
              {data.aryaNoticed.confidence === "forming" ? "Pattern forming — watching across more weeks" : "Pattern confirmed across multiple weeks"}
            </div>
          </div>

          <Divider />

          {/* ── Business Mind ───────────────────────────────── */}
          <div>
            <SLabel text="Business Mind this week" />
            {!data.businessRecap.hasData ? (
              <div style={{ background: P.surface2, borderRadius: 10, padding: "16px 18px", textAlign: "center", fontSize: 13, color: P.steel }}>
                No Niti sessions this week. The council awaits.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.businessRecap.sessions.map(s => (
                  <div
                    key={s.id}
                    style={{ background: P.surface2, border: `1px solid ${P.borderLight}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: P.body, fontWeight: 500 }}>
                        {SESSION_LABELS[s.sessionType] || s.sessionType.replace(/_/g, " ")}
                      </div>
                      {s.philosopher && (
                        <div style={{ fontSize: 11, color: P.muted, marginTop: 2 }}>
                          with {PHILOSOPHER_NAMES[s.philosopher] || s.philosopher}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: P.steel, flexShrink: 0 }}>
                      {new Date(s.createdAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Divider />

          {/* ── Cosmic Week ─────────────────────────────────── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.14em", color: P.steel, textTransform: "uppercase", fontWeight: 600 }}>
                Your Cosmic Week — {data.cosmicWeek.name}
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} style={{ fontSize: 14, color: i <= data.cosmicWeek.stars ? P.goldLight : P.borderLight }}>
                    ★
                  </span>
                ))}
              </div>
            </div>
            <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 14, color: P.body, lineHeight: 1.74, fontStyle: "italic", marginBottom: 14 }}>
              {data.cosmicWeek.summary}
            </div>
            <div style={{ fontSize: 12, color: P.muted, borderLeft: `2px solid ${P.borderLight}`, paddingLeft: 12, lineHeight: 1.65 }}>
              {data.cosmicWeek.nextHint}
            </div>
          </div>

          <Divider />

          {/* ── ARYA's Question ──────────────────────────────── */}
          <div>
            <SLabel text="ARYA's question for you" />
            <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 17, color: P.text, lineHeight: 1.7, fontStyle: "italic", marginBottom: 18 }}>
              "{data.aryaQuestion}"
            </div>
            <textarea
              data-testid="input-review-answer"
              value={questionAnswer}
              onChange={e => { setQuestionAnswer(e.target.value); setAnswerSaved(false); }}
              rows={3}
              placeholder="Sit with this. Write what comes…"
              style={{ width: "100%", background: P.surface2, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px", color: P.body, fontSize: 13, fontFamily: "Inter, sans-serif", resize: "none", lineHeight: 1.62 }}
            />
            {answerSaved ? (
              <div style={{ marginTop: 10, fontSize: 12, color: P.green, display: "flex", alignItems: "center", gap: 5 }}>
                <Check size={12} /> Saved to your journal.
              </div>
            ) : questionAnswer.trim() ? (
              <button
                data-testid="button-review-save-answer"
                onClick={saveAnswer}
                disabled={savingAnswer}
                style={{ marginTop: 10, padding: "9px 16px", borderRadius: 8, border: `1px solid ${P.gold}`, background: "transparent", color: P.gold, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
              >
                {savingAnswer && <Loader2 size={12} className="wr-spin" />}
                Save to journal
              </button>
            ) : null}
          </div>

          <Divider />

          {/* ── Next Week Intention ─────────────────────────── */}
          <div>
            <SLabel text="Your intention next week" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {data.intentionChips.map(chip => (
                <button
                  key={chip}
                  data-testid={`button-intention-${chip.replace(/\s+/g, "-").toLowerCase()}`}
                  onClick={() => { setSelectedChip(c => c === chip ? "" : chip); setCustomIntention(""); setIntentionSaved(false); }}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${selectedChip === chip ? P.gold : P.border}`,
                    background: selectedChip === chip ? "rgba(138,104,32,0.07)" : P.surface2,
                    color: selectedChip === chip ? P.gold : P.muted,
                    fontSize: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    lineHeight: 1.45,
                    transition: "all 0.14s",
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
            <input
              data-testid="input-custom-intention"
              value={customIntention}
              onChange={e => { setCustomIntention(e.target.value); setSelectedChip(""); setIntentionSaved(false); }}
              placeholder="Or write your own…"
              style={{ width: "100%", background: P.surface2, border: `1px solid ${P.border}`, borderRadius: 8, padding: "10px 12px", color: P.body, fontSize: 13, marginBottom: 10 }}
            />
            {intentionSaved ? (
              <div style={{ padding: "13px 16px", borderRadius: 10, background: P.greenBg, border: `1px solid rgba(38,96,64,0.18)`, fontSize: 13, color: P.green, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <Check size={13} /> ARYA will hold this intention through your week.
              </div>
            ) : (
              <button
                data-testid="button-set-intention"
                onClick={saveIntention}
                disabled={savingIntention || !intentionValue}
                style={{
                  width: "100%",
                  padding: "13px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: intentionValue ? `linear-gradient(135deg, ${P.goldLight}, ${P.gold})` : P.borderLight,
                  color: intentionValue ? "white" : P.steel,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: intentionValue ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  transition: "all 0.18s",
                }}
              >
                {savingIntention && <Loader2 size={14} className="wr-spin" />}
                Set my intention for next week
              </button>
            )}
          </div>

          {/* Footer */}
          <div style={{ marginTop: 44, paddingTop: 24, borderTop: `1px solid ${P.borderLight}`, textAlign: "center" }}>
            <div style={{ fontFamily: "Libre Baskerville, serif", fontSize: 12, color: P.steel, letterSpacing: "0.1em" }}>
              ARYA · Your personal thinking partner
            </div>
          </div>

        </motion.div>
      )}
      <BottomNav />
    </div>
  );
}
