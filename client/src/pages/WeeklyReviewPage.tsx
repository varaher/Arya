import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, Download } from "lucide-react";
import { useUserAuth } from "@/lib/user-auth";
import { useLanguage } from "@/lib/language-context";

const P = {
  bg: "#f5f0e8",
  surface: "rgba(0,0,0,0.04)",
  border: "rgba(0,0,0,0.1)",
  gold: "#b5a06a",
  goldDark: "#8a7248",
  text: "#1a1a1a",
  body: "#2a2a2a",
  muted: "rgba(0,0,0,0.35)",
  steel: "rgba(0,0,0,0.45)",
  green: "#4a7c59",
  greenBg: "rgba(74,124,89,0.08)",
  greenBorder: "rgba(74,124,89,0.4)",
  greenText: "#2d5a3d",
  darkCard: "#1a1a1a",
  darkText: "#f5f0e8",
  darkMuted: "rgba(245,240,232,0.5)",
  darkGold: "#b5a06a",
  divider: "rgba(0,0,0,0.07)",
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
  openingLine: string;
  weekSummaryTitle: string;
  moodArc: {
    days: DayMood[];
    avgMood: number;
    checkInCount: number;
  };
  goals: {
    total: number;
    active: number;
    activeThisWeek: number;
    untouched: number;
    bestStreak: { title: string; count: number } | null;
    items: { id: string; title: string; progress: number; streak: number; activeThisWeek: boolean }[];
  };
  whatAryaNoticed: string;
  oneThatMatters: string;
  patternConfirmed: boolean;
  businessRecap: {
    sessions: { id: number; sessionType: string; philosopher: string | null; title: string | null; createdAt: string }[];
    hasData: boolean;
  };
  cosmicWeek: { name: string; summary: string; nextHint: string; stars: number };
  voiceFlashback: {
    summary: string;
    weeksAgo: number;
    aryaText: string;
  } | null;
  aryasQuestion: string;
  intentionOptions: string[];
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
    <svg width="100%" height={H + 22} viewBox={`-2 -8 ${W + 4} ${H + 30}`} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id="wrmf2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={P.gold} stopOpacity="0.2" />
          <stop offset="100%" stopColor={P.gold} stopOpacity="0" />
        </linearGradient>
      </defs>
      {curvePath && first && last && (
        <>
          <path d={`${curvePath} L ${last[0].toFixed(1)} ${H} L ${first[0].toFixed(1)} ${H} Z`} fill="url(#wrmf2)" />
          <path d={curvePath} fill="none" stroke={P.gold} strokeWidth={2} strokeLinecap="round" />
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
                  <text x={x} y={y - 9} textAnchor="middle" fontSize={14} style={{ userSelect: "none" }}>
                    {day.emoji}
                  </text>
                )}
                <circle cx={x} cy={y} r={4} fill={P.gold} stroke={P.bg} strokeWidth={1.5} />
              </>
            ) : (
              <circle cx={x} cy={y} r={3} fill="rgba(0,0,0,0.12)" />
            )}
            <text x={x} y={H + 18} textAnchor="middle" fontSize={10} fill={P.muted} fontFamily="Inter, sans-serif">
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
    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "0.25em", color: P.muted, textTransform: "uppercase", marginBottom: 14 }}>
      {text}
    </div>
  );
}

function SDivider() {
  return <div style={{ height: 1, background: P.divider, margin: "28px 0" }} />;
}

const SESSION_LABELS: Record<string, string> = {
  decision: "Help me decide",
  stress_test: "Stress-testing a plan",
  people: "People situation",
  think_out_loud: "Thinking out loud",
};

