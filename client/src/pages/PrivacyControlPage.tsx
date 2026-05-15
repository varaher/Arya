import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useUserAuth } from "@/lib/user-auth";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ArrowLeft,
  ChevronRight,
  Lock,
  CheckCircle,
  AlertTriangle,
  Brain,
  MessageSquare,
  Target,
  Smile,
  Mic,
  Users,
  Loader2,
  X,
} from "lucide-react";

type Path = "let_go" | "new_chapter" | "fresh_start";
type Step = "landing" | "select" | "confirm" | "processing" | "receipt";

const CATEGORY_META: Record<string, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  conversations: { label: "Conversations", description: "Every chat thread and exchange", icon: <MessageSquare className="w-4 h-4" />, color: "text-cyan-600 dark:text-cyan-400" },
  memories: { label: "Memories & Insights", description: "What ARYA learned and inferred about you", icon: <Brain className="w-4 h-4" />, color: "text-purple-600 dark:text-purple-400" },
  goals: { label: "Goals & Progress", description: "Goals you set, steps, streaks", icon: <Target className="w-4 h-4" />, color: "text-amber-600 dark:text-amber-400" },
  mood: { label: "Mood & Reflections", description: "Daily check-ins and mood data", icon: <Smile className="w-4 h-4" />, color: "text-emerald-600 dark:text-emerald-400" },
  voice_notes: { label: "Voice Notes", description: "Transcribed recordings and notes", icon: <Mic className="w-4 h-4" />, color: "text-rose-600 dark:text-rose-400" },
  reflection_shares: { label: "Shared Reflections", description: "Weekly summaries shared with others", icon: <Users className="w-4 h-4" />, color: "text-indigo-600 dark:text-indigo-400" },
};

const PERIODS = [
  { key: "30", label: "Last month", description: "The past 30 days", days: 30 },
  { key: "90", label: "Last 3 months", description: "The past quarter", days: 90 },
  { key: "180", label: "Last 6 months", description: "Half a year", days: 180 },
  { key: "365", label: "Last year", description: "The past 12 months", days: 365 },
];

const CONFIRM_PHRASES: Record<Path, string> = {
  let_go: "let go",
  new_chapter: "new chapter",
  fresh_start: "fresh start",
};

const PATH_META = {
  let_go: {
    title: "Let Go",
    badge: "SELECTIVE",
    badgeColor: "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300",
    description: "Remove specific topics, conversations, or memories. Everything else stays intact.",
    borderColor: "border-cyan-200 dark:border-cyan-800",
    accentColor: "text-cyan-700 dark:text-cyan-300",
    bgColor: "bg-cyan-50/50 dark:bg-cyan-950/20",
  },
  new_chapter: {
    title: "New Chapter",
    badge: "PERIOD",
    badgeColor: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
    description: "Wipe a window of time — a month, a quarter, a chapter you've moved past.",
    borderColor: "border-amber-200 dark:border-amber-800",
    accentColor: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-50/50 dark:bg-amber-950/20",
  },
  fresh_start: {
    title: "Fresh Start",
    badge: "COMPLETE RESET",
    badgeColor: "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
    description: "Delete everything. Your account remains but ARYA meets you as if for the first time.",
    borderColor: "border-rose-200 dark:border-rose-800",
    accentColor: "text-rose-700 dark:text-rose-300",
    bgColor: "bg-rose-50/50 dark:bg-rose-950/20",
  },
};

