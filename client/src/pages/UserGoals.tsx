import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserAuth } from "@/lib/user-auth";
import UserAuth from "@/pages/UserAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Plus, Flame, Clock, CheckCircle2, Trash2,
  ArrowLeft, Trophy, Calendar, Loader2, Bell, Repeat,
  Users, Lightbulb, ListTodo, AlarmClock, ChevronDown, X,
  CheckCheck,
} from "lucide-react";
import { useLocation } from "wouter";
import { useLanguage } from "@/lib/language-context";

// ─── Types ───────────────────────────────────────────────────────────────────

type GoalType = "task" | "habit" | "reminder" | "intention";
type GoalStatus = "active" | "completed" | "paused" | "cancelled";

interface GoalStep {
  id: string;
  goalId: string;
  description: string;
  status: string;
  order: number;
}

interface GoalStats {
  totalMinutes: number;
  todayMinutes: number;
  totalSessions: number;
  todaySessions: number;
}

interface UserGoal {
  id: string;
  title: string;
  description: string | null;
  status: GoalStatus;
  priority: string;
  progress: number;
  goalType: GoalType;
  dueDate: string | null;
  reminderAt: string | null;
  reminderFired: boolean;
  recurrence: string | null;
  peopleInvolved: string[] | null;
  contextNote: string | null;
  dailyTargetMinutes: number | null;
  reminderTime: string | null;
  streakCount: number;
  lastActivityAt: string | null;
  steps: GoalStep[];
  stats: GoalStats;
  createdAt: string;
}

// ─── Tab config ──────────────────────────────────────────────────────────────

type Tab = "today" | "tasks" | "reminders" | "habits" | "intentions" | "all";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "today",      label: "Today",      icon: Clock         },
  { id: "tasks",      label: "Tasks",      icon: ListTodo      },
  { id: "reminders",  label: "Reminders",  icon: AlarmClock    },
  { id: "habits",     label: "Habits",     icon: Repeat        },
  { id: "intentions", label: "Intentions", icon: Lightbulb     },
  { id: "all",        label: "All",        icon: Target        },
];

const TYPE_META: Record<GoalType, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  task:      { label: "Task",      color: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20",   icon: CheckCheck   },
  habit:     { label: "Habit",     color: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  icon: Repeat       },
  reminder:  { label: "Reminder",  color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: AlarmClock   },
  intention: { label: "Intention", color: "text-emerald-400",bg: "bg-emerald-500/10",border: "border-emerald-500/20",icon: Lightbulb    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 86400000);
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dt.getTime() === today.getTime()) return "Today";
  if (dt.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata",
  });
}

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ─── Root ────────────────────────────────────────────────────────────────────

export default function UserGoals() {
  const { isLoggedIn, isLoading: authLoading, user, token } = useUserAuth();
  const [, setLocation] = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <UserAuth onClose={() => setLocation("/")} />;
  }

  return <GoalsView token={token!} userName={user?.name || "User"} onBack={() => setLocation("/")} />;
}

// ─── Main View ───────────────────────────────────────────────────────────────

