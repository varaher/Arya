import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserAuth } from "@/lib/user-auth";
import UserAuth from "@/pages/UserAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Target,
  Plus,
  ChevronRight,
  Flame,
  Clock,
  CheckCircle2,
  Pause,
  Trash2,
  ArrowLeft,
  Mic,
  Trophy,
  Calendar,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";

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
  status: string;
  priority: string;
  progress: number;
  dailyTargetMinutes: number | null;
  reminderTime: string | null;
  streakCount: number;
  lastActivityAt: string | null;
  steps: GoalStep[];
  stats: GoalStats;
  createdAt: string;
}

export default function UserGoals() {
  const { isLoggedIn, isLoading: authLoading, user, token } = useUserAuth();
  const [, setLocation] = useLocation();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();

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

function GoalsView({ token, userName, onBack }: { token: string; userName: string; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);

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
    mutationFn: async (data: { title: string; description?: string; dailyTargetMinutes?: number; steps?: string[] }) => {
      const res = await fetch("/api/user/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-goals"] });
      setShowCreateForm(false);
    },
  });

  const updateGoal = useMutation({
    mutationFn: async ({ goalId, ...data }: { goalId: string; status?: string }) => {
      const res = await fetch(`/api/user/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update goal");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-goals"] });
    },
  });

  const activeGoals = goals.filter(g => g.status === "active");
  const completedGoals = goals.filter(g => g.status === "completed");

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-card text-muted-foreground hover:text-white" data-testid="button-back-from-goals">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white" data-testid="text-goals-title">My Goals</h1>
            <p className="text-xs text-muted-foreground">Track your progress with ARYA</p>
          </div>
        </div>
        <Button
          data-testid="button-create-goal"
          onClick={() => setShowCreateForm(true)}
          size="sm"
          className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl"
        >
          <Plus className="w-4 h-4 mr-1" /> New Goal
        </Button>
      </div>

      {showCreateForm && (
        <CreateGoalForm
          onSubmit={(data) => createGoal.mutate(data)}
          onCancel={() => setShowCreateForm(false)}
          isLoading={createGoal.isPending}
        />
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : activeGoals.length === 0 && !showCreateForm ? (
        <div className="text-center py-16 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20">
            <Target className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">No goals yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Set a goal and talk to ARYA daily to achieve it!
            </p>
          </div>
          <Button
            data-testid="button-create-first-goal"
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1" /> Create Your First Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {activeGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onUpdate={(data) => updateGoal.mutate({ goalId: goal.id, ...data })} />
          ))}

          {completedGoals.length > 0 && (
            <div className="pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Completed ({completedGoals.length})
              </h3>
              {completedGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onUpdate={(data) => updateGoal.mutate({ goalId: goal.id, ...data })} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GoalCard({ goal, onUpdate }: { goal: UserGoal; onUpdate: (data: any) => void }) {
  const isCompleted = goal.status === "completed";

  return (
    <div
      data-testid={`card-goal-${goal.id}`}
      className={`bg-card/50 backdrop-blur-sm rounded-2xl border p-4 space-y-3 ${
        isCompleted ? "border-amber-500/20 opacity-75" : "border-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-white text-sm" data-testid={`text-goal-title-${goal.id}`}>{goal.title}</h3>
          {goal.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
          )}
        </div>
        {!isCompleted && (
          <div className="flex gap-1">
            <button
              onClick={() => onUpdate({ status: "completed" })}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-500/10"
              title="Mark complete"
              data-testid={`button-complete-goal-${goal.id}`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onUpdate({ status: "paused" })}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10"
              title="Pause goal"
              data-testid={`button-pause-goal-${goal.id}`}
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs">
        {goal.streakCount > 0 && (
          <div className="flex items-center gap-1 text-amber-400" data-testid={`text-streak-${goal.id}`}>
            <Flame className="w-3.5 h-3.5" />
            <span className="font-medium">{goal.streakCount} day streak</span>
          </div>
        )}
        {goal.dailyTargetMinutes && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>{goal.stats.todayMinutes}/{goal.dailyTargetMinutes} min today</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Mic className="w-3.5 h-3.5" />
          <span>{goal.stats.totalSessions} sessions</span>
        </div>
      </div>

      {goal.dailyTargetMinutes && !isCompleted && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Today's progress</span>
            <span>{Math.min(100, Math.round((goal.stats.todayMinutes / goal.dailyTargetMinutes) * 100))}%</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (goal.stats.todayMinutes / goal.dailyTargetMinutes) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {goal.steps.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {goal.steps.map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-xs">
              <div className={`w-3 h-3 rounded-full border ${
                step.status === "completed" ? "bg-green-500 border-green-500" : "border-white/20"
              }`} />
              <span className={step.status === "completed" ? "text-muted-foreground line-through" : "text-white/80"}>
                {step.description}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateGoalForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: { title: string; description?: string; dailyTargetMinutes?: number; steps?: string[] }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState("30");
  const [stepsText, setStepsText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const steps = stepsText.split("\n").map(s => s.trim()).filter(Boolean);
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      dailyTargetMinutes: parseInt(dailyMinutes) || undefined,
      steps: steps.length > 0 ? steps : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card/50 backdrop-blur-sm rounded-2xl border border-primary/20 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" /> Create New Goal
      </h3>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">What do you want to achieve?</label>
        <Input
          data-testid="input-goal-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Improve my English communication"
          className="bg-background/50 border-white/10 text-white text-sm"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Description (optional)</label>
        <Input
          data-testid="input-goal-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Practice speaking with ARYA every day"
          className="bg-background/50 border-white/10 text-white text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <Mic className="w-3 h-3" /> Daily voice practice target (minutes)
        </label>
        <Input
          data-testid="input-goal-daily-minutes"
          type="number"
          value={dailyMinutes}
          onChange={(e) => setDailyMinutes(e.target.value)}
          placeholder="30"
          min="5"
          max="240"
          className="bg-background/50 border-white/10 text-white text-sm w-32"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground">Steps (one per line, optional)</label>
        <textarea
          data-testid="input-goal-steps"
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          placeholder={"Week 1: Basic introductions\nWeek 2: Describe daily routine\nWeek 3: Discuss current events"}
          rows={3}
          className="w-full bg-background/50 border border-white/10 rounded-md text-white text-sm p-2 resize-none placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        />
      </div>

      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground" data-testid="button-cancel-goal">
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={!title.trim() || isLoading}
          className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white rounded-xl"
          data-testid="button-submit-goal"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Goal"}
        </Button>
      </div>
    </form>
  );
}
