import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, MessageSquare, Mic, Brain, TrendingUp, MapPin,
  RefreshCw, Crown, Zap, Search, ChevronUp, ChevronDown,
  CheckCircle2, Circle, Clock,
} from "lucide-react";

function getAdminToken() {
  return localStorage.getItem("arya_admin_token") || "";
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function planBadge(plan: string) {
  if (plan === "pro") return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">Pro</Badge>;
  if (plan === "core") return <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">Core</Badge>;
  return <Badge className="bg-white/10 text-gray-400 border-white/10 text-xs">Free</Badge>;
}

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  plan: string;
  city: string | null;
  occupation: string | null;
  life_stage: string | null;
  is_active: boolean;
  onboarding_complete: boolean;
  created_at: string;
  last_login_at: string | null;
  total_chats: number;
  total_voice_minutes: string;
  total_deep_reasoning: number;
  total_llm_calls: number;
  total_cost_inr: string;
  total_goals: number;
}

interface AnalyticsData {
  topQueries: { query: string; domain: string; query_count: number; avg_confidence: string; last_seen: string }[];
  featureUsage: {
    total_text_chats: number;
    total_voice_minutes: string;
    total_deep_reasoning: number;
    total_llm_calls: number;
    total_cost_inr: string;
    active_days: number;
  };
  cityStats: { city: string; user_count: number }[];
  planStats: { plan: string; count: number }[];
  recentSignups: { day: string; signups: number }[];
}

type SortKey = "name" | "plan" | "created_at" | "last_login_at" | "total_chats" | "total_cost_inr";