function GoalsView({ token, userName, onBack }: { token: string; userName: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createType, setCreateType] = useState<GoalType>("task");

  const { data: goals = [], isLoading } = useQuery<UserGoal[]>({
    queryKey: ["user-goals"],
    queryFn: async () => {
      const res = await fetch("/api/user/goals", {
        headers: { "x-user-token": token },
      });
      if (!res.ok) throw new Error("Failed to fetch goals");
      return res.json();
    },
  });

  const createGoal = useMutation({
    mutationFn: async (data: Partial<UserGoal> & { title: string }) => {
      const res = await fetch("/api/user/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-goals"] });
      setShowCreateForm(false);
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ goalId, ...data }: { goalId: string } & Partial<UserGoal>) => {
      const res = await fetch(`/api/user/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-goals"] }),
  });

  const deleteGoal = useMutation({
    mutationFn: async (goalId: string) => {
      const res = await fetch(`/api/user/goals/${goalId}`, {
        method: "DELETE",
        headers: { "x-user-token": token },
      });
      if (!res.ok) throw new Error("Failed to delete goal");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-goals"] }),
  });

  // ── Tab filtering ──────────────────────────────────────────────────────────
  const activeGoals = goals.filter(g => g.status === "active");

  function filterGoals(tab: Tab): UserGoal[] {
    switch (tab) {
      case "today":
        return activeGoals.filter(g =>
          (g.goalType === "task" && isToday(g.dueDate)) ||
          (g.goalType === "reminder" && isToday(g.reminderAt)) ||
          (g.goalType === "habit") // habits always show in Today
        );
      case "tasks":
        return activeGoals.filter(g => g.goalType === "task");
      case "reminders":
        return activeGoals.filter(g => g.goalType === "reminder");
      case "habits":
        return activeGoals.filter(g => g.goalType === "habit");
      case "intentions":
        return activeGoals.filter(g => g.goalType === "intention");
      case "all":
        return goals;
      default:
        return goals;
    }
  }

  const tabGoals = filterGoals(activeTab);
  const completedGoals = goals.filter(g => g.status === "completed");

  // Count badges
  const todayCount = filterGoals("today").length;
  const countFor = (tab: Tab) => {
    if (tab === "today") return todayCount;
    if (tab === "all") return goals.filter(g => g.status === "active").length;
    const filtered = filterGoals(tab);
    return filtered.length;
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-card text-muted-foreground hover:text-white transition-colors"
            data-testid="button-back-from-goals"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white" data-testid="text-goals-title">{t("goals_title")}</h1>
            <p className="text-xs text-muted-foreground">{t("goals_subtitle")}</p>
          </div>
        </div>
        <Button
          data-testid="button-create-goal"
          onClick={() => { setCreateType("task"); setShowCreateForm(true); }}
          size="sm"
          className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-1" /> {t("goals_new")}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pb-3 overflow-x-auto scrollbar-none">
        {TABS.map(tab => {
          const count = countFor(tab.id);
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              data-testid={`tab-${tab.id}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-white hover:bg-card"
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {t(`goals_tab_${tab.id}`)}
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  isActive ? "bg-primary/30 text-primary" : "bg-white/10 text-muted-foreground"
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-3 overflow-hidden"
          >
            <CreateGoalForm
              defaultType={createType}
              onSubmit={(data) => createGoal.mutate(data)}
              onCancel={() => setShowCreateForm(false)}
              isLoading={createGoal.isPending}
              error={createGoal.error?.message}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal list */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : tabGoals.length === 0 && !showCreateForm ? (
          <EmptyState tab={activeTab} onAdd={(type) => { setCreateType(type); setShowCreateForm(true); }} />
        ) : (
          <>
            <AnimatePresence>
              {tabGoals.map((goal) => (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <GoalCard
                    goal={goal}
                    onUpdate={(data) => updateGoal.mutate({ goalId: goal.id, ...data })}
                    onDelete={() => deleteGoal.mutate(goal.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Completed section (only in "all" tab) */}
            {activeTab === "all" && completedGoals.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" /> {t("goals_completed")} ({completedGoals.length})
                </h3>
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onUpdate={(data) => updateGoal.mutate({ goalId: goal.id, ...data })}
                    onDelete={() => deleteGoal.mutate(goal.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd: (type: GoalType) => void }) {
  const { t } = useLanguage();
  const configs: Record<Tab, { icon: React.ElementType; heading: string; sub: string; cta: string; type: GoalType }> = {
    today: {
      icon: Clock,
      heading: t("goals_empty_today_h"),
      sub: t("goals_empty_today_s"),
      cta: t("goals_empty_today_cta"),
      type: "task",
    },
    tasks: {
      icon: ListTodo,
      heading: t("goals_empty_tasks_h"),
      sub: t("goals_empty_tasks_s"),
      cta: t("goals_empty_tasks_cta"),
      type: "task",
    },
    reminders: {
      icon: AlarmClock,
      heading: t("goals_empty_remind_h"),
      sub: t("goals_empty_remind_s"),
      cta: t("goals_empty_remind_cta"),
      type: "reminder",
    },
    habits: {
      icon: Repeat,
      heading: t("goals_empty_habits_h"),
      sub: t("goals_empty_habits_s"),
      cta: t("goals_empty_habits_cta"),
      type: "habit",
    },
    intentions: {
      icon: Lightbulb,
      heading: t("goals_empty_intent_h"),
      sub: t("goals_empty_intent_s"),
      cta: t("goals_empty_intent_cta"),
      type: "intention",
    },
    all: {
      icon: Target,
      heading: t("goals_empty_all_h"),
      sub: t("goals_empty_all_s"),
      cta: t("goals_empty_all_cta"),
      type: "task",
    },
  };
  const c = configs[tab];
  const Icon = c.icon;

  return (
    <div className="text-center py-14 space-y-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-white">{c.heading}</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{c.sub}</p>
      </div>
      <Button
        data-testid="button-create-first-goal"
        onClick={() => onAdd(c.type)}
        size="sm"
        className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl"
      >
        <Plus className="w-4 h-4 mr-1" /> {c.cta}
      </Button>
    </div>
  );
}

// ─── Goal Card ───────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onUpdate,
  onDelete,
}: {
  goal: UserGoal;
  onUpdate: (data: Partial<UserGoal>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = TYPE_META[goal.goalType] || TYPE_META.task;
  const TypeIcon = meta.icon;
  const isCompleted = goal.status === "completed";

  const dueDateText = goal.goalType === "task" ? formatDate(goal.dueDate) : null;
  const reminderText = goal.goalType === "reminder"
    ? (goal.reminderAt ? `${formatDate(goal.reminderAt)} ${formatTime(goal.reminderAt)}` : null)
    : null;
  const dueSoon = goal.dueDate && isOverdue(goal.dueDate) && !isCompleted;
  const reminderDue = goal.reminderAt && isOverdue(goal.reminderAt) && !goal.reminderFired && !isCompleted;

  return (
    <div
      data-testid={`card-goal-${goal.id}`}
      className={`bg-card/50 backdrop-blur-sm rounded-2xl border p-4 space-y-2.5 transition-opacity ${
        isCompleted ? "opacity-60 border-white/5" : `${meta.border}`
      }`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Type badge */}
        <div className={`mt-0.5 p-1.5 rounded-lg ${meta.bg} shrink-0`}>
          <TypeIcon className={`w-3.5 h-3.5 ${meta.color}`} />
        </div>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <h3
            className={`font-medium text-sm leading-snug ${isCompleted ? "line-through text-muted-foreground" : "text-white"}`}
            data-testid={`text-goal-title-${goal.id}`}
          >
            {goal.title}
          </h3>

          {/* Inline meta chips */}
          <div className="flex items-center gap-2 flex-wrap mt-1">
            {/* Type label */}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>

            {/* Due date — task */}
            {dueDateText && (
              <span className={`text-[10px] flex items-center gap-1 ${dueSoon ? "text-red-400" : "text-muted-foreground"}`}>
                <Calendar className="w-2.5 h-2.5" />
                {dueSoon ? "Overdue · " : ""}{dueDateText}
              </span>
            )}

            {/* Reminder time */}
            {reminderText && (
              <span className={`text-[10px] flex items-center gap-1 ${reminderDue ? "text-purple-400" : "text-muted-foreground"}`}>
                <Bell className="w-2.5 h-2.5" />
                {reminderText}
                {goal.reminderFired && <span className="text-green-400 ml-0.5">· sent</span>}
              </span>
            )}

            {/* Streak (habits) */}
            {goal.goalType === "habit" && goal.streakCount > 0 && (
              <span className="text-[10px] flex items-center gap-1 text-amber-400" data-testid={`text-streak-${goal.id}`}>
                <Flame className="w-2.5 h-2.5" />
                {goal.streakCount}d streak
              </span>
            )}

            {/* Recurrence */}
            {goal.recurrence && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Repeat className="w-2.5 h-2.5" />
                {goal.recurrence}
              </span>
            )}

            {/* People */}
            {goal.peopleInvolved && goal.peopleInvolved.length > 0 && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Users className="w-2.5 h-2.5" />
                {goal.peopleInvolved.join(", ")}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!isCompleted && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => onUpdate({ status: "completed", isCompleted: true } as any)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-colors"
              title="Mark done"
              data-testid={`button-complete-goal-${goal.id}`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setExpanded(e => !e)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/5 transition-colors"
              title="More options"
              data-testid={`button-expand-goal-${goal.id}`}
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          </div>
        )}
        {isCompleted && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Delete"
            data-testid={`button-delete-goal-${goal.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pt-1 border-t border-white/5 space-y-2">
              {goal.description && (
                <p className="text-xs text-muted-foreground">{goal.description}</p>
              )}

              {/* Habit progress bar */}
              {goal.goalType === "habit" && goal.dailyTargetMinutes && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Today's practice</span>
                    <span>{goal.stats.todayMinutes}/{goal.dailyTargetMinutes} min</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (goal.stats.todayMinutes / goal.dailyTargetMinutes) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Steps */}
              {goal.steps.length > 0 && (
                <div className="space-y-1">
                  {goal.steps.map(step => (
                    <div key={step.id} className="flex items-center gap-2 text-xs">
                      <div className={`w-3 h-3 rounded-full border shrink-0 ${
                        step.status === "completed" ? "bg-green-500 border-green-500" : "border-white/20"
                      }`} />
                      <span className={step.status === "completed" ? "text-muted-foreground line-through" : "text-white/80"}>
                        {step.description}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Delete button in expanded */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                  data-testid={`button-delete-expanded-${goal.id}`}
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Create Form ─────────────────────────────────────────────────────────────

function CreateGoalForm({
  defaultType,
  onSubmit,
  onCancel,
  isLoading,
  error,
}: {
  defaultType: GoalType;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
  error?: string;
}) {
  const { t } = useLanguage();
  const [goalType, setGoalType] = useState<GoalType>(defaultType);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [recurrence, setRecurrence] = useState<string>("");
  const [peopleText, setPeopleText] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState("30");

  const TYPE_PROMPTS: Record<GoalType, string> = {
    task: "e.g., Message Priya about the project, Submit the report",
    habit: "e.g., Meditate 10 minutes, Read before bed",
    reminder: "e.g., Call the bank, Take medicines",
    intention: "e.g., Be more patient with family, Spend less time scrolling",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const people = peopleText.split(/[,،]+/).map(s => s.trim()).filter(Boolean);

    let dueDateISO: string | undefined;
    if (dueDate) {
      const dt = dueTime ? `${dueDate}T${dueTime}` : `${dueDate}T23:59`;
      dueDateISO = new Date(dt).toISOString();
    }

    let reminderAtISO: string | undefined;
    if (reminderDate && reminderTime) {
      reminderAtISO = new Date(`${reminderDate}T${reminderTime}`).toISOString();
    }

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      goalType,
      dueDate: dueDateISO,
      reminderAt: reminderAtISO,
      recurrence: recurrence || null,
      peopleInvolved: people.length > 0 ? people : undefined,
      dailyTargetMinutes: goalType === "habit" ? (parseInt(dailyMinutes) || 30) : undefined,
    });
  };

  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card/60 backdrop-blur-sm rounded-2xl border border-primary/20 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> {t("goals_form_new")}
        </h3>
        <button type="button" onClick={onCancel} className="text-muted-foreground hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Goal type selector */}
      <div className="grid grid-cols-4 gap-1.5">
        {(["task", "reminder", "habit", "intention"] as GoalType[]).map(t => {
          const m = TYPE_META[t];
          const Icon = m.icon;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setGoalType(t)}
              data-testid={`type-select-${t}`}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-medium transition-all ${
                goalType === t
                  ? `${m.bg} ${m.border} ${m.color}`
                  : "border-white/5 text-muted-foreground hover:border-white/10 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Title */}
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">{t("goals_form_what")}</label>
        <Input
          data-testid="input-goal-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={TYPE_PROMPTS[goalType]}
          className="bg-background/50 border-white/10 text-white text-sm"
          autoFocus
        />
      </div>

      {/* Task: due date */}
      {goalType === "task" && (
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {t("goals_form_due")}</label>
            <Input
              type="date"
              data-testid="input-due-date"
              value={dueDate}
              min={todayISO}
              onChange={e => setDueDate(e.target.value)}
              className="bg-background/50 border-white/10 text-white text-sm"
            />
          </div>
          {dueDate && (
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">{t("goals_form_time")}</label>
              <Input
                type="time"
                data-testid="input-due-time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="bg-background/50 border-white/10 text-white text-sm w-28"
              />
            </div>
          )}
        </div>
      )}

      {/* Reminder: date + time */}
      {goalType === "reminder" && (
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1"><Bell className="w-3 h-3" /> {t("goals_form_remind")}</label>
            <Input
              type="date"
              data-testid="input-reminder-date"
              value={reminderDate}
              min={todayISO}
              onChange={e => setReminderDate(e.target.value)}
              className="bg-background/50 border-white/10 text-white text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground">{t("goals_form_at")}</label>
            <Input
              type="time"
              data-testid="input-reminder-time"
              value={reminderTime}
              onChange={e => setReminderTime(e.target.value)}
              className="bg-background/50 border-white/10 text-white text-sm w-28"
            />
          </div>
        </div>
      )}

      {/* Habit: recurrence + daily minutes */}
      {goalType === "habit" && (
        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1"><Repeat className="w-3 h-3" /> {t("goals_form_freq")}</label>
            <select
              data-testid="select-recurrence"
              value={recurrence}
              onChange={e => setRecurrence(e.target.value)}
              className="w-full bg-background/50 border border-white/10 rounded-md text-white text-sm p-2 focus:outline-none focus:border-primary/50"
            >
              <option value="daily">{t("goals_recur_daily")}</option>
              <option value="weekdays">{t("goals_recur_weekdays")}</option>
              <option value="weekly">{t("goals_recur_weekly")}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {t("goals_form_min")}</label>
            <Input
              type="number"
              data-testid="input-daily-minutes"
              value={dailyMinutes}
              onChange={e => setDailyMinutes(e.target.value)}
              min="5" max="240"
              className="bg-background/50 border-white/10 text-white text-sm w-20"
            />
          </div>
        </div>
      )}

      {/* People involved */}
      {(goalType === "task" || goalType === "reminder") && (
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> {t("goals_form_people")}
          </label>
          <Input
            data-testid="input-people"
            value={peopleText}
            onChange={e => setPeopleText(e.target.value)}
            placeholder="e.g., Priya, Rahul"
            className="bg-background/50 border-white/10 text-white text-sm"
          />
        </div>
      )}

      {/* Note / description */}
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">{t("goals_form_context")}</label>
        <Input
          data-testid="input-goal-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder={t("goals_form_context_ph")}
          className="bg-background/50 border-white/10 text-white text-sm"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex gap-2 justify-end pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="text-muted-foreground"
          data-testid="button-cancel-goal"
        >
          {t("goals_form_cancel")}
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!title.trim() || isLoading}
          className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl"
          data-testid="button-submit-goal"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("goals_form_save")}
        </Button>
      </div>
    </form>
  );
}
