import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Zap, Network, GitBranch, Loader2, ArrowRight, Share2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GraphNode {
  id: string;
  topic: string;
  domain: string;
  linkCount: number;
}

interface GraphEdge {
  from: string;
  to: string;
  score: string;
  type: string;
  evidence: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    domainCoverage: Record<string, number>;
  };
}

interface SynthesisResult {
  synthesis: string;
  domains: string[];
  sources: Array<{ id: string; topic: string; domain: string; relevance: number }>;
  neuralLinks: Array<{ from: string; to: string; type: string; score: string }>;
}

export default function NeuralLink() {
  const [activeTab, setActiveTab] = useState<'graph' | 'synthesize' | 'explore'>('graph');
  const [synthesisQuery, setSynthesisQuery] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>(['sanskrit', 'medical']);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: graphData, isLoading: graphLoading } = useQuery<GraphData>({
    queryKey: ['/api/neural-link/graph'],
    queryFn: async () => {
      const res = await fetch('/api/neural-link/graph?tenant_id=varah');
      return res.json();
    }
  });

  const { data: nodeLinks } = useQuery({
    queryKey: ['/api/neural-link/unit', selectedNode],
    queryFn: async () => {
      if (!selectedNode) return null;
      const res = await fetch(`/api/neural-link/unit/${selectedNode}?tenant_id=varah`);
      return res.json();
    },
    enabled: !!selectedNode
  });

  const computeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/neural-link/compute', { tenant_id: 'varah' });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: `Neural links computed: ${data.links_created} connections found` });
    }
  });

  const synthesizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/neural-link/synthesize', {
        tenant_id: 'varah',
        query: synthesisQuery,
        domains: selectedDomains
      });
      return res.json();
    }
  });

  const domainConfig: Record<string, { color: string; bg: string; border: string; glow: string }> = {
    medical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', glow: 'shadow-red-500/20' },
    business: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
    sanskrit: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
    chanakya: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', glow: 'shadow-purple-500/20' }
  };

  const groupedNodes = useMemo(() => {
    if (!graphData?.nodes) return {};
    const groups: Record<string, GraphNode[]> = {};
    graphData.nodes.forEach(node => {
      if (!groups[node.domain]) groups[node.domain] = [];
      groups[node.domain].push(node);
    });
    Object.values(groups).forEach(g => g.sort((a, b) => b.linkCount - a.linkCount));
    return groups;
  }, [graphData]);

  const toggleDomain = (domain: string) => {
    setSelectedDomains(prev =>
      prev.includes(domain)
        ? prev.filter(d => d !== domain)
        : [...prev, domain]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3" data-testid="text-page-title">
            <Zap className="w-8 h-8 text-primary" />
            Neural Link
          </h1>
          <p className="text-muted-foreground mt-1">
            Cross-domain knowledge connections — discover how Medical, Business, Sanskrit, and Chanakya domains interlink
          </p>
        </div>
        <Button
          onClick={() => computeMutation.mutate()}
          disabled={computeMutation.isPending}
          className="bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
          data-testid="button-compute-links"
        >
          {computeMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Zap className="w-4 h-4 mr-2" />
          )}
          Compute Links
        </Button>
      </div>

      {graphData?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 border-border/50" data-testid="card-stat-nodes">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">LINKED NODES</p>
                  <p className="text-2xl font-bold font-mono text-primary mt-1">{graphData.stats.totalNodes}</p>
                </div>
                <Network className="w-8 h-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50" data-testid="card-stat-edges">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-mono">NEURAL CONNECTIONS</p>
                  <p className="text-2xl font-bold font-mono text-cyan-400 mt-1">{graphData.stats.totalEdges}</p>
                </div>
                <GitBranch className="w-8 h-8 text-cyan-400/30" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50" data-testid="card-stat-domains">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-mono mb-2">DOMAIN COVERAGE</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(graphData.stats.domainCoverage).map(([domain, count]) => (
                  <Badge key={domain} variant="outline" className={`${domainConfig[domain]?.bg} ${domainConfig[domain]?.color} ${domainConfig[domain]?.border}`}>
                    {domain}: {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-2 border-b border-border/50 pb-2">
        {(['graph', 'synthesize', 'explore'] as const).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab)}
            data-testid={`button-tab-${tab}`}
          >
            {tab === 'graph' && <Network className="w-4 h-4 mr-2" />}
            {tab === 'synthesize' && <Share2 className="w-4 h-4 mr-2" />}
            {tab === 'explore' && <GitBranch className="w-4 h-4 mr-2" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {activeTab === 'graph' && (
        <div className="space-y-4">
          {graphLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : graphData && graphData.nodes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(groupedNodes).map(([domain, nodes]) => (
                <Card key={domain} className={`bg-card/50 ${domainConfig[domain]?.border} border`}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm font-display flex items-center gap-2 ${domainConfig[domain]?.color}`}>
                      <div className={`w-3 h-3 rounded-full ${domainConfig[domain]?.bg} ${domainConfig[domain]?.border} border`}></div>
                      {domain.toUpperCase()}
                      <span className="text-xs text-muted-foreground ml-auto">{nodes.length} linked</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {nodes.slice(0, 8).map(node => (
                      <button
                        key={node.id}
                        onClick={() => setSelectedNode(node.id === selectedNode ? null : node.id)}
                        className={`w-full text-left p-2 rounded-md text-xs transition-all ${
                          selectedNode === node.id
                            ? `${domainConfig[domain]?.bg} ${domainConfig[domain]?.border} border shadow-lg ${domainConfig[domain]?.glow}`
                            : 'bg-black/20 border border-transparent hover:border-border/50'
                        }`}
                        data-testid={`button-node-${node.id}`}
                      >
                        <p className="text-white font-medium truncate">{node.topic}</p>
                        <p className="text-muted-foreground mt-0.5">{node.linkCount} connections</p>
                      </button>
                    ))}
                    {nodes.length > 8 && (
                      <p className="text-xs text-muted-foreground text-center">+{nodes.length - 8} more</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Network className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No neural links computed yet. Click "Compute Links" to discover cross-domain connections.</p>
              </CardContent>
            </Card>
          )}

          {selectedNode && nodeLinks?.connections && (
            <Card className="bg-card/50 border-primary/20 border" data-testid="card-node-details">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Connections for Selected Node
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {nodeLinks.connections.map((conn: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-black/20 border border-border/30" data-testid={`row-connection-${idx}`}>
                      <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{conn.connectedUnit.topic}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={`${domainConfig[conn.connectedUnit.domain]?.bg} ${domainConfig[conn.connectedUnit.domain]?.color} ${domainConfig[conn.connectedUnit.domain]?.border}`}>
                            {conn.connectedUnit.domain}
                          </Badge>
                          <Badge variant="outline" className="bg-white/5 text-white/60 border-white/20">{conn.type}</Badge>
                          <span className="text-xs text-muted-foreground">Score: {parseFloat(conn.score).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{conn.evidence}</p>
                      </div>
                    </div>
                  ))}
                  {nodeLinks.connections.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No connections found for this node.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {graphData && graphData.edges.length > 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg font-display">All Cross-Domain Connections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {graphData.edges.slice(0, 30).map((edge, idx) => {
                    const fromNode = graphData.nodes.find(n => n.id === edge.from);
                    const toNode = graphData.nodes.find(n => n.id === edge.to);
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded bg-black/10 border border-border/20 text-xs" data-testid={`row-edge-${idx}`}>
                        <span className={`${domainConfig[fromNode?.domain || '']?.color} truncate max-w-[200px]`}>
                          {fromNode?.topic || edge.from}
                        </span>
                        <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className={`${domainConfig[toNode?.domain || '']?.color} truncate max-w-[200px]`}>
                          {toNode?.topic || edge.to}
                        </span>
                        <Badge variant="outline" className="bg-white/5 text-white/50 border-white/10 ml-auto text-[10px]">
                          {edge.type}
                        </Badge>
                        <span className="text-muted-foreground font-mono">{parseFloat(edge.score).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'synthesize' && (
        <div className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Cross-Domain Synthesis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ask a question that spans multiple knowledge domains. ARYA will synthesize insights from each domain and show neural links between them.
              </p>

              <div className="flex flex-wrap gap-2">
                {['medical', 'business', 'sanskrit', 'chanakya'].map(domain => (
                  <Button
                    key={domain}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDomain(domain)}
                    className={selectedDomains.includes(domain) ?
                      `${domainConfig[domain]?.bg} ${domainConfig[domain]?.color} ${domainConfig[domain]?.border}` :
                      'bg-black/20 text-muted-foreground border-border/50'
                    }
                    data-testid={`button-domain-${domain}`}
                  >
                    {domain}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  value={synthesisQuery}
                  onChange={(e) => setSynthesisQuery(e.target.value)}
                  placeholder="e.g., How can yoga and Ayurveda complement modern medicine?"
                  className="bg-black/20 border-border/50"
                  data-testid="input-synthesis-query"
                />
                <Button
                  onClick={() => synthesizeMutation.mutate()}
                  disabled={synthesizeMutation.isPending || selectedDomains.length < 2 || !synthesisQuery.trim()}
                  data-testid="button-synthesize"
                >
                  {synthesizeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Synthesize
                </Button>
              </div>
            </CardContent>
          </Card>

          {synthesizeMutation.data && (
            <Card className="bg-card/50 border-primary/20 border" data-testid="card-synthesis-result">
              <CardHeader>
                <CardTitle className="text-lg font-display">Synthesis Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-black/30 rounded-lg p-4 border border-border/30">
                  <pre className="text-sm text-white whitespace-pre-wrap font-mono leading-relaxed">
                    {(synthesizeMutation.data as SynthesisResult).synthesis}
                  </pre>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">SOURCES</p>
                  <div className="flex flex-wrap gap-2">
                    {(synthesizeMutation.data as SynthesisResult).sources.map((src, idx) => (
                      <Badge key={idx} variant="outline" className={`${domainConfig[src.domain]?.bg} ${domainConfig[src.domain]?.color} ${domainConfig[src.domain]?.border}`}>
                        {src.topic}
                      </Badge>
                    ))}
                  </div>
                </div>

                {(synthesizeMutation.data as SynthesisResult).neuralLinks.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground font-mono mb-2">NEURAL LINKS ACTIVATED</p>
                    <div className="space-y-1">
                      {(synthesizeMutation.data as SynthesisResult).neuralLinks.map((link, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-primary/80">
                          <Zap className="w-3 h-3" />
                          <span>{link.type} (score: {parseFloat(link.score).toFixed(2)})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'explore' && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="text-lg font-display flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              Connection Types Explained
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { type: 'tag_overlap', title: 'Tag Overlap', desc: 'Knowledge units share common tags across domains, indicating shared concepts', color: 'text-cyan-400' },
                { type: 'keyword_similarity', title: 'Keyword Similarity', desc: 'Significant word overlap in content — similar language used across different domains', color: 'text-blue-400' },
                { type: 'conceptual', title: 'Conceptual Bridge', desc: 'Deep conceptual connections like Ayurveda ↔ Modern Medicine or Chanakya ↔ Business Strategy', color: 'text-amber-400' },
                { type: 'complementary', title: 'Complementary', desc: 'Units that complement each other — e.g., ancient theory paired with modern practice', color: 'text-purple-400' },
              ].map(item => (
                <div key={item.type} className="p-4 rounded-lg bg-black/20 border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className={`w-4 h-4 ${item.color}`} />
                    <h3 className={`text-sm font-medium ${item.color}`}>{item.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                  <Badge variant="outline" className="mt-2 bg-white/5 text-white/40 border-white/10 text-[10px]">{item.type}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
