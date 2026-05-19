import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle, CheckCircle, XCircle, Lightbulb, BarChart3, Clock, Zap, Database, Activity, Star, Flag, Minus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LearningStats {
  totalQueries: number;
  knowledgeGaps: number;
  draftsCreated: number;
  draftsApproved: number;
  draftsRejected: number;
  draftsPending: number;
  topGaps: Array<{
    id: string;
    normalizedQuery: string;
    queryCount: number;
    domain: string;
    avgConfidence: string;
    isGap: boolean;
    lastSeen: string;
  }>;
}

interface CacheStats {
  totalCached: number;
  activeCached: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  avgMatchScore: number;
  topCachedResponses: Array<{
    id: string;
    originalQuery: string;
    positiveFeedbackCount: number;
    negativeFeedbackCount: number;
    servedCount: number;
    confidenceScore: string;
    domain: string;
    updatedAt: string;
  }>;
}

interface Draft {
  id: string;
  tenantId: string;
  domain: string;
  topic: string;
  content: string;
  tags: string[];
  sourceType: string;
  sourceTitle: string;
  confidenceScore: string;
  learnedFromQuery: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
}

interface QueryPattern {
  id: string;
  normalizedQuery: string;
  queryCount: number;
  domain: string;
  avgConfidence: string;
  isGap: boolean;
  lastSeen: string;
}

interface QualityEntry {
  id: string;
  query: string;
  score: number;
  status: 'golden' | 'neutral' | 'flagged';
  servedCount: number;
  positiveFeedbackCount: number;
  negativeFeedbackCount: number;
}

interface KnowledgeGap {
  id: string;
  trigger_query: string;
  failed_response: string;
  correction_hint?: string;
  auto_draft?: string;
  gap_category: string;
  frequency: number;
  quality_score_at_flag: number;
  status: 'draft_ready' | 'detected' | 'approved' | 'rejected';
  created_at: string;
}

interface QualityReport {
  total: number;
  golden: number;
  neutral: number;
  flagged: number;
  entries: QualityEntry[];
}

