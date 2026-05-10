import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  BrainCircuit, 
  Database, 
  Zap,
  Users,
  DollarSign,
  MessageSquare,
  Mic,
  Shield,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  MessageCircleWarning,
  Bug,
  Lightbulb,
  FileText,
  Circle,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import { useState } from "react";

interface FeedbackItem {
  id: string;
  userId: string | null;
  category: string;
  description: string;
  page: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

interface CostDashboard {
  date: string;
  totalLlmCalls: number;
  totalTextChats: number;
  totalVoiceMinutes: string;
  totalDeepReasoning: number;
  activeUsers: number;
  avgChatsPerUser: number;
  estimatedCostInr: string;
  costCapInr: string;
  costPerActiveUser: number;
  isDisabled: boolean;
  systemLlmLimit: number;
  limits: {
    loggedIn: { textChatsPerDay: number; voiceMinutesPerDay: number; deepReasoningPerDay: number; llmCallsPerMinute: number };
    anonymous: { textChatsPerDay: number; voiceMinutesPerDay: number };
    system: { dailyLlmCalls: number };
  };
}

function getAdminToken() {
  return localStorage.getItem("arya_admin_token") || "";
}

const CATEGORY_META: Record<string, { label: string; icon: React.FC<any>; color: string }> = {
  bug:         { label: "Bug",            icon: Bug,                    color: "text-red-400" },
  feature:     { label: "Feature Request",icon: Lightbulb,              color: "text-amber-400" },
  content:     { label: "Content Quality",icon: FileText,               color: "text-cyan-400" },
  performance: { label: "Performance",    icon: Zap,                    color: "text-purple-400" },
  other:       { label: "Other",          icon: MessageCircleWarning,   color: "text-slate-400" },
};

const STATUS_META: Record<string, { label: string; icon: React.FC<any>; color: string }> = {
  open:        { label: "Open",        icon: Circle,       color: "text-amber-400" },
  in_progress: { label: "In Progress", icon: Clock,        color: "text-cyan-400" },
  resolved:    { label: "Resolved",    icon: CheckCircle2, color: "text-emerald-400" },
  closed:      { label: "Closed",      icon: X,            color: "text-slate-500" },
};

function FeedbackPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery<{ items: FeedbackItem[]; total: number }>({
    queryKey: ["/api/admin/feedback"],
    queryFn: async () => {
      const res = await fetch("/api/admin/feedback", {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status?: string; adminNotes?: string }) => {
      await fetch(`/api/admin/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ status, adminNotes }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/feedback"] }),
  });

  const items = data?.items ?? [];
  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  const counts = {
    all: items.length,
    open: items.filter(i => i.status === "open").length,
    in_progress: items.filter(i => i.status === "in_progress").length,
    resolved: items.filter(i => i.status === "resolved").length,
  };

  return (
    <div className="space-y-5" data-testid="panel-feedback">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-display font-bold text-white">User Reports</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{data?.total ?? 0} total reports from users</p>
        </div>
        <div className="flex gap-1.5 text-xs">
          {(["all", "open", "in_progress", "resolved"] as const).map(s => (
            <button
              key={s}
              data-testid={`filter-feedback-${s}`}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full border transition-colors ${filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-white"}`}
            >
              {s === "all" ? `All (${counts.all})` : s === "in_progress" ? `In Progress (${counts.in_progress})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${counts[s as keyof typeof counts]})`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading reports…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No reports in this category.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const cat = CATEGORY_META[item.category] ?? CATEGORY_META.other;
            const st = STATUS_META[item.status] ?? STATUS_META.open;
            const CatIcon = cat.icon;
            const StIcon = st.icon;
            const isOpen = expandedId === item.id;
            return (
              <div
                key={item.id}
                data-testid={`card-feedback-${item.id}`}
                className="bg-card/50 border border-border rounded-xl overflow-hidden"
              >
                <button
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors"
                  onClick={() => {
                    setExpandedId(isOpen ? null : item.id);
                    if (!notes[item.id]) setNotes(n => ({ ...n, [item.id]: item.adminNotes ?? "" }));
                  }}
                >
                  <div className={`mt-0.5 shrink-0 ${cat.color}`}>
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-white">{cat.label}</span>
                      {item.page && <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-1.5 py-0.5 rounded">{item.page}</span>}
                      <span className={`flex items-center gap-1 text-[10px] ${st.color}`}>
                        <StIcon className="w-3 h-3" />{st.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">{item.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(item.createdAt).toLocaleString()} {item.userId ? `· User ${item.userId.slice(0, 8)}` : "· Anonymous"}</p>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
                    <p className="text-sm text-white/80 leading-relaxed">{item.description}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs text-muted-foreground">Update status:</span>
                      {Object.entries(STATUS_META).map(([val, meta]) => {
                        const SIcon = meta.icon;
                        return (
                          <button
                            key={val}
                            data-testid={`status-btn-${val}-${item.id}`}
                            onClick={() => updateMutation.mutate({ id: item.id, status: val })}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${item.status === val ? "bg-primary/20 border-primary text-primary" : "border-border text-muted-foreground hover:text-white"}`}
                          >
                            <SIcon className="w-3 h-3" />{meta.label}
                          </button>
                        );
                      })}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Admin notes</label>
                      <textarea
                        data-testid={`input-admin-notes-${item.id}`}
                        rows={2}
                        className="w-full bg-background/50 border border-white/10 rounded-lg text-white text-sm px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                        placeholder="Internal notes (not shown to user)"
                        value={notes[item.id] ?? ""}
                        onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                      />
                      <Button
                        data-testid={`button-save-notes-${item.id}`}
                        size="sm"
                        className="mt-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                        onClick={() => updateMutation.mutate({ id: item.id, adminNotes: notes[item.id] })}
                        disabled={updateMutation.isPending}
                      >
                        Save Notes
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [updatingCap, setUpdatingCap] = useState(false);
  const [newCap, setNewCap] = useState("");

  const { data: costData, isLoading, refetch } = useQuery<CostDashboard>({
    queryKey: ["/api/admin/cost-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/cost-dashboard", {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const updateCostCap = async () => {
    if (!newCap || isNaN(Number(newCap))) return;
    setUpdatingCap(true);
    try {
      await fetch("/api/admin/cost-cap", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify({ costCapInr: Number(newCap) }),
      });
      setNewCap("");
      refetch();
    } catch {}
    setUpdatingCap(false);
  };

  const cost = costData;
  const costUsed = cost ? parseFloat(cost.estimatedCostInr || "0") : 0;
  const costCap = cost ? parseFloat(cost.costCapInr || "500") : 500;
  const costPercent = costCap > 0 ? Math.min((costUsed / costCap) * 100, 100) : 0;
  const llmPercent = cost ? Math.min((cost.totalLlmCalls / cost.systemLlmLimit) * 100, 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-white" data-testid="text-dashboard-title">Cost & Usage Dashboard</h2>
          <p className="text-muted-foreground mt-1">Real-time cost tracking and usage limits for today ({cost?.date || "loading..."})</p>
        </div>
        <Button variant="outline" className="border-border bg-background/50 backdrop-blur gap-2" onClick={() => refetch()} data-testid="button-refresh-dashboard">
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {cost?.isDisabled && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3" data-testid="text-cost-alert">
          <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-red-300">AI Features Disabled</div>
            <div className="text-xs text-red-400/80">Daily cost cap exceeded. All AI features are paused until tomorrow or until you increase the cap.</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-total-cost">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimated Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-amber-300">{isLoading ? "..." : `₹${costUsed.toFixed(2)}`}</div>
            <div className="mt-2 bg-white/5 rounded-full h-2 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${costPercent > 80 ? "bg-red-500" : costPercent > 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${costPercent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">of ₹{costCap} daily cap ({costPercent.toFixed(0)}%)</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-llm-calls">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">LLM Calls</CardTitle>
            <Zap className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{isLoading ? "..." : cost?.totalLlmCalls || 0}</div>
            <div className="mt-2 bg-white/5 rounded-full h-2 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${llmPercent > 80 ? "bg-red-500" : "bg-cyan-500"}`} style={{ width: `${llmPercent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">of {cost?.systemLlmLimit || 0} system limit ({llmPercent.toFixed(0)}%)</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-active-users">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <Users className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{isLoading ? "..." : cost?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ₹{cost?.costPerActiveUser?.toFixed(2) || "0"} per active user
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-avg-chats">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Chats/User</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{isLoading ? "..." : cost?.avgChatsPerUser || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">across all active users today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 bg-card/50 border-border backdrop-blur-sm" data-testid="card-usage-breakdown">
          <CardHeader>
            <CardTitle>Usage Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-background/40 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-muted-foreground">Text Chats</span>
                </div>
                <div className="text-xl font-bold font-display" data-testid="text-total-chats">{cost?.totalTextChats || 0}</div>
                <div className="text-xs text-muted-foreground mt-0.5">₹1.5 each</div>
              </div>
              <div className="p-4 rounded-xl bg-background/40 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-muted-foreground">Voice Minutes</span>
                </div>
                <div className="text-xl font-bold font-display" data-testid="text-voice-minutes">{parseFloat(cost?.totalVoiceMinutes || "0").toFixed(1)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">₹2 per min</div>
              </div>
              <div className="p-4 rounded-xl bg-background/40 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-muted-foreground">Deep Reasoning</span>
                </div>
                <div className="text-xl font-bold font-display" data-testid="text-deep-reasoning">{cost?.totalDeepReasoning || 0}</div>
                <div className="text-xs text-muted-foreground mt-0.5">₹3 each</div>
              </div>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-background/40 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">Per-User Limits</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Logged-in text chats/day</span>
                  <span className="font-mono text-white">{cost?.limits?.loggedIn?.textChatsPerDay || 30}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Voice minutes/day</span>
                  <span className="font-mono text-white">{cost?.limits?.loggedIn?.voiceMinutesPerDay || 20}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Deep reasoning/day</span>
                  <span className="font-mono text-white">{cost?.limits?.loggedIn?.deepReasoningPerDay || 10}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>LLM calls/minute</span>
                  <span className="font-mono text-white">{cost?.limits?.loggedIn?.llmCallsPerMinute || 10}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Anonymous chats/day</span>
                  <span className="font-mono text-white">{cost?.limits?.anonymous?.textChatsPerDay || 5}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>System daily LLM limit</span>
                  <span className="font-mono text-white">{cost?.limits?.system?.dailyLlmCalls || 2000}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-cost-cap-control">
          <CardHeader>
            <CardTitle>Cost Cap Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-background/40 border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Current Daily Cap</div>
              <div className="text-2xl font-bold font-display text-amber-300">₹{costCap}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {costPercent > 80 ? "Approaching limit" : "Within budget"}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Update Daily Cap (INR)</label>
              <div className="flex gap-2">
                <input
                  data-testid="input-cost-cap"
                  type="number"
                  placeholder="e.g. 500"
                  value={newCap}
                  onChange={e => setNewCap(e.target.value)}
                  className="flex-1 bg-background/50 border border-white/10 rounded-lg text-white text-sm px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
                <Button
                  data-testid="button-update-cap"
                  onClick={updateCostCap}
                  disabled={updatingCap || !newCap}
                  size="sm"
                  className="bg-primary text-primary-foreground"
                >
                  {updatingCap ? "..." : "Set"}
                </Button>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="text-xs font-medium text-white mb-2">Quick Links</div>
              {[
                { name: "Knowledge Graph", status: "Active", icon: Database },
                { name: "Voice Gateway", status: "Active", icon: Mic },
                { name: "Self-Learning", status: "Shadow Mode", icon: BrainCircuit },
                { name: "Beta Guard", status: "Enabled", icon: Shield },
              ].map((node, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <node.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-sm font-medium">{node.name}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${node.status === 'Active' || node.status === 'Enabled' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="text-xs text-muted-foreground">{node.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-feedback-panel">
        <CardContent className="pt-6">
          <FeedbackPanel />
        </CardContent>
      </Card>
    </div>
  );
}