export default function WeeklyReviewPage() {
  const [, setLocation] = useLocation();
  const { token } = useUserAuth();
  const { t } = useLanguage();

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
    link.href = "https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&family=Cinzel:wght@400;600&display=swap";
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
      body: JSON.stringify({ question: data.aryasQuestion, answer: questionAnswer }),
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

  const handleDownload = () => {
    if (!data) return;
    const lines: string[] = [
      `ARYA'S SUNDAY LETTER — ${data.weekLabel}`,
      `To: ${data.userName}`,
      "─".repeat(48),
      "",
      `"${data.openingLine}"`,
      "",
      `── ${data.weekSummaryTitle} ──`,
      "",
      "WHAT ARYA NOTICED",
      data.whatAryaNoticed,
      "",
      "ONE THING THAT MATTERS",
      data.oneThatMatters,
      "",
      "ARYA'S QUESTION",
      `"${data.aryasQuestion}"`,
      "",
      "─".repeat(48),
      "Generated by ARYA · varah.in",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ARYA-Review-${data.weekLabel.replace(/[\s,—]+/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const intentionValue = customIntention.trim() || selectedChip;

  return (
    <div style={{ minHeight: "100dvh", background: P.bg, color: P.body, fontFamily: "'Crimson Pro', Georgia, serif", paddingBottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}>
      <style>{`
        @keyframes wr-spin { to { transform: rotate(360deg); } }
        .wr-spin { animation: wr-spin 0.8s linear infinite; }
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        textarea:focus, input:focus { outline: none; }
        .wr-btn-intention { transition: all 0.18s; }
        .wr-btn-intention:hover { opacity: 0.88; }
        .wr-chip:hover { border-color: rgba(181,160,106,0.5) !important; }
      `}</style>

      {/* ── Sticky Nav ── */}
      <div style={{ position: "sticky", top: 0, background: P.bg, borderBottom: `1px solid rgba(0,0,0,0.08)`, padding: "13px 16px", display: "flex", alignItems: "center", gap: 12, zIndex: 10 }}>
        <button
          data-testid="button-review-back"
          onClick={() => setLocation("/")}
          style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid rgba(0,0,0,0.12)`, background: "transparent", color: P.steel, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <ArrowLeft size={15} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: P.gold, letterSpacing: "0.12em" }}>
            {t("review_title")}
          </div>
          {data && (
            <div style={{ fontSize: 11, color: P.muted, marginTop: 1 }}>
              {data.weekSummaryTitle}
            </div>
          )}
        </div>
        {data && (
          <button
            data-testid="button-review-download"
            onClick={handleDownload}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: `1px solid rgba(0,0,0,0.12)`, background: "transparent", color: P.steel, fontSize: 12, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            <Download size={12} /> Save
          </button>
        )}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "72vh", gap: 14 }}>
          <div style={{ fontSize: 36 }}>🌿</div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: "0.15em", color: P.muted }}>
            {t("review_loading")}
          </div>
          <Loader2 size={18} color={P.gold} className="wr-spin" />
        </div>
      )}

      {/* ── Not authenticated ── */}
      {!loading && error === "not_authed" && (
        <div style={{ padding: "60px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
          <div style={{ fontSize: 16, color: P.text, marginBottom: 8, fontWeight: 600 }}>{t("review_auth_h")}</div>
          <div style={{ fontSize: 14, color: P.muted }}>Your personal Sunday letter from ARYA lives here.</div>
        </div>
      )}

      {/* ── Error ── */}
      {!loading && error === "load_failed" && (
        <div style={{ padding: "60px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 15, color: P.text, marginBottom: 18, fontWeight: 600 }}>Couldn't load your review</div>
          <button
            onClick={() => { setError(""); setLoading(true); window.location.reload(); }}
            style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${P.gold}`, background: "transparent", color: P.gold, fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Letter ── */}
      {!loading && data && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ padding: "0 24px 80px", maxWidth: 520, margin: "0 auto" }}
        >

          {/* ── 1. HEADER ── */}
          <div style={{ textAlign: "center", padding: "40px 0 28px" }}>
            <span style={{ fontSize: 36, display: "block", marginBottom: 14 }}>🌿</span>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "0.3em", color: P.muted, textTransform: "uppercase", marginBottom: 10 }}>
              ARYA's Sunday Letter
            </div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 34, fontWeight: 400, color: P.text, marginBottom: 6, lineHeight: 1.1 }}>
              to {data.userName.toLowerCase()}
            </div>
            <div style={{ fontSize: 13, color: P.muted, marginBottom: 22, fontFamily: "Inter, sans-serif" }}>
              {data.weekLabel}
            </div>
            <div style={{ width: 48, height: 1.5, background: P.gold, margin: "0 auto" }} />
          </div>

          {/* ── 2. OPENING LINE ── */}
          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 22, fontStyle: "italic", lineHeight: 1.55, textAlign: "center", color: P.body, padding: "0 4px 28px" }}>
            "{data.openingLine}"
          </div>

          <SDivider />

          {/* ── 3. MOOD THIS WEEK ── */}
          <section>
            <SLabel text="Your week in mood" />
            {data.moodArc.checkInCount === 0 ? (
              <div style={{ background: P.surface, borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 15, color: P.steel, margin: "0 0 6px" }}>
                  You didn't check in on your mood this week.
                </p>
                <p style={{ fontSize: 13, color: P.muted, fontStyle: "italic", margin: 0 }}>
                  Takes 5 seconds tomorrow. Just one emoji. ARYA learns from it over time.
                </p>
              </div>
            ) : (
              <>
                <MoodArcSVG days={data.moodArc.days} />
                <div style={{ marginTop: 8, fontSize: 12, color: P.muted, fontFamily: "Inter, sans-serif" }}>
                  {data.moodArc.checkInCount} of 7 days · avg mood {data.moodArc.avgMood.toFixed(1)}/5
                </div>
              </>
            )}
          </section>

          <SDivider />

          {/* ── 4. GOALS THIS WEEK ── */}
          <section>
            <SLabel text="Goals this week" />

            {data.goals.active === 0 ? (
              <div style={{ background: P.surface, borderRadius: 12, padding: "16px", textAlign: "center", fontSize: 14, color: P.steel, fontStyle: "italic" }}>
                No active goals yet. Tell ARYA what you're working on.
              </div>
            ) : (
              <>
                {/* Stats row */}
                <div style={{ display: "flex", marginBottom: 20 }}>
                  {[
                    { label: "ACTIVE", value: data.goals.active },
                    { label: "CHECK-INS", value: data.goals.activeThisWeek },
                    { label: "UNTOUCHED", value: data.goals.untouched },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 32, fontWeight: 600, color: P.text, lineHeight: 1 }}>
                        {value}
                      </div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: "0.15em", color: P.muted, marginTop: 4 }}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>

                {data.goals.untouched > 10 && (
                  <p style={{ fontSize: 13, color: P.steel, fontStyle: "italic", marginBottom: 16, lineHeight: 1.6 }}>
                    Many of these were picked up from your conversations. Which ones actually matter to you right now?
                  </p>
                )}

                {data.goals.bestStreak && data.goals.bestStreak.count >= 3 && (
                  <div style={{ background: P.greenBg, border: `1px solid ${P.greenBorder}`, borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 18, lineHeight: 1 }}>🔥</span>
                    <div>
                      <div style={{ fontSize: 14, color: P.green, fontWeight: 600 }}>{data.goals.bestStreak.count}-day streak</div>
                      <div style={{ fontSize: 13, color: P.steel, marginTop: 1 }}>"{data.goals.bestStreak.title}"</div>
                    </div>
                  </div>
                )}

                <div>
                  {data.goals.items.map((g, i) => (
                    <div
                      key={g.id}
                      style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < data.goals.items.length - 1 ? `1px solid ${P.divider}` : "none" }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        border: `1.5px solid ${g.activeThisWeek ? P.green : "rgba(0,0,0,0.2)"}`,
                        background: g.activeThisWeek ? P.greenBg : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
                      }}>
                        {g.activeThisWeek && <Check size={9} color={P.green} strokeWidth={2.5} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, color: P.body }}>{g.title}</div>
                        <div style={{ fontSize: 12, color: P.muted, marginTop: 2, fontFamily: "Inter, sans-serif" }}>
                          {g.progress > 0 ? `${g.progress}% done` : "Not started"}
                          {g.streak > 0 ? ` · 🔥 ${g.streak}-day streak` : ""}
                        </div>
                      </div>
                    </div>
                  ))}
                  {data.goals.active > 5 && (
                    <div style={{ fontSize: 12, color: P.muted, paddingTop: 8, fontStyle: "italic" }}>
                      +{data.goals.active - 5} more goals
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <SDivider />

          {/* ── 5. SOMETHING ARYA NOTICED (dark card) ── */}
          <section>
            <div style={{ background: P.darkCard, borderRadius: 16, padding: "20px" }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: "0.2em", color: P.darkGold, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <span>◆</span> SOMETHING ARYA NOTICED
              </div>
              <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 16, fontStyle: "italic", lineHeight: 1.7, color: P.darkText }}>
                {data.whatAryaNoticed}
              </div>
              {data.oneThatMatters && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 14, color: P.darkMuted, fontStyle: "italic", lineHeight: 1.6 }}>
                  {data.oneThatMatters}
                </div>
              )}
              {data.patternConfirmed && (
                <div style={{ marginTop: 12, fontSize: 12, color: P.darkGold, display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: P.darkGold, flexShrink: 0 }} />
                  Pattern confirmed across multiple weeks
                </div>
              )}
            </div>
          </section>

          <SDivider />

          {/* ── 6. BUSINESS MIND THIS WEEK ── */}
          <section>
            <SLabel text="Business Mind this week" />
            {!data.businessRecap.hasData ? (
              <div style={{ background: P.surface, borderRadius: 12, padding: "16px", fontSize: 14, color: P.steel, fontStyle: "italic", lineHeight: 1.6 }}>
                You didn't open Niti this week. Big decisions think better out loud.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.businessRecap.sessions.map(s => (
                  <div
                    key={s.id}
                    style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <div style={{ fontSize: 14, color: P.body }}>
                      {SESSION_LABELS[s.sessionType] || s.sessionType.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontSize: 12, color: P.muted, flexShrink: 0, fontFamily: "Inter, sans-serif" }}>
                      {new Date(s.createdAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <SDivider />

          {/* ── 7. COSMIC WEEK ── */}
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <SLabel text={`Your Cosmic Week — ${data.cosmicWeek.name}`} />
              <div style={{ display: "flex", gap: 2, marginTop: -14 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <span key={i} style={{ fontSize: 13, color: i <= data.cosmicWeek.stars ? P.gold : "rgba(0,0,0,0.12)" }}>★</span>
                ))}
              </div>
            </div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, fontStyle: "italic", lineHeight: 1.74, color: P.body, marginBottom: 12 }}>
              {data.cosmicWeek.summary}
            </div>
            <div style={{ fontSize: 13, color: P.steel, borderLeft: `2px solid rgba(0,0,0,0.1)`, paddingLeft: 12, lineHeight: 1.65, fontStyle: "italic" }}>
              {data.cosmicWeek.nextHint}
            </div>
          </section>

          {/* ── 8. VOICE FLASHBACK (conditional) ── */}
          {data.voiceFlashback && (
            <>
              <SDivider />
              <section>
                <SLabel text="From your past" />
                <div style={{ background: P.surface, borderLeft: `3px solid ${P.gold}`, borderRadius: "0 12px 12px 0", padding: "16px 18px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: "0.08em", color: P.muted, textTransform: "uppercase", marginBottom: 8 }}>
                    {data.voiceFlashback.weeksAgo} weeks ago
                  </div>
                  <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 16, fontStyle: "italic", lineHeight: 1.65, color: P.body, marginBottom: data.voiceFlashback.aryaText ? 10 : 0 }}>
                    "{data.voiceFlashback.summary}"
                  </div>
                  {data.voiceFlashback.aryaText && (
                    <div style={{ fontSize: 13, color: P.gold, fontStyle: "italic" }}>
                      {data.voiceFlashback.aryaText}
                    </div>
                  )}
                </div>
              </section>
            </>
          )}

          <SDivider />

          {/* ── 9. ARYA'S QUESTION ── */}
          <section>
            <SLabel text="ARYA's question for you" />
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 22, fontStyle: "italic", lineHeight: 1.5, color: P.text, marginBottom: 18 }}>
              "{data.aryasQuestion}"
            </div>
            <textarea
              data-testid="input-review-answer"
              value={questionAnswer}
              onChange={e => { setQuestionAnswer(e.target.value); setAnswerSaved(false); }}
              rows={3}
              placeholder="Sit with this. Write what comes…"
              style={{
                width: "100%", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12,
                padding: "14px 16px", color: P.body, fontSize: 15, fontFamily: "'Crimson Pro', serif",
                resize: "none", lineHeight: 1.6,
              }}
            />
            {answerSaved ? (
              <div style={{ marginTop: 10, fontSize: 13, color: P.green, display: "flex", alignItems: "center", gap: 5, fontFamily: "Inter, sans-serif" }}>
                <Check size={12} /> {t("review_saved_journal")}
              </div>
            ) : questionAnswer.trim() ? (
              <button
                data-testid="button-review-save-answer"
                onClick={saveAnswer}
                disabled={savingAnswer}
                style={{ marginTop: 10, padding: "9px 16px", borderRadius: 8, border: `1px solid ${P.gold}`, background: "transparent", color: P.goldDark, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter, sans-serif" }}
              >
                {savingAnswer && <Loader2 size={12} className="wr-spin" />}
                {t("review_save_journal")}
              </button>
            ) : null}
          </section>

          <SDivider />

          {/* ── 10. INTENTION NEXT WEEK ── */}
          <section>
            <SLabel text="Your intention next week" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {data.intentionOptions.map((chip, i) => (
                <button
                  key={i}
                  className="wr-chip"
                  data-testid={`button-intention-${i}`}
                  onClick={() => { setSelectedChip(c => c === chip ? "" : chip); setCustomIntention(""); setIntentionSaved(false); }}
                  style={{
                    padding: "14px 12px",
                    borderRadius: 12,
                    border: `1.5px solid ${selectedChip === chip ? "rgba(74,124,89,0.4)" : P.border}`,
                    background: selectedChip === chip ? P.greenBg : P.surface,
                    color: selectedChip === chip ? P.greenText : P.body,
                    fontFamily: "'Crimson Pro', serif",
                    fontSize: 14,
                    cursor: "pointer",
                    textAlign: "left",
                    lineHeight: 1.3,
                    transition: "all 0.18s",
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
              style={{
                width: "100%", background: "transparent", border: `1.5px solid ${P.border}`,
                borderRadius: 12, padding: "14px 16px", fontFamily: "'Crimson Pro', serif",
                fontSize: 15, color: P.text, marginBottom: 14,
              }}
            />
            {intentionSaved ? (
              <div style={{ padding: "14px 16px", borderRadius: 12, background: P.greenBg, border: `1px solid ${P.greenBorder}`, fontSize: 14, color: P.green, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: "Inter, sans-serif" }}>
                <Check size={13} /> {t("review_intention_done")}
              </div>
            ) : (
              <button
                data-testid="button-set-intention"
                className="wr-btn-intention"
                onClick={saveIntention}
                disabled={savingIntention || !intentionValue}
                style={{
                  width: "100%", padding: "16px",
                  borderRadius: 14, border: "none",
                  background: intentionValue ? P.gold : "rgba(0,0,0,0.08)",
                  color: intentionValue ? P.text : P.muted,
                  fontFamily: "'Cinzel', serif",
                  fontSize: 11, letterSpacing: "0.08em",
                  cursor: intentionValue ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}
              >
                {savingIntention && <Loader2 size={14} className="wr-spin" />}
                Set my intention for next week
              </button>
            )}
          </section>

          {/* ── Footer ── */}
          <div style={{ marginTop: 44, paddingTop: 20, borderTop: `1px solid ${P.divider}`, textAlign: "center" }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: "rgba(0,0,0,0.25)", letterSpacing: "0.2em" }}>
              {t("review_footer")}
            </div>
          </div>

        </motion.div>
      )}
    </div>
  );
}