export default function PrivacyControlPage() {
  const [, setLocation] = useLocation();
  const { token, isLoggedIn } = useUserAuth();

  const [step, setStep] = useState<Step>("landing");
  const [path, setPath] = useState<Path | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("90");
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [receipt, setReceipt] = useState<{ deletedAt: string; recordsDeleted: number; type: string } | null>(null);
  const [error, setError] = useState("");

  const { data: summary, isLoading: summaryLoading } = useQuery<{
    conversations: number; memories: number; goals: number;
    mood: number; voiceNotes: number; reflectionShares: number;
    totalRecords: number; oldestRecord: string | null;
  }>({
    queryKey: ["/api/user/data-summary"],
    queryFn: async () => {
      if (!token) return null;
      const res = await fetch("/api/user/data-summary", { headers: { "x-user-token": token } });
      return res.json();
    },
    enabled: !!token,
  });

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Sign in to manage your data</p>
          <Button onClick={() => setLocation("/")} variant="outline" className="mt-4">Back to ARYA</Button>
        </div>
      </div>
    );
  }

  const headers = { "Content-Type": "application/json", "x-user-token": token || "" };

  const handleDelete = async () => {
    if (!path) return;
    setIsDeleting(true);
    setError("");
    try {
      let endpoint = "";
      let body: any = {};

      if (path === "let_go") {
        endpoint = "/api/user/forget/selective";
        body = { categories: selectedCategories };
      } else if (path === "new_chapter") {
        const days = parseInt(selectedPeriod);
        const endDate = new Date();
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        endpoint = "/api/user/forget/period";
        body = { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
      } else {
        endpoint = "/api/user/forget/all";
      }

      const res = await fetch(endpoint, { method: "DELETE", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Deletion failed");

      setReceipt({
        deletedAt: new Date().toISOString(),
        recordsDeleted: data.recordsDeleted || 0,
        type: PATH_META[path].title,
      });
      setStep("receipt");
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setIsDeleting(false);
    }
  };

  const canConfirm = path ? confirmInput.trim().toLowerCase() === CONFIRM_PHRASES[path] : false;

  const formatOldest = (d: string | null) => {
    if (!d) return "recently";
    const months = Math.round((Date.now() - new Date(d).getTime()) / (30 * 24 * 60 * 60 * 1000));
    if (months < 1) return "this month";
    if (months === 1) return "1 month";
    return `${months} months`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-gray-100 dark:border-slate-800">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            data-testid="button-privacy-back"
            onClick={() => step === "landing" ? setLocation("/") : (() => { setStep("landing"); setPath(null); setConfirmInput(""); setSelectedCategories([]); })()}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Shield className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Privacy & Control</span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">DPDP Act 2023</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pb-12">
        <AnimatePresence mode="wait">

          {/* LANDING */}
          {step === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              <div className="pt-8 pb-6">
                <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Privacy & Control</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                  Your story,<br />
                  <span className="text-amber-500 dark:text-amber-400 italic">your choice.</span>
                </h1>
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  ARYA remembers to serve you better. But you always decide what it holds — and what it releases.
                </p>
              </div>

              {/* Memory count card */}
              <div className="mb-5 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-900/80 flex items-center gap-4" data-testid="card-memory-summary">
                <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">What ARYA holds about you</p>
                  {summaryLoading ? (
                    <div className="h-6 w-24 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {(summary?.totalRecords || 0).toLocaleString()} <span className="text-base font-normal text-gray-500">records</span>
                    </p>
                  )}
                  {summary && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {summary.conversations} chats · {summary.memories} memories · {summary.goals} goals
                      {summary.oldestRecord ? ` · across ${formatOldest(summary.oldestRecord)}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {/* 3 paths */}
              <div className="space-y-2.5">
                {(["let_go", "new_chapter", "fresh_start"] as Path[]).map((p) => {
                  const meta = PATH_META[p];
                  return (
                    <motion.button
                      key={p}
                      data-testid={`button-path-${p}`}
                      onClick={() => { setPath(p); setStep("select"); setConfirmInput(""); setSelectedCategories([]); }}
                      className={`w-full text-left p-4 rounded-2xl border ${meta.borderColor} ${meta.bgColor} hover:opacity-80 transition-all group flex items-center gap-3`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base font-semibold text-gray-900 dark:text-white">{meta.title}</span>
                          <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${meta.badgeColor}`}>{meta.badge}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{meta.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Legal note */}
              <div className="mt-5 flex items-start gap-2.5 px-3 py-3 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800">
                <Lock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                  Deletions are permanent and irreversible. Your data is removed from all backups within 72 hours, as required by India's DPDP Act 2023.
                </p>
              </div>
            </motion.div>
          )}

          {/* SELECT / CONFIGURE */}
          {step === "select" && path && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              <div className="pt-7 pb-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${PATH_META[path].badgeColor}`}>{PATH_META[path].badge}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{PATH_META[path].title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{PATH_META[path].description}</p>
              </div>

              {/* Let Go — category selection */}
              {path === "let_go" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Select what to release:</p>
                  {Object.entries(CATEGORY_META).map(([key, meta]) => {
                    const count = summary
                      ? ({ conversations: summary.conversations, memories: summary.memories, goals: summary.goals, mood: summary.mood, voice_notes: summary.voiceNotes, reflection_shares: summary.reflectionShares }[key] || 0)
                      : 0;
                    const selected = selectedCategories.includes(key);
                    return (
                      <button
                        key={key}
                        data-testid={`button-category-${key}`}
                        onClick={() => setSelectedCategories(prev =>
                          prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
                        )}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          selected
                            ? "border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-slate-700"
                            : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-gray-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? "bg-gray-200 dark:bg-slate-600" : "bg-gray-50 dark:bg-slate-800"}`}>
                          <span className={meta.color}>{meta.icon}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{meta.label}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">{meta.description}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {count > 0 && <span className="text-xs text-gray-400">{count}</span>}
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selected ? "border-gray-500 bg-gray-500" : "border-gray-300 dark:border-slate-600"}`}>
                            {selected && <X className="w-2.5 h-2.5 text-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* New Chapter — period selection */}
              {path === "new_chapter" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Which chapter are you closing?</p>
                  {PERIODS.map((period) => (
                    <button
                      key={period.key}
                      data-testid={`button-period-${period.key}`}
                      onClick={() => setSelectedPeriod(period.key)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                        selectedPeriod === period.key
                          ? "border-amber-400 dark:border-amber-600 bg-amber-50/60 dark:bg-amber-950/20"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{period.label}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{period.description}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 transition-all ${selectedPeriod === period.key ? "border-amber-500 bg-amber-500" : "border-gray-300 dark:border-slate-600"}`} />
                    </button>
                  ))}
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 px-1">
                    All conversations, memories, goals, mood check-ins, and voice notes from this period will be permanently removed.
                  </p>
                </div>
              )}

              {/* Fresh Start — show everything */}
              {path === "fresh_start" && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3">Everything ARYA holds will be permanently removed:</p>
                  <div className="space-y-1.5 mb-5">
                    {Object.entries(CATEGORY_META).map(([key, meta]) => {
                      const count = summary
                        ? ({ conversations: summary.conversations, memories: summary.memories, goals: summary.goals, mood: summary.mood, voice_notes: summary.voiceNotes, reflection_shares: summary.reflectionShares }[key] || 0)
                        : 0;
                      return (
                        <div key={key} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30">
                          <span className={meta.color}>{meta.icon}</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">{meta.label}</span>
                          {count > 0 ? (
                            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">{count} records</span>
                          ) : (
                            <span className="text-xs text-gray-400">empty</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700 dark:text-rose-400">
                      Your account and login credentials are preserved. ARYA will meet you as if for the first time.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <Button
                  data-testid="button-continue-to-confirm"
                  onClick={() => setStep("confirm")}
                  disabled={path === "let_go" && selectedCategories.length === 0}
                  className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* CONFIRM */}
          {step === "confirm" && path && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.22 }}
            >
              <div className="pt-8 pb-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-5">
                  <Lock className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Confirm your choice</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                  This action is permanent and cannot be undone. To confirm, type{" "}
                  <span className="font-semibold text-gray-700 dark:text-gray-300">"{CONFIRM_PHRASES[path]}"</span>{" "}
                  in the field below.
                </p>

                {/* Summary of what will be deleted */}
                <div className="mb-6 p-3.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 space-y-1.5">
                  <p className="text-[10px] uppercase tracking-wider font-medium text-gray-400 dark:text-gray-500 mb-2">What will be released</p>
                  {path === "let_go" && selectedCategories.map(c => (
                    <div key={c} className="flex items-center gap-2">
                      <span className={CATEGORY_META[c]?.color}>{CATEGORY_META[c]?.icon}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{CATEGORY_META[c]?.label}</span>
                    </div>
                  ))}
                  {path === "new_chapter" && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      All data from the {PERIODS.find(p => p.key === selectedPeriod)?.label.toLowerCase()}
                    </p>
                  )}
                  {path === "fresh_start" && (
                    <p className="text-xs text-gray-600 dark:text-gray-400">All {summary?.totalRecords || 0} records — complete reset</p>
                  )}
                </div>

                <input
                  data-testid="input-confirm-phrase"
                  type="text"
                  value={confirmInput}
                  onChange={e => setConfirmInput(e.target.value)}
                  placeholder={`Type "${CONFIRM_PHRASES[path]}" to confirm`}
                  className="w-full text-sm rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-slate-500 mb-4"
                  onKeyDown={e => e.key === "Enter" && canConfirm && !isDeleting && handleDelete()}
                />

                {error && (
                  <p className="text-xs text-red-500 mb-3">{error}</p>
                )}

                <Button
                  data-testid="button-execute-deletion"
                  onClick={handleDelete}
                  disabled={!canConfirm || isDeleting}
                  className={`w-full ${
                    path === "fresh_start"
                      ? "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-200 dark:disabled:bg-rose-900"
                      : "bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 dark:disabled:bg-slate-700 dark:disabled:text-slate-500"
                  } text-white`}
                >
                  {isDeleting ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Releasing...</>
                  ) : (
                    `Release — ${PATH_META[path].title}`
                  )}
                </Button>

                <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-3">
                  Button unlocks only when phrase matches exactly
                </p>
              </div>
            </motion.div>
          )}

          {/* RECEIPT */}
          {step === "receipt" && receipt && (
            <motion.div
              key="receipt"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="pt-12 pb-8 flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6"
                >
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </motion.div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Released.</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                  {receipt.recordsDeleted > 0
                    ? `${receipt.recordsDeleted} records have been permanently removed.`
                    : "Your selected data has been permanently removed."
                  } What's gone is gone.
                </p>

                <div className="mt-8 w-full p-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/60 text-left space-y-2.5">
                  <p className="text-[10px] uppercase tracking-wider font-medium text-gray-400 dark:text-gray-500">Deletion receipt</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{receipt.type}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Records removed</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{receipt.recordsDeleted}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Completed at</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(receipt.deletedAt).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Backup purge</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Within 72 hours</span>
                  </div>
                </div>

                <div className="mt-4 w-full flex items-start gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-900/60 border border-gray-100 dark:border-slate-800">
                  <Lock className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Compliant with India's Digital Personal Data Protection Act 2023. This deletion record is kept without any personal content.
                  </p>
                </div>

                <div className="mt-8 w-full space-y-2.5">
                  <Button
                    data-testid="button-receipt-back-home"
                    onClick={() => setLocation("/")}
                    className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
                  >
                    Back to ARYA
                  </Button>
                  <Button
                    data-testid="button-receipt-more"
                    onClick={() => { setStep("landing"); setPath(null); setConfirmInput(""); setReceipt(null); setSelectedCategories([]); }}
                    variant="outline"
                    className="w-full"
                  >
                    Manage more data
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
