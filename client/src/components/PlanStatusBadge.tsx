import { useQuery } from "@tanstack/react-query";

interface PlanStatus {
  plan: "free" | "core" | "pro" | "elite";
  status: "active" | "trial" | "expired";
  renewsAt: string | null;
  daysLeft: number | null;
  isFoundingMember: boolean;
  trialDaysLeft: number | null;
}

const PLAN_CONFIG = {
  free:  { label: "Free",  colorClass: "text-gray-500 dark:text-gray-400", bg: "bg-gray-50 dark:bg-slate-800/60", border: "border-gray-200 dark:border-slate-600", emoji: "🌱" },
  core:  { label: "Core",  colorClass: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", emoji: "⭐" },
  pro:   { label: "Pro",   colorClass: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-800", emoji: "👑" },
  elite: { label: "Elite", colorClass: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", emoji: "💎" },
};

export default function PlanStatusBadge({ token }: { token: string }) {
  const { data, isLoading } = useQuery<PlanStatus>({
    queryKey: ["/api/user/plan-status"],
    queryFn: () =>
      fetch("/api/user/plan-status", {
        headers: { "x-user-token": token },
      }).then((r) => r.json()),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: !!token,
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 animate-pulse">
        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-slate-600 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-24 bg-gray-200 dark:bg-slate-600 rounded" />
          <div className="h-2.5 w-16 bg-gray-200 dark:bg-slate-600 rounded" />
        </div>
      </div>
    );
  }

  const cfg = PLAN_CONFIG[data.plan as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.free;

  if (data.status === "trial" && data.trialDaysLeft !== null) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20">
        <span className="text-2xl leading-none flex-shrink-0">⏳</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">Free Trial — Full Access</p>
          <p className="text-xs text-cyan-500/80 dark:text-cyan-400/60 mt-0.5">
            {data.trialDaysLeft} day{data.trialDaysLeft !== 1 ? "s" : ""} left
          </p>
        </div>
        <a href="/pricing" className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex-shrink-0 whitespace-nowrap">
          See plans →
        </a>
      </div>
    );
  }

  if (data.status === "active" && data.plan !== "free") {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.border} ${cfg.bg}`}>
        <span className="text-2xl leading-none flex-shrink-0">{cfg.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${cfg.colorClass}`}>
            {cfg.label} Plan
            {data.isFoundingMember && (
              <span className="text-amber-500 dark:text-amber-400"> · Founding Member</span>
            )}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {data.daysLeft !== null
              ? `Renews in ${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}`
              : "Active"}
          </p>
        </div>
        <span className="text-emerald-500 font-bold text-base flex-shrink-0">✓</span>
      </div>
    );
  }

  if (data.status === "expired") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
        <span className="text-2xl leading-none flex-shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">Plan expired</p>
          <p className="text-xs text-red-400/80 dark:text-red-400/60 mt-0.5">Renew to keep your features</p>
        </div>
        <a href="/pricing" className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex-shrink-0">
          Renew →
        </a>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${cfg.border} ${cfg.bg}`}>
      <span className="text-2xl leading-none flex-shrink-0">{cfg.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Free Plan</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Upgrade for more</p>
      </div>
      <a href="/pricing" className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex-shrink-0">
        Upgrade →
      </a>
    </div>
  );
}
