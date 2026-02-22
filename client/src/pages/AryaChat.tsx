import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
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
} from "lucide-react";

function FormattedMessage({ content, isUser }: { content: string; isUser?: boolean }) {
  if (isUser) {
    return <div className="text-sm leading-relaxed whitespace-pre-wrap">{content}</div>;
  }
  return (
    <div className="prose-arya text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 text-white/90">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-cyan-300">{children}</strong>,
          em: ({ children }) => <em className="text-amber-300/90 not-italic font-medium">{children}</em>,
          h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2 mt-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold text-white mb-2 mt-3 first:mt-0 pb-1 border-b border-white/10">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-cyan-300 mb-1.5 mt-2 first:mt-0">{children}</h3>,
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
              <li className="flex gap-2.5 items-start text-white/90 list-none">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-[10px] font-bold text-cyan-300 mt-0.5">
                  {num}
                </span>
                <span className="flex-1">{children}</span>
              </li>
            ) : (
              <li className="flex gap-2 items-start text-white/90 list-none">
                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5" />
                <span className="flex-1">{children}</span>
              </li>
            );
          },
          code: ({ children, className }) => {
            const isBlock = className?.includes("language-");
            return isBlock ? (
              <pre className="bg-black/40 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto">
                <code className="text-xs font-mono text-emerald-300">{children}</code>
              </pre>
            ) : (
              <code className="bg-white/10 text-amber-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cyan-500/50 pl-3 my-2 text-white/70 italic">{children}</blockquote>
          ),
          hr: () => <hr className="border-white/10 my-3" />,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300">{children}</a>
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
    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/20"
    : pct >= 50
    ? "bg-amber-500/20 text-amber-300 border-amber-500/20"
    : "bg-red-500/20 text-red-300 border-red-500/20";
  return (
    <div className="flex items-center gap-1.5">
      {memoryUsed && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium border border-purple-500/20 flex items-center gap-0.5">
          <Brain className="w-2.5 h-2.5" />
          Memory
        </span>
      )}
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${colorClasses}`}>
        {pct}% sure
      </span>
      {sourcesCount !== undefined && sourcesCount > 0 && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300/70 font-medium">
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
        <ThumbsUp className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] text-emerald-400">Thanks!</span>
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
            className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-emerald-400 transition-colors"
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
          <button
            data-testid={`button-thumbsdown-${messageId}`}
            onClick={() => handleFeedback('down')}
            className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-colors"
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
            className="flex-1 text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/30"
            onKeyDown={(e) => e.key === 'Enter' && submitCorrection()}
          />
          <button onClick={submitCorrection} className="p-1 rounded hover:bg-white/10 text-cyan-400">
            <Send className="w-3 h-3" />
          </button>
          <button onClick={() => { setShowCorrection(false); setSubmitted(null); }} className="p-1 rounded hover:bg-white/10 text-white/30">
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
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-xl border-l border-border/50 z-40 flex flex-col" data-testid="panel-memory">
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-white">ARYA's Memory</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300">{memories.length}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/50">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isLoading && <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-purple-400" /></div>}
        {!isLoading && memories.length === 0 && (
          <div className="text-center py-8">
            <Brain className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-sm text-white/40">No memories yet</p>
            <p className="text-xs text-white/20 mt-1">Chat with ARYA to build memory</p>
          </div>
        )}
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{categoryIcons[category] || "📝"}</span>
              <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">{category}</span>
            </div>
            <div className="space-y-1.5">
              {items.map((mem) => (
                <div key={mem.id} className="group flex items-start gap-2 px-2.5 py-2 rounded-lg bg-white/5 border border-white/5 hover:border-purple-500/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white/80 truncate">{mem.key}</div>
                    <div className="text-[11px] text-white/50 mt-0.5">{mem.value}</div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(mem.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
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
    low: "text-white/40", medium: "text-blue-400", high: "text-amber-400", critical: "text-red-400"
  };

  return (
    <div className="absolute right-0 top-0 bottom-0 w-80 bg-card/95 backdrop-blur-xl border-l border-border/50 z-40 flex flex-col" data-testid="panel-goals">
      <div className="p-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Goals & Plans</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{goals.filter(g => g.status === 'active').length}</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-white/50">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 border-b border-border/20">
        <input
          data-testid="input-goal-title"
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          placeholder="What's your goal?"
          className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 mb-1.5"
        />
        <textarea
          data-testid="input-goal-steps"
          value={newGoalSteps}
          onChange={(e) => setNewGoalSteps(e.target.value)}
          placeholder="Steps (one per line, optional)"
          rows={2}
          className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/30 resize-none mb-1.5"
        />
        <Button
          data-testid="button-create-goal"
          onClick={() => newGoalTitle.trim() && createGoalMutation.mutate()}
          disabled={!newGoalTitle.trim()}
          size="sm"
          className="w-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/20 text-xs"
        >
          <Plus className="w-3 h-3 mr-1" /> Add Goal
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading && <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-amber-400" /></div>}
        {goals.map((goal) => (
          <div key={goal.id} className="rounded-xl bg-white/5 border border-white/10 p-3 group" data-testid={`card-goal-${goal.id}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] uppercase font-bold ${priorityColors[goal.priority]}`}>{goal.priority}</span>
                  {goal.status === 'completed' && <Check className="w-3 h-3 text-emerald-400" />}
                </div>
                <h4 className="text-xs font-medium text-white mt-0.5">{goal.title}</h4>
              </div>
              <button
                onClick={() => deleteGoalMutation.mutate(goal.id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {goal.steps.length > 0 && (
              <div className="mb-2">
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all" style={{ width: `${goal.progress}%` }} />
                </div>
                <span className="text-[10px] text-white/30 mt-0.5 block">{goal.progress}%</span>
              </div>
            )}

            <div className="space-y-1">
              {goal.steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => toggleStepMutation.mutate({ stepId: step.id, status: step.status })}
                  className="w-full flex items-start gap-2 text-left px-1.5 py-1 rounded hover:bg-white/5 transition-colors"
                  data-testid={`button-step-${step.id}`}
                >
                  <div className={`w-3.5 h-3.5 mt-0.5 rounded border flex-shrink-0 flex items-center justify-center ${
                    step.status === 'completed' ? 'bg-emerald-500/30 border-emerald-500/50' : 'border-white/20'
                  }`}>
                    {step.status === 'completed' && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                  </div>
                  <span className={`text-[11px] ${step.status === 'completed' ? 'text-white/30 line-through' : 'text-white/70'}`}>
                    {step.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {!isLoading && goals.length === 0 && (
          <div className="text-center py-8">
            <Target className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-sm text-white/40">No goals yet</p>
            <p className="text-xs text-white/20 mt-1">Set goals and track progress</p>
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
              className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20"
              data-testid={`card-insight-${insight.id}`}
            >
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Insight</span>
                  <span className="text-[10px] text-white/30">{insight.title}</span>
                </div>
                <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{insight.insight.slice(0, 150)}{insight.insight.length > 150 ? '...' : ''}</p>
              </div>
              <button
                onClick={() => onDismiss(insight.id)}
                className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 flex-shrink-0"
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
        className="p-1.5 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-all relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full text-[8px] font-bold flex items-center justify-center text-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {showDropdown && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-white/10 rounded-xl shadow-xl py-1 w-72 max-h-80 overflow-y-auto">
          <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-semibold text-white/70">Notifications</span>
            {unreadCount > 0 && <span className="text-[10px] text-amber-400">{unreadCount} new</span>}
          </div>
          {notifications.length === 0 ? (
            <div className="px-3 py-4 text-xs text-white/30 text-center">No notifications yet</div>
          ) : (
            notifications.slice(0, 20).map((n: any) => (
              <div
                key={n.id}
                data-testid={`notification-item-${n.id}`}
                className={`px-3 py-2 text-xs border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 ${!n.isRead ? 'bg-cyan-500/5' : ''}`}
                onClick={() => { if (!n.isRead) markRead(n.id); }}
              >
                <div className="font-medium text-white/80">{n.title}</div>
                <div className="text-white/40 mt-0.5">{n.message}</div>
                <div className="text-white/20 mt-1 text-[10px]">
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
  const { user, isLoggedIn, token, logout: userLogout } = useUserAuth();
  const [, setLocation] = useLocation();
  const [showUserAuth, setShowUserAuth] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
  const [showConfidence, setShowConfidence] = useState(true);
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
              queryClient.invalidateQueries({
                queryKey: ["/api/arya/conversations", convId],
              });
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

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
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
    } catch (err) {
      console.error("Mic error:", err);
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
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
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
              playAudioBase64(event.audio);
            }
            if (event.type === "done") {
              queryClient.invalidateQueries({
                queryKey: ["/api/arya/conversations", convId],
              });
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error("Voice error:", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      queryClient.invalidateQueries({
        queryKey: ["/api/arya/conversations", convId],
      });
    }
  }, [activeConversation, queryClient, createConversation, selectedLanguage, playAudioBase64]);

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
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      <div
        className={`${
          showSidebar ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:relative z-30 md:z-auto top-0 left-0 h-full w-72 md:w-64 lg:w-72 flex-shrink-0 flex flex-col bg-card/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-r md:border-r-0 border-border/50 transition-transform duration-300 pt-14 md:pt-0`}
      >
        <div className="p-3 border-b border-border/20">
          <div className="flex items-center gap-2 mb-3 px-1">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">Chat History</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 ml-auto">
              {conversations.length}
            </span>
          </div>
          <Button
            data-testid="button-new-chat"
            onClick={() => {
              createConversation.mutate("New Chat");
              setShowSidebar(false);
            }}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 text-white hover:from-cyan-500 hover:to-cyan-400 shadow-lg shadow-cyan-500/20"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="px-2 py-2 border-b border-border/10 flex gap-1">
          <button
            data-testid="button-toggle-memory"
            onClick={() => { setShowMemory(!showMemory); setShowGoals(false); }}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              showMemory ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          >
            <Brain className="w-3 h-3" />
            Memory
          </button>
          <button
            data-testid="button-toggle-goals"
            onClick={() => { setShowGoals(!showGoals); setShowMemory(false); }}
            className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-medium transition-colors ${
              showGoals ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
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
                    ? "bg-gradient-to-r from-cyan-500/15 to-transparent border border-cyan-500/25 text-white"
                    : "hover:bg-white/5 text-muted-foreground hover:text-white border border-transparent"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  activeConversation === conv.id
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "bg-white/5 text-white/40"
                }`}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="truncate text-sm block leading-tight">{conv.title}</span>
                  <span className="text-[10px] text-white/30 mt-0.5 block">{timeStr}</span>
                </div>
                <button
                  data-testid={`button-delete-conversation-${conv.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation.mutate(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          {conversations.length === 0 && (
            <div className="text-center py-8 px-3">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-5 h-5 text-white/20" />
              </div>
              <p className="text-muted-foreground text-sm">No conversations yet</p>
              <p className="text-white/30 text-xs mt-1">Start chatting with ARYA!</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="flex items-center justify-between px-3 py-2 md:hidden border-b border-border/20">
          <button
            data-testid="button-toggle-conversations"
            onClick={() => setShowSidebar(!showSidebar)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card/40 border border-border/30 hover:bg-card/60 transition-all"
          >
            {showSidebar ? <PanelLeftClose className="w-4 h-4 text-cyan-400" /> : <PanelLeftOpen className="w-4 h-4 text-cyan-400" />}
            <span className="text-xs font-medium text-white/80">History</span>
            {conversations.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-medium">
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
              className={`p-1.5 rounded-lg transition-all ${showMemory ? 'bg-purple-500/20 text-purple-400' : 'text-white/40 hover:text-white/60'}`}
            >
              <Brain className="w-4 h-4" />
            </button>
            <button
              data-testid="button-toggle-goals-mobile"
              onClick={() => { setShowGoals(!showGoals); setShowMemory(false); }}
              className={`p-1.5 rounded-lg transition-all ${showGoals ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'}`}
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
            {isLoggedIn ? (
              <>
              <NotificationBell token={token!} />
              <div className="relative">
                <button
                  data-testid="button-user-menu"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border border-cyan-500/30 hover:border-cyan-500/50 transition-all"
                >
                  <User className="w-4 h-4 text-cyan-400" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-white/10 rounded-xl shadow-xl py-2 min-w-[180px]">
                    <div className="px-3 py-2 border-b border-white/5">
                      <div className="text-xs font-medium text-white">{user?.name}</div>
                      <div className="text-[10px] text-muted-foreground">{user?.phone}</div>
                    </div>
                    <button
                      data-testid="button-my-goals"
                      onClick={() => { setShowUserMenu(false); setLocation("/my-goals"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:bg-white/5"
                    >
                      <Target className="w-3.5 h-3.5 text-amber-400" /> My Goals
                    </button>
                    <button
                      data-testid="button-user-logout"
                      onClick={() => { setShowUserMenu(false); userLogout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-white/5"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                )}
              </div>
              </>
            ) : (
              <button
                data-testid="button-user-login"
                onClick={() => setShowUserAuth(true)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-all"
                title="Sign in"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {showMemory && <MemoryPanel onClose={() => setShowMemory(false)} />}
        {showGoals && <GoalsPanel onClose={() => setShowGoals(false)} />}

        {insights.length > 0 && !activeConversation && (
          <InsightsCard insights={insights} onDismiss={(id) => dismissInsightMutation.mutate(id)} />
        )}

        <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 md:py-4 space-y-3 md:space-y-4" data-testid="list-messages">
          {!activeConversation && messages.length === 0 && !streamingContent && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <img src="/arya-logo-transparent.png" alt="ARYA" className="w-48 md:w-64 mb-4 md:mb-6" data-testid="img-arya-logo" />
              <p className="text-[10px] uppercase tracking-widest font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3">
                Your Personal Thinking & Growth Assistant
              </p>
              <p className="text-muted-foreground max-w-md mb-6 md:mb-8 text-sm md:text-base">
                Think clearly. Set goals. Stay disciplined. Reflect daily. Grow spiritually & professionally. I'm here to help you become your best self.
              </p>
              {!isLoggedIn && (
                <button
                  data-testid="button-welcome-signin"
                  onClick={() => setShowUserAuth(true)}
                  className="mb-4 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600/20 to-amber-600/20 border border-cyan-500/30 text-sm text-white/80 hover:text-white hover:border-cyan-500/50 transition-all flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-cyan-400" />
                  Sign in to set goals & track your voice practice
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-w-lg w-full">
                {[
                  { text: "Help me think through a tough decision I'm facing", badge: "Think", icon: "🧠" },
                  { text: "I want to build a daily reading habit — help me set a goal", badge: "Goals", icon: "🎯" },
                  { text: "Give me a morning reflection to start my day with clarity", badge: "Reflect", icon: "🌅" },
                  { text: "How can I stay calm and focused when things get stressful?", badge: "Wisdom", icon: "🧘" },
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    data-testid={`button-suggestion-${i}`}
                    onClick={() => sendMessage(suggestion.text)}
                    className="text-left px-3 md:px-4 py-2.5 md:py-3 rounded-xl border border-border/50 bg-card/30 text-sm text-muted-foreground hover:text-white hover:border-primary/40 hover:bg-card/60 transition-all group"
                  >
                    <span className="text-[9px] uppercase tracking-wider font-semibold text-cyan-400/60 group-hover:text-cyan-400 mb-1 flex items-center gap-1">
                      <span>{suggestion.icon}</span> {suggestion.badge}
                    </span>
                    <span className="block text-xs mt-0.5">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              data-testid={`message-${msg.role}-${msg.id}`}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`group max-w-[90%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 ${
                  msg.role === "user"
                    ? "bg-primary/20 border border-primary/30 text-white"
                    : "bg-card/60 border border-border/30 text-white/90"
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
            </div>
          ))}

          {streamingContent && (
            <div className="flex justify-start" data-testid="message-streaming">
              <div className={`max-w-[90%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl px-3 md:px-4 py-2.5 md:py-3 ${
                responseMode === "instant"
                  ? "bg-gradient-to-br from-amber-500/10 to-cyan-500/10 border border-amber-500/20"
                  : "bg-card/60 border border-border/30"
              } text-white/90`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
                    ARYA
                  </span>
                  {responseMode === "instant" && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium border border-amber-500/20">
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
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Globe className="w-3 h-3 text-amber-400" />
                      <span className="text-xs text-amber-400">{currentLang?.native || selectedLanguage}</span>
                    </div>
                    <div className="text-white/80">
                      <FormattedMessage content={translatedContent} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isStreaming && !streamingContent && (
            <div className="flex justify-start" data-testid="message-thinking">
              <div className="rounded-2xl px-3 md:px-4 py-2.5 md:py-3 bg-card/60 border border-border/30">
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
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="px-2 sm:px-4 pb-3 md:pb-4 pt-1 md:pt-2">
          {playingAudio && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30">
                <div className="flex gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-amber-400 rounded-full animate-pulse"
                      style={{ height: `${8 + Math.random() * 10}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-amber-400">ARYA is speaking...</span>
                <button
                  data-testid="button-stop-audio"
                  onClick={stopAudio}
                  className="p-0.5 rounded-full hover:bg-amber-500/20"
                >
                  <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>
          )}
          <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
            <div className="flex items-end gap-1.5 md:gap-2 p-2 md:p-3">
              <div className="relative" ref={langMenuRef}>
                <Button
                  data-testid="button-language-select"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className={`flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 ${
                    selectedLanguage !== "en-IN"
                      ? "text-amber-400 bg-amber-500/10 hover:bg-amber-500/20"
                      : "text-muted-foreground hover:text-white hover:bg-card"
                  }`}
                  title={`Voice language: ${currentLang?.name || "English"}`}
                >
                  <Globe className="w-4 h-4" />
                </Button>
                {showLanguageMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-52 bg-card border border-border/50 rounded-xl shadow-xl overflow-hidden z-50">
                    <div className="px-3 py-2 border-b border-border/30">
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
                          className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-white/5 transition-colors ${
                            selectedLanguage === lang.code ? "text-primary bg-primary/10" : "text-white/80"
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
                    : "text-muted-foreground hover:text-white hover:bg-card"
                }`}
                title={speakerOn ? "ARYA will speak responses (tap to mute)" : "Tap to make ARYA speak responses"}
              >
                {speakerOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </Button>

              <Button
                data-testid="button-voice"
                variant="ghost"
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isStreaming}
                className={`flex-shrink-0 rounded-full h-9 w-9 md:h-10 md:w-10 ${
                  isRecording
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse"
                    : "text-muted-foreground hover:text-white hover:bg-card"
                }`}
              >
                {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
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
                  <span className="text-sm text-red-400 font-mono">
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
                  className="flex-1 resize-none bg-transparent border-0 text-white placeholder:text-muted-foreground text-sm focus:outline-none py-2 max-h-32"
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
          <div className="flex items-center justify-center gap-2 mt-1.5 md:mt-2">
            {selectedLanguage !== "en-IN" && (
              <span className="text-[10px] md:text-xs text-amber-400/80 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                Voice: {currentLang?.native}
              </span>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground text-center flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400/50" />
              ARYA — Think clearly. Set goals. Grow daily.
            </p>
          </div>
        </div>
      </div>

      {showUserAuth && (
        <div className="fixed inset-0 z-50">
          <UserAuthModal onClose={() => setShowUserAuth(false)} />
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

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
        const r = await signup({ name: name.trim(), phone, password });
        if (!r.success) setError(r.error || "Signup failed");
        else onClose();
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a]/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-card/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <img src="/arya-logo-transparent.png" alt="ARYA" className="w-32 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">{mode === "login" ? "Welcome Back" : "Join ARYA"}</h2>
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
              className="w-full bg-background/50 border border-white/10 rounded-xl text-white text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              autoFocus
            />
          )}
          <input
            data-testid="modal-input-phone"
            type="tel"
            placeholder="+91 98765 43210"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full bg-background/50 border border-white/10 rounded-xl text-white text-sm px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            autoFocus={mode === "login"}
          />
          <div className="relative">
            <input
              data-testid="modal-input-password"
              type={showPw ? "text" : "password"}
              placeholder={mode === "signup" ? "Create password (min 6 chars)" : "Password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-background/50 border border-white/10 rounded-xl text-white text-sm px-3 py-2.5 pr-10 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2" data-testid="modal-text-error">{error}</div>}
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
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} className="text-xs text-muted-foreground hover:text-white">
            {mode === "login" ? <>New here? <span className="text-cyan-400">Create account</span></> : <>Have an account? <span className="text-cyan-400">Sign in</span></>}
          </button>
        </div>
        <div className="text-center mt-3">
          <button onClick={onClose} className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground">Skip for now</button>
        </div>
      </div>
    </div>
  );
}
