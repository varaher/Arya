import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles, Brain, BarChart3, Send, Mic,
  CheckCircle, XCircle, AlertTriangle,
  MessageCircle, ChevronRight, X, Edit3,
} from "lucide-react";

interface BriefingData {
  briefing: string;
  metrics: {
    totalUsers: number;
    newThisWeek: number;
    activeThisWeek: number;
    onboardingRate: number;
    costToday: string;
    pendingDrafts: number;
    topGaps: { normalized_query: string; domain: string }[];
  };
}

interface ChatMessage { role: "user" | "assistant"; content: string; }

interface Draft {
  id: string;
  domain: string;
  topic: string;
  content: string;
  confidenceScore: string;
  learnedFromQuery: string;
  status: string;
  createdAt: string;
}

interface ProductData {
  opinion: string;
  users: { total: number; newThisWeek: number; activeThisWeek: number; activeToday: number; onboardingRate: number; incomplete: number };
  features: { totalChats: number; voiceMinutes: number; deepReasoning: number; costInr: string };
  plans: Record<string, number>;
  signups: { day: string; signups: number }[];
  topQueries: { query: string; domain: string; query_count: number; is_gap: boolean }[];
}

function MetricTile({ label, value, sub, color = "cyan" }: { label: string; value: string | number; sub?: string; color?: "cyan" | "amber" | "emerald" | "red" }) {
  const colors = { cyan: "text-cyan-400", amber: "text-amber-400", emerald: "text-emerald-400", red: "text-red-400" };
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
      <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${colors[color]}`}>{value}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1 pt-1.5">
      {[0, 1, 2].map(i => (
        <motion.div key={i} className="w-2 h-2 rounded-full bg-zinc-600"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }} />
      ))}
    </div>
  );
}

// ─── Panel 1: My ARYA ─────────────────────────────────────────────────────────

function MyARYAPanel({ briefingData, isLoading }: { briefingData?: BriefingData; isLoading: boolean }) {
  const [mode, setMode] = useState<"chat" | "voice">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const recIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const briefingSeeded = useRef(false);

  const CHIPS = ["Am I ready to raise?", "What should I build next?", "Who are my power users?", "Where are users dropping off?"];

  useEffect(() => {
    if (briefingData && !briefingSeeded.current) {
      setMessages([{ role: "assistant", content: briefingData.briefing }]);
      briefingSeeded.current = true;
    }
  }, [briefingData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const send = async (text: string) => {
    if (!text.trim() || isTyping) return;
    const history = [...messages];
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsTyping(true);
    try {
      const res = await apiRequest("POST", "/api/admin/arya/chat", { message: text, history });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response || "No response." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Couldn't reach the server. Try again." }]);
    }
    setIsTyping(false);
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecTime(0);
    setVoiceTranscript("");
    recIntervalRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const recognition = new SR();
      recognition.lang = "en-IN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (e: any) => {
        const t = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
        setVoiceTranscript(t);
      };
      recognition.start();
      recognitionRef.current = recognition;
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    clearInterval(recIntervalRef.current);
    if (recognitionRef.current) recognitionRef.current.stop();
    const t = voiceTranscript.trim();
    if (t) { setMode("chat"); setTimeout(() => send(t), 300); }
  };

  const m = briefingData?.metrics;

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Mode toggle */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex bg-zinc-800 rounded-full p-0.5 border border-zinc-700">
        {(["chat", "voice"] as const).map(v => (
          <button key={v} onClick={() => setMode(v)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${mode === v ? "bg-zinc-600 text-zinc-100 shadow" : "text-zinc-500 hover:text-zinc-300"}`}>
            {v === "chat" ? "💬 Chat" : "🎙️ Voice"}
          </button>
        ))}
      </div>

      {mode === "chat" ? (
        <>
          {/* Metrics rail */}
          <div className="w-52 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col gap-2 p-3 pt-14 overflow-y-auto">
            {isLoading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-zinc-800 rounded-lg animate-pulse" />)
            ) : m ? (
              <>
                <MetricTile label="Total Users" value={m.totalUsers} sub={`+${m.newThisWeek} this week`} color="cyan" />
                <MetricTile label="Active (7d)" value={m.activeThisWeek} color="emerald" />
                <MetricTile label="Onboarding" value={`${m.onboardingRate}%`} color={m.onboardingRate >= 60 ? "emerald" : "amber"} />
                <MetricTile label="AI Cost Today" value={`₹${m.costToday}`} color="amber" />
                {m.pendingDrafts > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <p className="text-[10px] text-amber-400 font-mono uppercase mb-1">Pending Review</p>
                    <p className="text-xl font-bold font-mono text-amber-400">{m.pendingDrafts}</p>
                    <p className="text-[10px] text-zinc-500">knowledge drafts</p>
                  </div>
                )}
                {m.topGaps.length > 0 && (
                  <div className="mt-1">
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2">Gaps</p>
                    {m.topGaps.slice(0, 3).map((g, i) => (
                      <div key={i} className="flex items-start gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-zinc-400 leading-tight line-clamp-2">{g.normalized_query}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-end px-4 pt-3 pb-2 border-b border-zinc-800 shrink-0">
              <button onClick={() => setShowContext(c => !c)}
                className="text-xs text-zinc-500 hover:text-cyan-400 transition-colors flex items-center gap-1 border border-zinc-700 rounded-full px-3 py-1 hover:border-cyan-500/50">
                Context {showContext ? <X className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {isLoading && messages.length === 0 && (
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 shrink-0 flex items-center justify-center mt-0.5">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                  </div>
                  <TypingDots />
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${msg.role === "assistant" ? "bg-cyan-500/20" : "bg-zinc-700"}`}>
                    {msg.role === "assistant" ? <Sparkles className="w-3 h-3 text-cyan-400" /> : <span className="text-[10px] text-zinc-300 font-bold">F</span>}
                  </div>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2.5 text-sm leading-relaxed ${msg.role === "assistant" ? "bg-zinc-800 text-zinc-200 border border-zinc-700" : "bg-cyan-600/20 text-zinc-100 border border-cyan-500/20"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 shrink-0 flex items-center justify-center mt-0.5"><Sparkles className="w-3 h-3 text-cyan-400" /></div>
                  <TypingDots />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {CHIPS.map(chip => (
                <button key={chip} onClick={() => send(chip)} disabled={isTyping}
                  className="text-[11px] text-zinc-400 border border-zinc-700 hover:border-cyan-500/40 hover:text-cyan-300 rounded-full px-3 py-1 transition-all disabled:opacity-40">
                  {chip}
                </button>
              ))}
            </div>

            <div className="px-4 pb-4 shrink-0">
              <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Ask anything about the product…"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors" />
                <button type="submit" disabled={!input.trim() || isTyping}
                  className="bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-semibold rounded-lg px-3 transition-colors disabled:opacity-30">
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Context drawer */}
          <AnimatePresence>
            {showContext && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                className="bg-zinc-900 border-l border-zinc-800 overflow-hidden shrink-0">
                <div className="p-4 w-[220px]">
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-4">ARYA Knows</p>
                  {m && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] text-zinc-600 mb-1">User base</p>
                        <p className="text-xs text-zinc-300">{m.totalUsers} total · {m.activeThisWeek} active this week</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 mb-2">Onboarding</p>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5">
                          <div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${m.onboardingRate}%` }} />
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-1">{m.onboardingRate}% complete</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-600 mb-1">AI cost today</p>
                        <p className="text-sm text-amber-400 font-mono">₹{m.costToday}</p>
                      </div>
                      {m.pendingDrafts > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                          <p className="text-[10px] text-amber-400 mb-1">Needs your sign-off</p>
                          <p className="text-xs text-zinc-400">{m.pendingDrafts} knowledge drafts pending</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* Voice mode */
        <div className="flex-1 flex flex-col items-center justify-center gap-8 pt-12">
          <div className="flex items-center gap-1 h-14">
            {Array.from({ length: 28 }, (_, i) => (
              <motion.div key={i} className={`w-1 rounded-full ${isRecording ? "bg-red-400" : "bg-zinc-700"}`}
                animate={{ height: isRecording ? [6, 12 + (i % 3) * 14, 6] : [3, 7, 3] }}
                transition={{ duration: 0.7, delay: i * 0.035, repeat: Infinity, repeatType: "loop" }} />
            ))}
          </div>

          <div className="relative flex items-center justify-center">
            {isRecording && [1, 2, 3].map(ring => (
              <motion.div key={ring} className="absolute rounded-full border border-red-500/25"
                animate={{ width: [80, 80 + ring * 44], height: [80, 80 + ring * 44], opacity: [0.5, 0] }}
                transition={{ duration: 1.6, delay: ring * 0.45, repeat: Infinity }} />
            ))}
            <button onMouseDown={startRecording} onMouseUp={stopRecording}
              onTouchStart={e => { e.preventDefault(); startRecording(); }}
              onTouchEnd={e => { e.preventDefault(); stopRecording(); }}
              className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all select-none touch-none ${isRecording ? "bg-red-600 shadow-[0_0_32px_rgba(239,68,68,0.45)]" : "bg-zinc-700 hover:bg-zinc-600"}`}>
              <Mic className={`w-7 h-7 ${isRecording ? "text-white" : "text-zinc-300"}`} />
              {isRecording && <span className="text-[10px] text-white mt-1 font-mono">{recTime}s</span>}
            </button>
          </div>

          <div className="text-center">
            <p className="text-zinc-500 text-sm">{isRecording ? "Release to send" : "Hold to speak"}</p>
            {voiceTranscript && <p className="text-zinc-400 text-xs italic mt-2 max-w-xs">"{voiceTranscript}"</p>}
          </div>

          <button onClick={() => setMode("chat")} className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors">
            <MessageCircle className="w-3 h-3" /> Switch to chat
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Panel 2: Self-Learning ───────────────────────────────────────────────────

function LearningPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: draftsData, isLoading } = useQuery<{ drafts: Draft[] }>({
    queryKey: ["/api/learning/drafts"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/learning/drafts"); return r.json(); },
  });

  const { data: statsData } = useQuery<{ draftsPending: number; draftsApproved: number; totalQueries: number; knowledgeGaps: number }>({
    queryKey: ["/api/learning/stats"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/learning/stats"); return r.json(); },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => { const r = await apiRequest("POST", `/api/learning/drafts/${id}/approve`); return r.json(); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning/drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/learning/stats"] });
      toast({ title: "Approved — ARYA got smarter." });
    },
    onError: () => toast({ title: "Approval failed", variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => { const r = await apiRequest("POST", `/api/learning/drafts/${id}/reject`); return r.json(); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning/drafts"] });
      toast({ title: "Rejected." });
    },
    onError: () => toast({ title: "Rejection failed", variant: "destructive" }),
  });

  const pending = (draftsData?.drafts || []).filter(d => d.status === "pending" && !dismissed.has(d.id));

  const DOMAIN_COLORS: Record<string, string> = {
    personal_growth: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
    business: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    health: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    relationships: "text-pink-400 bg-pink-400/10 border-pink-400/30",
    chanakya: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    vidura: "text-indigo-400 bg-indigo-400/10 border-indigo-400/30",
    krishna: "text-violet-400 bg-violet-400/10 border-violet-400/30",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex gap-3 p-4 border-b border-zinc-800 shrink-0">
        {[
          { label: "Pending", value: statsData?.draftsPending ?? "—", color: "text-amber-400" },
          { label: "Approved", value: statsData?.draftsApproved ?? "—", color: "text-emerald-400" },
          { label: "Conversations", value: statsData?.totalQueries ?? "—", color: "text-cyan-400" },
          { label: "Gaps Found", value: statsData?.knowledgeGaps ?? "—", color: "text-red-400" },
        ].map(s => (
          <div key={s.label} className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
            <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-zinc-500 uppercase mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading && [1, 2, 3].map(i => <div key={i} className="h-48 bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse" />)}

        {!isLoading && pending.length === 0 && (
          <div className="flex flex-col items-center justify-center h-56 text-center">
            <CheckCircle className="w-10 h-10 text-emerald-500/30 mb-3" />
            <p className="text-zinc-400 font-semibold">All caught up</p>
            <p className="text-zinc-600 text-sm mt-1">No pending proposals from ARYA this week.</p>
          </div>
        )}

        <AnimatePresence>
          {pending.map(draft => {
            const conf = Math.round(parseFloat(draft.confidenceScore || "0") * 100);
            const domainStyle = DOMAIN_COLORS[draft.domain] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/30";
            const isPending = approveMutation.isPending || rejectMutation.isPending;
            return (
              <motion.div key={draft.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-mono border rounded-full px-2 py-0.5 ${domainStyle}`}>{draft.domain}</span>
                      <span className="text-[10px] text-zinc-600">Confidence:&nbsp;
                        <span className={conf >= 80 ? "text-emerald-400" : conf >= 60 ? "text-amber-400" : "text-red-400"}>{conf}%</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono shrink-0">{new Date(draft.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>

                  <h3 className="text-sm font-semibold text-zinc-200 mb-3">{draft.topic}</h3>

                  {draft.learnedFromQuery && (
                    <div className="mb-3 bg-zinc-800 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-zinc-500 mb-0.5">Learned from user asking:</p>
                      <p className="text-xs text-zinc-400 italic">"{draft.learnedFromQuery}"</p>
                    </div>
                  )}

                  <div className="border border-zinc-700 rounded-lg overflow-hidden">
                    <div className="bg-zinc-800 px-3 py-1.5 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <p className="text-[10px] text-zinc-400 font-mono">PROPOSED KNOWLEDGE</p>
                    </div>
                    <div className="px-3 py-2.5">
                      <p className="text-xs text-zinc-300 leading-relaxed line-clamp-5">{draft.content}</p>
                    </div>
                  </div>
                </div>

                <div className="flex border-t border-zinc-800 divide-x divide-zinc-800">
                  <button onClick={() => approveMutation.mutate(draft.id)} disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-40">
                    <CheckCircle className="w-3.5 h-3.5" /> Approve — Go Live
                  </button>
                  <button onClick={() => setDismissed(s => { const n = new Set(s); n.add(draft.id); return n; })}
                    className="px-4 flex items-center justify-center text-zinc-500 hover:bg-zinc-800 transition-colors">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { rejectMutation.mutate(draft.id); setDismissed(s => { const n = new Set(s); n.add(draft.id); return n; }); }} disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Panel 3: Product Intelligence ───────────────────────────────────────────

function IntelligencePanel() {
  const { data, isLoading } = useQuery<ProductData>({
    queryKey: ["/api/admin/product-intelligence"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/admin/product-intelligence"); return r.json(); },
    staleTime: 5 * 60 * 1000,
  });

  const maxSignups = Math.max(...(data?.signups || [{ signups: 1 }]).map(s => s.signups), 1);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* ARYA Opinion — always first */}
      {isLoading ? (
        <div className="h-24 bg-zinc-900 border border-amber-500/20 rounded-xl animate-pulse" />
      ) : data?.opinion ? (
        <div className="bg-zinc-900 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <p className="text-[10px] text-amber-400 font-mono uppercase tracking-widest">ARYA's Read</p>
          </div>
          <p className="text-zinc-200 leading-relaxed text-sm">{data.opinion}</p>
        </div>
      ) : null}

      {/* KPI row */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="Total Users" value={data.users.total} sub={`+${data.users.newThisWeek} this week`} color="cyan" />
          <MetricTile label="Active (7d)" value={data.users.activeThisWeek} sub={`${data.users.activeToday} today`} color="emerald" />
          <MetricTile label="Onboarding" value={`${data.users.onboardingRate}%`} sub={`${data.users.incomplete} incomplete`} color={data.users.onboardingRate >= 60 ? "emerald" : "amber"} />
          <MetricTile label="Total AI Cost" value={`₹${data.features.costInr}`} sub="all time" color="amber" />
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Feature usage */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-3">Feature Usage</p>
            <div className="space-y-3">
              {[
                { label: "Text Chats", value: data.features.totalChats, color: "bg-cyan-500" },
                { label: "Voice Minutes", value: data.features.voiceMinutes, color: "bg-emerald-500" },
                { label: "Deep Reasoning", value: data.features.deepReasoning, color: "bg-violet-500" },
              ].map(f => {
                const maxF = Math.max(data.features.totalChats, data.features.voiceMinutes, data.features.deepReasoning, 1);
                return (
                  <div key={f.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-zinc-400">{f.label}</span>
                      <span className="text-zinc-300 font-mono">{f.value.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div className={`h-full rounded-full ${f.color}`}
                        initial={{ width: 0 }} animate={{ width: `${(f.value / maxF) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plan breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-3">Plan Breakdown</p>
            <div className="space-y-3">
              {Object.entries(data.plans).length === 0 ? (
                <p className="text-xs text-zinc-600">No plan data yet.</p>
              ) : Object.entries(data.plans).map(([plan, count]) => {
                const total = Object.values(data.plans).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const colors: Record<string, string> = { pro: "bg-amber-500", core: "bg-cyan-500", free: "bg-zinc-600" };
                return (
                  <div key={plan}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-zinc-400 capitalize">{plan}</span>
                      <span className="text-zinc-300 font-mono">{count} · {pct}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div className={`h-full rounded-full ${colors[plan] || "bg-zinc-500"}`}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Signup sparkline */}
      {data && data.signups.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-3">New Signups — 14 days</p>
          <div className="flex items-end gap-1 h-16">
            {data.signups.map((s, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <motion.div className="w-full bg-cyan-500/70 rounded-sm"
                  initial={{ height: 0 }} animate={{ height: `${(s.signups / maxSignups) * 52}px` }}
                  transition={{ duration: 0.6, delay: i * 0.03, ease: "easeOut" }}
                  style={{ minHeight: s.signups > 0 ? "4px" : "0" }} />
                <span className="text-[8px] text-zinc-700 truncate w-full text-center hidden lg:block">{s.day?.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top queries */}
      {data && data.topQueries.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Top Queries</p>
            <p className="text-[10px] text-zinc-600">what users ask most</p>
          </div>
          <div className="divide-y divide-zinc-800">
            {data.topQueries.map((q, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-[10px] text-zinc-700 font-mono w-4 shrink-0">{i + 1}</span>
                <span className="flex-1 text-xs text-zinc-300 line-clamp-1 min-w-0">{q.query}</span>
                <span className="text-[10px] text-zinc-600 font-mono shrink-0">{q.domain}</span>
                <span className="text-[10px] font-mono text-zinc-500 shrink-0">×{q.query_count}</span>
                {q.is_gap && <span className="text-[9px] text-red-400 font-mono border border-red-400/30 rounded px-1 shrink-0">GAP</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function AdminARYA() {
  const [panel, setPanel] = useState<"arya" | "learning" | "intelligence">("arya");

  const { data: briefingData, isLoading: briefingLoading } = useQuery<BriefingData>({
    queryKey: ["/api/admin/arya/briefing"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/admin/arya/briefing"); return r.json(); },
    staleTime: 15 * 60 * 1000,
  });

  const { data: draftsData } = useQuery<{ drafts: Draft[] }>({
    queryKey: ["/api/learning/drafts"],
    queryFn: async () => { const r = await apiRequest("GET", "/api/learning/drafts"); return r.json(); },
  });

  const pendingCount = (draftsData?.drafts || []).filter(d => d.status === "pending").length;

  const NAV = [
    { id: "arya" as const, label: "My ARYA", icon: Sparkles, desc: "Founder's AI" },
    { id: "learning" as const, label: "Self-Learning", icon: Brain, desc: "Approve drafts", badge: pendingCount },
    { id: "intelligence" as const, label: "Product Intel", icon: BarChart3, desc: "What's working" },
  ];

  return (
    <div className="-m-3 sm:-m-5 md:-m-8 h-[calc(100vh-56px)] md:h-[calc(100vh-64px)] flex bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sub-nav rail */}
      <div className="w-44 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col pt-4 gap-1 px-2">
        <div className="px-2 pb-3 mb-1 border-b border-zinc-800">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Command</p>
        </div>
        {NAV.map(item => (
          <button key={item.id} onClick={() => setPanel(item.id)}
            className={`w-full text-left px-3 py-3 rounded-lg transition-all group ${panel === item.id ? "bg-zinc-800 text-zinc-100 border border-zinc-700" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <item.icon className={`w-3.5 h-3.5 ${panel === item.id ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-300"}`} />
              <span className="text-xs font-semibold leading-none">{item.label}</span>
              {"badge" in item && item.badge > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-amber-500 text-zinc-950 text-[10px] font-bold px-1">
                  {item.badge}
                </span>
              )}
            </div>
            <p className="text-[10px] text-zinc-600 pl-5 leading-tight">{item.desc}</p>
          </button>
        ))}
      </div>

      {/* Panel area */}
      <AnimatePresence mode="wait">
        <motion.div key={panel} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.18 }} className="flex-1 flex overflow-hidden min-w-0">
          {panel === "arya" && <MyARYAPanel briefingData={briefingData} isLoading={briefingLoading} />}
          {panel === "learning" && <LearningPanel />}
          {panel === "intelligence" && <IntelligencePanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
