import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Flame, CheckCircle2, Trophy, Heart, Zap, ChevronRight,
  X, ChevronDown, Send, Calendar, Star, ArrowRight, Sparkles,
  MessageCircle, ThumbsUp, Target, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CommunityStats {
  memberCount: number;
  postCount: number;
}
interface Challenge {
  id: string;
  title: string;
  description: string;
  dailyTasks: string[];
  durationDays: number;
  participantCount: number;
  completedCount: number;
  weekStart: string;
}
interface Post {
  id: string;
  userId: string;
  userName: string;
  content: string;
  dayNumber: number | null;
  isCompleted: boolean;
  reactionCount: number;
  createdAt: string;
  userReaction?: string | null;
}
interface UserSession {
  id: string;
  name: string;
  email: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const avatarColors = [
  "from-cyan-400 to-blue-500",
  "from-purple-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-red-500",
];
function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[idx];
}

// ─── Join Form ────────────────────────────────────────────────────────────────
const GROWTH_GOALS = [
  "Productivity & Focus", "Mental Clarity", "Emotional Support", "Career Growth",
  "Business & Leadership", "Fitness & Wellness", "Habit Building", "Motivation & Discipline",
  "Learning & Skill Growth", "Time Management", "Confidence Building", "Daily Planning",
  "Stress Management", "Relationships & Communication", "Emergency Medicine / Medical Learning",
];
const COMMUNITY_PARTICIPATION = [
  "Join the ARYA WhatsApp Community", "Join the ARYA Telegram Community",
  "Become an Early Beta Tester", "Share feedback to improve ARYA",
  "Share my growth story in the future", "Participate in ARYA challenges & streaks",
];
const HABIT_TRACKING = [
  "Daily Focus", "Reading", "Fitness", "Meditation", "Sleep",
  "Journaling", "Learning", "Emotional Well-being", "Productivity",
];
const PROFESSIONS = [
  "Student", "Doctor", "Entrepreneur", "Employee", "Creator",
  "Teacher", "Homemaker", "Freelancer", "Other",
];

function CheckBox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer group">
      <div
        onClick={onChange}
        className={`mt-0.5 w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all cursor-pointer
          ${checked ? "bg-cyan-500 border-cyan-500" : "border-gray-300 dark:border-slate-600 group-hover:border-cyan-400"}`}
      >
        {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{label}</span>
    </label>
  );
}

