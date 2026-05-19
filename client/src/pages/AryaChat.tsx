import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUserAuth } from "@/lib/user-auth";
import { useLocation } from "wouter";
import {
  Send,
  Mic,
  Paperclip,
  MoreHorizontal,
  Plus,
  Trash2,
  MessageSquare,
  Loader2,
  Square,
  PanelLeftOpen,
  PanelLeftClose,
  Globe,
  Volume2,
  VolumeX,
  Brain,
  ThumbsUp,
  ThumbsDown,
  Target,
  Lightbulb,
  X,
  Check,
  ChevronRight,
  Sparkles,
  Shield,
  Eye,
  EyeOff,
  User,
  LogIn,
  LogOut,
  Bell,
  ArrowRight,
  Briefcase,
  Clock,
  Settings,
  Palette,
  MessageCircleWarning,
  HelpCircle,
  Zap,
  MousePointer,
  CircleCheck,
  Sun,
  Moon,
  NotebookPen,
  Smile,
  Search,
  MicOff,
  CalendarDays,
  MapPin,
  ExternalLink,
  RefreshCw,
  Link2,
  Link2Off,
  Star,
  Crown,
  Users,
  Theater,
  Trophy,
  Headphones,
  ShieldCheck,
  Activity,
  Download,
  ChevronDown,
} from "lucide-react";
import { getTranslation, getStoredUiLanguage, LANGUAGE_OPTIONS, type UiLanguage } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { useTheme } from "@/lib/theme";
import RemindersPanel from "@/components/RemindersPanel";
import PricingModal from "@/components/PricingModal";
import { requestNotificationPermission } from "@/lib/push-notifications";

