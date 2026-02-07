import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle, CheckCircle, XCircle, Lightbulb, BarChart3, Clock } from "lucide-react";
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

export default function SelfLearning() {
  const [activeTab, setActiveTab] = useState<'overview' | 'drafts' | 'patterns'>('overview');
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
        {(['overview', 'drafts', 'patterns'] as const).map(tab => (
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
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: '1', title: 'Query Tracking', desc: 'Every query is analyzed and its patterns are recorded', icon: BarChart3 },
                  { step: '2', title: 'Gap Detection', desc: 'Low-confidence or empty results flag knowledge gaps', icon: AlertTriangle },
                  { step: '3', title: 'Draft Generation', desc: 'Repeated gaps auto-generate knowledge drafts', icon: Lightbulb },
                  { step: '4', title: 'Expert Review', desc: 'Admins review and promote drafts to published knowledge', icon: CheckCircle },
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
    </div>
  );
}