export default function SelfLearning() {
  const [activeTab, setActiveTab] = useState<'overview' | 'drafts' | 'patterns' | 'quality' | 'gaps'>('overview');
  const [gapFilter, setGapFilter] = useState<'all' | 'draft_ready' | 'detected'>('draft_ready');
  const [activeGap, setActiveGap] = useState<KnowledgeGap | null>(null);
  const [editedDraft, setEditedDraft] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery<LearningStats>({
    queryKey: ['/api/learning/stats'],
    queryFn: async () => {
      const res = await fetch('/api/learning/stats?tenant_id=varah');
      return res.json();
    },
    refetchInterval: 10000
  });

  const { data: draftsData } = useQuery<{ drafts: Draft[] }>({
    queryKey: ['/api/learning/drafts'],
    queryFn: async () => {
      const res = await fetch('/api/learning/drafts?tenant_id=varah');
      return res.json();
    }
  });

  const { data: patternsData } = useQuery<{ patterns: QueryPattern[] }>({
    queryKey: ['/api/learning/patterns'],
    queryFn: async () => {
      const res = await fetch('/api/learning/patterns?tenant_id=varah');
      return res.json();
    }
  });

  const { data: cacheStats } = useQuery<CacheStats>({
    queryKey: ['/api/learning/cache/stats'],
    queryFn: async () => {
      const res = await fetch('/api/learning/cache/stats?tenant_id=varah', {
        headers: { 'x-admin-token': localStorage.getItem('arya_admin_token') || '' }
      });
      return res.json();
    },
    refetchInterval: 15000
  });

  const { data: qualityReport } = useQuery<QualityReport>({
    queryKey: ['/api/arya/cache/quality-report'],
    queryFn: async () => {
      const res = await fetch('/api/arya/cache/quality-report?tenant_id=varah', {
        headers: { 'x-admin-token': localStorage.getItem('arya_admin_token') || '' }
      });
      return res.json();
    },
    enabled: activeTab === 'quality',
    refetchInterval: 30000
  });

  const approveMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const res = await apiRequest('POST', `/api/learning/drafts/${draftId}/approve`, { reviewed_by: 'admin' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning/drafts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/learning/stats'] });
      toast({ title: "Draft approved and promoted to knowledge base" });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (draftId: string) => {
      const res = await apiRequest('POST', `/api/learning/drafts/${draftId}/reject`, { reviewed_by: 'admin' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/learning/drafts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/learning/stats'] });
      toast({ title: "Draft rejected" });
    }
  });

  const { data: gapsData = [], refetch: refetchGaps } = useQuery<KnowledgeGap[]>({
    queryKey: ['/api/arya/knowledge-gaps'],
    queryFn: async () => {
      const res = await fetch('/api/arya/knowledge-gaps?tenant_id=varah', {
        headers: { 'x-admin-token': localStorage.getItem('arya_admin_token') || '' }
      });
      return res.json();
    },
    enabled: activeTab === 'gaps'
  });

  const approveGapMutation = useMutation({
    mutationFn: async ({ gap, draft }: { gap: KnowledgeGap; draft: string }) => {
      const res = await apiRequest('POST', `/api/arya/knowledge-gaps/${gap.id}/approve`, {
        approved_response: draft
      });
      return res.json();
    },
    onSuccess: () => {
      setActiveGap(null);
      refetchGaps();
      toast({ title: "Gap approved and added to knowledge base" });
    }
  });

  const rejectGapMutation = useMutation({
    mutationFn: async (gapId: string) => {
      const res = await apiRequest('POST', `/api/arya/knowledge-gaps/${gapId}/reject`, {});
      return res.json();
    },
    onSuccess: () => {
      setActiveGap(null);
      refetchGaps();
      toast({ title: "Gap rejected" });
    }
  });

  const domainColor = (domain: string) => {
    const colors: Record<string, string> = {
      medical: 'bg-red-500/10 text-red-400 border-red-500/30',
      business: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      sanskrit: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      chanakya: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
    };
    return colors[domain] || 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
            <Brain className="w-8 h-8 text-primary" />
            Self-Learning Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            ARYA learns from every interaction, detects knowledge gaps, and auto-generates new knowledge drafts
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50" data-testid="card-stat-queries">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">TOTAL QUERIES TRACKED</p>
                <p className="text-2xl font-bold font-mono text-primary mt-1">{stats?.totalQueries || 0}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50" data-testid="card-stat-gaps">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">KNOWLEDGE GAPS</p>
                <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{stats?.knowledgeGaps || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50" data-testid="card-stat-pending">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">DRAFTS PENDING</p>
                <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">{stats?.draftsPending || 0}</p>
              </div>
              <Lightbulb className="w-8 h-8 text-cyan-400/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50" data-testid="card-stat-approved">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-mono">DRAFTS APPROVED</p>
                <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{stats?.draftsApproved || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-border/50 pb-2">
        {(['overview', 'drafts', 'patterns', 'quality', 'gaps'] as const).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            data-testid={`button-tab-${tab}`}
          >
            {tab === 'overview' && <TrendingUp className="w-4 h-4 mr-2" />}
            {tab === 'drafts' && <Lightbulb className="w-4 h-4 mr-2" />}
            {tab === 'patterns' && <BarChart3 className="w-4 h-4 mr-2" />}
            {tab === 'quality' && <Star className="w-4 h-4 mr-2" />}
            {tab === 'gaps' && <AlertTriangle className="w-4 h-4 mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">

          {/* Cache Performance Card */}
          <Card className="bg-card/50 border-border/50" data-testid="card-cache-stats">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                Response Cache Performance
                <span className="ml-auto text-xs text-muted-foreground font-normal font-mono">Reduces OpenAI dependency</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-black/20 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground font-mono">CACHED RESPONSES</p>
                  <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">{cacheStats?.activeCached ?? '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground font-mono">CACHE HIT RATE</p>
                  <p className={`text-2xl font-bold font-mono mt-1 ${(cacheStats?.hitRate ?? 0) > 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {cacheStats?.hitRate ?? 0}%
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground font-mono">SERVED FROM CACHE</p>
                  <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{cacheStats?.totalHits ?? 0}</p>
                </div>
                <div className="p-3 rounded-lg bg-black/20 border border-border/30 text-center">
                  <p className="text-xs text-muted-foreground font-mono">AVG MATCH SCORE</p>
                  <p className="text-2xl font-bold font-mono text-primary mt-1">
                    {cacheStats?.avgMatchScore ? (cacheStats.avgMatchScore * 100).toFixed(0) + '%' : '—'}
                  </p>
                </div>
              </div>
              {cacheStats?.topCachedResponses && cacheStats.topCachedResponses.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-mono uppercase mb-2">Top Cached Responses</p>
                  {cacheStats.topCachedResponses.slice(0, 5).map((entry, idx) => (
                    <div key={entry.id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-black/20 border border-border/30" data-testid={`row-cache-${idx}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{entry.originalQuery}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.domain && <Badge variant="outline" className={domainColor(entry.domain)} style={{fontSize: '10px', padding: '0 4px'}}>{entry.domain}</Badge>}
                          <span className="text-[10px] text-muted-foreground">
                            Confidence: {(parseFloat(entry.confidenceScore || '0') * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-3 shrink-0">
                        <p className="text-sm font-mono font-bold text-cyan-400">{entry.servedCount ?? 0}×</p>
                        <p className="text-[10px] text-muted-foreground">served</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No cached responses yet. ARYA auto-caches every good answer it gives.</p>
                  <p className="text-xs mt-1">After a few conversations, ARYA will start serving repeat questions from memory.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Top Knowledge Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.topGaps && stats.topGaps.length > 0 ? (
                <div className="space-y-3">
                  {stats.topGaps.map((gap, idx) => (
                    <div key={gap.id || idx} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-border/30" data-testid={`row-gap-${idx}`}>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{gap.normalizedQuery}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {gap.domain && <Badge variant="outline" className={domainColor(gap.domain)}>{gap.domain}</Badge>}
                          <span className="text-xs text-muted-foreground">Avg confidence: {parseFloat(gap.avgConfidence || '0').toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-mono font-bold text-amber-400">{gap.queryCount}x</p>
                        <p className="text-xs text-muted-foreground">asked</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No knowledge gaps detected yet. ARYA is learning from every query.</p>
                  <p className="text-xs mt-1">Gaps appear when queries return low-confidence or empty results.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-display">How Self-Learning Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { step: '1', title: 'Query Tracking', desc: 'Every query is analyzed and patterns are recorded', icon: BarChart3 },
                  { step: '2', title: 'Gap Detection', desc: 'Low-confidence results flag knowledge gaps for filling', icon: AlertTriangle },
                  { step: '3', title: 'AI Draft Generation', desc: 'GPT-mini writes real knowledge entries for detected gaps', icon: Lightbulb },
                  { step: '4', title: 'Expert Review', desc: 'Admins review and promote drafts to the knowledge base', icon: CheckCircle },
                  { step: '5', title: 'Cache Serving', desc: 'Repeat questions served from memory — no OpenAI call needed', icon: Zap },
                ].map(item => (
                  <div key={item.step} className="p-4 rounded-lg bg-black/20 border border-border/30 text-center">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto mb-2">
                      <span className="text-sm font-bold text-primary">{item.step}</span>
                    </div>
                    <item.icon className="w-6 h-6 mx-auto mb-2 text-primary/60" />
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'drafts' && (
        <div className="space-y-3">
          {draftsData?.drafts && draftsData.drafts.length > 0 ? (
            draftsData.drafts.map((draft) => (
              <Card key={draft.id} className="bg-card/50 border-border/50" data-testid={`card-draft-${draft.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={domainColor(draft.domain)}>{draft.domain}</Badge>
                        <Badge variant="outline" className={
                          draft.status === 'pending' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                          draft.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                          'bg-red-500/10 text-red-400 border-red-500/30'
                        }>{draft.status}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          Confidence: {parseFloat(draft.confidenceScore || '0').toFixed(0)}%
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-white">{draft.topic}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{draft.content}</p>
                      {draft.learnedFromQuery && (
                        <p className="text-xs text-primary/60 mt-2 flex items-center gap-1">
                          <Brain className="w-3 h-3" />
                          Learned from: "{draft.learnedFromQuery}"
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(draft.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {draft.status === 'pending' && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => approveMutation.mutate(draft.id)}
                          disabled={approveMutation.isPending}
                          data-testid={`button-approve-${draft.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => rejectMutation.mutate(draft.id)}
                          disabled={rejectMutation.isPending}
                          data-testid={`button-reject-${draft.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No knowledge drafts yet. ARYA will auto-generate drafts when it detects repeated knowledge gaps.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'patterns' && (
        <div className="space-y-3">
          {patternsData?.patterns && patternsData.patterns.length > 0 ? (
            patternsData.patterns.map((pattern, idx) => (
              <Card key={pattern.id} className="bg-card/50 border-border/50" data-testid={`card-pattern-${idx}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {pattern.isGap && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        <p className="text-sm font-medium text-white">{pattern.normalizedQuery}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {pattern.domain && <Badge variant="outline" className={domainColor(pattern.domain)}>{pattern.domain}</Badge>}
                        <span className="text-xs text-muted-foreground">
                          Confidence: {parseFloat(pattern.avgConfidence || '0').toFixed(0)}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Last seen: {new Date(pattern.lastSeen).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-mono font-bold text-primary">{pattern.queryCount}</p>
                      <p className="text-xs text-muted-foreground">queries</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No query patterns recorded yet. Start querying the knowledge base to build patterns.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'quality' && (
        <div className="space-y-4">
          {qualityReport ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-card/50 border-emerald-500/30 border" data-testid="card-quality-golden">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono">GOLDEN RESPONSES</p>
                        <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{qualityReport.golden}</p>
                        <p className="text-xs text-muted-foreground mt-1">score ≥ 75 — high trust</p>
                      </div>
                      <Star className="w-8 h-8 text-emerald-400/30" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50" data-testid="card-quality-neutral">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono">NEUTRAL</p>
                        <p className="text-2xl font-bold font-mono text-muted-foreground mt-1">{qualityReport.neutral}</p>
                        <p className="text-xs text-muted-foreground mt-1">score 35–74 — building trust</p>
                      </div>
                      <Minus className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-red-500/30 border" data-testid="card-quality-flagged">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono">FLAGGED</p>
                        <p className="text-2xl font-bold font-mono text-red-400 mt-1">{qualityReport.flagged}</p>
                        <p className="text-xs text-muted-foreground mt-1">score &lt; 35 — deactivated</p>
                      </div>
                      <Flag className="w-8 h-8 text-red-400/30" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card/50 border-border/50">
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Response Quality Scores
                    <span className="ml-auto text-xs text-muted-foreground font-normal font-mono">{qualityReport.total} total entries</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qualityReport.entries.length > 0 ? (
                    <div className="space-y-2">
                      {qualityReport.entries
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 20)
                        .map((entry, idx) => (
                          <div
                            key={entry.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              entry.status === 'golden' ? 'bg-emerald-500/5 border-emerald-500/20' :
                              entry.status === 'flagged' ? 'bg-red-500/5 border-red-500/20' :
                              'bg-black/20 border-border/30'
                            }`}
                            data-testid={`row-quality-${idx}`}
                          >
                            <div className="flex-shrink-0 w-10 text-right">
                              <span className={`text-sm font-mono font-bold ${
                                entry.status === 'golden' ? 'text-emerald-400' :
                                entry.status === 'flagged' ? 'text-red-400' :
                                'text-muted-foreground'
                              }`}>{entry.score}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white truncate">{entry.query}</p>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[10px] text-emerald-400">+{entry.positiveFeedbackCount}</span>
                                <span className="text-[10px] text-red-400">-{entry.negativeFeedbackCount}</span>
                                <span className="text-[10px] text-muted-foreground">{entry.servedCount}× served</span>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                entry.status === 'golden' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]' :
                                entry.status === 'flagged' ? 'bg-red-500/10 text-red-400 border-red-500/30 text-[10px]' :
                                'bg-white/5 text-white/40 border-white/10 text-[10px]'
                              }
                            >{entry.status}</Badge>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No cached responses to score yet.</p>
                      <p className="text-xs mt-1">Quality scores appear after users give feedback on ARYA's responses.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Loading quality report...</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      {activeTab === 'gaps' && (
        <div className="space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {(['draft_ready', 'detected', 'all'] as const).map(f => (
              <button
                key={f}
                data-testid={`button-gap-filter-${f}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  gapFilter === f
                    ? 'bg-primary border-primary text-white'
                    : 'bg-card/50 border-border/50 text-muted-foreground hover:border-primary/40'
                }`}
                onClick={() => setGapFilter(f)}
              >
                {f === 'draft_ready' ? '📝 Draft Ready' : f === 'detected' ? '🔍 Detected' : '📋 All'}
                <span className="bg-black/20 rounded-full px-1.5 py-0.5 font-bold">
                  {gapsData.filter(g => f === 'all' ? true : g.status === f).length}
                </span>
              </button>
            ))}
          </div>

          {/* Gap list */}
          {gapsData.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-400" />
                <p>No knowledge gaps detected. ARYA is doing well ✓</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {gapsData
                .filter(g => gapFilter === 'all' ? true : g.status === gapFilter)
                .map((gap) => (
                  <Card
                    key={gap.id}
                    data-testid={`card-gap-${gap.id}`}
                    className={`bg-card/50 border-border/50 cursor-pointer transition-all hover:border-primary/40 ${
                      activeGap?.id === gap.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => { setActiveGap(gap); setEditedDraft(gap.auto_draft || ''); }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs bg-black/20 border border-border/30 px-2 py-0.5 rounded-full text-muted-foreground font-mono">
                          {gap.gap_category}
                        </span>
                        <span className="text-xs text-muted-foreground">{gap.frequency}× asked</span>
                        <Badge
                          variant="outline"
                          className={`ml-auto text-[10px] ${
                            gap.status === 'draft_ready'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          }`}
                        >
                          {gap.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-sm italic text-white/80">"{gap.trigger_query}"</p>
                      {gap.correction_hint && (
                        <p className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg mt-2 inline-block">
                          💬 User said: "{gap.correction_hint}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Detail / review panel (modal) */}
          {activeGap && (
            <div
              className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center md:justify-center"
              onClick={() => setActiveGap(null)}
            >
              <Card
                className="bg-card border-border rounded-t-2xl md:rounded-2xl w-full md:max-w-lg md:m-4 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-display">Review Gap</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveGap(null)}>✕</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase mb-1">Original query</p>
                    <p className="text-sm italic p-3 bg-black/20 rounded-lg">{activeGap.trigger_query}</p>
                  </div>
                  {activeGap.correction_hint && (
                    <div>
                      <p className="text-xs font-mono text-muted-foreground uppercase mb-1">User correction</p>
                      <p className="text-sm p-3 bg-emerald-500/10 rounded-lg text-emerald-300">{activeGap.correction_hint}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase mb-1">
                      Improved response{' '}
                      <span className="text-blue-400 normal-case font-sans">(editable)</span>
                    </p>
                    <textarea
                      data-testid="textarea-gap-draft"
                      className="w-full p-3 bg-black/20 border border-border/50 rounded-lg text-sm text-white resize-vertical outline-none focus:border-primary min-h-[120px]"
                      value={editedDraft}
                      onChange={e => setEditedDraft(e.target.value)}
                      placeholder="Write an improved response for this query..."
                      rows={5}
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      data-testid="button-gap-reject"
                      onClick={() => rejectGapMutation.mutate(activeGap.id)}
                      disabled={rejectGapMutation.isPending}
                    >
                      ✕ Reject
                    </Button>
                    <Button
                      className="flex-1 bg-primary"
                      data-testid="button-gap-approve"
                      onClick={() => approveGapMutation.mutate({ gap: activeGap, draft: editedDraft })}
                      disabled={!editedDraft.trim() || approveGapMutation.isPending}
                    >
                      ✓ Approve & Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