function FormattedMessage({ content, isUser }: { content: string; isUser?: boolean }) {
  if (isUser) {
    return <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>;
  }
  return (
    <div className="prose-arya text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-800 dark:text-gray-100">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-emerald-600 dark:text-emerald-400">{children}</strong>,
          em: ({ children }) => <em className="text-amber-600/90 dark:text-amber-400/90 not-italic font-medium">{children}</em>,
          h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 dark:text-white mb-2 mt-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0 pb-1 border-b border-gray-200 dark:border-slate-700">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5 mt-2 first:mt-0">{children}</h3>,
          ul: ({ children }) => <ul className="space-y-1.5 my-2 pl-0">{children}</ul>,
          ol: ({ children }) => {
            let counter = 0;
            const numberedChildren = Array.isArray(children)
              ? children.map((child: any) => {
                  if (child?.type === 'li' || (child?.props && child?.type)) {
                    counter++;
                    return child?.props ? { ...child, props: { ...child.props, 'data-index': counter } } : child;
                  }
                  return child;
                })
              : children;
            return <ol className="space-y-2 my-2 pl-0">{numberedChildren}</ol>;
          },
          li: ({ children, ...props }: any) => {
            const node = props.node;
            const isOrdered = node?.parentNode?.tagName === 'ol';
            const siblings = node?.parentNode?.children?.filter((c: any) => c.tagName === 'li') || [];
            const num = siblings.indexOf(node) + 1;
            return isOrdered ? (
              <li className="flex gap-2.5 items-start text-gray-800 dark:text-gray-100 list-none">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/20 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {num}
                </span>
                <span className="flex-1">{children}</span>
              </li>
            ) : (
              <li className="flex gap-2 items-start text-gray-800 dark:text-gray-100 list-none">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5" />
                <span className="flex-1">{children}</span>
              </li>
            );
          },
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            return isBlock ? (
              <pre className="bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg p-3 my-2 overflow-x-auto">
                <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{children}</code>
              </pre>
            ) : (
              <code className="bg-gray-100 dark:bg-slate-700 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-emerald-300 dark:border-emerald-700 pl-3 my-2 text-gray-600 dark:text-gray-300 italic">{children}</blockquote>
          ),
          hr: () => <hr className="border-gray-200 dark:border-slate-700 my-3" />,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-300">{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

interface LanguageOption {
  code: string;
  name: string;
  native: string;
}

interface MemoryItem {
  id: string;
  category: string;
  key: string;
  value: string;
  confidence: string;
  source: string;
  accessCount: number;
  updatedAt: string;
}

interface GoalItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  progress: number;
  steps: { id: string; description: string; status: string; order: number }[];
}

interface InsightItem {
  id: string;
  sourceType: string;
  title: string;
  insight: string;
  relevance: string;
  createdAt: string;
}

const DEFAULT_LANGUAGES: LanguageOption[] = [
  { code: "en-IN", name: "English", native: "English" },
  { code: "hi-IN", name: "Hindi", native: "हिन्दी" },
  { code: "bn-IN", name: "Bengali", native: "বাংলা" },
  { code: "ta-IN", name: "Tamil", native: "தமிழ்" },
  { code: "te-IN", name: "Telugu", native: "తెలుగు" },
  { code: "mr-IN", name: "Marathi", native: "मराठी" },
  { code: "kn-IN", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml-IN", name: "Malayalam", native: "മലയാളം" },
  { code: "gu-IN", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa-IN", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "od-IN", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "ar-SA", name: "Arabic", native: "العربية" },
  { code: "fr-FR", name: "French", native: "Français" },
  { code: "es-ES", name: "Spanish", native: "Español" },
  { code: "de-DE", name: "German", native: "Deutsch" },
  { code: "pt-BR", name: "Portuguese", native: "Português" },
  { code: "ru-RU", name: "Russian", native: "Русский" },
  { code: "ja-JP", name: "Japanese", native: "日本語" },
  { code: "zh-CN", name: "Chinese", native: "中文" },
  { code: "ko-KR", name: "Korean", native: "한국어" },
  { code: "it-IT", name: "Italian", native: "Italiano" },
  { code: "tr-TR", name: "Turkish", native: "Türkçe" },
  { code: "id-ID", name: "Indonesian", native: "Bahasa Indonesia" },
  { code: "nl-NL", name: "Dutch", native: "Nederlands" },
  { code: "sv-SE", name: "Swedish", native: "Svenska" },
];

const SARVAM_LANGUAGE_CODES = new Set([
  "hi-IN","bn-IN","ta-IN","te-IN","mr-IN","kn-IN","ml-IN","gu-IN","pa-IN","od-IN",
]);

const isGlobalVoiceLang = (code: string) =>
  !SARVAM_LANGUAGE_CODES.has(code) && code !== "en-IN";

function ConfidenceBadge({ confidence, sourcesCount, memoryUsed }: { confidence?: number; sourcesCount?: number; memoryUsed?: boolean }) {
  if (!confidence && confidence !== 0) return null;
  const pct = Math.round(confidence * 100);
  const colorClasses = pct >= 80
    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
    : pct >= 50
    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
    : "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 border-red-200 dark:border-red-800";
  return (
    <div className="flex items-center gap-1.5">
      {memoryUsed && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-medium border border-purple-200 dark:border-purple-800 flex items-center gap-0.5">
          <Brain className="w-2.5 h-2.5" />
          Memory
        </span>
      )}
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${colorClasses}`}>
        {pct}% sure
      </span>
      {sourcesCount !== undefined && sourcesCount > 0 && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400/70 font-medium">
          {sourcesCount} sources
        </span>
      )}
    </div>
  );
}

function FeedbackButtons({ messageId, conversationId }: { messageId: number; conversationId: number }) {
  const [submitted, setSubmitted] = useState<'up' | 'down' | null>(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correction, setCorrection] = useState("");

  const feedbackMutation = useMutation({
    mutationFn: async (data: { rating: 'up' | 'down'; correction_text?: string }) => {
      const res = await fetch("/api/arya/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message_id: messageId,
          conversation_id: conversationId,
          tenant_id: "varah",
          rating: data.rating,
          correction_text: data.correction_text,
        }),
      });
      return res.json();
    },
  });

  const handleFeedback = (rating: 'up' | 'down') => {
    setSubmitted(rating);
    if (rating === 'down') {
      setShowCorrection(true);
    } else {
      feedbackMutation.mutate({ rating });
    }
  };

  const submitCorrection = () => {
    feedbackMutation.mutate({ rating: 'down', correction_text: correction });
    setShowCorrection(false);
  };

  if (submitted === 'up') {
    return (
      <div className="flex items-center gap-1 mt-1">
        <ThumbsUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Thanks!</span>
      </div>
    );
  }

  return (
    <div className="mt-1.5">
      {!submitted && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            data-testid={`button-thumbsup-${messageId}`}
            onClick={() => handleFeedback('up')}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-300 dark:text-gray-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
          <button
            data-testid={`button-thumbsdown-${messageId}`}
            onClick={() => handleFeedback('down')}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
        </div>
      )}
      {showCorrection && (
        <div className="flex items-center gap-1.5 mt-1">
          <input
            data-testid={`input-correction-${messageId}`}
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="What should I have said?"
            className="flex-1 text-xs bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
            onKeyDown={(e) => e.key === 'Enter' && submitCorrection()}
          />
          <button onClick={submitCorrection} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400">
            <Send className="w-3 h-3" />
          </button>
          <button onClick={() => { setShowCorrection(false); setSubmitted(null); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-300 dark:text-gray-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

function MemoryPanel({ onClose, token }: { onClose: () => void; token?: string | null }) {
  const queryClient = useQueryClient();
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const { data, isLoading } = useQuery<{ memories: MemoryItem[]; total: number }>({
    queryKey: ["/api/arya/memory"],
    queryFn: async () => {
      const res = await fetch("/api/arya/memory", {
        headers: token ? { "x-user-token": token } : {},
      });
      if (!res.ok) return { memories: [], total: 0 };
      return res.json();
    },
    enabled: !!token,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/arya/memory/${id}`, {
        method: "DELETE",
        headers: token ? { "x-user-token": token } : {},
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/arya/memory"] }),
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/arya/memory", {
        method: "DELETE",
        headers: token ? { "x-user-token": token } : {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/arya/memory"] });
      setConfirmClearAll(false);
    },
  });

  const memories = data?.memories || [];
  const grouped: Record<string, MemoryItem[]> = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  const categoryIcons: Record<string, string> = {
    identity: "👤",
    preference: "⭐",
    fact: "📌",
    context: "🔄",
    relationship: "🤝",
  };

  return (
    <div className="w-80 h-full bg-white dark:bg-slate-900 backdrop-blur-xl border-l border-gray-200 dark:border-slate-700 flex flex-col" data-testid="panel-memory">
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Your Memory</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">{memories.length}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-3 py-2 bg-purple-50/60 dark:bg-purple-950/20 border-b border-purple-100 dark:border-purple-900/30">
        <p className="text-[10px] text-purple-700 dark:text-purple-400 leading-relaxed">
          🔒 <strong>This is your memory, not ours.</strong> ARYA uses it to know you better. You can delete any entry or clear everything at any time.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading && <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" /></div>}
        {!isLoading && memories.length === 0 && (
          <div className="text-center py-8">
            <Brain className="w-8 h-8 text-gray-300 dark:text-white/10 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No memories yet</p>
            <p className="text-xs text-gray-400 mt-1">ARYA builds memory as you chat</p>
          </div>
        )}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{categoryIcons[category] || "📝"}</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{category}</span>
            </div>
            <div className="space-y-1.5">
              {items.map((mem) => (
                <div key={mem.id} className="group flex items-start gap-2 px-2.5 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 border border-gray-100 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{mem.key}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{mem.value}</div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(mem.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all flex-shrink-0"
                    data-testid={`button-delete-memory-${mem.id}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {memories.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-slate-700">
          {confirmClearAll ? (
            <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-2">Clear all {memories.length} memories? This can't be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => clearAllMutation.mutate()}
                  disabled={clearAllMutation.isPending}
                  className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
                  data-testid="button-confirm-clear-all-memory"
                >
                  {clearAllMutation.isPending ? "Clearing…" : "Yes, clear all"}
                </button>
                <button
                  onClick={() => setConfirmClearAll(false)}
                  className="flex-1 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmClearAll(true)}
              className="w-full py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              data-testid="button-clear-all-memory"
            >
              Clear all memory
            </button>
          )}
          <p className="text-center text-[10px] text-muted-foreground mt-2">
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:underline text-purple-500">Your data rights & privacy →</a>
          </p>
        </div>
      )}
    </div>
  );
}

function CustomizePanel({ onClose, token }: { onClose: () => void; token: string }) {
  const queryClient = useQueryClient();
  const { language: ctxLanguage, setLanguage: setGlobalLang, t: tl } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: prefs, isLoading } = useQuery<{
    responseStyle: string;
    responseTone: string;
    focusAreas: string[] | null;
    wisdomQuotes: string;
    wantsNewsDigest: boolean;
    morningBriefingEnabled?: boolean;
    morningBriefingTime?: string;
    weeklyReviewEnabled?: boolean;
    uiLanguage?: string;
  }>({
    queryKey: ["/api/user/preferences"],
    queryFn: async () => {
      const res = await fetch("/api/user/preferences", {
        headers: { "x-user-token": token },
      });
      return res.json();
    },
  });

  const [style, setStyle] = useState("balanced");
  const [tone, setTone] = useState("friendly");
  const [focus, setFocus] = useState<string[]>([]);
  const [wisdom, setWisdom] = useState("sometimes");
  const [newsDigest, setNewsDigest] = useState(false);
  const [morningBriefing, setMorningBriefing] = useState(false);
  const [briefingTime, setBriefingTime] = useState("07:00");
  const [weeklyReview, setWeeklyReview] = useState(false);
  const [uiLang, setUiLang] = useState<UiLanguage>(ctxLanguage);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareName, setShareName] = useState("");
  const [shareContact, setShareContact] = useState("");
  const [sharePaused, setSharePaused] = useState(false);

  useEffect(() => {
    if (prefs) {
      setStyle(prefs.responseStyle || "balanced");
      setTone(prefs.responseTone || "friendly");
      setFocus(prefs.focusAreas || []);
      setWisdom(prefs.wisdomQuotes || "sometimes");
      setNewsDigest(!!prefs.wantsNewsDigest);
      setMorningBriefing(!!prefs.morningBriefingEnabled);
      setBriefingTime(prefs.morningBriefingTime || "07:00");
      setWeeklyReview(!!prefs.weeklyReviewEnabled);
      const lang = (prefs.uiLanguage || "en") as UiLanguage;
      setUiLang(lang);
      setShareEnabled(!!(prefs as any).reflectionShareEnabled);
      setShareName((prefs as any).reflectionShareName || "");
      setShareContact((prefs as any).reflectionShareContact || "");
      setSharePaused(!!(prefs as any).reflectionSharePaused);
    }
  }, [prefs]);

  const savePrefs = async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/user/preferences", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-token": token },
          body: JSON.stringify({ responseStyle: style, responseTone: tone, focusAreas: focus, wisdomQuotes: wisdom }),
        }),
        fetch("/api/user/news-notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-token": token },
          body: JSON.stringify({ enabled: newsDigest }),
        }),
        fetch("/api/user/morning-briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-token": token },
          body: JSON.stringify({ enabled: morningBriefing, time: briefingTime }),
        }),
        fetch("/api/user/weekly-review", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-token": token },
          body: JSON.stringify({ enabled: weeklyReview }),
        }),
        fetch("/api/user/ui-language", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-token": token },
          body: JSON.stringify({ language: uiLang }),
        }),
        fetch("/api/user/reflection-share", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-token": token },
          body: JSON.stringify({ enabled: shareEnabled, name: shareName, contact: shareContact, paused: sharePaused }),
        }),
      ]);
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const toggleFocus = (area: string) => {
    setFocus(prev => prev.includes(area) ? prev.filter(a => a !== area) : prev.length < 4 ? [...prev, area] : prev);
  };

  const styleOptions = [
    { value: "concise", label: tl("c_short"), desc: tl("c_short_desc") },
    { value: "balanced", label: tl("c_balanced"), desc: tl("c_balanced_desc") },
    { value: "detailed", label: tl("c_indepth"), desc: tl("c_indepth_desc") },
  ];
  const toneOptions = [
    { value: "motivating", label: tl("c_motivating"), icon: "🔥" },
    { value: "gentle", label: tl("c_gentle"), icon: "🌿" },
    { value: "direct", label: tl("c_direct"), icon: "🎯" },
    { value: "friendly", label: tl("c_friendly"), icon: "😊" },
  ];
  const focusOptions = [
    { value: "career", label: tl("c_career"), icon: "💼" },
    { value: "health", label: tl("c_health"), icon: "🏥" },
    { value: "spirituality", label: tl("c_spirituality"), icon: "🧘" },
    { value: "finance", label: tl("c_finance"), icon: "💰" },
    { value: "relationships", label: tl("c_relationships"), icon: "❤️" },
    { value: "learning", label: tl("c_learning"), icon: "📚" },
    { value: "creativity", label: tl("c_creativity"), icon: "🎨" },
    { value: "fitness", label: tl("c_fitness"), icon: "💪" },
  ];
  const wisdomOptions = [
    { value: "always", label: tl("c_wisdom_always"), desc: tl("c_wisdom_always_desc") },
    { value: "sometimes", label: tl("c_wisdom_sometimes"), desc: tl("c_wisdom_sometimes_desc") },
    { value: "never", label: tl("c_wisdom_never"), desc: tl("c_wisdom_never_desc") },
  ];

  return (
    <div className="w-80 sm:w-96 h-full bg-white dark:bg-slate-900 backdrop-blur-xl border-l border-gray-200 dark:border-slate-700 flex flex-col" data-testid="panel-customize">
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{tl("customize_arya")}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400" data-testid="button-close-customize">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-emerald-600 dark:text-emerald-400" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="text-[11px] text-gray-400 leading-relaxed">
            {tl("customize_intro")}
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{tl("response_length")}</div>
            <div className="space-y-1.5">
              {styleOptions.map(opt => (
                <button
                  key={opt.value}
                  data-testid={`option-style-${opt.value}`}
                  onClick={() => setStyle(opt.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                    style === opt.value
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-slate-700 border border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    style === opt.value ? "border-emerald-400 bg-emerald-400" : "border-gray-200 dark:border-slate-700"
                  }`} />
                  <div>
                    <div className="text-xs font-medium">{opt.label}</div>
                    <div className="text-[10px] text-gray-400">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{tl("conversation_tone")}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {toneOptions.map(opt => (
                <button
                  key={opt.value}
                  data-testid={`option-tone-${opt.value}`}
                  onClick={() => setTone(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    tone === opt.value
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-slate-700 border border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="text-sm">{opt.icon}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">{tl("focus_areas")}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">{tl("c_focus_pick")}</div>
            <div className="grid grid-cols-2 gap-1.5">
              {focusOptions.map(opt => (
                <button
                  key={opt.value}
                  data-testid={`option-focus-${opt.value}`}
                  onClick={() => toggleFocus(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    focus.includes(opt.value)
                      ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-300 text-amber-600 dark:text-amber-400"
                      : "bg-gray-100 dark:bg-slate-700 border border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span className="text-sm">{opt.icon}</span>
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Wisdom & Quotes</div>
            <div className="space-y-1.5">
              {wisdomOptions.map(opt => (
                <button
                  key={opt.value}
                  data-testid={`option-wisdom-${opt.value}`}
                  onClick={() => setWisdom(opt.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                    wisdom === opt.value
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-slate-700 border border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    wisdom === opt.value ? "border-emerald-400 bg-emerald-400" : "border-gray-200 dark:border-slate-700"
                  }`} />
                  <div>
                    <div className="text-xs font-medium">{opt.label}</div>
                    <div className="text-[10px] text-gray-400">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">News & Updates</div>

            {/* Daily News Digest */}
            <button data-testid="toggle-news-digest" type="button" onClick={() => setNewsDigest(v => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${newsDigest ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700" : "bg-gray-100 dark:bg-slate-700 border-transparent"}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📰</span>
                <div className="text-left">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Daily News Digest</div>
                  <div className="text-[10px] text-gray-400">India & world headlines, 6-hourly</div>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${newsDigest ? "bg-amber-400" : "bg-gray-200 dark:bg-slate-600"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${newsDigest ? "left-4" : "left-0.5"}`} />
              </div>
            </button>

            {/* Morning Briefing */}
            <button data-testid="toggle-morning-briefing" type="button" onClick={() => setMorningBriefing(v => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${morningBriefing ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700" : "bg-gray-100 dark:bg-slate-700 border-transparent"}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">☀️</span>
                <div className="text-left">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Morning Briefing</div>
                  <div className="text-[10px] text-gray-400">Goals + news + motivation at 7 AM IST</div>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${morningBriefing ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-600"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${morningBriefing ? "left-4" : "left-0.5"}`} />
              </div>
            </button>

            {/* Weekly Review */}
            <button data-testid="toggle-weekly-review" type="button" onClick={() => setWeeklyReview(v => !v)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all ${weeklyReview ? "bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700" : "bg-gray-100 dark:bg-slate-700 border-transparent"}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">📊</span>
                <div className="text-left">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Weekly Review</div>
                  <div className="text-[10px] text-gray-400">Sunday evening progress summary</div>
                </div>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${weeklyReview ? "bg-purple-500" : "bg-gray-200 dark:bg-slate-600"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${weeklyReview ? "left-4" : "left-0.5"}`} />
              </div>
            </button>
          </div>

          {/* Share your week */}
          <div className="border border-gray-100 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                  <span>🔗</span> Weekly reflection link
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 leading-snug">
                  Each Sunday ARYA creates a private summary of your week. Turn this on to get a shareable link you can optionally send to a trusted person.
                </div>
              </div>
              <button
                data-testid="toggle-reflection-share"
                type="button"
                onClick={() => setShareEnabled(v => !v)}
                className="flex-shrink-0"
              >
                <div className={`w-9 h-5 rounded-full transition-colors relative ${shareEnabled ? "bg-emerald-500" : "bg-gray-200 dark:bg-slate-600"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${shareEnabled ? "left-4" : "left-0.5"}`} />
                </div>
              </button>
            </div>

            {shareEnabled && (
              <div className="space-y-2 pt-1">
                <div>
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mb-1 block">Their name</label>
                  <input
                    data-testid="input-share-name"
                    type="text"
                    value={shareName}
                    onChange={e => setShareName(e.target.value)}
                    placeholder="e.g. Priya, Dad, Rohit"
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-xs text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mb-1 block">Their phone or email (so you remember who it's for)</label>
                  <input
                    data-testid="input-share-contact"
                    type="text"
                    value={shareContact}
                    onChange={e => setShareContact(e.target.value)}
                    placeholder="WhatsApp number or email"
                    className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-xs text-gray-800 dark:text-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-400 placeholder:text-gray-400"
                  />
                </div>
                <button
                  data-testid="toggle-share-paused"
                  type="button"
                  onClick={() => setSharePaused(v => !v)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all ${sharePaused ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400" : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500"}`}
                >
                  <span>{sharePaused ? "⏸ Sharing paused this week" : "✓ Sharing active every Sunday"}</span>
                  <span className="text-[10px]">{sharePaused ? "Tap to resume" : "Tap to pause"}</span>
                </button>
                <p className="text-[10px] text-gray-400 leading-relaxed">
                  Each Sunday, ARYA will generate your reflection and show you a link to share — you always choose whether to send it that week.
                </p>
              </div>
            )}
          </div>

          {/* App Language */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">{tl("ui_language")}</div>
              <span className="text-[10px] text-muted-foreground bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">25 languages</span>
            </div>

            {/* India section */}
            <div className="mb-2">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                <span>🇮🇳</span> India
              </div>
              <div className="grid grid-cols-3 gap-1">
                {LANGUAGE_OPTIONS.filter(l => l.group === "india").map(({ code, native, flag }) => (
                  <button key={code} data-testid={`option-lang-${code}`} onClick={() => { const l = code as UiLanguage; setUiLang(l); setGlobalLang(l); }}
                    className={`flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg transition-all ${
                      uiLang === code
                        ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400"
                        : "bg-gray-100 dark:bg-slate-700 border border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    <span className="text-sm leading-none">{flag}</span>
                    <span className="text-[10px] font-medium leading-tight text-center">{native}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Global section */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1">
                <span>🌍</span> Global
              </div>
              <div className="grid grid-cols-3 gap-1">
                {LANGUAGE_OPTIONS.filter(l => l.group === "global").map(({ code, native, flag }) => (
                  <button key={code} data-testid={`option-lang-${code}`} onClick={() => { const l = code as UiLanguage; setUiLang(l); setGlobalLang(l); }}
                    className={`flex flex-col items-center gap-0.5 px-1 py-2 rounded-lg transition-all ${
                      uiLang === code
                        ? "bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400"
                        : "bg-gray-100 dark:bg-slate-700 border border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    <span className="text-sm leading-none">{flag}</span>
                    <span className="text-[10px] font-medium leading-tight text-center">{native}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            data-testid="button-save-preferences"
            onClick={savePrefs}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 text-xs font-semibold hover:from-emerald-500/30 hover:to-emerald-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
            {saving ? tl("c_saving") : saved ? tl("c_saved") : tl("c_save")}
          </button>
        </div>
      )}
    </div>
  );
}

const INTEREST_OPTIONS = [
  "Reading", "Fitness", "Cooking", "Travel", "Music", "Art", "Photography",
  "Technology", "Gaming", "Meditation", "Yoga", "Writing", "Finance",
  "Entrepreneurship", "Nature", "Cricket", "Football", "Cinema", "Podcasts",
];

function UserProfileModal({ token, onClose, userName }: { token: string; onClose: () => void; userName: string }) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [interestInput, setInterestInput] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    age: "",
    city: "",
    occupation: "",
    lifeStage: "",
    familySituation: "",
    interests: [] as string[],
    currentChallenges: "",
    workingStyle: "",
  });

  const { data: profile, isLoading } = useQuery<any>({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile", { headers: { "x-user-token": token } });
      return res.json();
    },
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        phone: profile.phone || "",
        age: profile.age ? String(profile.age) : "",
        city: profile.city || "",
        occupation: profile.occupation || profile.currentWork || "",
        lifeStage: profile.lifeStage || "",
        familySituation: profile.familySituation || "",
        interests: Array.isArray(profile.interests) ? profile.interests : [],
        currentChallenges: profile.currentChallenges || "",
        workingStyle: profile.workingStyle || "",
      });
    }
  }, [profile]);

  const toggleInterest = (val: string) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(val) ? f.interests.filter(i => i !== val) : [...f.interests, val],
    }));
  };

  const addCustomInterest = () => {
    const v = interestInput.trim();
    if (v && !form.interests.includes(v) && form.interests.length < 10) {
      setForm(f => ({ ...f, interests: [...f.interests, v] }));
      setInterestInput("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({
          ...form,
          age: form.age ? Number(form.age) : null,
          name: form.name.trim() || undefined,
          phone: form.phone.trim() || undefined,
        }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/me"] });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1000);
    } catch {}
    setSaving(false);
  };

  const btn = (field: keyof typeof form, val: string, label: string) => (
    <button
      key={val}
      data-testid={`profile-option-${field}-${val}`}
      onClick={() => setForm(f => ({ ...f, [field]: f[field as keyof typeof form] === val ? "" : val }))}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
        form[field] === val
          ? "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300"
          : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-cyan-200 dark:hover:border-cyan-800"
      }`}
    >{label}</button>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
        data-testid="profile-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white font-['Space_Grotesk']">{t("profile_title")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{t("profile_subtitle")}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400" data-testid="button-close-profile">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Optional nudge banner */}
        <div className="mx-5 mt-4 px-4 py-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 flex items-start gap-3 flex-shrink-0">
          <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-cyan-700 dark:text-cyan-300 leading-relaxed">
            {t("profile_nudge")}
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-500" />
            </div>
          ) : (
            <>
              {/* Account info */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t("profile_account")}</div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{t("profile_display_name")}</label>
                    <input
                      data-testid="input-profile-name"
                      type="text"
                      placeholder={t("profile_name_ph")}
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{t("profile_email")}</label>
                    <input
                      data-testid="input-profile-email"
                      type="email"
                      readOnly
                      value={profile?.email || ""}
                      className="w-full bg-gray-100 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 px-3 py-2.5 cursor-not-allowed"
                      title={t("profile_email_hint")}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">{t("profile_email_hint")}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{t("profile_phone")}</label>
                    <input
                      data-testid="input-profile-phone"
                      type="tel"
                      placeholder={t("profile_phone_ph")}
                      value={form.phone}
                      onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-slate-700" />

              {/* About you */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t("profile_about")}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{t("profile_age")}</label>
                    <input
                      data-testid="input-profile-age"
                      type="number"
                      min={10} max={99}
                      placeholder="e.g. 28"
                      value={form.age}
                      onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{t("profile_city")}</label>
                    <input
                      data-testid="input-profile-city"
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={form.city}
                      onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-muted-foreground mb-1.5">{t("profile_occupation")}</label>
                  <input
                    data-testid="input-profile-occupation"
                    type="text"
                    placeholder={t("profile_occ_ph")}
                    value={form.occupation}
                    onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700"
                  />
                </div>
              </div>

              {/* Life stage */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t("profile_life_stage")}</div>
                <div className="flex flex-wrap gap-2">
                  {btn("lifeStage", "student", "Student")}
                  {btn("lifeStage", "early_career", "Early career")}
                  {btn("lifeStage", "professional", "Professional")}
                  {btn("lifeStage", "entrepreneur", "Entrepreneur")}
                  {btn("lifeStage", "parent", "Parent")}
                  {btn("lifeStage", "senior", "Senior professional")}
                  {btn("lifeStage", "retired", "Retired")}
                </div>
              </div>

              {/* Family */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t("profile_personal_life")}</div>
                <div className="flex flex-wrap gap-2">
                  {btn("familySituation", "single", "Single")}
                  {btn("familySituation", "partnered", "In a relationship")}
                  {btn("familySituation", "married", "Married")}
                  {btn("familySituation", "married_with_kids", "Married with kids")}
                  {btn("familySituation", "single_parent", "Single parent")}
                </div>
              </div>

              {/* Working style */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">{t("profile_work_style")}</div>
                <div className="flex flex-wrap gap-2">
                  {btn("workingStyle", "early_bird", "🌅 Early bird")}
                  {btn("workingStyle", "night_owl", "🌙 Night owl")}
                  {btn("workingStyle", "structured", "📋 Structured")}
                  {btn("workingStyle", "flexible", "🌊 Flexible")}
                </div>
              </div>

              {/* Interests */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  {t("profile_interests")}
                  <span className="ml-2 font-normal text-gray-400 normal-case">({form.interests.length}/10 {t("profile_add") === "Add" ? "selected" : "चुने"})</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  {INTEREST_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      data-testid={`profile-interest-${opt}`}
                      onClick={() => toggleInterest(opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        form.interests.includes(opt)
                          ? "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300"
                          : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-cyan-200 dark:hover:border-cyan-800"
                      }`}
                    >{opt}</button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    data-testid="input-profile-custom-interest"
                    type="text"
                    placeholder={t("profile_interests_add")}
                    value={interestInput}
                    onChange={e => setInterestInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomInterest(); } }}
                    className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700"
                  />
                  <button
                    data-testid="button-add-custom-interest"
                    onClick={addCustomInterest}
                    className="px-3 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400 text-xs font-medium hover:bg-cyan-100 dark:hover:bg-cyan-900/50 transition-all"
                  >{t("profile_add")}</button>
                </div>
                {form.interests.filter(i => !INTEREST_OPTIONS.includes(i)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.interests.filter(i => !INTEREST_OPTIONS.includes(i)).map(i => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-cyan-50 dark:bg-cyan-900/30 border border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300">
                        {i}
                        <button onClick={() => setForm(f => ({ ...f, interests: f.interests.filter(x => x !== i) }))} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Current challenges */}
              <div>
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{t("profile_challenges")}</div>
                <p className="text-xs text-muted-foreground mb-2">{t("profile_challenges_hint")}</p>
                <textarea
                  data-testid="input-profile-challenges"
                  rows={3}
                  placeholder={t("profile_challenges_ph")}
                  value={form.currentChallenges}
                  onChange={e => setForm(f => ({ ...f, currentChallenges: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-white px-3 py-2.5 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700 resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 flex-shrink-0 space-y-3">
          <button
            data-testid="button-save-profile"
            onClick={handleSave}
            disabled={saving || isLoading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <User className="w-4 h-4" />}
            {saving ? t("profile_saving") : saved ? t("profile_saved") : t("profile_save")}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            🔒 Your profile is private and used only to personalise your ARYA experience. We never share it. See our{" "}
            <a href="/terms" target="_blank" className="text-cyan-600 dark:text-cyan-400 hover:underline">Terms</a>{" "}
            &amp;{" "}
            <a href="/privacy" target="_blank" className="text-cyan-600 dark:text-cyan-400 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function CalendarPanel({ onClose, token }: { onClose: () => void; token: string }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [days, setDays] = useState(1);

  const { data: statusData, refetch: refetchStatus } = useQuery<{ connected: boolean }>({
    queryKey: ["/api/calendar/status"],
    queryFn: async () => {
      const res = await fetch("/api/calendar/status", { headers: { "x-user-token": token } });
      if (!res.ok) return { connected: false };
      return res.json();
    },
    onSuccess: (d: any) => setConnected(d.connected),
  } as any);

  useEffect(() => { if (statusData) setConnected(statusData.connected); }, [statusData]);

  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = useQuery<{ events: any[] }>({
    queryKey: ["/api/calendar/events", days],
    queryFn: async () => {
      const res = await fetch(`/api/calendar/events?days=${days}`, { headers: { "x-user-token": token } });
      if (!res.ok) return { events: [] };
      return res.json();
    },
    enabled: connected === true,
  });

  const events = eventsData?.events || [];

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/calendar/auth-url", { headers: { "x-user-token": token } });
      const data = await res.json();
      if (data.url) {
        const popup = window.open(data.url, "gcal_auth", "width=500,height=600,scrollbars=yes");
        const timer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(timer);
            refetchStatus();
            setConnecting(false);
          }
        }, 800);
      }
    } catch { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/calendar/disconnect", { method: "DELETE", headers: { "x-user-token": token } });
      setConnected(false);
      refetchStatus();
    } catch {}
    setDisconnecting(false);
  };

  const formatEventTime = (iso: string, isAllDay: boolean) => {
    if (isAllDay || !iso) return "All day";
    const d = new Date(iso);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
  };

  const formatEventDate = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
  };

  const groupedEvents: Record<string, any[]> = {};
  events.forEach(e => {
    const label = formatEventDate(e.start);
    if (!groupedEvents[label]) groupedEvents[label] = [];
    groupedEvents[label].push(e);
  });

  return (
    <div className="w-[min(320px,100vw)] sm:w-96 h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 flex flex-col" data-testid="panel-calendar">
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Google Calendar</span>
        </div>
        <div className="flex items-center gap-1">
          {connected && (
            <button onClick={() => { refetchEvents(); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400" title="Refresh" data-testid="button-refresh-calendar">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400" data-testid="button-close-calendar">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {connected === null ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-blue-500" /></div>
      ) : !connected ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Connect Google Calendar</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
            See today's meetings in your morning briefing and let ARYA help you prepare for what's ahead.
          </p>
          <button
            data-testid="button-connect-calendar"
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
            {connecting ? "Opening Google..." : "Connect Google Calendar"}
          </button>
          <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-3">Read-only access. Your data stays private.</p>
        </div>
      ) : (
        <>
          <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
                {[["Today", 1], ["Week", 7]].map(([label, d]) => (
                  <button
                    key={d}
                    data-testid={`button-cal-range-${d}`}
                    onClick={() => setDays(d as number)}
                    className={`px-2.5 py-1 text-[10px] font-medium transition-colors ${
                      days === d
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700"
                    }`}
                  >{label}</button>
                ))}
              </div>
              <button
                data-testid="button-disconnect-calendar"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="text-[10px] text-gray-300 hover:text-red-500 transition-colors flex items-center gap-1"
                title="Disconnect"
              >
                <Link2Off className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-10 px-4">
                <CalendarDays className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No events {days === 1 ? "today" : "this week"}</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Enjoy the free time!</p>
              </div>
            ) : (
              <div className="p-2 space-y-3">
                {Object.entries(groupedEvents).map(([dateLabel, dayEvents]) => (
                  <div key={dateLabel}>
                    <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400">{dateLabel}</div>
                    <div className="space-y-1">
                      {dayEvents.map(evt => (
                        <div
                          key={evt.id}
                          data-testid={`card-event-${evt.id}`}
                          className="group flex gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all"
                        >
                          <div className="flex-shrink-0 w-1 rounded-full bg-blue-400 dark:bg-blue-600 self-stretch" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate flex-1">{evt.title}</span>
                              {evt.link && (
                                <a href={evt.link} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 flex-shrink-0" data-testid={`link-event-${evt.id}`}>
                                  <ExternalLink className="w-3 h-3 text-gray-300 hover:text-blue-500" />
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                {formatEventTime(evt.start, evt.isAllDay)}
                                {!evt.isAllDay && evt.end && ` – ${formatEventTime(evt.end, false)}`}
                              </span>
                              {evt.location && (
                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5 truncate max-w-[120px]">
                                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{evt.location}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function GoalsPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { token, isLoggedIn } = useUserAuth();
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalSteps, setNewGoalSteps] = useState("");

  const { data: goals, isLoading } = useQuery<GoalItem[]>({
    queryKey: ["/api/user/goals"],
    enabled: !!token,
    queryFn: async () => {
      const res = await fetch("/api/user/goals", {
        headers: { "x-user-token": token! },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async () => {
      const steps = newGoalSteps.split("\n").map(s => s.trim()).filter(Boolean);
      const res = await fetch("/api/user/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token! },
        body: JSON.stringify({ title: newGoalTitle, steps, goalType: "habit" }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/goals"] });
      setNewGoalTitle("");
      setNewGoalSteps("");
    },
  });

  const toggleStepMutation = useMutation({
    mutationFn: async ({ stepId, status }: { stepId: string; status: string }) => {
      const newStatus = status === 'completed' ? 'pending' : 'completed';
      await fetch(`/api/arya/goals/steps/${stepId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/goals"] }),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      await fetch(`/api/user/goals/${goalId}`, {
        method: "DELETE",
        headers: { "x-user-token": token! },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/goals"] }),
  });

  const goalsList = goals || [];
  const priorityColors: Record<string, string> = {
    low: "text-gray-400", medium: "text-blue-400", high: "text-amber-600 dark:text-amber-400", critical: "text-red-500 dark:text-red-400"
  };

  return (
    <div className="w-80 h-full bg-white dark:bg-slate-900 backdrop-blur-xl border-l border-gray-200 dark:border-slate-700 flex flex-col" data-testid="panel-goals">
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Goals & Plans</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">{goalsList.filter(g => g.status === 'active').length}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 border-b border-gray-200 dark:border-slate-700">
        <input
          data-testid="input-goal-title"
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          placeholder="What's your goal?"
          className="w-full text-xs bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:border-amber-300 mb-1.5"
        />
        <textarea
          data-testid="input-goal-steps"
          value={newGoalSteps}
          onChange={(e) => setNewGoalSteps(e.target.value)}
          placeholder="Steps (one per line, optional)"
          rows={2}
          className="w-full text-xs bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:border-amber-300 resize-none mb-1.5"
        />
        <Button
          data-testid="button-create-goal"
          onClick={() => newGoalTitle.trim() && createGoalMutation.mutate()}
          disabled={!newGoalTitle.trim()}
          size="sm"
          className="w-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-200 border border-amber-200 dark:border-amber-800 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Goal
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading && <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-amber-600 dark:text-amber-400" /></div>}
        {goalsList.map((goal) => (
          <div key={goal.id} className="rounded-xl bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 p-3 group" data-testid={`card-goal-${goal.id}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] uppercase font-bold ${priorityColors[goal.priority]}`}>{goal.priority}</span>
                  {goal.status === 'completed' && <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <h4 className="text-xs font-medium text-gray-900 dark:text-white mt-0.5">{goal.title}</h4>
              </div>
              <button
                onClick={() => deleteGoalMutation.mutate(goal.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {goal.steps.length > 0 && (
              <div className="mb-2">
                <div className="w-full h-1 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                </div>
                <span className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5 block">{goal.progress}%</span>
              </div>
            )}

            <div className="space-y-1">
              {goal.steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => toggleStepMutation.mutate({ stepId: step.id, status: step.status })}
                  className="w-full flex items-start gap-2 text-left px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                  data-testid={`button-step-${step.id}`}
                >
                  <div className={`w-3.5 h-3.5 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300' : 'border-gray-200 dark:border-slate-700'
                  }`}>
                    {step.status === 'completed' && <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <span className={`text-[11px] ${step.status === 'completed' ? 'text-gray-300 dark:text-gray-600 line-through' : 'text-gray-600 dark:text-gray-300'}`}>
                    {step.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {!isLoading && goalsList.length === 0 && (
          <div className="text-center py-8">
            <Target className="w-8 h-8 text-gray-300 dark:text-white/10 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No goals yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Add a goal above, or just tell ARYA about it in chat</p>
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceNotesPanel({ onClose, token, uiLang = "en", voiceLang = "en-IN" }: { onClose: () => void; token: string; uiLang?: UiLanguage; voiceLang?: string }) {
  const tl = (key: string) => getTranslation(uiLang, key);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading } = useQuery<{ notes: any[] }>({
    queryKey: ["/api/user/voice-notes"],
    queryFn: async () => {
      const res = await fetch("/api/user/voice-notes", { headers: { "x-user-token": token } });
      if (!res.ok) return { notes: [] };
      return res.json();
    },
  });

  const notes = (data?.notes || []).filter(n =>
    !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.transcript?.toLowerCase().includes(search.toLowerCase())
  );

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/user/voice-notes/${id}`, { method: "DELETE", headers: { "x-user-token": token } });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user/voice-notes"] }),
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);
      mediaRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      setTranscript("");
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { alert("Microphone access required"); }
  };

  const stopRecording = () => {
    if (!mediaRef.current) return;
    const mr = mediaRef.current;
    const duration = recordingTime;
    mr.stop();
    mr.stream.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        setSaving(true);
        try {
          const sttRes = await fetch("/api/arya/stt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64, language: voiceLang }),
          });
          const sttData = await sttRes.json();
          const text = sttData.transcript || sttData.text || "";
          if (text.trim()) {
            setTranscript(text);
            await fetch("/api/user/voice-notes", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-token": token },
              body: JSON.stringify({ transcript: text, durationSeconds: duration }),
            });
            queryClient.invalidateQueries({ queryKey: ["/api/user/voice-notes"] });
            setTranscript("");
          }
        } catch { }
        setSaving(false);
      };
      reader.readAsDataURL(blob);
    };
  };

  const formatDur = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="w-80 sm:w-96 h-full bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 flex flex-col" data-testid="panel-voice-notes">
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <NotebookPen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{tl("voice_notes")}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400" data-testid="button-close-voice-notes">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 border-b border-gray-100 dark:border-slate-700 space-y-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:outline-none"
            />
          </div>
        </div>
        <button
          data-testid="button-record-note"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white border border-red-400"
              : "bg-gradient-to-r from-violet-500/20 to-violet-600/10 border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:from-violet-500/30 hover:to-violet-600/20"
          }`}
        >
          {saving ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
          ) : isRecording ? (
            <><MicOff className="w-3.5 h-3.5" /> Stop &amp; Save ({Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")})</>
          ) : (
            <><Mic className="w-3.5 h-3.5" /> {tl("record_note")}</>
          )}
        </button>
        {isRecording && (
          <div className="flex items-center gap-1 justify-center">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: `${8 + Math.random() * 10}px`, animationDelay: `${i * 0.15}s` }} />
            ))}
            <span className="text-[10px] text-red-500 ml-1">{tl("recording")}…</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-violet-500" /></div>
        ) : notes.length === 0 ? (
          <div className="text-center py-10 px-3">
            <NotebookPen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">{search ? "No notes match your search" : tl("no_notes")}</p>
            <p className="text-xs text-gray-300 mt-1">{search ? "" : tl("start_recording")}</p>
          </div>
        ) : notes.map((note) => (
          <div key={note.id} data-testid={`card-voice-note-${note.id}`} className="group flex items-start gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 hover:border-violet-200 dark:hover:border-violet-800 transition-all">
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mic className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">{note.title || note.transcript?.slice(0, 40)}</div>
              <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{note.transcript}</div>
              <div className="text-[10px] text-gray-300 dark:text-gray-600 mt-1 flex items-center gap-2">
                <span>{formatDate(note.createdAt)}</span>
                {note.durationSeconds > 0 && <span>· {formatDur(note.durationSeconds)}</span>}
              </div>
            </div>
            <button
              onClick={() => deleteNote.mutate(note.id)}
              data-testid={`button-delete-note-${note.id}`}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function LoginToastContent({ token }: { token: string | null }) {
  const today = new Date().toDateString();
  const cacheKey = `arya_quote_v3_${today}`;
  const [content, setContent] = useState<{ type: "quote"; text: string } | { type: "fact"; text: string; emoji: string } | null>(null);

  useEffect(() => {
    // Try cached quote first (instant, no extra API call)
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.quote) {
          setContent({ type: "quote", text: parsed.quote });
          return;
        }
      }
    } catch {}
    // Fallback: random fun fact
    const facts = PRODUCTIVITY_FACTS_DATA;
    const pick = facts[Math.floor(Math.random() * facts.length)];
    setContent({ type: "fact", text: pick.fact, emoji: pick.emoji });
  }, []);

  if (!content) return <span className="text-xs text-gray-400 italic">Glad you're here.</span>;

  if (content.type === "quote") {
    return (
      <p className="text-xs text-gray-700 leading-snug italic">
        "{content.text}"
      </p>
    );
  }
  return (
    <p className="text-xs text-gray-700 leading-snug">
      <span className="mr-1" role="img">{content.emoji}</span>
      {content.text}
    </p>
  );
}

const PRODUCTIVITY_FACTS_DATA = [
  { fact: "People who write down their goals are 42% more likely to achieve them.", emoji: "✍️" },
  { fact: "The brain processes information 60,000× faster with images than with text.", emoji: "🧠" },
  { fact: "A 10-minute walk can boost creative thinking by up to 81%.", emoji: "🚶" },
  { fact: "The most productive people work in 90-minute focused bursts.", emoji: "⏱️" },
  { fact: "Sleep is your brain's cleanup crew — it consolidates memories during deep sleep.", emoji: "😴" },
  { fact: "Saying your goal out loud to someone doubles your commitment to it.", emoji: "🗣️" },
  { fact: "Multitasking reduces productivity by up to 40%. Single-tasking is a superpower.", emoji: "🎯" },
  { fact: "The first 2 hours after waking are your brain's peak creativity window.", emoji: "🌅" },
  { fact: "Gratitude journaling for 5 minutes daily rewires the brain toward optimism.", emoji: "🙏" },
  { fact: "A clutter-free desk reduces cortisol (stress hormone) measurably.", emoji: "🧹" },
  { fact: "Deep breathing for 60 seconds lowers heart rate and sharpens focus.", emoji: "🌬️" },
  { fact: "People make better decisions when they are mildly hungry, not full.", emoji: "🍎" },
];

const STATIC_HOME_QUOTES = [
  "The clearest sign of wisdom is continued cheerfulness. — Montaigne",
  "You don't have to see the whole staircase, just take the first step. — MLK",
  "The mind is everything. What you think, you become. — Buddha",
  "An investment in knowledge pays the best interest. — Franklin",
  "Where focus goes, energy flows. — Tony Robbins",
  "Clarity is the counterbalance of profound thoughts. — Luc de Clapiers",
  "Begin anywhere. — John Cage",
  "A year from now you'll wish you had started today.",
  "Think lightly of yourself and deeply of the world. — Miyamoto Musashi",
  "The quieter you become, the more you can hear. — Ram Dass",
];

// ── Feature tour cards shown once to new users on first login ──────────────
const FEATURE_TOUR_CARDS = [
  {
    icon: "🎤",
    title: "Speak to ARYA",
    desc: "Tap the mic and talk naturally — ARYA listens and responds in any of 11 Indian languages.",
    color: "#059669",
    bg: "linear-gradient(135deg, #d1fae5, #ecfdf5)",
    border: "rgba(6,78,59,0.15)",
  },
  {
    icon: "📎",
    title: "Upload documents",
    desc: "Share a PDF, image, or photo. ARYA reads it and answers your questions about it instantly.",
    color: "#7c3aed",
    bg: "linear-gradient(135deg, #ede9fe, #f5f3ff)",
    border: "rgba(109,40,217,0.15)",
  },
  {
    icon: "🎧",
    title: "Voice responses",
    desc: "Tap the headphone icon to hear ARYA speak. Perfect for hands-free use on the go.",
    color: "#0891b2",
    bg: "linear-gradient(135deg, #cffafe, #ecfeff)",
    border: "rgba(8,145,178,0.15)",
  },
  {
    icon: "🌐",
    title: "Voice language",
    desc: "The globe icon lets you switch the voice language — Hindi, Tamil, Telugu, and more.",
    color: "#d97706",
    bg: "linear-gradient(135deg, #fef3c7, #fffbeb)",
    border: "rgba(180,83,9,0.15)",
  },
  {
    icon: "🎯",
    title: "Goals",
    desc: "Open the Goals panel from the sidebar — set any goal and ARYA helps you build a plan.",
    color: "#dc2626",
    bg: "linear-gradient(135deg, #fee2e2, #fff5f5)",
    border: "rgba(185,28,28,0.15)",
  },
  {
    icon: "🧠",
    title: "Memory",
    desc: "ARYA remembers what matters about you across sessions — your context, always fresh.",
    color: "#7c3aed",
    bg: "linear-gradient(135deg, #ede9fe, #faf5ff)",
    border: "rgba(109,40,217,0.15)",
  },
  {
    icon: "📝",
    title: "Voice Notes",
    desc: "The Notes tab in the sidebar stores quick voice memos — transcribed and searchable.",
    color: "#0284c7",
    bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
    border: "rgba(2,132,199,0.15)",
  },
];

function FirstLoginFeatureTour({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const total = FEATURE_TOUR_CARDS.length;
  const card = FEATURE_TOUR_CARDS[step];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step < total - 1) {
        setStep(s => s + 1);
      } else {
        handleDone();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [step]);

  const handleDone = () => {
    try { localStorage.setItem(`arya_feature_tour_done_${userId}`, "1"); } catch {}
    setExiting(true);
    setTimeout(onDone, 300);
  };

  const handleNext = () => {
    if (step < total - 1) setStep(s => s + 1);
    else handleDone();
  };

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          data-testid="card-feature-tour"
          key={step}
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm"
        >
          <div
            className="rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: card.bg, border: `1px solid ${card.border}` }}
          >
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${card.border}` }}
                >
                  {card.icon}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: card.color }}>
                    {step + 1} of {total}
                  </p>
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{card.title}</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{card.desc}</p>
              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mb-3">
                {FEATURE_TOUR_CARDS.map((_, i) => (
                  <div
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width: i === step ? 18 : 6,
                      height: 6,
                      background: i === step ? card.color : "rgba(0,0,0,0.12)",
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  data-testid="button-tour-next"
                  onClick={handleNext}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                  style={{ background: card.color }}
                >
                  {step < total - 1 ? "Next →" : "Got it ✓"}
                </button>
                <button
                  data-testid="button-tour-skip"
                  onClick={handleDone}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>
              </div>
            </div>
            {/* Auto-advance progress bar */}
            <motion.div
              key={`bar-${step}`}
              className="h-0.5"
              style={{ background: card.color, opacity: 0.4 }}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DailyQuoteCard({ token }: { token: string | null }) {
  const lang = getStoredUiLanguage();
  const today = new Date().toDateString();
  const cacheKey = `arya_quote_v3_${today}_${lang}`;

  const { data, isLoading } = useQuery<{ quote: string; source?: string }>({
    queryKey: ["/api/arya/daily-quote", lang],
    queryFn: async () => {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try { return JSON.parse(cached); } catch {}
      }
      const res = await fetch(`/api/arya/daily-quote?lang=${lang}`, {
        headers: { "x-user-token": token! },
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify(data));
      return data;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 60 * 12,
    retry: false,
  });

  const [staticQuoteIdx] = useState(() => Math.floor(Math.random() * STATIC_HOME_QUOTES.length));
  const quoteText = token ? data?.quote : STATIC_HOME_QUOTES[staticQuoteIdx];
  const quoteSource = token ? "ARYA · today's reflection" : "ARYA · daily wisdom";

  if (!token) {
    return (
      <motion.div
        data-testid="card-daily-quote"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full max-w-md mx-auto mb-2 md:mb-3 rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(6,78,59,0.07) 0%, rgba(245,158,11,0.07) 100%)",
          border: "1px solid rgba(6,78,59,0.14)",
        }}
      >
        <div className="px-4 py-3 md:px-5 md:py-4">
          <p
            className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 font-medium mb-1.5"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            data-testid="text-daily-quote"
          >
            "{STATIC_HOME_QUOTES[staticQuoteIdx]}"
          </p>
          <p className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold">
            — ARYA · daily wisdom
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      data-testid="card-daily-quote"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="w-full max-w-md mx-auto mb-2 md:mb-3 rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(6,78,59,0.06) 0%, rgba(245,158,11,0.06) 100%)",
        border: "1px solid rgba(6,78,59,0.12)",
      }}
    >
      <div className="px-4 py-3 md:px-5 md:py-4">
        {isLoading ? (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">Preparing your reflection for today…</span>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p
              className="text-sm leading-relaxed text-gray-700 dark:text-gray-200 font-medium mb-1.5 break-words"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              data-testid="text-daily-quote"
            >
              "{quoteText}"
            </p>
            <p className="text-[10px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-semibold" data-testid="text-quote-source">
              — {quoteSource}
            </p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function MoodCheckInCard({ token, onComplete, uiLang = "en" }: { token: string; onComplete: () => void; uiLang?: UiLanguage }) {
  const tl = (key: string) => getTranslation(uiLang, key);
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const moods = [
    { value: 1, emoji: "😞", label: tl("mood_rough") },
    { value: 2, emoji: "😕", label: tl("mood_low") },
    { value: 3, emoji: "😐", label: tl("mood_okay") },
    { value: 4, emoji: "🙂", label: tl("mood_good") },
    { value: 5, emoji: "😊", label: tl("mood_great") },
  ];

  const handleSave = async () => {
    if (!mood) return;
    setSaving(true);
    try {
      await fetch("/api/user/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({ mood, energy, note: note || undefined }),
      });
      localStorage.setItem("arya_mood_date", new Date().toDateString());
      onComplete();
    } catch { }
    setSaving(false);
  };

  return (
    <motion.div
      data-testid="card-mood-checkin"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto mb-2 px-3 py-2.5 rounded-xl bg-gradient-to-br from-amber-50/80 to-orange-50/60 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Smile className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{tl("daily_checkin")}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">— {tl("how_feeling")}</span>
        </div>
        <button onClick={onComplete} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 p-0.5 rounded transition-colors" data-testid="button-skip-checkin">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 mb-2">
        {moods.map(m => (
          <button
            key={m.value}
            data-testid={`button-mood-${m.value}`}
            onClick={() => setMood(m.value)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1 rounded-lg transition-all ${
              mood === m.value
                ? "bg-amber-100 dark:bg-amber-900/40 ring-1 ring-amber-400 dark:ring-amber-600"
                : "hover:bg-white/60 dark:hover:bg-slate-800/60"
            }`}
          >
            <span className="text-base leading-none">{m.emoji}</span>
            <span className="text-[8px] text-gray-400 dark:text-gray-500 leading-tight hidden sm:block">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5 flex-shrink-0">
          <Zap className="w-2.5 h-2.5 text-amber-500" /> {tl("energy_level")}
        </span>
        <input
          type="range" min={1} max={5} value={energy}
          onChange={e => setEnergy(Number(e.target.value))}
          data-testid="slider-energy"
          className="flex-1 accent-amber-500 h-1 rounded"
        />
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 flex-shrink-0 w-14 text-right">
          {["", tl("energy_drained"), tl("energy_low"), tl("energy_okay"), tl("energy_good"), tl("energy_energized")][energy]}
        </span>
      </div>

      <button
        onClick={handleSave}
        disabled={!mood || saving}
        data-testid="button-save-checkin"
        className="w-full py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-400 text-white text-xs font-semibold hover:from-amber-400 hover:to-orange-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        {saving ? "Saving…" : tl("save_checkin")}
      </button>
    </motion.div>
  );
}

function InsightsCard({ insights, onDismiss }: { insights: InsightItem[]; onDismiss: (id: string) => void }) {
  if (insights.length === 0) return null;

  const sourceIcons: Record<string, any> = {
    memory_pattern: Brain,
    neural_link: Sparkles,
    knowledge_gap: Lightbulb,
    query_trend: Target,
    cross_domain: Globe,
  };

  return (
    <div className="px-2 sm:px-4 py-2">
      <div className="max-w-2xl mx-auto space-y-2">
        {insights.slice(0, 2).map((insight) => {
          const Icon = sourceIcons[insight.sourceType] || Lightbulb;
          return (
            <div
              key={insight.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-200 dark:border-purple-800"
              data-testid={`card-insight-${insight.id}`}
            >
              <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400 tracking-wider">Insight</span>
                  <span className="text-[10px] text-gray-300 dark:text-gray-600">{insight.title}</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">{insight.insight.slice(0, 150)}{insight.insight.length > 150 ? '...' : ''}</p>
              </div>
              <button
                onClick={() => onDismiss(insight.id)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 flex-shrink-0"
                data-testid={`button-dismiss-insight-${insight.id}`}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NotificationBell({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [showDropdown, setShowDropdown] = useState(false);
  const { data } = useQuery({
    queryKey: ["/api/user/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/user/notifications", { headers: { "x-user-token": token } });
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });
  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  const markRead = async (id: number) => {
    await fetch(`/api/user/notifications/${id}/read`, { method: "POST", headers: { "x-user-token": token } });
    queryClient.invalidateQueries({ queryKey: ["/api/user/notifications"] });
  };

  return (
    <div className="relative">
      <button
        data-testid="button-notifications"
        onClick={() => setShowDropdown(!showDropdown)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-50 dark:bg-amber-900/200 rounded-full text-[8px] font-bold flex items-center justify-center text-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {showDropdown && (
        <>
        <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl py-1 w-72 max-h-80 overflow-y-auto">
          <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Notifications</span>
            {unreadCount > 0 && <span className="text-[10px] text-amber-600 dark:text-amber-400">{unreadCount} new</span>}
          </div>
          {notifications.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-300 dark:text-gray-600 text-center">No notifications yet</div>
          ) : (
            notifications.slice(0, 20).map((n: any) => (
              <div
                key={n.id}
                data-testid={`notification-item-${n.id}`}
                className={`px-3 py-2 text-xs border-b border-gray-100 dark:border-slate-700 last:border-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 ${!n.isRead ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                onClick={() => { if (!n.isRead) markRead(n.id); }}
              >
                <div className="font-medium text-gray-700 dark:text-gray-200">{n.title}</div>
                <div className="text-gray-400 mt-0.5">{n.message}</div>
                <div className="text-gray-400 mt-1 text-[10px]">
                  {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}
                </div>
              </div>
            ))
          )}
        </div>
        </>
      )}
    </div>
  );
}

export default function AryaChat() {
  const { user, isLoggedIn, token, logout: userLogout, refreshUser } = useUserAuth();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    try { return localStorage.getItem("arya_lang") || "hi-IN"; } catch { return "hi-IN"; }
  });
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showToolMore, setShowToolMore] = useState(false);

  // Sync globe when IP detection banner is accepted
  useEffect(() => {
    const handler = (e: Event) => {
      const code = (e as CustomEvent<string>).detail;
      if (code) {
        setSelectedLanguage(code);
        try { localStorage.setItem("arya_lang", code); } catch {}
      }
    };
    window.addEventListener("arya-response-lang-update", handler);
    return () => window.removeEventListener("arya-response-lang-update", handler);
  }, []);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const check = () => navigator.serviceWorker.getRegistration().then(reg => { if (reg?.waiting) setUpdateAvailable(true); });
    // main.tsx already fires 'sw-update-ready' — listen for it
    const onUpdateReady = () => setUpdateAvailable(true);
    window.addEventListener("sw-update-ready", onUpdateReady);
    // Catch SW already waiting when this component mounted
    check();
    // Also poll every 30s in case the event was missed
    const interval = setInterval(check, 30_000);
    // Check again whenever user returns to this tab (handles background updates)
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("sw-update-ready", onUpdateReady);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, []);

  // Re-check whenever the user menu is opened — catches mobile edge cases
  useEffect(() => {
    if (!showUserMenu || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.getRegistration().then(reg => { if (reg?.waiting) setUpdateAvailable(true); });
  }, [showUserMenu]);

  const handleAppUpdate = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
    else window.location.reload();
  };

  // Capture PWA install prompt so we can offer "Add to Home Screen" in the user menu
  useEffect(() => {
    const isStandalone = () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone()) return;
    const handler = (e: Event) => {
      e.preventDefault();
      const dismissed = localStorage.getItem("arya_pwa_install_dismissed");
      if (!dismissed) setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") localStorage.removeItem("arya_pwa_install_dismissed");
    setInstallPrompt(null);
    setShowUserMenu(false);
  };

  useEffect(() => {
    if (!user?.preferredLanguage) return;
    const lang = user.preferredLanguage;
    const code = lang === "or" ? "od-IN" : DEFAULT_LANGUAGES.find(l => l.code === `${lang}-IN`) ? `${lang}-IN` : null;
    if (code) { setSelectedLanguage(code); try { localStorage.setItem("arya_lang", code); } catch {} }
  }, [user?.preferredLanguage]);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [showOriginalStreaming, setShowOriginalStreaming] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(() => {
    try { return localStorage.getItem("arya_speaker") === "true"; } catch { return false; }
  });
  const [responseMode, setResponseMode] = useState<"instant" | "thinking" | null>(null);
  const [responseModeIcon, setResponseModeIcon] = useState<string | null>(null);
  const [responseConfidence, setResponseConfidence] = useState<number | undefined>();
  const [responseSourcesCount, setResponseSourcesCount] = useState<number | undefined>();
  const [responseMemoryUsed, setResponseMemoryUsed] = useState(false);
  const [responseFromCache, setResponseFromCache] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    const handler = () => { setShowCustomize(true); setShowMemory(false); setShowGoals(false); };
    window.addEventListener("arya-open-customize", handler);
    return () => window.removeEventListener("arya-open-customize", handler);
  }, []);

  const [showReminders, setShowReminders] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showConfidence, setShowConfidence] = useState(true);
  const [pendingImage, setPendingImage] = useState<{ base64: string; previewUrl: string; mimeType: string } | null>(null);
  const [isScanningDoc, setIsScanningDoc] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { language: uiLanguage, t, setLanguage: setGlobalLanguage } = useLanguage();

  // Load language preference from DB on login (covers new device / cleared localStorage)
  useEffect(() => {
    if (!user?.uiLanguage) return;
    const uiLang = user.uiLanguage as UiLanguage;
    const hasLocalUi = (() => { try { return !!localStorage.getItem("arya_ui_language"); } catch { return false; } })();
    if (!hasLocalUi) setGlobalLanguage(uiLang);
    const hasLocalGlobe = (() => { try { return !!localStorage.getItem("arya_lang"); } catch { return false; } })();
    if (!hasLocalGlobe) {
      const DB_SARVAM: Record<string, string> = {
        hi:"hi-IN", ta:"ta-IN", te:"te-IN", kn:"kn-IN",
        ml:"ml-IN", bn:"bn-IN", mr:"mr-IN", gu:"gu-IN", pa:"pa-IN", od:"od-IN",
      };
      const full = DB_SARVAM[uiLang];
      if (full) { setSelectedLanguage(full); try { localStorage.setItem("arya_lang", full); } catch {} }
    }
  }, [user?.uiLanguage]);

  const [moodCheckedInToday, setMoodCheckedInToday] = useState(() => {
    try { return localStorage.getItem("arya_mood_date") === new Date().toDateString(); } catch { return false; }
  });
  const [betaRestricted, setBetaRestricted] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showLoginToast, setShowLoginToast] = useState(false);
  const [showFeatureTour, setShowFeatureTour] = useState(false);
  const [showFutureLetter, setShowFutureLetter] = useState(false);
  const [futureLetterDraft, setFutureLetterDraft] = useState("");
  const [futureLetterSaving, setFutureLetterSaving] = useState(false);
  const [futureLetterSaved, setFutureLetterSaved] = useState(false);
  const [showRehearsalSetup, setShowRehearsalSetup] = useState(false);
  const [showWelcomeCards, setShowWelcomeCards] = useState(false);
  const [rehearsalPerson, setRehearsalPerson] = useState("");
  const [rehearsalSituation, setRehearsalSituation] = useState("");
  const [rehearsalLoading, setRehearsalLoading] = useState(false);
  const [rehearsalFeedbackOpen, setRehearsalFeedbackOpen] = useState(false);
  const [rehearsalFeedback, setRehearsalFeedback] = useState("");
  const [rehearsalFeedbackLoading, setRehearsalFeedbackLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const isWebSpeechModeRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const toolMoreRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: futureLetterData } = useQuery<{ letter: string | null; writtenAt: string | null }>({
    queryKey: ["/api/user/future-letter", token],
    queryFn: async () => {
      if (!token) return { letter: null, writtenAt: null };
      const res = await fetch("/api/user/future-letter", { headers: { "x-user-token": token } });
      if (!res.ok) return { letter: null, writtenAt: null };
      return res.json();
    },
    enabled: !!token && isLoggedIn,
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/arya/conversations", token],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (token) headers["x-user-token"] = token;
      const res = await fetch("/api/arya/conversations", { headers });
      return res.json();
    },
  });

  const { data: conversationData } = useQuery<{ messages: Message[]; mode?: string; rehearsalPersona?: string }>({
    queryKey: ["/api/arya/conversations", activeConversation, token],
    queryFn: async () => {
      if (!activeConversation) return { messages: [] };
      const headers: Record<string, string> = {};
      if (token) headers["x-user-token"] = token;
      const res = await fetch(`/api/arya/conversations/${activeConversation}`, { headers });
      return res.json();
    },
    enabled: !!activeConversation,
  });

  const isRehearsalMode = conversationData?.mode === "rehearsal";
  const rehearsalPersonaName = conversationData?.rehearsalPersona?.split("|||")[0] || "";

  const { data: insightsData } = useQuery<{ insights: InsightItem[] }>({
    queryKey: ["/api/arya/insights"],
    queryFn: async () => {
      const res = await fetch("/api/arya/insights?tenant_id=varah");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const dismissInsightMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/arya/insights/${id}/dismiss`, { method: "PATCH" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/arya/insights"] }),
  });

  const messages = conversationData?.messages || [];
  const insights = insightsData?.insights || [];

  const createConversation = useMutation({
    mutationFn: async (title: string) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-user-token"] = token;
      const res = await fetch("/api/arya/conversations", {
        method: "POST",
        headers,
        body: JSON.stringify({ title }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setActiveConversation(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      const headers: Record<string, string> = {};
      if (token) headers["x-user-token"] = token;
      await fetch(`/api/arya/conversations/${id}`, { method: "DELETE", headers });
    },
    onSuccess: () => {
      if (activeConversation) {
        setActiveConversation(null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
    },
  });

  const startRehearsal = async () => {
    if (!rehearsalPerson.trim() || rehearsalLoading) return;
    setRehearsalLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-user-token"] = token;
      const convRes = await fetch("/api/arya/conversations", {
        method: "POST", headers,
        body: JSON.stringify({ title: `Rehearsal: ${rehearsalPerson.slice(0, 40)}` }),
      });
      const conv = await convRes.json();
      if (!conv?.id) throw new Error("Could not create conversation");
      setActiveConversation(conv.id);

      const startRes = await fetch(`/api/arya/conversations/${conv.id}/start-rehearsal`, {
        method: "POST", headers,
        body: JSON.stringify({ persona: rehearsalPerson, situation: rehearsalSituation }),
      });
      const startData = await startRes.json();

      if (startData.setupMessage) {
        queryClient.setQueryData(
          ["/api/arya/conversations", conv.id, token],
          (old: any) => ({
            ...(old || {}),
            mode: "rehearsal",
            rehearsalPersona: `${rehearsalPerson}|||${rehearsalSituation}`,
            messages: [
              ...((old as any)?.messages || []),
              { id: Date.now(), conversationId: conv.id, role: "assistant", content: startData.setupMessage, createdAt: new Date().toISOString() },
            ],
          })
        );
      }

      setShowRehearsalSetup(false);
      setRehearsalPerson("");
      setRehearsalSituation("");
      queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
    } catch { } finally {
      setRehearsalLoading(false);
    }
  };

  const getRehearsalFeedback = async () => {
    if (!activeConversation || rehearsalFeedbackLoading) return;
    setRehearsalFeedbackLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-user-token"] = token;
      const res = await fetch(`/api/arya/conversations/${activeConversation}/rehearsal-feedback`, { method: "POST", headers });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      setRehearsalFeedback(data.feedback || "");
      setRehearsalFeedbackOpen(true);
      queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations", activeConversation, token] });
    } catch { } finally {
      setRehearsalFeedbackLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && user && user.onboardingComplete === false) {
      setShowOnboarding(true);
    }
  }, [isLoggedIn, user]);

  // Show Future You Letter prompt once after onboarding is complete, if no letter written yet
  useEffect(() => {
    if (!isLoggedIn || !user?.onboardingComplete) return;
    if (futureLetterData === undefined) return; // still loading
    if (futureLetterData?.letter) return; // already written
    const dismissed = (() => { try { return localStorage.getItem("arya_future_letter_dismissed"); } catch { return null; } })();
    if (dismissed) return; // user chose "later"
    // Delay slightly so it doesn't clash with tutorial
    const timer = setTimeout(() => setShowFutureLetter(true), 2500);
    return () => clearTimeout(timer);
  }, [isLoggedIn, user?.onboardingComplete, futureLetterData]);

  // Refresh conversations when login state changes so each user sees only their own
  useEffect(() => {
    setActiveConversation(null);
    queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
  }, [isLoggedIn, token]);

  // Show login welcome toast once per session when user logs in
  useEffect(() => {
    if (!isLoggedIn || !user) return;
    const sessionKey = `arya_login_toast_${user.id}_${new Date().toDateString()}`;
    const alreadyShown = (() => { try { return sessionStorage.getItem(sessionKey); } catch { return null; } })();
    if (alreadyShown) return;
    const timer = setTimeout(() => {
      setShowLoginToast(true);
      try { sessionStorage.setItem(sessionKey, "1"); } catch {}
      // Auto-dismiss after 6 seconds
      setTimeout(() => setShowLoginToast(false), 6000);
    }, 800);
    return () => clearTimeout(timer);
  }, [isLoggedIn, user?.id]);

  // Show feature tour flash cards once ever for new users
  useEffect(() => {
    if (!isLoggedIn || !user) return;
    const done = (() => { try { return localStorage.getItem(`arya_feature_tour_done_${user.id}`); } catch { return null; } })();
    if (done) return;
    // Small delay so the welcome screen fully renders first
    const timer = setTimeout(() => setShowFeatureTour(true), 1800);
    return () => clearTimeout(timer);
  }, [isLoggedIn, user?.id]);

  useEffect(() => {
    if (isLoggedIn && token && "Notification" in window && Notification.permission === "default") {
      const timer = setTimeout(() => {
        requestNotificationPermission(token).catch(() => {});
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn, token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar_connected") === "1") {
      setShowCalendar(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLanguageMenu(false);
      }
      if (toolMoreRef.current && !toolMoreRef.current.contains(e.target as Node)) {
        setShowToolMore(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const playAudioBase64 = useCallback((base64Audio: string) => {
    try {
      if (audioRef.current) {
        const prev = audioRef.current;
        audioRef.current = null;
        prev.pause();
      }
      const byteChars = atob(base64Audio);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingAudio(true);
      audio.onended = () => {
        setPlayingAudio(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setPlayingAudio(false);
        URL.revokeObjectURL(url);
      };
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          setPlayingAudio(false);
          URL.revokeObjectURL(url);
        });
      }
    } catch (err) {
      setPlayingAudio(false);
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingAudio(false);
    }
  }, []);

  const toggleSpeaker = useCallback(() => {
    setSpeakerOn(prev => {
      const next = !prev;
      try { localStorage.setItem("arya_speaker", String(next)); } catch {}
      if (!next) stopAudio();
      return next;
    });
  }, [stopAudio]);

  const speakText = useCallback(async (text: string) => {
    try {
      const cleanText = text.replace(/[#*_`~>\[\]()!|]/g, "").replace(/\n{2,}/g, ". ").replace(/\n/g, " ").trim();
      if (!cleanText || cleanText.length < 2) return;
      const speakChunk = cleanText.length > 500 ? cleanText.slice(0, 500) : cleanText;
      const res = await fetch("/api/arya/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: speakChunk, language: selectedLanguage }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const audioData = data.audioBase64 || data.audio;
      if (audioData) {
        playAudioBase64(audioData);
      }
    } catch (err) {
      console.error("Auto-speak error:", err);
    }
  }, [selectedLanguage, playAudioBase64]);

  const speakerOnRef = useRef(speakerOn);
  useEffect(() => { speakerOnRef.current = speakerOn; }, [speakerOn]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    let convId = activeConversation;
    if (!convId) {
      const conv = await createConversation.mutateAsync(
        text.slice(0, 50) + (text.length > 50 ? "..." : "")
      );
      convId = conv.id;
    }

    setInput("");
    setIsStreaming(true);
    setStreamingContent("");
    setTranslatedContent(null);
    setShowOriginalStreaming(false);
    setShowSidebar(false);
    setResponseConfidence(undefined);
    setResponseSourcesCount(undefined);
    setResponseMemoryUsed(false);
    setResponseFromCache(false);

    queryClient.setQueryData(
      ["/api/arya/conversations", convId],
      (old: any) => ({
        ...old,
        messages: [
          ...(old?.messages || []),
          { id: Date.now(), conversationId: convId, role: "user", content: text, createdAt: new Date().toISOString() },
        ],
      })
    );

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-user-token"] = token;
      const response = await fetch(`/api/arya/conversations/${convId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: text, tenant_id: "varah", language: selectedLanguage, section: "chat" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Something went wrong" }));
        if (errorData.upgradeAvailable) {
        setShowPricing(true);
      }
      if (errorData.betaRestricted) {
          setBetaRestricted(true);
          fetch(`/api/arya/conversations/${convId}`, { method: "DELETE" }).catch(() => {});
          setActiveConversation(null);
          queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
          queryClient.removeQueries({ queryKey: ["/api/arya/conversations", convId] });
          setIsStreaming(false);
          if (errorData.needsInvite) {
            setShowInviteModal(true);
          } else {
            setShowUserAuth(true);
          }
          return;
        }
        queryClient.setQueryData(
          ["/api/arya/conversations", convId],
          (old: any) => ({
            ...old,
            messages: [
              ...(old?.messages || []),
              { id: Date.now() + 1, conversationId: convId, role: "assistant", content: errorData.error, createdAt: new Date().toISOString() },
            ],
          })
        );
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let translatedText: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "meta") {
              setResponseMode(event.mode);
              setResponseModeIcon(event.icon || null);
              if (event.confidence !== undefined) setResponseConfidence(event.confidence);
              if (event.sourcesCount !== undefined) setResponseSourcesCount(event.sourcesCount);
              if (event.memoryUsed) setResponseMemoryUsed(true);
              if (event.fromCache) setResponseFromCache(true);
            }
            if (event.type === "translated_response") {
              translatedText = event.content;
              setTranslatedContent(event.content);
            }
            if (event.content) {
              fullContent += event.content;
              setStreamingContent(fullContent);
            }
            if (event.done) {
              queryClient.setQueryData(
                ["/api/arya/conversations", convId],
                (old: any) => ({
                  ...old,
                  messages: [
                    ...(old?.messages || []),
                    { id: Date.now() + 1, conversationId: convId, role: "assistant", content: fullContent, createdAt: new Date().toISOString() },
                  ],
                })
              );
              queryClient.invalidateQueries({ queryKey: ["/api/arya/memory"] });
              if (speakerOnRef.current && (translatedText || fullContent)) {
                speakText(translatedText || fullContent);
              }
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setResponseMode(null);
      setResponseModeIcon(null);
      setResponseConfidence(undefined);
      setResponseSourcesCount(undefined);
      setResponseMemoryUsed(false);
      setResponseFromCache(false);
      queryClient.invalidateQueries({
        queryKey: ["/api/arya/conversations", convId],
      });
    }
  }, [activeConversation, isStreaming, queryClient, createConversation, speakText, selectedLanguage]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      setPendingImage({
        base64,
        previewUrl: isPdf ? `__pdf__:${file.name}` : dataUrl,
        mimeType: isPdf ? "application/pdf" : (file.type || "image/jpeg"),
      });
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }, []);

  const sendWithImage = useCallback(async () => {
    if (!pendingImage || isScanningDoc) return;

    const isPdfAttachment = pendingImage?.mimeType === "application/pdf";
    let convId = activeConversation;
    if (!convId) {
      const conv = await createConversation.mutateAsync(input.trim() || (isPdfAttachment ? "📄 Document scan" : "📷 Image scan"));
      convId = conv.id;
    }

    const question = input.trim();
    const displayMsg = question ? `📷 ${question}` : "📷 Shared an image";
    setInput("");
    setPendingImage(null);
    setIsScanningDoc(true);

    queryClient.setQueryData(
      ["/api/arya/conversations", convId, token],
      (old: any) => ({
        ...old,
        messages: [
          ...(old?.messages || []),
          { id: Date.now(), conversationId: convId, role: "user", content: displayMsg, createdAt: new Date().toISOString() },
          { id: Date.now() + 1, conversationId: convId, role: "assistant", content: isPdfAttachment ? "⏳ Reading your document…" : "⏳ Reading your image…", createdAt: new Date().toISOString(), isLoading: true },
        ],
      })
    );

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-user-token"] = token;
      const res = await fetch(`/api/arya/conversations/${convId}/scan`, {
        method: "POST",
        headers,
        body: JSON.stringify({ image: pendingImage.base64, mimeType: pendingImage.mimeType, question, language: selectedLanguage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scan failed");

      const displayResponse = data.translatedResponse || data.aryaResponse;
      queryClient.setQueryData(
        ["/api/arya/conversations", convId, token],
        (old: any) => ({
          ...old,
          messages: (old?.messages || []).filter((m: any) => !m.isLoading).concat([
            { id: Date.now() + 2, conversationId: convId, role: "assistant", content: displayResponse, createdAt: new Date().toISOString() },
          ]),
        })
      );
      if (speakerOnRef.current && displayResponse) speakText(displayResponse);
    } catch (err: any) {
      queryClient.setQueryData(
        ["/api/arya/conversations", convId, token],
        (old: any) => ({
          ...old,
          messages: (old?.messages || []).filter((m: any) => !m.isLoading),
        })
      );
    } finally {
      setIsScanningDoc(false);
      queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations", convId, token] });
    }
  }, [pendingImage, input, activeConversation, isScanningDoc, createConversation, queryClient, token, selectedLanguage, speakText]);

  const handleRedeemInvite = useCallback(async () => {
    if (!inviteCode.trim() || !token) return;
    setInviteLoading(true);
    setInviteError("");
    try {
      const res = await fetch("/api/beta/redeem-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowInviteModal(false);
        setBetaRestricted(false);
        setInviteCode("");
      } else {
        setInviteError(data.error || "Invalid invite code");
      }
    } catch {
      setInviteError("Something went wrong. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }, [inviteCode, token]);

  const [voiceError, setVoiceError] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setVoiceError(null);

      const WebSpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const useWebSpeech = isGlobalVoiceLang(selectedLanguage) && !!WebSpeechRecognition;

      if (useWebSpeech) {
        isWebSpeechModeRef.current = true;
        const recognition = new WebSpeechRecognition();
        recognition.lang = selectedLanguage;
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        speechRecognitionRef.current = recognition;

        recognition.onstart = () => {
          setIsRecording(true);
          setRecordingTime(0);
          recordingTimerRef.current = setInterval(
            () => setRecordingTime((t) => t + 1),
            1000,
          );
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript.trim();
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          setIsRecording(false);
          setRecordingTime(0);
          setShowSidebar(false);
          isWebSpeechModeRef.current = false;
          speechRecognitionRef.current = null;
          if (transcript) sendMessage(transcript);
        };

        recognition.onerror = (event: any) => {
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          setIsRecording(false);
          setRecordingTime(0);
          isWebSpeechModeRef.current = false;
          speechRecognitionRef.current = null;
          if (event.error !== "aborted" && event.error !== "no-speech") {
            setVoiceError("Speech recognition failed. Please try again.");
          }
        };

        recognition.onend = () => {
          if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
          }
          setIsRecording(false);
          setRecordingTime(0);
          isWebSpeechModeRef.current = false;
          speechRecognitionRef.current = null;
        };

        recognition.start();
        return;
      }

      isWebSpeechModeRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "",
      ];
      let selectedMime = "";
      for (const mime of mimeTypes) {
        if (!mime || MediaRecorder.isTypeSupported(mime)) {
          selectedMime = mime;
          break;
        }
      }

      const recorderOptions: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Mic error:", err);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setVoiceError("Microphone access denied. Please allow microphone in your browser settings.");
      } else if (err?.name === "NotFoundError") {
        setVoiceError("No microphone found. Please connect a microphone and try again.");
      } else {
        setVoiceError("Could not start recording. Please check your microphone.");
      }
    }
  }, [selectedLanguage, sendMessage]);

  const stopRecording = useCallback(async () => {
    if (isWebSpeechModeRef.current && speechRecognitionRef.current) {
      speechRecognitionRef.current.abort();
      speechRecognitionRef.current = null;
      isWebSpeechModeRef.current = false;
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      setRecordingTime(0);
      return;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const recorderMime = recorder.mimeType || "audio/webm";
        const b = new Blob(chunksRef.current, { type: recorderMime });
        recorder.stream.getTracks().forEach((t) => t.stop());
        resolve(b);
      };
      recorder.stop();
    });

    setIsRecording(false);
    setRecordingTime(0);
    setShowSidebar(false);

    if (blob.size === 0) return;

    let convId = activeConversation;
    if (!convId) {
      const conv = await createConversation.mutateAsync("Voice Chat");
      convId = conv.id;
    }

    setIsStreaming(true);
    setStreamingContent("");
    setTranslatedContent(null);
    setShowOriginalStreaming(false);

    try {
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.readAsDataURL(blob);
      });

      const voiceHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (token) voiceHeaders["x-user-token"] = token;
      const response = await fetch(`/api/arya/conversations/${convId}/voice`, {
        method: "POST",
        headers: voiceHeaders,
        body: JSON.stringify({ audio: base64Audio, tenant_id: "varah", language: selectedLanguage }),
      });

      const streamReader = response.body?.getReader();
      if (!streamReader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let hasAudioResponse = false;

      while (true) {
        const { done, value } = await streamReader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "user_transcript") {
              queryClient.setQueryData(
                ["/api/arya/conversations", convId],
                (old: any) => ({
                  ...old,
                  messages: [
                    ...(old?.messages || []),
                    {
                      id: Date.now(),
                      conversationId: convId,
                      role: "user",
                      content: event.content,
                      createdAt: new Date().toISOString(),
                    },
                  ],
                })
              );
            }
            if (event.type === "assistant" && event.content) {
              fullContent += event.content;
              setStreamingContent(fullContent);
            }
            if (event.type === "translated_response") {
              setTranslatedContent(event.content);
            }
            if (event.type === "audio_response" && event.audio) {
              hasAudioResponse = true;
              playAudioBase64(event.audio);
            }
            if (event.type === "done") {
              queryClient.setQueryData(
                ["/api/arya/conversations", convId],
                (old: any) => ({
                  ...old,
                  messages: [
                    ...(old?.messages || []),
                    { id: Date.now() + 1, conversationId: convId, role: "assistant", content: fullContent, createdAt: new Date().toISOString() },
                  ],
                })
              );
              if (speakerOnRef.current && fullContent && !hasAudioResponse) {
                speakText(fullContent);
              }
            }
          } catch {}
        }
      }
    } catch (error: any) {
      console.error("Voice error:", error);
      setVoiceError("Voice processing failed. Please try again.");
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      queryClient.invalidateQueries({
        queryKey: ["/api/arya/conversations", convId],
      });
    }
  }, [activeConversation, queryClient, createConversation, selectedLanguage, playAudioBase64, speakText]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
      if (isMobile) return;
      e.preventDefault();
      if (pendingImage) sendWithImage();
      else sendMessage(input);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentLang = DEFAULT_LANGUAGES.find(l => l.code === selectedLanguage);

  return (
    <div className="flex h-[calc(100dvh-5rem)] md:h-[calc(100dvh-6rem)] gap-0 md:gap-4 relative" data-testid="page-arya-chat">
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setShowSidebar(false)}
          />
        )}
      </AnimatePresence>

      <div
        className={`${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:relative z-30 md:z-auto top-0 left-0 h-full w-72 md:w-64 lg:w-72 flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-r md:border-r-0 border-gray-200 dark:border-slate-700 transition-transform duration-300 pt-14 md:pt-0`}
      >
        <div className="p-3 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-3 px-1">
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{t("chat_history")}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 ml-auto">
              {conversations.length}
            </span>
          </div>
          <Button
            data-testid="button-new-chat"
            onClick={() => {
              setActiveConversation(null);
              setStreamingContent("");
              setIsStreaming(false);
              setInput("");
              setShowSidebar(false);
            }}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-300/30 dark:shadow-emerald-500/20"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("new_chat")}
          </Button>
        </div>

        <div className="px-2 py-2 border-b border-gray-100 dark:border-slate-700 flex gap-1 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          <button
            data-testid="button-toggle-memory"
            onClick={() => { setShowMemory(!showMemory); setShowGoals(false); setShowReminders(false); }}
            className={`flex-shrink-0 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              showMemory ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Brain className="w-3 h-3" />
            {t("memory")}
          </button>
          <button
            data-testid="button-toggle-goals"
            onClick={() => { setShowGoals(!showGoals); setShowMemory(false); setShowReminders(false); setShowNotes(false); }}
            className={`flex-shrink-0 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              showGoals ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Target className="w-3 h-3" />
            {t("goals")}
          </button>
          <button
            data-testid="button-toggle-reminders"
            onClick={() => { setShowReminders(!showReminders); setShowMemory(false); setShowGoals(false); setShowNotes(false); }}
            className={`flex-shrink-0 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              showReminders ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Bell className="w-3 h-3" />
            {t("alerts")}
          </button>
          <button
            data-testid="button-toggle-notes"
            onClick={() => { setShowNotes(!showNotes); setShowReminders(false); setShowMemory(false); setShowGoals(false); setShowCalendar(false); }}
            className={`flex-shrink-0 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              showNotes ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <NotebookPen className="w-3 h-3" />
            {t("notes")}
          </button>
          {isLoggedIn && (
            <button
              data-testid="button-toggle-calendar"
              onClick={() => { setShowCalendar(!showCalendar); setShowNotes(false); setShowReminders(false); setShowMemory(false); setShowGoals(false); }}
              className={`flex-shrink-0 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
                showCalendar ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`}
            >
              <CalendarDays className="w-3 h-3" />
              Cal
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 px-2 py-2" data-testid="list-conversations">
          {conversations.map((conv) => {
            const date = new Date(conv.createdAt);
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            const timeStr = isToday
              ? date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
              : date.toLocaleDateString("en-IN", { month: "short", day: "numeric", timeZone: "Asia/Kolkata" });
            return (
              <div
                key={conv.id}
                data-testid={`card-conversation-${conv.id}`}
                onClick={() => {
                  setActiveConversation(conv.id);
                  setShowSidebar(false);
                }}
                className={`group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  activeConversation === conv.id
                    ? "bg-gradient-to-r from-emerald-500/15 to-transparent border border-emerald-300 dark:border-emerald-700 text-gray-900 dark:text-white"
                    : "hover:bg-gray-100 dark:hover:bg-slate-700 text-muted-foreground hover:text-gray-900 dark:hover:text-white border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  activeConversation === conv.id
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-400"
                }`}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="truncate text-sm block leading-tight">{conv.title}</span>
                  <span className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5 block">{timeStr}</span>
                </div>
                <button
                  data-testid={`button-delete-conversation-${conv.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation.mutate(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-500 dark:hover:text-red-400 transition-opacity mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          {conversations.length === 0 && (
            <div className="text-center py-8 px-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-gray-200" />
              </div>
              <p className="text-muted-foreground text-sm">{t("no_conversations")}</p>
              <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">{t("start_chatting")}</p>
            </div>
          )}
        </div>

        {/* Desktop sidebar legal links */}
        <div className="px-3 pb-1 hidden md:flex items-center gap-3 justify-center">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Privacy</a>
          <span className="text-[10px] text-muted-foreground">·</span>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Terms</a>
          <span className="text-[10px] text-muted-foreground">·</span>
          <span className="text-[10px] text-muted-foreground">© {new Date().getFullYear()} VARAH</span>
        </div>
        {/* Desktop sidebar footer — user/login */}
        <div className="border-t border-gray-100 dark:border-slate-700 p-2 hidden md:block">
          {isLoggedIn ? (
            <div className="relative">
              <button
                data-testid="button-user-menu-sidebar"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
              >
                <div className="relative w-7 h-7 flex-shrink-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  {updateAvailable && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white dark:border-slate-800 animate-pulse" />}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{user?.email || user?.phone}</div>
                </div>
                <NotificationBell token={token!} />
              </button>
              {showUserMenu && <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />}
              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 5 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-card border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl py-2"
                  >
                    {isLoggedIn && (
                      <button
                        data-testid="button-upgrade-plan-sidebar"
                        onClick={() => { setShowUserMenu(false); setShowPricing(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        {(user as any)?.plan && (user as any).plan !== "free"
                          ? `ARYA ${((user as any).plan as string).charAt(0).toUpperCase() + ((user as any).plan as string).slice(1)} — Active`
                          : "Upgrade Plan"}
                      </button>
                    )}
                    <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                    <button
                      data-testid="button-my-profile-sidebar"
                      onClick={() => { setShowUserMenu(false); setShowProfile(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> {t("menu_my_profile")}
                    </button>
                    <button
                      data-testid="button-my-goals-sidebar"
                      onClick={() => { setShowUserMenu(false); setLocation("/my-goals"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> {t("menu_my_goals")}
                    </button>
                    <button
                      data-testid="button-customize-arya-sidebar"
                      onClick={() => { setShowUserMenu(false); setShowCustomize(true); setShowMemory(false); setShowGoals(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Palette className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {t("menu_customize")}
                    </button>
                    <button
                      data-testid="button-quick-tutorial-sidebar"
                      onClick={() => { setShowUserMenu(false); setShowTutorial(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> {t("menu_tutorial")}
                    </button>
                    <button
                      data-testid="button-vedic-lens-sidebar"
                      onClick={() => { setShowUserMenu(false); setLocation("/vedic-lens"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" /> {t("menu_kaal")}
                    </button>
                    <button
                      data-testid="button-niti-sidebar"
                      onClick={() => { setShowUserMenu(false); setLocation("/niti"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500 shrink-0" />
                      <span className="truncate">{t("menu_niti")}</span>
                    </button>
                    <button
                      data-testid="button-prana-sidebar"
                      onClick={() => { setShowUserMenu(false); setLocation("/prana"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Activity className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                      <span className="truncate">{t("menu_prana")}</span>
                    </button>
                    <button
                      data-testid="button-weekly-review-sidebar"
                      onClick={() => { setShowUserMenu(false); setLocation("/review"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" /> {t("menu_review")}
                    </button>
                    {installPrompt && (
                      <button
                        data-testid="button-install-app-sidebar"
                        onClick={handleInstallApp}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
                      >
                        <Download className="w-3.5 h-3.5 shrink-0" />
                        <span>{t("menu_install")}</span>
                      </button>
                    )}
                    {updateAvailable && (
                      <button
                        data-testid="button-update-app-sidebar"
                        onClick={() => { setShowUserMenu(false); handleAppUpdate(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "2s" }} />
                        <span>{t("menu_update")}</span>
                        <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </button>
                    )}
                    <button
                      data-testid="button-report-issue-sidebar"
                      onClick={() => { setShowUserMenu(false); setShowFeedbackModal(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <MessageCircleWarning className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" /> {t("menu_report")}
                    </button>
                    <button
                      data-testid="button-privacy-control-sidebar"
                      onClick={() => { setShowUserMenu(false); setLocation("/privacy-control"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Shield className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> {t("menu_privacy")}
                    </button>
                    <button
                      data-testid="button-user-logout-sidebar"
                      onClick={() => { setShowUserMenu(false); userLogout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <LogOut className="w-3.5 h-3.5" /> {t("menu_signout")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button
              data-testid="button-user-login-sidebar"
              onClick={() => setShowUserAuth(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              {t("sign_in")}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex items-center justify-between px-3 py-2 md:hidden border-b border-gray-200 dark:border-slate-700">
          <button
            data-testid="button-toggle-conversations"
            onClick={() => setShowSidebar(!showSidebar)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-gray-200 dark:border-slate-700 hover:bg-white/90 dark:bg-slate-900/90 transition-all"
          >
            {showSidebar ? <PanelLeftClose className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <PanelLeftOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">History</span>
            {conversations.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-medium">
                {conversations.length}
              </span>
            )}
          </button>
          <span className="text-sm text-muted-foreground truncate max-w-[50%]">
            {activeConversation
              ? conversations.find((c) => c.id === activeConversation)?.title || "Chat"
              : "New Chat"}
          </span>
          <div className="flex items-center gap-1">
            <button
              data-testid="button-toggle-memory-mobile"
              onClick={() => { setShowMemory(!showMemory); setShowGoals(false); }}
              className={`p-1.5 rounded-lg transition-all ${showMemory ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400'}`}
            >
              <Brain className="w-4 h-4" />
            </button>
            <button
              data-testid="button-toggle-goals-mobile"
              onClick={() => { setShowGoals(!showGoals); setShowMemory(false); setShowReminders(false); }}
              className={`p-1.5 rounded-lg transition-all ${showGoals ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400'}`}
            >
              <Target className="w-4 h-4" />
            </button>
            <button
              data-testid="button-toggle-reminders-mobile"
              onClick={() => { setShowReminders(!showReminders); setShowMemory(false); setShowGoals(false); }}
              className={`p-1.5 rounded-lg transition-all ${showReminders ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400'}`}
              title="Reminders & Alarms"
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              data-testid="button-new-chat-mobile"
              onClick={() => {
                setActiveConversation(null);
                setStreamingContent("");
                setIsStreaming(false);
                setInput("");
              }}
              className="p-1.5 rounded-lg bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-all"
            >
              <Plus className="w-4 h-4 text-primary" />
            </button>
            {installPrompt && (
              <button
                data-testid="button-install-app-topbar"
                onClick={handleInstallApp}
                title="Install ARYA on your device"
                className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
            <button
              data-testid="button-toggle-theme"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg transition-all text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            {isLoggedIn ? (
              <>
              <NotificationBell token={token!} />
              <div className="relative">
                <button
                  data-testid="button-user-menu"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="relative p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-300 dark:border-emerald-700 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all"
                >
                  <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  {updateAvailable && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-white dark:border-slate-800 animate-pulse" />}
                </button>
                {showUserMenu && <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-1 z-50 bg-card border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl py-2 min-w-[180px]"
                    >
                      <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
                        <div className="text-xs font-medium text-gray-900 dark:text-white">{user?.name}</div>
                        <div className="text-[10px] text-muted-foreground">{user?.phone}</div>
                      </div>
                      <button
                        data-testid="button-upgrade-plan"
                        onClick={() => { setShowUserMenu(false); setShowPricing(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 font-medium"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        {(user as any)?.plan && (user as any).plan !== "free"
                          ? `ARYA ${((user as any).plan as string).charAt(0).toUpperCase() + ((user as any).plan as string).slice(1)} — Active`
                          : "Upgrade Plan"}
                      </button>
                      <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                      <button
                        data-testid="button-my-profile"
                        onClick={() => { setShowUserMenu(false); setShowProfile(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <User className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> {t("menu_my_profile")}
                      </button>
                      <button
                        data-testid="button-my-goals"
                        onClick={() => { setShowUserMenu(false); setLocation("/my-goals"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> {t("menu_my_goals")}
                      </button>
                      <button
                        data-testid="button-customize-arya"
                        onClick={() => { setShowUserMenu(false); setShowCustomize(true); setShowMemory(false); setShowGoals(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Palette className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> {t("menu_customize")}
                      </button>
                      <button
                        data-testid="button-quick-tutorial"
                        onClick={() => { setShowUserMenu(false); setShowTutorial(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> {t("menu_tutorial")}
                      </button>
                      <button
                        data-testid="button-vedic-lens"
                        onClick={() => { setShowUserMenu(false); setLocation("/vedic-lens"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" /> {t("menu_kaal")}
                      </button>
                      <button
                        data-testid="button-niti"
                        onClick={() => { setShowUserMenu(false); setLocation("/niti"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500 shrink-0" />
                        <span className="truncate">{t("menu_niti")}</span>
                      </button>
                      <button
                        data-testid="button-prana"
                        onClick={() => { setShowUserMenu(false); setLocation("/prana"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Activity className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        <span className="truncate">{t("menu_prana")}</span>
                      </button>
                      <button
                        data-testid="button-weekly-review"
                        onClick={() => { setShowUserMenu(false); setLocation("/review"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <CalendarDays className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" /> {t("menu_review")}
                      </button>
                      {installPrompt && (
                        <button
                          data-testid="button-install-app"
                          onClick={handleInstallApp}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
                        >
                          <Download className="w-3.5 h-3.5 shrink-0" />
                          <span>{t("menu_install")}</span>
                        </button>
                      )}
                      {updateAvailable && (
                        <button
                          data-testid="button-update-app"
                          onClick={() => { setShowUserMenu(false); handleAppUpdate(); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 font-medium"
                        >
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "2s" }} />
                          <span>{t("menu_update")}</span>
                          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </button>
                      )}
                      <button
                        data-testid="button-report-issue"
                        onClick={() => { setShowUserMenu(false); setShowFeedbackModal(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <MessageCircleWarning className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" /> {t("menu_report")}
                      </button>
                      <button
                        data-testid="button-privacy-control"
                        onClick={() => { setShowUserMenu(false); setLocation("/privacy-control"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Shield className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" /> {t("menu_privacy")}
                      </button>
                      <button
                        data-testid="button-user-logout"
                        onClick={() => { setShowUserMenu(false); userLogout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <LogOut className="w-3.5 h-3.5" /> {t("menu_signout")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </>
            ) : (
              <button
                data-testid="button-user-login"
                onClick={() => setShowUserAuth(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
                title="Sign in"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showMemory && (
            <motion.div
              key="memory-panel"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 z-40"
            >
              <MemoryPanel onClose={() => setShowMemory(false)} token={token} />
            </motion.div>
          )}
          {showGoals && (
            <motion.div
              key="goals-panel"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 z-40"
            >
              <GoalsPanel onClose={() => setShowGoals(false)} />
            </motion.div>
          )}
          {showCustomize && isLoggedIn && token && (
            <motion.div
              key="customize-panel"
              initial={{ x: 384, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 384, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 z-40"
            >
              <CustomizePanel onClose={() => setShowCustomize(false)} token={token} />
            </motion.div>
          )}
          {showReminders && (
            <motion.div
              key="reminders-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
            >
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowReminders(false)} />
              <RemindersPanel onClose={() => setShowReminders(false)} />
            </motion.div>
          )}
          {showNotes && isLoggedIn && token && (
            <motion.div
              key="notes-panel"
              initial={{ x: 384, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 384, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 z-40"
            >
              <VoiceNotesPanel onClose={() => setShowNotes(false)} token={token} uiLang={uiLanguage} voiceLang={selectedLanguage} />
            </motion.div>
          )}
          {showCalendar && isLoggedIn && token && (
            <motion.div
              key="calendar-panel"
              initial={{ x: 384, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 384, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute right-0 top-0 bottom-0 z-40"
            >
              <CalendarPanel onClose={() => setShowCalendar(false)} token={token} />
            </motion.div>
          )}
        </AnimatePresence>

        {insights.length > 0 && !activeConversation && (
          <InsightsCard insights={insights} onDismiss={(id) => dismissInsightMutation.mutate(id)} />
        )}

        {/* Welcome screen — rendered OUTSIDE scroll container so it can fill height */}
        {!activeConversation && messages.length === 0 && !streamingContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col items-center justify-start text-center px-4 pt-2 md:pt-8 pb-4 md:pb-10 overflow-y-auto"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <motion.div
              data-testid="img-arya-logo"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-1 md:mb-2 flex flex-col items-center gap-1"
            >
              <span
                className="text-4xl md:text-5xl"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  lineHeight: 1,
                  display: "block",
                  color: "#047857",
                }}
              >
                ARYA
              </span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, #6ee7b7, #059669)" }} />
                <span className="w-2 h-2 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, #34d399, #047857)" }} />
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, #6ee7b7, #059669)" }} />
              </span>
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-[10px] uppercase tracking-widest font-bold text-emerald-600 dark:text-emerald-400 mb-1 md:mb-2"
            >
              {t("your_pa")}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="text-muted-foreground max-w-md mb-2 text-sm md:text-base hidden md:block"
            >
              {t("welcome_desc")}
            </motion.p>
            <DailyQuoteCard token={token} />
            <div className="flex items-center gap-2 mb-3">
              {!isLoggedIn && (
                <button
                  data-testid="button-welcome-signin"
                  onClick={() => setShowUserAuth(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex items-center gap-1.5"
                >
                  <LogIn className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  {t("sign_in_goals")}
                </button>
              )}
              <button
                data-testid="button-welcome-tutorial"
                onClick={() => setShowTutorial(true)}
                className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-amber-300 transition-all flex items-center gap-1.5"
              >
                <HelpCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                {t("take_tour")}
              </button>
            </div>
            {isLoggedIn && token && !moodCheckedInToday && (
              <MoodCheckInCard
                token={token}
                onComplete={() => setMoodCheckedInToday(true)}
                uiLang={uiLanguage}
              />
            )}

            {/* ── Quick Access (horizontal scrollable pills) ── */}
            {isLoggedIn && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.32 }}
                className="w-full max-w-md mb-1"
              >
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
                  style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                  {[
                    { icon: "🎯", label: t("goals"),     action: () => { setShowGoals(true); setShowMemory(false); setShowNotes(false); setShowReminders(false); setShowCalendar(false); } },
                    { icon: "🧠", label: t("memory"),    action: () => { setShowMemory(true); setShowGoals(false); setShowNotes(false); setShowReminders(false); setShowCalendar(false); } },
                    { icon: "📝", label: t("notes"),     action: () => { setShowNotes(true); setShowGoals(false); setShowMemory(false); setShowReminders(false); setShowCalendar(false); } },
                    { icon: "😊", label: t("mood"),      action: () => setMoodCheckedInToday(false) },
                    { icon: "🔔", label: t("reminders"), action: () => { setShowReminders(true); setShowGoals(false); setShowMemory(false); setShowNotes(false); setShowCalendar(false); } },
                    { icon: "📅", label: t("calendar"),  action: () => { setShowCalendar(true); setShowGoals(false); setShowMemory(false); setShowNotes(false); setShowReminders(false); } },
                    { icon: "🏘️", label: t("community"), action: () => setLocation("/community") },
                    { icon: "⚖️", label: "Niti",         action: () => setLocation("/niti") },
                  ].map((item, i) => (
                    <motion.button
                      key={item.label}
                      data-testid={`button-quick-access-${i}`}
                      onClick={item.action}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: 0.34 + i * 0.04 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-slate-500 transition-all"
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Collapsible toggle for suggestion cards ── */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.45 }}
              onClick={() => setShowWelcomeCards(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-dashed border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all mb-1"
              data-testid="button-toggle-welcome-cards"
            >
              <span>{showWelcomeCards ? "▲" : "▼"}</span>
              <span>{showWelcomeCards ? t("hide_suggestions") : t("show_suggestions")}</span>
            </motion.button>

            <AnimatePresence initial={false}>
            {showWelcomeCards && (
            <motion.div
              key="welcome-cards"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              style={{ overflow: "hidden" }}
              className="w-full max-w-lg"
            >
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 w-full"
            >
              {[
                { text: t("suggest_think"),   badge: t("badge_think"),   icon: "🧠" },
                { text: t("suggest_goals"),   badge: t("badge_goals"),   icon: "🎯" },
                { text: t("suggest_reflect"), badge: t("badge_reflect"), icon: "🌅" },
                { text: t("suggest_wisdom"),  badge: t("badge_wisdom"),  icon: "🧘" },
              ].map((suggestion, i) => (
                <motion.button
                  key={i}
                  data-testid={`button-suggestion-${i}`}
                  onClick={() => sendMessage(suggestion.text)}
                  className="text-left px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-white/80 dark:bg-slate-900/80 text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 transition-all group"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-[9px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400/70 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mb-1 flex items-center gap-1">
                    <span>{suggestion.icon}</span> {suggestion.badge}
                  </span>
                  <span className="block text-xs mt-0.5">{suggestion.text}</span>
                </motion.button>
              ))}

              {/* Rehearse a tough conversation — full-width chip */}
              <motion.button
                data-testid="button-suggestion-rehearse"
                onClick={() => setShowRehearsalSetup(v => !v)}
                className="col-span-1 sm:col-span-2 text-left px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-violet-200 dark:border-violet-800/60 bg-gradient-to-r from-violet-50/80 to-purple-50/60 dark:from-violet-950/40 dark:to-purple-950/30 hover:from-violet-100 hover:to-purple-50 dark:hover:from-violet-950/60 dark:hover:to-purple-950/50 hover:border-violet-300 dark:hover:border-violet-700 transition-all group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.78 }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-violet-600 dark:text-violet-400/80 group-hover:text-violet-600 dark:group-hover:text-violet-400 mb-1 flex items-center gap-1">
                      <Theater className="w-2.5 h-2.5" /> {t("badge_rehearse")}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 mt-0.5">
                      {t("suggest_rehearse_desc")}
                    </span>
                  </div>
                  <div className="ml-3 w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-200 dark:group-hover:bg-violet-800/60 transition-colors">
                    <Theater className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
              </motion.button>

              {/* Rehearsal setup panel */}
              <AnimatePresence>
                {showRehearsalSetup && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="col-span-1 sm:col-span-2 rounded-xl border border-violet-300 dark:border-violet-700 bg-white dark:bg-slate-900 p-4 shadow-md"
                    data-testid="panel-rehearsal-setup"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Theater className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">Set up your rehearsal</span>
                      <button onClick={() => setShowRehearsalSetup(false)} className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Who are you talking to?</label>
                        <input
                          data-testid="input-rehearsal-person"
                          type="text"
                          value={rehearsalPerson}
                          onChange={e => setRehearsalPerson(e.target.value)}
                          placeholder="e.g. my manager, my partner, my father"
                          className="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">What's the conversation about? <span className="text-gray-400">(optional)</span></label>
                        <input
                          data-testid="input-rehearsal-situation"
                          type="text"
                          value={rehearsalSituation}
                          onChange={e => setRehearsalSituation(e.target.value)}
                          placeholder="e.g. asking for a raise, setting a boundary, delivering difficult feedback"
                          className="w-full text-sm rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </div>
                      <Button
                        data-testid="button-start-rehearsal"
                        onClick={startRehearsal}
                        disabled={!rehearsalPerson.trim() || rehearsalLoading}
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white text-sm py-2 rounded-lg"
                      >
                        {rehearsalLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Theater className="w-4 h-4 mr-2" />}
                        {rehearsalLoading ? "Starting..." : "Start Rehearsal"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Talk to ARYA — full-width featured card */}
              <motion.button
                data-testid="button-suggestion-talk"
                onClick={() => setShowVoiceMode(true)}
                className="col-span-1 sm:col-span-2 text-left px-4 py-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-r from-emerald-50/80 to-green-50/60 dark:from-emerald-950/40 dark:to-green-950/30 hover:from-emerald-50 hover:to-green-50 dark:hover:from-emerald-950/60 dark:hover:to-green-950/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.82 }}
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-emerald-600 dark:text-emerald-400/80 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 mb-1 flex items-center gap-1">
                      <Mic className="w-2.5 h-2.5" /> {t("badge_talk")}
                    </span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 mt-0.5">
                      {t("suggest_talk_desc")}
                    </span>
                  </div>
                  <div className="ml-3 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/60 transition-colors">
                    <Mic className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </motion.button>
            </motion.div>
            </motion.div>
            )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Rehearsal mode banner */}
        <AnimatePresence>
          {isRehearsalMode && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-2 sm:mx-4 mt-2 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 flex items-center gap-2"
              data-testid="banner-rehearsal-mode"
            >
              <Theater className="w-4 h-4 text-violet-600 dark:text-violet-400 flex-shrink-0" />
              <span className="text-xs text-violet-700 dark:text-violet-300 flex-1">
                <span className="font-semibold">Rehearsal mode</span>
                {rehearsalPersonaName && <> — ARYA is playing <em>{rehearsalPersonaName}</em></>}
              </span>
              <button
                data-testid="button-get-rehearsal-feedback"
                onClick={getRehearsalFeedback}
                disabled={rehearsalFeedbackLoading}
                className="flex items-center gap-1 text-xs font-medium bg-violet-600 hover:bg-violet-700 text-white px-2.5 py-1 rounded-lg transition-colors"
              >
                {rehearsalFeedbackLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trophy className="w-3 h-3" />}
                Get feedback
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedLanguage !== "en-IN" && (activeConversation || messages.length > 0 || streamingContent) && (
          <div className="flex justify-center pt-2">
            <button
              data-testid="button-lang-pill-header"
              onClick={() => setShowLanguageMenu(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <Globe className="w-3 h-3" />
              {currentLang?.native || selectedLanguage}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
          </div>
        )}
        <div className={`overflow-y-auto px-2 sm:px-4 py-3 md:py-4 space-y-3 md:space-y-4 ${(!activeConversation && messages.length === 0 && !streamingContent) ? "hidden" : "flex-1"}`} data-testid="list-messages">
          {messages.map((msg, msgIndex) => (
            <motion.div
              key={msg.id}
              data-testid={`message-${msg.role}-${msg.id}`}
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, delay: msgIndex > messages.length - 3 ? 0.05 : 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`group max-w-[90%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 ${
                  msg.role === "user"
                    ? "bg-primary/20 border border-primary/30 text-gray-900 dark:text-white"
                    : "bg-white/90 dark:bg-slate-900/90 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-100"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-semibold bg-gradient-to-r from-emerald-500 to-amber-400 bg-clip-text text-transparent">
                      ARYA
                    </span>
                  </div>
                )}
                <FormattedMessage content={msg.content} isUser={msg.role === "user"} />
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      data-testid={`button-speak-msg-${msg.id}`}
                      onClick={() => speakText(msg.content)}
                      className="p-1 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Listen to this response"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    {activeConversation && (
                      <FeedbackButtons messageId={msg.id} conversationId={activeConversation} />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-start"
              data-testid="message-streaming"
            >
              <div className={`max-w-[90%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 ${
                responseMode === "instant"
                  ? "bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border border-amber-200 dark:border-amber-800"
                  : "bg-white/90 dark:bg-slate-900/90 border border-gray-200 dark:border-slate-700"
              } text-gray-800 dark:text-gray-100`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold bg-gradient-to-r from-emerald-500 to-amber-400 bg-clip-text text-transparent">
                    ARYA
                  </span>
                  {responseMode === "instant" && responseFromCache && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-medium border border-cyan-200 dark:border-cyan-800 flex items-center gap-0.5">
                      ⚡ From memory
                    </span>
                  )}
                  {responseMode === "instant" && !responseFromCache && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">
                      Instant
                    </span>
                  )}
                  {showConfidence && responseMode === "thinking" && (
                    <ConfidenceBadge confidence={responseConfidence} sourcesCount={responseSourcesCount} memoryUsed={responseMemoryUsed} />
                  )}
                </div>
                {selectedLanguage !== "en-IN" ? (
                  <>
                    {!translatedContent && (
                      <div className="opacity-40 text-sm">
                        <FormattedMessage content={streamingContent} />
                        <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />
                      </div>
                    )}
                    {translatedContent && (
                      <div className="text-gray-800 dark:text-gray-100">
                        <FormattedMessage content={translatedContent} />
                      </div>
                    )}
                    {translatedContent && (
                      <button
                        onClick={() => setShowOriginalStreaming(v => !v)}
                        className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        {showOriginalStreaming ? "Hide English" : "View in English"}
                      </button>
                    )}
                    {showOriginalStreaming && translatedContent && (
                      <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-400 dark:text-gray-500">
                        <FormattedMessage content={streamingContent} />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="relative">
                    <FormattedMessage content={streamingContent} />
                    <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {isStreaming && !streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-start"
              data-testid="message-thinking"
            >
              <div className="rounded-2xl px-3 md:px-4 py-2.5 md:py-3 bg-white/90 dark:bg-slate-900/90 border border-gray-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold bg-gradient-to-r from-emerald-500 to-amber-400 bg-clip-text text-transparent">
                    ARYA
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {selectedLanguage !== "en-IN" ? "Listening & translating..." : "Thinking..."}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="px-2 sm:px-4 pb-3 md:pb-4 pt-1 md:pt-2">
          {playingAudio && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-300">
                <div className="flex gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-amber-400 rounded-full animate-pulse"
                      style={{ height: `${8 + Math.random() * 10}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-amber-600 dark:text-amber-400">ARYA is speaking...</span>
                <button
                  data-testid="button-stop-audio"
                  onClick={stopAudio}
                  className="p-0.5 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/30"
                >
                  <VolumeX className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </button>
              </div>
            </div>
          )}
          <Card className="bg-white/90 dark:bg-slate-900/90 border-gray-200 dark:border-slate-700 backdrop-blur-sm">
            <div className="flex items-end gap-1.5 md:gap-2 p-2 md:p-3">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                className="hidden"
                onChange={handleImageSelect}
                data-testid="input-image-upload"
              />

              {/* Mic — always visible */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="button-dictate"
                    variant="ghost"
                    size="icon"
                    onClick={() => isRecording ? stopRecording() : startRecording()}
                    disabled={isStreaming || isScanningDoc}
                    className={`flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 border transition-all ${
                      isRecording
                        ? "bg-red-500/20 text-red-500 dark:text-red-400 border-red-400 dark:border-red-600 animate-pulse"
                        : "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 text-emerald-600 dark:text-emerald-400 hover:from-emerald-500/30 hover:to-emerald-600/20 border-emerald-200 dark:border-emerald-800"
                    }`}
                  >
                    {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {isRecording ? "Stop — send to ARYA" : "Speak — ARYA replies in chat"}
                </TooltipContent>
              </Tooltip>

              {/* Speaker — always visible */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="button-speaker-toggle"
                    variant="ghost"
                    size="icon"
                    onClick={toggleSpeaker}
                    className={`flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 ${
                      speakerOn
                        ? "text-primary bg-primary/10 hover:bg-primary/20"
                        : "text-muted-foreground hover:text-gray-900 dark:hover:text-white hover:bg-card"
                    }`}
                  >
                    {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {speakerOn ? "ARYA speaks responses — tap to mute" : "Tap to hear ARYA speak"}
                </TooltipContent>
              </Tooltip>

              {/* ⋯ More — Globe, Attach, Live voice */}
              <div className="relative" ref={toolMoreRef}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      data-testid="button-toolbar-more"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowToolMore(v => !v)}
                      className={`flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 ${
                        showToolMore || selectedLanguage !== "en-IN"
                          ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                          : "text-muted-foreground hover:text-gray-900 dark:hover:text-white hover:bg-card"
                      }`}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">{t("toolbar_more")}</TooltipContent>
                </Tooltip>
                {showToolMore && (
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1 overflow-visible">
                    {/* Voice language row */}
                    <div className="relative" ref={langMenuRef}>
                      <button
                        data-testid="button-language-select"
                        onClick={() => setShowLanguageMenu(v => !v)}
                        className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors rounded-t-xl ${
                          selectedLanguage !== "en-IN" ? "text-amber-600 dark:text-amber-400" : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="flex-1 font-medium">{t("toolbar_lang")}</span>
                        {selectedLanguage !== "en-IN" && <span className="text-[11px] opacity-75">{currentLang?.native}</span>}
                      </button>
                      {showLanguageMenu && (
                        <div className="absolute bottom-0 left-full ml-2 w-52 bg-card border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                          <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
                            <p className="text-xs font-medium text-muted-foreground">{t("voice_lang_header")}</p>
                          </div>
                          <div className="max-h-72 overflow-y-auto py-1">
                            {DEFAULT_LANGUAGES.filter(l => SARVAM_LANGUAGE_CODES.has(l.code) || l.code === "en-IN").map((lang) => (
                              <button
                                key={lang.code}
                                data-testid={`button-lang-${lang.code}`}
                                onClick={() => {
                                  setSelectedLanguage(lang.code);
                                  setShowLanguageMenu(false);
                                  setShowToolMore(false);
                                  try { localStorage.setItem("arya_lang", lang.code); } catch {}
                                  const sc = lang.code.split("-")[0] as UiLanguage;
                                  const validUi: UiLanguage[] = ["en","hi","mr","bn","ta","te","kn","ml","gu","pa","od"];
                                  if (validUi.includes(sc)) setGlobalLanguage(sc);
                                }}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                                  selectedLanguage === lang.code ? "text-primary bg-primary/10" : "text-gray-700 dark:text-gray-200"
                                }`}
                              >
                                <span>{lang.name}</span>
                                <span className="text-xs text-muted-foreground">{lang.native}</span>
                              </button>
                            ))}
                            <div className="mx-3 my-1 border-t border-gray-100 dark:border-slate-700" />
                            {DEFAULT_LANGUAGES.filter(l => isGlobalVoiceLang(l.code)).map((lang) => (
                              <button
                                key={lang.code}
                                data-testid={`button-lang-${lang.code}`}
                                onClick={() => {
                                  setSelectedLanguage(lang.code);
                                  setShowLanguageMenu(false);
                                  setShowToolMore(false);
                                  try { localStorage.setItem("arya_lang", lang.code); } catch {}
                                }}
                                className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors ${
                                  selectedLanguage === lang.code ? "text-primary bg-primary/10" : "text-gray-700 dark:text-gray-200"
                                }`}
                              >
                                <span>{lang.name}</span>
                                <span className="text-xs text-muted-foreground">{lang.native}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Attach file row */}
                    <button
                      data-testid="button-attach-image"
                      onClick={() => { imageInputRef.current?.click(); setShowToolMore(false); }}
                      disabled={isStreaming || isScanningDoc}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                      <span className="font-medium">{t("toolbar_attach")}</span>
                    </button>
                    {/* Live voice row */}
                    <button
                      data-testid="button-voice-chat"
                      onClick={() => { setShowVoiceMode(true); setShowToolMore(false); }}
                      disabled={isStreaming || isRecording}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 disabled:opacity-50 transition-colors rounded-b-xl"
                    >
                      <Headphones className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                      <span className="font-medium">{t("toolbar_live_voice")}</span>
                    </button>
                  </div>
                )}
              </div>

              {isRecording ? (
                <div className="flex-1 flex items-center justify-center gap-2 md:gap-3 py-2">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-400 rounded-full animate-pulse"
                        style={{
                          height: `${12 + Math.random() * 16}px`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-red-500 dark:text-red-400 font-mono">
                    {formatTime(recordingTime)}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {isGlobalVoiceLang(selectedLanguage)
                      ? `Listening in ${currentLang?.name}… speak, then pause to send`
                      : `Recording${selectedLanguage !== "en-IN" ? ` in ${currentLang?.name}` : ""}… tap stop when done`}
                  </span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-w-0">
                  {pendingImage && (
                    <div className="flex items-center gap-2 px-1 pt-1.5 pb-1">
                      <div className="relative flex-shrink-0">
                        {pendingImage.previewUrl.startsWith("__pdf__:") ? (
                          <div className="h-12 w-12 rounded-lg border border-purple-200 dark:border-purple-800 bg-red-50 dark:bg-red-950/30 flex flex-col items-center justify-center gap-0.5">
                            <Paperclip className="w-4 h-4 text-red-500" />
                            <span className="text-[8px] font-bold text-red-500 uppercase">PDF</span>
                          </div>
                        ) : (
                          <img
                            src={pendingImage.previewUrl}
                            alt="Selected"
                            className="h-12 w-12 rounded-lg object-cover border border-purple-200 dark:border-purple-800"
                          />
                        )}
                        <button
                          onClick={() => setPendingImage(null)}
                          className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none hover:bg-gray-700"
                          data-testid="button-remove-image"
                        >✕</button>
                      </div>
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {isScanningDoc
                          ? (pendingImage.mimeType === "application/pdf" ? "Reading document…" : "Reading image…")
                          : (pendingImage.mimeType === "application/pdf"
                              ? `PDF: ${pendingImage.previewUrl.replace("__pdf__:", "")} — add a question or send`
                              : "Image attached — add a question or send")}
                      </span>
                    </div>
                  )}
                  <textarea
                    ref={inputRef}
                    data-testid="input-chat"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={pendingImage ? t("ask_about_image") : t("ask_anything")}
                    disabled={isStreaming || isScanningDoc}
                    rows={1}
                    className="w-full resize-none bg-transparent border-0 text-gray-900 dark:text-white placeholder:text-muted-foreground text-sm focus:outline-none py-2 max-h-32"
                    style={{
                      height: "auto",
                      minHeight: "2.25rem",
                      overflow: input.split("\n").length > 4 ? "auto" : "hidden",
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = Math.min(target.scrollHeight, 128) + "px";
                    }}
                  />
                </div>
              )}

              <Button
                data-testid="button-send"
                variant="ghost"
                size="icon"
                onClick={() => pendingImage ? sendWithImage() : sendMessage(input)}
                disabled={(!input.trim() && !pendingImage) || isStreaming || isRecording || isScanningDoc}
                className="flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 text-primary hover:bg-primary/10 disabled:opacity-30"
              >
                {isStreaming || isScanningDoc ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </Card>
          {voiceError && (
            <div className="flex items-center justify-center gap-2 mt-1.5 px-3">
              <p className="text-xs text-red-500 dark:text-red-400 text-center">{voiceError}</p>
              <button onClick={() => setVoiceError(null)} className="text-red-500 dark:text-red-400/60 hover:text-red-500 dark:hover:text-red-400 text-xs">✕</button>
            </div>
          )}
          <div className="hidden md:flex items-center justify-center gap-2 mt-1.5 md:mt-2">
            {selectedLanguage !== "en-IN" && (
              <span className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400/80 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                Voice: {currentLang?.native}
              </span>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground text-center flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400/50" />
              {t("app_tagline")}
            </p>
          </div>
        </div>
      </div>

      {showVoiceMode && createPortal(
        <VoiceConversationMode
          onClose={() => {
            setShowVoiceMode(false);
            queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
            if (activeConversation) {
              queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations", activeConversation] });
            }
          }}
          selectedLanguage={selectedLanguage}
          token={token}
          activeConversation={activeConversation}
          onConversationCreated={(id) => setActiveConversation(id)}
        />,
        document.body
      )}

      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            key="invite-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl"
              data-testid="invite-modal"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white font-['Space_Grotesk']">Enter Invite Code</h3>
                <button onClick={() => { setShowInviteModal(false); setInviteError(""); }} className="text-gray-400 hover:text-gray-900 dark:hover:text-white" data-testid="close-invite-modal">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-gray-400 text-sm mb-4">ARYA is in private beta. Enter your invite code to get access.</p>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. ARYA-BETA-001"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 mb-3 font-mono tracking-wider"
                data-testid="input-invite-code"
                onKeyDown={(e) => e.key === "Enter" && handleRedeemInvite()}
              />
              {inviteError && <p className="text-red-500 dark:text-red-400 text-sm mb-3" data-testid="text-invite-error">{inviteError}</p>}
              <button
                onClick={handleRedeemInvite}
                disabled={inviteLoading || !inviteCode.trim()}
                className="w-full py-3 bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 disabled:bg-gray-600 disabled:cursor-not-allowed text-emerald-800 dark:text-emerald-200 font-semibold rounded-lg transition-colors"
                data-testid="button-redeem-invite"
              >
                {inviteLoading ? "Verifying..." : "Redeem Code"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showUserAuth && (
          <motion.div
            key="auth-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
          >
            <UserAuthModal onClose={() => setShowUserAuth(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showOnboarding && token && (
          <motion.div
            key="onboarding-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50"
          >
            <OnboardingModal token={token} onComplete={() => {
              setShowOnboarding(false);
              refreshUser();
              const tutorialDone = localStorage.getItem("arya_tutorial_done") === "true";
              if (!tutorialDone) setShowTutorial(true);
            }} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showProfile && token && (
          <motion.div
            key="profile-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
          >
            <UserProfileModal token={token} onClose={() => setShowProfile(false)} userName={user?.name || ""} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div
            key="feedback-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
          >
            <FeedbackModal token={token} onClose={() => setShowFeedbackModal(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTutorial && (
          <motion.div
            key="tutorial-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50"
          >
            <QuickStartTutorial token={token} onClose={() => setShowTutorial(false)} onStartChat={(text) => { setShowTutorial(false); sendMessage(text); }} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPricing && token && (
          <motion.div key="pricing-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-50">
            <PricingModal
              token={token}
              currentPlan={(user as any)?.plan || "free"}
              onClose={() => setShowPricing(false)}
              onUpgradeSuccess={(plan) => { setShowPricing(false); refreshUser?.(); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rehearsal Feedback modal */}
      <AnimatePresence>
        {rehearsalFeedbackOpen && (
          <motion.div
            key="rehearsal-feedback-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setRehearsalFeedbackOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-violet-100 dark:border-violet-900 overflow-hidden"
              onClick={e => e.stopPropagation()}
              data-testid="modal-rehearsal-feedback"
            >
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ARYA's Coaching Feedback</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">How your rehearsal went — and what to carry into the real conversation</p>
                  </div>
                  <button onClick={() => setRehearsalFeedbackOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mt-0.5">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
                <div className="prose-arya text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {rehearsalFeedback}
                </div>
              </div>
              <div className="px-6 pb-5 pt-3 border-t border-gray-100 dark:border-slate-700 flex gap-3">
                <Button
                  onClick={() => { setRehearsalFeedbackOpen(false); setActiveConversation(null); }}
                  variant="outline"
                  className="flex-1 text-sm"
                  data-testid="button-rehearsal-done"
                >
                  Done — back to ARYA
                </Button>
                <Button
                  onClick={() => setRehearsalFeedbackOpen(false)}
                  className="flex-1 text-sm bg-violet-600 hover:bg-violet-700 text-white"
                  data-testid="button-rehearsal-see-chat"
                >
                  See full conversation
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Future You Letter modal */}
      <AnimatePresence>
        {showFutureLetter && isLoggedIn && (
          <motion.div
            key="future-letter-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xl">✉️</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white leading-snug">
                      A letter to your future self
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Imagine it's 6 months from now. You've grown. Write a letter <em>from that version of you</em> — to who you are today.
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {futureLetterSaved ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-6"
                  >
                    <div className="text-4xl mb-3">🌱</div>
                    <p className="font-medium text-gray-800 dark:text-gray-200 mb-1">Letter saved.</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">I'll read it back to you when the moment is right.</p>
                  </motion.div>
                ) : (
                  <>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 italic">Start with "Dear [your name]..." — let it flow naturally.</p>
                    <textarea
                      data-testid="input-future-letter"
                      value={futureLetterDraft}
                      onChange={e => setFutureLetterDraft(e.target.value)}
                      placeholder={`Dear ${user?.name?.split(" ")[0] || "friend"},\n\nSix months from now, you finally...`}
                      rows={8}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-sm text-gray-800 dark:text-gray-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-gray-400 dark:placeholder:text-gray-600 leading-relaxed"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 text-right">
                      {futureLetterDraft.length} / 3000
                    </p>
                  </>
                )}
              </div>

              {/* Footer */}
              {!futureLetterSaved && (
                <div className="px-6 pb-6 flex gap-3 justify-end">
                  <button
                    data-testid="button-future-letter-later"
                    onClick={() => {
                      try { localStorage.setItem("arya_future_letter_dismissed", new Date().toDateString()); } catch {}
                      setShowFutureLetter(false);
                    }}
                    className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Maybe later
                  </button>
                  <button
                    data-testid="button-future-letter-save"
                    disabled={futureLetterDraft.trim().length < 20 || futureLetterSaving}
                    onClick={async () => {
                      if (!token || futureLetterDraft.trim().length < 20) return;
                      setFutureLetterSaving(true);
                      try {
                        const res = await fetch("/api/user/future-letter", {
                          method: "POST",
                          headers: { "Content-Type": "application/json", "x-user-token": token },
                          body: JSON.stringify({ letter: futureLetterDraft }),
                        });
                        if (res.ok) {
                          setFutureLetterSaved(true);
                          queryClient.invalidateQueries({ queryKey: ["/api/user/future-letter"] });
                          setTimeout(() => setShowFutureLetter(false), 2200);
                        }
                      } finally {
                        setFutureLetterSaving(false);
                      }
                    }}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {futureLetterSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {futureLetterSaving ? "Saving…" : "Save this letter"}
                  </button>
                </div>
              )}
              {futureLetterSaved && (
                <div className="px-6 pb-6 flex justify-center">
                  <button
                    data-testid="button-future-letter-close"
                    onClick={() => setShowFutureLetter(false)}
                    className="px-5 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* First-login feature tour — shown once ever to new users */}
      {showFeatureTour && isLoggedIn && user && (
        <FirstLoginFeatureTour
          userId={String(user.id)}
          onDone={() => setShowFeatureTour(false)}
        />
      )}

      {/* Login welcome toast — slides in from bottom once per session */}
      <AnimatePresence>
        {showLoginToast && isLoggedIn && user && (
          <motion.div
            data-testid="card-login-toast"
            initial={{ opacity: 0, y: 80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm"
          >
            <div
              className="rounded-2xl shadow-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #f0fdf4 0%, #fefce8 100%)",
                border: "1px solid rgba(6,78,59,0.15)",
              }}
            >
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "linear-gradient(135deg, #d1fae5 0%, #fef3c7 100%)", border: "1px solid rgba(6,78,59,0.12)" }}>
                  <span className="text-base" role="img" aria-label="welcome">✦</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-700 mb-0.5">
                    Welcome back, {user.name?.split(" ")[0] || "friend"}
                  </p>
                  <LoginToastContent token={token} />
                </div>
                <button
                  data-testid="button-dismiss-login-toast"
                  onClick={() => setShowLoginToast(false)}
                  className="p-1 rounded-lg hover:bg-black/5 text-gray-400 flex-shrink-0 mt-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Auto-dismiss progress bar */}
              <motion.div
                className="h-0.5 bg-emerald-400/50"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 6, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ARYA-branded floating help / feedback button */}
      <AnimatePresence>
        {!showFeedbackModal && !showTutorial && !showOnboarding && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-5 right-5 z-40"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  data-testid="button-arya-help-fab"
                  onClick={() => setShowFeedbackModal(true)}
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 hover:scale-105 active:scale-95 transition-transform group"
                  aria-label="Report an issue or share feedback"
                >
                  <span
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      letterSpacing: "0.05em",
                      background: "linear-gradient(135deg, #059669, #0d9488)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    A
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                Share feedback or report an issue
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type VoicePhase = "idle" | "listening" | "processing" | "speaking";

function VoiceConversationMode({
  onClose,
  selectedLanguage,
  token,
  activeConversation,
  onConversationCreated,
}: {
  onClose: () => void;
  selectedLanguage: string;
  token: string | null;
  activeConversation: number | null;
  onConversationCreated: (id: number) => void;
}) {
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [conversationLog, setConversationLog] = useState<{role: string; text: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [lastVoiceLogId, setLastVoiceLogId] = useState<string | null>(null);
  const [lastRating, setLastRating] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const convIdRef = useRef<number | null>(activeConversation);
  const activeRef = useRef(true);
  const processingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const autoListenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceMonitorStreamRef = useRef<MediaStream | null>(null);
  const voiceMonitorCtxRef = useRef<AudioContext | null>(null);
  const voiceMonitorFrameRef = useRef<number | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    convIdRef.current = activeConversation;
  }, [activeConversation]);

  const stopVoiceMonitor = useCallback(() => {
    if (voiceMonitorFrameRef.current) { cancelAnimationFrame(voiceMonitorFrameRef.current); voiceMonitorFrameRef.current = null; }
    if (voiceMonitorStreamRef.current) { voiceMonitorStreamRef.current.getTracks().forEach(t => t.stop()); voiceMonitorStreamRef.current = null; }
    if (voiceMonitorCtxRef.current) { try { voiceMonitorCtxRef.current.close(); } catch {} voiceMonitorCtxRef.current = null; }
  }, []);

  const stopAllMedia = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (autoListenTimerRef.current) { clearTimeout(autoListenTimerRef.current); autoListenTimerRef.current = null; }
    if (abortRef.current) { try { abortRef.current.abort(); } catch {} abortRef.current = null; }
    stopVoiceMonitor();
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) try { URL.revokeObjectURL(audioRef.current.src); } catch {}
      audioRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    processingRef.current = false;
  }, [stopVoiceMonitor]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      stopAllMedia();
    };
  }, [stopAllMedia]);

  const startListening = useCallback(async () => {
    if (!activeRef.current) return;
    if (abortRef.current) { try { abortRef.current.abort(); } catch {} abortRef.current = null; }
    if (autoListenTimerRef.current) { clearTimeout(autoListenTimerRef.current); autoListenTimerRef.current = null; }
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {} audioContextRef.current = null; }
    processingRef.current = false;
    setPhase("listening");
    setTranscript("");
    setResponse("");
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus", ""];
      let selectedMime = "";
      for (const mime of mimeTypes) {
        if (!mime || MediaRecorder.isTypeSupported(mime)) { selectedMime = mime; break; }
      }
      const recOpts: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(stream, recOpts);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(100);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let hasSpoken = false;
      let lastSpeechTime = Date.now();
      let speechStartTime = 0;
      let speechFrameCount = 0;
      const SILENCE_THRESHOLD = 30;
      const SILENCE_DURATION_MS = 1800;
      const MIN_SPEECH_FRAMES = 15;

      const checkAudio = () => {
        if (!activeRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        setAudioLevel(Math.min(avg / 60, 1));

        if (avg > SILENCE_THRESHOLD) {
          if (!hasSpoken) {
            speechStartTime = Date.now();
          }
          hasSpoken = true;
          speechFrameCount++;
          lastSpeechTime = Date.now();
        }

        if (hasSpoken && speechFrameCount >= MIN_SPEECH_FRAMES && (Date.now() - lastSpeechTime) > SILENCE_DURATION_MS) {
          processRecording();
          return;
        }

        animFrameRef.current = requestAnimationFrame(checkAudio);
      };
      animFrameRef.current = requestAnimationFrame(checkAudio);

      silenceTimerRef.current = setTimeout(() => {
        if (!hasSpoken && activeRef.current) {
          setError("No speech detected. Tap mic to try again.");
          stopAllMedia();
          setPhase("idle");
        }
      }, 12000);

    } catch (err: any) {
      if (err?.name === "NotAllowedError") {
        setError("Microphone access denied. Please allow microphone access.");
      } else {
        setError("Could not access microphone.");
      }
      setPhase("idle");
    }
  }, []);

  const processRecording = useCallback(async () => {
    if (!activeRef.current) return;
    if (processingRef.current) return;
    processingRef.current = true;

    setPhase("processing");
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (autoListenTimerRef.current) { clearTimeout(autoListenTimerRef.current); autoListenTimerRef.current = null; }

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      processingRef.current = false;
      if (activeRef.current) startListening();
      return;
    }

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const recorderMime = recorder.mimeType || "audio/webm";
        resolve(new Blob(chunksRef.current, { type: recorderMime }));
      };
      recorder.stop();
    });

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch {}
      audioContextRef.current = null;
    }

    if (blob.size < 3000) {
      processingRef.current = false;
      if (activeRef.current) startListening();
      return;
    }

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(blob);
      });

      if (abortController.signal.aborted) { processingRef.current = false; return; }

      let convId = convIdRef.current;
      if (!convId) {
        const res = await fetch("/api/arya/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Voice Chat" }),
          signal: abortController.signal,
        });
        if (!res.ok) throw new Error("Could not create conversation");
        const conv = await res.json();
        if (!conv?.id) throw new Error("Invalid conversation response");
        convId = conv.id as number;
        convIdRef.current = convId;
        onConversationCreated(convId);
      }

      const fetchHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (token) fetchHeaders["x-user-token"] = token;

      const fetchRes = await fetch(`/api/arya/conversations/${convId}/voice`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ audio: base64Audio, tenant_id: "varah", language: selectedLanguage }),
        signal: abortController.signal,
      });

      if (!fetchRes.ok) {
        let errMsg = "Could not connect to ARYA. Please try again.";
        try {
          const errData = await fetchRes.json();
          if (errData?.error) errMsg = errData.error;
        } catch {}
        throw new Error(errMsg);
      }

      const streamReader = fetchRes.body?.getReader();
      if (!streamReader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let responseAudioBase64 = "";

      while (true) {
        if (abortController.signal.aborted) { try { streamReader.cancel(); } catch {} processingRef.current = false; return; }
        const { done, value } = await streamReader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "user_transcript") {
              setTranscript(event.content);
              setConversationLog(prev => [...prev, { role: "user", text: event.content }]);
            }
            if (event.type === "assistant" && event.content) {
              fullContent += event.content;
              setResponse(fullContent);
            }
            if (event.type === "audio_response" && event.audio) {
              responseAudioBase64 = event.audio;
            }
            if (event.type === "error" && (event.content || event.error)) {
              setError(event.content || event.error);
              processingRef.current = false;
              setTimeout(() => {
                setError(null);
                if (activeRef.current) startListening();
              }, 2500);
              return;
            }
            if (event.type === "done") {
              setConversationLog(prev => [...prev, { role: "assistant", text: fullContent }]);
              if (event.logId) { setLastVoiceLogId(event.logId); setLastRating(null); }
              queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
              if (convId) {
                queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations", convId] });
              }
            }
          } catch {}
        }
      }

      if (!activeRef.current || abortController.signal.aborted) { processingRef.current = false; return; }

      let voiceInterrupted = false;
      const interruptAndListen = () => {
        if (voiceInterrupted) return;
        voiceInterrupted = true;
        stopVoiceMonitor();
        if (audioRef.current) { audioRef.current.pause(); if (audioRef.current.src) try { URL.revokeObjectURL(audioRef.current.src); } catch {} audioRef.current = null; }
        if (abortRef.current) { try { abortRef.current.abort(); } catch {} abortRef.current = null; }
        if (autoListenTimerRef.current) { clearTimeout(autoListenTimerRef.current); autoListenTimerRef.current = null; }
        processingRef.current = false;
        if (activeRef.current) startListening();
      };

      let audioReady = false;
      if (responseAudioBase64 && !voiceInterrupted) {
        audioReady = true;
        setPhase("speaking");
        startVoiceMonitor(interruptAndListen);
        await playAudioAndWait(responseAudioBase64);
      } else if (!voiceInterrupted) {
        const cleanText = fullContent.replace(/[#*_`~>\[\]()!|]/g, "").replace(/\n{2,}/g, ". ").replace(/\n/g, " ").trim();
        if (cleanText.length > 2 && !abortController.signal.aborted && !voiceInterrupted) {
          const ttsRes = await fetch("/api/arya/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: cleanText.slice(0, 500), language: selectedLanguage }),
            signal: abortController.signal,
          });
          if (ttsRes.ok && !voiceInterrupted) {
            const ttsData = await ttsRes.json();
            if (ttsData.audioBase64 && !abortController.signal.aborted && !voiceInterrupted) {
              audioReady = true;
              setPhase("speaking");
              startVoiceMonitor(interruptAndListen);
              await playAudioAndWait(ttsData.audioBase64);
            }
          }
        }
      }
      if (!audioReady && !voiceInterrupted) {
        startVoiceMonitor(interruptAndListen);
      }

      stopVoiceMonitor();
      if (voiceInterrupted) return;

      processingRef.current = false;
      if (activeRef.current && !abortController.signal.aborted) {
        autoListenTimerRef.current = setTimeout(() => {
          if (activeRef.current) startListening();
        }, 600);
      }

    } catch (err: any) {
      processingRef.current = false;
      if (err?.name === "AbortError") return;
      console.error("Voice conversation error:", err);
      setError("Something went wrong. Tap the mic to try again.");
      setPhase("idle");
    }
  }, [selectedLanguage, token, onConversationCreated, queryClient]);

  const startVoiceMonitor = useCallback(async (onVoiceDetected: () => void) => {
    stopVoiceMonitor();
    try {
      const monStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      voiceMonitorStreamRef.current = monStream;
      const monCtx = new AudioContext();
      voiceMonitorCtxRef.current = monCtx;
      const source = monCtx.createMediaStreamSource(monStream);
      const analyser = monCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      const VOICE_THRESHOLD = 40;
      let consecutiveFrames = 0;
      const FRAMES_NEEDED = 15;
      const startTime = Date.now();
      const DELAY_MS = 500;

      const check = () => {
        if (!voiceMonitorStreamRef.current) return;
        if (Date.now() - startTime < DELAY_MS) {
          voiceMonitorFrameRef.current = requestAnimationFrame(check);
          return;
        }
        analyser.getByteFrequencyData(dataArr);
        const avg = dataArr.reduce((s, v) => s + v, 0) / dataArr.length;
        if (avg > VOICE_THRESHOLD) {
          consecutiveFrames++;
          if (consecutiveFrames >= FRAMES_NEEDED) {
            onVoiceDetected();
            return;
          }
        } else {
          consecutiveFrames = Math.max(0, consecutiveFrames - 1);
        }
        voiceMonitorFrameRef.current = requestAnimationFrame(check);
      };
      voiceMonitorFrameRef.current = requestAnimationFrame(check);
    } catch {}
  }, [stopVoiceMonitor]);

  const playAudioAndWait = useCallback((base64Audio: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        const byteChars = atob(base64Audio);
        const byteArray = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArray], { type: "audio/wav" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        let resolved = false;
        const done = () => { if (!resolved) { resolved = true; URL.revokeObjectURL(url); resolve(); } };
        audio.onended = done;
        audio.onerror = done;
        audio.onpause = done;
        audio.play().catch(done);
      } catch { resolve(); }
    });
  }, []);

  const handleClose = () => {
    activeRef.current = false;
    stopAllMedia();
    onClose();
  };

  const handleMicTap = () => {
    if (phase === "listening") {
      processRecording();
    } else if (phase === "idle") {
      startListening();
    } else if (phase === "speaking") {
      if (abortRef.current) { try { abortRef.current.abort(); } catch {} abortRef.current = null; }
      if (audioRef.current) { audioRef.current.pause(); if (audioRef.current.src) try { URL.revokeObjectURL(audioRef.current.src); } catch {} audioRef.current = null; }
      if (autoListenTimerRef.current) { clearTimeout(autoListenTimerRef.current); autoListenTimerRef.current = null; }
      processingRef.current = false;
      startListening();
    } else if (phase === "processing") {
      if (abortRef.current) { try { abortRef.current.abort(); } catch {} abortRef.current = null; }
      processingRef.current = false;
      startListening();
    }
  };

  useEffect(() => {
    startListening();
  }, []);

  const phaseText = {
    idle: "Tap to speak",
    listening: "Listening...",
    processing: "Thinking...",
    speaking: "Speaking...",
  };

  const [showTranscript, setShowTranscript] = useState(false);

  const orbScale = phase === "listening" ? 1 + audioLevel * 0.35 : 1;
  const hasHistory = conversationLog.length > 0 || (transcript && phase === "processing") || (response && (phase === "processing" || phase === "speaking"));

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-800 flex flex-col" style={{ zIndex: 9999 }} data-testid="voice-conversation-mode" onClick={handleMicTap}>
      <div className="w-full flex items-center justify-between px-5 py-4 pt-safe relative z-10">
        <button
          data-testid="button-close-voice-mode"
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center">
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "#047857",
            }}
          >
            ARYA
          </span>
        </div>
        {hasHistory && (
          <button
            data-testid="button-toggle-transcript"
            onClick={(e) => { e.stopPropagation(); setShowTranscript(!showTranscript); }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        )}
        {!hasHistory && <div className="w-10" />}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <h1 className={`text-3xl md:text-4xl font-light tracking-wide mb-12 transition-all duration-500 ${
          phase === "listening" ? "text-gray-900 dark:text-white" :
          phase === "processing" ? "text-gray-600 dark:text-gray-300" :
          phase === "speaking" ? "text-gray-900 dark:text-white" :
          error ? "text-red-500 dark:text-red-400/80" : "text-gray-400"
        }`}>
          {error || phaseText[phase]}
        </h1>

        <div className="relative w-40 h-40 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); handleMicTap(); }}>
          {phase === "listening" && (
            <>
              <div
                className="absolute inset-0 rounded-full border border-emerald-400/20 transition-transform duration-200"
                style={{ transform: `scale(${orbScale + 0.5})` }}
              />
              <div
                className="absolute inset-0 rounded-full border border-emerald-400/10 transition-transform duration-300"
                style={{ transform: `scale(${orbScale + 0.9})` }}
              />
            </>
          )}

          {phase === "processing" && (
            <div className="absolute inset-0 rounded-full">
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-amber-400/60 border-r-emerald-400/40 animate-spin" style={{ animationDuration: "1.5s" }} />
              <div className="absolute inset-5 rounded-full border border-transparent border-b-amber-400/30 border-l-emerald-400/20 animate-spin" style={{ animationDuration: "2.5s", animationDirection: "reverse" }} />
            </div>
          )}

          {phase === "speaking" && (
            <>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500/5 to-green-500/5 animate-pulse" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-4 rounded-full border border-green-400/15 animate-pulse" style={{ animationDuration: "1.5s" }} />
            </>
          )}

          <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
            phase === "listening"
              ? "bg-gradient-to-br from-emerald-500/20 to-green-600/20 shadow-[0_0_60px_rgba(16,185,129,0.15)]"
              : phase === "processing"
              ? "bg-gradient-to-br from-amber-500/15 to-orange-500/15"
              : phase === "speaking"
              ? "bg-gradient-to-br from-green-500/15 to-emerald-500/15 shadow-[0_0_40px_rgba(34,197,94,0.1)]"
              : "bg-gray-100 dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700"
          }`}>
            <svg viewBox="0 0 80 80" className="w-16 h-16">
              {phase === "listening" ? (
                <>
                  <circle cx="30" cy="32" r="2.5" fill="rgba(6,182,212,0.8)">
                    <animate attributeName="r" values="2.5;3.5;2.5" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="50" cy="32" r="2.5" fill="rgba(6,182,212,0.8)">
                    <animate attributeName="r" values="2.5;3.5;2.5" dur="1.2s" begin="0.2s" repeatCount="indefinite" />
                  </circle>
                  <path d="M 28 48 Q 40 58 52 48" fill="none" stroke="rgba(6,182,212,0.6)" strokeWidth="2" strokeLinecap="round">
                    <animate attributeName="d" values="M 28 48 Q 40 58 52 48;M 28 46 Q 40 56 52 46;M 28 48 Q 40 58 52 48" dur="2s" repeatCount="indefinite" />
                  </path>
                  <path d="M 18 38 Q 14 40 18 42" fill="none" stroke="rgba(6,182,212,0.3)" strokeWidth="1.5" strokeLinecap="round">
                    <animate attributeName="d" values="M 18 38 Q 14 40 18 42;M 16 37 Q 11 40 16 43;M 18 38 Q 14 40 18 42" dur="1s" repeatCount="indefinite" />
                  </path>
                </>
              ) : phase === "processing" ? (
                <>
                  <circle cx="28" cy="36" r="3" fill="rgba(245,158,11,0.6)">
                    <animate attributeName="cy" values="36;32;36" dur="0.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="40" cy="36" r="3" fill="rgba(245,158,11,0.6)">
                    <animate attributeName="cy" values="36;32;36" dur="0.8s" begin="0.15s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="52" cy="36" r="3" fill="rgba(245,158,11,0.6)">
                    <animate attributeName="cy" values="36;32;36" dur="0.8s" begin="0.3s" repeatCount="indefinite" />
                  </circle>
                </>
              ) : phase === "speaking" ? (
                <>
                  <circle cx="30" cy="32" r="2.5" fill="rgba(34,197,94,0.8)" />
                  <circle cx="50" cy="32" r="2.5" fill="rgba(34,197,94,0.8)" />
                  <path d="M 28 46 Q 40 56 52 46" fill="none" stroke="rgba(34,197,94,0.6)" strokeWidth="2" strokeLinecap="round" />
                  <g transform="translate(40, 60)">
                    {[-12, -6, 0, 6, 12].map((x, i) => (
                      <rect key={i} x={x - 1.5} y="-4" width="3" rx="1.5" fill="rgba(34,197,94,0.5)">
                        <animate attributeName="height" values="4;10;4" dur="0.6s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
                        <animate attributeName="y" values="-2;-5;-2" dur="0.6s" begin={`${i * 0.1}s`} repeatCount="indefinite" />
                      </rect>
                    ))}
                  </g>
                </>
              ) : (
                <>
                  <circle cx="30" cy="34" r="2" fill="rgba(255,255,255,0.3)" />
                  <circle cx="50" cy="34" r="2" fill="rgba(255,255,255,0.3)" />
                  <path d="M 30 48 Q 40 52 50 48" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </div>
        </div>

        {error && (
          <button
            data-testid="button-retry-voice"
            onClick={(e) => { e.stopPropagation(); setError(null); startListening(); }}
            className="mt-6 px-5 py-2 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            Try again
          </button>
        )}
      </div>

      <div className="relative w-full h-28 overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 400 112" preserveAspectRatio="none">
          <defs>
            <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="20%" stopColor={phase === "listening" ? "rgba(6,182,212,0.6)" : phase === "speaking" ? "rgba(34,197,94,0.5)" : phase === "processing" ? "rgba(245,158,11,0.5)" : "rgba(245,158,11,0.3)"}>
                {phase === "listening" && <animate attributeName="stop-color" values="rgba(6,182,212,0.6);rgba(59,130,246,0.6);rgba(6,182,212,0.6)" dur="3s" repeatCount="indefinite" />}
              </stop>
              <stop offset="50%" stopColor={phase === "listening" ? "rgba(245,158,11,0.8)" : phase === "speaking" ? "rgba(6,182,212,0.6)" : phase === "processing" ? "rgba(245,158,11,0.7)" : "rgba(245,158,11,0.5)"}>
                {phase === "listening" && <animate attributeName="stop-color" values="rgba(245,158,11,0.8);rgba(234,88,12,0.8);rgba(245,158,11,0.8)" dur="4s" repeatCount="indefinite" />}
              </stop>
              <stop offset="80%" stopColor={phase === "listening" ? "rgba(234,88,12,0.6)" : phase === "speaking" ? "rgba(34,197,94,0.5)" : phase === "processing" ? "rgba(234,88,12,0.5)" : "rgba(234,88,12,0.3)"}>
                {phase === "listening" && <animate attributeName="stop-color" values="rgba(234,88,12,0.6);rgba(239,68,68,0.5);rgba(234,88,12,0.6)" dur="3.5s" repeatCount="indefinite" />}
              </stop>
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <ellipse cx="200" cy="140" rx={phase === "listening" ? 160 + audioLevel * 30 : 150} ry="60" fill="none" stroke="url(#arcGrad)" strokeWidth={phase === "listening" ? 3 + audioLevel * 2 : phase === "speaking" ? 2.5 : 2} />
          <ellipse cx="200" cy="160" rx="180" ry="50" fill="none" stroke="url(#arcGrad)" strokeWidth="1" opacity="0.3" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-slate-800 via-transparent to-transparent pointer-events-none" style={{ top: "60%" }} />
      </div>

      {phase === "speaking" && (
        <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-gray-300 dark:text-gray-600">Speak or tap to interrupt</p>
      )}

      {showTranscript && (
        <div className="absolute inset-0 z-20 bg-slate-50 dark:bg-slate-800/95 backdrop-blur-sm flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-gray-700 dark:text-gray-200 text-sm font-medium">Conversation</h3>
            <button onClick={() => setShowTranscript(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white" data-testid="button-close-transcript">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {conversationLog.map((msg, i) => {
              const isLastAssistant = msg.role === "assistant" && i === conversationLog.length - 1;
              return (
                <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === "user"
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-gray-800 dark:text-gray-100 rounded-br-sm"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-bl-sm"
                  }`}>
                    {msg.text}
                  </div>
                  {isLastAssistant && lastVoiceLogId && (
                    <div className="flex gap-1.5 mt-1 ml-1">
                      <button
                        data-testid="btn-voice-thumbup"
                        onClick={() => {
                          fetch(`/api/arya/voice-quality/${lastVoiceLogId}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: 1 }) });
                          setLastRating(1);
                        }}
                        title="Good response"
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${lastRating === 1 ? "border-green-400 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "border-gray-200 dark:border-slate-600 text-gray-400 hover:text-green-500"}`}
                      >👍</button>
                      <button
                        data-testid="btn-voice-thumbdown"
                        onClick={() => {
                          fetch(`/api/arya/voice-quality/${lastVoiceLogId}/rate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rating: -1 }) });
                          setLastRating(-1);
                        }}
                        title="Poor response"
                        className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${lastRating === -1 ? "border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "border-gray-200 dark:border-slate-600 text-gray-400 hover:text-red-500"}`}
                      >👎</button>
                    </div>
                  )}
                </div>
              );
            })}
            {transcript && phase === "processing" && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-gray-800 dark:text-gray-100 rounded-br-sm">{transcript}</div>
              </div>
            )}
            {response && (phase === "processing" || phase === "speaking") && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-bl-sm">{response}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserAuthModal({ onClose }: { onClose: () => void }) {
  const { login, signup, loginWithGoogle } = useUserAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signupLang, setSignupLang] = useState("hi");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleScriptLoaded = useRef(false);

  useEffect(() => {
    fetch("/api/user/google-config").then(r => r.json()).then(d => {
      if (d.clientId) setGoogleClientId(d.clientId);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!googleClientId || googleScriptLoaded.current) return;
    const existing = document.getElementById("google-gis-script");
    if (existing) { initGoogleBtn(); return; }
    const script = document.createElement("script");
    script.id = "google-gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initGoogleBtn();
    document.head.appendChild(script);
    googleScriptLoaded.current = true;
  }, [googleClientId]);

  useEffect(() => {
    if (window.google && googleClientId && googleBtnRef.current) initGoogleBtn();
  }, [mode, googleClientId]);

  function initGoogleBtn() {
    if (!window.google || !googleClientId || !googleBtnRef.current) return;
    window.google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCredential });
    setTimeout(() => {
      if (!googleBtnRef.current) return;
      window.google!.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        width: googleBtnRef.current.offsetWidth || 320,
        text: mode === "signup" ? "signup_with" : "signin_with",
        logo_alignment: "left",
      });
    }, 100);
  }

  async function handleGoogleCredential(response: { credential: string }) {
    setGoogleLoading(true);
    setError("");
    try {
      const result = await loginWithGoogle(response.credential);
      if (result.success) onClose();
      else setError(result.error || "Google sign-in failed");
    } finally { setGoogleLoading(false); }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const r = await login(phone, password);
        if (!r.success) setError(r.error || "Login failed");
        else onClose();
      } else {
        if (!name.trim()) { setError("Please enter your name"); setLoading(false); return; }
        const r = await signup({ name: name.trim(), phone, password, preferredLanguage: signupLang });
        if (!r.success) setError(r.error || "Signup failed");
        else onClose();
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl p-6 relative" onClick={e => e.stopPropagation()}>
        <button
          data-testid="modal-button-close"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 transition-all"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-center mb-5">
          <div className="mb-3 flex flex-col items-center gap-1.5">
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "2.5rem",
                fontWeight: 700,
                letterSpacing: "0.14em",
                lineHeight: 1,
                display: "block",
                color: "#047857",
              }}
            >
              ARYA
            </span>
            <span className="flex gap-1.5">
              <span className="w-1 h-1 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, #6ee7b7, #059669)" }} />
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, #34d399, #047857)" }} />
              <span className="w-1 h-1 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, #6ee7b7, #059669)" }} />
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{mode === "login" ? "Welcome Back" : "Join ARYA"}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "login" ? "Sign in to track your goals" : "Create account to set goals & track progress"}
          </p>
        </div>
        {googleClientId && (
          <div className="mb-4">
            {googleLoading ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Signing in with Google...
              </div>
            ) : (
              <div ref={googleBtnRef} data-testid="button-google-signin" className="w-full flex justify-center" />
            )}
            <div className="flex items-center gap-3 mt-4 mb-1">
              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
              <span className="text-[11px] text-muted-foreground">or sign in with phone</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <>
              <input
                data-testid="modal-input-name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-background/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                autoFocus
              />
              <div>
                <p className="text-[11px] text-muted-foreground mb-1.5">Preferred language for voice conversations</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { code: "hi", label: "हिन्दी", name: "Hindi" },
                    { code: "en", label: "English", name: "English" },
                    { code: "ta", label: "தமிழ்", name: "Tamil" },
                    { code: "te", label: "తెలుగు", name: "Telugu" },
                    { code: "kn", label: "ಕನ್ನಡ", name: "Kannada" },
                    { code: "ml", label: "മലയാ", name: "Malayalam" },
                    { code: "mr", label: "मराठी", name: "Marathi" },
                    { code: "bn", label: "বাংলা", name: "Bengali" },
                  ].map(l => (
                    <button
                      key={l.code}
                      type="button"
                      data-testid={`lang-option-${l.code}`}
                      onClick={() => setSignupLang(l.code)}
                      title={l.name}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-medium border transition-all ${
                        signupLang === l.code
                          ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          : "border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-slate-600"
                      }`}
                    >{l.label}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          <input
            data-testid="modal-input-phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full bg-background/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            autoFocus={mode === "login"}
          />
          <div className="relative">
            <input
              data-testid="modal-input-password"
              type={showPw ? "text" : "password"}
              placeholder={mode === "signup" ? "Create password (min 6 chars)" : "Password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-background/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm px-3 py-2.5 pr-10 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <div className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2" data-testid="modal-text-error">{error}</div>}
          <Button
            data-testid="modal-button-submit"
            type="submit"
            disabled={loading || !phone || !password}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium py-2.5 rounded-xl"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>
        <div className="text-center mt-3">
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="text-xs text-muted-foreground hover:text-gray-900 dark:hover:text-white">
            {mode === "login" ? <>New here? <span className="text-emerald-600 dark:text-emerald-400">Create account</span></> : <>Have an account? <span className="text-emerald-600 dark:text-emerald-400">Sign in</span></>}
          </button>
        </div>
        {mode === "signup" && (
          <p className="text-[10px] text-muted-foreground text-center mt-4 leading-relaxed">
            By creating an account you agree to our{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">Terms &amp; Conditions</a>
            {" "}and{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline">Privacy Policy</a>.
          </p>
        )}
      </div>
    </div>
  );
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bengali" },
  { code: "gu", label: "Gujarati" },
  { code: "pa", label: "Punjabi" },
  { code: "or", label: "Odia" },
];

function FeedbackModal({ token, onClose }: { token: string | null; onClose: () => void }) {
  const [category, setCategory] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    { value: "bug", label: "Something isn't working", icon: "🐛" },
    { value: "feature", label: "I'd like a new feature", icon: "💡" },
    { value: "content", label: "Response quality issue", icon: "📝" },
    { value: "performance", label: "App is slow or laggy", icon: "⚡" },
    { value: "other", label: "Something else", icon: "💬" },
  ];

  const handleSubmit = async () => {
    if (!category || !description.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["x-user-token"] = token;
      const res = await fetch("/api/user/feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({ category, description: description.trim(), page: window.location.pathname }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Could not send your report. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error — please check your connection and try again.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl p-6 text-center"
          onClick={e => e.stopPropagation()}
          data-testid="feedback-success"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center">
            <CircleCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Thank you!</h2>
          <p className="text-sm text-muted-foreground mb-5">Your feedback helps us make ARYA better for everyone. We'll review it carefully.</p>
          <Button
            data-testid="feedback-button-close"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium py-2.5 rounded-xl"
          >
            Done
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl p-6 relative"
        onClick={e => e.stopPropagation()}
        data-testid="feedback-modal"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" data-testid="feedback-button-close-x">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <MessageCircleWarning className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Report an Issue</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-5">Let us know what's not working or what could be better.</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">What's this about?</label>
            <div className="grid grid-cols-1 gap-2">
              {categories.map(c => (
                <button
                  key={c.value}
                  data-testid={`feedback-category-${c.value}`}
                  onClick={() => setCategory(c.value)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-left transition-all border ${
                    category === c.value
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                      : "bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">Tell us more</label>
            <textarea
              data-testid="feedback-input-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what happened or what you'd like to see..."
              rows={4}
              maxLength={2000}
              className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:border-emerald-300 dark:focus:border-emerald-700 resize-none"
            />
            <div className="text-right text-[10px] text-gray-300 dark:text-gray-600 mt-1">{description.length}/2000</div>
          </div>

          {error && (
            <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2" data-testid="feedback-error">
              {error}
            </div>
          )}

          <Button
            data-testid="feedback-button-submit"
            onClick={handleSubmit}
            disabled={!category || !description.trim() || submitting}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium py-2.5 rounded-xl disabled:opacity-40"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Feedback"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

const TUTORIAL_STEPS = [
  {
    title: "Welcome to ARYA",
    description: "ARYA is your personal thinking and growth assistant — a wise, always-available companion for decisions, goals, reflection, and focus. Let me show you what's here.",
    icon: Sparkles,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700",
    tip: null,
  },
  {
    title: "Your daily home screen",
    description: "Every time you open ARYA you'll see a personalized reflection for the day. When you're signed in, a quick mood check-in appears — it takes 5 seconds and helps ARYA understand how you're feeling.",
    icon: Smile,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300",
    tip: "The mood check-in shapes how ARYA responds to you throughout the day — more caring when you're low, more energizing when you're ready to go",
  },
  {
    title: "Chat, think, and analyze",
    description: "Type any thought, question, or problem and ARYA helps you think it through. You can also tap the purple paperclip to attach images, PDFs, or documents — ARYA reads and explains them.",
    icon: Paperclip,
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/30 border-purple-300",
    tip: "Great for lab reports, offer letters, contracts, or any document you want explained in plain language",
  },
  {
    title: "Talk in your language",
    description: "Tap the green microphone to speak instead of type. ARYA understands 11 Indian languages — Hindi, Tamil, Telugu, Kannada, Malayalam and more. Use the notebook icon in the header to save voice notes.",
    icon: Mic,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700",
    tip: "Long-press the mic for hands-free voice conversation mode — great while commuting or cooking",
  },
  {
    title: "Goals and streaks",
    description: "Just tell ARYA what you want to achieve, in natural conversation. ARYA detects the goal, helps you break it into steps, and tracks your daily streak so you stay consistent.",
    icon: Target,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300",
    tip: "Try: \"I want to wake up at 6am every day\" — ARYA creates and tracks that goal automatically",
  },
  {
    title: "ARYA remembers you",
    description: "ARYA builds a picture of who you are — your goals, values, and what matters most. The more you chat, the more personal and relevant every response becomes. Tap the brain icon anytime to see your memory.",
    icon: Brain,
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/30 border-purple-300",
    tip: "Your memory is private — it shapes how ARYA responds to you but is never shared",
  },
  {
    title: "Your data, your choice",
    description: "ARYA gives you full control over your data under India's DPDP Act 2023. From Privacy & Control in your profile menu, you can delete specific categories (goals, memory, moods), wipe a date range, or do a complete reset — any time, instantly.",
    icon: ShieldCheck,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700",
    tip: "Every deletion is logged (not what was deleted — just that it happened) so you always have a receipt",
  },
  {
    title: "Rehearse hard conversations",
    description: "Use ARYA to practise difficult conversations before they happen — with your boss, a parent, an investor, or anyone else. ARYA plays the other person so you can find the right words in a safe space.",
    icon: MessageSquare,
    iconColor: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700",
    tip: "Try: \"Help me practise telling my manager I need a raise\" — ARYA becomes the manager",
  },
  {
    title: "KAAL — Cosmic Timing",
    description: "KAAL gives you a personalised daily briefing based on your birth details and the current planetary period. It translates ancient timing wisdom into plain, practical language — what today looks like for you, specifically.",
    icon: Star,
    iconColor: "text-amber-500 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300",
    tip: "No astrology knowledge needed — KAAL explains everything in everyday language. Find it in your profile menu",
  },
  {
    title: "Niti — Business Wisdom",
    description: "Niti is your business thinking companion. Bring it your decisions, plans, and people situations — it routes your question to the right philosopher (Chanakya, Vidura, Krishna and others) and stress-tests your thinking. Also tracks live market news and lets you journal your portfolio.",
    icon: Briefcase,
    iconColor: "text-yellow-600 dark:text-yellow-500",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
    tip: "Every Niti response ends with a Socratic question — it helps you think deeper, not just receive an answer",
  },
  {
    title: "Make ARYA yours",
    description: "Customize ARYA's tone, response length, and focus areas. Turn on a morning briefing (your goals + news delivered to you daily), a Sunday review, and switch the app language between English and Hindi.",
    icon: Palette,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700",
    tip: "Profile menu → Customize ARYA — takes 2 minutes and makes a meaningful difference in how useful ARYA feels",
  },
  {
    title: "The ARYA Community",
    description: "You're not alone in this. The ARYA Growth Community is a space where members take weekly challenges together, share their progress, and cheer each other on. Every week, ARYA generates a new challenge based on what the community needs most.",
    icon: Users,
    iconColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700",
    tip: "Visit /community to join as a founding member — free forever for early members",
    link: "/community",
    linkLabel: "Visit the Community →",
  },
  {
    title: "You're ready",
    description: "ARYA works best when you show up every day — even just one question or reflection. Small daily conversations build clarity, habits, and real growth over time. Start whenever you're ready.",
    icon: Zap,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300",
    tip: null,
  },
];

function QuickStartTutorial({ onClose, onStartChat, token }: { onClose: () => void; onStartChat: (text: string) => void; token?: string | null }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const current = TUTORIAL_STEPS[step];
  const Icon = current.icon;
  const isLast = step === TUTORIAL_STEPS.length - 1;
  const isFirst = step === 0;

  const markTutorialComplete = useCallback(() => {
    try { localStorage.setItem("arya_tutorial_done", "true"); } catch {}
    if (token) {
      fetch("/api/user/tutorial-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [token]);

  const handleClose = () => {
    markTutorialComplete();
    onClose();
  };

  const handleStartChat = (text: string) => {
    markTutorialComplete();
    onStartChat(text);
  };

  return (
    <div className="min-h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleClose}>
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl p-6 relative overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid={`tutorial-step-${step}`}
      >
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" data-testid="tutorial-button-close">
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-1.5 mb-6">
          {TUTORIAL_STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-emerald-300 dark:bg-emerald-700" : "bg-gray-100 dark:bg-slate-700"}`} />
          ))}
        </div>

        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", damping: 20 }}
            className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${current.iconBg} border flex items-center justify-center`}
          >
            <Icon className={`w-8 h-8 ${current.iconColor}`} />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{step === 0 ? t("tutorial_welcome") : current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{step === 0 ? t("tutorial_desc") : current.description}</p>
        </div>

        {current.tip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4"
          >
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{current.tip}</p>
            </div>
          </motion.div>
        )}

        {(current as any).link && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-6">
            <a
              href={(current as any).link}
              onClick={handleClose}
              data-testid="tutorial-button-community-link"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-semibold hover:from-cyan-600 hover:to-purple-700 transition-all"
            >
              <Users className="w-4 h-4" />
              {(current as any).linkLabel}
            </a>
          </motion.div>
        )}

        <div className="flex gap-3">
          {!isFirst && (
            <Button
              data-testid="tutorial-button-back"
              onClick={() => setStep(s => s - 1)}
              variant="outline"
              className="flex-1 border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl py-2.5"
            >
              Back
            </Button>
          )}
          {isLast ? (
            <Button
              data-testid="tutorial-button-start-chatting"
              onClick={() => handleStartChat("Hello ARYA! I just finished the tutorial. What can you help me with today?")}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium py-2.5 rounded-xl"
            >
              {t("tutorial_start")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              data-testid="tutorial-button-next"
              onClick={() => setStep(s => s + 1)}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium py-2.5 rounded-xl"
            >
              {isFirst ? t("tutorial_show_me") : t("tutorial_next")} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {isFirst && (
          <button
            data-testid="tutorial-button-skip"
            onClick={handleClose}
            className="w-full text-xs text-muted-foreground hover:text-gray-900 dark:hover:text-white py-2 mt-2"
          >
            {t("tutorial_skip")}
          </button>
        )}
      </motion.div>
    </div>
  );
}

function OnboardingModal({ token, onComplete }: { token: string; onComplete: () => void }) {
  const { t: tl } = useLanguage();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState("en");
  const [currentWork, setCurrentWork] = useState("");
  const [dailyReminderTime, setDailyReminderTime] = useState("08:00");
  const [voicePreference, setVoicePreference] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({ preferredLanguage: language, currentWork, wantsDailyReminder: !!dailyReminderTime, voiceEnabled: voicePreference }),
      });
      if (res.ok) onComplete();
    } catch { /* silent */ }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl p-6 relative overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex gap-1.5 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-emerald-300 dark:bg-emerald-700" : "bg-gray-100 dark:bg-slate-700"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5" data-testid="onboarding-step-welcome">
            <div className="text-center">
              <div className="mb-4 flex flex-col items-center gap-2">
                <span
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "3rem",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    lineHeight: 1,
                    display: "block",
                    color: "#047857",
                  }}
                >
                  ARYA
                </span>
                <span className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, #6ee7b7, #059669)" }} />
                  <span className="w-2 h-2 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, #34d399, #047857)" }} />
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: "radial-gradient(circle at 40% 40%, #6ee7b7, #059669)" }} />
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tl("tutorial_welcome")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Let me get to know you a little so I can be more helpful. This takes less than a minute.
              </p>
            </div>
            <Button
              data-testid="onboarding-button-start"
              onClick={() => setStep(1)}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium py-2.5 rounded-xl"
            >
              Let's Go <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <button onClick={onComplete} className="w-full text-xs text-muted-foreground hover:text-gray-900 dark:hover:text-white py-1" data-testid="onboarding-button-skip">
              Skip for now
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4" data-testid="onboarding-step-language">
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Language</h3>
              </div>
              <p className="text-xs text-muted-foreground">Which language do you prefer? ARYA speaks 11 Indian languages.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  data-testid={`onboarding-lang-${l.code}`}
                  onClick={() => setLanguage(l.code)}
                  className={`px-3 py-2.5 rounded-xl text-sm text-left transition-all border ${language === l.code ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <Button
              data-testid="onboarding-button-next-1"
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium py-2.5 rounded-xl"
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4" data-testid="onboarding-step-work">
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">What do you do?</h3>
              </div>
              <p className="text-xs text-muted-foreground">This helps ARYA give you more relevant advice and suggestions.</p>
            </div>
            <input
              data-testid="onboarding-input-work"
              type="text"
              placeholder="e.g. Student, Doctor, Business Owner, Engineer..."
              value={currentWork}
              onChange={e => setCurrentWork(e.target.value)}
              className="w-full bg-background/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm px-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-4 py-2.5 text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700">Back</button>
              <Button
                data-testid="onboarding-button-next-2"
                onClick={() => setStep(3)}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium py-2.5 rounded-xl"
              >
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4" data-testid="onboarding-step-preferences">
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Preferences</h3>
              </div>
              <p className="text-xs text-muted-foreground">Set your daily check-in time and voice preference.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Daily reminder time</label>
                <input
                  data-testid="onboarding-input-reminder"
                  type="time"
                  value={dailyReminderTime}
                  onChange={e => setDailyReminderTime(e.target.value)}
                  className="w-full bg-background/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Voice responses</label>
                <div className="flex gap-2">
                  <button
                    data-testid="onboarding-voice-on"
                    onClick={() => setVoicePreference(true)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm transition-all border flex items-center justify-center gap-2 ${voicePreference ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                  >
                    <Volume2 className="w-4 h-4" /> Voice On
                  </button>
                  <button
                    data-testid="onboarding-voice-off"
                    onClick={() => setVoicePreference(false)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm transition-all border flex items-center justify-center gap-2 ${!voicePreference ? "bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400" : "bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                  >
                    <VolumeX className="w-4 h-4" /> Text Only
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="px-4 py-2.5 text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700">Back</button>
              <Button
                data-testid="onboarding-button-finish"
                onClick={handleComplete}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium py-2.5 rounded-xl"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Start Using ARYA <Check className="w-4 h-4 ml-2" /></>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