export default function UserAnalytics() {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery<{ users: UserRow[]; total: number }>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/admin/analytics"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics", {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const refetch = () => { refetchUsers(); refetchAnalytics(); };
  const isLoading = usersLoading || analyticsLoading;

  const users = usersData?.users || [];
  const fu = analytics?.featureUsage;

  const filtered = users
    .filter(u => {
      const q = search.toLowerCase();
      return !q || u.name.toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q) ||
        (u.phone || "").includes(q) || (u.city || "").toLowerCase().includes(q) || (u.occupation || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      let av: any = a[sortKey] ?? "";
      let bv: any = b[sortKey] ?? "";
      if (sortKey === "total_chats" || sortKey === "total_cost_inr") {
        av = parseFloat(String(av)) || 0;
        bv = parseFloat(String(bv)) || 0;
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="w-3 h-3 inline-block opacity-30">↕</span>;
    return sortAsc ? <ChevronUp className="w-3 h-3 inline-block" /> : <ChevronDown className="w-3 h-3 inline-block" />;
  }

  const totalTextChats = fu?.total_text_chats || 0;
  const totalVoice = parseFloat(fu?.total_voice_minutes || "0");
  const totalDeep = fu?.total_deep_reasoning || 0;
  const totalUsage = totalTextChats + totalVoice + totalDeep || 1;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-white" data-testid="text-analytics-title">User Analytics</h2>
          <p className="text-muted-foreground mt-1">Who's using ARYA, what they ask, and how they engage</p>
        </div>
        <Button variant="outline" className="border-border bg-background/50 gap-2" onClick={refetch} data-testid="button-refresh-analytics">
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-total-users">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="w-4 h-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-white">{usersData?.total ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {users.filter(u => u.last_login_at && Date.now() - new Date(u.last_login_at).getTime() < 7 * 86400000).length} active this week
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-total-chats">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Chats</CardTitle>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-white">{totalTextChats}</div>
            <p className="text-xs text-muted-foreground mt-1">{totalDeep} deep reasoning</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-voice-minutes">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Voice Minutes</CardTitle>
            <Mic className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-white">{totalVoice.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">mins total used</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total AI Cost</CardTitle>
            <Zap className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-amber-300">₹{parseFloat(fu?.total_cost_inr || "0").toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">across all users</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Feature Usage + Plans + Cities ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-feature-usage">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-400" /> Feature Usage Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Text Chat", value: totalTextChats, color: "bg-cyan-500", icon: <MessageSquare className="w-3.5 h-3.5" /> },
              { label: "Voice", value: totalVoice, color: "bg-purple-500", icon: <Mic className="w-3.5 h-3.5" /> },
              { label: "Deep Reasoning", value: totalDeep, color: "bg-amber-500", icon: <Brain className="w-3.5 h-3.5" /> },
            ].map(item => (
              <div key={item.label} data-testid={`stat-feature-${item.label.toLowerCase().replace(/\s/g, "-")}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">{item.icon}{item.label}</span>
                  <span className="text-xs font-mono text-white">{typeof item.value === "number" ? item.value.toFixed(item.value % 1 !== 0 ? 1 : 0) : item.value}</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${Math.min((Number(item.value) / totalUsage) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-plan-breakdown">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> Plans
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics?.planStats?.length ? analytics.planStats.map(p => (
              <div key={p.plan} className="flex items-center justify-between" data-testid={`stat-plan-${p.plan}`}>
                <span className="text-sm text-muted-foreground capitalize">{p.plan}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${(p.count / (usersData?.total || 1)) * 100}%` }} />
                  </div>
                  <span className="text-sm font-mono text-white w-6 text-right">{p.count}</span>
                </div>
              </div>
            )) : <div className="text-sm text-muted-foreground">No data yet</div>}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-city-breakdown">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" /> Top Cities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics?.cityStats?.length ? analytics.cityStats.map(c => (
              <div key={c.city} className="flex items-center justify-between" data-testid={`stat-city-${c.city}`}>
                <span className="text-sm text-muted-foreground">{c.city}</span>
                <span className="text-sm font-mono text-white">{c.user_count}</span>
              </div>
            )) : <div className="text-sm text-muted-foreground italic">No city data yet — users can add city in their profile</div>}
          </CardContent>
        </Card>
      </div>

      {/* ── Top Questions ── */}
      <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-top-questions">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" /> Most Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analytics?.topQueries?.length ? (
            <div className="space-y-2">
              {analytics.topQueries.map((q, i) => (
                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/5 hover:bg-white/8 transition-colors" data-testid={`row-query-${i}`}>
                  <span className="text-xs font-mono text-muted-foreground w-5 pt-0.5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white capitalize truncate">{q.query}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{q.domain} · {timeAgo(q.last_seen)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-cyan-300">{q.query_count}×</div>
                    <div className="text-xs text-muted-foreground">{(parseFloat(q.avg_confidence) * 100).toFixed(0)}% conf</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic py-4 text-center">No query data yet — questions will appear here as users chat</div>
          )}
        </CardContent>
      </Card>

      {/* ── User List ── */}
      <Card className="bg-card/50 border-border backdrop-blur-sm" data-testid="card-user-list">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> All Users ({filtered.length})
            </CardTitle>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                data-testid="input-user-search"
                type="text"
                placeholder="Search name, email, city…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 w-52"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-muted-foreground">
                  {([
                    ["name", "Name"],
                    ["plan", "Plan"],
                    ["created_at", "Joined"],
                    ["last_login_at", "Last Active"],
                    ["total_chats", "Chats"],
                    ["total_cost_inr", "Cost (₹)"],
                  ] as [SortKey, string][]).map(([k, label]) => (
                    <th key={k} className="text-left px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors select-none" onClick={() => toggleSort(k)} data-testid={`th-sort-${k}`}>
                      {label} <SortIcon k={k} />
                    </th>
                  ))}
                  <th className="text-left px-4 py-3 font-medium">Location / Role</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted-foreground py-8">No users found</td></tr>
                )}
                {filtered.map(u => (
                  <>
                    <tr
                      key={u.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                      data-testid={`row-user-${u.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email || u.phone || "—"}</div>
                      </td>
                      <td className="px-4 py-3">{planBadge(u.plan)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{timeAgo(u.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{timeAgo(u.last_login_at)}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-cyan-300">{u.total_chats}</span>
                        {u.total_voice_minutes && parseFloat(u.total_voice_minutes) > 0 && (
                          <span className="text-xs text-muted-foreground ml-1">+ {parseFloat(u.total_voice_minutes).toFixed(0)}m voice</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-amber-300 text-xs">₹{parseFloat(u.total_cost_inr || "0").toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{[u.city, u.occupation].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-4 py-3">
                        {u.is_active
                          ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3 h-3" /> Active</span>
                          : <span className="flex items-center gap-1 text-xs text-red-400"><Circle className="w-3 h-3" /> Inactive</span>
                        }
                      </td>
                    </tr>
                    {expandedUser === u.id && (
                      <tr key={`${u.id}-detail`} className="bg-white/3 border-b border-white/5">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div><span className="text-muted-foreground">Life Stage</span><div className="text-white mt-0.5 capitalize">{u.life_stage || "—"}</div></div>
                            <div><span className="text-muted-foreground">Goals Created</span><div className="text-white mt-0.5">{u.total_goals}</div></div>
                            <div><span className="text-muted-foreground">Deep Reasoning</span><div className="text-white mt-0.5">{u.total_deep_reasoning}</div></div>
                            <div><span className="text-muted-foreground">Onboarded</span><div className="text-white mt-0.5">{u.onboarding_complete ? "Yes" : "No"}</div></div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