function JoinFormModal({ onClose, userSession }: { onClose: () => void; userSession: UserSession | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    name: userSession?.name ?? "",
    email: userSession?.email ?? "",
    whatsapp: "",
    profession: "",
    countryCity: "",
    currentChallenges: "",
    expectations: "",
    growthReflection: "",
    improvementIdeas: "",
    foundingReason: "",
    consentUpdates: false,
    consentAi: false,
  });
  const [growthGoals, setGrowthGoals] = useState<string[]>([]);
  const [communityParticipation, setCommunityParticipation] = useState<string[]>([]);
  const [habitTracking, setHabitTracking] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const toggle = (arr: string[], set: (v: string[]) => void, val: string) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const joinMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("arya_user_token");
      const res = await fetch("/api/community/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...form, growthGoals, communityParticipation, habitTracking }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to join");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ["/api/community/stats"] });
    },
    onError: (e: any) => {
      toast({ title: "Couldn't submit", description: e.message, variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center mx-auto mb-5">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to the ARYA Growth Community 🌱</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            You are now part of a growing movement focused on clarity, growth, discipline, and better living.
          </p>
          <div className="text-left space-y-2 mb-6 bg-gray-50 dark:bg-slate-800 rounded-2xl p-4">
            {["Early access updates", "Community invites", "Beta testing opportunities", "Growth challenges", "ARYA feature updates"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500 italic mb-5">
            "Small consistent steps create extraordinary transformations."
          </p>
          <Button onClick={onClose} className="w-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white border-0">
            Start Your Journey
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-cyan-500 to-purple-600 px-6 py-5 rounded-t-3xl sm:rounded-t-3xl flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">ARYA Founding Community</h2>
            <p className="text-cyan-100 text-sm mt-0.5">Become part of a movement</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Intro */}
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            ARYA is more than an AI assistant — it is a companion designed to help people think clearly, grow consistently, and move forward in life. Share a little about yourself so ARYA can personalise your journey.
          </p>

          {/* Personal Info */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-600 text-xs font-bold">1</div>
              Personal Information
            </h3>
            <div className="space-y-3">
              <Input data-testid="input-community-name" placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl dark:bg-slate-800 dark:border-slate-700" />
              <Input data-testid="input-community-email" type="email" placeholder="Email Address *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl dark:bg-slate-800 dark:border-slate-700" />
              <Input data-testid="input-community-whatsapp" placeholder="WhatsApp Number" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="rounded-xl dark:bg-slate-800 dark:border-slate-700" />
              <select
                data-testid="select-community-profession"
                value={form.profession}
                onChange={(e) => setForm({ ...form, profession: e.target.value })}
                className="w-full rounded-xl border border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <option value="">Profession</option>
                {PROFESSIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <Input placeholder="Country / City" value={form.countryCity} onChange={(e) => setForm({ ...form, countryCity: e.target.value })} className="rounded-xl dark:bg-slate-800 dark:border-slate-700" />
            </div>
          </section>

          {/* Growth Goals */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 text-xs font-bold">2</div>
              Your Growth Goals
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">What areas would you like ARYA to help you with? (Select all that apply)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GROWTH_GOALS.map((g) => (
                <CheckBox key={g} checked={growthGoals.includes(g)} onChange={() => toggle(growthGoals, setGrowthGoals, g)} label={g} />
              ))}
            </div>
          </section>

          {/* Text fields */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 text-xs font-bold">3</div>
                Your Current Challenge
              </h3>
              <Textarea placeholder="Lack of consistency, overthinking, stress, procrastination, burnout, difficulty focusing…" value={form.currentChallenges} onChange={(e) => setForm({ ...form, currentChallenges: e.target.value })} className="rounded-xl dark:bg-slate-800 dark:border-slate-700 min-h-[80px]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 text-xs font-bold">4</div>
                What do you expect from ARYA?
              </h3>
              <Textarea placeholder="Better discipline, emotional clarity, structured thinking, improved productivity…" value={form.expectations} onChange={(e) => setForm({ ...form, expectations: e.target.value })} className="rounded-xl dark:bg-slate-800 dark:border-slate-700 min-h-[80px]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-600 text-xs font-bold">5</div>
                What does "personal growth" mean to you?
              </h3>
              <Textarea placeholder="Share your perspective…" value={form.growthReflection} onChange={(e) => setForm({ ...form, growthReflection: e.target.value })} className="rounded-xl dark:bg-slate-800 dark:border-slate-700 min-h-[80px]" />
            </div>
          </section>

          {/* Community Participation */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-cyan-600 text-xs font-bold">6</div>
              Community Participation
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Would you like to:</p>
            <div className="space-y-2">
              {COMMUNITY_PARTICIPATION.map((c) => (
                <CheckBox key={c} checked={communityParticipation.includes(c)} onChange={() => toggle(communityParticipation, setCommunityParticipation, c)} label={c} />
              ))}
            </div>
          </section>

          {/* Habit Tracking */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-600 text-xs font-bold">7</div>
              Habits You'd Like ARYA to Track
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
              {HABIT_TRACKING.map((h) => (
                <CheckBox key={h} checked={habitTracking.includes(h)} onChange={() => toggle(habitTracking, setHabitTracking, h)} label={h} />
              ))}
            </div>
          </section>

          {/* More text */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 text-xs font-bold">8</div>
                How could ARYA improve your life?
              </h3>
              <Textarea placeholder="Your ideas for making ARYA better…" value={form.improvementIdeas} onChange={(e) => setForm({ ...form, improvementIdeas: e.target.value })} className="rounded-xl dark:bg-slate-800 dark:border-slate-700 min-h-[80px]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 text-xs font-bold">9</div>
                Why join the ARYA Founding Circle?
              </h3>
              <Textarea placeholder="What draws you to this community…" value={form.foundingReason} onChange={(e) => setForm({ ...form, foundingReason: e.target.value })} className="rounded-xl dark:bg-slate-800 dark:border-slate-700 min-h-[80px]" />
            </div>
          </section>

          {/* Consent */}
          <section className="space-y-3 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
            <CheckBox
              checked={form.consentUpdates}
              onChange={() => setForm({ ...form, consentUpdates: !form.consentUpdates })}
              label="I agree to receive updates, beta access, and community announcements from ARYA."
            />
            <CheckBox
              checked={form.consentAi}
              onChange={() => setForm({ ...form, consentAi: !form.consentAi })}
              label="I understand that ARYA is an AI-powered assistant designed for guidance, productivity, and growth support."
            />
          </section>

          {/* Submit */}
          <Button
            data-testid="button-community-submit"
            onClick={() => joinMutation.mutate()}
            disabled={!form.name || !form.email || !form.consentAi || !form.consentUpdates || joinMutation.isPending}
            className="w-full rounded-full h-12 text-base font-semibold bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white border-0 shadow-lg"
          >
            {joinMutation.isPending ? "Joining…" : "🚀 Become an Early Member"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ post, token, currentUserId }: { post: Post; token: string | null; currentUserId: string | null }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [localCount, setLocalCount] = useState(post.reactionCount);
  const [reacted, setReacted] = useState(!!post.userReaction);

  const reactMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Sign in to react");
      const res = await fetch(`/api/community/posts/${post.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reactionType: "cheer" }),
      });
      if (!res.ok) throw new Error("Failed to react");
      return res.json();
    },
    onSuccess: (data) => {
      setLocalCount(data.reactionCount);
      setReacted(data.reacted);
      qc.invalidateQueries({ queryKey: ["/api/community/posts"] });
    },
    onError: (e: any) => {
      if (e.message === "Sign in to react") {
        toast({ title: "Sign in to react", description: "Create a free ARYA account to cheer members on." });
      }
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid={`card-post-${post.id}`}
      className="bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-gray-100 dark:border-slate-700/60 hover:border-cyan-200 dark:hover:border-cyan-800/50 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(post.userName)} flex items-center justify-center flex-shrink-0`}>
          <span className="text-white text-xs font-bold">{getInitials(post.userName)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 dark:text-white">{post.userName}</span>
            {post.dayNumber && (
              <span className="text-[10px] px-2 py-0.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-full font-medium">
                Day {post.dayNumber}
              </span>
            )}
            {post.isCompleted && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{timeAgo(post.createdAt)}</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1.5 leading-relaxed">{post.content}</p>
          <button
            data-testid={`button-react-${post.id}`}
            onClick={() => reactMutation.mutate()}
            className={`mt-2 flex items-center gap-1.5 text-xs px-3 py-1 rounded-full transition-all border
              ${reacted
                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                : "text-gray-400 dark:text-gray-500 border-gray-100 dark:border-slate-700 hover:border-amber-200 hover:text-amber-500"
              }`}
          >
            <Flame className={`w-3 h-3 ${reacted ? "fill-amber-400" : ""}`} />
            <span>{localCount > 0 ? localCount : ""} {reacted ? "Cheering" : "Cheer"}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Community() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [showPostBox, setShowPostBox] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [postDay, setPostDay] = useState<number | null>(null);
  const [postCompleted, setPostCompleted] = useState(false);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  // Auth
  const [token, setToken] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("arya_user_token");
    setToken(t);
    if (t) {
      fetch("/api/user/me", { headers: { Authorization: `Bearer ${t}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => data && setUserSession(data))
        .catch(() => {});
    }
  }, []);

  // Data fetching
  const { data: stats } = useQuery<CommunityStats>({
    queryKey: ["/api/community/stats"],
    queryFn: async () => {
      const r = await fetch("/api/community/stats");
      return r.json();
    },
    refetchInterval: 60000,
  });

  const { data: challenge } = useQuery<Challenge | null>({
    queryKey: ["/api/community/challenge"],
    queryFn: async () => {
      const r = await fetch("/api/community/challenge");
      return r.ok ? r.json() : null;
    },
    refetchInterval: 300000,
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ["/api/community/posts"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const r = await fetch("/api/community/posts", { headers });
      return r.ok ? r.json() : [];
    },
    refetchInterval: 30000,
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("auth");
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          content: postContent.trim(),
          challengeId: challenge?.id ?? null,
          dayNumber: postDay,
          isCompleted: postCompleted,
        }),
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: () => {
      setPostContent("");
      setPostDay(null);
      setPostCompleted(false);
      setShowPostBox(false);
      qc.invalidateQueries({ queryKey: ["/api/community/posts"] });
      toast({ title: "Posted!", description: "Your update is live in the community feed." });
    },
    onError: (e: any) => {
      if (e.message === "auth") {
        toast({ title: "Sign in first", description: "Create a free ARYA account to post." });
      } else {
        toast({ title: "Couldn't post", variant: "destructive" });
      }
    },
  });

  // Days remaining in challenge
  const daysLeft = challenge
    ? Math.max(0, 7 - Math.floor((Date.now() - new Date(challenge.weekStart).getTime()) / 86400000))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, #06b6d4 0%, transparent 50%), radial-gradient(circle at 80% 20%, #a855f7 0%, transparent 50%)",
        }} />
        <div className="relative max-w-4xl mx-auto px-4 py-16 sm:py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 backdrop-blur rounded-full text-cyan-300 text-xs font-medium mb-6 border border-white/10">
              <Sparkles className="w-3.5 h-3.5" />
              ARYA Growth Community
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              Grow Together.<br />
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Rise Together.</span>
            </h1>
            <p className="text-gray-300 text-lg max-w-xl mx-auto mb-8 leading-relaxed">
              A movement of people committed to clarity, growth, discipline, and transformation. Not a social network — a growth network.
            </p>

            {/* Stats */}
            <div className="flex items-center justify-center gap-8 mb-10">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{stats?.memberCount ?? 0}</div>
                <div className="text-xs text-gray-400 mt-0.5">Members</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{stats?.postCount ?? 0}</div>
                <div className="text-xs text-gray-400 mt-0.5">Updates Shared</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-3xl font-bold text-white">7</div>
                <div className="text-xs text-gray-400 mt-0.5">Day Challenges</div>
              </div>
            </div>

            <Button
              data-testid="button-join-community"
              onClick={() => setShowJoinForm(true)}
              className="h-12 px-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-semibold text-base border-0 shadow-xl shadow-purple-900/40"
            >
              🚀 Become a Founding Member
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs text-gray-500 mt-3">Free forever for founding members</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">

        {/* ── This Week's Challenge ─────────────────────────────────────────── */}
        {challenge && (
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">This Week's Challenge</h2>
              <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {daysLeft} days left
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800/60 rounded-3xl border border-gray-100 dark:border-slate-700/60 overflow-hidden shadow-sm">
              {/* Challenge header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-white font-bold text-xl leading-tight">{challenge.title}</h3>
                    <p className="text-amber-100 text-sm mt-1.5 leading-relaxed">{challenge.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-center bg-white/20 rounded-2xl px-3 py-2">
                    <div className="text-2xl font-bold text-white">{challenge.durationDays}</div>
                    <div className="text-[10px] text-amber-100 font-medium">DAYS</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 text-sm text-amber-100">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {challenge.participantCount} participating</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {challenge.completedCount} completed</span>
                </div>
              </div>

              {/* Daily tasks */}
              <div className="p-5 space-y-2">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Daily Tasks</p>
                {(challenge.dailyTasks ?? []).map((task, i) => {
                  const isToday = i === 7 - daysLeft;
                  return (
                    <div key={i} data-testid={`task-day-${i + 1}`}
                      className={`rounded-xl border transition-all cursor-pointer
                        ${isToday ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20" : "border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/40"}`}
                      onClick={() => setExpandedTask(expandedTask === i ? null : i)}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                          ${isToday ? "bg-amber-500 text-white" : "bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400"}`}>
                          {i + 1}
                        </div>
                        <span className={`text-sm flex-1 line-clamp-1 ${isToday ? "font-semibold text-amber-800 dark:text-amber-300" : "text-gray-700 dark:text-gray-300"}`}>
                          {task.replace(/^Day \d+:\s*/, "")}
                        </span>
                        {isToday && <span className="text-[10px] bg-amber-500 text-white rounded-full px-2 py-0.5 font-medium flex-shrink-0">Today</span>}
                        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${expandedTask === i ? "rotate-180" : ""}`} />
                      </div>
                      <AnimatePresence>
                        {expandedTask === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{task}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Participate CTA */}
              <div className="px-5 pb-5">
                {token ? (
                  <Button
                    data-testid="button-share-update"
                    onClick={() => setShowPostBox(true)}
                    className="w-full rounded-xl h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 font-semibold"
                  >
                    <Send className="w-4 h-4 mr-2" /> Share Your Update
                  </Button>
                ) : (
                  <Link href="/">
                    <Button className="w-full rounded-xl h-11 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-0 hover:bg-gray-200 dark:hover:bg-slate-600">
                      Sign in to participate in this challenge
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.section>
        )}

        {/* ── Post Box ─────────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showPostBox && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-cyan-200 dark:border-cyan-800/50 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Share Your Challenge Update</h3>
                  <button onClick={() => setShowPostBox(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Textarea
                  data-testid="input-post-content"
                  placeholder="How did today go? What did you notice? What will you do differently tomorrow?"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="mb-3 rounded-xl dark:bg-slate-700 dark:border-slate-600 min-h-[90px]"
                />
                <div className="flex items-center gap-3 flex-wrap mb-3">
                  <select
                    data-testid="select-post-day"
                    value={postDay ?? ""}
                    onChange={(e) => setPostDay(e.target.value ? Number(e.target.value) : null)}
                    className="text-sm rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  >
                    <option value="">Which day?</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>Day {d}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                    <input
                      data-testid="checkbox-post-completed"
                      type="checkbox"
                      checked={postCompleted}
                      onChange={(e) => setPostCompleted(e.target.checked)}
                      className="rounded accent-emerald-500"
                    />
                    I completed this challenge!
                  </label>
                </div>
                <Button
                  data-testid="button-submit-post"
                  onClick={() => postMutation.mutate()}
                  disabled={!postContent.trim() || postMutation.isPending}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white border-0 h-10 px-6 font-semibold"
                >
                  {postMutation.isPending ? "Posting…" : "Post Update"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Community Feed ────────────────────────────────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Community Feed</h2>
            <span className="text-xs text-gray-400 ml-auto">{posts.length} updates</span>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800/40 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Flame className="w-7 h-7 text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No updates yet</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Be the first to share your journey</p>
              {token ? (
                <Button
                  onClick={() => setShowPostBox(true)}
                  className="mt-4 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white border-0"
                >
                  Share First Update
                </Button>
              ) : (
                <Link href="/">
                  <Button className="mt-4 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-0">
                    Sign in to post
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} token={token} currentUserId={userSession?.id ?? null} />
              ))}
            </div>
          )}
        </motion.section>

        {/* ── Why Join ──────────────────────────────────────────────────────── */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Target, color: "cyan", title: "Weekly Challenges", desc: "ARYA generates personalised group challenges based on what your community needs most." },
              { icon: Users, color: "purple", title: "Real Accountability", desc: "Share your progress. Cheer others on. The community makes consistency contagious." },
              { icon: Star, color: "amber", title: "Founding Circle", desc: "First members shape the future of ARYA. Your feedback directly builds the product." },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="bg-white dark:bg-slate-800/60 rounded-2xl p-5 border border-gray-100 dark:border-slate-700/60">
                <div className={`w-10 h-10 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 text-${color}-500`} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="text-center py-12 bg-gradient-to-br from-slate-900 to-purple-950 rounded-3xl px-6"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Ready to grow?</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Join the founding community and help shape the future of ARYA.
          </p>
          <Button
            data-testid="button-join-bottom"
            onClick={() => setShowJoinForm(true)}
            className="h-11 px-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold border-0"
          >
            Join the Community
          </Button>
          <p className="text-xs text-gray-600 mt-3 italic">"Small consistent steps create extraordinary transformations."</p>
        </motion.div>
      </div>

      {/* ── Join Form Modal ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showJoinForm && (
          <JoinFormModal onClose={() => setShowJoinForm(false)} userSession={userSession} />
        )}
      </AnimatePresence>
    </div>
  );
}
