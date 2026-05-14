import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Heart, Target, Sparkles, AlertCircle } from "lucide-react";

interface ReflectionContent {
  userName: string;
  period: string;
  workedOn: string;
  struggle: string;
  win: string;
  currentGoal: string | null;
  goalProgress: number | null;
}

interface ReflectionData {
  content: ReflectionContent;
  weekStart: string;
  viewedAt: string | null;
  expired: boolean;
}

export default function ReflectionPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<ReflectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setLoading(false); setNotFound(true); return; }

    fetch(`/api/reflection/${token}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(d => { if (d) setData(d); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-700 mb-2">This reflection isn't available</h1>
          <p className="text-sm text-gray-400">The link may have expired or been removed. Weekly reflections are available for 7 days.</p>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400">Curious about ARYA?</p>
            <a
              href="/"
              className="inline-block mt-2 text-sm text-emerald-600 font-medium hover:underline"
            >
              See what ARYA is →
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (data.expired) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <div className="text-4xl mb-4">🌱</div>
          <h1 className="text-xl font-semibold text-gray-700 mb-2">This week has passed</h1>
          <p className="text-sm text-gray-400">
            {data.content.userName}'s reflection from the week of{" "}
            {new Date(data.weekStart).toLocaleDateString("en-IN", { day: "numeric", month: "long" })} is no longer available.
            Reflections are shared for 7 days.
          </p>
          <div className="mt-6 pt-6 border-t border-gray-100">
            <a href="/" className="inline-block text-sm text-emerald-600 font-medium hover:underline">
              Start your own growth journey with ARYA →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { content } = data;
  const firstName = content.userName?.split(" ")[0] || "them";

  return (
    <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-start py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-1.5 text-xl font-bold tracking-tight mb-3"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#0d9488" }}
          >
            ARYA
          </div>
          <h1 className="text-2xl font-bold text-gray-900 leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {content.userName}'s week
          </h1>
          <p className="text-sm text-gray-400 mt-1">{content.period}</p>
        </div>

        {/* Reflection cards */}
        <div className="space-y-4">
          {/* What they worked on */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What {firstName} worked on</span>
            </div>
            <p className="text-gray-800 text-sm leading-relaxed">{content.workedOn}</p>
          </motion.div>

          {/* Struggle */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.2 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center">
                <span className="text-sm">🌊</span>
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">A moment they acknowledged</span>
            </div>
            <p className="text-gray-800 text-sm leading-relaxed">{content.struggle}</p>
          </motion.div>

          {/* Win */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.3 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-purple-50 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Something to celebrate</span>
            </div>
            <p className="text-gray-800 text-sm leading-relaxed">{content.win}</p>
          </motion.div>

          {/* Current goal — if present */}
          {content.currentGoal && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.4 }}
              className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100"
            >
              <div className="text-xs text-emerald-600 font-semibold mb-1">Current focus</div>
              <div className="text-sm text-emerald-800 font-medium">{content.currentGoal}</div>
              {content.goalProgress !== null && (
                <div className="mt-2">
                  <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${content.goalProgress}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-emerald-500 mt-1">{content.goalProgress}% progress</div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Read-only notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-6 text-center"
        >
          <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <Heart className="w-3 h-3" />
            {firstName} chose to share this with you. This page is read-only.
          </p>
        </motion.div>

        {/* ARYA CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mt-8 pt-6 border-t border-gray-100 text-center"
        >
          <p className="text-xs text-gray-400 mb-2">Want something like this for yourself?</p>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            Start your growth journey with ARYA
            <span>→</span>
          </a>
        </motion.div>
      </motion.div>
    </div>
  );
}
