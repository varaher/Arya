import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUserAuth } from "@/lib/user-auth";
import { useLocation } from "wouter";
import {
  Send,
  Mic,
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
} from "lucide-react";
import { useTheme } from "@/lib/theme";

function FormattedMessage({ content, isUser }: { content: string; isUser?: boolean }) {
  if (isUser) {
    return <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>;
  }
  return (
    <div className="prose-arya text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 text-gray-800 dark:text-gray-100">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-cyan-600 dark:text-cyan-400">{children}</strong>,
          em: ({ children }) => <em className="text-amber-600/90 dark:text-amber-400/90 not-italic font-medium">{children}</em>,
          h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 dark:text-white mb-2 mt-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0 pb-1 border-b border-gray-200 dark:border-slate-700">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-cyan-600 dark:text-cyan-400 mb-1.5 mt-2 first:mt-0">{children}</h3>,
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
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 border border-cyan-300 dark:border-cyan-700 flex items-center justify-center text-[10px] font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
                  {num}
                </span>
                <span className="flex-1">{children}</span>
              </li>
            ) : (
              <li className="flex gap-2 items-start text-gray-800 dark:text-gray-100 list-none">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5" />
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
            <blockquote className="border-l-2 border-cyan-300 dark:border-cyan-700 pl-3 my-2 text-gray-600 dark:text-gray-300 italic">{children}</blockquote>
          ),
          hr: () => <hr className="border-gray-200 dark:border-slate-700 my-3" />,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-600 dark:text-cyan-400 underline underline-offset-2 hover:text-cyan-600 dark:hover:text-cyan-400">{children}</a>
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
];

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
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400/70 font-medium">
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
            className="flex-1 text-xs bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700"
            onKeyDown={(e) => e.key === 'Enter' && submitCorrection()}
          />
          <button onClick={submitCorrection} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-cyan-600 dark:text-cyan-400">
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

function MemoryPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<{ memories: MemoryItem[]; total: number }>({
    queryKey: ["/api/arya/memory"],
    queryFn: async () => {
      const res = await fetch("/api/arya/memory?tenant_id=varah");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/arya/memory/${id}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/arya/memory"] }),
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
          <span className="text-sm font-semibold text-gray-900 dark:text-white">ARYA's Memory</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">{memories.length}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading && <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-purple-600 dark:text-purple-400" /></div>}
        {!isLoading && memories.length === 0 && (
          <div className="text-center py-8">
            <Brain className="w-8 h-8 text-gray-900 dark:text-white/10 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No memories yet</p>
            <p className="text-xs text-gray-200 mt-1">Chat with ARYA to build memory</p>
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
    </div>
  );
}

function CustomizePanel({ onClose, token }: { onClose: () => void; token: string }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: prefs, isLoading } = useQuery<{
    responseStyle: string;
    responseTone: string;
    focusAreas: string[] | null;
    wisdomQuotes: string;
  }>({
    queryKey: ["/api/user/preferences"],
    queryFn: async () => {
      const res = await fetch("/api/user/preferences", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
  });

  const [style, setStyle] = useState("balanced");
  const [tone, setTone] = useState("friendly");
  const [focus, setFocus] = useState<string[]>([]);
  const [wisdom, setWisdom] = useState("sometimes");

  useEffect(() => {
    if (prefs) {
      setStyle(prefs.responseStyle || "balanced");
      setTone(prefs.responseTone || "friendly");
      setFocus(prefs.focusAreas || []);
      setWisdom(prefs.wisdomQuotes || "sometimes");
    }
  }, [prefs]);

  const savePrefs = async () => {
    setSaving(true);
    try {
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ responseStyle: style, responseTone: tone, focusAreas: focus, wisdomQuotes: wisdom }),
      });
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
    { value: "concise", label: "Short & Sweet", desc: "Quick, to-the-point answers" },
    { value: "balanced", label: "Balanced", desc: "Thorough but focused" },
    { value: "detailed", label: "In-Depth", desc: "Comprehensive with examples" },
  ];
  const toneOptions = [
    { value: "motivating", label: "Motivating", icon: "🔥" },
    { value: "gentle", label: "Gentle", icon: "🌿" },
    { value: "direct", label: "Direct", icon: "🎯" },
    { value: "friendly", label: "Friendly", icon: "😊" },
  ];
  const focusOptions = [
    { value: "career", label: "Career", icon: "💼" },
    { value: "health", label: "Health", icon: "🏥" },
    { value: "spirituality", label: "Spirituality", icon: "🧘" },
    { value: "finance", label: "Finance", icon: "💰" },
    { value: "relationships", label: "Relationships", icon: "❤️" },
    { value: "learning", label: "Learning", icon: "📚" },
    { value: "creativity", label: "Creativity", icon: "🎨" },
    { value: "fitness", label: "Fitness", icon: "💪" },
  ];
  const wisdomOptions = [
    { value: "always", label: "Always", desc: "Wisdom in every response" },
    { value: "sometimes", label: "Sometimes", desc: "When it adds value" },
    { value: "never", label: "Never", desc: "Keep it purely practical" },
  ];

  return (
    <div className="w-80 sm:w-96 h-full bg-white dark:bg-slate-900 backdrop-blur-xl border-l border-gray-200 dark:border-slate-700 flex flex-col" data-testid="panel-customize">
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Customize ARYA</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400" data-testid="button-close-customize">
          <X className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-cyan-600 dark:text-cyan-400" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="text-[11px] text-gray-400 leading-relaxed">
            Personalize how ARYA responds to you. Changes take effect in your next conversation.
          </div>

          <div>
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Response Length</div>
            <div className="space-y-1.5">
              {styleOptions.map(opt => (
                <button
                  key={opt.value}
                  data-testid={`option-style-${opt.value}`}
                  onClick={() => setStyle(opt.value)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all ${
                    style === opt.value
                      ? "bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400"
                      : "bg-gray-100 dark:bg-slate-700 border border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    style === opt.value ? "border-cyan-400 bg-cyan-400" : "border-gray-200 dark:border-slate-700"
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
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Conversation Tone</div>
            <div className="grid grid-cols-2 gap-1.5">
              {toneOptions.map(opt => (
                <button
                  key={opt.value}
                  data-testid={`option-tone-${opt.value}`}
                  onClick={() => setTone(opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    tone === opt.value
                      ? "bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400"
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
            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Focus Areas</div>
            <div className="text-[10px] text-gray-300 dark:text-gray-600 mb-2">Pick up to 4 topics ARYA will relate advice to</div>
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
                      ? "bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400"
                      : "bg-gray-100 dark:bg-slate-700 border border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                    wisdom === opt.value ? "border-cyan-400 bg-cyan-400" : "border-gray-200 dark:border-slate-700"
                  }`} />
                  <div>
                    <div className="text-xs font-medium">{opt.label}</div>
                    <div className="text-[10px] text-gray-400">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            data-testid="button-save-preferences"
            onClick={savePrefs}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400 text-xs font-semibold hover:from-cyan-500/30 hover:to-cyan-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Preferences"}
          </button>
        </div>
      )}
    </div>
  );
}

function GoalsPanel({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalSteps, setNewGoalSteps] = useState("");

  const { data, isLoading } = useQuery<{ goals: GoalItem[] }>({
    queryKey: ["/api/arya/goals"],
    queryFn: async () => {
      const res = await fetch("/api/arya/goals?tenant_id=varah");
      return res.json();
    },
  });

  const createGoalMutation = useMutation({
    mutationFn: async () => {
      const steps = newGoalSteps.split("\n").map(s => s.trim()).filter(Boolean);
      const res = await fetch("/api/arya/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: "varah", title: newGoalTitle, steps }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/arya/goals"] });
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/arya/goals"] }),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      await fetch(`/api/arya/goals/${goalId}`, { method: "DELETE" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/arya/goals"] }),
  });

  const goals = data?.goals || [];
  const priorityColors: Record<string, string> = {
    low: "text-gray-400", medium: "text-blue-400", high: "text-amber-600 dark:text-amber-400", critical: "text-red-500 dark:text-red-400"
  };

  return (
    <div className="w-80 h-full bg-white dark:bg-slate-900 backdrop-blur-xl border-l border-gray-200 dark:border-slate-700 flex flex-col" data-testid="panel-goals">
      <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">Goals & Plans</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">{goals.filter(g => g.status === 'active').length}</span>
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
        {goals.map((goal) => (
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
        {!isLoading && goals.length === 0 && (
          <div className="text-center py-8">
            <Target className="w-8 h-8 text-gray-900 dark:text-white/10 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No goals yet</p>
            <p className="text-xs text-gray-200 mt-1">Set goals and track progress</p>
          </div>
        )}
      </div>
    </div>
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
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-200 dark:border-purple-800"
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
                className={`px-3 py-2 text-xs border-b border-gray-100 dark:border-slate-700 last:border-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 ${!n.isRead ? 'bg-cyan-50 dark:bg-cyan-900/20' : ''}`}
                onClick={() => { if (!n.isRead) markRead(n.id); }}
              >
                <div className="font-medium text-gray-700 dark:text-gray-200">{n.title}</div>
                <div className="text-gray-400 mt-0.5">{n.message}</div>
                <div className="text-gray-200 mt-1 text-[10px]">
                  {new Date(n.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))
          )}
        </div>
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
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const [activeConversation, setActiveConversation] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(() => {
    try { return localStorage.getItem("arya_speaker") === "true"; } catch { return false; }
  });
  const [responseMode, setResponseMode] = useState<"instant" | "thinking" | null>(null);
  const [responseModeIcon, setResponseModeIcon] = useState<string | null>(null);
  const [responseConfidence, setResponseConfidence] = useState<number | undefined>();
  const [responseSourcesCount, setResponseSourcesCount] = useState<number | undefined>();
  const [responseMemoryUsed, setResponseMemoryUsed] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showConfidence, setShowConfidence] = useState(true);
  const [betaRestricted, setBetaRestricted] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/arya/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/arya/conversations");
      return res.json();
    },
  });

  const { data: conversationData } = useQuery<{ messages: Message[] }>({
    queryKey: ["/api/arya/conversations", activeConversation],
    queryFn: async () => {
      if (!activeConversation) return { messages: [] };
      const res = await fetch(`/api/arya/conversations/${activeConversation}`);
      return res.json();
    },
    enabled: !!activeConversation,
  });

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
      const res = await fetch("/api/arya/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      await fetch(`/api/arya/conversations/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      if (activeConversation) {
        setActiveConversation(null);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
    },
  });

  useEffect(() => {
    if (isLoggedIn && user && user.onboardingComplete === false) {
      setShowOnboarding(true);
    }
  }, [isLoggedIn, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLanguageMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const playAudioBase64 = useCallback((base64Audio: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
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
      audio.play();
    } catch (err) {
      console.error("Audio playback error:", err);
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
      if (data.audio) {
        playAudioBase64(data.audio);
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
    setShowSidebar(false);
    setResponseConfidence(undefined);
    setResponseSourcesCount(undefined);
    setResponseMemoryUsed(false);

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
        body: JSON.stringify({ content: text, tenant_id: "varah" }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Something went wrong" }));
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
              if (speakerOnRef.current && fullContent) {
                speakText(fullContent);
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
      queryClient.invalidateQueries({
        queryKey: ["/api/arya/conversations", convId],
      });
    }
  }, [activeConversation, isStreaming, queryClient, createConversation, speakText]);

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
  }, []);

  const stopRecording = useCallback(async () => {
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
      e.preventDefault();
      sendMessage(input);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentLang = DEFAULT_LANGUAGES.find(l => l.code === selectedLanguage);

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] gap-0 md:gap-4 relative" data-testid="page-arya-chat">
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
            <MessageSquare className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Chat History</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 ml-auto">
              {conversations.length}
            </span>
          </div>
          <Button
            data-testid="button-new-chat"
            onClick={() => {
              createConversation.mutate("New Chat");
              setShowSidebar(false);
            }}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-300/30 dark:shadow-cyan-500/20"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="px-2 py-2 border-b border-gray-100 dark:border-slate-700 flex gap-1">
          <button
            data-testid="button-toggle-memory"
            onClick={() => { setShowMemory(!showMemory); setShowGoals(false); }}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              showMemory ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Brain className="w-3 h-3" />
            Memory
          </button>
          <button
            data-testid="button-toggle-goals"
            onClick={() => { setShowGoals(!showGoals); setShowMemory(false); }}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              showGoals ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
          >
            <Target className="w-3 h-3" />
            Goals
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 px-2 py-2" data-testid="list-conversations">
          {conversations.map((conv) => {
            const date = new Date(conv.createdAt);
            const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
                    ? "bg-gradient-to-r from-cyan-500/15 to-transparent border border-cyan-300 dark:border-cyan-700 text-gray-900 dark:text-white"
                    : "hover:bg-gray-100 dark:hover:bg-slate-700 text-muted-foreground hover:text-gray-900 dark:hover:text-white border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  activeConversation === conv.id
                    ? "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400"
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
              <p className="text-muted-foreground text-sm">No conversations yet</p>
              <p className="text-gray-300 dark:text-gray-600 text-xs mt-1">Start chatting with ARYA!</p>
            </div>
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
            {showSidebar ? <PanelLeftClose className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /> : <PanelLeftOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />}
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">History</span>
            {conversations.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 font-medium">
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
              onClick={() => { setShowGoals(!showGoals); setShowMemory(false); }}
              className={`p-1.5 rounded-lg transition-all ${showGoals ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'text-gray-400 hover:text-gray-500 dark:hover:text-gray-400'}`}
            >
              <Target className="w-4 h-4" />
            </button>
            <button
              data-testid="button-new-chat-mobile"
              onClick={() => createConversation.mutate("New Chat")}
              className="p-1.5 rounded-lg bg-primary/20 border border-primary/30 hover:bg-primary/30 transition-all"
            >
              <Plus className="w-4 h-4 text-primary" />
            </button>
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
                  className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border border-cyan-300 dark:border-cyan-700 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all"
                >
                  <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </button>
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
                        data-testid="button-my-goals"
                        onClick={() => { setShowUserMenu(false); setLocation("/my-goals"); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Target className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> My Goals
                      </button>
                      <button
                        data-testid="button-customize-arya"
                        onClick={() => { setShowUserMenu(false); setShowCustomize(true); setShowMemory(false); setShowGoals(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Palette className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" /> Customize ARYA
                      </button>
                      <button
                        data-testid="button-quick-tutorial"
                        onClick={() => { setShowUserMenu(false); setShowTutorial(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Quick Tutorial
                      </button>
                      <button
                        data-testid="button-report-issue"
                        onClick={() => { setShowUserMenu(false); setShowFeedbackModal(true); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <MessageCircleWarning className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" /> Report Issue
                      </button>
                      <button
                        data-testid="button-user-logout"
                        onClick={() => { setShowUserMenu(false); userLogout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
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
              <MemoryPanel onClose={() => setShowMemory(false)} />
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
        </AnimatePresence>

        {insights.length > 0 && !activeConversation && (
          <InsightsCard insights={insights} onDismiss={(id) => dismissInsightMutation.mutate(id)} />
        )}

        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 md:py-4 space-y-3 md:space-y-4" data-testid="list-messages">
          {!activeConversation && messages.length === 0 && !streamingContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <motion.div
                className="rounded-2xl overflow-hidden bg-slate-900 p-4 mb-4 md:mb-6"
                data-testid="img-arya-logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <img
                  src="/arya-logo-transparent.png"
                  alt="ARYA"
                  className="w-40 md:w-56"
                />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-[10px] uppercase tracking-widest font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3"
              >
                Your Personal Thinking & Growth Assistant
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="text-muted-foreground max-w-md mb-6 md:mb-8 text-sm md:text-base"
              >
                Think clearly. Set goals. Stay disciplined. Reflect daily. Grow spiritually & professionally. I'm here to help you become your best self.
              </motion.p>
              <div className="flex items-center gap-2 mb-4">
                {!isLoggedIn && (
                  <button
                    data-testid="button-welcome-signin"
                    onClick={() => setShowUserAuth(true)}
                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all flex items-center gap-1.5"
                  >
                    <LogIn className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    Sign in to track goals
                  </button>
                )}
                <button
                  data-testid="button-welcome-tutorial"
                  onClick={() => setShowTutorial(true)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-amber-300 transition-all flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  Take a Tour
                </button>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-w-lg w-full"
              >
                {[
                  { text: "Help me think through a tough decision I'm facing", badge: "Think", icon: "🧠" },
                  { text: "I want to build a daily reading habit — help me set a goal", badge: "Goals", icon: "🎯" },
                  { text: "Give me a morning reflection to start my day with clarity", badge: "Reflect", icon: "🌅" },
                  { text: "How can I stay calm and focused when things get stressful?", badge: "Wisdom", icon: "🧘" },
                ].map((suggestion, i) => (
                  <motion.button
                    key={i}
                    data-testid={`button-suggestion-${i}`}
                    onClick={() => sendMessage(suggestion.text)}
                    className="text-left px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white hover:border-primary/40 hover:bg-white/90 dark:bg-slate-900/90 transition-all group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-cyan-600 dark:text-cyan-400/60 group-hover:text-cyan-600 dark:hover:text-cyan-400 mb-1 flex items-center gap-1">
                      <span>{suggestion.icon}</span> {suggestion.badge}
                    </span>
                    <span className="block text-xs mt-0.5">{suggestion.text}</span>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          )}

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
                    <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
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
                  ? "bg-gradient-to-br from-amber-500/10 to-cyan-500/10 border border-amber-200 dark:border-amber-800"
                  : "bg-white/90 dark:bg-slate-900/90 border border-gray-200 dark:border-slate-700"
              } text-gray-800 dark:text-gray-100`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                    ARYA
                  </span>
                  {responseMode === "instant" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">
                      Instant
                    </span>
                  )}
                  {showConfidence && responseMode === "thinking" && (
                    <ConfidenceBadge confidence={responseConfidence} sourcesCount={responseSourcesCount} memoryUsed={responseMemoryUsed} />
                  )}
                </div>
                <div className="relative">
                  <FormattedMessage content={streamingContent} />
                  <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 align-middle" />
                </div>
                {translatedContent && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">{currentLang?.native || selectedLanguage}</span>
                    </div>
                    <div className="text-gray-700 dark:text-gray-200">
                      <FormattedMessage content={translatedContent} />
                    </div>
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
                  <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
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
              <div className="relative" ref={langMenuRef}>
                <Button
                  data-testid="button-language-select"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className={`flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 ${
                    selectedLanguage !== "en-IN"
                      ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                      : "text-muted-foreground hover:text-gray-900 dark:hover:text-white hover:bg-card"
                  }`}
                  title={`Voice language: ${currentLang?.name || "English"}`}
                >
                  <Globe className="w-4 h-4" />
                </Button>
                {showLanguageMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 bg-card border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-slate-700">
                      <p className="text-xs font-medium text-muted-foreground">Voice Language</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto py-1">
                      {DEFAULT_LANGUAGES.map((lang) => (
                        <button
                          key={lang.code}
                          data-testid={`button-lang-${lang.code}`}
                          onClick={() => {
                            setSelectedLanguage(lang.code);
                            setShowLanguageMenu(false);
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
                title={speakerOn ? "ARYA will speak responses (tap to mute)" : "Tap to make ARYA speak responses"}
              >
                {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>

              <Button
                data-testid="button-voice"
                variant="ghost"
                size="icon"
                onClick={() => setShowVoiceMode(true)}
                disabled={isStreaming}
                className="flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 text-cyan-600 dark:text-cyan-400 hover:from-cyan-500/30 hover:to-cyan-600/20 border border-cyan-200 dark:border-cyan-800"
                title="Start voice conversation"
              >
                <Mic className="w-5 h-5" />
              </Button>

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
                    Recording{selectedLanguage !== "en-IN" ? ` in ${currentLang?.name}` : ""}... tap stop when done
                  </span>
                </div>
              ) : (
                <textarea
                  ref={inputRef}
                  data-testid="input-chat"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask ARYA anything..."
                  disabled={isStreaming}
                  rows={1}
                  className="flex-1 resize-none bg-transparent border-0 text-gray-900 dark:text-white placeholder:text-muted-foreground text-sm focus:outline-none py-2 max-h-32"
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
              )}

              <Button
                data-testid="button-send"
                variant="ghost"
                size="icon"
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isStreaming || isRecording}
                className="flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 text-primary hover:bg-primary/10 disabled:opacity-30"
              >
                {isStreaming ? (
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
          <div className="flex items-center justify-center gap-2 mt-1.5 md:mt-2">
            {selectedLanguage !== "en-IN" && (
              <span className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400/80 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                Voice: {currentLang?.native}
              </span>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground text-center flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400/50" />
              ARYA — Think clearly. Set goals. Grow daily.
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
              className="bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-800 rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl"
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
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-cyan-200 dark:border-cyan-800 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 mb-3 font-mono tracking-wider"
                data-testid="input-invite-code"
                onKeyDown={(e) => e.key === "Enter" && handleRedeemInvite()}
              />
              {inviteError && <p className="text-red-500 dark:text-red-400 text-sm mb-3" data-testid="text-invite-error">{inviteError}</p>}
              <button
                onClick={handleRedeemInvite}
                disabled={inviteLoading || !inviteCode.trim()}
                className="w-full py-3 bg-cyan-50 dark:bg-cyan-900/200 hover:bg-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-black font-semibold rounded-lg transition-colors"
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
      const SILENCE_THRESHOLD = 12;
      const SILENCE_DURATION_MS = 1500;

      const checkAudio = () => {
        if (!activeRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        setAudioLevel(Math.min(avg / 60, 1));

        if (avg > SILENCE_THRESHOLD) {
          hasSpoken = true;
          lastSpeechTime = Date.now();
        }

        if (hasSpoken && (Date.now() - lastSpeechTime) > SILENCE_DURATION_MS) {
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

    if (blob.size < 1000) {
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
            if (event.type === "done") {
              setConversationLog(prev => [...prev, { role: "assistant", text: fullContent }]);
              queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations"] });
              if (convId) {
                queryClient.invalidateQueries({ queryKey: ["/api/arya/conversations", convId] });
              }
            }
          } catch {}
        }
      }

      if (!activeRef.current || abortController.signal.aborted) { processingRef.current = false; return; }
      setPhase("speaking");

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

      startVoiceMonitor(interruptAndListen);

      if (responseAudioBase64 && !voiceInterrupted) {
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
              await playAudioAndWait(ttsData.audioBase64);
            }
          }
        }
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
      const VOICE_THRESHOLD = 30;
      let consecutiveFrames = 0;
      const FRAMES_NEEDED = 10;
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
        <div className="absolute left-1/2 -translate-x-1/2 w-9 h-9 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center p-1">
          <img src="/arya-logo-transparent.png" alt="ARYA" className="w-7 h-7 object-contain" />
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
                className="absolute inset-0 rounded-full border border-cyan-400/20 transition-transform duration-200"
                style={{ transform: `scale(${orbScale + 0.5})` }}
              />
              <div
                className="absolute inset-0 rounded-full border border-cyan-400/10 transition-transform duration-300"
                style={{ transform: `scale(${orbScale + 0.9})` }}
              />
            </>
          )}

          {phase === "processing" && (
            <div className="absolute inset-0 rounded-full">
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-amber-400/60 border-r-cyan-400/40 animate-spin" style={{ animationDuration: "1.5s" }} />
              <div className="absolute inset-5 rounded-full border border-transparent border-b-amber-400/30 border-l-cyan-400/20 animate-spin" style={{ animationDuration: "2.5s", animationDirection: "reverse" }} />
            </div>
          )}

          {phase === "speaking" && (
            <>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/5 to-green-500/5 animate-pulse" style={{ animationDuration: "2s" }} />
              <div className="absolute inset-4 rounded-full border border-green-400/15 animate-pulse" style={{ animationDuration: "1.5s" }} />
            </>
          )}

          <div className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
            phase === "listening"
              ? "bg-gradient-to-br from-cyan-500/20 to-blue-600/20 shadow-[0_0_60px_rgba(6,182,212,0.15)]"
              : phase === "processing"
              ? "bg-gradient-to-br from-amber-500/15 to-orange-500/15"
              : phase === "speaking"
              ? "bg-gradient-to-br from-green-500/15 to-cyan-500/15 shadow-[0_0_40px_rgba(34,197,94,0.1)]"
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
            {conversationLog.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-cyan-100 dark:bg-cyan-900/30 text-gray-800 dark:text-gray-100 rounded-br-sm"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-bl-sm"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {transcript && phase === "processing" && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm bg-cyan-100 dark:bg-cyan-900/30 text-gray-800 dark:text-gray-100 rounded-br-sm">{transcript}</div>
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
  const { login, signup } = useUserAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [signupInviteCode, setSignupInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [isBeta, setIsBeta] = useState(false);

  useEffect(() => {
    fetch("/api/beta/status").then(r => r.json()).then(d => setIsBeta(d.betaMode)).catch(() => {});
  }, []);

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
        const r = await signup({ name: name.trim(), phone, password, inviteCode: signupInviteCode || undefined });
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
          <div className="w-32 mx-auto mb-3 rounded-xl overflow-hidden bg-slate-900 p-2">
            <img src="/arya-logo-transparent.png" alt="ARYA" className="w-full" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{mode === "login" ? "Welcome Back" : "Join ARYA"}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {mode === "login" ? "Sign in to track your goals" : "Create account to set goals & track progress"}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              data-testid="modal-input-name"
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-background/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              autoFocus
            />
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
          {mode === "signup" && isBeta && (
            <input
              data-testid="modal-input-invite-code"
              type="text"
              placeholder="Invite Code (required)"
              value={signupInviteCode}
              onChange={e => setSignupInviteCode(e.target.value.toUpperCase())}
              className="w-full bg-background/50 border border-amber-200 dark:border-amber-800 rounded-xl text-gray-900 dark:text-white text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-amber-400/50 font-mono tracking-wider"
              required
            />
          )}
          {error && <div className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2" data-testid="modal-text-error">{error}</div>}
          <Button
            data-testid="modal-button-submit"
            type="submit"
            disabled={loading || !phone || !password}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium py-2.5 rounded-xl"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>
        <div className="text-center mt-3">
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="text-xs text-muted-foreground hover:text-gray-900 dark:hover:text-white">
            {mode === "login" ? <>New here? <span className="text-cyan-600 dark:text-cyan-400">Create account</span></> : <>Have an account? <span className="text-cyan-600 dark:text-cyan-400">Sign in</span></>}
          </button>
        </div>
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
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      await fetch("/api/user/feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({ category, description: description.trim(), page: window.location.pathname }),
      });
      setSubmitted(true);
    } catch {}
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
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium py-2.5 rounded-xl"
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
                      ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-500/40 text-cyan-600 dark:text-cyan-400"
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
              className="w-full bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700 resize-none"
            />
            <div className="text-right text-[10px] text-gray-300 dark:text-gray-600 mt-1">{description.length}/2000</div>
          </div>

          <Button
            data-testid="feedback-button-submit"
            onClick={handleSubmit}
            disabled={!category || !description.trim() || submitting}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium py-2.5 rounded-xl disabled:opacity-40"
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
    description: "ARYA is your personal thinking and growth assistant. Let me show you around so you can get the most out of it.",
    icon: Sparkles,
    iconColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700",
    tip: null,
  },
  {
    title: "Chat with ARYA",
    description: "Just type or speak your thoughts. ARYA helps you think through decisions, set goals, reflect on your day, and find clarity.",
    icon: MessageSquare,
    iconColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700",
    tip: "Try asking: \"Help me think through a career change I'm considering\"",
  },
  {
    title: "Talk using your voice",
    description: "Tap the microphone button to speak in your preferred language. ARYA understands 11 Indian languages including Hindi, Tamil, Telugu, and more.",
    icon: Mic,
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/30 border-purple-300",
    tip: "Long-press the mic for hands-free voice conversation mode",
  },
  {
    title: "Set goals and stay on track",
    description: "ARYA can detect goals from your conversations and help you break them into steps. Track your progress, build streaks, and stay disciplined.",
    icon: Target,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300",
    tip: "Try saying: \"I want to read for 30 minutes every day\"",
  },
  {
    title: "ARYA remembers you",
    description: "The more you chat, the better ARYA understands you. It remembers your preferences, context, and what matters to you — like a wise friend who truly listens.",
    icon: Brain,
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-100 dark:bg-purple-900/30 border-purple-300",
    tip: "Tap the brain icon to see what ARYA remembers about you",
  },
  {
    title: "Make ARYA yours",
    description: "Customize how ARYA responds — choose your tone, response length, focus areas, and more from the Customize option in your menu.",
    icon: Palette,
    iconColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700",
    tip: "Go to your profile menu → Customize ARYA",
  },
  {
    title: "You're all set!",
    description: "You're ready to start your journey with ARYA. Think clearly, set goals, stay disciplined, and grow every day.",
    icon: Zap,
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300",
    tip: null,
  },
];

function QuickStartTutorial({ onClose, onStartChat, token }: { onClose: () => void; onStartChat: (text: string) => void; token?: string | null }) {
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
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? "bg-cyan-50 dark:bg-cyan-900/200" : "bg-gray-100 dark:bg-slate-700"}`} />
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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{current.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
        </div>

        {current.tip && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-6"
          >
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{current.tip}</p>
            </div>
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
              className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium py-2.5 rounded-xl"
            >
              Start Chatting <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              data-testid="tutorial-button-next"
              onClick={() => setStep(s => s + 1)}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium py-2.5 rounded-xl"
            >
              {isFirst ? "Show Me Around" : "Next"} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {isFirst && (
          <button
            data-testid="tutorial-button-skip"
            onClick={handleClose}
            className="w-full text-xs text-muted-foreground hover:text-gray-900 dark:hover:text-white py-2 mt-2"
          >
            Skip tutorial
          </button>
        )}
      </motion.div>
    </div>
  );
}

function OnboardingModal({ token, onComplete }: { token: string; onComplete: () => void }) {
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
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-cyan-50 dark:bg-cyan-900/200" : "bg-gray-100 dark:bg-slate-700"}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-5" data-testid="onboarding-step-welcome">
            <div className="text-center">
              <div className="w-28 mx-auto mb-4 rounded-xl overflow-hidden bg-slate-900 p-2">
                <img src="/arya-logo-transparent.png" alt="ARYA" className="w-full" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Welcome to ARYA</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Let me get to know you a little so I can be more helpful. This takes less than a minute.
              </p>
            </div>
            <Button
              data-testid="onboarding-button-start"
              onClick={() => setStep(1)}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium py-2.5 rounded-xl"
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
                <Globe className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
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
                  className={`px-3 py-2.5 rounded-xl text-sm text-left transition-all border ${language === l.code ? "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400" : "bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <Button
              data-testid="onboarding-button-next-1"
              onClick={() => setStep(2)}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium py-2.5 rounded-xl"
            >
              Next <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4" data-testid="onboarding-step-work">
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
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
              className="w-full bg-background/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm px-4 py-3 placeholder:text-muted-foreground focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="px-4 py-2.5 text-sm text-muted-foreground hover:text-gray-900 dark:hover:text-white rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700">Back</button>
              <Button
                data-testid="onboarding-button-next-2"
                onClick={() => setStep(3)}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium py-2.5 rounded-xl"
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
                <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
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
                  className="w-full bg-background/50 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white text-sm px-4 py-3 focus:outline-none focus:border-cyan-300 dark:focus:border-cyan-700"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Voice responses</label>
                <div className="flex gap-2">
                  <button
                    data-testid="onboarding-voice-on"
                    onClick={() => setVoicePreference(true)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm transition-all border flex items-center justify-center gap-2 ${voicePreference ? "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400" : "bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
                  >
                    <Volume2 className="w-4 h-4" /> Voice On
                  </button>
                  <button
                    data-testid="onboarding-voice-off"
                    onClick={() => setVoicePreference(false)}
                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm transition-all border flex items-center justify-center gap-2 ${!voicePreference ? "bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400" : "bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"}`}
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
                className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-medium py-2.5 rounded-xl"
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
